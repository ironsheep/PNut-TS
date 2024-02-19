/** @format */

// Common runtime context shares by classes in Pnut-TS.

// src/utils/context.ts

'use strict';
import path from 'path';
import { Logger } from '../classes/logger';
import { SpinDocument } from '../classes/spinDocument';

export interface PassOptions {
  afterPreprocess: boolean; // stop after preprocessing
  afterElementize: boolean; // stop after elementize
}

export interface LogOptions {
  logElementizer: boolean; // write elementizer log
  logParser: boolean; // write parser log
  logResolver: boolean; // write resolver log
  logPreprocessor: boolean; // write preprocessor log
}

export interface ReportOptions {
  writeTablesReport: boolean; // write elementizer
  writeElementsReport: boolean; // write elementizer
  writePreprocessReport: boolean;
  writeResolverReport: boolean;
}

export interface PreProcessorOptions {
  defSymbols: string[]; // symbols from -Dsymbol
  undefSymbols: string[]; // symbols from -Usymbol
  includeFolders: string[]; // paths from -Ipath
}

export interface CompileOptions {
  writeFlash: boolean; // after compile, load to flash and run
  writeRAM: boolean; // after compile, load to RAM and run
  compile: boolean; // compile file
  enableDebug: boolean; // compile with debug
  outputFilename: string; // override output filename with this name
  writeListing: boolean; // write compile report (.lst file)
  listFilename: string; // write compile report to this file
}
export interface Context {
  libraryFolder: string;
  currentFolder: string;
  logger: Logger;
  sourceFiles: SourceFiles;
  compileOptions: CompileOptions;
  logOptions: LogOptions;
  reportOptions: ReportOptions;
  preProcessorOptions: PreProcessorOptions;
  passOptions: PassOptions;
}

export class SourceFiles {
  private _srcFiles: SpinDocument[] = [];

  public addFile(fileReference: SpinDocument) {
    if (!this.hasFile(fileReference.fileName)) {
      this._srcFiles.push(fileReference);
    }
  }

  public getFileHavingID(fileID: number): SpinDocument | undefined {
    return this._srcFiles.find((file) => file.fileId === fileID);
  }

  private hasFile(fileName: string): boolean {
    return this._srcFiles.some((file) => file.fileName === fileName);
  }
}

export function createContext(): Context {
  return {
    libraryFolder: path.join(__dirname, '../ext'),
    currentFolder: process.cwd(),
    logger: new Logger(),
    sourceFiles: new SourceFiles(),
    compileOptions: {
      writeFlash: false,
      writeRAM: false,
      compile: false,
      enableDebug: false,
      outputFilename: '',
      writeListing: false,
      listFilename: ''
    },
    logOptions: { logElementizer: false, logParser: false, logResolver: false, logPreprocessor: false },
    reportOptions: { writeTablesReport: false, writeElementsReport: false, writePreprocessReport: false, writeResolverReport: false },
    preProcessorOptions: { defSymbols: [], undefSymbols: [], includeFolders: [] },
    passOptions: { afterPreprocess: false, afterElementize: false }
  };
}
