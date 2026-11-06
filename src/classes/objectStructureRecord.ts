/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { eMemberType } from './objectStructures';

// 	struct record (v54 extended)
// 	-------------
// 	word: size_of_struct_record (including this word)
// 	long: size_of_struct_memory
// 	member record(s)
// 	    long: member offset address
// 	    byte: type (0=byte, 1=word, 2=long, 3=struct + struct_record)
// 	    byte: member_name length
// 	          (0 allowed ONLY for the first and only nameless BYTE/WORD/LONG member - v54)
// 	    byte(s): "member_name"    (zero bytes if length == 0)
// 	    byte: continuation
// 	          0 = end of struct
// 	          1 = another member follows
// 	          2 = bitfield descriptor follows (v54; only after byte/word/long members)
// 	             byte:    bitfield_name length
// 	             byte(s): "bitfield_name"
// 	             word:    packed bitfield = basebit | ((span - 1) << 5)
// 	             <loops back to read next 0/1/2 byte>
//
export class ObjectStructureRecord {
  private context: Context;
  private isLogging: boolean;
  private _id: string;
  private _recordImage: Uint8Array;
  private readOffset: number = 0;

  constructor(ctx: Context, idString: string, recordImage: Uint8Array) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = this.context.logOptions.logCompile;
    this._recordImage = recordImage;
  }

  get length(): number {
    return this._recordImage.length;
  }

  get memoryLength(): number {
    return this.readLong(2);
  }

  public nextLong(): number {
    let desiredLong: number = 0;
    desiredLong |= this.nextWord();
    desiredLong |= this.nextWord() << 16;
    return desiredLong;
  }

  public nextWord(): number {
    let desiredWord: number = 0;
    desiredWord |= this.nextByte();
    desiredWord |= this.nextByte() << 8;
    return desiredWord;
  }

  public nextByte(): number {
    let desiredByte: number = 0;
    if (this.readOffset >= 0 && this.readOffset < this._recordImage.length) {
      desiredByte = this._recordImage[this.readOffset++];
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: nextByte() bad read offset ${this.readOffset} record-${this._id}`);
    }
    return desiredByte;
  }

  public peekByte(): number {
    // return byte at current offset without incrementing offset
    let desiredByte: number = 0;
    if (this.readOffset >= 0 && this.readOffset < this._recordImage.length) {
      desiredByte = this.readByte(this.readOffset);
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: peekByte() bad read offset ${this.readOffset} record-${this._id}`);
    }
    return desiredByte;
  }

  public get offset(): number {
    return this.readOffset;
  }

  public readBitfieldEntry(): { name: string; packedDescriptor: number } {
    // v54: read a single bitfield-chain entry: length-prefixed name then 16-bit packed descriptor
    //  caller has already consumed the continuation byte (value == 2).
    const name = this.readString();
    const packedDescriptor = this.nextWord();
    this.logMessage(`* OSRcd: readBitfieldEntry() -> name='${name}', desc=0x${packedDescriptor.toString(16).padStart(4, '0')}`);
    return { name, packedDescriptor };
  }

  public skipBitfieldEntry(): void {
    // v54: skip past a bitfield-chain entry without decoding it (name + 16-bit descriptor)
    const nameLen = this.nextByte();
    this.readOffset += nameLen + 2;
  }

  public isFirstMemberNameless(): boolean {
    // v54: peek at the first member to detect the nameless single BWL form.
    //  Record layout leading up to the name-length byte:
    //    +0..+1 : size (word)
    //    +2..+5 : memory size (long)
    //    +6..+9 : first member offset (long)
    //    +10    : first member type byte (0=BYTE, 1=WORD, 2=LONG; 3=STRUCT is never nameless)
    //    +11    : first member name-length  <-- what we probe
    //  Nameless iff type byte is 0/1/2 AND name-length is 0.
    if (this._recordImage.length < 12) {
      return false;
    }
    const firstType = this._recordImage[10];
    const firstNameLen = this._recordImage[11];
    return firstNameLen === 0 && firstType <= eMemberType.MT_LONG;
  }

  public peekWord(): number {
    let desiredWord: number = 0;
    desiredWord |= this.readByte(this.readOffset + 0);
    desiredWord |= this.readByte(this.readOffset + 1) << 8;
    return desiredWord;
  }

  public skipToName(): [boolean, number, number] {
    // called when at type byte.  If type is structure then return offset to structure and skip past it
    let structureFoundStatus: boolean = false;
    let structureOffset: number = 0;
    const typeByte = this.nextByte();
    if (typeByte == eMemberType.MT_STRUCT) {
      structureFoundStatus = true;
      structureOffset = this.readOffset;
      const rcdLength = this.nextWord();
      this.readOffset += rcdLength - 2;
    }
    return [structureFoundStatus, typeByte, structureOffset];
  }

  public recordWithinStructureRecord(internalRcdOffset: number): ObjectStructureRecord {
    // return internal structure record from within current record
    //  NOTE: this must be passed the value returned by skipToName()
    if (internalRcdOffset >= 0 && internalRcdOffset < this._recordImage.length) {
      this.readOffset = internalRcdOffset;
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: recordWithinStructureRecord() bad read offset ${internalRcdOffset} record-${this._id}`);
    }
    const recordSize: number = this.peekWord();
    const desiredRecord: Uint8Array = new Uint8Array(recordSize);
    if (recordSize > 0) {
      desiredRecord.set(this._recordImage.subarray(this.readOffset, this.readOffset + recordSize));
    }
    return new ObjectStructureRecord(this.context, `internalRCDofs(${this.readOffset})`, desiredRecord);
  }

  public readString(): string {
    // assume that we are pointed to the length byte
    //  then return following len bytes as string
    const stringLength = this.nextByte();
    const subset = this._recordImage.subarray(this.readOffset, this.readOffset + stringLength);
    const desiredString: string = String.fromCharCode(...subset);
    this.logMessage(`* OSRcd: at ofs=(${this.readOffset}), string=[${desiredString}]`);
    this.readOffset += stringLength;

    return desiredString;
  }

  public readLong(offset: number): number {
    let desiredLong: number = 0;
    desiredLong |= this.readWord(offset + 0);
    desiredLong |= this.readWord(offset + 2) << 16;
    return desiredLong;
  }

  public readWord(offset: number): number {
    let desiredWord: number = 0;
    desiredWord |= this.readByte(offset + 0);
    desiredWord |= this.readByte(offset + 1) << 8;
    return desiredWord;
  }

  public readByte(offset: number): number {
    let desiredByte: number = 0;
    if (offset >= 0 && offset < this._recordImage.length) {
      desiredByte = this._recordImage[offset];
    } else {
      // [error_INTERNAL]
      throw new Error(`OSRcd: readByte() bad read offset ${offset} record-${this._id}`);
    }
    return desiredByte;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
