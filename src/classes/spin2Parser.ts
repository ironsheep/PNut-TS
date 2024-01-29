/* eslint-disable @typescript-eslint/no-unused-vars */
// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { SymbolTable } from './symbolTable';
import { SpinElementizer } from './spinElementizer';
import { SpinElement } from './spinElement';
import { RegressionReporter } from './regression';

// src/classes/spin2Parser.ts

// Internal types used for passing complex values
export class Spin2Parser {
  private context: Context;
  private srcFile: SpinDocument;
  private elementizer: SpinElementizer;
  private symbols_debug_hash_auto: SymbolTable = new SymbolTable();
  private symbols_debug_hash_name: SymbolTable = new SymbolTable();
  private symbols_hash_auto: SymbolTable = new SymbolTable();
  private symbols_hash_level: SymbolTable = new SymbolTable();
  private symbols_hash_param: SymbolTable = new SymbolTable();
  private symbols_hash_main: SymbolTable = new SymbolTable();
  private symbols_hash_local: SymbolTable = new SymbolTable();
  private symbols_hash_inline: SymbolTable = new SymbolTable();

  constructor(ctx: Context, spinCode: SpinDocument) {
    this.context = ctx;
    this.srcFile = spinCode;
    this.elementizer = new SpinElementizer(ctx, spinCode);
  }

  get sourceLineNumber(): number {
    return this.elementizer.sourceLineNumber;
  }

  public testGetElementLoop() {
    // store the value(s) in list
    const element_list: SpinElement[] = this.elementizer.getFileElements();

    // now loop thru elements found
    this.logMessage(''); // blank line
    this.logMessage('// ---------------------------------------');
    this.logMessage(`- displaying ${element_list.length} entries`);
    let currSourceLine: number = -1;
    for (let index = 0; index < element_list.length; index++) {
      const element = element_list[index];
      if (element.sourceLineIndex != currSourceLine) {
        const sourceLine: string = this.srcFile.lineAt(element.sourceLineIndex).text;
        this.logMessage(`  -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) [${sourceLine}]`);
        currSourceLine = element.sourceLineIndex;
      }
      const elemTypeStr: string = element.typeString();
      const flagInterp: string = element.isMidStringComma ? `, midString` : '';
      const valueInterp: string = element.valueString().length != 0 ? `, ${element.valueString()}` : '';
      this.logMessage(
        ` (${index + 1}) -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) ${elemTypeStr}${valueInterp}${flagInterp}`
      );
    }
    this.logMessage('\\ ---------------------------------------');
    this.logMessage(''); // blank line

    // if regression reporting enabled then generate the report
    if (this.context.reportOptions.writeElementsReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.writeElementReport(this.srcFile.dirName, this.srcFile.fileName, element_list);
    }
  }

  public P2Compile1() {
    // TODO: we need code here
    throw new Error('@ is not allowed for bitfields, use ^@ to get field pointer');
  }

  public P2Compile2() {
    // TODO: we need code here
  }

  public P2InsertInterpreter() {
    // TODO: we need code here
  }

  private determine_mode(): boolean {
    return false;
  }

  private reset_element(): void {}

  private back_element(): void {}

  private logMessage(message: string): void {
    if (this.context.logOptions.logParser) {
      this.context.logger.logMessage(message);
    }
  }
}
