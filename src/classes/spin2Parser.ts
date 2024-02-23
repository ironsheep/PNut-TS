/* eslint-disable @typescript-eslint/no-unused-vars */
// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import fs from 'fs';
import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
//import { SymbolTable } from './symbolTable';
import { SpinElementizer } from './spinElementizer';
import { SpinElement } from './spinElement';
import { RegressionReporter } from './regression';
import { SpinSymbolTables, eOpcode } from './parseUtils';
import { SpinResolver } from './spinResolver';
import { iSymbol } from './symbolTable';
import { float32ToHexString } from '../utils/float32';
import { eElementType } from './types';
import { getSourceSymbol } from '../utils/fileUtils';
import { ObjectImage } from './objectImage';

// src/classes/spin2Parser.ts

export class Spin2Parser {
  private context: Context;
  private isLogging: boolean = false;
  private srcFile: SpinDocument;
  private elementizer: SpinElementizer;
  private spinSymbolTables: SpinSymbolTables;
  private spinElements: SpinElement[] = [];

  // private symbols_debug_hash_auto: SymbolTable = new SymbolTable();
  // private symbols_debug_hash_name: SymbolTable = new SymbolTable();
  // private symbols_hash_auto: SymbolTable = new SymbolTable();
  // private symbols_hash_level: SymbolTable = new SymbolTable();
  // private symbols_hash_param: SymbolTable = new SymbolTable();
  // private symbols_hash_main: SymbolTable = new SymbolTable();
  // private symbols_hash_local: SymbolTable = new SymbolTable();
  // private symbols_hash_inline: SymbolTable = new SymbolTable();

  private spinResolver: SpinResolver;

  constructor(ctx: Context, spinCode: SpinDocument) {
    this.context = ctx;
    this.srcFile = spinCode;
    this.elementizer = new SpinElementizer(ctx, spinCode);
    this.spinSymbolTables = new SpinSymbolTables(ctx);
    this.isLogging = this.context.logOptions.logParser;
    this.logMessage(`* Parser is logging`);
    this.spinResolver = new SpinResolver(this.context);
  }

  get sourceLineNumber(): number {
    return this.elementizer.sourceLineNumber;
  }

  public P2Elementize() {
    this.logMessage('* P2Elementize() - ENTRY');
    // store the value(s) in list
    // publish for next steps to use
    this.spinElements = this.elementizer.getFileElements();
    this.spinResolver.setElements(this.spinElements);

    // now loop thru elements found
    this.logMessage(''); // blank line
    this.logMessage('// ---------------------------------------');
    this.logMessage(`- displaying ${this.spinElements.length} entries`);
    let currSourceLine: number = -1;
    for (let index = 0; index < this.spinElements.length; index++) {
      const element = this.spinElements[index];
      if (element.sourceLineIndex != currSourceLine) {
        const sourceLine: string = this.srcFile.lineAt(element.sourceLineIndex).text;
        this.logMessage(`  -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) [${sourceLine}]`);
        currSourceLine = element.sourceLineIndex;
      }
      const symbolName = getSourceSymbol(this.context, element);
      const symbolInterp: string = symbolName.length > 0 ? ` [${symbolName}]` : '';
      this.logMessage(` (${index + 1}) -- ${element.toString()}${symbolInterp}`);
    }
    this.logMessage('\\ ---------------------------------------');
    this.logMessage(''); // blank line

    // if regression reporting enabled then generate the report
    if (this.context.reportOptions.writeElementsReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.writeElementReport(this.srcFile.dirName, this.srcFile.fileName, this.spinElements);
    }
  }

  public P2Compile1() {
    this.logMessage('* P2Compile1() - ENTRY');
    this.spinResolver.compile1();
  }

