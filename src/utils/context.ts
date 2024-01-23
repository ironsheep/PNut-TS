/** @format */

// Common runtime context shares by classes in Pnut-TS.

// src/utils/context.ts

'use strict';
import path from 'path';
import { Logger } from '../classes/logger';

export interface LogOptions {
  logElementizer: boolean; // write elementizer
}

export interface CompileOptions {
  writeFlash: boolean; // after compile, load to flash and run
  writeRAM: boolean; // after compile, load to RAM and run
  compile: boolean; // compile file
  enableDebug: boolean; // compile with debug
}
export interface Context {
  libraryFolder: string;
  currentFolder: string;
  logger: Logger;
  compileOptions: CompileOptions;
  logOptions: LogOptions;
}

export function createContext(): Context {
  return {
    libraryFolder: path.join(__dirname, '../ext'),
    currentFolder: process.cwd(),
    logger: new Logger(),
    compileOptions: { writeFlash: false, writeRAM: false, compile: false, enableDebug: false },
    logOptions: { logElementizer: false }
  };
}
