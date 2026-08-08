/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict';

import fs from 'fs';
import { Context } from '../utils/context';
import { iOutputFilespecs, outputFilespecs } from '../utils/outputFilespecs';
import { SpinDocument } from './spinDocument';
import { SpinElementizer } from './spinElementizer';
import { SpinElement } from './spinElement';
import { RegressionReporter } from './regression';
import { SpinSymbolTables } from './parseUtils';
import { OBJ_LIMIT, SpinResolver } from './spinResolver';
import { ID_SEPARATOR_STRING, SymbolEntry, SymbolTable, iSymbol } from './symbolTable';
import { float32ToHexString } from '../utils/float32';
import { eElementType } from './types';
//import { getSourceSymbol } from '../utils/fileUtils';
import { ObjectImage } from './objectImage';
import { ExternalFiles } from './externalFiles';
import { hexLong } from '../utils/formatUtils';
import path from 'path';
import { MapGenerator } from './mapGenerator';
import { DebugData } from './debugData';

// src/classes/spin2Parser.ts

export class Spin2Parser {
  private context: Context;
  private isLogging: boolean;
  private isLoggingOutline: boolean = false;
  private srcFile: SpinDocument | undefined;
  private elementizer: SpinElementizer;
  private spinSymbolTables: SpinSymbolTables;
  private spinElements: SpinElement[] = [];
  private spinResolver: SpinResolver;
  private externalFiles: ExternalFiles;
  private objImage: ObjectImage;
  private readonly HubLimit: number = 0x80000;
  private readonly obj_limit = OBJ_LIMIT;
  private earlyDeduplicationSavings: number = 0;

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = ctx.logOptions.logParser;
    this.isLoggingOutline = ctx.logOptions.logOutline;
    this.elementizer = new SpinElementizer(this.context);
    this.spinSymbolTables = new SpinSymbolTables(this.context);
    this.spinResolver = new SpinResolver(this.context);
    this.externalFiles = new ExternalFiles(this.context);
    this.objImage = ctx.compileData.objImage;
    this.objImage.refreshLogging();
    if (this.isLogging) this.logMessage(`* Parser is logging`);
  }

  get sourceLineNumber(): number {
    // used during exception reporting
    let lineNumber: number;

    // If the elementizer is currently running, use its line number
    // Otherwise use the resolver's line number
    if (this.elementizer.isCurrentlyElementizing) {
      lineNumber = this.elementizer.sourceLineNumber;
    } else {
      lineNumber = this.spinResolver.sourceLineNumber;
    }

    return lineNumber;
  }

  get failingFileID(): number {
    // used during exception reporting
    return this.spinResolver.failingFileID;
  }

  get distiller() {
    return this.spinResolver.distiller;
  }

  public setSourceFile(spinCode: SpinDocument) {
    this.srcFile = spinCode;
    if (this.isLogging) this.logMessage(`* Parser.setSourceFile([${this.srcFile.fileName}])`);
    this.P2Elementize();
  }

  public P2Elementize() {
    if (this.isLogging) this.logMessage(`* P2Elementize() - ENTRY file=[${this.srcFile?.fileName}]`);
    //logContextState(this.context, 'Spin2Parser');
    // store the value(s) in list
    // publish for next steps to use
    if (this.srcFile) {
      this.elementizer.setSourceFile(this.srcFile);
      this.spinElements = this.srcFile.elementList;
      this.spinResolver.setSourceFile(this.srcFile);

      //if (this.isLogging) this.logMessage(`* P2Elementize() - Log Element List - ENTRY`);
      //this.P2ListElements(); // blank line
      //if (this.isLogging) this.logMessage(`* P2Elementize() - Log Element List - EXIT`);

      // if regression reporting enabled then generate the report
      if (this.context.reportOptions.writeElementsReport) {
        if (this.isLogging) this.logMessage(`* P2Elementize() - Dump Element List - ENTRY`);
        const reporter: RegressionReporter = new RegressionReporter(this.context);
        reporter.writeElementReport(this.srcFile.dirName, this.srcFile.fileName, this.srcFile.elementList);
        if (this.isLogging) this.logMessage(`* P2Elementize() - Dump Element List - EXIT`);
      }
    }
  }

  public setEarlyDeduplicationSavings(savings: number): void {
    this.earlyDeduplicationSavings = savings;
  }

  public P2Compile1(overrideSymbol: SymbolTable | undefined) {
    if (this.isLogging) this.logMessage('* P2Compile1() - ENTRY');
    this.spinResolver.compile1(overrideSymbol);
  }

  public P2Compile2(isTopLevel: boolean) {
    if (this.isLogging) this.logMessage(`* P2Compile2(isTopLevel=(${isTopLevel})) - ENTRY`);
    if (this.isLogging)
      this.logMessage(
        `  -- OPTS elem(${this.context.logOptions.logElementizer}), parse(${this.context.logOptions.logParser}), comp(${this.context.logOptions.logCompile}), resolv(${this.context.logOptions.logResolver}), preproc(${this.context.logOptions.logPreprocessor})`
      );
    this.spinResolver.compile2(isTopLevel);
    if (this.isLogging) this.logMessage(`* P2Compile2(isTopLevel=(${isTopLevel})) - EXIT`);
  }

  /**
   * Get the current user symbol table (for map file generation)
   * Returns a copy of the symbols to avoid reference issues
   */
  public getUserSymbolTable(): SymbolEntry[] {
    return [...this.spinResolver.userSymbolTable];
  }

  /**
   * Direct access to the in-progress DebugData table. Used by the object
   * cache to snapshot record counts before/after a child compile, extract
   * a child's contributed records on cache miss, and replay records on
   * cache hit.
   */
  public get debugRawData(): DebugData {
    return this.spinResolver.debugRawData;
  }

  private P2MakeFlashFile(objImage: ObjectImage) {
    if (this.context.compileOptions.writeFlashImageFile) {
      if (this.isLogging) this.logMessage('* P2MakeFlashFile() - write flash image file');
      this.P2MakeFlashFileImage(objImage); // convert image to flash image
      const outFilename = this.context.compileOptions.flashFilename;
      // Create a write stream
      if (this.isLogging) this.logMessage(`  -- writing flash image to ${outFilename}`);
      const stream = fs.createWriteStream(outFilename);
      this.writeObjectFile(objImage, 0, objImage.offset, outFilename); // full
      // Close the stream
      stream.end();
      this.context.logger.progressMsg(`Wrote ${outFilename}`);
    }
  }

  public P2List() {
    if (this.context.compileOptions.writeListing) {
      if (this.isLogging) this.logMessage('* P2List() - write list file');
      const outFilename = this.context.compileOptions.listFilename;
      // Create a write stream
      if (this.isLogging) this.logMessage(`  -- writing report to ${outFilename}`);
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
            case eElementType.type_con_int:
              symbolType = 'CON_INT';
              break;
            case eElementType.type_con_float:
              symbolType = 'CON_FLOAT';
              break;
            case eElementType.type_con_struct:
              symbolType = 'CON_STRUCT';
              break;
            case eElementType.type_register:
              symbolType = 'REGISTER';
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
            case eElementType.type_loc_struct:
              symbolType = 'LOC_STRUCT';
              break;
            case eElementType.type_loc_byte_ptr:
              symbolType = 'LOC_BYTE_PTR';
              break;
            case eElementType.type_loc_word_ptr:
              symbolType = 'LOC_WORD_PTR';
              break;
            case eElementType.type_loc_long_ptr:
              symbolType = 'LOC_LONG_PTR';
              break;
            case eElementType.type_loc_struct_ptr:
              symbolType = 'LOC_STRUCT_PTR';
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
            case eElementType.type_var_struct:
              symbolType = 'VAR_STRUCT';
              break;
            case eElementType.type_var_byte_ptr:
              symbolType = 'VAR_BYTE_PTR';
              break;
            case eElementType.type_var_word_ptr:
              symbolType = 'VAR_WORD_PTR';
              break;
            case eElementType.type_var_long_ptr:
              symbolType = 'VAR_LONG_PTR';
              break;
            case eElementType.type_var_struct_ptr:
              symbolType = 'VAR_STRUCT_PTR';
              break;
            case eElementType.type_dat_byte:
              symbolType = 'DAT_BYTE';
              break;
            case eElementType.type_dat_word:
              symbolType = 'DAT_WORD';
              break;
            case eElementType.type_dat_long:
              symbolType = 'DAT_LONG';
              break;
            case eElementType.type_dat_struct:
              symbolType = 'DAT_STRUCT';
              break;
            case eElementType.type_dat_long_res:
              symbolType = 'DAT_LONG_RES';
              break;
            case eElementType.type_hub_byte:
              symbolType = 'HUB_BYTE';
              break;
            case eElementType.type_hub_word:
              symbolType = 'HUB_WORD';
              break;
            case eElementType.type_hub_long:
              symbolType = 'HUB_LONG';
              break;
            case eElementType.type_obj:
              symbolType = 'OBJ';
              break;
            case eElementType.type_obj_pub:
              symbolType = 'OBJ_PUB';
              break;
            case eElementType.type_obj_con_int:
              symbolType = 'OBJ_CON_INT';
              break;
            case eElementType.type_obj_con_float:
              symbolType = 'OBJ_CON_FLOAT';
              break;
            case eElementType.type_obj_con_struct:
              symbolType = 'OBJ_CON_STRUCT';
              break;
            case eElementType.type_method:
              symbolType = 'METHOD';
              break;

            default:
              symbolType = `?? ${symbol.type} ??`;
              break;
          }
          const padWidth: number = this.context.compileOptions.v44FormatListing ? 17 : 15;
          const symbolTypeFixed = `${symbolType.padEnd(padWidth, ' ')}`;
          const hexValue: string = float32ToHexString(BigInt(symbol.value)).replace('0x', '').padStart(8, '0');
          const symNameParts: string[] = symbol.name.split(ID_SEPARATOR_STRING);

          let nonUniqueName: string = symNameParts[0];
          const instanceNumber: number = nonUniqueName.charCodeAt(nonUniqueName.length - 1);
          let symWithInstanceNbr: string = nonUniqueName;
          // if we need to show instance number in hex...
          if (instanceNumber > 0 && instanceNumber <= 32) {
            nonUniqueName = nonUniqueName.slice(0, -1); // remove last char (instanceNumber)
            symWithInstanceNbr = `${nonUniqueName},${instanceNumber.toString(16).toUpperCase().padStart(2, '0')}`; // remove trailing underscore
          }

          if (this.isLogging)
            this.logMessage(`LST: symNameParts=[${symNameParts}], nonUniqueName=[${nonUniqueName.slice(0, -1)}], instanceNumber=(${instanceNumber})`);
          stream.write(`TYPE: ${symbolTypeFixed} VALUE: ${hexValue}          NAME: ${symWithInstanceNbr}\n`);
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

      const isPasmMode: boolean = this.spinResolver.isPasmMode;
      const saveObjImageOffset: number = this.objImage.offset;

      const objectOffset: number = isPasmMode ? 0 : 8;

      if (this.context.compileOptions.writeObj) {
        this.writeObjectFile(this.objImage, 0, this.objImage.length, outputFilespecs(this.context).object); // full
        this.objImage.setOffsetTo(saveObjImageOffset);
      }

      // test code!!!
      /*
      const hexLoad = '59 F0 64 FD 4E F0 64 FD 1F 08 60 FD F4 FF 9F FD 00 36 6E 01';
      const byteAr = hexLoad.split(' ').map((h) => parseInt(h, 16));
      for (let index = 0; index < byteAr.length; index++) {
        const newByte = byteAr[index];
        objImage.append(newByte);
      }
      */

      const objectLength = isPasmMode ? this.objImage.length : this.objImage.readLong(4);
      const distillerSavings: number = this.spinResolver.removedBytes;
      const objString: string = this.rightAlignedDecimalValue(objectLength, 11);
      const varBytes: number = this.spinResolver.varBytes;
      const varString: string = this.rightAlignedDecimalValue(varBytes, 11);
      if (isPasmMode) {
        stream.write(`\n\nHub bytes: ${objString}\n\n`);
      } else {
        // Report both early deduplication and distiller savings
        const totalSavings = this.earlyDeduplicationSavings + distillerSavings;
        if (totalSavings > 0) {
          stream.write(`\n`);
          if (this.earlyDeduplicationSavings > 0 && distillerSavings > 0) {
            // Both optimizations saved bytes - show individual and total
            const earlyString: string = this.rightAlignedDecimalValue(this.earlyDeduplicationSavings, 11);
            const distillerString: string = this.rightAlignedDecimalValue(distillerSavings, 11);
            const totalString: string = this.rightAlignedDecimalValue(totalSavings, 11);
            stream.write(`\nEarly deduplication bytes saved:    ${earlyString}\n`);
            stream.write(`Distiller optimization bytes saved: ${distillerString}\n`);
            stream.write(`Total redundant OBJ bytes removed:  ${totalString}\n`);
          } else if (this.earlyDeduplicationSavings > 0) {
            // Only early deduplication saved bytes
            const earlyString: string = this.rightAlignedDecimalValue(this.earlyDeduplicationSavings, 11);
            stream.write(`\nRedundant OBJ bytes removed: ${earlyString}\n`);
          } else {
            // Only distiller saved bytes
            const distillerString: string = this.rightAlignedDecimalValue(distillerSavings, 11);
            stream.write(`\nRedundant OBJ bytes removed: ${distillerString}\n`);
          }
        } else {
          stream.write(`\n`);
        }
        stream.write(`\nOBJ bytes: ${objString}\n`);
        stream.write(`VAR bytes: ${varString}\n`);
        // Report debug statistics when compiling with -d
        if (this.context.compileOptions.enableDebug) {
          const debugRawData = this.spinResolver.debugRawData;
          const debugRecords = debugRawData.recordCount;
          const debugDataBytes = debugRawData.length - 0x200; // subtract index table size
          const maxRecords = DebugData.MAX_ENTRIES;
          const maxDataBytes = DebugData.DEBUG_SIZE_IN_BYTES - 0x200;
          const recordsString = this.rightAlignedDecimalValue(debugRecords, 11);
          const debugBytesString = this.rightAlignedDecimalValue(debugDataBytes, 11);
          const recordsPct = ((debugRecords / maxRecords) * 100).toFixed(1);
          const dataPct = ((debugDataBytes / maxDataBytes) * 100).toFixed(1);
          stream.write(`\nDEBUG records: ${recordsString} of ${maxRecords} (${recordsPct}%)\n`);
          stream.write(`DEBUG data:    ${debugBytesString} of ${maxDataBytes} bytes (${dataPct}%)\n`);
        }
        stream.write(`\n`);
      }

      // emit hub-bytes use
      // const lenString: string = this.rightAlignedDecimalValue(objImage.offset, 11);
      // stream.write(`\n\nHub bytes: ${lenString}\n\n`);

      // if we have object data, dump it
      if (objectLength > 0) {
        /// dump hex and ascii data
        let displayOffset: number = 0;
        let currOffset = objectOffset;
        while (displayOffset < objectLength) {
          let hexPart = '';
          let asciiPart = '';
          const remainingBytes = objectLength - displayOffset;
          const lineLength = remainingBytes > 16 ? 16 : remainingBytes;
          for (let i = 0; i < lineLength; i++) {
            const byteValue = this.objImage.read(currOffset + i);
            hexPart += byteValue.toString(16).padStart(2, '0').toUpperCase() + ' ';
            asciiPart += byteValue >= 0x20 && byteValue <= 0x7e ? String.fromCharCode(byteValue) : '.';
          }
          const offsetPart = displayOffset.toString(16).padStart(5, '0').toUpperCase();

          stream.write(`${offsetPart}- ${hexPart.padEnd(48, ' ')}  '${asciiPart}'\n`);
          currOffset += lineLength;
          displayOffset += lineLength;
        }
      }

      const debugData = this.spinResolver.debugData;
      //const debugData = this.spinResolver.debugRawData;
      const debugLength = debugData.length;
      // if we have object data, dump it
      if (debugLength > 0) {
        stream.write(`\n\nDEBUG data\n\n`);
        /// dump hex and ascii data
        let displayOffset: number = 0;
        let currOffset = 0;
        while (displayOffset < debugLength) {
          let hexPart = '';
          let asciiPart = '';
          const remainingBytes = debugLength - displayOffset;
          const lineLength = remainingBytes > 16 ? 16 : remainingBytes;
          for (let i = 0; i < lineLength; i++) {
            const byteValue = debugData[currOffset + i];
            //const byteValue = debugData.read(currOffset + i);
            hexPart += byteValue.toString(16).padStart(2, '0').toUpperCase() + ' ';
            asciiPart += byteValue >= 0x20 && byteValue <= 0x7e ? String.fromCharCode(byteValue) : '.';
          }
          const offsetPart = displayOffset.toString(16).padStart(5, '0').toUpperCase();

          stream.write(`${offsetPart}- ${hexPart.padEnd(48, ' ')}  '${asciiPart}'\n`);
          currOffset += lineLength;
          displayOffset += lineLength;
        }
      }

      // Close the stream
      stream.end();
      this.context.logger.progressMsg(`Wrote ${outFilename}`);
    }
  }

  /**
   * Generate memory map file (.map) if enabled
   */
  public P2Map(): void {
    const mapGenerator = new MapGenerator(this.context, this.spinResolver);
    mapGenerator.generate();
  }

  private rightAlignedHexValue(value: number, width: number): string {
    const symbolValue: string = `$${float32ToHexString(BigInt(value)).replace('0x', '').padStart(8, '0')}`;
    const interpValue: string = `${symbolValue.padStart(width)}`;
    return interpValue;
  }

  private rightAlignedDecimalValue(value: number, width: number): string {
    let interpValue: string = '';
    if (this.context.compileOptions.v44FormatListing) {
      interpValue = `${value.toLocaleString().padStart(width).replace(/,/g, '_')}`;
    } else {
      interpValue = `${value.toLocaleString().padStart(width)}`;
    }
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

  // The destination is passed in rather than derived here: this writes the .obj for
  // one caller and the .flash image for the other. It used to take the LISTING name
  // and do lstFilename.replace('.lst', '.obj'), which produced the .obj for the first
  // caller and -- because the flash filename contains no '.lst' to replace -- silently
  // passed the flash name straight through for the second.
  private writeObjectFile(objImage: ObjectImage, offset: number, byteCount: number, objFilename: string) {
    if (this.isLogging) this.logMessage(`  -- writing OBJ file (${byteCount} bytes from offset ${offset}) to ${objFilename}`);
    const stream = fs.createWriteStream(objFilename);
    if (offset == 8) {
      const firstLong: number = objImage.readLong(0);
      const secondLong: number = objImage.readLong(4);
      if (this.isLogging) this.logMessage(`* longs BEFORE OBJ write first(${hexLong(firstLong)}), second=(${hexLong(secondLong)})`);
    }
    // copy our full buffer becuse it will be over written before the file write completes!
    const buffer = new Uint8Array(byteCount);
    buffer.set(objImage.rawUint8Array.subarray(offset, offset + byteCount));
    //const buffer = Buffer.from(objImage.rawUint8Array.buffer, offset, byteCount);
    if (offset == 8) {
      const firstLong: number = objImage.readLong(0);
      const secondLong: number = objImage.readLong(4);
      if (this.isLogging) this.logMessage(`* longs AFTER OBJ write first(${hexLong(firstLong)}), second=(${hexLong(secondLong)})`);
    }
    stream.write(buffer);

    // Close the stream
    stream.end();
    this.context.logger.progressMsg(`Wrote ${objFilename} (${byteCount} bytes)`);
  }
  public ComposeRam() {
    // here is pascal ComposeRAM()
    // pnut-ts is a compiler-only tool: --flash/--ram download options were
    // never wired up and the corresponding programFlash/ramDownload code
    // paths (P2InsertFlashLoader, LoadHardware) are dormant. The flash *image*
    // file (.flash) for external programmers is still produced when
    // --flashfile is set; that path goes through P2MakeFlashFile.
    const isPasmMode: boolean = this.spinResolver.isPasmMode;
    const isDebugMode: boolean = this.context.compileOptions.enableDebug;
    if (isPasmMode == false) {
      const firstLong: number = this.objImage.readLong(0);
      const secondLong: number = this.objImage.readLong(4);
      if (this.isLogging) this.logMessage(`* ComposeRam() first(${hexLong(firstLong)}), second=(${hexLong(secondLong)})`);
    }
    // insert interpreter?
    if (isPasmMode == false) {
      this.P2InsertInterpreter();
    }
    // check to make sure program fits into hub
    let objSize: number = this.spinResolver.executableSize; // pascal s
    if (isDebugMode) {
      objSize += 0x4000; // account for debugger
    }
    if (isPasmMode == false) {
      // s := s + P2.SizeInterpreter + P2.SizeVar + $400; // $400 is for stack space?
      objSize += this.externalFiles.spinInterpreterLength + this.spinResolver.variableSize + 0x400;
    }
    if (objSize > this.HubLimit) {
      // [error_PASCAL]
      throw new Error(`Program requirement exceeds ${this.HubLimit / 1024}KB hub RAM by ${objSize - this.HubLimit} bytes`);
    }
    // insert debugger?
    if (isDebugMode) {
      this.P2InsertDebugger();
    }
    // insert clock setter?
    if (isDebugMode == false && isPasmMode && this.spinResolver.clockMode != 0) {
      this.P2InsertClockSetter();
    }

    const nonLoaderObjImage = ObjectImage.copyFrom(this.objImage);

    // save binary file
    if (this.context.compileOptions.writeBin) {
      this.writeBinaryFile(this.objImage, 0, this.objImage.length, false);
    }

    if (this.context.compileOptions.writeFlashImageFile) {
      this.P2MakeFlashFile(nonLoaderObjImage);
    }
  }

  private writeBinaryFile(objImage: ObjectImage, offset: number, byteCount: number, hasFlashLoader: boolean = false) {
    // BUGFIX: for issue #4 add true -o option -- the -o override lives in the
    // shared derivation now, along with the -a suffix choice
    const outputs: iOutputFilespecs = outputFilespecs(this.context);
    const objFilename = hasFlashLoader ? outputs.flashLoaderBinary : outputs.binary;
    if (this.isLogging) this.logMessage(`  -- writing BIN file (${byteCount} bytes from offset ${offset}) to ${objFilename}`);
    const stream = fs.createWriteStream(objFilename);

    const buffer = Buffer.from(objImage.rawUint8Array.buffer, offset, byteCount);
    stream.write(buffer);

    // Close the stream
    stream.end();
    this.context.logger.progressMsg(`Wrote ${objFilename} (${byteCount} bytes)`);
  }

  public P2InsertInterpreter() {
    // PNut insert_interpreter:
    if (this.isLogging) this.logMessage(`* P2InsertInterpreter()`);
    const firstLong: number = this.objImage.readLong(0);
    const secondLong: number = this.objImage.readLong(4);
    if (this.isLogging) this.logMessage(`* P2InsertInterpreter() first(${hexLong(firstLong)}), second=(${hexLong(secondLong)})`);

    const pbase_init = 0x30;
    const vbase_init = 0x34;
    const dbase_init = 0x38;
    const var_longs = 0x3c;
    const clkmode_hub = 0x40;
    const clkfreq_hub = 0x44;
    const _debugnop_ = 0xf78; // this changes with interpreter changes (v52a: 0xf2c -> v52: 0xf34 -> v55: 0xf78)

    // determine initial pub index
    if (this.isLogging) this.logMessage(`  -- scan pubs`);
    //this.objImage.setLogging(true); // REMOVE BEFORE FLIGHT
    this.objImage.setOffsetTo(8);

    let pubIndex: number = 0;
    let tableEntry: number = 0;
    // eslint-disable-next-line no-constant-condition
    let zerosMaxCount: number = 15;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@findpub:
      tableEntry = this.objImage.readLongNext();
      if (tableEntry == 0 && --zerosMaxCount <= 0) {
        throw new Error('LOOP EXCEEDED EMPTY BUFFER');
      }
      if ((tableEntry & 0x80000000) != 0) {
        break;
      } else {
        tableEntry = this.objImage.readLongNext();
        pubIndex += 2;
      }
    }
    //this.objImage.setLogging(false); // REMOVE BEFORE FLIGHT
    if (this.isLogging) this.logMessage(`  -- have pibIndex=(${pubIndex})`);
    // here is @@gotpub
    const interpreterLength = this.externalFiles.spinInterpreterLength;
    // move object upwards to accommodate interpreter
    if (this.isLogging) this.logMessage(`  -- move object up - interpreterLength=(${interpreterLength}) bytes`);
    this.moveObjectUp(this.objImage, interpreterLength, 8, this.spinResolver.executableSize);
    // install interpreter
    if (this.isLogging) this.logMessage(`  -- load interpreter`);
    this.objImage.rawUint8Array.set(this.externalFiles.spinInterpreter, 0);
    if (this.isLogging) this.logMessage(`  -- set new sizes`);
    // set pbase_init
    let computedSize: number = interpreterLength;
    if (this.isLoggingOutline)
      this.logMessageOutline(`++ interp patch pbase (${hexLong(pbase_init, '0x')}) = (${hexLong(computedSize, '0x')})(${computedSize})`);
    this.objImage.replaceLong(computedSize, pbase_init);
    // set vbase_init
    const firstPubIndex: number = pubIndex << 20;
    computedSize += this.spinResolver.executableSize;
    const patchValue: number = firstPubIndex | computedSize;
    if (this.isLoggingOutline)
      this.logMessageOutline(`++ interp patch vbase (${hexLong(vbase_init, '0x')}) = (${hexLong(patchValue, '0x')})(${patchValue})`);
    this.objImage.replaceLong(patchValue, vbase_init); // index of first pub in vbase_init[31:20]
    // set dbase_init
    computedSize += this.spinResolver.variableSize;
    if (this.isLoggingOutline)
      this.logMessageOutline(`++ interp patch dbase (${hexLong(dbase_init, '0x')}) = (${hexLong(computedSize, '0x')})(${computedSize})`);
    this.objImage.replaceLong(computedSize, dbase_init);
    // add stackSize
    computedSize += 0x400; // ensure dbase has $100 longs of stack headroom
    const isDebugMode: boolean = this.context.compileOptions.enableDebug;
    if (isDebugMode) {
      computedSize += 0x4000; // account for debugger
    }
    if (computedSize > this.obj_limit) {
      // [error_pex]
      throw new Error(`Program exceeds ${this.obj_limit / 1024}KB (m492)`);
    }
    if (this.isLogging) this.logMessage(`  -- patch interpreter`);
    // set var_longs
    const newVarLongs: number = ((this.spinResolver.variableSize + 0x400) >> 2) - 1;
    if (this.isLoggingOutline)
      this.logMessageOutline(`++ interp patch varSize (${hexLong(var_longs, '0x')}) = (${hexLong(newVarLongs, '0x')})(${newVarLongs})`);
    this.objImage.replaceLong(newVarLongs, var_longs);
    // set clkmode_hub
    this.objImage.replaceLong(this.spinResolver.clockMode, clkmode_hub);
    // set clkfreq_hub
    this.objImage.replaceLong(this.spinResolver.clockFrequency, clkfreq_hub);
    if (isDebugMode == false) {
      // if not debug mode, force NOP instructions
      this.objImage.replaceLong(0, _debugnop_ + 0);
      this.objImage.replaceLong(0, _debugnop_ + 4);
      this.objImage.replaceLong(0, _debugnop_ + 8);
    } else {
      // debug mode, install debug_pin_rx into instructions
      const debugPinRx = this.spinResolver.debugPinReceive;
      let newLongValue = this.objImage.readLong(_debugnop_ + 0);
      newLongValue |= debugPinRx << 9;
      this.objImage.replaceLong(newLongValue, _debugnop_ + 0);
      newLongValue = this.objImage.readLong(_debugnop_ + 4);
      newLongValue |= debugPinRx;
      this.objImage.replaceLong(newLongValue, _debugnop_ + 4);
      newLongValue = this.objImage.readLong(_debugnop_ + 8);
      newLongValue |= debugPinRx << 9;
      this.objImage.replaceLong(newLongValue, _debugnop_ + 8);
    }
    // mark the new end of this image
    this.objImage.setOffsetTo(interpreterLength + this.spinResolver.executableSize); // address of byte after our image
  }

  private moveObjectUp(objImage: ObjectImage, destOffset: number, sourceOffset: number, nbrBytes: number) {
    const currOffset = objImage.offset;
    if (this.isLogging) this.logMessage(`* moveObjUp() from=(${sourceOffset}), to=(${destOffset}), length=(${nbrBytes})`);
    if (currOffset + nbrBytes > this.obj_limit) {
      // [error_pex]
      throw new Error(`Program exceeds ${this.obj_limit / 1024}KB (m493)`);
    }
    for (let index = 0; index < nbrBytes; index++) {
      const invertedIndex = nbrBytes - index - 1;
      objImage.replaceByte(objImage.read(sourceOffset + invertedIndex), destOffset + invertedIndex);
    }
    if (this.isLogging) this.logMessage(`* moveObjUp()offset (${currOffset}) -> (${currOffset + destOffset}) `);
    objImage.setOffsetTo(currOffset + destOffset);
  }

  public P2InsertDebugger() {
    // PNut insert_debugger:
    if ((this.spinResolver.clockMode & 0b10) == 0 || this.spinResolver.clockFrequency < 10000000) {
      // [error_debugclk]
      throw new Error('DEBUG requires at least 10 MHz of crystal/external clocking');
    }

    const debugData = this.spinResolver.debugData;
    const debuggerLength = this.externalFiles.spinDebuggerLength;
    const applicationSize = this.objImage.offset;
    // patch offsets in debugger
    const _clkfreq_ = 0xd4;
    const _clkmode1_ = 0xd8;
    const _clkmode2_ = 0xdc;
    const _delay_ = 0xe0;
    const _appsize_ = 0xe4;
    const _hubset_ = 0xe8;
    const _brkcond_ = 0x11c;
    const _txpin_ = 0x140;
    const _rxpin_ = 0x144;
    const _baud_ = 0x148;

    const symcogs: string = 'DEBUG_COGS';
    const symcoginit: string = 'DEBUG_COGINIT';
    const symmain: string = 'DEBUG_MAIN';
    const symdelay: string = 'DEBUG_DELAY';
    const symtimestamp: string = 'DEBUG_TIMESTAMP';

    // move object upwards to accommodate debugger
    if (this.isLogging) this.logMessage(`  -- move object up - debuggerLength=(${debuggerLength})+debugDataLength=(${debugData.length}) bytes`);
    this.moveObjectUp(this.objImage, debuggerLength + debugData.length, 0, applicationSize);
    // install debugger
    if (this.isLogging) this.logMessage(`  -- load debugger`);
    this.objImage.rawUint8Array.set(this.externalFiles.spinDebugger, 0);

    if (this.isLogging) this.logMessage(`  -- load debugg data`);
    this.objImage.rawUint8Array.set(debugData, debuggerLength);

    // now patch the debugger
    this.objImage.replaceLong(applicationSize, _appsize_);
    this.objImage.replaceLong(this.spinResolver.clockFrequency, _clkfreq_);
    this.objImage.replaceLong(this.spinResolver.clockMode, _clkmode2_);
    this.objImage.replaceLong(this.spinResolver.clockMode & 0xfffffffc, _clkmode1_);

    // is user specifying which cogs to debug?
    let [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symcogs);
    if (symbolFound) {
      if (isConstInteger) {
        this.objImage.replaceByte(Number(value), _hubset_);
      } else {
        // [error_debugcog]
        throw new Error('DEBUG_COGS can only be defined as an integer constant');
      }
    }

    // are we breaking on coginit?
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symcoginit);
    if (symbolFound) {
      this.objImage.replaceLong(0x110, _brkcond_);
    }

    // -OR- are we breaking on main?
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symmain);
    if (symbolFound) {
      this.objImage.replaceLong(0x001, _brkcond_);
    }

    // user wanting delay?
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symdelay);
    if (symbolFound) {
      if (isConstInteger) {
        const clkFreqInKHz = this.spinResolver.clockFrequency / 1000;
        let adjustedFreq = clkFreqInKHz * Number(value);
        if (adjustedFreq > 0xffffffff) {
          adjustedFreq = 0xffffffff; // limit to 0FFFFFFFFh
        }
        this.objImage.replaceLong(adjustedFreq, _delay_);
      } else {
        // [error_debugdly]
        throw new Error('DEBUG_DELAY can only be defined as an integer constant');
      }
    }

    this.objImage.replaceByte(this.spinResolver.debugPinTransmit, _txpin_);
    this.objImage.replaceByte(this.spinResolver.debugPinReceive, _rxpin_);
    this.objImage.replaceLong(this.spinResolver.debugBaudRate, _baud_);

    // user wanting timestamps?
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symtimestamp);
    if (symbolFound) {
      const tsValue = this.objImage.read(_rxpin_ + 3);
      this.objImage.replaceByte(tsValue | 0x80, _rxpin_ + 3);
    }
  }

  private checkDebugSymbol(smbolName: string): [boolean, boolean, bigint | string] {
    let definedStatus: boolean = false;
    let isConStatus: boolean = false;
    let symValue: bigint | string = 0n;
    const symbolFound: iSymbol | undefined = this.spinResolver.lookupMainSymbol(smbolName);
    if (symbolFound) {
      definedStatus = true;
      if (symbolFound.type == eElementType.type_con_int) {
        isConStatus = true;
      }
      symValue = symbolFound.value;
    }
    return [definedStatus, isConStatus, symValue];
  }

  private P2MakeFlashFileImage(objImage: ObjectImage) {
    // PNut make_flash_file:

    const _loader_offset_ = 0x160;
    const _loader_size_ = 0x1f0 - _loader_offset_;

    const _appLongs_ = _loader_size_ - 0x10;
    const _appLongs2_ = _loader_size_ - 0x0c;
    const _appSum_ = _loader_size_ - 0x08;
    const _loaderSum_ = _loader_size_ - 0x04;

    // pad object to next long
    while (objImage.offset & 0b11) {
      objImage.appendByte(0);
    }

    const appLongCount = objImage.offset >> 2;
    // move object upwards to accommodate flash loader
    if (this.isLogging) this.logMessage(`  -- move object up - _loader_size_=(${_loader_size_}) bytes`);
    this.moveObjectUp(objImage, _loader_size_, 0, objImage.offset);
    // install flash loader
    if (this.isLogging) this.logMessage(`  -- load flash loader`);
    // now path the loader
    const loaderSubset: Uint8Array = this.externalFiles.flashLoader.subarray(_loader_offset_, 0x1f0);
    objImage.rawUint8Array.set(loaderSubset, 0);
    // get app longs
    objImage.replaceLong(appLongCount, _appLongs_);
    objImage.replaceLong(appLongCount, _appLongs2_);
    //
    // compute negative sum of all object image
    let checkSum: number = 0;
    for (let offset = 0 + _loader_size_; offset < objImage.offset; offset += 4) {
      checkSum -= objImage.readLong(offset);
    }
    // insert checksum after object
    objImage.replaceLong(checkSum, _appSum_);
    //
    // compute negative sum of flash loader
    checkSum = 0;
    for (let offset = 0; offset < 0x400; offset += 4) {
      checkSum -= objImage.readLong(offset);
    }
    // insert checksum after loader
    objImage.replaceLong(checkSum, _loaderSum_);

    // pad fullimage to 0x100 longs if shorter
    if (objImage.offset < 0x400) {
      for (let offset = objImage.offset; offset < 0x400; offset++) {
        objImage.replaceByte(0, offset);
      }
    }
  }

  public P2InsertFlashLoader() {
    // PNut insert_flash_loader:
    // pad object to next long
    while (this.objImage.offset & 0b11) {
      this.objImage.appendByte(0);
    }
    const _checksum_ = 0x04;
    const _debugnop_ = 0x08;
    const _NOP_INSTRU_ = 0;
    const flashLoaderLength = this.externalFiles.flashLoaderLength;
    // move object upwards to accommodate flash loader
    if (this.isLogging) this.logMessage(`  -- move object up - flashLoaderLength=(${flashLoaderLength}) bytes`);
    this.moveObjectUp(this.objImage, flashLoaderLength, 0, this.objImage.offset);
    // install flash loader
    if (this.isLogging) this.logMessage(`  -- load flash loader`);
    // now path the loader
    this.objImage.rawUint8Array.set(this.externalFiles.flashLoader, 0);
    const isDebugMode: boolean = this.context.compileOptions.enableDebug;
    if (isDebugMode) {
      // debug is on
      const debugInstru = this.objImage.readLong(_debugnop_);
      this.objImage.replaceLong(debugInstru | this.spinResolver.debugPinTransmit, _debugnop_);
    } else {
      // debug is off
      this.objImage.replaceLong(_NOP_INSTRU_, _debugnop_);
    }
    // compute negative sum of all data
    let checkSum: number = 0;
    for (let offset = 0; offset < this.objImage.offset; offset += 4) {
      checkSum -= this.objImage.readLong(offset);
    }
    // insert checksum into loader
    this.objImage.replaceLong(checkSum, _checksum_);
  }

  private checkClockSetterInsert(): boolean {
    // PNut part of insert_clock_setter:
    // Return T/F where T means  _AUTOCLK not defined or _AUTOCLK <> 0
    const symlAutoclk = '_AUTOCLK';
    let foundAutoclkStatus: boolean = true;
    const [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symlAutoclk);
    if (symbolFound) {
      if (isConstInteger) {
        foundAutoclkStatus = value == 0n ? false : true;
      } else {
        // [error_acobd]
        throw new Error('_AUTOCLK can only be defined as an integer constant');
      }
    }
    return foundAutoclkStatus;
  }

  public P2InsertClockSetter() {
    // PNut insert_clock_setter:
    // if _AUTOCLK not defined or _AUTOCLK <> 0 then insert clock setter
    if (this.checkClockSetterInsert()) {
      if (this.spinResolver.clockMode != 0b00) {
        const _ext1_ = 0x0;
        const _ext2_ = 0x004;
        const _ext3_ = 0x008;
        const _rcslow_ = 0x028;
        const _clkmode1_ = 0x034;
        const _clkmode2_ = 0x038;
        const _appblocks_ = 0x03c;
        const _NOP_INSTRU_ = 0;

        const clockSetterLength = this.externalFiles.clockSetterLength;
        // move object upwards to accommodate interpreter
        if (this.isLogging) this.logMessage(`  -- move object up - clockSetterLength=(${clockSetterLength}) bytes`);
        this.moveObjectUp(this.objImage, clockSetterLength, 0, this.objImage.offset);
        // install clock setter
        if (this.isLogging) this.logMessage(`  -- load clock setter`);
        this.objImage.rawUint8Array.set(this.externalFiles.clockSetter, 0);
        // NOP unneeded instructions
        if (this.spinResolver.clockMode == 0b01) {
          this.objImage.replaceLong(_NOP_INSTRU_, _ext1_);
          this.objImage.replaceLong(_NOP_INSTRU_, _ext2_);
          this.objImage.replaceLong(_NOP_INSTRU_, _ext3_);
        } else {
          // here is @@notrcslow:
          this.objImage.replaceLong(_NOP_INSTRU_, _rcslow_);
        }
        // install _clkmode1_
        this.objImage.replaceLong(this.spinResolver.clockMode & 0xfffffffc, _clkmode1_);
        // install _clkmode2_
        this.objImage.replaceLong(this.spinResolver.clockMode, _clkmode2_);
        // install _appblocks_
        const numberOfBlocks = (this.objImage.offset >> (9 + 2)) + 1;
        this.objImage.replaceLong(numberOfBlocks, _appblocks_);
      }
    }
  }

  public LoadHardware() {
    // FIXME: UNDONE  we need code here LoadHardware() when we awaken USB support
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }

  private logMessageOutline(message: string): void {
    if (this.isLoggingOutline) {
      this.context.logger.logMessage(message);
    }
  }
}
