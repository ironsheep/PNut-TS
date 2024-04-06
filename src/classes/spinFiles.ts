/** @format */

// this is our math block stack

'use strict';

import path from 'path';
import { Context } from '../utils/context';
import { loadFileAsUint8Array, loadUint8ArrayFailed, locateDataFile } from '../utils/files';

export class ObjFile {
  // details about a given OBJ file
  private static nextInstanceNumber = 0;
  private context: Context;
  private isLogging: boolean = false;
  private _fileSpec: string;
  private _fileName: string;
  private _parameters: number = 0;
  private _instanceNumber: number;

  constructor(ctx: Context, fileSpec: string) {
    this.context = ctx;
    this._instanceNumber = ++ObjFile.nextInstanceNumber;
    this._fileSpec = fileSpec;
    this._fileName = path.basename(fileSpec);
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  get fileName(): string {
    return this._fileName;
  }

  /*
ddx             obj_files                                       ;object file count
dbx             obj_filenames,file_limit*256                    ;object filenames
ddx             obj_name_start,file_limit                       ;object filenames source start
ddx             obj_name_finish,file_limit                      ;object filenames source finish
ddx             obj_params,file_limit                           ;object parameters
dbx             obj_param_names,file_limit*param_limit*32       ;object parameter names
dbx             obj_param_types,file_limit*param_limit          ;object parameter types
ddx             obj_param_values,file_limit*param_limit         ;object parameter values
ddx             obj_offsets,file_limit                          ;object offsets
ddx             obj_lengths,file_limit                          ;object lengths
dbx             obj_data,obj_limit                              ;object data
ddx             obj_instances,file_limit                        ;object instances
dbx             obj_title,256                                   ;object title
  */

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}

export class DatFile {
  // details about a given Data file loaded from spin 'file' statement
  static readonly MAX_SIZE_IN_BYTES: number = 0x100000;
  private static nextInstanceNumber = 0;
  private context: Context;
  private isLogging: boolean = false;
  private _fileSpec: string;
  private _fileName: string;
  private _datImage = new Uint8Array(0); // empty file
  private _instanceNumber: number;
  private _elementIndex: number; // index of assoc 'file' element in spin code
  private _failedToLoad: boolean = false;

  constructor(ctx: Context, fileSpec: string, elementIndex: number) {
    this.context = ctx;
    this._instanceNumber = ++DatFile.nextInstanceNumber;
    this._fileSpec = fileSpec;
    this._fileName = path.basename(fileSpec);
    this._elementIndex = elementIndex;
    // we call load file into memory
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  public loadDataFromFile() {
    this._datImage = loadFileAsUint8Array(this._fileSpec);
    this._failedToLoad = loadUint8ArrayFailed(this._datImage) ? true : false;
  }

  *iterator() {
    for (let i = 0; i < this._datImage.length; i++) {
      yield this._datImage[i];
    }
  }

  get failedToLoad(): boolean {
    return this._failedToLoad;
  }

  get fileName(): string {
    return this._fileName;
  }

  /*
ddx             dat_files                                       ;data file count
dbx             dat_filenames,file_limit*256                    ;data filenames
ddx             dat_name_start,file_limit                       ;data filenames source start
ddx             dat_name_finish,file_limit                      ;data filenames source finish
ddx             dat_offsets,file_limit                          ;data offsets
ddx             dat_lengths,file_limit                          ;data lengths
dbx             dat_data,obj_limit                              ;data data
  */

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}

export class SpinFiles {
  // this object contains our list of files (OBJ and Data)
  private context: Context;
  private isLogging: boolean = false;
  private _objFiles: ObjFile[] = [];
  private _datFiles: DatFile[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  public clearDataFiles() {
    this._datFiles = [];
  }

  public clearObjFiles() {
    this._objFiles = [];
  }

  public addDataFile(filespec: string, elementIndex: number): number {
    const newData: DatFile = new DatFile(this.context, filespec, elementIndex);
    newData.enableLogging(this.isLogging);
    this._datFiles.push(newData);
    return this._datFiles.length - 1;
  }

  public loadDataFile(fileName: string): DatFile | undefined {
    let desiredFile: DatFile | undefined = undefined;
    if (this.dataFileExists(fileName)) {
      this.logMessage(`* loadDataFile([${fileName}]) - found...`);
      for (let index = 0; index < this._datFiles.length; index++) {
        const possibleFile = this._datFiles[index];
        if (possibleFile.fileName.toLowerCase() === fileName.toLowerCase()) {
          desiredFile = possibleFile;
          break;
        }
      }
    } else {
      this.logMessage(`* loadDataFile([${fileName}]) - new file...`);
      const fileSpec: string | undefined = locateDataFile(this.context.currentFolder, fileName, this.context);
      if (fileSpec !== undefined) {
        desiredFile = new DatFile(this.context, fileSpec, 0);
        desiredFile.enableLogging(this.isLogging);
        this._datFiles.push(desiredFile);
      } else {
        this.logMessage(`* loadDataFile([${fileName}]) - locateDataFile() FAILED`);
      }
    }
    if (desiredFile !== undefined) {
      desiredFile.loadDataFromFile();
    }
    return desiredFile;
  }

  public dataFileExists(filespec: string): boolean {
    const exists: boolean = this._datFiles.some((datFile) => datFile.fileName.toLowerCase() === filespec.toLowerCase());
    return exists;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
