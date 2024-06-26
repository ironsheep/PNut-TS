/** @format */

// this is our common logging mechanism

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexWord } from '../utils/formatUtils';

// src/classes/objectImage.ts
//const SUPPRESS_LOG_MSG: boolean = true;

export class DebugRecord {
  static readonly MAX_RECORD_LENGTH: number = 255; // + terminator on each
  private context: Context;
  private isLogging: boolean = false;
  private _debugRecord = new Uint8Array(DebugRecord.MAX_RECORD_LENGTH); // total memory size
  private _debugOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = this.context.logOptions.logResolver;
  }

  get length(): number {
    return this._debugOffset;
  }

  public append(byteValue: number) {
    if (this._debugOffset >= DebugRecord.MAX_RECORD_LENGTH) {
      // [error_dditl] WAS: DEBUG data is too long
      throw new Error(`DEBUG data is too long: record exceeds ${DebugRecord.MAX_RECORD_LENGTH} bytes`);
    }
    this._debugRecord[this._debugOffset++] = byteValue;
  }

  public byteAt(offset: number): number {
    let desiredUint8Value: number = 0;
    if (offset < this.length) {
      desiredUint8Value = this._debugRecord[offset];
    }
    return desiredUint8Value;
  }

  get rawUint8Array(): Uint8Array {
    return this._debugRecord.subarray(0, this.length);
  }

  public clear() {
    this._debugOffset = 0;
  }
}

export class DebugData {
  private context: Context;
  private isLogging: boolean = false;

