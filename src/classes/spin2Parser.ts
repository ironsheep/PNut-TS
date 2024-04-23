/* eslint-disable @typescript-eslint/no-unused-vars */

'use strict';

import fs from 'fs';
import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
import { SpinElementizer } from './spinElementizer';
import { SpinElement } from './spinElement';
import { RegressionReporter } from './regression';
import { SpinSymbolTables } from './parseUtils';
import { SpinResolver } from './spinResolver';
import { ID_SEPARATOR_STRING, SymbolEntry, SymbolTable } from './symbolTable';
import { float32ToHexString } from '../utils/float32';
import { eElementType } from './types';
import { getSourceSymbol } from '../utils/fileUtils';
import { ObjectImage } from './objectImage';
import { ExternalFiles } from './externalFiles';

// src/classes/spin2Parser.ts

export class Spin2Parser {
  private context: Context;
  private isLogging: boolean = false;
  private srcFile: SpinDocument | undefined;
  private elementizer: SpinElementizer;
  private spinSymbolTables: SpinSymbolTables;
  private spinElements: SpinElement[] = [];
  private spinResolver: SpinResolver;
  private externalFiles: ExternalFiles;
  private objImage: ObjectImage;
  private readonly HubLimit: number = 0x80000;

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = this.context.logOptions.logParser;
    this.elementizer = new SpinElementizer(this.context);
    this.spinSymbolTables = new SpinSymbolTables(this.context);
    this.spinResolver = new SpinResolver(this.context);
    this.externalFiles = new ExternalFiles(this.context);
    this.objImage = this.context.compileData.objImage;
    this.logMessage(`* Parser is logging`);
  }

  get sourceLineNumber(): number {
    return this.elementizer.sourceLineNumber;
  }

  public setSourceFile(spinCode: SpinDocument) {
    this.srcFile = spinCode;
    this.logMessage(`* Parser.setSourceFile([${this.srcFile.fileName}])`);
    this.P2Elementize();
  }

  public P2Elementize() {
    this.logMessage(`* P2Elementize() - ENTRY file=[${this.srcFile?.fileName}]`);
    //logContextState(this.context, 'Spin2Parser');
    // store the value(s) in list
    // publish for next steps to use
    if (this.srcFile) {
      this.elementizer.setSourceFile(this.srcFile);
    }
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
            case eElementType.type_register:
              symbolType = 'REG';
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
            case eElementType.type_var_byte:
              symbolType = 'VAR_BYTE';
              break;
            case eElementType.type_var_word:
              symbolType = 'VAR_WORD';
              break;
            case eElementType.type_var_long:
              symbolType = 'VAR_LONG';
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
            case eElementType.type_objpub:
              symbolType = 'OBJPUB';
              break;
            case eElementType.type_objcon:
              symbolType = 'OBJCON';
              break;
            case eElementType.type_objcon_float:
              symbolType = 'OBJCON_FLOAT';
              break;
            case eElementType.type_method:
              symbolType = 'METHOD';
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

      const isPasmMode: boolean = this.spinResolver.isPasmMode;
      const saveObjImageOffset: number = this.objImage.offset;

      const objectOffset: number = isPasmMode ? 0 : 8;

      if (this.context.compileOptions.writeObj) {
        this.writeObjectFile(this.objImage, 0, this.objImage.length, outFilename); // full
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
      const objString: string = this.rightAlignedDecimalValue(objectLength, 11);
      const varBytes: number = this.spinResolver.varBytes;
      const varString: string = this.rightAlignedDecimalValue(varBytes, 11);
      if (isPasmMode) {
        stream.write(`\n\nHub bytes: ${objString}\n\n`);
      } else {
        stream.write(`\n\nOBJ bytes: ${objString}\n`);
        stream.write(`VAR bytes: ${varString}\n\n`);
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

  private writeObjectFile(objImage: ObjectImage, offset: number, byteCount: number, lstFilename: string) {
    const objFilename = lstFilename.replace('.lst', '.obj');
    this.logMessage(`  -- writing OBJ file (${byteCount} bytes from offset ${offset}) to ${objFilename}`);
    const stream = fs.createWriteStream(objFilename);
    if (offset == 8) {
      const firstLong: number = objImage.readLong(0);
      const secondLong: number = objImage.readLong(4);
      this.logMessage(`* longs BEFORE OBJ write first(${this.hexLong(firstLong)}), second=(${this.hexLong(secondLong)})`);
    }
    // copy our full buffer becuse it will be over written before the file write completes!
    const buffer = new Uint8Array(byteCount);
    buffer.set(objImage.rawUint8Array.subarray(offset, offset + byteCount));
    //const buffer = Buffer.from(objImage.rawUint8Array.buffer, offset, byteCount);
    if (offset == 8) {
      const firstLong: number = objImage.readLong(0);
      const secondLong: number = objImage.readLong(4);
      this.logMessage(`* longs AFTER OBJ write first(${this.hexLong(firstLong)}), second=(${this.hexLong(secondLong)})`);
    }
    stream.write(buffer);

    // Close the stream
    stream.end();
  }
  private hexLong(uint32: number): string {
    return `$${uint32.toString(16).toUpperCase().padStart(8, '0')}`;
  }

  public ComposeRam(programFlash: boolean, ramDownload: boolean) {
    // here is pascal ComposeRAM()
    const isPasmMode: boolean = this.spinResolver.isPasmMode;
    const isDebugMode: boolean = this.context.compileOptions.enableDebug;
    if (isPasmMode == false) {
      const firstLong: number = this.objImage.readLong(0);
      const secondLong: number = this.objImage.readLong(4);
      this.logMessage(`* ComposeRam() first(${this.hexLong(firstLong)}), second=(${this.hexLong(secondLong)})`);
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
      // [error_]
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
    // insert flash loader?
    if (programFlash) {
      const codeAndLoaderSize: number = objSize + this.externalFiles.flashLoaderLength;
      if (codeAndLoaderSize > this.HubLimit) {
        // [error_]
        throw new Error(`Need to reduce program by ${codeAndLoaderSize - this.HubLimit} bytes, in order to fit flash loader into hub RAM download`);
      }
      this.P2InsertFlashLoader();
    }
    // save binary file?
    if (this.context.compileOptions.writeBin) {
      //const objImage: ObjectImage = this.context.compileData.objImage;
      this.writeBinaryFile(this.objImage, 0, this.objImage.length); // full
    }
    if (ramDownload) {
      this.LoadHardware();
    }
  }

  private writeBinaryFile(objImage: ObjectImage, offset: number, byteCount: number) {
    const lstFilename = this.context.compileOptions.listFilename;
    const objFilename = lstFilename.replace('.lst', '.bin');
    this.logMessage(`  -- writing BIN file (${byteCount} bytes from offset ${offset}) to ${objFilename}`);
    const stream = fs.createWriteStream(objFilename);

    const buffer = Buffer.from(objImage.rawUint8Array.buffer, offset, byteCount);
    stream.write(buffer);

    // Close the stream
    stream.end();
  }

  public P2InsertInterpreter() {
    // PNut insert_interpreter:
    this.logMessage(`* P2InsertInterpreter()`);
    const firstLong: number = this.objImage.readLong(0);
    const secondLong: number = this.objImage.readLong(4);
    this.logMessage(`* P2InsertInterpreter() first(${this.hexLong(firstLong)}), second=(${this.hexLong(secondLong)})`);

    const pbase_init = 0x30;
    const vbase_init = 0x34;
    const dbase_init = 0x38;
    const var_longs = 0x3c;
    const clkmode_hub = 0x40;
    const clkfreq_hub = 0x44;
    const _debugnop1_ = 0xe54;
    const _debugnop2_ = 0xe58;
    const _debugnop3_ = 0xe5c;

    //const objImage: ObjectImage = this.context.compileData.objImage;
    //objImage.setOffsetTo(this.spinResolver.executableSize + 8); // move this...

    // determine initial pub index
    this.logMessage(`  -- scan pubs`);
    this.objImage.setLogging(true);
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
    this.objImage.setLogging(false);
    this.logMessage(`  -- have pibIndex=(${pubIndex})`);
    // here is @@gotpub
    const interpreterLength = this.externalFiles.spinInterpreterLength;
    // move object upwards to accommodate interpreter
    this.logMessage(`  -- move object up - interpreterLength=(${interpreterLength}) bytes`);
    this.moveObjectUp(this.objImage, interpreterLength, 8, this.spinResolver.executableSize);
    // install interpreter
    this.logMessage(`  -- load interpreter`);
    this.objImage.rawUint8Array.set(this.externalFiles.spinInterpreter, 0);
    this.logMessage(`  -- set new sizes`);
    // set pbase_init
    let computedSize: number = interpreterLength;
    this.objImage.replaceLong(computedSize, pbase_init);
    // set vbase_init
    const firstPubIndex: number = pubIndex << 20;
    computedSize += this.spinResolver.executableSize;
    this.objImage.replaceLong(firstPubIndex | computedSize, vbase_init); // index of first pub in vbase_init[31:20]
    // set dbase_init
    computedSize += this.spinResolver.variableSize;
    this.objImage.replaceLong(computedSize, dbase_init);
    // add stackSize
    computedSize += 0x400; // ensure dbase has $100 longs of stack headroom
    const isDebugMode: boolean = this.context.compileOptions.enableDebug;
    if (isDebugMode) {
      computedSize += 0x4000; // account for debugger
    }
    if (computedSize > ObjectImage.MAX_SIZE_IN_BYTES) {
      // [error_pex]
      throw new Error('Program exceeds 1024KB');
    }
    this.logMessage(`  -- patch interpreter`);
    // set var_longs
    const newVarLongs: number = ((this.spinResolver.variableSize + 0x400) >> 2) - 1;
    this.objImage.replaceLong(newVarLongs, var_longs);
    // set clkmode_hub
    this.objImage.replaceLong(this.spinResolver.clockMode, clkmode_hub);
    // set clkfreq_hub
    this.objImage.replaceLong(this.spinResolver.clockFrequency, clkfreq_hub);
    if (isDebugMode == false) {
      // if not debug mode, force NOP instructions
      this.objImage.replaceLong(0, _debugnop1_);
      this.objImage.replaceLong(0, _debugnop2_);
      this.objImage.replaceLong(0, _debugnop3_);
    } else {
      // debug mode, install debug_pin_rx into instructions
      const debugPinRx = this.spinResolver.debugPinReceive;
      let newLongValue = this.objImage.readLong(_debugnop1_);
      newLongValue |= debugPinRx << 9;
      this.objImage.replaceLong(newLongValue, _debugnop1_);
      newLongValue = this.objImage.readLong(_debugnop2_);
      newLongValue |= debugPinRx;
      this.objImage.replaceLong(newLongValue, _debugnop2_);
      newLongValue = this.objImage.readLong(_debugnop3_);
      newLongValue |= debugPinRx << 9;
      this.objImage.replaceLong(newLongValue, _debugnop3_);
    }
    // mark the new end of this image
    this.objImage.setOffsetTo(interpreterLength + this.spinResolver.executableSize); // address of byte after our image
  }

  private moveObjectUp(objImage: ObjectImage, destOffset: number, sourceOffset: number, nbrBytes: number) {
    const currOffset = objImage.offset;
    this.logMessage(`* moveObjUp() from=(${sourceOffset}), to=(${destOffset}), length=(${nbrBytes})`);
    if (currOffset + nbrBytes > ObjectImage.MAX_SIZE_IN_BYTES) {
      // [error_pex]
      throw new Error('Program exceeds 1024KB');
    }
    for (let index = 0; index < nbrBytes; index++) {
      const invertedIndex = nbrBytes - index - 1;
      objImage.replaceByte(objImage.read(sourceOffset + invertedIndex), destOffset + invertedIndex);
    }
    this.logMessage(`* moveObjUp()offset (${currOffset}) -> (${currOffset + destOffset}) `);
    objImage.setOffsetTo(currOffset + destOffset);
  }

  public P2InsertDebugger() {
    // XYZZY we need code here P2InsertDebugger()
  }

  public P2InsertFlashLoader() {
    // PNut insert_flash_loader:
    // pad object to next long
    while (this.objImage.offset & 0b11) {
      this.objImage.append(0);
    }
    const _checksum_ = 0x04;
    const _debugnop_ = 0x08;
    const _NOP_INSTRU_ = 0;
    const flashLoaderLength = this.externalFiles.flashLoaderLength;
    // move object upwards to accommodate flash loader
    this.logMessage(`  -- move object up - flashLoaderLength=(${flashLoaderLength}) bytes`);
    this.moveObjectUp(this.objImage, flashLoaderLength, 0, this.objImage.offset);
    // install flash loader
    this.logMessage(`  -- load flash loader`);
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

  public P2InsertClockSetter() {
    // PNut insert_clock_setter:
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
      this.logMessage(`  -- move object up - clockSetterLength=(${clockSetterLength}) bytes`);
      this.moveObjectUp(this.objImage, clockSetterLength, 0, this.objImage.offset);
      // install clock setter
      this.logMessage(`  -- load clock setter`);
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

  public LoadHardware() {
    // XYZZY we need code here LoadHardware()
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
