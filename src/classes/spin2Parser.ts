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

// Internal types used for passing complex values
interface iKnownOperator {
  foundStatus: boolean;
  charsUsed: number;
  value: number | string;
  type: eElementType;
}

interface iBuiltInSymbol {
  foundStatus: boolean;
  charsUsed: number;
  value: number | string;
  type: eElementType;
}

export class Spin2Parser {
  private context: Context;
  private srcFile: SpinDocument;
  private currLineIndex: number = 0;
  private currCharacterIndex: number = 0;
  private symbolLineNumber: number = 0;
  private symbolCharacterOffset: number = 0;
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
    if (this.context.logOptions.logElementizer) {
      this.srcFile.setDebugContext(this.context);
    }
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
    if (this.currCharacterIndex == 0) {
      this.logMessage(`  --- NEW ---   Ln#${this.sourceLineNumber}(${this.unprocessedLine.length})  line=[${this.unprocessedLine}]`);
    }
    // skip white left edge
    const whiteSkipCount = this.skipNCountWhite(this.unprocessedLine);
    if (whiteSkipCount > 0) {
      this.unprocessedLine = this.skipAhead(whiteSkipCount, this.unprocessedLine);
    }
    if (this.at_eof) {
      typeFound = eElementType.type_end_file;
      this.recordSymbolLocation();
    } else if (this.at_eol) {
      this.recordSymbolLocation();
      this.loadNextLine();
      typeFound = eElementType.type_end;
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
      const [isFloat, charsUsed, value] = this.decimalConversion(this.unprocessedLine);
      typeFound = isFloat ? eElementType.type_con_float : eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.charAt(0) == '$' && this.isHexStartChar(this.unprocessedLine.charAt(1))) {
      // handle hexadecimal convertion
      const [charsUsed, value] = this.hexadecimalConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.charAt(0) == '$') {
      // standalone $ sign
      typeFound = eElementType.type_dollar;
      this.unprocessedLine = this.skipAhead(1, this.unprocessedLine);
    } else if (this.unprocessedLine.startsWith('%%') && this.isQuartStartChar(this.unprocessedLine.charAt(2))) {
      // handle base-four numbers of the form %%012_032_000, %%0320213, etc
      const [charsUsed, value] = this.quaternaryConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.charAt(0) == '%' && this.isBinStartChar(this.unprocessedLine.charAt(1))) {
      // handle base-two numbers of the form %0100_0111, %01111010, etc
      const [charsUsed, value] = this.binaryConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.startsWith('%"') && this.unprocessedLine.substring(2).includes('"')) {
      // handle %"abcd" one to four chars packed into long
      const [charsUsed, value] = this.packedAsciiConversion(this.unprocessedLine);
      typeFound = eElementType.type_con;
      valueFound = value;
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else if (this.unprocessedLine.charAt(0) == '%') {
      // standalone % (percent) sign
      typeFound = eElementType.type_percent;
      this.unprocessedLine = this.skipAhead(1, this.unprocessedLine);
    } else if (this.isSymbolStartChar(this.unprocessedLine.charAt(0))) {
      // handle symbol names
      const [charsUsed, value] = this.symbolNameConversion(this.unprocessedLine);
      // Identify symbol if known part of language
      const foundSymbol: iBuiltInSymbol = this.symbolConvert(value);
      if (foundSymbol.foundStatus) {
        typeFound = foundSymbol.type;
        valueFound = foundSymbol.value;
      } else {
        // this is a user defined symbol name which is as of yet undefined
        typeFound = eElementType.type_undefined;
        // NOTE: when value is string of symbol name.
        valueFound = value;
      }
      this.unprocessedLine = this.skipAhead(charsUsed, this.unprocessedLine);
    } else {
      // lookup operator but in 3 then 2 then 1 length ...
      const knownOperator: iKnownOperator = this.operatorConvert(this.unprocessedLine);
      if (knownOperator.foundStatus) {
        typeFound = knownOperator.type;
        valueFound = knownOperator.value;
        this.unprocessedLine = this.skipAhead(knownOperator.charsUsed, this.unprocessedLine);
      } else {
        // FIXME: TODO: report error bad character....
        typeFound = eElementType.type_undefined;
        valueFound = this.unprocessedLine;
        this.recordSymbolLocation();
        this.logMessage(`  -- SKIP Ln#${this.symbolLineNumber} line=[${this.unprocessedLine}]`);
        this.loadNextLine();
      }
    }
    // return findings and position within file (sourceLine# NOT lineIndex!)
    const elemTypeStr: string = getElementTypeString(typeFound);
    const valueToDisplay: string | number = typeFound == eElementType.type_con_float ? this.toFloatString(valueFound) : valueFound;
    this.logMessage(
      `- get_element() Ln#${this.symbolLineNumber}(${this.symbolCharacterOffset}) - typeFound=(${elemTypeStr}), valueFound=(${valueToDisplay})`
    );
    this.logMessage(''); // blank line
    return [typeFound, valueFound, this.symbolLineNumber, this.symbolCharacterOffset];
  }

