/** @format */

'use strict';

import { Context } from '../utils/context';

// src/classes/childObjectImage.ts

//const SYMBOL_LIMIT: number = 30;

export interface iFileDetails {
  name: string;
  offset: number;
  length: number;
}

export class ChildObjectsImage {
  private context: Context;
  private isLogging: boolean = false; // REMOVE BEFORE FLIGHT
  private _fileDetails: iFileDetails[] = [];
  private _offset: number = 0;
  private _id: string;

  static readonly MAX_SIZE_IN_BYTES: number = 0x100000;
  private _objImage = new Uint8Array(ChildObjectsImage.MAX_SIZE_IN_BYTES); // total memory size

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile || this.context.logOptions.logOutline;
  }

  get rawUint8Array(): Uint8Array {
    return this._objImage;
  }

  get id(): string {
    return this._id;
  }

  public clear() {
    this._fileDetails = []; // empty tracking table
  }

  get objectFileCount(): number {
    return this._fileDetails.length;
  }

  get objectFileRanges(): iFileDetails[] {
    return this._fileDetails;
  }

  public checksum(offset: number, length: number): number {
    let desiredSum: number = 0;
    for (let readOffset = offset; readOffset < offset + length; readOffset++) {
      desiredSum -= this._objImage[readOffset];
    }
    this.logMessage(`* OBJ[${this._id}]: checksum(ofs=(${offset}), len=(${length})) => (${desiredSum})`);
    return desiredSum;
  }

  public recordLengthOffsetForFile(expectedFileIndex: number, newOffset: number, newLength: number) {
    // set object file region info [offset, length] for fileIndex
    this.logMessage(`* [${this._id}] recordLengthOffsetForFile([${expectedFileIndex}] ofs(${newOffset}), len(${newLength}))`);
    const details: iFileDetails = { name: '', offset: newOffset, length: newLength };
    this._fileDetails.push(details);
    // flying monkeys throw exception on dupe entry
    const latestIndex: number = this._fileDetails.length - 1;
    if (expectedFileIndex != latestIndex) {
      this.logMessage(`  -- recordLengthOffsetForFile() ?? File (${expectedFileIndex}) landed at (${latestIndex})!!!`);
    }
  }

  public recordLengthOffsetForFilename(fileBasename: string, newOffset: number, newLength: number) {
    // set object file region info [offset, length] for fileIndex
    this.logMessage(`* [${this._id}] recordLengthOffsetForFile([${fileBasename}] ofs(${newOffset}), len(${newLength}))`);
    const details: iFileDetails = { name: fileBasename, offset: newOffset, length: newLength };
    let fileIsUnknown = true;
    for (let fileIndex = 0; fileIndex < this._fileDetails.length; fileIndex++) {
      const currDetail: iFileDetails = this._fileDetails[fileIndex];
      if (currDetail.name == fileBasename) {
        fileIsUnknown = false;
      }
    }
    if (fileIsUnknown) {
      this._fileDetails.push(details);
    }
  }

  public getOffsetAndLengthForFile(fileIndex: number): [number, number] {
    // get object file region info for fileIndex
    let details: iFileDetails = { name: '', offset: -1, length: -1 };
    if (fileIndex >= 0 && fileIndex < this._fileDetails.length) {
      details = this._fileDetails[fileIndex];
      this.logMessage(`* [${this._id}] getOffsetAndLengthForFile([${fileIndex}] -> ofs(${details.offset}), len(${details.length}))`);
    } else {
      // TODO: flying monkeys throw exception on entry not found
      this.logMessage(`getOffsetAndLengthForFile(${fileIndex}) ERROR: no such index on file`);
    }
    return [details.offset, details.length];
  }

  public getOffsetAndLengthForFilename(fileBasename: string): [number, number] {
    // get object file region info for fileIndex
    const details: iFileDetails = { name: '', offset: -1, length: -1 };
    for (let fileIndex = 0; fileIndex < this._fileDetails.length; fileIndex++) {
      const currDetail: iFileDetails = this._fileDetails[fileIndex];
      if (currDetail.name == fileBasename) {
        details.offset = currDetail.offset;
        details.length = currDetail.length;
      }
    }
    return [details.offset, details.length];
  }

  public setOffset(offset: number) {
    // set start for read() or write() oerations
    if (offset >= 0 && offset < ChildObjectsImage.MAX_SIZE_IN_BYTES) {
      this.logMessage(`* [${this._id}] setOffset(${offset})`);
      this._offset = offset;
    } else {
      this.logMessage(`setOffset(${offset}) ERROR: out of range [0-${ChildObjectsImage.MAX_SIZE_IN_BYTES - 1}]`);
    }
  }

  get offset(): number {
    return this._offset;
  }

  public readSymbolName(): string {
    let newName: string = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const symbolChar = this._objImage[this._offset];
      if (symbolChar < 0x20) {
        break;
      }
      newName += String.fromCharCode(symbolChar);
      this._offset++;
    }
    return newName;
  }

  public readByte(): number {
    return this.read();
  }

  public read(): number {
    // read existing value from image
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._offset++];
    return desiredValue;
  }

  public readLong(): number {
    // read existing LONG value from image
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._offset++];
    desiredValue |= this._objImage[this._offset++] << 8;
    desiredValue |= this._objImage[this._offset++] << 16;
    desiredValue |= this._objImage[this._offset++] << 24;
    return desiredValue;
  }

  public write(value: number) {
    // read existing value from image
    this._objImage[this._offset++] = value;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
