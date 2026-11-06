/** @format */

'use strict';

import { Context } from '../utils/context';

/**
 * DistillerRecord - Represents a compiled object in the distillation process.
 *
 * Each record contains metadata about a compiled Spin2/PASM2 object including
 * its location in the object image, structure (sub-objects and methods), and
 * relationships to other objects. Used by ObjectDistiller for deduplication.
 *
 * Memory layout per record:
 * - objectId: Unique identifier for this object
 * - objectOffset: Byte offset in the object image
 * - subObjectCount: Number of child objects this object references
 * - methodCount: Number of methods in this object
 * - objectSize: Total size in bytes
 * - subObjectIds: Array of child object IDs (with bit 31 as completion flag)
 */
export class DistillerRecord {
  private _objectId: number;
  private _objectOffset: number;
  private _subObjectCount: number;
  private _methodCount: number;
  private _objectSize: number;
  private _subObjectIds: number[];

  // Distiller data
  //
  // 3+ long records:
  //
  // 0:	object id
  // 1:	object offset
  // 2:	sub-object count
  // 3:	method count
  // 4:	object size
  // 5+:	sub-object id's (if any)

  constructor(id: number, offset: number, subObjCount: number, methodCount: number, size: number, subObjIDs: number[] = []) {
    this._objectId = id;
    this._objectOffset = offset;
    this._subObjectCount = subObjCount;
    this._methodCount = methodCount;
    this._objectSize = size;
    this._subObjectIds = subObjIDs;
  }

  get objectId(): number {
    return this._objectId;
  }
  get objectOffset(): number {
    return this._objectOffset;
  }
  get subObjectCount(): number {
    return this._subObjectCount;
  }
  get methodCount(): number {
    return this._methodCount;
  }
  get objectSize(): number {
    return this._objectSize;
  }
  get subObjectIds(): number[] {
    return this._subObjectIds;
  }

  // Setters for mutation during distillation
  set objectOffset(value: number) {
    this._objectOffset = value;
  }

  // Update a specific sub-object ID at index
  public updateSubObjectId(index: number, newId: number): void {
    if (index >= 0 && index < this._subObjectIds.length) {
      this._subObjectIds[index] = newId;
    }
  }

  public toString(): string {
    const description: string = `id=(${this.objectId}), offset=(${this.objectOffset}), subCt=(${this.subObjectCount}), mthdCt=(${this.methodCount}), objSz=(${this.objectSize})`;
    return description;
  }
}

/**
 * DistillerList - Collection of DistillerRecords for object deduplication.
 *
 * Provides storage and manipulation of DistillerRecords during the five-phase
 * distillation algorithm. Supports record addition, removal, search by object ID,
 * and bulk updates of sub-object references. Used exclusively by ObjectDistiller.
 *
 * Key operations:
 * - addrecord/getRecordAt: Basic record storage
 * - findRecordIndexByObjectId: Search with 0x7FFFFFFF masking
 * - replaceSubObjectId: Bulk ID replacement across all records
 * - removeRecordAt: Record deletion during elimination phase
 */
export class DistillerList {
  private context: Context;
  private isLogging: boolean = false;
  private _recordList: DistillerRecord[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = ctx.logOptions.logResolver;
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  get recordCount(): number {
    return this._recordList.length;
  }

  public addrecord(newRecord: DistillerRecord) {
    this._recordList.push(newRecord);
    this.logMessage(`* distiller ADD #${this.recordCount}[${this.recordCount - 1}]: ${newRecord.toString()}`);
  }

  // Clear all records
  public clear(): void {
    this._recordList = [];
  }

  // Get record at index
  public getRecordAt(index: number): DistillerRecord | undefined {
    return index >= 0 && index < this._recordList.length ? this._recordList[index] : undefined;
  }

  // Get record at an index the caller knows is in range
  public requireRecordAt(index: number): DistillerRecord {
    const record = this.getRecordAt(index);
    if (record === undefined) {
      throw new Error(`ERROR[INTERNAL] no distiller record at index ${index}`);
    }
    return record;
  }

  // Remove record at index
  public removeRecordAt(index: number): boolean {
    if (index >= 0 && index < this._recordList.length) {
      this._recordList.splice(index, 1);
      return true;
    }
    return false;
  }

  // Find record by object ID (returns index or -1)
  public findRecordIndexByObjectId(objectId: number): number {
    const maskedSearchId = objectId & 0x7fffffff;
    for (let i = 0; i < this._recordList.length; i++) {
      if ((this._recordList[i].objectId & 0x7fffffff) === maskedSearchId) {
        return i;
      }
    }
    return -1;
  }

  // Replace all sub-object ID references across all records
  public replaceSubObjectId(oldId: number, newId: number): void {
    const maskedOldId = oldId & 0x7fffffff;
    const newIdWithFlag = newId | 0x80000000;

    for (const record of this._recordList) {
      for (let i = 0; i < record.subObjectIds.length; i++) {
        const subId = record.subObjectIds[i] & 0x7fffffff;
        if (subId === maskedOldId || subId === (newId & 0x7fffffff)) {
          record.updateSubObjectId(i, newIdWithFlag);
        }
      }
    }
  }

  // Generator for iteration with index
  public *records(): Generator<[number, DistillerRecord]> {
    for (let i = 0; i < this._recordList.length; i++) {
      yield [i, this._recordList[i]];
    }
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
