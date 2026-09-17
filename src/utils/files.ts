/** @format */

// Common file-system operations shares by classes in Pnut-TS.

// src/utils/files.ts

'use strict';
import * as path from 'path';
import * as fs from 'fs';
import { Context } from './context';

export function libraryDir(): string {
  return './lib';
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

export function fileSize(fileSpec: string) {
  let fileSize: number = 0;
  if (fileExists(fileSpec)) {
    const stats = fs.statSync(fileSpec);
    fileSize = stats.size;
  }
  return fileSize;
}

/**
 * locate named include .spin2 file which can be in current directory
 *  NOTE: searches include directory first then the current directory
 *
 * @export
 * @param {string} includePath - an optional include file folder to search
 * @param {string} currPath - the folder containing the current source file
 * @param {string} filename - the name of file to be located
 * @return {*}  {string|undefined} - returns the fileSpec of the file if found, else undefined
 */
export function locateIncludeFile(includePaths: string[], currPath: string, filename: string): string | undefined {
  let locatedFSpec: string | undefined = undefined;
  if (isSpin2File(filename)) {
    for (const includePath of includePaths) {
      if (dirExists(includePath)) {
        const fileSpec: string = path.join(includePath, filename);
        if (fileExists(fileSpec)) {
          locatedFSpec = fileSpec;
          break;
        }
      }
    }
    if (!locatedFSpec && currPath.length > 0 && dirExists(currPath)) {
      const fileSpec: string = path.join(currPath, filename);
      if (fileExists(fileSpec)) {
        locatedFSpec = fileSpec;
      }
    }
  }
  return locatedFSpec;
}

/**
 * locate named .spin2 file which can be in current directory
 * NOTE: The current directory is searched first then the built-in library path is searched
 *
 * @export
 * @param {string} filename
 * @return {*}  {(string | undefined)}
 */
export function locateSpin2File(filename: string, canSearchLibray: boolean = false, ctx: Context): string | undefined {
  let locatedFSpec: string | undefined = undefined;
  if (isSpin2File(filename)) {
    // is it in our current directory?
    let fileSpec: string = path.join(ctx.currentFolder, filename);
    //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() checking [${fileSpec}]`);
    if (fileExists(fileSpec)) {
      locatedFSpec = fileSpec;
    } else if (canSearchLibray) {
      // no, is it in our LIB directory?
      fileSpec = path.join(libraryDir(), filename);
      //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() checking [${fileSpec}]`);
      if (fileExists(fileSpec)) {
        locatedFSpec = fileSpec;
      }
    }
    // NEW Issue (#9) allow OBJ files to exist in include folders
    if (locatedFSpec === undefined && ctx.preProcessorOptions.includeFolders.length > 0) {
      for (const includeFolder of ctx.preProcessorOptions.includeFolders) {
        const incFolder: string = path.isAbsolute(includeFolder) ? includeFolder : path.join(ctx.currentFolder, includeFolder);
        //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() CHK inc [${incFolder}]`);
        if (dirExists(incFolder)) {
          fileSpec = path.join(incFolder, filename);
          //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() checking [${fileSpec}]`);
          if (fileExists(fileSpec)) {
            locatedFSpec = fileSpec;
            break; // found it, so exit loop
          }
        }
      }
    }
    //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File() -> [${locatedFSpec}]`);
    //} else {
    //if (ctx) ctx.logger.logMessage(`TRC: locateSpin2File(${path.basename(filename)}) NOT a .spin2 file!`);
  }
  return locatedFSpec;
}

/**
 * locate named .spin2 file which can be in current directory
 * NOTE: The current directory is searched first then the built-in library path is searched
 *
 * @export
 * @param {string} filename
 * @return {*}  {(string | undefined)}
 */
export function locateDataFile(workingDir: string, filename: string, ctx?: Context): string | undefined {
  let locatedFSpec: string | undefined = undefined;
  // is it in our current directory?
  let fileSpec: string = path.join(workingDir, filename);
  if (ctx) {
    // nothing
  }
  //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() checking [${fileSpec}]`);
  if (fileExists(fileSpec)) {
    locatedFSpec = fileSpec;
  } else {
    // no, is it in our LIB directory?
    fileSpec = path.join(libraryDir(), filename);
    //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() checking [${fileSpec}]`);
    if (fileExists(fileSpec)) {
      locatedFSpec = fileSpec;
    }
  }
  // NEW Issue (#9) allow DAT files to exist in include folders
  if (locatedFSpec == undefined && ctx && ctx.preProcessorOptions.includeFolders.length > 0) {
    for (const includeFolder of ctx.preProcessorOptions.includeFolders) {
      const incFolder: string = path.isAbsolute(includeFolder) ? includeFolder : path.join(workingDir, includeFolder);
      //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() CHK inc [${incFolder}]`);
      if (dirExists(incFolder)) {
        fileSpec = path.join(incFolder, filename);
        //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() checking [${fileSpec}]`);
        if (fileExists(fileSpec)) {
          locatedFSpec = fileSpec;
          break; // found it, so exit loop
        }
      }
    }
  }
  //if (ctx) ctx.logger.logMessage(`TRC: locateDataFile() -> [${locatedFSpec}]`);
  return locatedFSpec;
}

export function dirExists(pathSpec: string): boolean {
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
    // See: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
    try {
      // PNut is byte-oriented \u2014 it has no Unicode model. A source byte >= $80
      // inside a string literal must reach the object image as that same byte.
      // Latin-1 maps every byte 1:1 onto a character of the same value, which
      // is exactly PNut's behaviour, and is byte-for-byte identical to UTF-8
      // for pure-ASCII source (which is nearly all of it).
      //
      // Decoding UTF-8 instead silently loses a byte per non-ASCII character:
      // "-- 180<deg> ..." holds `c2 b0` on disk, UTF-8 collapses it to one
      // character, and we emitted 38 bytes where PNut emits 39 \u2014 shifting every
      // method offset and DAT address after it. Found 2026-09-17 via the fresh
      // v55 GOLDs for LARGE-tests/TOF (punch list \u00A723).
      //
      // The old code reached latin1 only as a FALLBACK, when the UTF-8 decode
      // produced U+FFFD. That is why WUMMI's German sources were always right
      // (malformed UTF-8, so they fell through to latin1) while well-formed
      // UTF-8 sources were wrong \u2014 the correctness depended on the source file
      // being invalid.
      const buffer = fs.readFileSync(fspec);
      fileContent = buffer.toString('latin1');
      // UTF-16 source: embedded NULs are the reliable tell. (The old heuristic
      // also re-read on a `\xC0` character, which under byte-faithful decoding
      // fires on any file containing that ordinary byte.)
      if (fileContent.includes('\x00')) {
        fileContent = buffer.toString('utf16le');
      }
    } catch (err) {
      // ctx.logger.log(`TRC: loadFileAsString() EXCEPTION: err=[${err}]`);
    }
  } else {
    // ctx.logger.log(`TRC: loadFileAsString() fspec=[${fspec}] NOT FOUND!`);
  }
  return fileContent;
}