  public P2Compile2() {
    this.logMessage('* P2Compile2() - ENTRY');
    this.spinResolver.compile2();
  }
  public P2List() {
    this.logMessage('* P2List() - ENTRY');
    if (this.context.compileOptions.writeListing) {
      const outFilename = this.context.compileOptions.listFilename;
      // Create a write stream
      this.logMessage(`* writing report to ${outFilename}`);
      const stream = fs.createWriteStream(outFilename);

      const mainSymbols = this.spinResolver.userSymbolTable;

      // emit: symbol list,  if we have symbols place them at top of report
      if (mainSymbols.length > 0) {
        // EX: TYPE: CON             VALUE: 13F7B1C0          NAME: CLK_FREQ
        for (const [key, value] of mainSymbols) {
          const symbol: iSymbol = value;
          const symbolType: string = symbol.type == eElementType.type_con ? 'CON      ' : 'CON_FLOAT';
          const hexValue: string = float32ToHexString(BigInt(symbol.value)).replace('0x', '').padStart(8, '0');
          stream.write(`TYPE: ${symbolType}       VALUE: ${hexValue}          NAME: ${symbol.name}\n`);
        }
      }
      // emit spin version
      stream.write(`\n\nSpin2_v${this.srcFile.versionNumber}\n\n`);
      // emit: CLKMODE, CLKFREQ, XINFREQ if present
      let symbol = mainSymbols.get('CLKMODE');
      if (symbol !== undefined) {
        const valueReport = this.symbolAsHexValue(symbol);
        stream.write(`${valueReport}\n`);
      }

      symbol = mainSymbols.get('CLKFREQ');
      if (symbol !== undefined) {
        const valueReport = this.symbolAsDecimalValue(symbol);
        stream.write(`${valueReport}\n`);
      }

      symbol = mainSymbols.get('XINFREQ');
      if (symbol !== undefined) {
        const valueReport = this.symbolAsDecimalValue(symbol);
        stream.write(`${valueReport}\n`);
      }

      const objImage: ObjectImage = this.spinResolver.objectImage;

      // test code!!!
      /*
      const hexLoad = '59 F0 64 FD 4E F0 64 FD 1F 08 60 FD F4 FF 9F FD 00 36 6E 01';
      const byteAr = hexLoad.split(' ').map((h) => parseInt(h, 16));
      for (let index = 0; index < byteAr.length; index++) {
        const newByte = byteAr[index];
        objImage.append(newByte);
      }
      */

      // emit hub-bytes use
      stream.write(`\n\nHub bytes:          ${objImage.offset}\n\n`);

      // if we have object data, dump it
      if (objImage.offset > 0) {
        /// dump hex and ascii data
        let currOffset = 0;
        while (currOffset < objImage.offset) {
          let hexPart = '';
          let asciiPart = '';
          const remainingBytes = objImage.offset - currOffset;
          const lineLength = remainingBytes > 16 ? 16 : remainingBytes;
          for (let i = 0; i < lineLength; i++) {
            const byteValue = objImage.read(currOffset + i);
            hexPart += byteValue.toString(16).padStart(2, '0').toUpperCase() + ' ';
            asciiPart += byteValue >= 0x20 && byteValue <= 0x7e ? String.fromCharCode(byteValue) : '.';
          }
          const offsetPart = currOffset.toString(16).padStart(5, '0').toUpperCase();

          stream.write(`${offsetPart}- ${hexPart.padEnd(48, ' ')}  '${asciiPart}'\n`);
          currOffset += lineLength;
        }
      }

      // Close the stream
      stream.end();
    }
  }

  private symbolAsHexValue(symbol: iSymbol): string {
    const interpValue: string = `${symbol.name.toUpperCase()}:   $${float32ToHexString(BigInt(symbol.value))})`;
    return interpValue;
  }

  private symbolAsDecimalValue(symbol: iSymbol): string {
    // FIXME: TODO: make this decimal with commas...
    const interpValue: string = `${symbol.name.toUpperCase()}:   $${float32ToHexString(BigInt(symbol.value))})`;
    return interpValue;
  }

  public fakeResolver() {
    // our list is in class objexct
    const spinElements: SpinElement[] = this.spinElements;
    this.spinResolver.setElements(this.spinElements);
    this.spinResolver.resolveExp(0, 0, this.spinSymbolTables.lowestPrecedence);
    // now process list of elements, writing to our symbol tables
    // the dump symbol tables to listing file
  }

  public P2InsertInterpreter() {
    // TODO: we need code here
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
