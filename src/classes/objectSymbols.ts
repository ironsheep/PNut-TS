/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte, hexLong } from '../utils/formatUtils';

// src/classes/objectImage.ts

// version < v45 record structure:
// ---------------------------------
// CON PUB:
//  name string (no terminator)
//  type byte [0-15 is PUB return count]
//  type byte [parameter count]
//
// CON CONSTANT:
//  name string (no terminator)
//  type byte [16 (int),17 (float)]
//  type long {value}

// version >= v45 record structure:
// ---------------------------------
//  type byte: tttlllll
//   ttt:
//    objx_con_int     1 << 5
//    objx_con_float   2 << 5
//    objx_con_struct  3 << 5
//    objx_pub         4 << 5
//   lllll:
//    len (0-31)
//
// CON PUB: (ttt: pub)
//   type BYTE [tttlllll]
//   name string (no terminator)
//   BYTE parameter count
//   BYTE result count
//
// CON CONSTANT: (ttt: con_int, con_float)
//  type BYTE [tttlllll]
//  name string (no terminator)
//  LONG {value}
//
// CON STRUCT: (ttt: con_struct)
//  type BYTE [tttlllll]
//  name string (no terminator)
//  WORD size
//  BYTEs data[size-2]

export class ObjectSymbols {
  static objx_con_int = 1 << 5;
  static objx_con_float = 2 << 5;
  static objx_con_struct = 3 << 5;
  static objx_pub = 4 << 5;

  private context: Context;
  private isLogging: boolean;
  private isLoggingOutline: boolean;
  private _id: string;

  static readonly MAX_SIZE_IN_BYTES: number = 0x10000;
  static readonly ALLOC_SIZE_IN_BYTES: number = ObjectSymbols.MAX_SIZE_IN_BYTES / 16;
  private _objSymbolsByteAr = new Uint8Array(ObjectSymbols.ALLOC_SIZE_IN_BYTES); // pre allocated
  private _objOffset: number = 0; // current index into OBJ image
  private _objReadOffset: number = 0; // read index into OBJ image

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = ctx.logOptions.logCompile;
    this.isLoggingOutline = ctx.logOptions.logOutline;
  }

  private ensureCapacity(neededCapacity: number) {
    if (neededCapacity > this._objSymbolsByteAr.length && this._objSymbolsByteAr.length < ObjectSymbols.MAX_SIZE_IN_BYTES) {
      // our array grows in multiples of ALLOC_SIZE_IN_BYTES at a time
      const tmpCapacity: number = Math.ceil(neededCapacity / ObjectSymbols.ALLOC_SIZE_IN_BYTES) * ObjectSymbols.ALLOC_SIZE_IN_BYTES;
      const newCapacity: number = tmpCapacity > ObjectSymbols.MAX_SIZE_IN_BYTES ? ObjectSymbols.MAX_SIZE_IN_BYTES : tmpCapacity;
      this.logMessageOutline(`++ MEM-ALLOC: PUB/CON list grows from (${this._objSymbolsByteAr.length / 1024} kB) to (${newCapacity / 1024} kB)`);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this._objSymbolsByteAr);
      //this._objSymbolsByteAr = null; // force prior to be deallocated AUGH doesn't work!
      this._objSymbolsByteAr = newBuffer;
    }
  }

  [Symbol.iterator]() {
    return this._objSymbolsByteAr.values();
  }

  get length(): number {
    return this._objOffset;
  }

  public setReadOffset(offset: number) {
    this._objReadOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objSymbolsByteAr[this._objReadOffset++];
    this.logMessage(`* OBJSYM: readnext(${hexAddress(this._objReadOffset - 1)}) -> v=(${hexByte(desiredValue)})`);
    return desiredValue;
  }

  private writeSymbolName(name: string) {
    if (name !== undefined && name.length > 0) {
      for (let index = 0; index < name.length; index++) {
        const charByte: number = name.charCodeAt(index);
        this.writeByte(charByte);
      }
    }
  }

  public writePubMethod(name: string, parameterCount: number, resultCount: number) {
    // add to this objects' public interface symbol store PubConList
    this.logMessage(`* OBJSYM: wrPubMethd name=[${name}](${name.length}), params=(${parameterCount}, rslts=(0x${resultCount})`);
    const type: number = ObjectSymbols.objx_pub | name.length;
    this.writeByte(type); // tttlllll
    this.writeSymbolName(name);
    this.writeByte(parameterCount);
    this.writeByte(resultCount);
  }

  public writePubConstant(name: string, isFloat: boolean, value: bigint) {
    // add to this objects' public interface symbol store PubConList
    this.logMessage(`* OBJSYM: wrPubCon name=[${name}](${name.length}), isFlt=(${isFloat}, value=(${hexLong(Number(value))})`);
    const interfaceType: number = (isFloat ? ObjectSymbols.objx_con_float : ObjectSymbols.objx_con_int) | name.length;
    this.writeByte(interfaceType);
    this.writeSymbolName(name);
    this.writeLong(value);
  }

  public writePubStructure(name: string, bytes: Uint8Array) {
    // add a public structure def'm to object interface
    this.logMessage(`* OBJSYM: wrPubStruct name=[${name}](${name.length}), bytes(${bytes.length})`);
    const interfaceType: number = ObjectSymbols.objx_con_struct | name.length;
    this.writeByte(interfaceType);
    this.writeSymbolName(name);
    for (let index = 0; index < bytes.length; index++) {
      this.writeByte(bytes[index]);
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
    //  the list may fill exactly: only the byte past the last one is an error
    if (this._objOffset == ObjectSymbols.MAX_SIZE_IN_BYTES) {
      // [error_pclo]
      throw new Error('PUB/CON list overflow');
    }
    this.logMessage(`* OBJSYM: append(v=(${hexByte(uint8)})) wroteTo(${hexAddress(this._objOffset)})`);
    this.ensureCapacity(this._objOffset + 1);
    this._objSymbolsByteAr[this._objOffset++] = uint8 & 0xff;
  }

  /*
  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    if (offset >= 0 && offset <= this._objOffset - 1) {
      desiredValue = this._objSymbolsByteAr[offset];
    }
    return desiredValue;
  }
  //*/

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

  private logMessageOutline(message: string): void {
    if (this.isLoggingOutline) {
      this.context.logger.logMessage(message);
    }
  }
}
