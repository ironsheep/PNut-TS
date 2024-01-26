// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { Spin2Parser } from './spin2Parser';

// src/classes/compiler.ts

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

      // here we make calls to the P2* methods (e.g., this.spin2Parser.P2Compile1(), , etc.)
      try {
        this.spin2Parser.testGetElementLoop();
        //this.spin2Parser.P2Compile1();
      } catch (error: unknown) {
        if (error instanceof Error) {
          const filename: string = this.spinDocument.fileName;
          const sourceLineNumber: number = this.spin2Parser.sourceLineNumber;
          this.context.logger.compilerErrorMsg(`${filename}:${sourceLineNumber}:error:${error.message}`);
          //if (error.stack) {
          //  this.context.logger.errorMsg(error.stack);
          //}
        } else {
          // If it's not an Error object, it could be a string, null, etc.
          this.context.logger.errorMsg(error);
        }
      }
    }
  }
}
