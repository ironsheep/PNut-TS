/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte } from '../utils/formatUtils';

// src/classes/objectImage.ts

export class ObjectSymbols {
  private context: Context;
  private isLogging: boolean = false;
  private _id: string;

  static readonly MAX_SIZE_IN_BYTES: number = 0x10000;
  private _objImage = new Uint8Array(ObjectSymbols.MAX_SIZE_IN_BYTES); // pre allocated
  private _objOffset: number = 0; // current index into OBJ image
  private _objReadOffset: number = 0; // read index into OBJ image

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
  }

  [Symbol.iterator]() {
    return this._objImage.values();
  }

  get length(): number {
    return this._objOffset;
  }

  public setOffset(offset: number) {
    this._objReadOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._objReadOffset++];
    this.logMessage(`* OBJSYM: readnext(${hexAddress(this._objReadOffset - 1)}) -> v=(${hexByte(desiredValue)})`);
    return desiredValue;
  }

  public writeSymbolName(name: string) {
    if (name !== undefined && name.length > 0) {
      for (let index = 0; index < name.length; index++) {
        const charByte: number = name.charCodeAt(index);
        this.writeByte(charByte);
      }
    }
  }

  public writeLong(uint32: bigint) {
    const valueAsNumber = Number(uint32 & BigInt(0xffffffff));
    this.writeByte(valueAsNumber);
    this.writeByte(valueAsNumber >> 8);
    this.writeByte(valueAsNumber >> 16);
    this.writeByte(valueAsNumber >> 24);
  }

  public writeByte(uint8: number) {
    // append byte to end of image
    this.logMessage(`* OBJSYM: append(v=(${hexByte(uint8)})) wroteTo(${hexAddress(this._objOffset)})`);
    if (this._objOffset < ObjectSymbols.MAX_SIZE_IN_BYTES) {
      this._objImage[this._objOffset++] = uint8 & 0xff;
    } else {
      // [error_pclo]
      throw new Error(`PUB/CON list overflowed ${ObjectSymbols.MAX_SIZE_IN_BYTES / 1024}k bytes`);
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

  public reset() {
    // effectively empty our image
    this._objOffset = 0; // call method, so logs
    this._objReadOffset = 0;
    this.logMessage(`* OBJSYM: reset() symbols`);
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
