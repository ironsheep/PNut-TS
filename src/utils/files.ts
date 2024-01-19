/** @format */

// Common file-system operations shares by classes in Pnut-TS.

// src/utils/files.ts

'use strict';
import * as path from 'path';
import * as fs from 'fs';

import { SpinDocument } from '../classes/spinDocument';

export function libraryDir(): string {
  return './lib';
}

export function workingDir(): string {
  return '.';
}

/**
 * Loads a Spin2 file into memory.
 * NOTE: The local directory is searched first then the built-in library path is searched
 * @param {string} filename - The name of the Spin2 file to load.
 * @returns {SpinDocument} A SpinDocument object representing the loaded Spin2 file.
 * @throws {Error} If the file does not exist or cannot be read.
 */
export function loadSpin2File(filename: string): SpinDocument | undefined {
  let desiredDocument: SpinDocument | undefined = undefined;
  if (isSpin2File(filename)) {
    // is it in our current directory?
    let fileSpec: string = path.join(workingDir(), filename);
    if (fileExists(fileSpec)) {
      desiredDocument = new SpinDocument(fileSpec);
    } else {
      // no, is it in our LIB directory?
      fileSpec = path.join(libraryDir(), filename);
      if (fileExists(fileSpec)) {
        desiredDocument = new SpinDocument(fileSpec);
      }
    }
  }
  return desiredDocument;
}

/**
 * filters interferring characters from URI form of fileSpec returning just a fileSpec
 * @export
 * @param {string} docUri the URI form of a filespec
 * @return {string}  just a useable fileSpec
 */
export function fileSpecFromURI(docUri: string): string {
  const spaceRegEx = /%20/g; // we are globally replacing %20 markers
  const fileRegEx = /^file:\/\//i; // remove leading "file://", case-insensative
  return docUri.replace(fileRegEx, '').replace(spaceRegEx, ' ');
}

/**
 * Checks if a file is a Spin file.
 * @param {string} fileSpec - The path to the file.
 * @returns {boolean} True if the file is a Spin file, false otherwise.
 */
export function isSpin1File(fileSpec: string): boolean {
  const spinFileStatus: boolean = fileSpec.toLowerCase().endsWith('.spin');
  return spinFileStatus;
}

/**
 * Checks if a file is a Spin2 file.
 * @param {string} fileSpec - The path to the file.
 * @returns {boolean} True if the file is a Spin2 file, false otherwise.
 */
export function isSpin2File(fileSpec: string): boolean {
  const spinFileStatus: boolean = fileSpec.toLowerCase().endsWith('.spin2');
  return spinFileStatus;
}

/**
 * Checks if a file has a Spin extension.
 * @param {string} filename - The name of the file.
 * @returns {boolean} True if the file has a Spin extension, false otherwise.
 */
export function isSpinExt(filename: string): boolean {
  return ['.spin', '.spin2', '.p2asm'].includes(path.extname(filename).toLowerCase());
}

/**
 * Checks if a file exists.
 * @param {string} pathSpec - The path to the file.
 * @returns {boolean} True if the file exists, false otherwise.
 */
export function fileExists(pathSpec: string): boolean {
  let existsStatus: boolean = false;
  if (fs.existsSync(pathSpec)) {
    // File exists in path
    existsStatus = true;
  }
  return existsStatus;
}

/**
 * loads the content of a file.
 * @param {string} fileSpec - The path to the file.
 * @returns {string} The content of the file.
 */
export function loadFileAsString(fspec: string): string {
  let fileContent: string = '';
  if (fs.existsSync(fspec)) {
    // ctx.logger.log(`TRC: loadFileAsString() attempt load of [${fspec}]`);
    try {
      fileContent = fs.readFileSync(fspec, 'utf-8');
      if (fileContent.includes('\x00')) {
        fileContent = fs.readFileSync(fspec, 'utf16le');
      }
    } catch (err) {
      // ctx.logger.log(`TRC: loadFileAsString() EXCEPTION: err=[${err}]`);
    }
  } else {
    // ctx.logger.log(`TRC: loadFileAsString() fspec=[${fspec}] NOT FOUND!`);
  }
  return fileContent;
}
