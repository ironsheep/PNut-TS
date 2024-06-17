/** @format */

// this is our common logging mechanism

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte, hexLong, hexWord } from '../utils/formatUtils';

// src/classes/objectImage.ts
const SUPPRESS_LOG_MSG: boolean = true;

export class DebugData {
  private context: Context;
  private isLogging: boolean = false;
  private _id: string;

  static readonly MAX_ENTRIES: number = 255;
  static readonly MAX_RECORD_LENGTH: number = 255; // + terminator on each
  // static readonly DEBUG_SIZE_IN_BYTES: number = DebugData.MAX_ENTRIES * (DebugData.MAX_RECORD_LENGTH + 1);
  static readonly DEBUG_SIZE_IN_BYTES = 0x4000; // is hard size limit
  private _debugImage = new Uint8Array(DebugData.DEBUG_SIZE_IN_BYTES); // total memory size
  private _debugOffset: number = 0; // current index into OBJ image
  private _maxOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
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

  public recordExists(entryIndex: number): boolean {
    return this.readWord(entryIndex << 1) != 0;
  }

  public recordIsMatch(entryIndex: number, newRecord: Uint8Array, newRecordSize: number): boolean {
    const recordOffset = this.readWord(entryIndex << 1);
    let recordMatchStatus: boolean = true;
    for (let index = 0; index < newRecordSize; index++) {
      const existingByte = this._debugImage[index + recordOffset];
      if (existingByte != newRecord[index]) {
        recordMatchStatus = false;
        break; // outta here we have answer
      }
    }
    return recordMatchStatus;
  }

  public setRecord(entryIndex: number, newRecord: Uint8Array, newRecordSize: number) {
    const recordOffset: number = this.readWord(0);
    if (recordOffset + newRecordSize > DebugData.DEBUG_SIZE_IN_BYTES) {
      // [error_dditl] WAS: DEBUG data is too long
      throw new Error(`DEBUG data is too long: total exceeds ${DebugData.DEBUG_SIZE_IN_BYTES} bytes`);
    }
    // save this new record
    for (let index = 0; index < newRecordSize; index++) {
      this._debugImage[index + recordOffset] = newRecord[index];
    }
    // set index pointer to this record just saved
    this.replaceWord(recordOffset, entryIndex << 1);
    // record next available location
    this.replaceWord(recordOffset + newRecordSize, 0);
  }

  public calculateChecksum(fromOffset: number, toOffset: number): number {
    let sumValue: number = 0;
    for (let index = fromOffset; index <= toOffset; index++) {
      sumValue -= this._debugImage[index];
    }
    //const savedLogState = this.isLogging;
    //this.isLogging = true;
    this.logMessage(`OBJ[${this._id}]: calculateChecksum(ofs=(${fromOffset}),len=(${toOffset})) -> ${sumValue & 0xff}`);
    //this.isLogging = savedLogState;
    return sumValue & 0xff;
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.logMessage(
      `* OBJ[${this._id}]: setOffsetTo() (${hexAddress(this._debugOffset)}) -> (${hexAddress(offset)}) diff(${this._debugOffset - offset})`
    );
    this._debugOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._debugImage[this._debugOffset++];
    this.updateMax();
    return desiredValue;
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

  public readLong(offset: number): number {
    // read existing word from image
    let desiredValue: number = 0;
    //if (offset >= 0 && offset <= this._debugOffset - 4) {
    desiredValue = this.readWord(offset);
    desiredValue |= this.readWord(offset + 2) << 16;
    //}
    return desiredValue;
  }

  public replaceByte(uint8: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* DebugData: replaceByte(v=(${hexByte(uint8)}), addr(${hexAddress(offset)}))`);
    //if (offset >= 0 && offset <= this._debugOffset - 1) {
    if (offset >= 0 && offset <= DebugData.DEBUG_SIZE_IN_BYTES - 1) {
      this._debugImage[offset] = uint8;
    } else {
      this.logMessage(`* DebugData: ERROR BAD address! replaceByte(v=(${hexByte(uint8)}), addr(${hexAddress(offset)}))`);
    }
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

  public replaceLong(uint32: number, offset: number) {
    // replace existing value within image
    this.logMessage(`* DebugData: replaceLong(addr(${hexAddress(offset)})) (${hexLong(this.readLong(offset))}) -> (${hexLong(uint32)})`);
    //if (offset >= 0 && offset <= this._debugOffset - 4) {
    this.replaceWord(uint32, offset, SUPPRESS_LOG_MSG);
    this.replaceWord(uint32 >> 16, offset + 2, SUPPRESS_LOG_MSG);
    //} else {
    //  this.logMessage(`* DebugData: ERROR BAD address! replacereplaceLongWord(v=(${hexLong(uint32)}), addr(${hexAddress(offset)}))`);
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
