/* eslint-disable @typescript-eslint/no-unused-vars */
// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { eElementType } from './types';
import { SymbolTable } from './symbolTable';
import { SpinElementizer } from './spinElementizer';
import { SpinElement } from './spinElement';
import { toFloatString } from '../utils/float32';

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
    if (this.context.logOptions.logElementizer) {
      this.srcFile.setDebugContext(this.context);
    }
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
    for (let index = 0; index < element_list.length; index++) {
      const element = element_list[index];
      const elemTypeStr: string = element.typeString();
      const flagInterp: string = element.isMidStringComma ? `, midString` : '';
      let valueInterp: string = typeof element.value === 'number' ? `, (${element.value})` : element.value;
      if (element.type == eElementType.type_con_float) {
        valueInterp = `, (${toFloatString(element.value)})`;
      }
      if (typeof element.value === 'string') {
        valueInterp = `, "${element.value}"`;
      }
      if (!element.value) {
        valueInterp = '';
      }
      this.logMessage(` (${index + 1}) -- Ln#${element.sourceLineIndex}(${element.sourceCharacterOffset}) ${elemTypeStr}${valueInterp}${flagInterp}`);
    }
    this.logMessage('\\ ---------------------------------------');
    this.logMessage(''); // blank line
  }

  public P2InitStruct() {
    // TODO: we need code here
    throw new Error('ALIGNW/ALIGNL not allowed within inline assembly code');
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
    if (this.context.logOptions.logElementizer) {
      this.context.logger.logMessage(message);
    }
  }
}
