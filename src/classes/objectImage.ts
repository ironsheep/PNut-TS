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

  get offsetHex(): string {
    // return current offset
    return this.hexOffset(this._objOffset);
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.logMessage(`* OBJ: setOffsetTo() (${this.hexOffset(this._objOffset)}) -> (${this.hexOffset(offset)}) diff(${this._objOffset - offset})`);
    this._objOffset = offset;
  }

  public append(uint8: number) {
    // append byte to end of image
    this.logMessage(`* OBJ: append(v=(${this.hexByte(uint8)})) wroteTo(${this.hexOffset(this._objOffset)})`);
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

  public readLong(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    if (offset >= 0 && offset <= this._objOffset - 4) {
      desiredValue = this.readWord(offset);
      desiredValue |= this.readWord(offset + 2) << 16;
    }
    return desiredValue;
  }

  private hexByte(uint8: number): string {
    return `$${uint8.toString(16).toUpperCase().padStart(2, '0')}`;
  }

  private hexWord(uint16: number): string {
    return `$${uint16.toString(16).toUpperCase().padStart(4, '0')}`;
  }

  private hexLong(uint32: number): string {
    return `$${uint32.toString(16).toUpperCase().padStart(8, '0')}`;
  }

  private hexOffset(uint32: number): string {
    return `$${uint32.toString(16).toUpperCase().padStart(5, '0')}`;
  }

  public replaceByte(uint8: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* OBJ: replaceByte(v=(${this.hexByte(uint8)}), addr(${this.hexOffset(offset)}))`);
    if (offset >= 0 && offset <= this._objOffset - 1) {
      this._objImage[offset] = uint8;
    } else {
      this.logMessage(`* OBJ: ERROR BAD address! replaceByte(v=(${this.hexByte(uint8)}), addr(${this.hexOffset(offset)}))`);
    }
  }

  public replaceWord(uint16: number, offset: number, alreadyLogged: boolean = false) {
    // replace existing value within image
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ: replaceWord(v=(${this.hexWord(uint16)}), addr(${this.hexOffset(offset)}))`);
    }
    if (offset >= 0 && offset <= this._objOffset - 2) {
      this._objImage[offset] = uint16 & 0xff;
      this._objImage[offset + 1] = (uint16 >> 8) & 0xff;
    } else {
      this.logMessage(`* OBJ: ERROR BAD address! replaceWord(v=(${this.hexWord(uint16)}), addr(${this.hexOffset(offset)}))`);
    }
  }

  public replaceLong(uint32: number, offset: number) {
    // replace existing value within image
    const SUPPRESS_LOG_MSG: boolean = true;
    this.logMessage(`* OBJ: replaceLong(v=(${this.hexLong(uint32)}), addr(${this.hexOffset(offset)}))`);
    if (offset >= 0 && offset <= this._objOffset - 4) {
      this.replaceWord(uint32, offset, SUPPRESS_LOG_MSG);
      this.replaceWord(uint32 >> 16, offset + 2, SUPPRESS_LOG_MSG);
    } else {
      this.logMessage(`* OBJ: ERROR BAD address! replacereplaceLongWord(v=(${this.hexLong(uint32)}), addr(${this.hexOffset(offset)}))`);
    }
  }

  public reset() {
    // effectively empty our image
    this.setOffsetTo(0); // call method, so logs
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
