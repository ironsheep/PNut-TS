/* eslint-disable @typescript-eslint/no-explicit-any */
/** @format */

// Common runtime context shares by classes in Pnut-TS.

// src/utils/context.ts

'use strict';
import fs from 'fs';
import path from 'path';
import { Logger } from '../classes/logger';
import { SpinDocument } from '../classes/spinDocument';
import { ChildObjectsImage } from '../classes/childObjectsImage';
import { ObjectImage } from '../classes/objectImage';
import { SpinFiles } from '../classes/spinFiles';
import { ObjectSymbolStore } from '../classes/objectSymbolStore';
import { ObjInstanceStore } from '../classes/objInstanceInfo';

export interface RuntimeEnvironment {
  serialPortDevices: string[];
  developerModeEnabled: boolean;
}
export interface PassOptions {
  afterPreprocess: boolean; // stop after preprocessing
  afterElementize: boolean; // stop after elementize
  afterConBlock: boolean; // stop after compiling CON block
}

export interface LogOptions {
  logElementizer: boolean; // write elementizer log
  logParser: boolean; // write parser log
  logResolver: boolean; // write resolver log
  logPreprocessor: boolean; // write preprocessor log
  logCompile: boolean;
  logOutline: boolean; // write overview of operation log
  logDistiller: boolean; // write distiller log
}

export interface ReportOptions {
  writeElementsReport: boolean; // write elementizer
  writePreprocessReport: boolean;
  writeResolverReport: boolean;
  regressionTesting: boolean;
  coverageTesting: boolean;
}

export interface PreProcessorOptions {
  defSymbols: string[]; // symbols from -Dsymbol
  undefSymbols: string[]; // symbols from -Usymbol
  includeFolders: string[]; // paths from -Ipath
  writeIntermediateSpin2: boolean;
}

export interface CompileOptions {
  compile: boolean; // compile file
  enableDebug: boolean; // compile with debug
  outputFilename: string; // override output filename with this name
  binarySuffix: string; // use this output suffix for binary file
  writeListing: boolean; // write compile report (.lst file)
  v44FormatListing: boolean; // write compile report (.lst file) use v44 style
  //v43Compile: boolean; // compile emitting v43 compatible code (maybe)
  writeObj: boolean; // write object file (.obj file)
  writeBin: boolean; // write binary file (.bin file)
  listFilename: string; // write compile report to this file
  propPlug: string; // selected deviceNode for PropPlug
  writeFlashImageFile: boolean; // write flash file (.flash file)
  flashFilename: string; // write flash image to this file
  writeMapFile: boolean; // write memory map file (.map file)
  mapFilename: string; // write memory map to this file
  cache: boolean; // enable object compilation cache
  cacheDir: string; // object cache directory (default: '.pnut-cache')
  cacheClear: boolean; // clear object cache before compiling
  cacheVerify: boolean; // prove a cached build matches an uncached one
}

export interface CompileData {
  objectData: ChildObjectsImage; // pascal P2.ObjData
  datFileData: ChildObjectsImage; // pascal P2.DatData
  objImage: ObjectImage; // pascal P2.Obj
  spinFiles: SpinFiles; // our list of OBJ and DAT files
}

export class SourceFiles {
  private _srcFiles: SpinDocument[] = [];

  public addFile(fileReference: SpinDocument) {
    if (!this.hasFile(fileReference.fileName)) {
      this._srcFiles.push(fileReference);
    }
  }

  public getFile(fileSpec: string): SpinDocument | undefined {
    let desiredDocument: SpinDocument | undefined = undefined;
    const filename = path.basename(fileSpec);
    for (let srcFileIndex = 0; srcFileIndex < this._srcFiles.length; srcFileIndex++) {
      const fileReference = this._srcFiles[srcFileIndex];
      if (fileReference.fileName == filename) {
        desiredDocument = fileReference;
      }
    }
    return desiredDocument;
  }

  public getTopFile(): SpinDocument {
    if (this._srcFiles.length == 0) {
      throw new Error(`CODE CONSTRUCTION ERROR: getTopFile() this._srcFiles[] shouldn't be empty`);
    }
    return this._srcFiles[0];
  }

  public getFileHavingID(fileID: number): SpinDocument | undefined {
    return this._srcFiles.find((file) => file.fileId === fileID);
  }