  private isDigit(line: string): boolean {
    return /^\d$/.test(line);
  }

  private logMessage(message: string): void {
    if (this.context.logOptions.logElementizer) {
      this.context.logger.logMessage(message);
    }
  }

  private isSymbolStartChar(line: string): boolean {
    const findStatus: boolean = /^[A-Z_a-z]+/.test(line);
    //this.logMessage(`isSymbolStartChar(${line}) = (${findStatus})`);
    return findStatus;
  }

  private isHexStartChar(line: string): boolean {
    const findStatus: boolean = /^[A-Fa-f0-9]+/.test(line);
    //this.logMessage(`isHexStartChar(${line}) = (${findStatus})`);
    return findStatus;
  }

  private isBinStartChar(line: string): boolean {
    const findStatus: boolean = /^[01]+/.test(line);
    //this.logMessage(`isBinStartChar(${line}) = (${findStatus})`);
    return findStatus;
  }

  private isQuartStartChar(line: string): boolean {
    const findStatus: boolean = /^[0-3]+/.test(line);
    //this.logMessage(`isQuartStartChar(${line}) = (${findStatus})`);
    return findStatus;
  }

  private isFloat(possFloat: number): boolean {
    return Number(possFloat) === possFloat && possFloat % 1 !== 0;
  }

  private symbolConvert(symbolName: string): iBuiltInSymbol {
    let findResult: iSpinSymbol | undefined = undefined;
    let value: string | number = '';
    let charsUsed: number = 0;
    let foundStatus: boolean = false;
    let type: eElementType = eElementType.type_undefined;
    findResult = this.symbol_tables.builtInSymbol(symbolName);
    if (findResult) {
      foundStatus = true;
      value = findResult.value;
      charsUsed = findResult.symbol.length;
      type = findResult.type;
      const elemTypeStr: string = getElementTypeString(type);
      this.logMessage(`  -- symbolConvert() Symbol found [${findResult.symbol}](${charsUsed}), type=(${elemTypeStr}), value=(${value})`);
    } else {
      this.logMessage(`  -- symbolConvert(${symbolName}) NOT a built-in`);
    }
    return { foundStatus, charsUsed, value, type };
  }

