/** @format */
'use strict';

// src/classes/spinResolver.ts

// spin compile resolver
import { Context } from '../utils/context';
import { SpinElement } from './spinElement';
import { eElementType } from './types';

export class SpinResolver {
  private context: Context;
  private spinElements: SpinElement[];

  constructor(ctx: Context, elementList: SpinElement[]) {
    this.context = ctx;
    this.spinElements = elementList;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resolve_expression(elementIndex: number): SpinElement {
    return new SpinElement(eElementType.type_undefined, '', 0, 0);
  }

  private logMessage(message: string): void {
    if (this.context.logOptions.logResolver) {
      this.context.logger.logMessage(message);
    }
  }
}
