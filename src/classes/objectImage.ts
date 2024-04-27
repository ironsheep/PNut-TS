/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';

// src/classes/objectImage.ts
const SUPPRESS_LOG_MSG: boolean = true;

export class ObjectImage {
  private context: Context;
  private isLogging: boolean = false;
  private _id: string;

  static readonly MAX_SIZE_IN_BYTES: number = 0x100000;
  private _objImage = new Uint8Array(ObjectImage.MAX_SIZE_IN_BYTES); // total memory size
  private _objOffset: number = 0; // current index into OBJ image
  private _maxOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
  }

  public setLogging(enable: boolean) {
    this.isLogging = enable;
  }

  get rawUint8Array(): Uint8Array {
    return this._objImage;
  }

  get offset(): number {
    // return current offset
    return this._objOffset;
  }

  get offsetHex(): string {
    // return current offset
    return this.hexOffset(this._objOffset);
  }

  get length(): number {
    return this._objOffset;
  }

  public calculateChecksum(fromOffset: number, toOffset: number): number {
    let sumValue: number = 0;
    for (let index = fromOffset; index <= toOffset; index++) {
      sumValue -= this._objImage[index];
    }
    return sumValue & 0xff;
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.logMessage(`* OBJ: setOffsetTo() (${this.hexOffset(this._objOffset)}) -> (${this.hexOffset(offset)}) diff(${this._objOffset - offset})`);
    this._objOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._objOffset++];
    this.updateMax();
    return desiredValue;
  }

  public append(uint8: number, alreadyLogged: boolean = false) {
    // append byte to end of image
    if (alreadyLogged == false) {
      this.logMessage(`* OBJ: append(v=(${this.hexByte(uint8)})) wroteTo(${this.hexOffset(this._objOffset)})`);
    }
    if (this._objOffset < ObjectImage.MAX_SIZE_IN_BYTES) {
      this._objImage[this._objOffset++] = uint8;
      this.updateMax();
    } else {
      // [error_pex]
      throw new Error('Program exceeds 1024KB');
    }
  }

  public appendLong(uint32: number) {
    this.logMessage(`* OBJ: append(v=(${this.hexLong(uint32)})) wroteTo(${this.hexOffset(this._objOffset)})`);
    this.append(uint32, SUPPRESS_LOG_MSG);
    this.append(uint32 >> 8, SUPPRESS_LOG_MSG);
    this.append(uint32 >> 16, SUPPRESS_LOG_MSG);
    this.append(uint32 >> 24, SUPPRESS_LOG_MSG);
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._maxOffset - 1) {
    desiredValue = this._objImage[offset];
    //}
    return desiredValue;
  }

  private updateMax() {
    if (this._objOffset > this._maxOffset) {
      this._maxOffset = this._objOffset;
    }
  }

  public readWord(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._objOffset - 2) {
    desiredValue = this._objImage[offset];
    desiredValue |= this._objImage[offset + 1] << 8;
    //}
    return desiredValue;
  }

  public readLong(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._objOffset - 4) {
    desiredValue = this.readWord(offset);
    desiredValue |= this.readWord(offset + 2) << 16;
    //}
    return desiredValue;
  }

  public readLongNext(): number {
    // read existing word from image
    let desiredValue: number = 0;
    desiredValue = this._objImage[this._objOffset++];
    desiredValue |= this._objImage[this._objOffset++] << 8;
    desiredValue |= this._objImage[this._objOffset++] << 16;
    desiredValue |= this._objImage[this._objOffset++] << 24;
    this.logMessage(`* OBJ: readLongNext() v=(${this.hexLong(desiredValue)}) from(${this.hexOffset(this._objOffset - 4)})`);
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
    //if (offset >= 0 && offset <= this._objOffset - 1) {
    if (offset >= 0 && offset <= ObjectImage.MAX_SIZE_IN_BYTES - 1) {
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
    //if (offset >= 0 && offset <= this._objOffset - 2) {
    this._objImage[offset] = uint16 & 0xff;
    this._objImage[offset + 1] = (uint16 >> 8) & 0xff;
    //} else {
    //  this.logMessage(`* OBJ: ERROR BAD address! replaceWord(v=(${this.hexWord(uint16)}), addr(${this.hexOffset(offset)}))`);
    //}
  }

  public replaceLong(uint32: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* OBJ: replaceLong(v=(${this.hexLong(uint32)}), addr(${this.hexOffset(offset)}))`);
    //if (offset >= 0 && offset <= this._objOffset - 4) {
    this.replaceWord(uint32, offset, SUPPRESS_LOG_MSG);
    this.replaceWord(uint32 >> 16, offset + 2, SUPPRESS_LOG_MSG);
    //} else {
    //  this.logMessage(`* OBJ: ERROR BAD address! replacereplaceLongWord(v=(${this.hexLong(uint32)}), addr(${this.hexOffset(offset)}))`);
    //}
  }

  public reset() {
    this.logMessage(`* OBJ: reset Offset to zero`);
    // effectively empty our image
    this.setOffsetTo(0); // call method, so logs
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
