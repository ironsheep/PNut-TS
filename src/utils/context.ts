/** @format */

// Common runtime context shares by classes in Pnut-TS.

// src/utils/context.ts

'use strict';
import path from 'path';
import { Logger } from '../classes/Log';

export interface Context {
  libraryFolder: string;
  currentFolder: string;
  logger: Logger;
}

export function createContext(): Context {
  return {
    libraryFolder: path.join(__dirname, '../lib'),
    currentFolder: path.dirname('.'),
    logger: new Logger()
  };
}