const EMPTY_CONTENT_MARKER: string = 'XY$$ZZY';

export function loadFileAsUint8Array(fspec: string, ctx: Context | undefined = undefined): Uint8Array {
  let fileContent: Uint8Array | undefined = undefined;
  if (fs.existsSync(fspec)) {
    try {
      const buffer = fs.readFileSync(fspec);
      fileContent = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      //if (ctx) ctx.logger.logMessage(`TRC: loadFileAsUint8Array() loaded (${fileContent.length}) bytes from [${path.basename(fspec)}]`);
    } catch (err) {
      if (ctx) ctx.logger.logMessage(`TRC: loadFileAsUint8Array() ERROR: [${err}]!`);
    }
  } else {
    if (ctx) ctx.logger.logMessage(`TRC: loadFileAsUint8Array() fspec=[${fspec}] NOT FOUND!`);
  }

  if (fileContent === undefined) {
    const encoder = new TextEncoder();
    fileContent = new Uint8Array(encoder.encode(EMPTY_CONTENT_MARKER));
  } else {
    const fileSizeInBytes = fileSize(fspec);
    if (fileSizeInBytes != fileContent.length) {
      if (ctx)
        ctx.logger.logMessage(`TRC: loadFileAsUint8Array() loaded but SIZE MISMATCH stat=(${fileSizeInBytes}), loaded=(${fileContent.length})`);
    }
  }
  return fileContent;
}

export function loadUint8ArrayFailed(content: Uint8Array): boolean {
  // Convert Uint8Array back to string
  const decoder = new TextDecoder();
  const checkContent = content.length > 7 ? content.slice(0, 7) : content;
  const decodedString = decoder.decode(checkContent);
  // Test if decoded string is 'XY$$ZZY'
  const emptyStatus = decodedString === EMPTY_CONTENT_MARKER;
  return emptyStatus;
}
