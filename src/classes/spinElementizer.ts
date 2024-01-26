/** @format */
'use strict';

// src/classes/spinElementizer.ts

import { toSinglePrecisionFloat, toSinglePrecisionHex, toFloatString } from '../utils/float32';
import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { eElementType, getElementTypeString } from './types';
import { TextLine } from './textLine';
import { SpinSymbolTables, iSpinSymbol } from './parseUtils';
import { SpinElement } from './spinElement';

// interfaces for internal methods
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

// FIXME: TODO: debug() returns new type debug-statment whoes value is a list: SpinSymobl[]

export class SpinElementizer {
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
  private lastEmittedIsLineEnd: boolean = true;

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

  public getFileElements(): SpinElement[] {
    //let numberCalls: number = 30;
    const element_list: SpinElement[] = [];
    // store the value(s) in list
    let atEndOfFile: boolean = false;
    let elements: SpinElement[] = this.get_element_entries();
    //this.logMessage(`- get EARLY elements(${elements.length})=[${elements}]`);
    do {
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        element_list.push(element);
        if (element.isEndOfFile) {
          atEndOfFile = true;
        }
      }
      if (atEndOfFile) {
        break;
      }
      elements = this.get_element_entries();
      //this.logMessage(`- get IN-LOOP elements(${elements.length})=[${elements}]`);
    } while (!atEndOfFile);
    return element_list;
  }

  private get_element_entries(): SpinElement[] {
    const elementsFound: SpinElement[] = [];
    let returningSingleEntry: boolean = true;
    let typeFound: eElementType = eElementType.type_undefined;
    // eslint-disable-next-line prefer-const
    let valueFound: string | number = '';

    if (this.currCharacterIndex == 0) {
      const lineNbrString: string = this.lineNumberString(this.sourceLineNumber, this.unprocessedLine.length);
      this.logMessage(`  --- NEW ---   Ln#${lineNbrString}  line=[${this.unprocessedLine}]`);
    }

    // skip initial white space on opening line
    const whiteSkipCount = this.skipNCountWhite(this.unprocessedLine);
    if (whiteSkipCount > 0) {
      this.unprocessedLine = this.skipAhead(whiteSkipCount, this.unprocessedLine);
    }

    // if this line contains the start of a '{{..}}' doc comment then skip lines until close of comment
    if (this.unprocessedLine.startsWith('{{')) {
      let inDocBraceComment: boolean = true;
      do {
        const closeOffset = this.unprocessedLine.substring(2).indexOf('}}');
        if (closeOffset != -1) {
          this.unprocessedLine = this.skipAhead(closeOffset + 4, this.unprocessedLine);
          inDocBraceComment = false;
        } else {
          this.logMessage(`  -- Ln#{${this.sourceLineNumber}} found "{{..}}" skipping to next line`);
          this.loadNextLine();
          if (this.at_eof) {
            //  [error_erbb]
            throw new Error('Expected "}}"');
          }
        }
      } while (inDocBraceComment);
    }

    // if this line contains the start of a '{.{..}.}' non-doc comment then skip lines until
    //  close of possibly nested comment
    /*
    if (this.unprocessedLine.startsWith('{')) {
      let inDocBraceComment: boolean = true;
      do {
        const closeOffset = this.unprocessedLine.substring(2).indexOf('}');
        if (closeOffset != -1) {
          this.unprocessedLine = this.skipAhead(closeOffset + 4, this.unprocessedLine);
          inDocBraceComment = false;
        } else {
          this.logMessage(`  -- Ln#{${this.sourceLineNumber}} found "{{..}}" skipping to next line`);
          this.loadNextLine();
          if (this.at_eof) {
            //  [error_erbb]
            throw new Error('Expected "}}"');
          }
        }
      } while (inDocBraceComment);
    }
    */

    //
    // let's parse like spin example initially
    //
    let skippingContinuations: boolean = true;
    while (skippingContinuations) {
      // skip white left edge
      const whiteSkipCount = this.skipNCountWhite(this.unprocessedLine);
      if (whiteSkipCount > 0) {
        this.unprocessedLine = this.skipAhead(whiteSkipCount, this.unprocessedLine);
      }
      if (this.unprocessedLine.startsWith('...')) {
        // handle line continuation
        this.logMessage(`  -- Ln#{${this.sourceLineNumber}} found "..." skipping to next line`);
        // force load of next line
        this.loadNextLine();
      } else {
        skippingContinuations = false;
      }
    }

    // past line continuations, now determine what we see next
    if (this.at_eof) {
      typeFound = eElementType.type_end_file;
      this.recordSymbolLocation();
    } else if (this.at_eol) {
      this.recordSymbolLocation();
      this.loadNextLine();
      typeFound = eElementType.type_end;
    } else if (this.unprocessedLine.charAt(0) == '"') {
      // handle double-quoted string
      // FIXME: TODO: add double-quoted string parsing!
      const endQuoteOffset = this.unprocessedLine.substring(1).indexOf('"');
      // if we have an end and not an empty string
      if (endQuoteOffset != -1 && endQuoteOffset != 0) {
        returningSingleEntry = false;
        let charOffset = this.currCharacterIndex;
        for (let charIndex = 1; charIndex < endQuoteOffset + 1; charIndex++) {
          const char = this.unprocessedLine.charAt(charIndex);
          const elementChar: SpinElement = this.buildElement(eElementType.type_con, char, charOffset);
          elementsFound.push(elementChar);
          if (charIndex != endQuoteOffset) {
            const elementComma: SpinElement = this.buildElement(eElementType.type_comma, 0, charOffset);
            elementComma.midStringComma = true;
            elementsFound.push(elementComma);
          }
          charOffset += 1;
        }
        this.unprocessedLine = this.skipAhead(endQuoteOffset + 2, this.unprocessedLine);
      } else {
        if (endQuoteOffset == 0) {
          // [error_es] we have an empty string
          throw new Error('Empty string');
        } else {
          // [error_eatq] we have an unterminated string
          throw new Error('Expected a terminating quote');
        }
      }
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
        if (typeFound == eElementType.type_op) {
          valueFound = knownOperator.value;
        }
        this.unprocessedLine = this.skipAhead(knownOperator.charsUsed, this.unprocessedLine);
      } else {
        // FIXME: TODO: report error bad character....
        typeFound = eElementType.type_undefined;
        valueFound = this.unprocessedLine;
        this.recordSymbolLocation();
        const lineNbrString: string = this.lineNumberString(this.sourceLineNumber, this.unprocessedLine.length);
        this.logMessage(`  -- SKIP Ln#${lineNbrString} line=[${this.unprocessedLine}]`);
        this.loadNextLine();
      }
    }
    // return findings and position within file (sourceLine# NOT lineIndex!)
    const elemTypeStr: string = getElementTypeString(typeFound);
    const valueToDisplay: string | number = typeFound == eElementType.type_con_float ? toFloatString(valueFound) : valueFound;
    // return our 1 iElement within an array
    if (returningSingleEntry) {
      const lineNbrString: string = this.lineNumberString(this.symbolLineNumber, this.symbolCharacterOffset);
      this.logMessage(`- get_element_entries() Ln#${lineNbrString} - type=(${elemTypeStr}), value=(${valueToDisplay})`);
      this.logMessage(''); // blank line
      const singleElement = new SpinElement(typeFound, valueFound, this.symbolLineNumber - 1, this.symbolCharacterOffset);
      if (!singleElement.isLineEnd || (singleElement.isLineEnd && !this.lastEmittedIsLineEnd)) {
        elementsFound.push(singleElement);
        this.lastEmittedIsLineEnd = singleElement.isLineEnd ? true : false;
        //this.logMessage(`  -- lastEmittedIsLineEnd=(${this.lastEmittedIsLineEnd}) type=[${singleElement.typeString()}]`); // blank line
      }
    } else {
      // dump our list of values
      this.logMessage(`- displaying ${elementsFound.length} elements`); // blank line
      for (let index = 0; index < elementsFound.length; index++) {
        const element = elementsFound[index];
        const elemTypeStr: string = getElementTypeString(element.type);
        const flagInterp: string = element.isMidStringComma ? `, midString` : '';
        const lineNbrString: string = this.lineNumberString(element.sourceLineIndex, element.sourceCharacterOffset);
        this.logMessage(`- get_element_entries() Ln#${lineNbrString} - type=(${elemTypeStr}), value=(${element.value})${flagInterp}`);
      }
      this.lastEmittedIsLineEnd = false;
      //this.logMessage(`  -- lastEmittedIsLineEnd=(${this.lastEmittedIsLineEnd})`); // blank line
      this.logMessage(''); // blank line
    }
    return elementsFound;
  }

  private lineNumberString(lineIndex: number, characterIndex: number): string {
    // return 99(999) where 99 is the line number and 999 is the offset into the line
    return `${lineIndex}(${characterIndex})`;
  }

  private buildElement(type: eElementType, value: number | string, charOffset: number): SpinElement {
    const newElement: SpinElement = new SpinElement(type, value, this.currentTextLine.sourceLineNumber - 1, charOffset);
    return newElement;
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
    const float1NumberMatch = line.match(isFloat1NumberRegEx);
    if (float1NumberMatch) {
      interpValue = toSinglePrecisionFloat(float1NumberMatch[0].replace('_', ''));
      charsUsed = float1NumberMatch[0].length;
      didMatch = true;
    } else {
      const float2NumberMatch = line.match(isFloat2NumberRegEx);
      if (float2NumberMatch) {
        interpValue = toSinglePrecisionFloat(float2NumberMatch[0].replace('_', ''));
        charsUsed = float2NumberMatch[0].length;
        didMatch = true;
      } else {
        const float3NumberMatch = line.match(isFloat3NumberRegEx);
        if (float3NumberMatch) {
          interpValue = toSinglePrecisionFloat(float3NumberMatch[0].replace('_', ''));
          charsUsed = float3NumberMatch[0].length;
          didMatch = true;
        }
      }
    }
    if (didMatch) {
      // Validate it's a legal floating point number
      if (toSinglePrecisionHex(interpValue) == '7f800000') {
        throw new Error(`Floating-point constant must be within +/- 3.4e+38`);
      }
      const floatValueStr: string = `0x${toSinglePrecisionHex(interpValue)}`;
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

  private skipAhead(symbolLength: number, line: string) {
    this.recordSymbolLocation();
    //this.logMessage(`- skipAhead(${symbolLength}) currCharacterIndex=(${this.currCharacterIndex}), remLine=[${line}](${line.length})`);
    this.currCharacterIndex += symbolLength;
    let remainingLine = line.substring(symbolLength);
    //this.logMessage(`- skipAhead() EARLY remainingLine=[${remainingLine}]`);
    if (!remainingLine || remainingLine.length == 0 || symbolLength == line.length) {
      //this.loadNextLine();
      this.at_eol = true;
      remainingLine = this.unprocessedLine;
      //} else {
      //  this.logMessage(`- skipAhead() remainingLine=[${remainingLine}]`);
    }
    //this.logMessage(`- skipAhead() EXIT w/remainingLine=[${remainingLine}]`);
    return remainingLine;
  }

  private loadNextLine(): void {
    //this.logMessage(`- loadNextLine() - ENTRY   currLineIndex=(${this.currLineIndex}), lineCt=(${this.srcFile.lineCount})`);
    if (!this.at_eof) {
      if (this.currLineIndex < this.srcFile.lineCount - 1) {
        this.currLineIndex += 1;
        this.currentTextLine = this.srcFile.lineAt(this.currLineIndex);
        this.unprocessedLine = this.currentTextLine.text;
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
}
