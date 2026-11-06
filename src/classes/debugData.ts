/** @format */

// this is our common logging mechanism

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexWord } from '../utils/formatUtils';

// src/classes/objectImage.ts
//const SUPPRESS_LOG_MSG: boolean = true;

export class DebugRecord {
  static readonly MAX_RECORD_LENGTH: number = 255; // + terminator on each
  private _debugRecord = new Uint8Array(DebugRecord.MAX_RECORD_LENGTH); // total memory size
  private _debugOffset: number = 0; // current index into OBJ image

  get length(): number {
    return this._debugOffset;
  }

  public append(byteValue: number) {
    if (this._debugOffset >= DebugRecord.MAX_RECORD_LENGTH) {
      // [error_dditl] WAS: DEBUG data is too long
      throw new Error('DEBUG data is too long (m150)');
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
  private isLogging: boolean;

  static readonly MAX_ENTRIES: number = 255;
  // static readonly DEBUG_SIZE_IN_BYTES: number = DebugData.MAX_ENTRIES * (DebugRecord.MAX_RECORD_LENGTH + 1);
  static readonly DEBUG_SIZE_IN_BYTES = 0x4000; // is hard size limit
  static readonly COLLAPSED_SIZE_LIMIT = 0x2a00; // PNut debug_size_limit: what the debugger can hold, table included
  private _debugImage = new Uint8Array(DebugData.DEBUG_SIZE_IN_BYTES); // total memory size
  private _debugOffset: number = 0; // current index into OBJ image

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = ctx.logOptions.logResolver;
    const nextFreeOffset: number = 0x200;
    this.replaceWord(nextFreeOffset, 0); // set offset to first record
    this._debugOffset = nextFreeOffset;
  }

  public setLogging(enable: boolean) {
    this.isLogging = enable;
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

  /** Count the number of unique debug records stored */
  get recordCount(): number {
    let count = 0;
    for (let i = 1; i <= DebugData.MAX_ENTRIES; i++) {
      if (this.readWord(i << 1) !== 0) {
        count++;
      } else {
        break;
      }
    }
    return count;
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
      throw new Error('DEBUG data is too long (m151)');
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

  /**
   * Extract the raw bytes of the record at entryIndex (1-based).
   * Records are stored back-to-back starting at 0x200, in index order.
   * Returns an empty array if the index has no record.
   */
  public getRecordBytes(entryIndex: number): Uint8Array {
    if (!this.recordExists(entryIndex)) return new Uint8Array(0);
    const startOffset = this.readWord(entryIndex << 1);
    // End is the next-higher record's offset; if this is the last record, the
    // next-free pointer at slot 0 holds the byte just past the last record.
    let endOffset = this.readWord(0);
    for (let i = entryIndex + 1; i <= DebugData.MAX_ENTRIES; i++) {
      const otherOffset = this.readWord(i << 1);
      if (otherOffset !== 0) {
        endOffset = otherOffset;
        break;
      }
    }
    return this._debugImage.slice(startOffset, endOffset);
  }

  /**
   * Inject a pre-built record using the same dedup-then-add walk as
   * spinResolver.debugEnterRecord. Used by the object cache to replay a
   * cached child's debug records on cache-hit, so brkCodes baked into the
   * cached binary resolve to the same indices they had during the original
   * compile. Returns the resulting brkCode (entryIndex). Wraps the raw bytes
   * in a DebugRecord so existing recordIsMatch / setRecord enforce the same
   * size and capacity limits with their original error codes.
   */
  public injectRecord(bytes: Uint8Array): number {
    const wrapper = new DebugRecord();
    for (let i = 0; i < bytes.length; i++) {
      wrapper.append(bytes[i]); // throws (m150) if the saved record overflows MAX_RECORD_LENGTH
    }
    let entryIndex = 1;
    while (this.recordExists(entryIndex)) {
      if (this.recordIsMatch(entryIndex, wrapper)) {
        return entryIndex;
      }
      if (++entryIndex > DebugData.MAX_ENTRIES) {
        // [error_dditl] (m153)
        throw new Error('DEBUG data is too long (m153)');
      }
    }
    this.setRecord(entryIndex, wrapper); // throws (m151) if the buffer is full
    return entryIndex;
  }

  public setOffsetTo(offset: number) {
    // ?? no guard for this for now...
    this.logMessage(`* DebugData: setOffsetTo() (${hexAddress(this._debugOffset)}) -> (${hexAddress(offset)}) diff(${offset - this._debugOffset})`);
    this._debugOffset = offset;
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

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
