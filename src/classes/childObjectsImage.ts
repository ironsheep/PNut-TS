/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';

// src/classes/objectImage.ts

export class ChildObjectsImage {
  private context: Context;
  private isLogging: boolean = false;
  private _fileDetails: Map<number, [number, number]> = new Map<number, [number, number]>();
  private _offset: number = 0;
  private _id: string;

  static readonly MAX_SIZE_IN_BYTES: number = 0x100000;
  private _objImage = new Uint8Array(ChildObjectsImage.MAX_SIZE_IN_BYTES); // total memory size

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
  }

  public clear() {
    this._fileDetails.clear(); // empty tracking table
  }

  public recordLengthOffsetForFile(fileIndex: number, offset: number, length: number) {
    // set object file region info [offset, length] for fileIndex
    this.logMessage(`* [${this._id}] recordLengthOffsetForFile([${fileIndex}] ofs(${offset}), len(${length}))`);
    // flying monkeys throw exception on dupe entry
    if (!this._fileDetails.has(fileIndex)) {
      this._fileDetails.set(fileIndex, [offset, length]);
    } else {
      this.logMessage(`recordLengthOffsetForFile(${fileIndex}) ERROR: duplicate entry: index already exists`);
    }
  }

  public getOtherLengthForFile(fileIndex: number): [number, number] {
    // get object file region info for fileIndex
    let offset: number = -1;
    let length: number = -1;
    const fileDetails = this._fileDetails.get(fileIndex);
    // TODO: flying monkeys throw exception on entry not found
    if (fileDetails !== undefined) {
      [offset, length] = fileDetails;
      this.logMessage(`* [${this._id}] getOtherLengthForFile([${fileIndex}] -> ofs(${offset}), len(${length}))`);
    } else {
      this.logMessage(`getOtherLengthForFile(${fileIndex}) ERROR: no such index on file`);
    }
    return [offset, length];
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

  public read(): number {
    // read existing value from image
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._offset++];
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