  public getFileAtIndex(index: number): SpinDocument | undefined {
    if (index >= 0 && index < this._srcFiles.length) {
      return this._srcFiles[index];
    }
    return undefined;
  }

  public getFileIndex(file: SpinDocument): number {
    return this._srcFiles.indexOf(file);
  }

  public get fileCount(): number {
    return this._srcFiles.length;
  }

  private hasFile(fileName: string): boolean {
    return this._srcFiles.some((file) => file.fileName === fileName);
  }
}

export function logContextState(ctx: Context, callerId: string) {
  ctx.logger.logMessage('');
  ctx.logger.logMessage(`LogCtx requested by ${callerId}:`);
  const logCompile: boolean = ctx.logOptions.logCompile;
  ctx.logger.logMessage(`  LogCtx: logCompile=(${logCompile})`);
  const logElementizer: boolean = ctx.logOptions.logElementizer;
  ctx.logger.logMessage(`  LogCtx: logElementizer=(${logElementizer})`);
  const logParser: boolean = ctx.logOptions.logParser;
  ctx.logger.logMessage(`  LogCtx: logParser=(${logParser})`);
  const logPreprocessor: boolean = ctx.logOptions.logPreprocessor;
  ctx.logger.logMessage(`  LogCtx: logPreprocessor=(${logPreprocessor})`);
  const logResolver: boolean = ctx.logOptions.logResolver;
  ctx.logger.logMessage(`  LogCtx: logResolver=(${logResolver})`);
}

export class Context {
  public compilerVersion: string = '';
  public libraryFolder: string;
  public extensionFolder: string;
  public currentFolder: string;
  public logger: Logger;
  public sourceFiles: SourceFiles;
  public compileOptions: CompileOptions;
  public compileData: CompileData;
  public logOptions: LogOptions;
  public reportOptions: ReportOptions;
  public preProcessorOptions: PreProcessorOptions;
  public passOptions: PassOptions;
  public runEnvironment: RuntimeEnvironment;
  // Map file support: symbols per compiled object
  public objectSymbolStore: ObjectSymbolStore;
  // Map file support: object instance info (names, overrides)
  public objInstanceStore: ObjInstanceStore;

  constructor() {
    this.logOptions = {
      logElementizer: false,
      logParser: false,
      logResolver: false,
      logPreprocessor: false,
      logCompile: false,
      logOutline: false,
      logDistiller: false
    };
    this.reportOptions = {
      writeElementsReport: false,
      writePreprocessReport: false,
      writeResolverReport: false,
      regressionTesting: false,
      coverageTesting: false
    };
    this.preProcessorOptions = { defSymbols: [], undefSymbols: [], includeFolders: [], writeIntermediateSpin2: false };
    this.runEnvironment = { serialPortDevices: [], developerModeEnabled: false };
    this.passOptions = { afterPreprocess: false, afterElementize: false, afterConBlock: false };
    this.compileOptions = {
      compile: false,
      enableDebug: false,
      outputFilename: '',
      binarySuffix: 'bin', // compiler default suffix
      writeListing: false,
      writeObj: false,
      writeBin: false,
      listFilename: '',
      v44FormatListing: false,
      propPlug: '',
      writeFlashImageFile: false,
      flashFilename: '',
      writeMapFile: false,
      mapFilename: '',
      cache: false,
      cacheDir: '.pnut-cache',
      cacheClear: false,
      cacheVerify: false
    };
    this.compileData = {
      objectData: new ChildObjectsImage(this, 'GlbObjData'), // pascal P2.ObjData
      datFileData: new ChildObjectsImage(this, 'GlbDatData'), // pascal P2.DatData
      objImage: new ObjectImage(this, 'GlbObj'), // pascal P2.Obj
      spinFiles: new SpinFiles(this) // our list of OBJ and DAT files
    };
    let possiblePath = path.join(__dirname, '../lib');
    if (!fs.existsSync(possiblePath)) {
      possiblePath = path.join(__dirname, 'lib');
    }
    this.libraryFolder = possiblePath;
    possiblePath = path.join(__dirname, '../ext');
    if (!fs.existsSync(possiblePath)) {
      possiblePath = path.join(__dirname, 'ext');
    }
    this.extensionFolder = possiblePath;
    this.currentFolder = process.cwd();
    this.logger = new Logger();
    this.sourceFiles = new SourceFiles();
    this.objectSymbolStore = new ObjectSymbolStore();
    this.objInstanceStore = new ObjInstanceStore();
  }
}
