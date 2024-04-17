/** @format */

// this is our math block stack

'use strict';

import path from 'path';
import { Context } from '../utils/context';
import { locateDataFile, locateSpin2File } from '../utils/files';
import { SymbolTable } from './symbolTable';
import { eElementType } from './types';

const FILE_LIMIT: number = 32; // DAT and OBJ limit is same
const PARAM_LIMIT: number = 16; // OBJ override limit
const ALLOW_LIBRARY_SEARCH: boolean = true;

interface iPossibleSymbolTable {
  overrides: SymbolTable | undefined;
}
export class ObjFile {
  // details about a given OBJ file
  private static nextInstanceNumber = 0;
  private context: Context;
  private isLogging: boolean = false;
  private _fileSpec: string;
  private _fileName: string;
  private _spinFileId: number = 0; // index into Context:SourceFiles
  private _parameters: number = 0;
  private _instanceNumber: number;
  private _elementIndex: number; // index of assoc 'file' element in spin code
  private _maxParameterSets: number = 0; // how many times this object is placed in memory PNut [obj_instances[].length]
  private _parameterSet: iPossibleSymbolTable[] = []; // this is indexed by instance number  Map<string:number>
  private _numberInstances: number = 0; // object line Ex: instanceName[index] : "filename" - where _numberInstances is index value for this line