  static readonly MAX_ENTRIES: number = 255;
  // static readonly DEBUG_SIZE_IN_BYTES: number = DebugData.MAX_ENTRIES * (DebugRecord.MAX_RECORD_LENGTH + 1);
  static readonly DEBUG_SIZE_IN_BYTES = 0x4000; // is hard size limit
  private _debugImage = new Uint8Array(DebugData.DEBUG_SIZE_IN_BYTES); // total memory size
  private _debugOffset: number = 0; // current index into OBJ image
  private _maxOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = this.context.logOptions.logResolver;
    const nextFreeOffset: number = 0x200;
    this.replaceWord(nextFreeOffset, 0); // set offset to first record
    this._debugOffset = nextFreeOffset;
    this._maxOffset = nextFreeOffset;
  }

  public setLogging(enable: boolean) {
    this.isLogging = enable;
  }

  get rawUint8Array(): Uint8Array {
    return this._debugImage;
  }

  get offset(): number {
    // return current offset
    return this._debugOffset;
  }

  get offsetHex(): string {
    // return current offset
    return hexAddress(this._debugOffset);
  }

  get length(): number {
    return this._debugOffset;
  }

  get collapseDebugData(): Uint8Array {
    // locate first zero
    // move upper down overwriting zero entries
    // fix up our addresses (table entries)
    let countOfWords = 0;
    for (let wordOffset = 0; wordOffset < 0x200; wordOffset += 2) {
      const entryValue = this.readWord(wordOffset);
      if (entryValue == 0) {
        break;
      }
      countOfWords++;
    }
    const arraySize: number = countOfWords * 2 + (this.length - 0x200);
    const dataOnlyArray = new Uint8Array(arraySize);
    //dataOnlyArray.set(this._debugImage.subarray(0, countOfWords * 2 - 1), 0);
    let dataOnlyOffset: number = 0;
    for (let index = 0; index < countOfWords; index++) {
      const wordValue = this.readWord(index << 1) - (0x200 - countOfWords * 2);
      dataOnlyArray[dataOnlyOffset++] = wordValue & 0xff;
      dataOnlyArray[dataOnlyOffset++] = (wordValue >> 8) & 0xff;
    }
    dataOnlyArray.set(this._debugImage.subarray(0x200, this.length), countOfWords * 2);
    return dataOnlyArray;
  }

  public recordExists(entryIndex: number): boolean {
    // NOTE: entryIndex should be 1-n
    return this.readWord(entryIndex << 1) != 0;
  }

  public recordIsMatch(entryIndex: number, newRecord: DebugRecord): boolean {
    // NOTE: entryIndex should be 1-n
    const recordOffset = this.readWord(entryIndex << 1);
    let recordMatchStatus: boolean = true;
    for (let index = 0; index < newRecord.length; index++) {
      const existingByte = this._debugImage[index + recordOffset];
      if (existingByte != newRecord.byteAt(index)) {
        recordMatchStatus = false;
        break; // outta here we have answer
      }
    }
    this.logMessage(`* DebugData: recordIsMatch(idx=${entryIndex}, sz=${newRecord.length}) -> match=(${recordMatchStatus})`);
    return recordMatchStatus;
  }

  public setRecord(entryIndex: number, newRecord: DebugRecord) {
    // NOTE: entryIndex should be 1-n
    this.logMessage(`* DebugData: setRecord(idx=${entryIndex}, sz=${newRecord.length})`);
    const recordOffset: number = this.readWord(0);
    if (recordOffset + newRecord.length > DebugData.DEBUG_SIZE_IN_BYTES) {
      // [error_dditl] WAS: DEBUG data is too long
      throw new Error(`DEBUG data is too long: total exceeds ${DebugData.DEBUG_SIZE_IN_BYTES} bytes`);
    }
    // save this new record
    for (let index = 0; index < newRecord.length; index++) {
      this._debugImage[index + recordOffset] = newRecord.byteAt(index);
    }
    this.setOffsetTo(recordOffset + newRecord.length);
    // set index pointer to this record just saved
    this.replaceWord(recordOffset, entryIndex << 1);
    // record next available location
    this.replaceWord(recordOffset + newRecord.length, 0);
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.logMessage(`* DebugData: setOffsetTo() (${hexAddress(this._debugOffset)}) -> (${hexAddress(offset)}) diff(${offset - this._debugOffset})`);
    this._debugOffset = offset;
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._maxOffset - 1) {
    desiredValue = this._debugImage[offset];
    //}
    return desiredValue;
  }

  private updateMax() {
    if (this._debugOffset > this._maxOffset) {
      this._maxOffset = this._debugOffset;
    }
  }

  public readWord(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._debugOffset - 2) {
    desiredValue = this._debugImage[offset];
    desiredValue |= this._debugImage[offset + 1] << 8;
    //}
    return desiredValue;
  }

  public replaceWord(uint16: number, offset: number, alreadyLogged: boolean = false) {
    // replace existing value within image
    if (alreadyLogged == false) {
      this.logMessage(`* DebugData: replaceWord(v=(${hexWord(uint16)}), addr(${hexAddress(offset)}))`);
    }
    //if (offset >= 0 && offset <= this._debugOffset - 2) {
    this._debugImage[offset] = uint16 & 0xff;
    this._debugImage[offset + 1] = (uint16 >> 8) & 0xff;
    //} else {
    //  this.logMessage(`* DebugData: ERROR BAD address! replaceWord(v=(${hexWord(uint16)}), addr(${hexAddress(offset)}))`);
    //}
  }

  public reset() {
    this.logMessage(`* DebugData: reset Offset to zero`);
    // effectively empty our image
    this.setOffsetTo(0); // call method, so logs
  }

  public dumpBytes(startOffset: number, byteCount: number, dumpId: string) {
    /// dump hex and ascii data
    let displayOffset: number = 0;
    let currOffset = startOffset;
    this.logMessage(`-- -------- ${dumpId} ------------------ --`);
    while (displayOffset < byteCount) {
      let hexPart = '';
      let asciiPart = '';
      const remainingBytes = byteCount - displayOffset;
      const lineLength = remainingBytes > 16 ? 16 : remainingBytes;
      for (let i = 0; i < lineLength; i++) {
        const byteValue = this.read(currOffset + i);
        hexPart += byteValue.toString(16).padStart(2, '0').toUpperCase() + ' ';
        asciiPart += byteValue >= 0x20 && byteValue <= 0x7e ? String.fromCharCode(byteValue) : '.';
      }
      const offsetPart = displayOffset.toString(16).padStart(5, '0').toUpperCase();

      this.logMessage(`${offsetPart}- ${hexPart.padEnd(48, ' ')}  '${asciiPart}'`);
      currOffset += lineLength;
      displayOffset += lineLength;
    }
    this.logMessage(`-- -------- -------- ------------------ --`);
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
