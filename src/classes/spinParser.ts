// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './SpinDocument';
import { eElementType, eValueType } from './types';
import { TextLine } from './TextLine';

// src/classes/Compiler.ts

export class Compiler {
  private context: Context;
  private srcFile: SpinDocument;
  private currLineIndex: number = 0;
  private currCharacterIndex: number = 0;
  private currflags: number = 0;
  private currentTextLine: TextLine;
  private currentLine: string;
  private currentLineLength: number;
  private source_flags: number = 0;
  private at_eof: boolean = false;
  private at_eol: boolean = false;

  constructor(ctx: Context, spinCode: SpinDocument) {
    this.context = ctx;
    this.srcFile = spinCode;
    this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
    this.currentLine = this.currentTextLine.text;
    this.currentLineLength = this.currentLine.length;
    this.at_eol = this.currentLineLength == 0 ? true : false;
    this.at_eof = this.srcFile.lineCount == 0 ? true : false;
  }

  private loadLine(lineIndex: number): number {
    if (!this.at_eof) {
      this.currentTextLine = this.srcFile.lineAt(lineIndex);
      this.currentLine = this.currentTextLine.text;
      this.currentLineLength = this.currentLine.length;
    }
    return this.currLineIndex < this.srcFile.lineCount - 1 ? lineIndex + 1 : -1;
  }

  public determine_mode(): boolean {
    this.reset_element();
    let bFoundSpin: boolean = false;
    let [elemType, elemValue] = this.get_element();
    do {
      if (elemType == eElementType.type_block && elemValue != eValueType.block_con && elemValue != eValueType.block_dat) {
        bFoundSpin = true;
        break; // we have our result, exit loop
      }
      [elemType, elemValue] = this.get_element();
    } while (elemType != eElementType.type_end);
    return bFoundSpin;
  }

  public reset_element(): void {
    this.currCharacterIndex = 0;
    this.currLineIndex = 0;
    this.currflags = 0;
  }

  public get_element(): [eElementType, eValueType] {
    let typeFound: eElementType = eElementType.type_undefined;
    let valueFound: eValueType = eValueType.value_undefined;

    const checkChar = this.currCharacterIndex < this.currentLineLength - 1 ? this.currentLine.charAt(this.currCharacterIndex++) : 13;
    if (this.source_flags != 0) {
      if (this.source_flags == 1) {
      } else {
        this.source_flags = 0;
        if (checkChar == '"') {
          // present string error
          typeFound = eElementType.type_error_abort;
        } else if (checkChar == 0) {
          // present EOF error
          typeFound = eElementType.type_error_abort;
        } else if (checkChar == 13) {
          // present EOL error
          typeFound = eElementType.type_error_abort;
        }
      }
    } else {
      switch (checkChar) {
        case value:
          break;

        default:
          break;
      }
    }
    return [typeFound, valueFound];
  }

  public back_element(): void {}
}