  constructor(ctx: Context, fileSpec: string, elementIndex: number) {
    this.context = ctx;
    this._instanceNumber = ++ObjFile.nextInstanceNumber;
    this._fileSpec = fileSpec;
    this._fileName = path.basename(fileSpec);
    this._elementIndex = elementIndex;
    this.incrementInstanceCount();
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  get fileIndex(): number {
    return this._instanceNumber - 1; // index is zero relative
  }

  get parameterSymbolTable(): SymbolTable | undefined {
    const possibleTable = this._parameterSet[this._maxParameterSets - 1];
    if (possibleTable === undefined) {
      this.logMessage(`EEEE: ObjFile: [${this._fileName}] didn't find parameter set at [${this._maxParameterSets}]`);
    }
    return possibleTable?.overrides;
  }

  public setSpinSourceFileId(fileId: number) {
    // can pass false to disable
    this._spinFileId = fileId;
  }

  get fileName(): string {
    return this._fileName;
  }

  get objLineElementIndex(): number {
    return this._elementIndex;
  }

  get fileSpec(): string {
    return this._fileSpec;
  }

  public recordOverride(constantName: string, type: eElementType, value: bigint | string) {
    let addedSymbolTable: boolean = false;
    const possibleSymbolTable = this._parameterSet[0];
    if (possibleSymbolTable.overrides === undefined) {
      possibleSymbolTable.overrides = new SymbolTable();
      addedSymbolTable = true;
    } else {
      // have existing symbol table, make sure we don't overflow
      if (possibleSymbolTable.overrides.length >= PARAM_LIMIT) {
        // [error_tmop]
        throw new Error(`Too many object parameters, exceeded limit of ${PARAM_LIMIT}`);
      }
    }
    this.logMessage(`* recordOverride() ADD symbol [${constantName}]`);
    possibleSymbolTable.overrides.add(constantName, type, value);
    if (addedSymbolTable) {
      this._parameterSet[0] = possibleSymbolTable;
    }
  }

  public setObjectInstanceCount(instanceCount: number) {
    // have instanceName[index]: record index value for this obj line
    this._numberInstances = instanceCount;
  }

  public incrementInstanceCount() {
    this._maxParameterSets++;
    // for each level we start with empty symbol table (but we use undefined instead of allocating a symbol table)
    //  we only allocate one if we have symbols
    const emptySymbolTable: iPossibleSymbolTable = { overrides: undefined };
    this._parameterSet.push(emptySymbolTable);
    this._numberInstances = 0; // default to 0 instances in all cases setObjectInstanceCount() will override this value
  }

  get occurrenceIndex(): number {
    return this._maxParameterSets;
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
  private _fileExists: boolean;
  private _instanceNumber: number;
  private _elementIndex: number; // index of assoc 'file' element in spin code
  private _failedToLoad: boolean = false;

  constructor(ctx: Context, fileName: string, enableLogging: boolean, elementIndex: number) {
    this.context = ctx;
    this._instanceNumber = ++DatFile.nextInstanceNumber;
    this.isLogging = enableLogging;
    this._fileName = path.basename(fileName);
    this._elementIndex = elementIndex;
    // we call load file into memory
    const fileSpec: string | undefined = locateDataFile(this.context.currentFolder, fileName, this.context);
    this._fileExists = fileSpec === undefined ? false : true;
    this._fileSpec = this._fileExists && fileSpec ? fileSpec : '';
  }

  get fileSpec(): string {
    return this._fileSpec;
  }

  get fileExists(): boolean {
    return this._fileExists;
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
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
  private _pasmMode: boolean = false;

  constructor(ctx: Context) {
    this.context = ctx;
  }

  get pasmMode(): boolean {
    return this._pasmMode;
  }

  public setPasmMode(newMode: boolean) {
    this._pasmMode = newMode;
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

  public clear() {
    // clear out all prior knowledge
    this.clearDataFiles();
    this.clearObjFiles();
    this.setPasmMode(false);
  }

  get objFileCount(): number {
    // this is PNut [obj_files]
    return this._objFiles.length;
  }

  get datFileCount(): number {
    // this is PNut [dat_files]
    return this._datFiles.length;
  }

  get objFiles(): ObjFile[] {
    return this._objFiles;
  }

  get datFiles(): DatFile[] {
    return this._datFiles;
  }

  public getIndexForDat(filename: string): [boolean, number] {
    let desiredIndex: number = -1;
    let foundStatus: boolean = false;
    for (let index = 0; index < this._datFiles.length; index++) {
      const datFile: DatFile = this._datFiles[index];
      if (filename.toLowerCase() === datFile.fileName.toLocaleLowerCase()) {
        foundStatus = true;
        desiredIndex = index;
      }
    }
    return [foundStatus, desiredIndex];
  }

  public addDataFile(fileName: string, elementIndex: number): boolean {
    const newData: DatFile = new DatFile(this.context, fileName, this.isLogging, elementIndex);
    this._datFiles.push(newData);
    return newData.fileExists;
  }

  public addObjFile(fileName: string, elementIndex: number = 0): ObjFile {
    let desiredFile: ObjFile | undefined = undefined;
    const spin2fileName: string = fileName.toLowerCase().endsWith('.spin2') ? fileName : `${fileName}.spin2`;
    if (this._objFiles.length >= FILE_LIMIT) {
      // [error_loxuoe]
      throw new Error(`Limit of ${FILE_LIMIT} unique objects exceeded`);
    }
    let fileSpec: string | undefined = undefined;
    if (this.objFileExists(spin2fileName)) {
      this.logMessage(`* addObjFile([${spin2fileName}]) - found...`);
      for (let index = 0; index < this._objFiles.length; index++) {
        const possibleFile = this._objFiles[index];
        if (possibleFile.fileName.toLowerCase() === fileName.toLowerCase()) {
          fileSpec = possibleFile.fileSpec;
          break;
        }
      }
    } else {
      fileSpec = locateSpin2File(spin2fileName, ALLOW_LIBRARY_SEARCH, this.context);
    }
    this.logMessage(`* addObjFile([${spin2fileName}]) - new file...`);
    if (fileSpec !== undefined) {
      desiredFile = new ObjFile(this.context, fileSpec, elementIndex);
      desiredFile.enableLogging(this.isLogging);
      this._objFiles.push(desiredFile);
    } else {
      throw new Error(`Cannot find ${spin2fileName}`);
    }
    if (desiredFile === undefined) {
      // [error_INTERNAL]
      throw new Error(`ERROR[INTERNAL] - failed to locate/allocate object file record ${fileName}`);
    }
    return desiredFile;
  }

  public loadDataFile(fileName: string): DatFile | undefined {
    let desiredFile: DatFile | undefined = undefined;
    if (this.dataFileExists(fileName)) {
      for (let index = 0; index < this._datFiles.length; index++) {
        const possibleFile = this._datFiles[index];
        if (possibleFile.fileName.toLowerCase() === fileName.toLowerCase()) {
          desiredFile = possibleFile;
          this.logMessage(`* loadDataFile([${fileName}]) - found... at Index=(${index})`);
          break;
        }
      }
    } else {
      desiredFile = new DatFile(this.context, fileName, this.isLogging, 0);
      this._datFiles.push(desiredFile);
      this.logMessage(`* loadDataFile([${fileName}]) - new file...at Index=(${this._datFiles.length - 1}), found=(${desiredFile.fileExists})`);
      if (desiredFile.fileExists == false) {
        this.logMessage(`* loadDataFile([${fileName}]) - locateDataFile() FAILED`);
        desiredFile = undefined; // signal we failed to load/locate file
      }
    }
    return desiredFile;
  }

  public dataFileExists(filespec: string): boolean {
    const exists: boolean = this._datFiles.some((datFile) => datFile.fileName.toLowerCase() === filespec.toLowerCase());
    this.logMessage(`* dataFileExists(${filespec}) -> (${exists})`);
    return exists;
  }

  public objFileExists(filespec: string): boolean {
    const exists: boolean = this._objFiles.some((objFile) => objFile.fileName.toLowerCase() === filespec.toLowerCase());
    this.logMessage(`* objFileExists(${filespec}) -> (${exists})`);
    return exists;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
