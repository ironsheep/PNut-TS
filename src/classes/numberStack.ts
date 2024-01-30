/** @format */

// this is our math operation stack

'use strict';

// src/classes/numberStack.ts

export class NumberStack {
  private stack: number[] = [];

  public push(value: number) {
    this.stack.push(value);
  }

  public pop(): number | undefined {
    return this.stack.pop();
  }

  public reset(): void {
    this.stack = [];
  }
}
