/** @format */

// this is our math block stack

'use strict';

import { Context } from '../utils/context';

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

  public toString(): string {
    const description: string = `id=(${this.objectId}), offset=(${this.objectOffset}), subCt=(${this.subObjectCount}), mthdCt=(${this.methodCount}), objSz=(${this.objectSize})`;
    return description;
  }
}

export class DistillerList {
  private context: Context;
  private isLogging: boolean = false;
  private _recordList: DistillerRecord[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = true; // ctx.logOptions.logResolver;
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

  public record(index: number): DistillerRecord | undefined {
    let desiredRecord: DistillerRecord | undefined = undefined;
    if (index >= 0 && index < this._recordList.length) {
      desiredRecord = this._recordList[index];
    }

    return desiredRecord;
  }

  public dumpRecords() {
    this.logMessage('  -- ------------------------------');
    if (this._recordList.length > 0) {
      for (let index = 0; index < this._recordList.length; index++) {
        const currRecord = this._recordList[index];
        const recordIdStr: string = `#${index + 1}[${index}]`;
        this.logMessage(`  -- ${recordIdStr} ${currRecord.toString()}`);
      }
    } else {
      this.logMessage('     {empty distiller record list}');
    }
    this.logMessage('  -- ------------------------------');
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
