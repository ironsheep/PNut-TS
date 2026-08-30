/** @format */

'use strict';

import { Context } from '../utils/context';
import { dumpBytes, OVERRIDE_MESSAGE } from '../utils/dumpUtils';
import { hexAddress, hexByte, hexLong, hexWord } from '../utils/formatUtils';
import { OBJ_LIMIT } from './spinResolver';
import { BrkSite } from './objectImage';

// src/classes/childObjectImage.ts

//const SYMBOL_LIMIT: number = 30;

export interface iFileDetails {
  name: string;
  offset: number;
  length: number;
}

export class ChildObjectsImage {
  private context: Context;
  private _firstTimeOff: boolean = true;
  private isLogging: boolean;
  private isLoggingOutline: boolean;
  private _id: string;
  private _fileDetails: iFileDetails[] = [];
  /**
   * brkCode write sites inside each stored child image, in that image's OWN
   * coordinates (which include the 8-byte vsize/psize header compile_final
   * prepends, since shiftBrkSites(8) runs with the prepend).
   *
   * Parallel to `_fileDetails` and indexed the same way. Held here because a
   * parent's `compile_obj_blocks` copies these images into its own object
   * image and, until it also carried their brkSites across, the parent's
   * entry described a binary whose descendants it could not patch — the
   * defect recorded as punch list §17.
   */
  private _fileBrkSites: BrkSite[][] = [];
  private _offset: number = 0;
  private readonly obj_limit: number = OBJ_LIMIT; // max object size (2MB) PNut obj_limit as of v49
  private readonly ALLOC_SIZE_IN_BYTES: number = this.obj_limit / 16;
  private _chldObjImageByteAr = new Uint8Array(this.ALLOC_SIZE_IN_BYTES); // initial memory size
  private contentHashCache: Map<string, boolean> = new Map(); // Maps hash to exists flag

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = ctx.logOptions.logCompile; // || this.context.logOptions.logOutline;
    this.isLoggingOutline = ctx.logOptions.logOutline;
  }

  private ensureCapacity(neededCapacity: number) {
    if (neededCapacity > this._chldObjImageByteAr.length && this._chldObjImageByteAr.length < this.obj_limit) {
      // our array grows in multiples of ALLOC_SIZE_IN_BYTES at a time
      const tmpCapacity: number = Math.ceil(neededCapacity / this.ALLOC_SIZE_IN_BYTES) * this.ALLOC_SIZE_IN_BYTES;
      const newCapacity: number = tmpCapacity > this.obj_limit ? this.obj_limit : tmpCapacity;
      this.logMessageOutline(
        `++ MEM-ALLOC: cOBJ[${this._id}] grows from (${this._chldObjImageByteAr.length / 1024} kB) to (${newCapacity / 1024} kB)`
      );
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this._chldObjImageByteAr);
      //this._chldObjImageByteAr = null; // force prior to be deallocated AUGH doesn't work!
      this._chldObjImageByteAr = newBuffer;
    } else if (neededCapacity > this._chldObjImageByteAr.length) {
      // [error_pex]
      throw new Error(`Child Object exceeds ${this.obj_limit / 1024}KB (m490)`);
    }
  }

  public refreshLogging() {
    this.isLogging = this.context.logOptions.logCompile; // || this.context.logOptions.logOutline;
    this.isLoggingOutline = this.context.logOptions.logOutline;
  }

  public ensureFits(offset: number, nbrBytes: number) {
    const lastByteIdx: number = offset + nbrBytes - 1;
    this.ensureCapacity(lastByteIdx + 63); // grow, if possible, and needed, before use
    if (offset < 0 || lastByteIdx >= this._chldObjImageByteAr.length) {
      // BAD Offset
      // [error_INTERNAL]
      throw new Error(
        `cOBJ[${this._id}] write to Offset ${hexAddress(offset)}(${offset}) of ${Math.floor(lastByteIdx / 1024)} kB Won't FIT! (curr ${this._chldObjImageByteAr.length / 1024} kB)`
      );
    }
  }

  get rawUint8Array(): Uint8Array {
    return this._chldObjImageByteAr;
  }

  get id(): string {
    return this._id;
  }

  public clear() {
    this._fileDetails = []; // empty tracking table
    this._fileBrkSites = []; // and the sites parallel to it
    this.contentHashCache.clear(); // Clear hash cache
  }

  private getContentHash(childImage: Uint8Array): string {
    // Generate a quick signature using first 32 bytes, last 32 bytes, and length
    const length = childImage.length;
    const firstBytes = Math.min(32, length);
    const lastBytes = Math.min(32, length);

    let hash = `${length}:`;

    // Add first N bytes to hash
    for (let i = 0; i < firstBytes; i++) {
      hash += childImage[i].toString(16).padStart(2, '0');
    }

    hash += ':';

    // Add last N bytes to hash (if different from first)
    if (length > 32) {
      for (let i = length - lastBytes; i < length; i++) {
        hash += childImage[i].toString(16).padStart(2, '0');
      }
    }

    return hash;
  }

  private compareChildImages(image1: Uint8Array, image2: Uint8Array): boolean {
    // Fast path: different lengths
    if (image1.length !== image2.length) {
      return false;
    }

    const length = image1.length;

    // For large objects (> 1KB), use hash comparison first
    if (length > 1024) {
      const hash1 = this.getContentHash(image1);
      const hash2 = this.getContentHash(image2);
      if (hash1 !== hash2) {
        return false; // Hashes differ, definitely not the same
      }
      // Hashes match, fall through to full comparison
    }

    // Full byte-by-byte comparison
    return image1.every((byte, idx) => byte === image2[idx]);
  }

  get objectFileCount(): number {
    return this._fileDetails.length;
  }

  get objectFileRanges(): iFileDetails[] {
    return this._fileDetails;
  }

  public isChildPresent(childImage: Uint8Array): boolean {
    let childMatchStatus: boolean = false;
    let matchIndex: number = 0;
    for (let fileIdx = 0; fileIdx < this.objectFileCount; fileIdx++) {
      const [objOffset, objLength] = this.getOffsetAndLengthForFile(fileIdx);
      if (childImage.length == objLength) {
        const possibleChildImage = this.rawUint8Array.subarray(objOffset, objOffset + objLength);
        const sameChild: boolean = possibleChildImage.every((byte, idx) => byte === childImage[idx]);
        if (sameChild) {
          childMatchStatus = true;
          matchIndex = fileIdx;
          break; // found a match, no need to continue
        }
      }
    }
    if (childMatchStatus) {
      this.logMessageOutline(`  -- cOBJ[${this._id}]: child [${matchIndex} of ${this.objectFileCount}] MATCHed=(true)`);
    } else {
      this.logMessageOutline(`  -- cOBJ[${this._id}]: none of [${this.objectFileCount}] children MATCHed=(false)`);
    }
    return childMatchStatus;
  }

  public findDuplicateChild(childImage: Uint8Array): { exists: boolean; fileIndex: number } {
    // Generate hash for quick initial comparison
    const childHash = this.getContentHash(childImage);

    // Check cache first (for performance on repeated checks)
    if (this.contentHashCache.has(childHash)) {
      // Hash exists, need to do full comparison to find exact match
      for (let fileIdx = 0; fileIdx < this.objectFileCount; fileIdx++) {
        const [objOffset, objLength] = this.getOffsetAndLengthForFile(fileIdx);
        if (childImage.length === objLength) {
          const possibleChildImage = this.rawUint8Array.subarray(objOffset, objOffset + objLength);
          // Check hash first before expensive byte comparison
          const existingHash = this.getContentHash(possibleChildImage);
          if (existingHash === childHash) {
            // Use optimized comparison for large objects
            const sameChild: boolean = this.compareChildImages(possibleChildImage, childImage);
            if (sameChild) {
              this.logMessageOutline(`  -- cOBJ[${this._id}]: findDuplicateChild() - child [${fileIdx} of ${this.objectFileCount}] MATCHED`);
              return { exists: true, fileIndex: fileIdx };
            }
          }
        }
      }
    }

    // Not in cache or no exact match found
    this.contentHashCache.set(childHash, true);
    this.logMessageOutline(`  -- cOBJ[${this._id}]: findDuplicateChild() - none of [${this.objectFileCount}] children matched`);
    return { exists: false, fileIndex: -1 };
  }

  public checksum(offset: number, length: number): number {
    let desiredSum: number = 0;
    this.ensureCapacity(offset + length);
    for (let readOffset = offset; readOffset < offset + length; readOffset++) {
      desiredSum -= this._chldObjImageByteAr[readOffset];
    }
    this.logMessage(`* cOBJ[${this._id}]: checksum(ofs=(${offset}), len=(${length})) => (${desiredSum})`);
    return desiredSum;
  }

  public recordLengthOffsetForFile(expectedFileIndex: number, newOffset: number, newLength: number) {
    // set object file region info [offset, length] for fileIndex
    this.logMessage(`* cOBJ[${this._id}] recordLengthOffsetForFile([${expectedFileIndex}] ofs(${newOffset}), len(${newLength}))`);
    const details: iFileDetails = { name: '', offset: newOffset, length: newLength };
    this._fileDetails.push(details);
    // Keep the brkSite array index-aligned with _fileDetails even when the
    // caller has no sites to record, so the two never drift apart.
    this._fileBrkSites.push([]);
    // flying monkeys throw exception on dupe entry
    const latestIndex: number = this._fileDetails.length - 1;
    if (expectedFileIndex != latestIndex) {
      this.logMessage(`  -- cOBJ[${this._id}] recordLengthOffsetForFile() ?? File (${expectedFileIndex}) landed at (${latestIndex})!!!`);
    }
  }

  public recordLengthOffsetForFilename(fileBasename: string, newOffset: number, newLength: number) {
    // set object file region info [offset, length] for fileIndex
    this.logMessage(`* cOBJ[${this._id}] recordLengthOffsetForFile([${fileBasename}] ofs(${newOffset}), len(${newLength}))`);
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
      this.logMessage(`* cOBJ[${this._id}] getOffsetAndLengthForFile([${fileIndex}] -> ofs(${details.offset}), len(${details.length}))`);
    } else {
      // TODO: flying monkeys throw exception on entry not found
      this.logMessage(`getOffsetAndLengthForFile(${fileIndex}) ERROR: no such index on file`);
    }
    return [details.offset, details.length];
  }

  /**
   * Record the brkCode write sites inside the child image just stored at
   * `fileIndex`, in that image's own coordinates. Call it immediately after
   * `recordLengthOffsetForFile` for the same index.
   */
  public recordBrkSitesForFile(fileIndex: number, sites: BrkSite[]) {
    while (this._fileBrkSites.length <= fileIndex) {
      this._fileBrkSites.push([]);
    }
    this._fileBrkSites[fileIndex] = sites.map((site) => ({ ...site }));
    this.logMessage(`* cOBJ[${this._id}] recordBrkSitesForFile([${fileIndex}] count(${sites.length}))`);
  }

  /** The brkSites of the child image at `fileIndex`, in its own coordinates. */
  public getBrkSitesForFile(fileIndex: number): BrkSite[] {
    if (fileIndex < 0 || fileIndex >= this._fileBrkSites.length) {
      return [];
    }
    return this._fileBrkSites[fileIndex].map((site) => ({ ...site }));
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
    if (offset >= 0 && offset < this.obj_limit) {
      this.logMessage(`* cOBJ[${this._id}] setOffset(${offset})`);
      this._offset = offset;
    } else {
      this.logMessage(`setOffset(${offset}) ERROR: out of range [0-${this.obj_limit - 1}]`);
    }
  }

  get offset(): number {
    return this._offset;
  }

  public readSymbolName(length: number): string {
    let newName: string = '';
    // eslint-disable-next-line no-constant-condition
    const startOffset: number = this._offset;
    while (length-- > 0) {
      const symbolChar = this._chldObjImageByteAr[this._offset++];
      newName += String.fromCharCode(symbolChar);
    }
    this.logMessage(`* cOBJ[${this._id}] readSymbolName() (${hexAddress(startOffset)}) -> v=[${newName}]`);
    return newName;
  }

  public nextLong(): number {
    // read existing LONG value from image
    let desiredValue: number = 0;
    desiredValue = this._chldObjImageByteAr[this._offset++];
    desiredValue |= this._chldObjImageByteAr[this._offset++] << 8;
    desiredValue |= this._chldObjImageByteAr[this._offset++] << 16;
    desiredValue |= this._chldObjImageByteAr[this._offset++] << 24;
    this.logMessage(`* cOBJ[${this._id}] nextLong() (${hexAddress(this._offset - 4)}) -> v=(${hexLong(desiredValue)})`);
    return desiredValue;
  }

  public nextWord(): number {
    // read existing WORD value from image
    let desiredValue: number = 0;
    desiredValue = this._chldObjImageByteAr[this._offset++];
    desiredValue |= this._chldObjImageByteAr[this._offset++] << 8;
    this.logMessage(`* cOBJ[${this._id}] nextWord() (${hexAddress(this._offset - 2)}) -> v=(${hexWord(desiredValue)})`);
    return desiredValue;
  }

  public peekWord(): number {
    // read existing WORD value from image without moving past
    let desiredValue: number = 0;
    desiredValue = this._chldObjImageByteAr[this._offset + 0];
    desiredValue |= this._chldObjImageByteAr[this._offset + 1] << 8;
    this.logMessage(`* cOBJ[${this._id}] peekWord() (${hexAddress(this._offset)}) -> v=(${hexWord(desiredValue)})`);
    return desiredValue;
  }

  public nextByte(): number {
    // read existing value from image
    let desiredValue: number = 0;
    desiredValue = this._chldObjImageByteAr[this._offset++];
    this.logMessage(`* cOBJ[${this._id}] nextByte() (${hexAddress(this._offset - 1)}0 -> v=(${hexByte(desiredValue)})`);
    return desiredValue;
  }

  public nextBytes(sizeInBytes: number): Uint8Array {
    // read next N bytes from data and position at next after
    this.logMessage(`* cOBJ[${this._id}] nextBytes(${sizeInBytes}) from ofs=(${this._offset})`);
    const desiredBytesArray = new Uint8Array(this._chldObjImageByteAr.subarray(this._offset, this._offset + sizeInBytes));
    this._offset += sizeInBytes;
    return desiredBytesArray;
  }

  public writeByte(value: number) {
    // read existing value from image
    this.ensureCapacity(this._offset + 64);
    this._chldObjImageByteAr[this._offset++] = value;
  }

  public dumpBytes(dataOffset: number, nbrBytes: number, dsplyOffset: number, idStr: string) {
    const endOffset = dataOffset + nbrBytes - 1;
    const currOffset = dataOffset;
    let addrRange: string = `${hexByte(currOffset)}-${hexByte(endOffset)}`;
    if (dsplyOffset != -1) {
      addrRange = `${hexByte(dsplyOffset)}-${hexByte(dsplyOffset + nbrBytes - 1)}`;
    }
    const desiredBytesArray = new Uint8Array(this._chldObjImageByteAr.subarray(currOffset, endOffset));
    const titleText: string = `cOBJ[${this._id}] [${addrRange}] - ${idStr}`;
    dumpBytes(this.context, desiredBytesArray, desiredBytesArray.length, -1, titleText, OVERRIDE_MESSAGE);
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }

  private logMessageOutline(message: string): void {
    if (this.isLoggingOutline) {
      this.context.logger.logMessage(message);
    }
  }
}
