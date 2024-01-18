// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './SpinDocument';
import { Spin2Parser } from './spinParser';

// src/classes/Compiler.ts

export class Compiler {
  private context: Context;
  private spinDocument: SpinDocument | undefined;
  private spin2Parser: Spin2Parser | undefined;
  constructor(ctx: Context) {
    this.context = ctx;
  }

  public Compile(spinFile: SpinDocument) {
    this.spinDocument = spinFile;
    // if we have a vlid file then let's parse it and generate code
    if (this.spinDocument.validFile) {
      this.spin2Parser = new Spin2Parser(this.context, this.spinDocument);

      // here we make calls to the P2* methods (e.g., this.spin2Parser.P2InitStruct(), this.spin2Parser.P2Compile1(), , etc.)
      try {
        this.spin2Parser.P2InitStruct();
        this.spin2Parser.P2Compile1();
      } catch (error) {
        // handle erro message
        //  - decorate it with filename and linenumber, etc.
        //  - emit error message
      }
    }
  }
}
