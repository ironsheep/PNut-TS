/** @format */

// this is our math block stack

'use strict';

import { Context } from '../utils/context';

export enum eNestType {
  NT_Unknown,
  NT_Look
}

// src/classes/numberStack.ts
export class BlockNestLevel {
  private context: Context;
  private isLogging: boolean = false;
  private _type: eNestType;
  private _size: number;
  private _addressStack: number[];

  constructor(ctx: Context, type: eNestType, size: number) {
    this.context = ctx;
    this._type = type;
    this._size = size;
    this._addressStack = Array(size).fill(0x7ffff);
  }

  public setType(type: eNestType) {
    this._type = type;
  }

  public setValue(index: number, value: number) {
    if (index >= 0 && index <= this._addressStack.length) {
      this._addressStack[index] = value;
    } else {
      this.logMessage(`ERROR: setValue() attempt to write value out of range (${index}) must be [0-${this._addressStack.length}]!`);
    }
  }

  public value(index: number): number {
    let desiredValue: number = 0;
    if (index >= 0 && index <= this._addressStack.length) {
      desiredValue = this._addressStack[index];
    } else {
      this.logMessage(`ERROR: value() attempt to read value out of range (${index}) must be [0-${this._addressStack.length}]!`);
    }
    return desiredValue;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}

export class BlockStack {
  private context: Context;
  private isLogging: boolean = false;

  private _stack: BlockNestLevel[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
  }

  get topNestLevel(): BlockNestLevel {
    return this._stack[this._stack.length - 1];
  }

  public add(type: eNestType, size: number) {
    // allocate our new top-level entry
    const nextLevel: BlockNestLevel = new BlockNestLevel(this.context, type, size);
    this._stack.push(nextLevel);
  }

  public remove() {
    // remove the current top-level entry
    if (this._stack.length > 0) {
      this._stack.pop();
    }
  }

  public overrideType(type: eNestType) {
    if (this._stack.length > 0) {
      this.topNestLevel.setType(type);
    } else {
      this.logMessage(`ERROR: overrideType() attempt to set type when empty!`);
    }
  }

  public write(index: number, value: number) {
    if (this._stack.length > 0) {
      this.topNestLevel.setValue(index, value);
    } else {
      this.logMessage(`ERROR: write() attempt to write value when empty!`);
    }
  }

  public read(index: number): number {
    let desiredValue: number = 0;
    if (this._stack.length > 0) {
      desiredValue = this.topNestLevel.value(index);
    } else {
      this.logMessage(`ERROR: read() attempt to read value when empty!`);
    }
    return desiredValue;
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
