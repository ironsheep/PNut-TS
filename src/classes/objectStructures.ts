/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { hexAddress, hexByte, hexWord } from '../utils/formatUtils';
import { ObjectStructureRecord } from './objectStructureRecord';

// src/classes/objectStructures.ts

//  Struct-definition record
//
//  struct_name = existing_struct_name
//
//  struct_name({byte/word/long/struct} member_name{[count]}{.bitfield_name[bit_or_range]}..., ...)
//
// 	struct element
// 	--------------
// 	type = type_con_struct
// 	value = struct id
//
// 	struct record (v54 extended)
// 	-------------
// 	word: size_of_struct_record (including this word)
// 	long: size_of_struct_memory
// 	member record(s)
// 	    long: member offset address
// 	    byte: type (0=byte, 1=word, 2=long, 3=struct + struct_record)
// 	    byte: member_name length
// 	           (0 allowed ONLY for the first and only nameless BYTE/WORD/LONG member - v54)
// 	    byte(s): "member_name"    (zero bytes if length == 0)
// 	    byte: continuation
// 	          0 = end of struct (no more members)
// 	          1 = another member follows
// 	          2 = bitfield descriptor follows (v54; only valid after byte/word/long members)
// 	             byte:    bitfield_name length
// 	             byte(s): "bitfield_name"
// 	             word:    packed bitfield = basebit | ((span - 1) << 5)
// 	             <loops back to read next 0/1/2 byte>
//

export enum eMemberType {
  MT_BYTE = 0,
  MT_WORD = 1,
  MT_LONG = 2,
  MT_STRUCT,
  MT_Unknown
}

export class ObjectStructures {
  private context: Context;
  private isLogging: boolean;
  private isLoggingOutline: boolean;
  private _id: string;

  static readonly MAX_STRUCTURES: number = 0x1000; // PNut  struct_id_limit := $1000;
  static readonly MAX_SIZE_IN_BYTES: number = 0x20000; // PNut  struct_def_limit := $20000;
  static readonly ALLOC_SIZE_IN_BYTES: number = 1024; // Initial size for the Uint8Array

  private _objStructRecordOffsets: number[] = [];
  private _objStructureByteAr: Uint8Array;
  private _objStructureOffset: number = 0; // current index into OBJ image
  private _objReadStructureOffset: number = 0; // read index into OBJ image
  // structure support
  private _structIdNext: number = 0;
  private _structRecordSize: number = 0;
  private _structMemorySize: number = 0;
  private _structStartOffset: number = 0;
  private _lastTypeRecorded: eMemberType = eMemberType.MT_Unknown;
  private _lastSizeRecorded: number = 0;

  constructor(ctx: Context, idString: string) {
    this.context = ctx;
    this._id = idString;
    this.isLogging = ctx.logOptions.logCompile;
    this.isLoggingOutline = ctx.logOptions.logOutline;
    this._objStructureByteAr = new Uint8Array(ObjectStructures.ALLOC_SIZE_IN_BYTES); // initial memory size
  }

