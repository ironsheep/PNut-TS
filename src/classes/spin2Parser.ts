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
import { ID_SEPARATOR_STRING, SymbolEntry, SymbolTable, iSymbol } from './symbolTable';
import { float32ToHexString } from '../utils/float32';
import { eElementType } from './types';
import { getSourceSymbol } from '../utils/fileUtils';
import { ObjectImage } from './objectImage';

// src/classes/spin2Parser.ts

export class Spin2Parser {
  private context: Context;
  private isLogging: boolean = false;
  private srcFile: SpinDocument | undefined;
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

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = this.context.logOptions.logParser;
    this.elementizer = new SpinElementizer(ctx);
    this.spinSymbolTables = new SpinSymbolTables(ctx);
    this.logMessage(`* Parser is logging`);
    this.spinResolver = new SpinResolver(this.context);
  }

  get sourceLineNumber(): number {
    return this.elementizer.sourceLineNumber;
  }

  public setSourceFile(spinCode: SpinDocument) {
    this.srcFile = spinCode;
    this.elementizer.setSourceFile(spinCode);
  }

  public P2Elementize() {
    this.logMessage('* P2Elementize() - ENTRY');
    //logContextState(this.context, 'Spin2Parser');
    // store the value(s) in list
    // publish for next steps to use
    this.spinElements = this.elementizer.getFileElements();
    this.spinResolver.setElements(this.spinElements);

    this.P2ListElements(); // blank line

    // if regression reporting enabled then generate the report
    if (this.context.reportOptions.writeElementsReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      if (this.srcFile) {
        reporter.writeElementReport(this.srcFile.dirName, this.srcFile.fileName, this.spinElements);
      }
    }
  }

  public P2Compile1(overrideSymbol: SymbolTable | undefined) {
    this.logMessage('* P2Compile1() - ENTRY');
    this.spinResolver.compile1(overrideSymbol);
  }

  public P2Compile2() {
    this.logMessage('* P2Compile2() - ENTRY');
    this.spinResolver.compile2();
  }

  public P2List() {
    this.logMessage('* P2List() - write list file');
    if (this.context.compileOptions.writeListing) {
      const outFilename = this.context.compileOptions.listFilename;
      // Create a write stream
      this.logMessage(`  -- writing report to ${outFilename}`);
      const stream = fs.createWriteStream(outFilename);

      const userSymbols = this.spinResolver.userSymbolTable;
      /*
      stream.write(`\n\n* ----------------------\n`);
      for (let index = 0; index < userSymbols.length; index++) {
        const userSymbol = userSymbols[index];
        stream.write(`userSymbol: NAME:[${userSymbol.name}] TYPE:[${eElementType[userSymbol.type]}]\n`);
      }
      stream.write(`* ----------------------\n\n`);
*/
      // emit: symbol list,  if we have symbols place them at top of report
      if (userSymbols.length > 0) {
        // EX: TYPE: CON             VALUE: 13F7B1C0          NAME: CLK_FREQ
        for (let index = 0; index < userSymbols.length; index++) {
          const symbol: SymbolEntry = userSymbols[index];
          let symbolType: string;
          switch (symbol.type) {
            case eElementType.type_con:
              symbolType = 'CON';
              break;
            case eElementType.type_con_float:
              symbolType = 'CON_FLOAT';
              break;
            case eElementType.type_dat_long:
              symbolType = 'DAT_LONG';
              break;

            case eElementType.type_dat_long_res:
              symbolType = 'DAT_LONG_RES';
              break;

            case eElementType.type_dat_word:
              symbolType = 'DAT_WORD';
              break;

            case eElementType.type_dat_byte:
              symbolType = 'DAT_BYTE';
              break;

            case eElementType.type_var_byte:
              symbolType = 'VAR_BYTE';
              break;

            case eElementType.type_var_word:
              symbolType = 'VAR_WORD';
              break;

            case eElementType.type_var_long:
              symbolType = 'VAR_LONG';
              break;

            case eElementType.type_method:
              symbolType = 'METHOD';
              break;
            case eElementType.type_loc_byte:
              symbolType = 'LOC_BYTE';
              break;

            case eElementType.type_loc_word:
              symbolType = 'LOC_WORD';
              break;

            case eElementType.type_loc_long:
              symbolType = 'LOC_LONG';
              break;

            default:
              symbolType = `?? ${symbol.type} ??`;
              break;
          }
          const symbolTypeFixed = `${symbolType.padEnd(15, ' ')}`;
          const hexValue: string = float32ToHexString(BigInt(symbol.value)).replace('0x', '').padStart(8, '0');
          const symNameParts: string[] = symbol.name.split(ID_SEPARATOR_STRING);
          const nonUniqueName: string = symNameParts[0];
          stream.write(`TYPE: ${symbolTypeFixed} VALUE: ${hexValue}          NAME: ${nonUniqueName}\n`);
        }
      }
      // emit spin version
      stream.write(`\nSpin2_v${this.srcFile?.versionNumber}\n\n`);
      // emit: CLKMODE, CLKFREQ, XINFREQ if present
      let symbol = userSymbols.find((currSymbol) => currSymbol.name.toLocaleUpperCase() === 'CLKMODE_');
      if (symbol !== undefined) {
        const clkMode: number = Number(symbol.value);
        const valueString: string = this.rightAlignedHexValue(clkMode, 11);
        stream.write(`CLKMODE: ${valueString}\n`);
      }

      symbol = userSymbols.find((currSymbol) => currSymbol.name.toLocaleUpperCase() === 'CLKFREQ_');
      if (symbol !== undefined) {
        const clkFreq: number = Number(symbol.value);
        const valueString: string = this.rightAlignedDecimalValue(clkFreq, 11);
        stream.write(`CLKFREQ: ${valueString}\n`);
      }

      const xinFrequency = this.spinResolver.xinFrequency;
      const valueString: string = this.rightAlignedDecimalValue(xinFrequency, 11);
      stream.write(`XINFREQ: ${valueString}\n`);

      const objImage: ObjectImage = this.context.compileData.objImage;

      // test code!!!
      /*
      const hexLoad = '59 F0 64 FD 4E F0 64 FD 1F 08 60 FD F4 FF 9F FD 00 36 6E 01';
      const byteAr = hexLoad.split(' ').map((h) => parseInt(h, 16));
      for (let index = 0; index < byteAr.length; index++) {
        const newByte = byteAr[index];
        objImage.append(newByte);
      }
      */

      const objBytes: number = this.spinResolver.objBytes;
      const objString: string = this.rightAlignedDecimalValue(objBytes, 11);
      stream.write(`\n\nOBJ bytes: ${objString}\n`);

      const varBytes: number = this.spinResolver.varBytes;
      const varString: string = this.rightAlignedDecimalValue(varBytes, 11);
      stream.write(`VAR bytes: ${varString}\n\n`);

      // emit hub-bytes use
      // const lenString: string = this.rightAlignedDecimalValue(objImage.offset, 11);
      // stream.write(`\n\nHub bytes: ${lenString}\n\n`);

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

  private P2ListElements() {
    this.logMessage(''); // blank line
    this.logMessage('// ---------------------------------------');
    this.logMessage(`- displaying ${this.spinElements.length} entries`);
    let currSourceLine: number = -1;
    // now loop thru elements found
    for (let index = 0; index < this.spinElements.length; index++) {
      const element = this.spinElements[index];
      if (element.sourceLineIndex != currSourceLine) {
        const sourceLine: string = this.srcFile !== undefined ? this.srcFile.lineAt(element.sourceLineIndex).text : '??noSource??';
        this.logMessage(`  -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) [${sourceLine}]`);
        currSourceLine = element.sourceLineIndex;
      }
      const symbolName = getSourceSymbol(this.context, element);
      const symbolInterp: string = symbolName.length > 0 ? ` [${symbolName}]` : '';
      this.logMessage(` [${index}] -- ${element.toString()}${symbolInterp}`);
    }
    this.logMessage('\\ ---------------------------------------');
    this.logMessage('');
  }

  private rightAlignedHexValue(value: number, width: number): string {
    const symbolValue: string = `$${float32ToHexString(BigInt(value)).replace('0x', '').padStart(8, '0')}`;
    const interpValue: string = `${symbolValue.padStart(width)}`;
    return interpValue;
  }

  private rightAlignedDecimalValue(value: number, width: number): string {
    const interpValue: string = `${value.toLocaleString().padStart(width).replace(/,/g, '_')}`;
    return interpValue;
  }

  public fakeResolver() {
    // our list is in class objexct
    const spinElements: SpinElement[] = this.spinElements;
    this.spinResolver.setElements(this.spinElements);
    this.spinResolver.testResolveExp(0, 0, this.spinSymbolTables.lowestPrecedence);
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
