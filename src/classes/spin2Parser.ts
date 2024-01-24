/* eslint-disable @typescript-eslint/no-unused-vars */
// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { eElementType, eValueType, getElementTypeString } from './types';
import { TextLine } from './textLine';
import { SymbolTable } from './symbolTable';
import { SpinSymbolTables, iSpinSymbol } from './parseUtils';

// src/classes/spin2Parser.ts

export class Spin2Parser {
  private context: Context;
  private srcFile: SpinDocument;
  private currLineIndex: number = 0;
  private currCharacterIndex: number = 0;
  private symbolLineIndex: number = 0;
  private symbolCharacterIndex: number = 0;
  private currflags: number = 0;
  private currentTextLine: TextLine;
  private unprocessedLine: string = '';
  private source_flags: number = 0;
  private at_eof: boolean = false;
  private at_eol: boolean = false;
  private symbol_tables: SpinSymbolTables = new SpinSymbolTables();
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
    // dummy load of next line (replaced by loadNextLine())
    this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
    // now load the line and set conditions after incrementing line index
    this.currLineIndex = -1;
    this.loadNextLine();
  }

  get sourceLineNumber(): number {
    // return last access line number
    //  ultimately this will be line with error on it
    return this.currentTextLine.sourceLineNumber;
  }

  public testGetElementLoop() {
    //let numberCalls: number = 30;
    let [type, value, lineIdx, charIdx] = this.get_element();
    do {
      if (type != eElementType.type_end_file) {
        [type, value, lineIdx, charIdx] = this.get_element();
      }
      //numberCalls -= 1;
      //if (numberCalls < 1) {
      //  break;
      //}
    } while (type != eElementType.type_end_file);
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
    // skip white left edge
    const whiteSkipCount = this.skipNCountWhite(this.unprocessedLine);
    if (whiteSkipCount > 0) {
      this.unprocessedLine = this.skipAhead(whiteSkipCount, this.unprocessedLine);
    }
    if (this.at_eof) {
      typeFound = eElementType.type_end;
      this.recordSymbolLocation();
    } else if (this.at_eol) {
      this.recordSymbolLocation();
      this.loadNextLine();
      typeFound = eElementType.type_end_file;
      //} else if (this.unprocessedLine.charAt(0) == '"') {
      // handle double-quoted string
      // FIXME: TODO: add double-quoted string parsing!
    } else if (this.unprocessedLine.charAt(0) == "'") {
      // handle tic-comment, skip rest of line
      typeFound = eElementType.type_end;
      this.recordSymbolLocation();
      this.loadNextLine();
    } else if (this.isDigit(this.unprocessedLine.charAt(0))) {
      // handle decimal or decimal-float convertion
      const [charsUsed, value] = this.decimalConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.charAt(0) == '$') {
      // handle hexadecimal convertion
      const [charsUsed, value] = this.hexadecimalConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.startsWith('%%')) {
      // handle base-four numbers of the form %%012_032_000, %%0320213, etc
      const [charsUsed, value] = this.quaternaryConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.startsWith('%"')) {
      // handle %"abcd" one to four chars packed into long
      const [charsUsed, value] = this.packedAsciiConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.charAt(0) == '%') {
      // handle base-two numbers of the form %0100_0111, %01111010, etc
      const [charsUsed, value] = this.binaryConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.isSymbolStartChar(this.unprocessedLine.charAt(0))) {
      // handle symbol names
      const [charsUsed, value] = this.symbolNameConversion(this.unprocessedLine);
      // FIXME: TODO: add identify symbol type here... then return type found
      typeFound = eElementType.type_var_byte; // FIXME: TODO: make this real!
      // NOTE: when value is string of symbol name.
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else {
      // lookup operator but in 3 then 2 then 1 length ...
      const [found, charsUsed, value, type] = this.operatorConvert(this.unprocessedLine);
      if (found) {
        typeFound = type;
        valueFound = value;
        this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
      } else {
        // FIXME: TODO: report error bad character....
        typeFound = eElementType.type_undefined;
        valueFound = this.unprocessedLine;
        this.recordSymbolLocation();
        this.logMessage(`  -- SKIP Ln#${this.symbolLineIndex + 1} line=[${this.unprocessedLine}]`);
        this.loadNextLine();
      }
    }
    // return findings and position within file (sourceLine# NOT lineIndex!)
    this.logMessage(
      `- get_element() Ln#${this.symbolLineIndex + 1}(${this.symbolCharacterIndex}) - typeFound=(${getElementTypeString(typeFound)}), valueFound=(${valueFound})`
    );
    this.logMessage(''); // blank line
    return [typeFound, valueFound, this.symbolLineIndex + 1, this.symbolCharacterIndex];
  }

  private isDigit(line: string) {
    return /^\d$/.test(line);
  }

  private logMessage(message: string) {
    if (this.context.logOptions.logElementizer) {
      this.context.logger.logMessage(message);
    }
  }

  private isSymbolStartChar(line: string) {
    return /^[A-Z_a-z]+/.test(line);
  }

  private operatorConvert(line: string): [boolean, number, string | number, eElementType] {
    let interpValue: string | number = '';
    let charsUsed: number = 0;
    let foundStatus: boolean = false;
    let type: eElementType = eElementType.type_undefined;
    let findResult: iSpinSymbol | undefined = undefined;
    let searchString: string = line;
    // find a possible match in our three tables
    // search longest match first!
    // first matching result wins
    if (line.length > 3) {
      searchString = line.substring(0, 3);
    }
    findResult = this.symbol_tables.operatorSymbol(searchString);
    //this.logMessage(`- operatorConvert(${line})`);
    if (findResult) {
      foundStatus = true;
      interpValue = findResult.value;
      charsUsed = findResult.symbol.length;
      type = findResult.type;
      this.logMessage(
        `- operatorConvert() Operator found [${findResult.symbol}](${findResult.symbol.length}), type=(${getElementTypeString(type)}), interpValue=(${interpValue})`
      );
    } else {
      this.logMessage('- operatorConvert() NO operator found');
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

  private packedAsciiConversion(line: string): [number, number] {
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const endOffset: number = line.substring(2).indexOf('"');
    if (endOffset != -1) {
      // FIXME: TODO: let's ensure asciiStr is valid ascii
      //  this should be 0x20-0x7f! is any other then throw exception
      // FIXME: TODO: no more than 4 chars in string
      const asciiStr = line.slice(2, endOffset + 2);
      for (let i = 0; i < asciiStr.length; i++) {
        interpValue = (interpValue << 8) | asciiStr.charCodeAt(i);
      }
      charsUsed = asciiStr.length + 3;
    } else {
      throw new Error(`missing 2nd " on packed ascii`);
      // FIXME: TODO: move this to 2nd quote check before calling this method
    }
    this.logMessage(`- quaternaryConversion(${line}) = interpValue=(${interpValue})`);
    return [charsUsed, interpValue];
  }

  private quaternaryConversion(line: string): [number, number] {
    const isQuaternaryNumberRegEx = /^%%([[0-3]+[0-3_]*)/;
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const quaternaryNumberMatch = line.match(isQuaternaryNumberRegEx);
    if (quaternaryNumberMatch) {
      const valueFound: string = quaternaryNumberMatch[0].substring(2);
      interpValue = parseInt(valueFound.replace('_', ''), 4);
      charsUsed = quaternaryNumberMatch[0].length;
      // ensure that result fits in 32-bits
      this.logMessage(`- quaternaryConversion(${line}) = interpValue=(${interpValue})`);
      this.validate32BitInteger(interpValue);
    }
    return [charsUsed, interpValue];
  }

  private binaryConversion(line: string): [number, number] {
    const isBinaryNumberRegEx = /^%([[0-1]+[0-1_]*)/;
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const binaryNumberMatch = line.match(isBinaryNumberRegEx);
    if (binaryNumberMatch) {
      const valueFound: string = binaryNumberMatch[0].substring(1);
      this.logMessage(`- binaryNumberMatch[0]=(${valueFound})`);
      interpValue = parseInt(valueFound.replace('_', ''), 2);
      charsUsed = binaryNumberMatch[0].length;
      // ensure that result fits in 32-bits
      this.logMessage(`- binaryConversion(${line}) = interpValue=(${interpValue})`);
      this.validate32BitInteger(interpValue);
    }
    return [charsUsed, interpValue];
  }

  private hexadecimalConversion(line: string): [number, number] {
    const isHexNumberRegEx = /^\$([[0-9A-Fa-f]+[0-9_A-Fa-f]*)/;
    let interpValue: number = 0;
    let charsUsed: number = 0;
    const hexNumberMatch = line.match(isHexNumberRegEx);
    if (hexNumberMatch) {
      const valueFound: string = hexNumberMatch[0].substring(1);
      this.logMessage(`- hexNumberMatch[0]=(${valueFound})`);
      interpValue = parseInt(valueFound.replace('_', ''), 16);
      charsUsed = hexNumberMatch[0].length;
      // ensure that result fits in 32-bits
      this.logMessage(`- hexadecimalConversion(${line}) = interpValue=(${interpValue})`);
      this.validate32BitInteger(interpValue);
    }
    return [charsUsed, interpValue];
  }

  private decimalFloatConversion(line: string): [boolean, number, number] {
    const isFloat1NumberRegEx = /^((?:0|[1-9][0-9_]*)\.(?:[0-9]+[0-9_]*)?(?:[eE][+-]?[0-9]+[0-9_]*)?)/;
    const isFloat2NumberRegEx = /^((?:0|[1-9][0-9_]*)?\.(?:[0-9]+[0-9_]*)(?:[eE][+-]?[0-9]+[0-9_]*))/;
    // FIXME: TODO: validate and correct these two Regular Expressions ^^^^
    let interpValue: number = 0;
    let charsUsed: number = 0;
    let didMatch: boolean = false;
    let haveExponent: boolean = false;
    const float1NumberMatch = line.match(isFloat1NumberRegEx);
    if (float1NumberMatch) {
      interpValue = parseFloat(float1NumberMatch[0].replace('_', ''));
      charsUsed = float1NumberMatch[0].length;
      haveExponent = float1NumberMatch[0].toUpperCase().indexOf('E') != -1;
      // FIXME: TODO: validate that result fits in 32-bits
      didMatch = true;
    } else {
      const float2NumberMatch = line.match(isFloat2NumberRegEx);
      if (float2NumberMatch) {
        interpValue = parseFloat(float2NumberMatch[0].replace('_', ''));
        charsUsed = float2NumberMatch[0].length;
        haveExponent = float2NumberMatch[0].toUpperCase().indexOf('E') != -1;
        // FIXME: TODO: validate that result fits in 32-bits
        didMatch = true;
      }
    }
    if (didMatch) {
      const floatValueStr: string = haveExponent ? interpValue.toExponential() : interpValue.toFixed(3);
      this.logMessage(`- decimalFloatConversion(${line}) = interpValue=(${floatValueStr})`);
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
        // ensure that result fits in 32-bits
        this.logMessage(`- decimalConversion(${line}) = interpValue=(${interpValue})`);
        this.validate32BitInteger(interpValue);
      }
    }
    return [charsUsed, interpValue];
  }

  private skipAhead(symbolLength: number, line: string) {
    this.recordSymbolLocation();
    //this.logMessage(`- skipAhead(${symbolLength}) currCharacterIndex=[${this.currCharacterIndex}]`);
    this.currCharacterIndex += symbolLength;
    let remainingLine = line.substring(symbolLength);
    if (remainingLine.length == 0) {
      this.loadNextLine();
      remainingLine = this.unprocessedLine;
      //} else {
      //  this.logMessage(`- skipAhead() remainingLine=[${remainingLine}]`);
    }
    return remainingLine;
  }

  private skipNCountWhite(line: string) {
    // FIXME: TODO: expand tabs per Pnut...
    const leftEdgeSpaceRegEx = /^(\s*)/;
    let matchLength: number = 0;
    const whiteSpaceMatch = line.match(leftEdgeSpaceRegEx);
    if (whiteSpaceMatch) {
      matchLength = whiteSpaceMatch[0].length;
    }
    //this.logMessage(`- skipNCountWhite([${line}]) matchLength=(${matchLength})`);
    return matchLength;
  }

  private validate32BitInteger(value: number): void {
    if (value > 4294967295 || value < -2147483648) {
      this.context.logger.logErrorMessage('The result does not fit in 32 bits');
      throw new Error('Constant exceeds 32 bits');
    }
  }

  private recordSymbolLocation(): void {
    this.symbolLineIndex = this.sourceLineNumber;
    this.symbolCharacterIndex = this.currCharacterIndex;
  }

  private loadNextLine(): void {
    if (!this.at_eof) {
      if (this.currLineIndex < this.srcFile.lineCount - 1) {
        this.currLineIndex += 1;
        this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
        this.unprocessedLine = this.currentTextLine.text;
        this.currCharacterIndex = 0;
        //this.logMessage(`- loadNextLine() unprocessedLine=[${this.unprocessedLine}]`);
        this.logMessage(`- LOADed Ln#${this.sourceLineNumber + 1}(${this.unprocessedLine.length})`);
        this.at_eol = this.unprocessedLine.length == 0 ? true : false;
      } else {
        this.at_eol = true;
        this.at_eof = true;
      }
    }
  }

  private back_element(): void {}
}
