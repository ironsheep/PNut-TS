// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { eElementType, eValueType } from './types';
import { TextLine } from './textLine';
import { SymbolTable } from './symbolTable';
import { find_symbol_s1, find_symbol_s2, find_symbol_s3, SpinSymbol } from './parseUtils';

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
    this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
    this.currentLine = this.currentTextLine.text;
    this.currentLineLength = this.currentLine.length;
    this.at_eol = this.currentLineLength == 0 ? true : false;
    this.at_eof = this.srcFile.lineCount == 0 ? true : false;
  }

  get errorLineNumber(): number {
    // return last access line number
    //  ultimately this will be line with error on it
    return this.currentTextLine.sourceLineNumber;
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

  private get_element(): [eElementType, string | number, number, number] {
    let typeFound: eElementType = eElementType.type_undefined;
    // eslint-disable-next-line prefer-const
    let valueFound: string | number = '';
    //
    // let's parse like spin example initially
    //
    let scanLine: string = this.currentLine;
    // skip white left edge
    const whiteSkipCount = this.skipNCountWhite(scanLine);
    if (whiteSkipCount > 0) {
      scanLine = this.skipAhead(whiteSkipCount, scanLine);
    } else if (this.at_eof) {
      typeFound = eElementType.type_end;
    } else if (this.at_eol) {
      typeFound = eElementType.type_end_line;
    } else if (scanLine.charAt(0) == '"') {
      // FIXME: TODO: add double-quoted string parsing!
    } else if (scanLine.charAt(0) == "'") {
      // skip rest of line
      this.currLineIndex += 1;
      this.loadLine(this.currLineIndex);
      typeFound = eElementType.type_end_line;
    } else if (this.isDigit(scanLine.charAt(0))) {
      // handle decimal or decimal float convertion
      const [charsUsed, value] = this.decimalConversion(scanLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      scanLine = this.skipAhead(charsUsed, scanLine);
    } else if (scanLine.charAt(0) == '$') {
      // handle hexadecimal convertion
      const [charsUsed, value] = this.hexadecimalConversion(scanLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      scanLine = this.skipAhead(charsUsed, scanLine);
    } else if (scanLine.startsWith('%%')) {
      // handle base-four numbers of the form %%012_032_000, %%0320213, etc
      const [charsUsed, value] = this.quaternaryConversion(scanLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      scanLine = this.skipAhead(charsUsed, scanLine);
    } else if (scanLine.charAt(0) == '%') {
      // handle base-two numbers of the form %0100_0111, %01111010, etc
      const [charsUsed, value] = this.binaryConversion(scanLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      scanLine = this.skipAhead(charsUsed, scanLine);
    } else if (this.isSymbolStartChar(scanLine.charAt(0))) {
      const [charsUsed, value] = this.symbolNameConversion(scanLine);
      // FIXME: TODO: add identify symbol type here... then return type found
      typeFound = eElementType.type_undefined; // FIXME: TODO: make this real!
      // NOTE: when value is string of symbol name.
      valueFound = value;
      scanLine = this.skipAhead(charsUsed, scanLine);
    } else {
      // lookup operator but in 3 then 2 then 1 length ...
      const [found, charsUsed, value, type] = this.operatorConvert(scanLine);
      if (found) {
        typeFound = type;
        valueFound = value;
        scanLine = this.skipAhead(charsUsed, scanLine);
      } else {
        // FIXME: TODO: report error bad character....
      }
    }
    // return findings and position within file (sourceLine# NOT lineIndex!)
    return [typeFound, valueFound, this.currentTextLine.sourceLineNumber, this.currCharacterIndex];
  }

  private isDigit(line: string) {
    return /^\d$/.test(line);
  }

  private isSymbolStartChar(line: string) {
    return /^[A-Z_a-z]+/.test(line);
  }

  private operatorConvert(line: string): [boolean, number, string | number, eElementType] {
    let interpValue: string | number = '';
    let charsUsed: number = 0;
    let foundStatus: boolean = false;
    let type: eElementType = eElementType.type_undefined;
    let findResult: SpinSymbol | undefined = undefined;
    let searchString: string = line;
    // find a possible match in our three tables
    // search longest match first!
    // first matching result wins
    if (line.length > 3) {
      searchString = line.substring(0, 3);
    }
    if (searchString.length > 2) {
      findResult = find_symbol_s3.find((symbol) => symbol.symbol === searchString);
    }
    if (!findResult && searchString.length > 2) {
      searchString = line.substring(0, 2);
      findResult = find_symbol_s2.find((symbol) => symbol.symbol === searchString);
    }
    if (!findResult && searchString.length > 2) {
      searchString = line.substring(0, 1);
      findResult = find_symbol_s1.find((symbol) => symbol.symbol === searchString);
    }
    if (findResult) {
      foundStatus = true;
      interpValue = findResult.value;
      charsUsed = searchString.length;
      type = findResult.type;
    }
    return [foundStatus, charsUsed, interpValue, type];
  }

  private symbolNameConversion(line: string): [number, string] {
    const isSymbolNameRegEx = /^([A-Z_a-z]+[A-Z_a-z0-9]*)/;
    let interpValue: string = '';
    let charsUsed: number = 0;
    const symbolMatch = line.match(isSymbolNameRegEx);
    if (symbolMatch) {
      interpValue = symbolMatch[0].toUpperCase();
      charsUsed = symbolMatch[0].length;
    }
    return [charsUsed, interpValue];
  }

  private quaternaryConversion(line: string): [number, number] {
    const isQuaternaryNumberRegEx = /^%%([[0-3]+[0-3_]*)/;
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const quaternaryNumberMatch = line.match(isQuaternaryNumberRegEx);
    if (quaternaryNumberMatch) {
      interpValue = parseInt(quaternaryNumberMatch[0].replace('_', ''), 4);
      charsUsed = quaternaryNumberMatch[0].length;
      // FIXME: TODO: validate that result fits in 32-bits
    }
    return [charsUsed, interpValue];
  }

  private binaryConversion(line: string): [number, number] {
    const isBinaryNumberRegEx = /^%([[0-1]+[0-1_]*)/;
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const binaryNumberMatch = line.match(isBinaryNumberRegEx);
    if (binaryNumberMatch) {
      interpValue = parseInt(binaryNumberMatch[0].replace('_', ''), 2);
      charsUsed = binaryNumberMatch[0].length;
      // FIXME: TODO: validate that result fits in 32-bits
    }
    return [charsUsed, interpValue];
  }

  private hexadecimalConversion(line: string): [number, number] {
    const isHexNumberRegEx = /^\$([[0-9A-Fa-f]+[0-9_A-Fa-f]*)/;
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const hexNumberMatch = line.match(isHexNumberRegEx);
    if (hexNumberMatch) {
      interpValue = parseInt(hexNumberMatch[0].replace('_', ''), 16);
      charsUsed = hexNumberMatch[0].length;
      // FIXME: TODO: validate that result fits in 32-bits
    }
    return [charsUsed, interpValue];
  }

  private decimalFloatConversion(line: string): [boolean, number, number] {
    const isFloat1NumberRegEx = /^([+-]?(?:0|[1-9][0-9_]*)\.(?:[0-9]+)?(?:[eE][+-]?[0-9]+)?)/;
    const isFloat2NumberRegEx = /^([+-]?(?:0|[1-9][0-9_]*)?\.(?:[0-9]+)(?:[eE][+-]?[0-9]+))/;
    // FIXME: TODO: validate and correct these two Regular Expressions ^^^^
    let interpValue: number = 0;
    let charsUsed: number = 0;
    let didMatch: boolean = false;
    const float1NumberMatch = line.match(isFloat1NumberRegEx);
    if (float1NumberMatch) {
      interpValue = parseInt(float1NumberMatch[0].replace('_', ''));
      charsUsed = float1NumberMatch[0].length;
      // FIXME: TODO: validate that result fits in 32-bits
      didMatch = true;
    } else {
      const float2NumberMatch = line.match(isFloat2NumberRegEx);
      if (float2NumberMatch) {
        interpValue = parseInt(float2NumberMatch[0].replace('_', ''));
        charsUsed = float2NumberMatch[0].length;
        // FIXME: TODO: validate that result fits in 32-bits
        didMatch = true;
      }
    }
    return [didMatch, charsUsed, interpValue];
  }

  private decimalConversion(line: string): [number, number] {
    let interpValue: number = 0;
    let charsUsed: number = 0;
    // FloatConversion if fails then do nonFloat.
    const [didMatch, nbrChars, value] = this.decimalFloatConversion(line);
    if (didMatch) {
      interpValue = value;
      charsUsed = nbrChars;
    } else {
      // do nonFloat
      const isDecimalNumberRegEx = /^([[0-9]+[0-9_]*)/;
      const decimalNumberMatch = line.match(isDecimalNumberRegEx);
      if (decimalNumberMatch) {
        interpValue = parseInt(decimalNumberMatch[0].replace('_', ''));
        charsUsed = decimalNumberMatch[0].length;
        // FIXME: TODO: validate that result fits in 32-bits
      }
    }
    return [charsUsed, interpValue];
  }

  private skipAhead(symbolLength: number, currentLine: string) {
    this.currCharacterIndex += symbolLength;
    currentLine = currentLine.substring(this.currCharacterIndex);
    this.at_eol = currentLine.length == 0 ? true : false;
    return currentLine;
  }

  private skipNCountWhite(line: string) {
    const leftEdgeSpaceRegEx = /^(\s*)/;
    let matchLength: number = 0;
    const whiteSpaceMatch = line.match(leftEdgeSpaceRegEx);
    if (whiteSpaceMatch) {
      matchLength = whiteSpaceMatch[0].length;
    }
    return matchLength;
  }

  private back_element(): void {}
}
