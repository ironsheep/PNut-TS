/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';

// src/classes/objectImage.ts

export class ObjectImage {
  private context: Context;
  private isLogging: boolean = false;

  static readonly MAX_SIZE_IN_BYTES: number = 0x100000;
  private _objImage = new Uint8Array(ObjectImage.MAX_SIZE_IN_BYTES); // total memory size
  private _objOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = this.context.logOptions.logResolver;
  }

  get offset(): number {
    // return current offset
    return this._objOffset;
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this._objOffset = offset;
  }

  public append(uint8: number) {
    // append byte to end of image
    if (this._objOffset < ObjectImage.MAX_SIZE_IN_BYTES) {
      this._objImage[this._objOffset++] = uint8;
    } else {
      // [error_pex]
      throw new Error('Program exceeds 1024KB');
    }
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    if (offset >= 0 && offset <= this._objOffset - 1) {
      desiredValue = this._objImage[offset];
    }
    return desiredValue;
  }

  public readWord(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    if (offset >= 0 && offset <= this._objOffset - 2) {
      desiredValue = this._objImage[offset];
      desiredValue |= this._objImage[offset + 1] << 8;
    }
    return desiredValue;
  }

  public write(uint8: number, offset: number) {
    // replace existing value within image
    if (offset >= 0 && offset <= this._objOffset - 1) {
      this._objImage[offset] = uint8;
    }
  }

  public replaceWord(uint16: number, offset: number) {
    // replace existing value within image
    if (offset >= 0 && offset <= this._objOffset - 2) {
      this._objImage[offset] = uint16 & 0xff;
      this._objImage[offset + 1] = (uint16 >> 8) & 0xff;
    }
  }

  public replaceLong(uint32: number, offset: number) {
    // replace existing value within image
    if (offset >= 0 && offset <= this._objOffset - 4) {
      this.replaceWord(uint32, offset);
      this.replaceWord(uint32 >> 16, offset + 2);
    }
  }

  public reset() {
    // effectively empty our image
    this._objOffset = 0;
  }
}