  private operatorConvert(line: string): iKnownOperator {
    let value: string | number = '';
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
      value = findResult.value;
      charsUsed = findResult.symbol.length;
      type = findResult.type;
      const elemTypeStr: string = getElementTypeString(type);
      this.logMessage(`  -- operatorConvert() Operator found [${findResult.symbol}](${charsUsed}), type=(${elemTypeStr}), value=(${value})`);
    } else {
      this.logMessage('  -- operatorConvert() NOT a valid operator');
    }
    return { foundStatus, charsUsed, value, type };
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
      if (asciiStr.length <= 4 && asciiStr.length != 0) {
        for (let i = 0; i < asciiStr.length; i++) {
          interpValue |= asciiStr.charCodeAt(i) << (i * 8);
        }
        charsUsed = asciiStr.length + 3;
      } else {
        const explainStr = asciiStr.length == 0 ? 'short' : 'long';
        throw new Error(`Packed ascii must be 1-4 characters - [${asciiStr}] is too ${explainStr}`);
      }
    } else {
      throw new Error(`Missing 2nd " on packed ascii`);
      // FIXME: TODO: move this to 2nd quote check before calling this method
    }
    const hexString = interpValue.toString(16);
    this.logMessage(`  -- packedAsciiConversion(${line}) = interpValue=(0x${hexString})`);
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
      this.logMessage(`  -- quaternaryConversion(${line}) = interpValue=(${interpValue})`);
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
      //this.logMessage(`- binaryNumberMatch[0]=(${valueFound})`);
      interpValue = parseInt(valueFound.replace('_', ''), 2);
      charsUsed = binaryNumberMatch[0].length;
      // ensure that result fits in 32-bits
      this.logMessage(`  -- binaryConversion(${line}) = interpValue=(${interpValue})`);
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
      //this.logMessage(`- hexNumberMatch[0]=(${valueFound})`);
      interpValue = parseInt(valueFound.replace('_', ''), 16);
      charsUsed = hexNumberMatch[0].length;
      // ensure that result fits in 32-bits
      this.logMessage(`  -- hexadecimalConversion(${line}) = interpValue=(${interpValue})`);
      this.validate32BitInteger(interpValue);
    }
    return [charsUsed, interpValue];
  }

  private decimalFloatConversion(line: string): [boolean, number, number] {
    // we are parsing these
    //    = 1.4e5
    //    = 1e-5
    //    = 1.7exponent
    const isFloat1NumberRegEx = /^\d+[\d_]*\.\d+[\d_]*[eE](\+\d|-\d|\d)[\d_]*/; // decimal and E
    const isFloat2NumberRegEx = /^\d+[\d_]*[eE](\+\d|-\d|\d)[\d_]*/; // no decimal but E
    const isFloat3NumberRegEx = /^\d+[\d_]*\.\d+[\d_]*/; // decimal no E
    let interpValue: number = 0;
    let charsUsed: number = 0;
    let didMatch: boolean = false;
    let haveExponent: boolean = false;
    const float1NumberMatch = line.match(isFloat1NumberRegEx);
    if (float1NumberMatch) {
      interpValue = this.toSinglePrecisionFloat(float1NumberMatch[0].replace('_', ''));
      charsUsed = float1NumberMatch[0].length;
      haveExponent = float1NumberMatch[0].toUpperCase().indexOf('E') != -1;
      didMatch = true;
    } else {
      const float2NumberMatch = line.match(isFloat2NumberRegEx);
      if (float2NumberMatch) {
        interpValue = this.toSinglePrecisionFloat(float2NumberMatch[0].replace('_', ''));
        charsUsed = float2NumberMatch[0].length;
        haveExponent = float2NumberMatch[0].toUpperCase().indexOf('E') != -1;
        didMatch = true;
      } else {
        const float3NumberMatch = line.match(isFloat3NumberRegEx);
        if (float3NumberMatch) {
          interpValue = this.toSinglePrecisionFloat(float3NumberMatch[0].replace('_', ''));
          charsUsed = float3NumberMatch[0].length;
          didMatch = true;
        }
      }
    }
    if (didMatch) {
      // Validate it's a legal floating point number
      if (this.toSinglePrecisionHex(interpValue) == '7f800000') {
        throw new Error(`Floating-point constant must be within +/- 3.4e+38`);
      }
      const floatValueStr: string = `0x${this.toSinglePrecisionHex(interpValue)}`;
      this.logMessage(`  -- decimalFloatConversion(${line}) = interpValue=(${floatValueStr})`);
    }
    return [didMatch, charsUsed, interpValue];
  }

  private decimalConversion(line: string): [boolean, number, number] {
    let interpValue: number = 0;
    let charsUsed: number = 0;
    let isFloat: boolean = false;
    // FloatConversion if fails then do nonFloat.
    const [didMatch, nbrChars, value] = this.decimalFloatConversion(line);
    if (didMatch) {
      interpValue = value;
      charsUsed = nbrChars;
      isFloat = true;
    } else {
      // do nonFloat
      const isDecimalNumberRegEx = /^(\d+[\d_]*)/;
      const decimalNumberMatch = line.match(isDecimalNumberRegEx);
      if (decimalNumberMatch) {
        interpValue = parseInt(decimalNumberMatch[0].replace('_', ''));
        charsUsed = decimalNumberMatch[0].length;
        // ensure that result fits in 32-bits
        this.logMessage(`  -- decimalConversion(${line}) = interpValue=(${interpValue})`);
        this.validate32BitInteger(interpValue);
      }
    }
    return [isFloat, charsUsed, interpValue];
  }

  private toSinglePrecisionFloat(numStr: string): number {
    //
    // In this code, toSinglePrecisionFloat function takes a string, parses it to a float
    // using parseFloat, stores it in a Float32Array(which uses single - precision
    // floating - point format), and then uses a DataView to get the single - precision
    // float value from the Float32Array.
    //
    // Please note that the returned value is still a JavaScript number, which is a
    // double - precision float, but it has the precision of a single - precision float.
    // This means that it may not have the same precision as the original string if the
    // original string had more precision than a single - precision float can represent.
    //
    const float32Array = new Float32Array(1);
    float32Array[0] = parseFloat(numStr);
    const dataView = new DataView(float32Array.buffer);
    return dataView.getFloat32(0);
  }

  private toSinglePrecisionHex(float32: number): string {
    const float32Array = new Float32Array(1);
    float32Array[0] = float32;
    const dataView = new DataView(float32Array.buffer);
    const intView = dataView.getUint32(0);
    return intView.toString(16);
  }

  private hexToFloat64(hex: string): number {
    const int = parseInt(hex, 16);
    const float32Array = new Float32Array(1);
    const dataView = new DataView(float32Array.buffer);
    dataView.setUint32(0, int);
    return dataView.getFloat32(0);
  }

  private toFloatString(float32: number | string): string {
    const hexValue = this.toSinglePrecisionHex(typeof float32 === 'number' ? float32 : 0); // replace with your hex value
    const float64Value = this.hexToFloat64(hexValue);
    return float64Value.toString();
  }

  private skipAhead(symbolLength: number, line: string) {
    this.recordSymbolLocation();
    //this.logMessage(`- skipAhead(${symbolLength}) currCharacterIndex=(${this.currCharacterIndex}), remLine=[${line}](${line.length})`);
    this.currCharacterIndex += symbolLength;
    let remainingLine = line.substring(symbolLength);
    //this.logMessage(`- skipAhead() EARLY remainingLine=[${remainingLine}]`);
    if (!remainingLine || remainingLine.length == 0 || symbolLength == line.length) {
      this.loadNextLine();
      remainingLine = this.unprocessedLine;
      //} else {
      //  this.logMessage(`- skipAhead() remainingLine=[${remainingLine}]`);
    }
    //this.logMessage(`- skipAhead() EXIT w/remainingLine=[${remainingLine}]`);
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
      this.context.logger.logErrorMessage(`The result (${value}) does not fit in 32 bits`);
      throw new Error('Constant exceeds 32 bits');
    }
  }

  private recordSymbolLocation(): void {
    this.symbolLineNumber = this.sourceLineNumber;
    this.symbolCharacterOffset = this.currCharacterIndex;
  }

  private loadNextLine(): void {
    //this.logMessage(`- loadNextLine() - ENTRY   currLineIndex=(${this.currLineIndex}), lineCt=(${this.srcFile.lineCount})`);
    if (!this.at_eof) {
      if (this.currLineIndex < this.srcFile.lineCount - 1) {
        this.currLineIndex += 1;
        this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
        this.unprocessedLine = this.currentTextLine.text;
        //if (this.currentTextLine.sourceLineNumber == 0) {
        //  this.logMessage('- ERROR: loadNextLine() lineAt() failed to give us a line!');
        //}
        this.currCharacterIndex = 0;
        //this.logMessage(`  -- loadNextLine() unprocessedLine=[${this.unprocessedLine}](${this.unprocessedLine.length})`);
        this.logMessage(`      ( LOADed Ln#${this.sourceLineNumber}(${this.unprocessedLine.length}) )`);
        this.at_eol = this.unprocessedLine.length == 0 ? true : false;
      } else {
        this.logMessage('- WARNING: loadNextLine() not advancing, arrived at end of file!');
        this.at_eol = true;
        this.at_eof = true;
      }
    } else {
      this.logMessage('- WARNING: loadNextLine() not advancing, at end of file!');
    }
  }

  private back_element(): void {}
}
