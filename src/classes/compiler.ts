// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from 'vm';

// src/classes/Compiler.ts

export class Compiler {
  private context: Context;

  constructor(ctx: Context) {
    this.context = ctx;
  }

  public Compile(filename: string) {}
}