  private ensureCapacity(neededCapacity: number) {
    if (neededCapacity > this._objStructureByteAr.length && this._objStructureByteAr.length < ObjectStructures.MAX_SIZE_IN_BYTES) {
      // our array grows in multiples of ALLOC_SIZE_IN_BYTES at a time
      const tmpCapacity: number = Math.ceil(neededCapacity / ObjectStructures.ALLOC_SIZE_IN_BYTES) * ObjectStructures.ALLOC_SIZE_IN_BYTES;
      const newCapacity: number = tmpCapacity > ObjectStructures.MAX_SIZE_IN_BYTES ? ObjectStructures.MAX_SIZE_IN_BYTES : tmpCapacity;
      this.logMessageOutline(`++ MEM-ALLOC: OBJSTRUCT grows from (${this._objStructureByteAr.length / 1024} kB) to (${newCapacity / 1024} kB)`);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this._objStructureByteAr);
      //this._objStructureByteAr = null; // force prior to be deallocated AUGH doesn't work!
      this._objStructureByteAr = newBuffer;
    }
  }

  [Symbol.iterator]() {
    return this._objStructureByteAr.values();
  }

  get length(): number {
    return this._objStructureOffset;
  }

  get haveMaxStructures(): boolean {
    return this._structIdNext >= ObjectStructures.MAX_STRUCTURES ? true : false;
  }

  public setOffset(offset: number) {
    this._objReadStructureOffset = offset;
  }

  public readNext(): number {
    let desiredValue: number = 0;
    desiredValue = this._objStructureByteAr[this._objReadStructureOffset++];
    this.logMessage(`* OBJSTRUCT: readnext(${hexAddress(this._objReadStructureOffset - 1)}) -> v=(${hexByte(desiredValue)})`);
    return desiredValue;
  }

  public getStructureSizeForID(recordId: number): number {
    let desiredSizeInBytes: number = 0;
    if (recordId >= 0 && recordId < this._objStructRecordOffsets.length) {
      const record: Uint8Array = this.readRecord(recordId);
      desiredSizeInBytes = this.readLongAt(2, record);
    }
    this.logMessage(`* OBJSTRUCT: getStructureSizeForID(RCD#${recordId}) -> (${desiredSizeInBytes})`);
    return desiredSizeInBytes;
  }

  public getStructureRecord(recordId: number): ObjectStructureRecord {
    this.logMessage(`* OBJSTRUCT: getStructureRecord(RCD#${recordId})`);
    const recordImage = this.readRecord(recordId);
    return new ObjectStructureRecord(this.context, `RCD#${recordId}`, recordImage);
  }

  public readRecord(recordId: number): Uint8Array {
    // retrieve the record from the set of structure-definition records
    this.logMessage(`* OBJSTRUCT: readRecord(RCD#${recordId})`);
    let desiredRecord: Uint8Array;
    let desiredRcdLen: number = 0;
    if (recordId >= 0 && recordId < this._objStructRecordOffsets.length) {
      const recordOffset = this._objStructRecordOffsets[recordId];
      desiredRcdLen = this._objStructureByteAr[recordOffset + 0] | (this._objStructureByteAr[recordOffset + 1] << 8);
      desiredRecord = new Uint8Array(desiredRcdLen);
      if (desiredRcdLen > 0) {
        desiredRecord.set(this._objStructureByteAr.subarray(recordOffset, recordOffset + desiredRcdLen));
      }
    } else {
      // [error_ PNut TS new]
      throw new Error(`ERROR: couldn't find existing structure RCD#${recordId}`);
    }
    this.logMessage(`* OBJSTRUCT: RCD#${recordId} is ${hexWord(desiredRecord.length)}(${desiredRecord.length}) bytes`);
    return desiredRecord;
  }

  public beginRecord() {
    // starting new record, record offset into table for new ID
    //  reset accumulated record size and memory size
    //const newRecordId: number = this._objStructRecordOffsets.length;
    this.logMessage(`* OBJSTRUCT: beginRecord()`);
    this._structStartOffset = this._objStructureOffset;
    this._objStructRecordOffsets.push(this._structStartOffset);
    this._structRecordSize = 0;
    this._structMemorySize = 0;
    this.enterWord(0);
    this.enterLong(BigInt(0));
  }

  public endRecord(): number {
    // record accumulated record size and memory size into record
    this.logMessage(`* OBJSTRUCT: endRecord()`);
    this.replaceWord(this._structStartOffset, this._structRecordSize);
    this.replaceLong(this._structStartOffset + 2, this._structMemorySize);
    this._structIdNext++;
    const latestRecordId = this._objStructRecordOffsets.length - 1;
    this.logMessage(
      `* OBJSTRUCT: endRecord() -> RCD#${latestRecordId}, _objStructRecordOffsets=[${this._objStructRecordOffsets}](${this._objStructRecordOffsets.length})`
    );
    return latestRecordId;
  }

  public beginMemberRecord() {
    // begin our structure member record
    this.logMessage(`* OBJSTRUCT: beginMemberRecord()`);
    this.enterLong(BigInt(this._structMemorySize));
  }

  public endMemberRecord(flagValue: number) {
    // end our structure member record
    this.logMessage(`* OBJSTRUCT: endMemberRecord(flag=(${flagValue}))`);
    this.enterByte(flagValue);
  }

  public enterSymbolName(name: string) {
    // record name into record, length first
    this.logMessage(`* OBJSTRUCT: enterSymbolName('${name}')`);
    if (name !== undefined && name.length > 0 && name.length < 32) {
      this.enterByte(name.length);
      for (let index = 0; index < name.length; index++) {
        this.enterByte(name.charCodeAt(index));
      }
    } else {
      this.context.logger.errorMsg(`ERROR: ObjectStructures() bad name!`);
    }
  }

  public readLongAt(offset: number, buffer: Uint8Array): number {
    let longValue: number = 0;
    longValue |= buffer[offset + 0];
    longValue |= buffer[offset + 1] << 8;
    longValue |= buffer[offset + 2] << 16;
    longValue |= buffer[offset + 3] << 24;
    return longValue;
  }

  public enterAssignedStructure(recordId: number): number {
    // PNut @@enter_struct:
    this._structStartOffset = this._objStructureOffset;
    this._objStructRecordOffsets.push(this._structStartOffset);
    const existingRecord = this.readRecord(recordId);
    for (let index = 0; index < existingRecord.length; index++) {
      this.enterByte(existingRecord[index]);
    }
    this._structIdNext++; // count this structure too for limit checks
    const latestRecordId = this._objStructRecordOffsets.length - 1;
    this.logMessage(`* OBJSTRUCT: enterAssignedStructure(RCD#${recordId}) -> id=(${latestRecordId})`);
    return latestRecordId;
  }

  public enterStructureAsNew(structData: Uint8Array): number {
    // adding existing record, record offset into table for new ID
    //  accumulated record size and memory size are already in bytes
    this._structStartOffset = this._objStructureOffset;
    this._objStructRecordOffsets.push(this._structStartOffset);
    for (let index = 0; index < structData.length; index++) {
      this.enterByte(structData[index]);
    }
    this._structIdNext++; // count this structure too for limit checks
    const latestRecordId = this._objStructRecordOffsets.length - 1;
    this.logMessage(`* OBJSTRUCT: enterStructureAsNew(${structData.length} bytes) -> id=(${latestRecordId})`);
    return latestRecordId;
  }

  public recordStructElementName(name: string) {
    // record name found within structure declaration
    //  v54: empty name (length 0) is the nameless-single-BWL-member marker
    this.logMessage(`* OBJSTRUCT: recordStructElementName('${name}')`);
    this.enterByte(name.length);
    for (let index = 0; index < name.length; index++) {
      this.enterByte(name.charCodeAt(index));
    }
  }

  public recordBitfieldEntry(name: string, packedDescriptor: number) {
    // v54: write a bitfield chain entry with its own leading continuation byte (value 2).
    //  Layout: 0x02, name-length, name chars, 16-bit packed descriptor
    //  (descriptor = basebit | ((span - 1) << 5)).  The trailing continuation (0 or 1 to
    //  end the struct / start the next member, or another 2 for another chained bitfield) is
    //  emitted by the caller — via endMemberRecord for the last one, or another recordBitfieldEntry
    //  call for the next chained bitfield.
    this.logMessage(`* OBJSTRUCT: recordBitfieldEntry('${name}', 0x${hexWord(packedDescriptor)})`);
    this.enterByte(2);
    this.enterByte(name.length);
    for (let index = 0; index < name.length; index++) {
      this.enterByte(name.charCodeAt(index));
    }
    this.enterWord(packedDescriptor & 0xffff);
  }

  public recordStructWithinStruct(recordId: number) {
    // register a structure within structure being defined
    this.logMessage(`* OBJSTRUCT: recordStructWithinStruct(RCD#${recordId})`);
    const existingRecord: Uint8Array = this.readRecord(recordId);
    const structSize: number = this.readLongAt(2, existingRecord);
    this._lastSizeRecorded = structSize;
    this._lastTypeRecorded = eMemberType.MT_STRUCT;
    this.enterByte(this._lastTypeRecorded);
    for (let index = 0; index < existingRecord.length; index++) {
      this.enterByte(existingRecord[index]);
    }
  }

  public recordStructElement(typeSize: eMemberType) {
    this.logMessage(`* OBJSTRUCT: recordStructElement([${eMemberType[typeSize]}])`);
    this._lastTypeRecorded = typeSize; // 0,1,2
    // lastly record the composite size
    this._lastSizeRecorded = 1 << typeSize; // 1,2,4
    this.enterByte(typeSize);
    //this._structMemorySize += this._lastSizeRecorded;
  }

  public checkIndexedMemberSize() {
    // a member with more than one instance must itself be indexable
    if (this._lastSizeRecorded > 0xffff) {
      // [error_iscexb]
      throw new Error('Indexed structures cannot exceed $FFFF bytes in size (m400)');
    }
  }

  public finalizeStructElement(nbrInstances: number, objectSizeLimit: number) {
    // PNut @@gotcount: multiply element size in bytes by nbrInstances w/size exceeded checks
    //  one member may reach the limit, but the running offset must stay below it
    const elementSizeInBytes: number = this._lastSizeRecorded * nbrInstances;
    if (elementSizeInBytes > objectSizeLimit) {
      // [error_sehr]
      throw new Error('Structure exceeds hub range of $FFFFF (m530)');
    }
    this._structMemorySize += elementSizeInBytes;
    if (this._structMemorySize >= objectSizeLimit) {
      // [error_sehr]
      throw new Error('Structure exceeds hub range of $FFFFF (m531)');
    }
    return this._structMemorySize;
  }

  public enterLong(uint32Value: bigint) {
    const valueAsNumber = Number(uint32Value & BigInt(0xffffffff));
    this.enterByte(valueAsNumber);
    this.enterByte(valueAsNumber >> 8);
    this.enterByte(valueAsNumber >> 16);
    this.enterByte(valueAsNumber >> 24);
  }

  public enterWord(uint16Value: number) {
    this.enterByte(uint16Value);
    this.enterByte(uint16Value >> 8);
  }

  public enterByte(uint8Value: number) {
    // append byte to end of image
    //  the definitions may fill the buffer exactly: only the byte past the last one is an error
    if (this._objStructureOffset == ObjectStructures.MAX_SIZE_IN_BYTES) {
      // [error_dsdle]
      throw new Error('Data structure-definitions limit exceeded');
    }
    this.logMessage(`* OBJSTRUCT: append(v=(${hexByte(uint8Value)})) wroteTo(${hexAddress(this._objStructureOffset)})`);
    this.ensureCapacity(this._objStructureOffset + 1);
    this._objStructureByteAr[this._objStructureOffset++] = uint8Value & 0xff;
    this._structRecordSize++;
  }

  public read(offset: number): number {
    // read existing value from image
    let desiredValue: number = 0;
    if (offset >= 0 && offset < this._objStructureOffset) {
      desiredValue = this._objStructureByteAr[offset];
    } else {
      // [error_INTERNAL]
      throw new Error(`ERROR[INTERNAL]: OBJSTRUCT: read() offset=(${offset}) out of range [0-${this._objStructureOffset}]`);
    }
    return desiredValue;
  }

  public reset() {
    // effectively empty our image
    this._objStructureOffset = 0; // call method, so logs
    this._objReadStructureOffset = 0;
    this._objStructRecordOffsets = [];
    this._structIdNext = 0;
    this.logMessage(`* OBJSTRUCT: reset()`);
  }

  private replaceLong(offset: number, value: number) {
    this.replaceByte(offset, value);
    this.replaceByte(offset + 1, value >> 8);
    this.replaceByte(offset + 2, value >> 16);
    this.replaceByte(offset + 3, value >> 24);
  }

  private replaceWord(offset: number, value: number) {
    this.replaceByte(offset, value);
    this.replaceByte(offset + 1, value >> 8);
  }

  private replaceByte(offset: number, value: number) {
    if (offset >= 0 && offset < this._objStructureOffset) {
      this.logMessage(`* OBJSTRUCT: replace(v=(${hexByte(value)})) wroteTo(${hexAddress(offset)})`);
      this._objStructureByteAr[offset] = value & 0xff;
    } else {
      // [error_INTERNAL]
      throw new Error(`ERROR[INTERNAL]: OBJSTRUCT: replaceByte() offset=(${offset}) out of range [0-${this._objStructureOffset}]`);
    }
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
