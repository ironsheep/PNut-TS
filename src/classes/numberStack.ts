/** @format */

// this is our math operation stack

'use strict';

import { Context } from '../utils/context';

// src/classes/numberStack.ts

export class NumberStack {
  private context: Context;
  private isLogging: boolean = false;
  private stack: number[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
  }

  public enableLogging(enable: boolean = true) {
    // can pass false to disable
    this.isLogging = enable;
  }

  public push(value: number) {
    this.stack.push(value);
    this.logMessage(`#STK: push[${this.stack.length - 1}] (${value})`);
  }

  public pop(): number {
    let poppedValue: number = 0;
    const tempValue: number | undefined = this.stack.pop();
    if (tempValue !== undefined) {
      poppedValue = tempValue;
      this.logMessage(`#STK: pop[${this.stack.length}] (${poppedValue})`);
    } else {
      throw new Error('NumberStack: attempted pop from empty stack');
    }
    return poppedValue;
  }

  public reset(): void {
    this.stack = [];
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
