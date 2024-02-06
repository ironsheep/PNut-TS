/** @format */

// this is our math operation stack

'use strict';

// src/classes/numberStack.ts

export class NumberStack {
  private stack: number[] = [];

  public push(value: number) {
    this.stack.push(value);
  }

  public pop(): number {
    let poppedValue: number = 0;
    const tempValue: number | undefined = this.stack.pop();
    if (tempValue) {
      poppedValue = tempValue;
    } else {
      throw new Error('NumberStack: attempted pop from empty stack');
    }
    return poppedValue;
  }

  public reset(): void {
    this.stack = [];
  }
}
