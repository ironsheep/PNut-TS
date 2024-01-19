// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { eElementType, eValueType } from './types';
import { TextLine } from './textLine';
import { SymbolTable } from './symbolTable';

// src/classes/spin2Parser.ts

export class Spin2Parser {
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
  private symbols_debug_hash_auto: SymbolTable = new SymbolTable();
  private symbols_debughash_name: SymbolTable = new SymbolTable();
  private symbols_hash_auto: SymbolTable = new SymbolTable();
  private symbols_hash_level: SymbolTable = new SymbolTable();
  private symbols_hash_param: SymbolTable = new SymbolTable();
  private symbols_hash_main: SymbolTable = new SymbolTable();
  private symbols_hash_local: SymbolTable = new SymbolTable();
  private symbols_hash_inline: SymbolTable = new SymbolTable();

  constructor(ctx: Context, spinCode: SpinDocument) {
    this.context = ctx;
    this.srcFile = spinCode;
    this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
    this.currentLine = this.currentTextLine.text;
    this.currentLineLength = this.currentLine.length;
    this.at_eol = this.currentLineLength == 0 ? true : false;
    this.at_eof = this.srcFile.lineCount == 0 ? true : false;
  }

  get errorLineNumber(): number {
    // return last access line number
    //  ultimately this will be line with error on it
    return this.currentTextLine.lineNumber;
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

  private loadLine(lineIndex: number): number {
    if (!this.at_eof) {
      this.currentTextLine = this.srcFile.lineAt(lineIndex);
      this.currentLine = this.currentTextLine.text;
      this.currentLineLength = this.currentLine.length;
    }
    return this.currLineIndex < this.srcFile.lineCount - 1 ? lineIndex + 1 : -1;
  }

  private determine_mode(): boolean {
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

  private reset_element(): void {
    this.currCharacterIndex = 0;
    this.currLineIndex = 0;
    this.currflags = 0;
  }

  private get_element(): [eElementType, eValueType] {
    let typeFound: eElementType = eElementType.type_undefined;
    // eslint-disable-next-line prefer-const
    let valueFound: eValueType = eValueType.value_undefined;

    //
    // I'll bet we want to replace this char-by-char loop with better pattern matching symbol gathering code!
    //
    const checkChar: string = this.currCharacterIndex < this.currentLineLength - 1 ? this.currentLine.charAt(this.currCharacterIndex++) : '\x0a';
    if (this.source_flags != 0) {
      // heads to @@str2
      if (this.source_flags == 1) {
        // @@str4 only does...
        typeFound = eElementType.type_comma;
        // @@setPtrs
      } else {
        this.source_flags = 0;
        if (checkChar == '"') {
          // present string error
          typeFound = eElementType.type_error_abort;
        } else if (checkChar == '\x00') {
          // present EOF error
          typeFound = eElementType.type_error_abort;
        } else if (checkChar == '\x0a') {
          // present EOL error
          typeFound = eElementType.type_error_abort;
        }
      }
    } else {
      //const isDecimal: boolean = /^[0-9]/.test(checkChar);
      switch (checkChar) {
        case '"': // new string?
          // @@str
          break;
        case '\x00': // end of file?
          // @@eof
          break;
        case '\x0a': // end of line?
          // @@eol
          break;
        case ' ': // space or tab?
          // ignore, do nothing!
          break;
        case "'": // single line comment?
          // @@com
          break;
        case '{': // brace comment start?
          // @@bcom
          break;
        case '}': // unmatched brace comment end?
          // @@error_bcom
          break;
        case '%': // binary or packed characters?
          // @@bin
          break;
        case '$': // hex?
          // @@hex
          break;
        case '0': // decimal?
        case '1': // decimal?
        case '2': // decimal?
        case '3': // decimal?
        case '4': // decimal?
        case '5': // decimal?
        case '6': // decimal?
        case '7': // decimal?
        case '8': // decimal?
        case '9': // decimal?
          // @@dec
          break;
        case '.': // continue on next line?
          // @@hex
          break;

        default:
          break;
      }
    }
    return [typeFound, valueFound];
  }

  private back_element(): void {}
}
