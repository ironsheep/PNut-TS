/** @format */

// this is our math operation stack

'use strict';

import { Context } from '../utils/context';

// src/classes/numberStack.ts

export class NumberStack {
  private context: Context;
  private isLogging: boolean = false;
  private stack: bigint[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  public push(value: bigint) {
    this.stack.push(value);
    this.logMessage(`#STK: push[${this.stack.length - 1}] (${this.float32ToHexString(value)})`);
  }

  public pop(): bigint {
    let poppedValue: bigint = 0n;
    const tempValue: bigint | undefined = this.stack.pop();
    if (tempValue !== undefined) {
      poppedValue = tempValue;
      this.logMessage(`#STK: pop[${this.stack.length}] (${this.float32ToHexString(poppedValue)})`);
    } else {
      throw new Error('NumberStack: attempted pop from empty stack');
    }
    return poppedValue;
  }

  public reset(): void {
    this.stack = [];
  }

  private float32ToHexString(float32: bigint): string {
    // used by: spinElementizer.ts
    const tempNumber: number = Number(float32 & BigInt(0xffffffff));
    return `0x${tempNumber.toString(16).toUpperCase()}`;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
