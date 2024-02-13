// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { Spin2Parser } from './spin2Parser';
import { RegressionReporter } from './regression';

// src/classes/compiler.ts

export class Compiler {
  private context: Context;
  private srcFile: SpinDocument | undefined;
  private spin2Parser: Spin2Parser | undefined;

  constructor(ctx: Context) {
    this.context = ctx;
  }

  public Compile(spinFile: SpinDocument) {
    this.srcFile = spinFile;
    // TESTING: if requested, run our internal-tables regression report generator
    if (this.context.reportOptions.writeTablesReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.writeTableReport(this.srcFile.dirName, this.srcFile.fileName);
    }

    // TESTING: if requested, run our resolver regression test report generator
    if (this.context.reportOptions.writeResolverReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.runResolverRegression(this.srcFile.dirName, this.srcFile.fileName);
    }

    // if we have a valid file then let's parse it and generate code
    if (this.srcFile.validFile) {
      this.spin2Parser = new Spin2Parser(this.context, this.srcFile);

      // here we make calls to the P2* methods (e.g., this.spin2Parser.P2Compile1(), , etc.)
      try {
        //this.spin2Parser.fakeGetElementLoop();
        //this.spin2Parser.fakeResolver();
        this.spin2Parser.P2Elementize();
        this.spin2Parser.P2Compile1();
        this.spin2Parser.P2Compile2();
        this.spin2Parser.P2List();

        //this.spin2Parser.P2Compile1();
      } catch (error: unknown) {
        if (error instanceof Error) {
          const filename: string = this.srcFile.fileName;
          const sourceLineNumber: number = this.spin2Parser.sourceLineNumber;
          this.context.logger.compilerErrorMsg(`${filename}:${sourceLineNumber}:error:${error.message}`);
          if (error.stack) {
            this.context.logger.errorMsg(error.stack);
          }
        } else {
          // If it's not an Error object, it could be a string, null, etc.
          this.context.logger.errorMsg(error);
        }
      }
    }
  }
}
