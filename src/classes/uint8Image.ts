/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';

// src/classes/uint8Image.ts

export class Uint8Image {
  private context: Context;
  private isLogging: boolean = false;

  private readonly OBJ_LIMIT: number = 0x100000;
  private _objImage = new Uint8Array(this.OBJ_LIMIT); // total memory size
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
    if (this._objOffset < this.OBJ_LIMIT) {
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

  public write(uint8: number, offset: number) {
    // replace existing value within image
    if (offset >= 0 && offset <= this._objOffset - 1) {
      this._objImage[offset] = uint8;
    }
  }

  public reset() {
    // effectively empty our image
    this._objOffset = 0;
  }
}
