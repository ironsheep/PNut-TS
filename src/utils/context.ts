/** @format */

// Common runtime context shares by classes in Pnut-TS.

// src/utils/context.ts

'use strict';
import path from 'path';
import { Logger } from '../classes/logger';

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
  includeFolders: string[];
}

export interface CompileOptions {
  writeFlash: boolean; // after compile, load to flash and run
  writeRAM: boolean; // after compile, load to RAM and run
  compile: boolean; // compile file
  enableDebug: boolean; // compile with debug
  outputFilename: string; // override output filename with this name
}
export interface Context {
  libraryFolder: string;
  currentFolder: string;
  logger: Logger;
  compileOptions: CompileOptions;
  logOptions: LogOptions;
  reportOptions: ReportOptions;
  preProcessorOptions: PreProcessorOptions;
}

export function createContext(): Context {
  return {
    libraryFolder: path.join(__dirname, '../ext'),
    currentFolder: process.cwd(),
    logger: new Logger(),
    compileOptions: { writeFlash: false, writeRAM: false, compile: false, enableDebug: false, outputFilename: '' },
    logOptions: { logElementizer: false, logParser: false, logResolver: false, logPreprocessor: false },
    reportOptions: { writeTablesReport: false, writeElementsReport: false, writePreprocessReport: false, writeResolverReport: false },
    preProcessorOptions: { defSymbols: [], undefSymbols: [], includeFolders: [] }
  };
}
