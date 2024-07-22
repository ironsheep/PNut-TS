/* eslint-disable no-fallthrough */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/** @format */
'use strict';

// src/classes/spinResolver.ts

// spin compile resolver
import { Context } from '../utils/context';
import { SpinElement } from './spinElement';
import { NumberStack } from './numberStack';
import { eBlockType, eByteCode, eElementType, eFlexcode, eOperationType, eValueType } from './types';
import { bigIntFloat32ToNumber, float32ToHexString, hexString, numberToBigIntFloat32 } from '../utils/float32';
import { SpinSymbolTables, eOpcode, eAsmcode } from './parseUtils';
import { SymbolEntry, SymbolTable, iSymbol } from './symbolTable';
import { ObjectImage } from './objectImage';
import { getSourceSymbol } from '../utils/fileUtils';
import { BlockStack } from './blockStack';
import { ObjFile, SpinFiles } from './spinFiles';
import { ChildObjectsImage, iFileDetails } from './childObjectsImage';
import { ObjectSymbols } from './objectSymbols';
import { DistillerList, DistillerRecord } from './distillerList';
import { DebugData, DebugRecord } from './debugData';
import { SpinDocument } from './spinDocument';
import { hexByte, hexLong, hexWord } from '../utils/formatUtils';
import { skip } from 'node:test';

// Internal types used for passing complex values
interface iValueReturn {
  value: bigint;
  isResolved: boolean;
  isFloat: boolean;
}

interface iVariableReturn {
  isVariable: boolean;
  type: eElementType;
  address: number;
  nextElementIndex: number;
  wordSize: eWordSize;
  sizeOverrideFlag: boolean;
  indexFlag: boolean;
  bitfieldFlag: boolean;
  bitfieldConstantFlag: boolean;
  operation: eVariableOperation;
  assignmentBytecode: eByteCode; // used iff VO_ASSIGN
}

enum eCaseFast { // enum for bc_casefast() and blockCasefast() methods
  CF_FinalAddr,
  CF_TablePtr,
  CF_SourcePtr,
  CF_MinValue,
  CF_MaxValue,
  CF_TableAddr
}

enum eRepeat { // enum for cb_repeat() and blockRepeat*() methods
  RP_NextAddress,
  RP_QuitAddress,
  RP_LoopAddress
}

enum eOptimizerMethod {
  OM_Look,
  OM_If,
  OM_IfNot,
  OM_Case,
  OM_CaseFast,
  OM_Repeat,
  OM_RepeatPreWhileUntil,
  OM_RepeatCount,
  OM_RepeatCountVar,
  OM_RepeatVar
}

enum eResultRequirements {
  RR_None,
  RR_One,
  RR_OneOrMore
}

enum eCompOp {
  CO_Clear,
  CO_Set
}

enum eVariableOperation {
  VO_READ,
  VO_WRITE,
  VO_ASSIGN,
  VO_Unknown
}

interface iConstantReturn {
  value: bigint;
  foundConstant: boolean;
}

enum eMathMode {
  MM_Unknown,
  MM_FloatMode,
  MM_IntMode
}

enum eResolve {
  BR_Must,
  BR_Try
}

enum eMode {
  BM_IntOrFloat,
  BM_IntOnly,
  BM_OperandIntOrFloat,
  BM_OperandIntOnly,
  BM_Spin2
}

enum eWordSize {
  WS_Byte = 0,
  WS_Word = 1,
  WS_Long = 2,
  WS_Long_Res = 3
}

enum eSymbolTableId {
  STI_MAIN,
  STI_LOCAL,
  STI_INLINE
}

enum eAugType {
  AT_D,
  AT_S
}

// Distiller data
//
// 3+ long records:
//
// 0:   object id
// 1:   object offset
// 2:   sub-object count
// 3:   method count
// 4:   object size
// 5+:  sub-object id's (if any)
interface ObjectRecord {
  objectId: number;
  objectOffset: number;
  subObjectCount: number;
  methodCount: number;
  objectSize: number;
  subObjectIds: number[];
}

export class SpinResolver {
  private context: Context;
  private isLogging: boolean = false;
  // data from our elemtizer and navigation variables
  private spinElements: SpinElement[] = [];
  private nextElementIndex: number = 0;
  private currElement: SpinElement = new SpinElement(0, eElementType.type_undefined, '', 0, 0); // dummy element
  // parser state
  private mathMode: eMathMode = eMathMode.MM_Unknown;

  // CON processing support data
  private numberStack: NumberStack;
  private spinSymbolTables: SpinSymbolTables;
  private lowestPrecedence: number;
  private ternaryPrecedence: number;

  // these first two may go away
  private autoSymbols: SymbolTable = new SymbolTable(); // neverechanging symbols
  private levelSymbols: SymbolTable = new SymbolTable(); // based on language level

  private mainSymbols: SymbolTable = new SymbolTable(); // var, dat, pub, pri, con, obj
  //private parameterSymbols: SymbolTable = new SymbolTable(); // constants from parent object
  private localSymbols: SymbolTable = new SymbolTable(); // parameters, return variables and locals for PUB/PRI scope
  private listingLocalSymbols: SymbolTable = new SymbolTable(); // PRESERVED parameters, return variables and locals for PUB/PRI scope
  private inlineSymbols: SymbolTable = new SymbolTable(); // for inline code sections
  private activeSymbolTable: eSymbolTableId = eSymbolTableId.STI_MAIN;

  // DAT processing support data
  private objImage: ObjectImage;
  private asmLocal: number = 0;
  private hubOrg: number = 0x00000;
  private hubOrgLimit: number = 0x100000;
  private hubMode: boolean = false; // was orgh!
  private orghOffset: number = 0;
  private cogOrg: number = 0 << 2; // byte-address
  private cogOrgLimit: number = 0x1f8 << 2; // byte-address limit
  private pasmMode: boolean = false;
  private fitToSize: boolean = false;
  private wordSize: eWordSize = eWordSize.WS_Byte; // 0=byte, 1=word, 2=long
  private weHaveASymbol: boolean = false;
  private symbolName: string = '';
  private pasmResolveMode: eResolve = eResolve.BR_Try;
  private instructionImage: number = 0;
  private locOrghSymbolFlag: boolean = false; // set by getConstant()
  private clkMode: number = 0;
  private clkFreq: number = 0;
  private xinFreq: number = 0;
  private inlineModeForGetConstant: boolean = false;

  // registers / constants
  private readonly inlineLimit: number = 0x120; // address
  private readonly mrecvReg: number = 0x1d2; // address
  private readonly msendReg: number = 0x1d3; // address
  private readonly pasmRegs: number = 0x1d8; // address
  private readonly inlineLocalsStart: number = 0x1e0; // address
  private readonly clkfreqAddress: number = 0x44; // address
  private readonly results_limit: number = 15; // max return value LONGs
  private readonly params_limit: number = 127; // max parameter value LONGs
  private readonly if_limit: number = 256; // max if-chain length
  private readonly case_limit: number = 256; // max cases
  private readonly case_fast_limit: number = 256; // max cases
  private readonly subs_limit: number = 1024; // max PUB/PRI count
  private readonly objs_limit: number = 1024; // max object count
  private readonly distiller_limit: number = 0x4000; // max distiller limit
  private readonly locals_limit: number = 0x10000 + this.params_limit * 4 + this.results_limit * 4;
  private readonly obj_limit = 0x100000;
  // VAR processing support data
  private varPtr: number = 4;

  // Spin2 processing support data
  private blockStack: BlockStack;
  private subResults: number = 0;
  private lineColumn: number = 1; // PNut [column] [1,n]
  private scopeColumn: number = 1; // PNut x86 'ebp' register

  // DATA and OBJ file support
  private spinFiles: SpinFiles;
  private datFileData: ChildObjectsImage; // pascal P2.DatData
  private objectData: ChildObjectsImage; // pascal P2.ObjData
  private objectInstanceInMemoryCount: number = 0; // PNut [obj_count]
  private overrideSymbolTable: SymbolTable | undefined;
  private pubConList: ObjectSymbols;
  private sizeObj: number = 0; // PNut size_obj
  private sizeVar: number = 0; // PNut size_var
  private sizeFlashLoader: number = 0; // PNut size_flash_loader
  private sizeInterpreter: number = 0; // PNut size_interpreter
  private replacedName: string = ''; // side effect set by getElement when replacing name with value for type undefined
  // distiller support
  private distilledBytes: number = 0; // PNut distilled_bytes end result of distill process
  private distillPtr: number = 0; // PNut dis_ptr  FIXME: remove this after implement use of distillerList
  private distiller: number[] = []; // PNut dis  FIXME: remove this after implement use of distillerList
  private distillerList: DistillerList;

  // Debug()  support
  // debug mode support
  private debugPinRx: number = 63; // default maybe overridden by code
  private debugPinTx: number = 62; //
  private debugBaud: number = 2000000;
  private downloadBaud: number = 2000000;
  // host side debug values
  private debug_left: number = 0;
  private debug_top: number = 0;
  private debug_width: number = 0;
  private debug_height: number = 0;
  private debug_display_left: number = 0;
  private debug_display_top: number = 0;
  private debug_log_size: number = 0;
  private debug_windows_off: boolean = false;

  private debug_record: DebugRecord; // a single debug record (fill in, then commit it)
  private debug_data: DebugData; // the collection of committed debug records
  private debug_compressed_data: Uint8Array | undefined = undefined; // a zero's removed version of the debug data
  private debug_first: boolean = false;
  private debug_stack_depth: number = 0; // our overall debug stack depth
  private srcFile: SpinDocument | undefined; // reference to the file we are compiling (element list refers to this file)

  constructor(ctx: Context) {
    this.context = ctx;
    this.debug_record = new DebugRecord(this.context);
    this.debug_data = new DebugData(this.context);
    this.isLogging = this.context.logOptions.logResolver;
    // get references to the single global data
    this.objImage = ctx.compileData.objImage;
    this.datFileData = ctx.compileData.datFileData;
    this.objectData = ctx.compileData.objectData;
    this.spinFiles = ctx.compileData.spinFiles;
    this.spinFiles.enableLogging(this.isLogging);
    // allocate our local data
    this.numberStack = new NumberStack(ctx);
    this.blockStack = new BlockStack(ctx);
    this.spinSymbolTables = new SpinSymbolTables(ctx);
    this.lowestPrecedence = this.spinSymbolTables.lowestPrecedence;
    this.ternaryPrecedence = this.spinSymbolTables.ternaryPrecedence;
    this.numberStack.enableLogging(this.isLogging);
    this.blockStack.enableLogging(this.isLogging);
    this.pubConList = new ObjectSymbols(ctx, 'PUBCONList');
    this.distillerList = new DistillerList(ctx);
    this.distillerList.enableLogging(this.isLogging);
    this.spinSymbolTables.enableLogging(this.isLogging);
  }

  public setElements(updatedElementList: SpinElement[]) {
    this.spinElements = updatedElementList;
    // adopt source file from element list
  }

  public setSourceFile(spinCode: SpinDocument) {
    this.srcFile = spinCode;
    this.logMessage(`* Resolver.setSourceFile([${spinCode.fileName}])`);
  }

  public getSymbol(symbolName: string): iSymbol | undefined {
    return this.mainSymbols.get(symbolName);
  }

  // for lister  vvv
  get userSymbolTable(): SymbolEntry[] {
    const allMain: SymbolEntry[] = this.mainSymbols.allSymbols;
    const allLocal: SymbolEntry[] = this.listingLocalSymbols.allSymbols;
    const allInline: SymbolEntry[] = this.inlineSymbols.allSymbols;
    const allSymbols: SymbolEntry[] = [...allMain, ...allLocal, ...allInline];
    allSymbols.sort((a, b) => a.instanceNumber - b.instanceNumber);
    return allSymbols;
  }

  get sourceLineNumber(): number {
    return this.currElement.sourceLineNumber;
  }

  get objectImage(): ObjectImage {
    return this.objImage;
  }

  get debugData(): Uint8Array {
    return this.debug_compressed_data !== undefined ? this.debug_compressed_data : new Uint8Array();
  }

  get debugRawData(): DebugData {
    return this.debug_data;
  }

  get removedBytes(): number {
    return this.distilledBytes;
  }

  get executableSize(): number {
    return this.sizeObj;
  }

  get variableSize(): number {
    return this.sizeVar;
  }

  get clockMode(): number {
    return this.clkMode;
  }

  get clockFrequency(): number {
    return this.clkFreq;
  }

  get xinFrequency(): number {
    return this.xinFreq;
  }

  get debugPinReceive(): number {
    return this.debugPinRx;
  }

  get debugBaudRate(): number {
    return this.debugBaud;
  }

  get debugPinTransmit(): number {
    return this.debugPinTx;
  }

  get varBytes(): number {
    return this.varPtr;
  }

  get isPasmMode(): boolean {
    return this.pasmMode;
  }

  // for lister  ^^^

  public compile1(overrideSymbolTable: SymbolTable | undefined) {
    // reset symbol tables
    /*
      call  enter_symbols_level ;enter level symbols after determining spin2 level
      call  enter_symbols_param ;enter parameter symbols
      mov [pubcon_list_size],0  ;reset pub/con list
      mov [list_length],0   ;reset list length
      mov [doc_length],0    ;reset doc length
      mov [doc_mode],0    ;reset doc mode
      mov [info_count],0    ;reset info count
    */
    this.overrideSymbolTable = overrideSymbolTable;
    if (overrideSymbolTable === undefined) {
      this.logMessage(`* No CON Overrides provided`);
    } else {
      this.logMessage(`* Using ${this.overrideSymbolTable?.length} CON Overrides`);
    }
    this.mainSymbols.reset();
    this.localSymbols.reset();
    this.inlineSymbols.reset();
    this.listingLocalSymbols.reset();
    this.activeSymbolTable = eSymbolTableId.STI_MAIN;
    this.pubConList.reset();
    this.asmLocal = 0;
    this.objImage.reset();
    this.distillPtr = 0;
    this.distiller = [];
    this.pasmMode = this.determinePasmMode();
    this.spinFiles.setPasmMode(this.pasmMode); // publish to top level
    this.compile_con_blocks_1st();
    if (this.context.passOptions.afterConBlock == false) {
      this.compile_obj_blocks_id();
      this.compile_sub_blocks_id();
      this.compile_dat_blocks_fn();
    }
  }

  public compile2(isTopLevel: boolean) {
    //this.isLogging = true;
    this.logMessage(`*==* compile2(isTopLevel=(${isTopLevel}))`);
    this.logMessage(
      `  -- OPTS elem(${this.context.logOptions.logElementizer}), parse(${this.context.logOptions.logParser}), comp(${this.context.logOptions.logCompile}), resolv(${this.context.logOptions.logResolver}), preproc(${this.context.logOptions.logPreprocessor})`
    );
    this.compile_obj_symbols();
    this.determine_clock();
    this.compile_con_blocks_2nd();
    this.determine_bauds_pins();
    if (this.context.passOptions.afterConBlock == false) {
      this.logMessage('* COMPILE_dat_blocks()');
      if (this.pasmMode == false) {
        this.compile_var_blocks();
      }
      this.compile_dat_blocks();
      this.compile_sub_blocks();
      this.compile_obj_blocks();
      this.distill_obj_blocks();
      //this.point_to_con();  // XYZZY do we need this?
      this.collapse_debug_data(isTopLevel);
      this.compile_final();
      //this.compile_done();  // XYZZY do we need this?
    }
  }

  public testResolveExp(mode: eMode, resolve: eResolve, precedence: number) {
    // expose this interface for testing
    this.resolveExp(mode, resolve, precedence);
  }
  //
  //  Operation Solver
  //
  public regressionTestResolver(parmA: number, parmB: number, operation: eOperationType, isFloatInConBlock: boolean): number {
    // forward to whaterever the name becomes...
    const endingValue: number = Number(this.resolveOperation(BigInt(parmA), BigInt(parmB), operation, isFloatInConBlock));
    this.logMessage(`regressionTestResolver(${parmA}, ${parmB}, ${operation}, ${isFloatInConBlock}) => (${endingValue})`);
    return endingValue;
  }

  private compile_con_blocks_1st() {
    // true here means very-first pass!
    const FIRST_PASS: boolean = true;
    this.logMessage('*==* COMPILE_con_blocks_1st() 1of2');
    this.compile_con_blocks(eResolve.BR_Try, FIRST_PASS);
    this.logMessage('*==* COMPILE_con_blocks_1st() 2of2');
    this.compile_con_blocks(eResolve.BR_Try);
  }

  private compile_con_blocks_2nd() {
    this.logMessage('*==* COMPILE_con_blocks_2nd() 1of2');
    this.compile_con_blocks(eResolve.BR_Try);
    this.logMessage('*==* COMPILE_con_blocks_2nd() 2of2');
    this.compile_con_blocks(eResolve.BR_Must);
  }

  private determinePasmMode(): boolean {
    // determine_mode:
    let pasmModeStatus: boolean = true;
    let element: SpinElement;
    this.restoreElementLocation(0); // start from first in list
    const savedLogState: boolean = this.isLogging;
    this.isLogging = false;
    do {
      element = this.getElement();

      if (element.type == eElementType.type_block) {
        if (Number(element.value) == eBlockType.block_con) {
          continue;
        } else if (Number(element.value) == eBlockType.block_dat) {
          pasmModeStatus = true;
        } else {
          pasmModeStatus = false;
          break; // outta here with answer
        }
      }
    } while (element.type != eElementType.type_end_file);
    this.isLogging = savedLogState;
    this.logMessage(`* determinePasmMode() => (${pasmModeStatus})`);
    return pasmModeStatus;
  }

  private compile_var_blocks() {
    // Compile var blocks
    this.logMessage('*==* COMPILE_var_blocks()');
    this.varPtr = 4; // leave room for the long pointer to object
    this.restoreElementLocation(0); // start from first in list

    // for each VAR block...
    while (this.nextBlock(eBlockType.block_var)) {
      // BLOCK loop
      do {
        // LINE loop
        this.getElement();
        if (this.currElement.type == eElementType.type_end_file) {
          break;
        }

        // is this ALIGNW or ALIGNL?
        const [foundAlign, alignMask] = this.checkAlign(); // alignw, alignl?
        if (foundAlign) {
          this.alignVar(alignMask);
          this.getEndOfLine();
          continue; // align[wl] is only text on line
        }

        // is this a size (BYTE, WORD, LONG)?
        let wordSize: number = eWordSize.WS_Long; // NOTE: this matches our enum values
        if (this.currElement.type == eElementType.type_size) {
          wordSize = Number(this.currElement.value); // NOTE: this matches our enum values
          this.getElement();
        }

        // ok, had to have one of these three!
        if (this.currElement.isTypeUndefined) {
          this.backElement();
        } else {
          // our symbol/element was NOT undefined!
          // [error_eauvnsa]
          throw new Error('Expected a unique variable name, BYTE, WORD, LONG, ALIGNW, or ALIGNL (m0E0)');
        }

        do {
          this.currElement = this.getElement();
          if (this.currElement.isTypeUndefined == false) {
            // [error_eauvn]
            throw new Error('Expected a unique variable name');
          }
          const symbolName: string = this.currElement.stringValue;
          let count: number = 1; // we default to count of one being allocated
          if (this.checkLeftBracket()) {
            // we have [count]. Get the value, replacing our 1
            let countResult = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
            if (countResult.value > BigInt(this.hubOrgLimit)) {
              // [error_tmvsid]
              throw new Error('Too much variable space is declared A');
            }
            count = Number(countResult.value);
            this.getRightBracket();
          }
          // now record [count|1] instances with symbol name at start
          const newVarSymbol: iSymbol = { name: symbolName, type: eElementType.type_var_byte + wordSize, value: BigInt(this.varPtr) };
          this.varPtr += count << wordSize;
          if (this.varPtr > this.hubOrgLimit) {
            // [error_tmvsid]
            throw new Error('Too much variable space is declared B');
          }
          this.recordSymbol(newVarSymbol);
        } while (this.getCommaOrEndOfLine());

        // not end of this block, yet...
      } while (this.nextElementType() != eElementType.type_block);
    }
    this.alignVar(0b11); // align to next long for start of next instance
  }

  private checkAlign(): [boolean, number] {
    // do we have an ALIGNW or ALIGNL
    let foundAlignStatus: boolean = false;
    let alignMask: number = 0;
    if (this.currElement.type == eElementType.type_asm_dir) {
      const pasmDirective: number = Number(this.currElement.value);
      if (pasmDirective == eValueType.dir_alignw) {
        alignMask = 0b01;
        foundAlignStatus = true;
      } else if (pasmDirective == eValueType.dir_alignl) {
        alignMask = 0b11;
        foundAlignStatus = true;
      }
    }
    return [foundAlignStatus, alignMask];
  }

  private alignVar(alignMask: number) {
    // now force our alignment
    while (this.varPtr & alignMask) {
      this.varPtr++;
    }
    if (this.varPtr > this.hubOrgLimit) {
      // [error_tmvsid]
      throw new Error('Too much variable space is declared C');
    }
  }

  private compile_dat_blocks_fn() {
    // PNut compile_dat_blocks_fn:
    this.logMessage('*==* COMPILE_dat_blocks_fn()');

    this.spinFiles.clearDataFiles();
    this.restoreElementLocation(0); // start at first element
    // for all dat block locate FILE statements and record the filename we find and the index
    while (this.nextBlock(eBlockType.block_dat)) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.getElement();
        if (this.currElement.isEndOfFile) {
          break;
        }
        if (this.currElement.type == eElementType.type_block) {
          this.backElement();
          break;
        }
        if (this.currElement.type == eElementType.type_file) {
          const fileElementIndex = this.saveElementLocation();
          const fileName = this.getFilename();
          this.logMessage(`* cdb_fn() have type_file filename=(${fileName})`);
          if (this.spinFiles.dataFileExists(fileName) == false) {
            // have new file, register it
            const fileExists = this.spinFiles.addDataFile(fileName, fileElementIndex);
            if (fileExists == false) {
              // [error_INTERNAL]
              this.restoreElementLocation(fileElementIndex);
              throw new Error(`DAT file not found [${fileName}] (preload)`);
            }
          }
        }
      }
    }
  }

  private getFilename(): string {
    let filename: string = '';
    //const savedLogState: boolean = this.isLogging;
    this.logMessage(`* getFilename() - ENTRY`);
    do {
      //this.isLogging = false;
      this.getElement();
      //this.isLogging = savedLogState; // so exceptions have logging in good state...
      if (this.currElement.type != eElementType.type_con) {
        // [error_ifufiq]
        throw new Error('Invalid filename, use "FilenameInQuotes"');
      }
      if (this.badFilenameCharacter(Number(this.currElement.bigintValue))) {
        // [error_ifc]
        throw new Error('Invalid filename character');
      }
      filename += String.fromCharCode(Number(this.currElement.bigintValue));
      if (filename.length > 253) {
        // [error_ftl]
        throw new Error('Filename too long');
      }
      //this.isLogging = false; // disable again for checkComma()
    } while (this.checkComma());
    //this.isLogging = savedLogState;
    this.logMessage(`* getFilename() - EXIT`);
    return filename;
  }

  private badFilenameCharacter(currCharacter: number): boolean {
    let badCharStatus: boolean = true;
    if (currCharacter >= 0x20 && currCharacter <= 0x7e) {
      const badCharacters = '/:*?"<>|';
      badCharStatus = badCharacters.includes(String.fromCharCode(currCharacter));
    }
    return badCharStatus;
  }

  private determine_clock() {
    // PNut determine_clock:
    // Determine clock mode and frequency
    const clockSymbols = new Map([
      ['CLKMODE_', 0x80], // shouldn't exist
      ['CLKFREQ_', 0x40], // shouldn't exist
      ['_ERRFREQ', 0x20],
      ['_CLKFREQ', 0x10],
      ['_XTLFREQ', 0x08],
      ['_XINFREQ', 0x04],
      ['_RCFAST', 0x02],
      ['_RCSLOW', 0x01]
    ]);

    let symbolsFoundBits: number = 0;
    let _errFreq: number = 1000000; // didn't find _ERRFREQ
    let _clkFreq: number = 0;
    let _xtlFreq: number = 0;
    let _xinFreq: number = 0;
    for (let [symbolName, symbolMaskBit] of clockSymbols) {
      const symbolValue: iSymbol | undefined = this.mainSymbols.get(symbolName);
      if (symbolValue !== undefined) {
        if (symbolValue.type == eElementType.type_con) {
          symbolsFoundBits |= symbolMaskBit;
          switch (symbolMaskBit) {
            case 0x20:
              _errFreq = Number(symbolValue.value);
              break;
            case 0x10:
              _clkFreq = Number(symbolValue.value);
              break;
            case 0x08:
              _xtlFreq = Number(symbolValue.value);
              break;
            case 0x04:
              _xinFreq = Number(symbolValue.value);
              break;
          }
        } else {
          // [error_cfcobd]
          throw new Error('_CLKFREQ, _XTLFREQ, _XINFREQ, _ERRFREQ, _RCFAST, _RCSLOW can only be defined as integer constants');
        }
      }
    }

    this.logMessage(`* determine_clock() _clkfreq=(${_clkFreq})`);

    // make sure neither CLKMODE_ nor CLKFREQ_ were declared
    if (symbolsFoundBits & 0b11000000) {
      // [error_cccbd]
      throw new Error('CLKMODE_ and CLKFREQ_ cannot be declared, since they are set by the compiler');
    }

    // hide _ERRFREQ in ah to reduce comparisons
    let criticalSymbolsFound = symbolsFoundBits & 0b00011111;

    // if no symbol, use _RCFAST (_XTALFRQ = 20_000_000 if DEBUG)
    if (criticalSymbolsFound == 0b00000) {
      if (this.context.compileOptions.enableDebug) {
        // debug mode compile, use _XTALFRQ = 20_000_000
        criticalSymbolsFound = 0b01000;
        _xtlFreq = 20000000;
      } else {
        // NOT debug mode compile, use _RCFAST
        criticalSymbolsFound = 0b00010;
      }
    }

    switch (criticalSymbolsFound) {
      case 0b10000: // _CLKFREQ ?            + _ERRFREQ optional
        [this.clkMode, this.clkFreq] = this.pllCalc(20000000, _clkFreq, _errFreq);
        this.clkMode |= 0b1011; // 15pf/pin, clksrc=PLL
        this.xinFreq = 20000000;
        break;
      case 0b11000: // _CLKFREQ + _XTLFREQ ? + _ERRFREQ optional
        [this.clkMode, this.clkFreq] = this.pllCalc(_xtlFreq, _clkFreq, _errFreq);
        this.clkMode |= _xtlFreq >= 16000000 ? 0b1011 : 0b1111; // 15pf/pin : 30pf/pin, clksrc=PLL
        this.xinFreq = _xtlFreq;
        break;
      case 0b10100: // _CLKFREQ + _XINFREQ ? + _ERRFREQ optional
        [this.clkMode, this.clkFreq] = this.pllCalc(_xinFreq, _clkFreq, _errFreq);
        this.clkMode |= 0b0111; // no caps, clksrc=PLL
        this.xinFreq = _xinFreq;
        break;
      case 0b01000: // _XTLFREQ ?
        this.clkMode = _xtlFreq >= 16000000 ? 0b1010 : 0b1110; // 15pf/pin : 30pf/pin, clksrc=XI
        this.clkFreq = _xtlFreq;
        this.xinFreq = _xtlFreq;
        break;
      case 0b00100: // _XINFREQ ?
        this.clkMode = 0b0110; // no caps, clksrc=XI
        this.clkFreq = _xinFreq;
        this.xinFreq = _xinFreq;
        break;
      case 0b00010: // _RCFAST ?
        this.clkMode = 0b0000; // ignored, clksrc=RCFAST
        this.clkFreq = 20000000;
        this.xinFreq = 0;
        break;
      case 0b00001: // _RCSLOW ?
        this.clkMode = 0b0001; // ignored, clksrc=RCSLOW
        this.clkFreq = 20000;
        this.xinFreq = 0;
        break;

      default:
        // [error_codcssf]
        throw new Error('Conflicting or deficient _CLKFREQ/_XTLFREQ/_XINFREQ/_RCFAST/_RCSLOW symbols found');
    }

    // record our symbols
    let tempSymbol: iSymbol = { name: 'CLKMODE_', type: eElementType.type_con, value: BigInt(this.clkMode) };
    this.recordSymbol(tempSymbol);
    tempSymbol = { name: 'CLKFREQ_', type: eElementType.type_con, value: BigInt(this.clkFreq) };
    this.recordSymbol(tempSymbol);
  }

  private determine_bauds_pins() {
    // PNut determine_bauds_pins:
    // Determine download baud and debug pins and baud

    const symlbaud = 'DOWNLOAD_BAUD';

    const sympin = 'DEBUG_PIN'; //same purpose as debug_pin_tx
    const sympintx = 'DEBUG_PIN_TX';
    const sympinrx = 'DEBUG_PIN_RX';
    const symdbaud = 'DEBUG_BAUD';

    const symleft = 'DEBUG_LEFT';
    const symtop = 'DEBUG_TOP';
    const symwidth = 'DEBUG_WIDTH';
    const symheight = 'DEBUG_HEIGHT';
    const symdisleft = 'DEBUG_DISPLAY_LEFT';
    const symdistop = 'DEBUG_DISPLAY_TOP';
    const symlog = 'DEBUG_LOG_SIZE';
    const symoff = 'DEBUG_WINDOWS_OFF';

    let [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symlbaud);
    if (symbolFound) {
      if (isConstInteger) {
        this.downloadBaud = Number(value);
      } else {
        // [error_downbaud]
        throw new Error('DOWNLOAD_BAUD can only be defined as an integer constant');
      }
    }
    this.debugPinTx = 62; // TX defaults to 62
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(sympin);
    if (symbolFound) {
      if (isConstInteger) {
        this.debugPinTx = Number(value) & 0x3f;
      } else {
        // [error_debugpin]
        throw new Error('DEBUG_PIN can only be defined as an integer constant');
      }
    }
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(sympintx);
    if (symbolFound) {
      if (isConstInteger) {
        this.debugPinTx = Number(value) & 0x3f;
      } else {
        // [error_debugptx]
        throw new Error('DEBUG_PIN_TX can only be defined as an integer constant');
      }
    }
    this.debugPinRx = 63; // Rx defaults to 63
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(sympinrx);
    if (symbolFound) {
      if (isConstInteger) {
        this.debugPinTx = Number(value) & 0x3f;
      } else {
        // [error_debugprx]
        throw new Error('DEBUG_PIN_RX can only be defined as an integer constant');
      }
    }
    this.debugBaud = this.downloadBaud; // use default in case not defined
    [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symdbaud);
    if (symbolFound) {
      if (isConstInteger) {
        this.debugBaud = Number(value);
      } else {
        // [error_debugbaud]
        throw new Error('DEBUG_BAUD can only be defined as an integer constant');
      }
    }

    // place default OR users specified value for each of these
    this.debug_left = this.hostSymbolOverrideNumber(symleft, -1);
    this.debug_top = this.hostSymbolOverrideNumber(symtop, -1);
    this.debug_width = this.hostSymbolOverrideNumber(symwidth, -1);
    this.debug_height = this.hostSymbolOverrideNumber(symheight, -1);
    this.debug_display_left = this.hostSymbolOverrideNumber(symdisleft, 0);
    this.debug_display_top = this.hostSymbolOverrideNumber(symdistop, 0);
    this.debug_log_size = this.hostSymbolOverrideNumber(symlog, 0);

    this.debug_windows_off = this.hostSymbolOverrideBoolean(symoff, false);
  }

  private hostSymbolOverrideNumber(symbolName: string, defaultValue: number): number {
    let desiredValue: number = defaultValue;
    const [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symbolName);
    if (symbolFound) {
      if (isConstInteger) {
        desiredValue = Number(value);
      }
    }
    return desiredValue;
  }

  private hostSymbolOverrideBoolean(symbolName: string, defaultValue: boolean): boolean {
    let desiredValue: boolean = defaultValue;
    const [symbolFound, isConstInteger, value] = this.checkDebugSymbol(symbolName);
    if (symbolFound) {
      if (isConstInteger) {
        desiredValue = Number(value) == 0 ? false : true; // non zero == true
      }
    }
    return desiredValue;
  }

  private checkDebugSymbol(smbolName: string): [boolean, boolean, bigint | string] {
    let definedStatus: boolean = false;
    let isConStatus: boolean = false;
    let symValue: bigint | string = 0n;
    const symbolFound: iSymbol | undefined = this.getSymbol(smbolName);
    if (symbolFound) {
      definedStatus = true;
      if (symbolFound.type == eElementType.type_con) {
        isConStatus = true;
      }
      symValue = symbolFound.value;
    }
    return [definedStatus, isConStatus, symValue];
  }

  private pllCalc(inputFrequency: number, requestedFrequency: number, allowedError: number): [number, number] {
    // Calculate PLL setting
    //
    // on entry:  eax = input frequency in Hz
    //            ebx = requested output frequency in Hz
    //            ecx = max allowable error in Hz
    //
    // on exit:   eax = PLL mode with crystal bits cleared (eax[3:2]=0)
    //            ebx = actual output frequency in Hz
    //            c = 1 if setting found
    //
    //let calcClkMode: number = 0; // _mode
    //let calcClkFreq: number = 0; // _freq
    //let foundStatus: boolean = false; // _found

    let _xinfreq: number = inputFrequency;
    let _clkfreq: number = requestedFrequency;

    if (_xinfreq < 250000 || _xinfreq > 500000000) {
      // [error_INTERNAL]
      throw new Error('_XINFREQ must be from 250_000 to 500_000_000');
    }
    if (_clkfreq < 3333333 || _clkfreq > 500000000) {
      // [error_INTERNAL]
      throw new Error('_CLKFREQ must be from 3_333_333 to 500_000_000');
    }

    let _found: boolean = false;
    let _errfreq: number = allowedError;
    let _error: number = allowedError; // running absolute minimum error
    let _abse: number = 0;
    let _pppp: number = 0;
    let _post: number = 0;
    let _divd: number = 0;
    let _fpfd: number = 0;
    let _mult: number = 0;
    let _fvco: number = 0;
    let _fout: number = 0;
    let _mode: number = 0;
    let _freq: number = 0;
    do {
      //  LOOP while _pppp...
      _post = (_pppp << 1) + (_pppp ? 0 : 1);
      _divd = 64;
      do {
        // -- LOOP while _divd...
        _fpfd = Math.round(_xinfreq / _divd);
        _mult = Math.round((_post * _divd * _clkfreq) / _xinfreq);
        _fvco = Math.round((_xinfreq * _mult) / _divd);
        _fout = Math.round(_fvco / _post);
        _abse = Math.abs(_fout - _clkfreq);
        // does this setting have lower or same _error?
        // is _fpfd at least 250KHz?
        // is _mult 1024 or less?
        // is _fvco at least 99 MHz?
        // is _fvco no more than 201 MHz? -OR- is _fvco no more than _clkfreq + _errfreq?
        if (_abse <= _error && _fpfd >= 250000 && _mult <= 1024 && _fvco >= 99000000 && (_fvco <= 201000000 || _fvco <= _clkfreq + _errfreq)) {
          // yep:
          //  found the best setting so far, update error to abserror
          _found = true;
          _error = _abse;
          // set PLL mode: set the PLL-enable bit, set the divider field, set the multiplier field, set the post divider field
          this.logMessage(`* pllCalc() _divd=(${_divd}), _mult=(${_mult}), _pppp=(${_pppp})`);
          _mode = (1 << 24) | ((_divd - 1) << 18) | ((_mult - 1) << 8) | (((_pppp - 1) & 0b1111) << 4);
          // set PLL frequency
          _freq = _fout;
        }
        // nope
      } while (--_divd > 0);
    } while (++_pppp < 16);

    if (_found == false) {
      // [error_pllscnba]
      throw new Error('PLL settings could not be achieved per _CLKFREQ');
    }
    this.logMessage(`* pllCalc(${inputFrequency}, ${requestedFrequency}, ${allowedError}) -> [_mode=(${hexString(_mode)}), _freq=(${_freq})]`);
    return [_mode, _freq];
  }

  /**
   *  compile DAT blocks or inline pasm code
   *
   * @private
   * @param {boolean} [inLineMode=false] - T/F where T means we are processing PUB/PRI pasm inline code
   * @param {number} [inLineCogOrg=0] - the offset within COG for this inline pasm code
   * @param {number} [inLineCogOrgLimit=0] - the ending limit useable for this block of inline pasm code
   * @memberof SpinResolver
   */
  private compile_dat_blocks(inLineMode: boolean = false, inLineCogOrg: number = 0, inLineCogOrgLimit: number = 0) {
    // compile all DAT blocks in file
    this.logMessage(`*==* COMPILE_dat_blocks() inLineMode=(${inLineMode})`);
    this.inlineModeForGetConstant = inLineMode;
    if (inLineMode) {
      this.activeSymbolTable = eSymbolTableId.STI_INLINE;
    }

    // pasm symbols sym, .sym (global and local)
    //
    // TODO: POSSIBLE LANG ENHANCEMENT: datName.localSymbol (let our symbol table remember global.local pasm reference)
    // remember where we are starting from in OBJ image, with local labelling and with
    const startingObjOffset: number = this.objImage.offset;
    const startingAsmLocal: number = this.asmLocal;
    const startingElementIndex: number = this.nextElementIndex;

    let pass: number = 0;
    do {
      // PASS Loop
      this.logMessage(`LOOP: pass=${pass} TOP`);
      this.pasmResolveMode = pass == 0 ? eResolve.BR_Try : eResolve.BR_Must;
      this.objImage.setOffsetTo(startingObjOffset);
      this.asmLocal = startingAsmLocal;
      this.restoreElementLocation(startingElementIndex);
      this.hubOrg = 0x00000; // get constant(getValue) will use this
      this.hubOrgLimit = 0x100000; // get constant(getValue) will use this;
      this.wordSize = eWordSize.WS_Byte; // 0=byte, 1=word, 2=long

      if (inLineMode) {
        this.hubMode = false;
        this.cogOrg = inLineCogOrg;
        this.cogOrgLimit = inLineCogOrgLimit;
        this.restoreElementLocation(startingElementIndex);
      } else {
        this.hubMode = true;
        this.cogOrg = 0x000 << 2;
        this.cogOrgLimit = 0x1f8 << 2;
        // location in object of start -OR- start of hub for execution
        this.hubOrg = this.pasmMode ? this.objImage.offset : 0x00400;
        this.orghOffset = this.hubOrg - this.objImage.offset;
        this.hubOrgLimit = 0x100000;
        this.restoreElementLocation(0); // start from first in list
      }
      do {
        // NEXT BLOCK Loop
        this.logMessage(`LOOP: next block TOP`);
        if (inLineMode === false) {
          this.nextBlock(eBlockType.block_dat);
        }

        // process the DAT block

        // NEXT LINE in BLOCK Loop
        do {
          this.logMessage(`LOOP: next line TOP`);
          //
          this.getElement(); // create copy of element in our global
          this.logMessage(`* DAT NEXTLINE LOOP currElement=[${this.currElement.toString()}]`);
          if (this.currElement.type == eElementType.type_end_file) {
            if (inLineMode) {
              // [error_eend]
              throw new Error('Expected END');
            }
            break;
          }

          const [didFindLocal, symbol] = this.checkLocalSymbol();
          if (didFindLocal) {
            // we have a local symbol... (must be undef or is storage type)
            this.logMessage(`* FOUND local symbol name=[${symbol.name}], type=[${eElementType[symbol.type]}], value=[${symbol.value}]`);
          }
          this.logMessage(`* compile_dat_blocks() inLineMode=(${inLineMode}) e=[${this.currElement.toString()}]`);
          this.weHaveASymbol = this.currElement.isTypeUndefined;
          const isDatStorage: boolean = this.isDatStorageType();
          if ((this.weHaveASymbol || isDatStorage) && !didFindLocal) {
            this.incrementLocalScopeCounter();
          }
          if (isDatStorage && pass == 0) {
            // [error_siad]
            throw new Error('Symbol is already defined');
          }
          const tmpSymbolName: string = didFindLocal ? String(symbol.value) : this.currElement.stringValue;
          this.symbolName = this.weHaveASymbol ? tmpSymbolName : '';
          this.logMessage(`* compile_dat_blocks() symbolName=[${this.symbolName}]`);

          if (this.weHaveASymbol || isDatStorage) {
            this.getElement(); // moving on to next (past this symbol)
            this.logMessage(`*  SYM/STORAGE  next element=[${this.currElement.toString()}]`);
          }

          if (this.currElement.type == eElementType.type_end) {
            this.logMessage(`* COMPILE_dat_blocks() enter symbol [${this.symbolName}]`);
            this.enterDatSymbol(); // at end of line
            // back to top of loop to get first elem of new line
            continue;
          }
          //
          // HANDLE size
          let fitToSize: boolean = this.currElement.type == eElementType.type_size_fit;
          if (this.currElement.type == eElementType.type_size || fitToSize) {
            this.logMessage(`* HANDLE size found element=[${this.currElement.toString()}]`);
            this.wordSize = Number(this.currElement.value); // NOTE: this matches our enum values
            this.enterDatSymbol(); // process pending symbol
            do {
              let currSize: eWordSize = this.wordSize;
              this.currElement = this.getElement(); // moving on to next (past this symbol)
              if (this.currElement.type == eElementType.type_end) {
                break;
              }
              if (this.currElement.type == eElementType.type_size) {
                // HANDLE Size Override
                currSize = Number(this.currElement.value);
                let multiplier: number = 1;
                const getForm: eMode = currSize == eWordSize.WS_Long ? eMode.BM_OperandIntOrFloat : eMode.BM_OperandIntOnly;
                const valueResult = this.getValue(getForm, this.pasmResolveMode);
                if (this.checkLeftBracket()) {
                  const multiplierResult = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
                  multiplier = Number(multiplierResult.value);
                  this.getRightBracket();
                }
                this.enterData(valueResult.value, currSize, multiplier, fitToSize);
              } else if (this.currElement.type == eElementType.type_fvar) {
                // HANDLE FVar... [0,1] where 1 is signed fvar
                const isSigned = this.currElement.value == 1n;
                const fvarResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
                if (isSigned) {
                  if ((BigInt(fvarResult.value) & BigInt(0xf0000000)) != BigInt(0xf0000000)) {
                    // [error_fvar]
                    throw new Error('FVAR/FVARS data is too big');
                  }
                  this.compileDatRfvars(fvarResult.value);
                } else {
                  if ((BigInt(fvarResult.value) & BigInt(0xe0000000)) != 0n) {
                    // [error_fvar]
                    throw new Error('FVAR/FVARS data is too big');
                  }
                  this.compileDatRfvar(fvarResult.value);
                }
              } else {
                // DAT declaring long data
                this.backElement();
                let multiplier: number = 1;
                const getForm: eMode = currSize == eWordSize.WS_Long ? eMode.BM_OperandIntOrFloat : eMode.BM_OperandIntOnly;
                const valueResult = this.getValue(getForm, this.pasmResolveMode);
                if (this.checkLeftBracket()) {
                  const multiplierResult = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
                  multiplier = Number(multiplierResult.value);
                  this.getRightBracket();
                }
                this.enterData(valueResult.value, currSize, multiplier, fitToSize);
              }
            } while (this.getCommaOrEndOfLine());
            continue;
          } else if (this.currElement.type == eElementType.type_asm_dir) {
            // HANDLE pasm directive
            this.logMessage(`  -- have pasm directive`);

            const pasmDirective: number = Number(this.currElement.value);
            this.wordSize = eWordSize.WS_Long;

            if (pasmDirective == eValueType.dir_fit) {
              //
              // ASM dir: FIT {address}
              this.errorIfSymbol();
              const addressResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
              if (this.hubMode) {
                if (this.hubOrg > Number(addressResult.value)) {
                  // [error_haefl]
                  throw new Error('Hub address exceeds FIT limit');
                }
              } else {
                if (this.cogOrg > Number(addressResult.value) << 2) {
                  // [error_caefl]
                  throw new Error('Cog address exceeds FIT limit');
                }
              }
            } else if (pasmDirective == eValueType.dir_res) {
              //
              // RES {count}
              if (this.hubMode) {
                // [error_rinaiom]
                throw new Error('RES is not allowed in ORGH mode');
              }
              this.advanceToNextCogLong();
              this.wordSize = eWordSize.WS_Long_Res;
              this.enterDatSymbol(); // in pasm directive res
              const countResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
              // NOTE: omitting the 0x400 error detection (shouldn't be needed)
              this.cogOrg = this.cogOrg + (Number(countResult.value) << 2);
              if (this.cogOrg > this.cogOrgLimit) {
                // [error_cael]
                throw new Error('Cog address exceeds limit (m020)');
              }
            } else if (pasmDirective == eValueType.dir_orgf) {
              //
              // ORGF {cog-address}
              if (this.hubMode) {
                // [error_oinaiom]
                throw new Error('ORGF is not allowed in ORGH mode');
              }
              this.errorIfSymbol();
              const cogAddressResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
              const tmpCogAddress = Number(cogAddressResult.value) << 2;
              if (tmpCogAddress > this.cogOrgLimit) {
                // [error_cael]
                throw new Error('Cog address exceeds limit (m021)');
              }
              if (this.cogOrg > tmpCogAddress) {
                // [error_oaet]
                throw new Error('Origin already exceeds target');
              }
              this.enterData(0n, eWordSize.WS_Byte, tmpCogAddress - this.cogOrg, false);
            } else if (pasmDirective == eValueType.dir_org) {
              //
              // ORG [{address}[,{limit}]]- (for COG ram)
              this.logMessage(`  -- compDatBlocks() have ORG`);
              if (inLineMode) {
                // [error_onawiac]
                throw new Error('ORG not allowed within inline assembly code');
              }
              this.errorIfSymbol();
              // reset cog address and limit
              this.hubMode = false;
              this.cogOrg = 0;
              this.cogOrgLimit = 0x1f8 << 2;
              if (this.nextElementType() != eElementType.type_end) {
                // get our (optional) address
                const cogAddressResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
                if (Number(cogAddressResult.value) > 0x400) {
                  // [error_caexl]
                  throw new Error('Cog address exceeds $400 limit (m030)');
                }
                this.cogOrg = Number(cogAddressResult.value) << 2;
                this.cogOrgLimit = (Number(cogAddressResult.value) >= 0x200 ? 0x400 : 0x200) << 2;
                if (this.checkComma()) {
                  // get our (optional) [,{limit}]] and adopt it
                  const cogLimitResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
                  if (Number(cogLimitResult.value) > 0x400) {
                    // [error_caexl]
                    throw new Error('Cog address exceeds $400 limit (m031)');
                  }
                  this.cogOrgLimit = Number(cogLimitResult.value) << 2;
                }
              }
            } else if (pasmDirective == eValueType.dir_orgh) {
              //
              // ORGH [{address}[,{limit}]] - (for HUB ram)
              if (inLineMode) {
                // [error_ohnawiac]
                throw new Error('ORGH not allowed within inline assembly code');
              }
              this.errorIfSymbol();
              // reset hub address and limit
              this.hubMode = true;
              this.hubOrg = this.pasmMode ? this.objImage.offset : 0x400;
              this.orghOffset = this.hubOrg - this.objImage.offset;
              this.hubOrgLimit = ObjectImage.MAX_SIZE_IN_BYTES;

              if (this.nextElementType() != eElementType.type_end) {
                // get our (optional) address
                const hubAddressResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
                if (this.pasmMode == false) {
                  if (Number(hubAddressResult.value) < 0x400) {
                    // [error_habxl]
                    throw new Error('Hub address below $400 limit');
                  }
                }
                if (Number(hubAddressResult.value) > ObjectImage.MAX_SIZE_IN_BYTES) {
                  // [error_haec]
                  throw new Error('Hub address exceeds $100000 ceiling');
                }
                this.hubOrg = Number(hubAddressResult.value);
                this.orghOffset = this.hubOrg - this.objImage.offset;

                if (this.checkComma()) {
                  // get our (optional) [,{limit}]] and adopt it
                  const hubLimitResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
                  this.hubOrgLimit = Number(hubLimitResult.value);
                  if (this.hubOrgLimit < this.hubOrg) {
                    // [error_hael]
                    throw new Error('Hub address exceeds limit');
                  }
                  if (this.hubOrgLimit > ObjectImage.MAX_SIZE_IN_BYTES) {
                    // [error_haec]
                    throw new Error('Hub address exceeds $100000 ceiling');
                  }
                }
                // if in pasmMode ...
                if (this.pasmMode == true) {
                  if (this.hubOrg < this.objImage.offset) {
                    // [error_hacd]
                    throw new Error('Hub address cannot decrease');
                  }
                  // fill to new orgh address
                  const fillByteCount = this.hubOrg - this.objImage.offset;
                  // our routine is using "this.hubOrg" (passed by side-effect)
                  //  so we back it up in preparation for the fill
                  this.hubOrg -= fillByteCount;
                  this.enterData(0n, eWordSize.WS_Byte, fillByteCount, false);
                }
              }
            } else if (pasmDirective == eValueType.dir_alignw || pasmDirective == eValueType.dir_alignl) {
              //
              // ALIGN[W|L]
              if (inLineMode) {
                // [error_aanawiac]
                throw new Error('ALIGNW/ALIGNL not allowed within inline assembly code');
              }
              while (this.objImage.offset & (pasmDirective == eValueType.dir_alignl ? 0x03 : 0x01)) {
                this.enterDataByte(0n);
              }
            }
            // ensure this gets to end-of-line check (throw error if not)
            this.getEndOfLine();
          } else if (this.isThereAnInstruction()) {
            //
            this.logMessage(`  -- have instruction`);
            // HANDLE if-condition, and/or instruction
            // write symbol if present
            this.advanceToNextCogLong();
            this.wordSize = eWordSize.WS_Long;
            this.enterDatSymbol(); // have an instruction
            this.assembleInstructionFromLine(pass);
            this.getEndOfLine();
          } else if (inLineMode) {
            this.logMessage(`  -- NO instruction but INLINE mode, so must be pasm 'END' elem=[${this.currElement.toString()}]`);
            //
            // HANDLE inline must have end
            if (this.currElement.type != eElementType.type_asm_end) {
              // [error_eidbwloe]
              throw new Error('Expected instruction, directive, BYTE/WORD/LONG, or END');
            }
            this.enterDataLong(BigInt(0xfd64002d)); // enter a RET istruction
            this.getEndOfLine(); // throw exception if NOT end of line!
            this.backElement(); // allow our caller to see the end of line in this case
            break;
          } else if (this.currElement.type == eElementType.type_file) {
            //
            // HANDLE FILE
            // PNut @@file:
            const fileElementIndex = this.saveElementLocation();

            this.wordSize = eWordSize.WS_Byte;
            this.enterDatSymbol(); // have name of our file
            const filename = this.getFilename();
            const fileHandle = this.spinFiles.loadDataFile(filename);
            if (fileHandle === undefined) {
              this.restoreElementLocation(fileElementIndex);
              // [error_INTERNAL]
              throw new Error(`DAT file not found [${filename}]`);
            }
            const [foundFile, fileIndex] = this.spinFiles.getIndexForDat(filename);
            if (foundFile) {
              const [offset, dataLength] = this.datFileData.getOffsetAndLengthForFile(fileIndex);
              if (dataLength > 0) {
                this.datFileData.setOffset(offset);
                for (let byteCount = 0; byteCount < dataLength; byteCount++) {
                  this.enterDataByte(BigInt(this.datFileData.read()));
                }
              }
            } else {
              this.restoreElementLocation(fileElementIndex);
              // [error_INTERNAL]
              throw new Error(`ERROR[INTERNAL] file [${filename}] missing from mid-pass list of data files`);
            }
            this.getEndOfLine();
          } else if (this.currElement.type != eElementType.type_block) {
            //
            // HANDLE block - we MUST have one...
            // [error_eaunbwlo]
            throw new Error('Expected a unique name, BYTE, WORD, LONG, or assembly instruction');
          } else {
            // put block back in list
            this.backElement();
            // get out of next line loop
            break;
          }
          // eslint-disable-next-line no-constant-condition
          this.logMessage(`LOOP: next line BOTTOM`);
        } while (this.nextElementType() != eElementType.type_block); // NEXT LINE in BLOCK...
        this.logMessage(`LOOP: next block BOTTOM`);
        // eslint-disable-next-line no-constant-condition
      } while (this.nextElementType() == eElementType.type_block); // NEXT BLOCK...
    } while (++pass < 2);
    this.logMessage(`* compile_dat_blocks() done, cleaning up inlineMode`);
    if (inLineMode) {
      this.inlineSymbols.reset();
      this.activeSymbolTable = eSymbolTableId.STI_LOCAL;
    }
    // clear so no lingering side-effects
    this.inlineModeForGetConstant = false;
  }

  private advanceToNextCogLong() {
    // PNut compile_dat: @@coglong
    // advance to next cog-long boundary
    if (this.hubMode == false) {
      while (this.cogOrg & 0x03) {
        this.enterDataByte(0n);
      }
    }
  }

  private isThereAnInstruction(): boolean {
    this.logMessage(`* isThereAnInstruction() e=[${this.currElement.toString()}]`);
    let instructionFoundStatus: boolean = false;
    if (this.currElement.type == eElementType.type_asm_cond) {
      this.getElement(); // place next in current
      const [foundInstruction, instructionValue] = this.checkInstruction();
      instructionFoundStatus = foundInstruction;
      this.backElement(); // leave the condition in current
      if (foundInstruction == false) {
        // [error_eaasmi]
        throw new Error('Expected an assembly instruction');
      }
    } else {
      const [foundInstruction, instructionValue] = this.checkInstruction();
      instructionFoundStatus = foundInstruction;
    }
    return instructionFoundStatus;
  }

  private assembleInstructionFromLine(pass: number) {
    this.logMessage(`* assembleInstructionFromLine(${pass}) e=[${this.currElement.toString()}]`);
    let asmCondition: number = eValueType.if_always;
    let instructionValue: number;
    if (this.currElement.type == eElementType.type_asm_cond) {
      asmCondition = Number(this.currElement.value);
      this.getElement();
      const [foundInstruction, tmpInstructionValue] = this.checkInstruction();
      instructionValue = tmpInstructionValue;
    } else {
      //
      // handle instruction
      const [foundInstruction, tmpInstructionValue] = this.checkInstruction();
      if (foundInstruction) {
        instructionValue = tmpInstructionValue;
      } else {
        // [error_INTERNAL]
        throw new Error('[CODE] INTERNAL error: we should have found an instruction');
      }
    }
    // handle condition and instruction we found
    // tease out instruction fields
    //  bottom 9 are code
    const instructionBinary: number = instructionValue & 0x1ff;
    //  91-53 (38)
    const operandType: eValueType = (instructionValue >> 11) & 0x3f;
    //  next 2 are flag permissions
    let allowedEffects: number = (instructionValue >> 9) & 0x03;
    this.instructionImage = asmCondition << 28;
    this.instructionImage |= operandType >= eValueType.operand_d ? 0x0d600000 | instructionBinary : instructionBinary << 19;
    this.logMessage(
      `* assembleInstructionFromLine() instructionBinary=(0x${instructionBinary.toString(16).toUpperCase()}), operandType=(0x${operandType.toString(16).toUpperCase()}), allowedEffects=(0b${allowedEffects.toString(2)})`
    );
    // handle operands
    // NOTE: tryD() gets the next element, before it does anything
    let skipInstructionGeneration: boolean = false;
    this.logMessage(`  -- AInstruFmLn() operandType=([${eValueType[operandType]}](${operandType}))`);
    switch (operandType) {
      case eValueType.operand_ds:
        // inst d,s/#
        this.tryD();
        this.getComma();
        this.trySImmediate();
        break;
      case eValueType.operand_bitx:
        // inst d,s/# {wc,wz or none)
        this.tryD();
        this.getComma();
        this.trySImmediate();
        this.tryWCZ();
        break;
      case eValueType.operand_testb:
        // inst d,s/# (wc/andc/orc/xorc or wz/andz/orz/xorz}
        {
          this.tryD();
          this.getComma();
          this.trySImmediate();
          const logicFunction = this.getCorZ();
          this.instructionImage |= logicFunction << 22;
        }
        break;
      case eValueType.operand_du:
        // inst d,s/# / inst d (unary)
        this.tryD();
        if (this.checkComma()) {
          this.trySImmediate();
        } else {
          // copy D int S
          this.instructionImage |= (this.instructionImage >> 9) & 0x1ff;
        }
        break;
      case eValueType.operand_duii:
        // inst d,s/# / inst d (alti)
        this.tryD();
        if (this.checkComma()) {
          this.trySImmediate();
        } else {
          // make S immediate and say to execute D in place of next instruction
          this.instructionImage |= (1 << 18) + 0b101100100;
        }
        break;
      case eValueType.operand_duiz:
        // inst d,s/# / inst d
        this.tryD();
        if (this.checkComma()) {
          this.trySImmediate();
        } else {
          // make S immediate
          this.instructionImage |= 1 << 18;
        }
        break;
      case eValueType.operand_ds3set:
        // inst d,s/#,#0..7 / inst s/# (SETNIB)
        this.trySImmediate();
        // if immediate bit is not set...
        if ((this.instructionImage & (1 << 18)) == 0) {
          if (this.checkComma()) {
            // copy d into s
            //  clear d
            this.instructionImage |= (this.instructionImage & 0x1ff) << 9;
            this.instructionImage &= 0xfffffe00;
            this.trySImmediate();
            this.getComma();
            this.getPound();
            const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
            if (Number(valueResult.value) > 0b111) {
              // [error_smb0t7]
              throw new Error('Selector must be 0 to 7');
            }
            this.instructionImage |= Number(valueResult.value) << 19;
          }
        }
        break;
      case eValueType.operand_ds3get:
        // inst d,s/#,#0..7 / inst d
        this.tryD();
        if (this.checkComma()) {
          this.trySImmediate();
          this.getComma();
          this.getPound();
          const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          if (Number(valueResult.value) > 0b111) {
            // [error_smb0t7]
            throw new Error('Selector must be 0 to 7');
          }
          this.instructionImage |= Number(valueResult.value) << 19;
        }
        break;
      case eValueType.operand_ds2set:
        // inst d,s/#,#0..3 / inst s/#
        this.trySImmediate();
        // if immediate bit is not set...
        if ((this.instructionImage & (1 << 18)) == 0) {
          if (this.checkComma()) {
            // copy d into s
            //  clear d
            this.instructionImage |= (this.instructionImage & 0x1ff) << 9;
            this.instructionImage &= 0xfffffe00;
            this.trySImmediate();
            this.getComma();
            this.getPound();
            const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
            if (Number(valueResult.value) > 0b11) {
              // [error_smb0t3]
              throw new Error('Selector must be 0 to 3');
            }
            this.instructionImage |= Number(valueResult.value) << 19;
          }
        }
        break;
      case eValueType.operand_ds2get:
        // inst d,s/#,#0..3 / inst d
        this.tryD();
        if (this.checkComma()) {
          this.trySImmediate();
          this.getComma();
          this.getPound();
          const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          if (Number(valueResult.value) > 0b11) {
            // [error_smb0t3]
            throw new Error('Selector must be 0 to 3');
          }
          this.instructionImage |= Number(valueResult.value) << 19;
        }
        break;
      case eValueType.operand_ds1set:
        // inst d,s/#,#0..1 / inst s/#
        this.trySImmediate();
        // if immediate bit is not set...
        if ((this.instructionImage & (1 << 18)) == 0) {
          if (this.checkComma()) {
            // copy d into s
            //  clear d
            this.instructionImage |= (this.instructionImage & 0x1ff) << 9;
            this.instructionImage &= 0xfffffe00;
            this.trySImmediate();
            this.getComma();
            this.getPound();
            const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
            if (Number(valueResult.value) > 0b1) {
              // [error_smb0t1]
              throw new Error('Selector must be 0 to 1');
            }
            this.instructionImage |= Number(valueResult.value) << 19;
          }
        }
        break;
      case eValueType.operand_ds1get:
        // inst d,s/#,#0..1 / inst d
        this.tryD();
        if (this.checkComma()) {
          this.trySImmediate();
          this.getComma();
          this.getPound();
          const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          if (Number(valueResult.value) > 0b1) {
            // [error_smb0t1]
            throw new Error('Selector must be 0 to 1');
          }
          this.instructionImage |= Number(valueResult.value) << 19;
        }
        break;
      case eValueType.operand_dsj:
        // inst d,s/@
        this.tryD();
        this.getComma();
        this.trySRel();
        break;
      case eValueType.operand_ls:
        // inst d/#,s/#
        this.tryDImmediate(19);
        this.getComma();
        this.trySImmediate();
        break;
      case eValueType.operand_lsj:
        // inst d/#,s/@
        this.tryDImmediate(19);
        this.getComma();
        this.trySRel();
        break;
      case eValueType.operand_dsp:
        // inst d,s/#/ptra/ptrb
        this.logMessage(`* operand_dsp: we got one!`);
        this.tryD();
        this.getComma();
        this.tryPtraPtrb();
        break;
      case eValueType.operand_lsp:
        // inst d/#,s/#/ptra/ptrb
        this.tryDImmediate(19);
        this.getComma();
        this.tryPtraPtrb();
        break;
      case eValueType.operand_rep:
        // rep d/#/@,s/#
        if (this.checkAt()) {
          // rep @,s/#
          this.instructionImage |= 1 << 19;
          const instructionCountResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          let instructionCount: number = Number(instructionCountResult.value);
          this.getComma();
          this.trySImmediate(); // get repetition count
          if (this.pasmResolveMode == eResolve.BR_Must) {
            instructionCount = this.hubMode ? instructionCount - this.hubOrg : (instructionCount << 2) - this.cogOrg;
            if (instructionCount & 0b11) {
              // [error_rbeiooa]
              throw new Error('REP block end is out of alignment');
            }
            instructionCount = (instructionCount >> 2) - 1;
            if (instructionCount < 0 || instructionCount > 0x1ff) {
              // [error_rbeioor]
              throw new Error('REP block end is out of range');
            }
            this.instructionImage |= instructionCount << 9;
          }
        } else {
          // rep d/#,s/#
          this.tryDImmediate(19);
          this.getComma();
          this.trySImmediate();
        }
        break;
      case eValueType.operand_jmp:
        //  jmp # <or> jmp d
        if (this.checkPound()) {
          this.logMessage(`* in jmp, have #!`);
          this.branchImmediateOrRelative();
        } else {
          // reg, make jmp d instruction
          this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0d60002c;
          this.tryD();
          allowedEffects = 0b11;
        }
        break;
      case eValueType.operand_call:
        // call/calla/callb # <or> call/calla/callb d
        if (this.checkPound()) {
          this.branchImmediateOrRelative();
        } else {
          // reg, make 'call/calla/callb d' instruction
          this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0d60002c | ((this.instructionImage >> 21) & 0b11);
          this.tryD();
          allowedEffects = 0b11;
        }
        break;
      case eValueType.operand_calld:
        // 'calld 1F6h..1F9h,#{\}adr20' <or> 'calld d,s/#rel9'
        {
          // get d
          const dRegister: number = this.tryValueReg();
          this.getComma();
          if (this.checkPound()) {
            let [isRelative, address] = this.tryImmediateOrRelative();
            if (isRelative) {
              // cy = 1  isRelative (relative 9-bit address)
              if (this.pasmResolveMode == eResolve.BR_Must) {
                if (this.hubMode) {
                  // HUB mode
                  address -= this.hubOrg + 4;
                  if (address & 0b11) {
                    if (dRegister < 0x1f6 || dRegister > 0x1f9) {
                      // [error_drmbpppp]
                      throw new Error('D register must be PA/PB/PTRA/PTRB (m070)');
                    }
                    // install the mini d field, set relative, s field
                    this.instructionImage |= (((dRegister & 0b11) ^ 0b10) << 21) | (1 << 20) | (address & 0xfffff);
                  } else {
                    // hub mode but 0b11 bits are clear
                    address >>= 2;
                    if (address < -0x100 || address > 0xff) {
                      // out of range
                      if (dRegister < 0x1f6 || dRegister > 0x1f9) {
                        // [error_drmbpppp]
                        throw new Error('D register must be PA/PB/PTRA/PTRB (m071)');
                      }
                      // install the mini d field, set relative, s field
                      this.instructionImage |= (((dRegister & 0b11) ^ 0b10) << 21) | (1 << 20) | (address & 0xfffff);
                    } else {
                      // in-range
                      // preserve condition, set instruction, install d, install s
                      this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0b240000 | (dRegister << 9) | (address & 0x1ff);
                      allowedEffects = 0b11;
                    }
                  }
                } else {
                  // COG mode (relative 9-bit address)
                  address -= (this.cogOrg >> 2) + 1;
                  if (address < -0x100 || address > 0xff) {
                    // address out-of-range
                    if (dRegister < 0x1f6 || dRegister > 0x1f9) {
                      // [error_drmbpppp]
                      throw new Error('D register must be PA/PB/PTRA/PTRB (m072)');
                    }
                    // install the mini d field, relative bit, and s field
                    this.instructionImage |= (((dRegister & 0b11) ^ 0b10) << 21) | (1 << 20) | (address & 0xfffff);
                  } else {
                    // address in-range
                    // preserve condition, set instruction, install d, install s
                    this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0b240000 | (dRegister << 9) | (address & 0x1ff);
                    allowedEffects = 0b11;
                  }
                }
              }
            } else {
              // cy = 0  isRelative == false (absolute 20-bit address)
              if (this.pasmResolveMode == eResolve.BR_Must) {
                if (dRegister < 0x1f6 || dRegister > 0x1f9) {
                  // [error_drmbpppp]
                  throw new Error('D register must be PA/PB/PTRA/PTRB (m073)');
                }
                // install the mini d field and s field
                this.instructionImage |= (((dRegister & 0b11) ^ 0b10) << 21) | (address & 0xfffff);
              }
            }
          } else {
            // NO '#'
            // call d, s
            const sRegister: number = this.tryValueReg();
            // preserve condition, set instruction, install d, install s
            this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0b200000 | (dRegister << 9) | sRegister;
            allowedEffects = 0b11;
          }
        }
        break;
      case eValueType.operand_jpoll:
        // jint..jnqmt s/#
        // preserve condition, set instruction, install d
        this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0bc80000 | ((this.instructionImage & 0x0ff80000) >> (19 - 9));
        this.trySRel(); // install s
        break;
      case eValueType.operand_loc:
        // loc reg,#
        {
          const dRegister: number = this.tryValueReg();
          if (this.pasmResolveMode == eResolve.BR_Must) {
            if (dRegister < 0x1f6 || dRegister > 0x1f9) {
              // [error_drmbpppp]
              throw new Error('D register must be PA/PB/PTRA/PTRB (m074)');
            }
            // install d
            this.instructionImage |= ((dRegister & 0b11) ^ 0b10) << 21;
          }
          this.getComma();
          this.getPound();
          const backslashFound: boolean = this.checkBackslash(); // and remove it if found
          this.locOrghSymbolFlag = false; // clear before getValue() possibly sets
          // the following getValue() can set this.locOrghSymbolFlag
          const addressResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          const address: number = Number(addressResult.value);
          this.logMessage(`* operand_loc: dRegister=[${hexString(dRegister)}], address=[${hexString(address)}]`);
          if (address > 0xfffff) {
            // [error_amnex]
            throw new Error('Address must not exceed $FFFFF (m000)');
          }
          if (backslashFound) {
            // have '\'
            // install address
            this.instructionImage |= address;
          } else {
            // don't have '\'
            if (address >= 0x400) {
              this.locOrghSymbolFlag = true;
            }
            // set symbol flag iff flag and hub mode are different
            if (this.locOrghSymbolFlag !== this.hubMode) {
              // install address
              this.instructionImage |= address;
            } else {
              // set relative bit and install address
              this.instructionImage |= (1 << 20) | ((address - (this.hubMode ? this.hubOrg + 4 : (this.cogOrg >> 2) + 1)) & 0xfffff);
            }
          }
        }
        break;
      case eValueType.operand_aug:
        // AUGS or AUGD
        {
          this.getPound();
          const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          // install upper 23 bits as immediate into AUGD/AUGS
          this.instructionImage |= Number(valueResult.value) >> 9;
        }
        break;
      case eValueType.operand_d:
        // inst d
        this.tryD();
        break;
      case eValueType.operand_de:
        // GETRND d and/or effects
        if (this.nextElementType() == eElementType.type_asm_effect) {
          this.instructionImage |= 1 << 18;
        } else {
          this.tryD();
        }
        break;
      case eValueType.operand_l:
        // inst d/#0..511
        this.tryDImmediate(18);
        break;
      case eValueType.operand_cz:
        // modcz/modc/modz
        this.instructionImage |= 1 << 18;
        if (allowedEffects & 0b10) {
          // we have MODC or MODCZ
          const flagBitsResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          // place into upper four bits of d field
          this.instructionImage |= (Number(flagBitsResult.value) & 0b1111) << (9 + 4);
          if (allowedEffects & 0b01) {
            // we have MODCZ
            this.getComma();
          }
        }
        if (allowedEffects & 0b01) {
          // we have MODZ (or MODCZ)
          const flagBitsResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          // place into lower four bits of d field
          this.instructionImage |= (Number(flagBitsResult.value) & 0b1111) << (9 + 0);
        }
        break;
      case eValueType.operand_pollwait:
        // pollxxx/waitxxx <blank>
        // move s into d, set s to 0x024
        this.instructionImage = (this.instructionImage & 0xfffffe00) | ((this.instructionImage & 0x1ff) << 9) | 0x00000024;
        break;
      case eValueType.operand_getbrk:
        // getbrk d wc/wz/wcz
        this.tryDImmediate(18);
        if (this.nextElementType() != eElementType.type_asm_effect) {
          // [error_ewcwzwcz]
          throw new Error('Expected WC, WZ, or WCZ');
        }
        break;
      case eValueType.operand_pinop:
        // pinop d/#0..511 (wc,wz or none)
        this.tryDImmediate(18);
        this.tryWCZ();
        break;
      case eValueType.operand_testp:
        // testp d/#0..511 (wc/andc/orc/xorc or wz/andz/orz/xorz}
        {
          this.tryDImmediate(18);
          const logicFunction = this.getCorZ();
          this.instructionImage |= logicFunction << 1;
        }
        break;
      case eValueType.operand_pushpop:
        // push/pop
        {
          const flags = this.instructionImage & 0xf0000000;
          switch (this.instructionImage & 0b11) {
            case 0b00:
              this.instructionImage = flags | 0x0c640161; // PUSHA  D/# --> WRLONG  D/#,PTRA++
              this.tryDImmediate(19);
              break;
            case 0b01:
              this.instructionImage = flags | 0x0c6401e1; // PUSHB  D/# --> WRLONG  D/#,PTRB++
              this.tryDImmediate(19);
              break;
            case 0b10:
              this.instructionImage = flags | 0x0b04015f; // POPA D --> RDLONG  D,--PTRA
              this.tryD();
              break;
            case 0b11:
              this.instructionImage = flags | 0x0b0401df; // POPB D --> RDLONG  D,--PTRB
              this.tryD();
              break;
          }
        }
        break;
      case eValueType.operand_xlat:
        // inst [RET*, RES*, XSTOP]
        {
          const flags = this.instructionImage & 0xf0000000;
          switch (this.instructionImage & 0b1111) {
            case 0b0000:
              this.instructionImage = flags | 0x0d64002d; // RET
              break;
            case 0b0001:
              this.instructionImage = flags | 0x0d64002e; // RETA
              break;
            case 0b0010:
              this.instructionImage = flags | 0x0d64002f; // RETB
              break;
            case 0b0011:
              this.instructionImage = flags | 0x0b3bffff; // RETI0  -->  CALLD INB,INB   WCZ
              break;
            case 0b0100:
              this.instructionImage = flags | 0x0b3bfff5; // RETI1  -->  CALLD INB,$1F5  WCZ
              break;
            case 0b0101:
              this.instructionImage = flags | 0x0b3bfff3; // RETI2  -->  CALLD INB,$1F3  WCZ
              break;
            case 0b0110:
              this.instructionImage = flags | 0x0b3bfff1; // RETI3  -->  CALLD INB,$1F1  WCZ
              break;
            case 0b0111:
              this.instructionImage = flags | 0x0b3bfdff; // RESI0  -->  CALLD INA,INB   WCZ
              break;
            case 0b1000:
              this.instructionImage = flags | 0x0b3be9f5; // RESI1  -->  CALLD $1F4,$1F5 WCZ
              break;
            case 0b1001:
              this.instructionImage = flags | 0x0b3be5f3; // RESI2  -->  CALLD $1F2,$1F3 WCZ
              break;
            case 0b1010:
              this.instructionImage = flags | 0x0b3be1f1; // RESI3  -->  CALLD $1F0,$1F1 WCZ
              break;
            case 0b1011:
              this.instructionImage = flags | 0x0cac0000; // XSTOP  -->  XINIT #0,#0
              break;
            default:
              // [error_INTERNAL]
              throw new Error('[CODE] unexpected XLAT instruction');
              break;
          }
        }
        break;
      case eValueType.operand_akpin:
        // akpin s/#
        this.instructionImage = (this.instructionImage & 0xf0000000) | 0x0c080200; // wrpin #1,s/#
        this.trySImmediate();
        break;
      case eValueType.operand_asmclk:
        // asmclk
        if (this.clkMode & 0b10) {
          let asmCondition = (this.instructionImage >> 28) & 0x0f;
          const retAsmCondition = asmCondition;
          // handle _RET_ in a special way, all but last two of six instructions use _ALWAYS_ while the last two use _RET_
          if (retAsmCondition == 0) {
            asmCondition = 0xf; // _ALWAYS_
          }
          //const instructionCondition: number = (asmCondition == eValueType.if_ret ? eValueType.if_always : asmCondition) << 28;
          const instructionCondition: number = asmCondition << 28;
          // assemble 'hubset ##clkmode & $ffff_fffc'
          this.instructionImage = instructionCondition | 0x0d640000 | ((this.clkMode & 0x1fc) << 9);
          this.emitAugDS(eAugType.AT_D, this.clkMode);
          this.enterDataLong(BigInt(this.instructionImage));
          // assemble 'waitx ##20_000_000/100' - (10ms to switch)
          const waitTime: number = 20000000 / 100;
          this.instructionImage = instructionCondition | 0x0d64001f | ((waitTime & 0x1ff) << 9);
          this.emitAugDS(eAugType.AT_D, waitTime);
          this.enterDataLong(BigInt(this.instructionImage));
          // assemble 'hubset ##clkmode'
          this.instructionImage = (retAsmCondition << 28) | 0x0d640000 | ((this.clkMode & 0x1ff) << 9);
          this.emitAugDS(eAugType.AT_D, this.clkMode);
        } else {
          // rcfast/rcslow, assemble 'hubset #0/1'
          this.instructionImage |= 0xd640000 | ((this.clkMode & 1) << 9);
        }
        break;
      case eValueType.operand_nop:
        // nop
        {
          //const currInstruValue: number = (this.instructionImage >> 28) & 0xf;
          //this.logMessage(`* operand_nop: instructionImage=[${hexString(currInstruValue)}]`);
          if (((this.instructionImage >> 28) & 0b1111) != eValueType.if_always) {
            // [error_nchcor]
            throw new Error('NOP cannot have a condition or _RET_');
          }
          this.instructionImage = 0x00000000;
        }
        break;
      case eValueType.operand_debug: // we have break register 0
        {
          this.logMessage(`  -- at operand_debug:`);
          const asmCondition = (this.instructionImage >> 28) & 0x0f;
          if (asmCondition > 0x0 && asmCondition < 0xf) {
            // [error_dcbpbac]
            throw new Error('DEBUG cannot be preceded by a condition, except _RET_');
          }
          if (this.context.compileOptions.enableDebug == false) {
            this.logMessage(`  -- DEBUG is OFF`);
            this.skipToEnd();
            skipInstructionGeneration = true;
          } else {
            this.logMessage(`  -- DEBUG is ON`);
            // head debug() in assembly code
            if (this.checkLeftParen() == false) {
              // have 'debug' without ()
              // keeping condition value, convert to BRK #0 (break immediate 0)
              this.logMessage(`  -- NO open paren`);
              this.instructionImage |= 1 << 18;
              this.getEndOfLine(); // throw exception if NOT end of line!
              this.backElement(); // allow our effects check to work but do nothing!
            } else {
              this.logMessage(`  -- found open paren pass=(${pass})`);
              // here is debug() - PNut @@debugleft:
              if (pass == 0) {
                this.skipToEnd();
                //this.backElement(); // TODO: bad?
                // allow instruction generation to avoid pass phase error
              } else {
                // PNut @@debugpass1:
                const breakCode = this.ci_debug_asm();
                // keeping condition value, convert to given BRK n immediate
                this.instructionImage |= (1 << 18) | (breakCode << 9);
                this.getEndOfLine(); // throw exception if NOT end of line!
                this.backElement(); // allow our effects check to work but do nothing!
              }
            }
          }
        }
        break;

      default:
        // [error_INTERNAL]
        throw new Error(`ERROR[INTERNAL] unknown operandType=(${operandType}(${hexLong(operandType, '0x')}))`);

        break;
    }
    // end of line or have effect?
    this.logMessage(`  -- AInstruFmLn() should be at end - elem=[${this.currElement.toString()}]`);
    if (this.nextElementType() != eElementType.type_end) {
      // we have an effect!
      this.getElement();
      if (this.currElement.type != eElementType.type_asm_effect) {
        // [error_eaaeoeol]
        throw new Error('Expected an assembly effect or end of line');
      }
      const attemptedEffects = Number(this.currElement.value);
      // can we use an effect?
      if ((attemptedEffects & allowedEffects) == 0 || (attemptedEffects == 0b11 && allowedEffects != 0b11)) {
        // [error_teinafti]
        throw new Error('This effect is not allowed for this instruction');
      }
      // encode effects into instruction
      this.instructionImage |= attemptedEffects << 19;
    }
    // if we are not handling debug() we may need to skip instru. generation
    if (skipInstructionGeneration == false) {
      // write instruction to obj image
      this.enterDataLong(BigInt(this.instructionImage));
    }
  }

  private tryD() {
    // look for d (of d,s)
    let value: number = this.tryValueReg();
    this.instructionImage |= value << 9;
  }

  private tryDImmediate(immediateBitNumber: number) {
    // look for d (of d,s)
    if (this.checkPound()) {
      // set the immediate bit
      this.instructionImage |= 1 << immediateBitNumber;
      if (this.checkPound()) {
        // have '##' (big immediate) case
        const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
        // emit AUGD Instruction
        this.emitAugDS(eAugType.AT_D, Number(valueResult.value));
        // place remainder in D field
        this.instructionImage |= (Number(valueResult.value) & 0x1ff) << 9;
      } else {
        // have '#' (immediate) case
        const valueCon = this.tryValueCon();
        // place constant in D field
        this.instructionImage |= valueCon << 9;
      }
    } else {
      // have register case
      this.tryD();
    }
  }

  private tryS() {
    // look for s (of d,s)
    let value: number = this.tryValueReg();
    this.instructionImage |= value;
  }

  private trySImmediate() {
    // look for s (of d,s)
    if (this.checkPound()) {
      // set the immediate bit
      this.instructionImage |= 1 << 18;
      if (this.checkPound()) {
        // have '##' (big immediate) case
        const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
        // emit AUGD or AUGS Instruction
        this.emitAugDS(eAugType.AT_S, Number(valueResult.value));
        // place remainder in S field
        this.instructionImage |= Number(valueResult.value) & 0x1ff;
      } else {
        // have '#' (immediate) case
        const valueCon = this.tryValueCon();
        // place constant in S field
        this.instructionImage |= valueCon;
      }
    } else {
      // have register case
      this.tryS();
    }
  }

  private trySRel() {
    // look for s relative address if immediate
    let branchAddress: number = 0;
    if (this.checkPound()) {
      // set the immediate bit
      this.instructionImage |= 1 << 18;
      if (this.checkPound()) {
        // this is our '##' case
        const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
        // tryS_rel32:
        if (this.pasmResolveMode == eResolve.BR_Must) {
          this.checkCogHubCrossing(Number(valueResult.value));
          branchAddress = Number(valueResult.value) << (this.hubMode ? 0 : 2);
          const orgAddress = this.hubMode ? this.hubOrg : this.cogOrg;
          branchAddress -= orgAddress + 8;
          if (branchAddress & 0b11) {
            // [error_rainawi]
            throw new Error('Relative address is not aligned with instruction');
          }
          branchAddress = (branchAddress >> 2) & (0xfffff >> 2);
        }
        this.emitAugDS(eAugType.AT_S, branchAddress);
        this.instructionImage |= branchAddress & 0x1ff;
      } else {
        // this is our '#' case
        const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
        if (this.pasmResolveMode == eResolve.BR_Must) {
          this.checkCogHubCrossing(Number(valueResult.value));
          branchAddress = (this.hubMode ? Number(valueResult.value) - this.hubOrg : (Number(valueResult.value) << 2) - this.cogOrg) - 4;
          this.logMessage(`* trySRel() hubMode=(${this.hubMode}) value=${hexString(valueResult.value)}, branchAddress=${hexString(branchAddress)}`);
          if (branchAddress & 0b11) {
            // [error_rainawi]
            throw new Error('Relative address is not aligned with instruction');
          }
          // check signed number
          // TODO: watch that this doesn't do weird stuff! (fix math if does!)
          branchAddress >>= 2;
          if (branchAddress < -0x100 || branchAddress > 0xff) {
            // [error_raioor]
            throw new Error('Relative address is out of range');
          }
        }
        this.instructionImage |= branchAddress & 0x1ff;
      }
    } else {
      // have register case
      this.tryS();
    }
  }

  private tryImmediateOrRelative(): [boolean, number] {
    let foundRelativeStatus: boolean = false; // we default to relative
    let address: number = 0;
    // check for '\' absolute override
    const backslashFound: boolean = this.checkBackslash(); // and remove backslash if found
    const addressResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
    address = Number(addressResult.value);
    if (address > 0xfffff) {
      // [error_amnex]
      throw new Error('Address must not exceed $FFFFF (m001)');
    }
    foundRelativeStatus = backslashFound ? false : this.hubMode ? address >= 0x400 : address < 0x400;
    this.logMessage(`tryImmediateOrRelative() foundBack=(${backslashFound}), foundRelative=(${foundRelativeStatus}), address=(${address})`);
    return [foundRelativeStatus, address];
  }

  private branchImmediateOrRelative() {
    let [isRelativeAddress, address] = this.tryImmediateOrRelative();
    if (isRelativeAddress) {
      address = (this.hubMode ? address - (this.hubOrg + 4) : (address << 2) - (this.cogOrg + 4)) & 0xfffff;
      this.instructionImage |= 1 << 20;
    }
    this.instructionImage |= address;
  }

  private tryPtraPtrb() {
    // @@chkpab:
    // check for ptra/ptrb expression
    let ptrFound: boolean = true;
    let ptrBits: number = 0; // work area for instruction bits

    this.getElement(); // get pre incr/decr or ptra/ptrb
    // check for pre increment/decrement of ptra/ptrb
    if (this.currElement.type == eElementType.type_inc) {
      // have ++(ptra/ptrb)?
      this.getElement(); // get ptra/ptrb
      const [foundPtr, ptrSelectBit] = this.checkPtr();
      if (foundPtr) {
        // ++ptra/ptrb, set update bit, set index to +1
        ptrBits |= ptrSelectBit | 0x40 | 0x01;
      } else {
        // no pointer found (not (++)ptra/ptrb, back up)
        this.backElement();
        this.backElement();
        ptrFound = false;
      }
    } else if (this.currElement.type == eElementType.type_dec) {
      // have --(ptra/ptrb)?
      this.getElement(); // get ptra/ptrb
      const [foundPtr, ptrSelectBit] = this.checkPtr();
      if (foundPtr) {
        // --ptra/ptrb, set update bit, set index to -1
        ptrBits |= ptrSelectBit | 0x40 | 0x1f;
      } else {
        // no pointer found (not (--)ptra/ptrb, back up)
        this.backElement();
        this.backElement();
        ptrFound = false;
      }
    } else {
      // curr element is ptra/ptrb...
      const [foundPtr, ptrSelectBit] = this.checkPtr();
      if (foundPtr) {
        // we have a ptr, do we have post incr or decr?
        this.currElement = this.getElement();
        if (this.currElement.type == eElementType.type_inc) {
          // ptra/ptrb++, set update and post bits, set index to +1
          ptrBits |= ptrSelectBit | 0x40 | 0x20 | 0x01;
        } else if (this.currElement.type == eElementType.type_dec) {
          // ptra/ptrb--, set update and post bits, set index to -1
          ptrBits |= ptrSelectBit | 0x40 | 0x20 | 0x1f;
        } else {
          // no post ++/--, return this element
          this.backElement();
          ptrBits |= ptrSelectBit;
        }
      } else {
        // no ptra/ptrb(++/--), back up
        this.backElement();
        ptrFound = false;
      }
    }
    this.logMessage(`* tryPtraPtrb() ptrBits=[${hexString(ptrBits)}], ptrFound=(${ptrFound})`);
    if (ptrFound) {
      // @@trys_imm_pab:
      ptrBits |= (1 << 18) | 0x100;
      // if we have index value...
      if (this.checkLeftBracket()) {
        // .. check for pound, pound index value
        if (this.checkPound()) {
          this.getPound(); // our second '#' MUST be here
          // this is our '##' case (20-bit index value)
          const indexResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          let indexValue: number = Number(this.signExtendFrom32Bit(indexResult.value));
          if ((ptrBits & (0x40 | 0x10)) == (0x40 | 0x10)) {
            indexValue = -indexValue;
          }
          ptrBits = ((0x100 | (ptrBits & 0xe0)) << (20 - 5)) | (indexValue & 0xfffff);
          this.emitAugDS(eAugType.AT_S, ptrBits);
          // set immediate bit, install lower 9 bits of constant
          this.instructionImage |= (1 << 18) | (ptrBits &= 0x1ff);
          ptrBits = 0; // prevent ptrBits from being ORd-in again later
        } else {
          // no '##' (single '#' was never allowed)
          // set immediate bit and ptra/ptrb bit
          const indexResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          const indexValue: number = Number(this.signExtendFrom32Bit(indexResult.value));
          // is positive value
          if (ptrBits & 0x40) {
            // we are modifying...
            if (indexValue < 1 || indexValue > 16) {
              // [error_picmr116]
              throw new Error('PTRA/PTRB index constant must range from 1 to 16');
            }
            ptrBits = (ptrBits & 0xffffffe0) | (ptrBits & 0x10 ? -indexValue & 0x1f : indexValue & 0x0f);
          } else {
            // not modifying, have negative-to-positive case
            if (indexValue < -32 || indexValue > 31) {
              // [error_picmr6b]
              throw new Error('PTRA/PTRB index constant must range from -32 to 31');
            }
            ptrBits = (ptrBits & 0xffffffc0) | (indexValue & 0x3f);
          }
        }
        this.getRightBracket();
      }
      this.instructionImage |= ptrBits;
    } else {
      // no ptr value or index value?!
      // .. check for pound..
      if (this.checkPound()) {
        this.instructionImage |= 1 << 18;
        if (this.checkPound()) {
          // this is our '##' case (20-bit index value)
          const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          this.emitAugDS(eAugType.AT_S, Number(valueResult.value));
          // install lower 9 bits of constant
          this.instructionImage |= Number(valueResult.value) & 0x1ff;
        } else {
          // have '#' but constrained to 8-bit value! (not 9-bit)
          const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
          const value = Number(valueResult.value);
          if (value > 255) {
            // [error_cmbf0t255]
            throw new Error('Constant must be from 0 to 255');
          }
          this.instructionImage |= value;
        }
      } else {
        this.tryS();
      }
    }
  }

  private checkPtr(): [boolean, number] {
    let foundPtr: boolean = false;
    let ptrSelectBit: number = 0;
    if (this.currElement.type == eElementType.type_register) {
      const regValue: number = Number(this.currElement.value);
      if ((regValue & 0x1fe) == 0x1f8) {
        ptrSelectBit = (regValue & 0x001) << 7;
        foundPtr = true;
      }
    }
    this.logMessage(`* checkPtr() regValue=[${hexString(this.currElement.value)}], ptrSelectBit=[${ptrSelectBit}], foundPtr=(${foundPtr})`);
    return [foundPtr, ptrSelectBit];
  }

  private checkCogHubCrossing(address: number) {
    if (this.hubMode ? address < 0x400 : address >= 0x400) {
      // [error_racc]
      throw new Error('Relative addresses cannot cross between cog and hub domains');
    }
  }

  private tryWCZ() {
    // if we have an upcoming WCZ request (ONLY!)
    if (this.nextElementType() == eElementType.type_asm_effect && this.nextElementValue() == 0b11) {
      this.getElement();
      // encode effects into instruction
      this.instructionImage |= 0b11 << 19;
    }
  }

  private getCorZ(): number {
    // return asmCondition if present?
    let logicFunction: number = 0b00;
    this.getElement();
    if (
      this.currElement.type == eElementType.type_asm_effect2 ||
      (this.currElement.type == eElementType.type_asm_effect && Number(this.currElement.value) != 0b11)
    ) {
      this.instructionImage |= (Number(this.currElement.value) & 0b11) << 19;
      logicFunction = Number(this.currElement.value) >> 2;
    } else {
      // [error_ewaox]
      throw new Error('Expected WC, WZ, ANDC, ANDZ, ORC, ORZ, XORC, or XORZ');
    }
    return logicFunction;
  }

  private emitAugDS(augType: eAugType, augValue: number) {
    // set aug form
    let augInstruction: number = augType == eAugType.AT_S ? 0x0f000000 : 0x0f800000;
    // copy our condition bits
    //  NOTE: if instruction condition is a _ret_, force always
    const asmCondition = (this.instructionImage >> 28) & 0x0f;
    augInstruction |= (asmCondition == eValueType.if_ret ? eValueType.if_always : asmCondition) << 28;
    // insert our aug value
    augInstruction |= (augValue >> 9) & 0x7fffff;
    // write instruction to obj image
    this.enterDataLong(BigInt(augInstruction));
  }

  private tryValueReg(): number {
    // return value [0x000-0x1ff]
    const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
    if (valueResult.value > BigInt(0x1ff)) {
      // [error_rcex]
      throw new Error('Register cannot exceed $1FF');
    }
    return Number(valueResult.value);
  }

  private tryValueCon(): number {
    // return value [0-511]
    this.logMessage(`* tryValueCon() - ENTRY`);
    const valueResult = this.getValue(eMode.BM_OperandIntOnly, this.pasmResolveMode);
    if (valueResult.value > 511n) {
      // [error_cmbf0t511]
      throw new Error('Constant must be from 0 to 511 (m040)');
    }
    this.logMessage(`* tryValueCon() - EXIT`);
    return Number(valueResult.value);
  }

  private checkInstruction(): [boolean, number] {
    let instructionFoundStatus: boolean = true;
    let instructionValue: number = 0;
    let needAsmLookup: boolean = false;
    if (this.currElement.type == eElementType.type_asm_inst) {
      instructionValue = Number(this.currElement.value);
    } else if (this.currElement.type == eElementType.type_op) {
      needAsmLookup = true;
      switch (this.currElement.operation) {
        case eOperationType.op_abs:
          instructionValue = eAsmcode.ac_abs;
          break;
        case eOperationType.op_encod:
          instructionValue = eAsmcode.ac_encod;
          break;
        case eOperationType.op_decod:
          instructionValue = eAsmcode.ac_decod;
          break;
        case eOperationType.op_bmask:
          instructionValue = eAsmcode.ac_bmask;
          break;
        case eOperationType.op_ones:
          instructionValue = eAsmcode.ac_ones;
          break;
        case eOperationType.op_qlog:
          instructionValue = eAsmcode.ac_qlog;
          break;
        case eOperationType.op_qexp:
          instructionValue = eAsmcode.ac_qexp;
          break;
        case eOperationType.op_sar:
          instructionValue = eAsmcode.ac_sar;
          break;
        case eOperationType.op_ror:
          instructionValue = eAsmcode.ac_ror;
          break;
        case eOperationType.op_rol:
          instructionValue = eAsmcode.ac_rol;
          break;
        case eOperationType.op_rev:
          instructionValue = eAsmcode.ac_rev;
          break;
        case eOperationType.op_zerox:
          instructionValue = eAsmcode.ac_zerox;
          break;
        case eOperationType.op_signx:
          instructionValue = eAsmcode.ac_signx;
          break;
        case eOperationType.op_sca:
          instructionValue = eAsmcode.ac_sca;
          break;
        case eOperationType.op_scas:
          instructionValue = eAsmcode.ac_scas;
          break;

        default:
          instructionFoundStatus = false;
          break;
      }
      // some instructions have alias... we have to handle these differently
      if (instructionFoundStatus == false) {
        instructionFoundStatus = true;
        if (this.currElement.isAlias == false) {
          switch (this.currElement.operation) {
            case eOperationType.op_lognot:
              instructionValue = eAsmcode.ac_not;
              break;
            case eOperationType.op_logand:
              instructionValue = eAsmcode.ac_and;
              break;
            case eOperationType.op_logxor:
              instructionValue = eAsmcode.ac_xor;
              break;
            case eOperationType.op_logor:
              instructionValue = eAsmcode.ac_or;
              break;

            default:
              instructionFoundStatus = false;
              break;
          }
        }
      }
    } else if (this.currElement.type == eElementType.type_i_flex) {
      this.logMessage(`* checkInstruction() flexCode=(${this.currElement.flexByteCode})[${eByteCode[this.currElement.flexByteCode]}]`);
      needAsmLookup = true;
      switch (this.currElement.flexByteCode) {
        case eByteCode.bc_hubset:
          instructionValue = eAsmcode.ac_hubset;
          break;
        case eByteCode.bc_coginit:
          instructionValue = eAsmcode.ac_coginit;
          break;
        case eByteCode.bc_cogstop:
          instructionValue = eAsmcode.ac_cogstop;
          break;
        case eByteCode.bc_cogid:
          instructionValue = eAsmcode.ac_cogid;
          break;
        case eByteCode.bc_getrnd:
          instructionValue = eAsmcode.ac_getrnd;
          break;
        case eByteCode.bc_getct:
          instructionValue = eAsmcode.ac_getct;
          break;
        case eByteCode.bc_wrpin:
          instructionValue = eAsmcode.ac_wrpin;
          break;
        case eByteCode.bc_wxpin:
          instructionValue = eAsmcode.ac_wxpin;
          break;
        case eByteCode.bc_wypin:
          instructionValue = eAsmcode.ac_wypin;
          break;
        case eByteCode.bc_akpin:
          instructionValue = eAsmcode.ac_akpin;
          break;
        case eByteCode.bc_rdpin:
          instructionValue = eAsmcode.ac_rdpin;
          break;
        case eByteCode.bc_rqpin:
          instructionValue = eAsmcode.ac_rqpin;
          break;
        case eByteCode.bc_locknew:
          instructionValue = eAsmcode.ac_locknew;
          break;
        case eByteCode.bc_lockret:
          instructionValue = eAsmcode.ac_lockret;
          break;
        case eByteCode.bc_locktry:
          instructionValue = eAsmcode.ac_locktry;
          break;
        case eByteCode.bc_lockrel:
          instructionValue = eAsmcode.ac_lockrel;
          break;
        case eByteCode.bc_cogatn:
          instructionValue = eAsmcode.ac_cogatn;
          break;
        case eByteCode.bc_pollatn:
          instructionValue = eAsmcode.ac_pollatn;
          break;
        case eByteCode.bc_waitatn:
          instructionValue = eAsmcode.ac_waitatn;
          break;
        case eByteCode.bc_call:
          instructionValue = eAsmcode.ac_call;
          break;

        default:
          instructionFoundStatus = false;
          break;
      }
    } else if (this.currElement.type == eElementType.type_debug) {
      needAsmLookup = true;
      instructionValue = eAsmcode.ac_debug;
    } else {
      instructionFoundStatus = false;
    }
    if (instructionFoundStatus == true && needAsmLookup) {
      // get asmCode values for type_op, and type_i_flex
      instructionValue = this.spinSymbolTables.asmcodeValue(instructionValue);
    }
    this.logMessage(`* checkInstruction() instructionFoundStatus=(${instructionFoundStatus}), instructionValue=(${hexString(instructionValue)})`);
    return [instructionFoundStatus, instructionValue];
  }

  private errorIfSymbol() {
    // for certain symbols: FIT,
    // we throw an error if preceeded by a symbol name
    if (this.weHaveASymbol) {
      // [error_tdcbpbas]
      throw new Error('This directive cannot be preceded by a symbol');
    }
  }

  private enterDataByte(byteValue: bigint) {
    this.enterData(byteValue, eWordSize.WS_Byte, 1, false);
  }

  private enterDataLong(longValue: bigint) {
    this.enterData(longValue, eWordSize.WS_Long, 1, false);
  }

  private enterData(value: bigint, currSize: eWordSize, multiplier: number, fitToSize: boolean) {
    // TODO: possible rename to emitData
    this.logMessage(`  -- enterData() - ENTRY`);
    if (multiplier > 0) {
      if (fitToSize) {
        const isNegative = value & BigInt(0x80000000);
        switch (currSize) {
          case eWordSize.WS_Byte:
            // -128 to +255 (-$80 to $FF)
            if (isNegative ? value < BigInt(0xffffff80) : value > BigInt(0xff)) {
              // [error_bmbft]
              throw new Error('BYTEFIT values must range from -$80 to $FF');
            }
            break;

          case eWordSize.WS_Word:
            // -$8000 to $FFFF
            if (isNegative ? value < BigInt(0xffff8000) : value > BigInt(0xffff)) {
              // [error_wmbft]
              throw new Error('WORDFIT values must range from -$8000 to $FFFF');
            }
            break;
        }
      }

      // write multiplier occurrences of value to our object
      for (let index = 0; index < multiplier; index++) {
        for (let byteIndex = 0; byteIndex < 1 << currSize; byteIndex++) {
          this.objImage.append((Number(value) >> (byteIndex << 3)) & 0xff);
          if (this.hubMode) {
            // in HUB mode
            this.hubOrg++;
            if (this.hubOrg > this.hubOrgLimit) {
              // [error_hael]
              throw new Error('Hub address exceeds limit');
            }
          } else {
            // in COG mode
            this.cogOrg++;
            if (this.cogOrg > this.cogOrgLimit) {
              // [error_cael]
              throw new Error('Cog address exceeds limit (m022)');
            }
          }
        }
      }
    }
    this.logMessage(`  -- enterData() - EXIT`);
  }

  private compile_sub_blocks_id() {
    // Compile sub blocks - id only
    // PNut compile_sub_blocks_id:
    if (this.pasmMode == false) {
      this.logMessage('*==* COMPILE_sub_blocks_id()');
      const subStartIndex: number = this.objImage.offset >> 2;
      // compile PUB blocks
      const pubsFound = this.compilePubPriBlocksId(eBlockType.block_pub, subStartIndex);
      // if we didn't find any PUB blocks
      if (pubsFound == false) {
        // [error_npmf]
        throw new Error('No PUB method or DAT block found');
      }
      // compile PRI blocks
      this.compilePubPriBlocksId(eBlockType.block_pri, subStartIndex);
      this.objWrLong(0); // enter 0 (future size) into index
    }
  }

  private compilePubPriBlocksId(blockType: eBlockType, subStartIndex: number): boolean {
    // here is compile_sub_blocks_id: @@compile
    // this locates PUB and PRI blocks, validates and emits symbols and obj public interface
    let foundBlocksStatus: boolean = false;
    let parameterCount: number = 0;
    let resultCount: number = 0;

    this.restoreElementLocation(0); // start from first in list
    while (this.nextBlock(blockType)) {
      // here is @@nextblock:
      this.getElement();
      if (this.currElement.type != eElementType.type_undefined) {
        // [error_eaumn]
        throw new Error('Expected a unique method name');
      }
      // here is @@newsub:
      const symbolName: string = this.currElement.stringValue;
      parameterCount = 0;
      resultCount = 0;
      this.getLeftParen();
      if (this.checkRightParen() == false) {
        // have parameters
        // here is @@param:
        do {
          this.getElement();
          if (this.currElement.type != eElementType.type_undefined) {
            // [error_eaupn]
            throw new Error('Expected a unique parameter name (m0C0)');
          }
          parameterCount++;
          if (parameterCount > this.params_limit) {
            // [error_loxpe]
            throw new Error(`Limit of ${this.params_limit} parameters exceeded`);
          }
        } while (this.getCommaOrRightParen());
      }
      // no parameters
      // here is @@noparams:
      if (this.checkColon()) {
        // here is @@result:
        do {
          this.getElement();
          if (this.currElement.type != eElementType.type_undefined) {
            // [error_eaurn]
            throw new Error('Expected a unique result name (m0D0)');
          }
          resultCount++;
          if (resultCount > this.results_limit) {
            // [error_loxre]
            throw new Error(`Limit of ${this.results_limit} results exceeded`);
          }
        } while (this.checkComma());
      }
      // here is @@noresults
      // do we have any local variables...
      if (this.getPipeOrEnd()) {
        // have locals
        do {
          // here is @@local:
          this.currElement = this.getElement(); // assignment gets past lint warning
          const [foundAlign, alignMask] = this.checkAlign(); // alignw, alignl?
          if (foundAlign) {
            this.getElement(); // skip alignw/alignl
          }
          // here is @@noalign:
          if (this.currElement.type == eElementType.type_size) {
            this.getElement(); // skip BYTE/WORD/LONG
          }
          if (this.currElement.type != eElementType.type_undefined) {
            // [error_eauvnsa]
            throw new Error('Expected a unique variable name, BYTE, WORD, LONG, ALIGNW, or ALIGNL (m0E1)');
          }
          // if array index, skip it
          if (this.checkLeftBracket()) {
            this.scanToRightBracket();
          }
        } while (this.getCommaOrEndOfLine());
      }
      // here is @@nolocals:
      const subIndex: number = this.objImage.offset >> 2;
      if (subIndex - subStartIndex > this.subs_limit) {
        // [error_loxppme]
        throw new Error(`Limit of ${this.subs_limit} PUB/PRI methods exceeded`);
      }
      const symMethodDetails: number = (parameterCount << 24) | (resultCount << 20) | subIndex;
      const newSymbol: iSymbol = { name: symbolName, type: eElementType.type_method, value: BigInt(symMethodDetails) };
      //this.logMessage(`* compilePubPriBlocksId() calling record symbol [${newSymbol}]`);
      this.recordSymbol(newSymbol); // PUB/PRI symbol name
      const objMethodDetails: number = 0x80000000 | (parameterCount << 24) | (resultCount << 20);
      this.objWrLong(objMethodDetails);
      // if we have a PUB method...
      if (blockType == eBlockType.block_pub) {
        // record Objects' PUB method details: symbol, number results, number parameters
        this.objWrPubSymbol(symbolName, resultCount, parameterCount);
      }
      // here is @@notpub:
      foundBlocksStatus = true;
    }

    return foundBlocksStatus;
  }

  private compile_sub_blocks() {
    // Compile sub blocks
    // PNut compile_sub_blocks:
    if (this.pasmMode == false) {
      this.logMessage('*==* COMPILE_sub_blocks()');
      // compile PUB blocks
      const lastPubSymbolValue = this.compilePubPriBlocks(eBlockType.block_pub);
      // compile PRI blocks
      const lastPriSymbolValue = this.compilePubPriBlocks(eBlockType.block_pri);
      // here is @@enteroffset
      const finalSymbolValue = lastPriSymbolValue == 0 ? lastPubSymbolValue : lastPriSymbolValue;
      /// record the final object image offset into the last symbol entry
      const longAddress: number = ((finalSymbolValue + 1) & 0xfffff) << 2;
      const currLongValue: number = this.objImage.readLong(longAddress);
      this.objImage.replaceLong(currLongValue | this.objImage.offset, longAddress);
    }
  }

  private compilePubPriBlocks(blockType: eBlockType): number {
    // here is compile_sub_blocks: @@compile
    let localOffset: number = 0;
    let localVariableOffset: number = 0;
    let methodDetails: number = 0; // this is @@sub

    this.restoreElementLocation(0); // start from first in list
    while (this.nextBlock(blockType)) {
      // here is @@nextblock:
      this.activeSymbolTable = eSymbolTableId.STI_LOCAL;

      this.getElement();
      methodDetails = Number(this.currElement.bigintValue); // this is @@sub
      localOffset = 0;

      this.getLeftParen();
      if (this.checkRightParen() == false) {
        // have parameters
        // here is @@parameter:
        do {
          this.getElement();
          if (this.currElement.type != eElementType.type_undefined) {
            // [error_eaupn]
            throw new Error('Expected a unique parameter name (m0C1)');
          }
          const newParameterSymbol: iSymbol = { name: this.currElement.stringValue, type: eElementType.type_loc_long, value: BigInt(localOffset) };
          //this.logMessage(`* compilePubPriBlocks() calling record symbol [${newSymbol}]`);
          this.recordSymbol(newParameterSymbol); // parameter symbol name
          localOffset += 4; // we wrote LONG
        } while (this.getCommaOrRightParen());
      }
      // no parameters
      // here is @@noparams:
      if (this.checkColon()) {
        // here is @@result:
        do {
          this.getElement();
          if (this.currElement.type != eElementType.type_undefined) {
            // [error_eaurn]
            throw new Error('Expected a unique result name (m0D1)');
          }
          const newReturnSymbol: iSymbol = { name: this.currElement.stringValue, type: eElementType.type_loc_long, value: BigInt(localOffset) };
          //this.logMessage(`* compilePubPriBlocks() calling record symbol [${newSymbol}]`);
          this.recordSymbol(newReturnSymbol); // return symbol name
          localOffset += 4; // we wrote LONG
        } while (this.checkComma());
      }
      // here is @@noresult
      // do we have any local variables...
      localVariableOffset = localOffset;
      if (this.getPipeOrEnd()) {
        // have locals
        do {
          // here is @@variable:
          this.currElement = this.getElement(); // assignment gets past lint warning
          const [foundAlign, alignMask] = this.checkAlign(); // alignw, alignl?
          if (foundAlign) {
            if (localOffset & alignMask) {
              localOffset = (localOffset | alignMask) + 1;
            }
            // here is @@aligned:
            this.getElement(); // skip alignw/alignl
          }
          // here is @@noalign:
          let currSize: eWordSize = eWordSize.WS_Long;
          if (this.currElement.type == eElementType.type_size) {
            currSize = Number(this.currElement.bigintValue);
            this.getElement(); // skip BYTE/WORD/LONG
          }
          const currType: eElementType = eElementType.type_loc_byte + currSize;
          if (this.currElement.type != eElementType.type_undefined) {
            // [error_eauvnsa]
            throw new Error('Expected a unique variable name, BYTE, WORD, LONG, ALIGNW, or ALIGNL (m0E2)');
          }
          const newLocalSymbol: iSymbol = { name: this.currElement.stringValue, type: currType, value: BigInt(localOffset) };
          //this.logMessage(`* compilePubPriBlocks() calling record symbol [${newSymbol}]`);
          this.recordSymbol(newLocalSymbol); // return symbol name
          let currArraySize: number = 1;
          // if array index, skip it
          if (this.checkLeftBracket()) {
            const valueReturn: iValueReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
            currArraySize = Number(valueReturn.value);
            this.getRightBracket();
          }
          localOffset += (1 << currSize) * currArraySize;
          if (localOffset > this.locals_limit) {
            // [error_loxlve]
            throw new Error('Limit of 64KB of local variables exceeded');
          }
        } while (this.getCommaOrEndOfLine());
      }
      // here is @@novariables:
      /// record the final object image offset into the last symbol entry
      const longAddress: number = (methodDetails & 0xfffff) << 2;
      const currLongValue: number = this.objImage.readLong(longAddress);
      this.objImage.replaceLong(currLongValue | this.objImage.offset, longAddress);
      let localSize: number = localOffset - localVariableOffset;
      if (localSize & 0b11) {
        localSize += 4; // add a long (we'll round extra off later)
      }
      this.compileRfvar(BigInt(localSize >> 2));
      const methodResultCount: number = (methodDetails >> 20) & 0x0f;
      this.subResults = methodResultCount;
      this.compileTopBlock(); // compile top instruction block
      // TODO: this is where INFO data would be recorded FIXME: do we want to do this? add later
      this.localSymbols.reset();
      this.activeSymbolTable = eSymbolTableId.STI_MAIN;
    }
    return methodDetails;
  }

  // ---------------------------------------------------------------
  // Instruction Block Compiler
  // ---------------------------------------------------------------

  private compileTopBlock() {
    // Compile instruction block
    // PNut compile_top_block:
    this.logMessage(`*==* compileTopBlock()`);
    this.blockStack.reset();
    this.setScopeColumn(0); // effectively -1
    this.compileBlock(this.scopeColumn); // effectively -1
    this.objWrByte(eByteCode.bc_return_results);
    this.logMessage(`* compileTopBlock() endBlock at offset=(${this.objImage.offsetHex})`);
  }

  private compileBlock(startingColumn: number) {
    // PNut compile_block:
    const savedScopeColumn: number = startingColumn;
    this.setScopeColumn(startingColumn); // effectively -1

    const nextElement: SpinElement = this.peekNextElement();
    this.logMessage(`*==* compileBlock() start=(${this.scopeColumn}) elem=[${nextElement.toString()}] - ENTRY`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is cb_loop:
      this.getElement();
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      } else if (this.currElement.type == eElementType.type_end) {
        continue;
      } else if (this.currElement.type == eElementType.type_block) {
        this.backElement();
        break;
      }
      this.getColumn(); // set this.lineColumn from currentElement
      if (this.lineColumn <= savedScopeColumn) {
        this.logMessage(`* cb_loop: ln=(${this.lineColumn}) <= srt=(${savedScopeColumn}) BREAK OUT!???`);
        this.backElement();
        break;
      }
      if (this.currElement.type == eElementType.type_if) {
        // 'if' block?
        this.cb_if();
      } else if (this.currElement.type == eElementType.type_ifnot) {
        // 'ifnot' block?
        this.cb_if();
      } else if (this.currElement.type == eElementType.type_case) {
        // 'case' block?
        this.cb_case();
      } else if (this.currElement.type == eElementType.type_case_fast) {
        // 'case_fast' block?
        this.cb_case_fast();
      } else if (this.currElement.type == eElementType.type_repeat) {
        // 'repeat' block?
        this.cb_repeat();
      } else {
        // no flow control structures, compile instruction
        this.compileInstruction();
        this.getEndOfLine();
      }
    }
    // restore column we had at entry
    this.setScopeColumn(savedScopeColumn);
    this.logMessage(`*==* compileBlock() - EXIT`);
  }

  private cb_if() {
    // Compile block - 'if' / 'ifnot'
    // PNut cb_if:
    this.logMessage(`*==* cb_if() ENTRY`);
    let optimizerMethod: eOptimizerMethod;
    optimizerMethod = this.currElement.type == eElementType.type_if ? eOptimizerMethod.OM_If : eOptimizerMethod.OM_IfNot;
    this.setScopeColumn(this.lineColumn);
    this.new_bnest(eElementType.type_if, this.if_limit + 1);
    this.optimizeBlock(optimizerMethod);
    this.end_bnest();
    this.logMessage(`*==* cb_if() EXIT`);
  }

  private blockIfnIfNot(byteCode: eByteCode) {
    // PNut cb_if: @@comp_if: and @@comp_ifnot:
    // code for eOptimizerMethod.OM_If and OM_IfNot
    let blockStackIndex: number = 1;
    let branchByteCode: eByteCode = byteCode;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@cond:
      this.compileExpression();
      this.getEndOfLine();
      this.compile_bstack_branch(blockStackIndex, branchByteCode);
      // here is @@block:
      this.compileBlock(this.scopeColumn);
      this.getElement();
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      }
      this.getColumn(); // set this.lineColumn from currentElement
      if (this.lineColumn < this.scopeColumn) {
        this.backElement();
        break;
      }
      const isElseIf: boolean = this.currElement.type == eElementType.type_elseif;
      const isElseIfNot: boolean = this.currElement.type == eElementType.type_elseifnot;

      if (isElseIf || isElseIfNot || this.currElement.type == eElementType.type_else) {
        if (isElseIf || isElseIfNot) {
          branchByteCode = isElseIf ? eByteCode.bc_jz : eByteCode.bc_jnz;
        }
        // here is @@jmpout
        this.compile_bstack_branch(0, eByteCode.bc_jmp);
        this.write_bstack_ptr(blockStackIndex);
        blockStackIndex++;
        if (isElseIf || isElseIfNot) {
          if (blockStackIndex == this.if_limit + 2) {
            // [error_loxee]
            throw new Error('Limit of 256 ELSEIF/ELSEIFNOTs exceeded');
          }
        } else {
          this.getEndOfLine();
          this.compileBlock(this.scopeColumn);
          break;
        }
      } else {
        // here is @@backup:
        this.backElement();
        break;
      }
      // loop
    }
    // here is @@done:
    this.write_bstack_ptr(blockStackIndex);
    this.write_bstack_ptr(0);
  }

  private cb_case() {
    // Compile block - 'case'
    // PNut cb_case:
    this.logMessage(`*==* cb_case() ENTRY`);
    this.setScopeColumn(this.lineColumn); // column offset to 'case' PNut [ebp]
    // reserve room for max cases and the other case
    this.new_bnest(eElementType.type_case, this.case_limit + 1); // max case + other
    this.optimizeBlock(eOptimizerMethod.OM_Case);
    this.end_bnest();
    this.logMessage(`*==* cb_case() EXIT`);
  }

  private blockCase() {
    // PNut cb_case: @@comp:
    // code for eOptimizerMethod.OM_Case
    this.compile_bstack_address(0); // compile final address
    this.compileExpression(); // compile case "target" value (switch variable/constant)
    this.getEndOfLine();
    const savedCaseStartElementIndex = this.saveElementLocation(); // rember location of 1st case statement
    let caseCount: number = 0; // this is PNut ecx[30-0]
    let haveOtherCase: boolean = false; // this is PNut ecx[31] bit of register
    let otherCaseElementIndex: number = 0; // this is PNut edx register
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@nextcase1
      this.logMessage(`* cb_case:@@comp: (pass1) caseCount=(${caseCount}), haveOtherCase=(${haveOtherCase})`);
      this.getElement();
      const matchIsOtherCase: boolean = this.currElement.type == eElementType.type_other;
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      }

      this.getColumn(); // set this.lineColumn from currentElement
      this.backElement(); // undo "Match" get

      // if this line is out-dented or at same level we are done with case statement!
      if (this.lineColumn <= this.scopeColumn) {
        break;
      }

      // set scope to match column
      const savedCaseColumn: number = this.scopeColumn; // PNut PUSH [ebp]
      this.setScopeColumn(this.lineColumn); // set to begining of line

      // if any match after 'other', error
      if (haveOtherCase) {
        // [error_omblc]
        throw new Error('OTHER must be last case');
      }
      if (matchIsOtherCase) {
        haveOtherCase = true;
        this.getElement(); // skip 'other'
        // save this index for 2nd loop
        // NOTE: get current element index, NOT next element index
        otherCaseElementIndex = this.saveElementLocation() - 1; // [source_start]
      } else {
        // here is @@notother1:
        if (++caseCount > this.case_limit) {
          // [error_loxcase]
          throw new Error(`Limit of ${this.case_limit} CASE elements exceeded`);
        }
        // here is @@nextrange:
        // compile comma delimited MATCH declarations
        do {
          const byteCode: eByteCode = this.compileRange() ? eByteCode.bc_case_range : eByteCode.bc_case_value;
          this.compile_bstack_branch(caseCount, byteCode);
        } while (this.checkComma());
      }
      // here is @@getcolon1
      this.getColon();
      this.skipBlock();
      this.setScopeColumn(savedCaseColumn); // PNut POP [ebp]
    }

    if (caseCount < 1) {
      // [error_nce]
      throw new Error('No cases encountered');
    }
    if (haveOtherCase) {
      this.restoreElementLocation(otherCaseElementIndex);
      this.getElement(); // skip 'other'
      this.getColumn(); // set this.lineColumn from currentElement
      this.getElement(); // skip colon
      const savedCaseColumn: number = this.scopeColumn;
      this.setScopeColumn(this.lineColumn); // set to begining of line at 'other'
      this.compileBlock(this.scopeColumn);
      this.setScopeColumn(savedCaseColumn);
    }
    // here is @@noother:
    this.objWrByte(eByteCode.bc_case_done);
    // move back to beginning of case statement (1st match)
    this.restoreElementLocation(savedCaseStartElementIndex);
    caseCount = 0; // ready to count again

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@nextcase2
      this.logMessage(`* cb_case:@@comp: (pass2) caseCount=(${caseCount}), haveOtherCase=(${haveOtherCase})`);
      this.getElement();
      const matchIsOtherCase: boolean = this.currElement.type == eElementType.type_other;
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      }

      this.getColumn(); // set this.lineColumn from currentElement
      this.backElement(); // undo "Match" get

      // if line is out-dented or same level we are done with case
      if (this.lineColumn <= this.scopeColumn) {
        break;
      }

      const savedCaseColumn: number = this.scopeColumn;
      this.setScopeColumn(this.lineColumn); // set to begining of line
      if (matchIsOtherCase) {
        this.getElement(); // skip 'other'
        this.getElement(); // skip colon
        // skip 'other' block
        this.skipBlock();
      } else {
        // here is @@notother2:
        // here is @@skiprange:
        // skip comma delimited MATCH declarations
        do {
          this.skipRange(); // skip range/value (already compiled)
        } while (this.checkComma());

        this.getElement(); // skip colon
        this.write_bstack_ptr(++caseCount);
        this.compileBlock(this.scopeColumn);
        this.objWrByte(eByteCode.bc_case_done);
      }
      // here is @@skipped
      this.setScopeColumn(savedCaseColumn);
    }
    // here is @@done2
    this.write_bstack_ptr(0);
  }

  private skipBlock() {
    // Skip block
    // PNut skip_block:
    this.logMessage(`* skipBlock() ENTRY`);
    const savedObjectOffset = this.objImage.offset;
    this.compileBlock(this.scopeColumn);
    this.objImage.setOffsetTo(savedObjectOffset);
    this.logMessage(`* skipBlock() EXIT`);
  }

  private skipRange() {
    // Skip range
    // PNut skip_range:
    const savedObjectOffset = this.objImage.offset;
    this.compileRange();
    this.objImage.setOffsetTo(savedObjectOffset);
  }

  private cb_case_fast() {
    // Compile block - 'case_fast'
    // PNut cb_case_fast:
    this.logMessage(`*==* cb_case_fast() ENTRY`);
    this.setScopeColumn(this.lineColumn);
    this.new_bnest(eElementType.type_case_fast, this.case_fast_limit + 6 + 1); // 6 enum value
    this.optimizeBlock(eOptimizerMethod.OM_CaseFast);
    this.end_bnest();
    this.logMessage(`*==* cb_case_fast() EXIT`);
  }

  private blockCaseFast() {
    // PNut cb_case_fast: @@comp
    // code for eOptimizerMethod.OM_CaseFast
    this.compile_bstack_address(eCaseFast.CF_FinalAddr); // compile final address
    this.compileExpression(); // compile case "target" value
    this.getEndOfLine();
    this.objWrByte(eByteCode.bc_case_fast_init);
    this.objWrLong(0); // enter spacer for rflong (-6)
    this.objWrWord(0); // enter spacer for rfword (-2)
    this.write_bstack_ptr(eCaseFast.CF_TablePtr);
    this.write_bstack(eCaseFast.CF_SourcePtr, this.saveElementLocation());
    this.write_bstack(eCaseFast.CF_MinValue, 0x7fffffff);
    this.write_bstack(eCaseFast.CF_MaxValue, -0x80000000);

    let caseCount: number = 0; // this is PNut ecx register
    let haveOtherCase: boolean = false; // this is PNut dl register

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@nextcase1
      this.getElement();
      // remember this elements' type
      const matchIsOtherCase: boolean = this.currElement.type == eElementType.type_other;
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      }

      this.getColumn(); // set this.lineColumn from currentElement
      this.backElement(); // undo "Match" get

      // if line is out-dented or same level we are done with case
      if (this.lineColumn <= this.scopeColumn) {
        break;
      }
      // if any match after 'other', error
      if (haveOtherCase) {
        // [error_omblc]
        throw new Error('OTHER must be last case');
      }
      const savedCaseColumn: number = this.scopeColumn;
      this.setScopeColumn(this.lineColumn);
      if (matchIsOtherCase) {
        haveOtherCase = true;
        this.getElement(); // skip other
      } else {
        // here is @@notother1:
        if (++caseCount > this.case_fast_limit) {
          // [error_loxcasef]
          throw new Error(`Limit of ${this.case_fast_limit} CASE_FAST elements exceeded`);
        }
        // here is @@nextrange1:
        // compile comma delimited MATCH declarations
        do {
          const [firstValue, lastValue] = this.getRange();
          this.updateMinMax(firstValue);
          this.updateMinMax(lastValue);
        } while (this.checkComma());
      }
      // here is @@getcolon1
      this.getColon();
      this.skipBlock();
      this.setScopeColumn(savedCaseColumn);
    }
    // here is @@done1:
    if (caseCount < 1) {
      // [error_nce]
      throw new Error('No cases encountered');
    }
    const tablePtr: number = this.read_bstack(eCaseFast.CF_TablePtr);
    const minValue: number = this.read_bstack(eCaseFast.CF_MinValue);
    const maxValue: number = this.read_bstack(eCaseFast.CF_MaxValue);
    // image offset -6 refers to our 6 values at front
    this.objImage.replaceLong(minValue, tablePtr - 6);
    const caseSpan: number = maxValue - minValue + 1;
    this.objImage.replaceWord(caseSpan, tablePtr - 2);

    // init jump table with other case index
    const otherCaseIndex: number = caseCount;
    let caseIndex: number = 0;
    do {
      // here is @@inittable:
      this.objWrWord(otherCaseIndex);
    } while (++caseIndex <= caseSpan);

    // point back to source after 'case_fast' line
    this.restoreElementLocation(this.read_bstack(eCaseFast.CF_SourcePtr));

    // reset case count
    caseCount = 0; // ready to count again

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@nextcase2
      this.getElement();
      const matchIsOtherCase: boolean = this.currElement.type == eElementType.type_other;
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      }

      this.getColumn(); // set this.lineColumn from currentElement
      this.backElement(); // undo "Match" get

      // if line is out-dented or same level we are done with case
      if (this.lineColumn <= this.scopeColumn) {
        break;
      }

      const savedCaseColumn: number = this.scopeColumn;
      this.setScopeColumn(this.lineColumn);
      if (matchIsOtherCase) {
        // this is the other (default) case
        this.getElement(); // skip 'other'
      } else {
        // this is a non-other case (real case)
        // here is @@notother2:
        // here is @@nextrange2:
        // fill in cases for comma delimited MATCH declarations
        do {
          const [firstValue, lastValue] = this.getRange();
          let rangeCaseCount: number = lastValue - firstValue + 1;
          const minValue: number = this.read_bstack(eCaseFast.CF_MinValue);
          const offsetForTable: number = firstValue - minValue; // offset in words
          const tablePtr: number = this.read_bstack(eCaseFast.CF_TablePtr);
          let startWordOffset: number = tablePtr + (offsetForTable << 1);
          // now write the table
          do {
            // here is @@filltable:
            // fill in all offsets for a given MATCH
            const indexValue: number = this.objImage.readWord(startWordOffset);
            if (indexValue != otherCaseIndex) {
              // [error_cfiinu]
              throw new Error('CASE_FAST index is not unique');
            }
            this.objImage.replaceWord(caseCount, startWordOffset);
            startWordOffset += 2; // incr by words (2 bytes)
          } while (--rangeCaseCount);
        } while (this.checkComma());
      }
      // here is @@getcolon2
      this.getColon();
      this.write_bstack_ptr(eCaseFast.CF_TableAddr + caseCount); // current case
      this.compileBlock(this.scopeColumn);
      caseCount++;
      this.write_bstack_ptr(eCaseFast.CF_TableAddr + caseCount); // possible other (default case)
      const tablePtr: number = this.read_bstack(eCaseFast.CF_TablePtr);
      const currObjOffset: number = this.objImage.offset;
      if (currObjOffset - tablePtr > 0xffff) {
        // [error_cfbex]
        throw new Error('CASE_FAST block exceeds 64KB');
      }
      this.objWrByte(eByteCode.bc_case_fast_done);
      this.setScopeColumn(savedCaseColumn);
    }
    // here is @@done2
    this.write_bstack_ptr(eCaseFast.CF_FinalAddr);
    // get base address of table
    const jumpTableBase: number = this.read_bstack(eCaseFast.CF_TablePtr);
    let entryOffset: number = jumpTableBase;
    // read number of cases and add 1 for other
    let loopCount: number = this.objImage.readWord(jumpTableBase - 2) + 1;
    do {
      // here is @@replace:
      // get case index from jump table
      const caseIndex: number = this.objImage.readWord(entryOffset);
      // use case index to look up case block offset
      const absoluteOffset: number = this.read_bstack(eCaseFast.CF_TableAddr + caseIndex);
      // convert to relative address into table
      const relativeOffset = absoluteOffset - jumpTableBase;
      // write case block offset into jump table
      this.objImage.replaceWord(relativeOffset, entryOffset);
      entryOffset += 2; // incr by words (2 bytes)
      // loop until all cases + 'other' handled
    } while (--loopCount);
  }

  private getRange(): [number, number] {
    // PNut get_range:
    // return sign-extended values for low and high, ordered correctly
    let [lowValue, highValue] = [0, 0];
    const firstResult = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
    lowValue = Number(this.signExtendFrom32Bit(firstResult.value));
    highValue = lowValue;
    if (this.checkDotDot()) {
      const secondResult = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
      highValue = Number(this.signExtendFrom32Bit(secondResult.value));
      // now order values correctly
      if (lowValue > highValue) {
        const holdValue = lowValue;
        lowValue = highValue;
        highValue = holdValue;
      }
    }
    return [lowValue, highValue];
  }

  private updateMinMax(newValue: number) {
    // PNut cb_case_fast: @@updateminmax
    let existingMinValue: number = this.read_bstack(eCaseFast.CF_MinValue);
    if (newValue < existingMinValue) {
      this.write_bstack(eCaseFast.CF_MinValue, newValue);
      existingMinValue = newValue;
    }
    let existingMaxValue: number = this.read_bstack(eCaseFast.CF_MaxValue);
    if (newValue > existingMaxValue) {
      this.write_bstack(eCaseFast.CF_MaxValue, newValue);
      existingMaxValue = newValue;
    }
    if (existingMaxValue - existingMinValue > 255) {
      // [error_cfvmbw]
      throw new Error('CASE_FAST values must be within 255 of each other');
    }
  }

  private cb_repeat() {
    // Compile block - 'repeat'
    // PNut cb_repeat:
    // NOTE:
    //   bstack[0] = 'next' address
    //   bstack[1] = 'quit' address
    //   bstack[2] = loop address
    this.logMessage(`*==* cb_repeat() ENTRY`);
    this.setScopeColumn(this.lineColumn);
    this.new_bnest(eElementType.type_repeat, 3);
    this.getElement();
    if (this.currElement.type == eElementType.type_end) {
      this.optimizeBlock(eOptimizerMethod.OM_Repeat);
    } else if (this.currElement.type == eElementType.type_while) {
      this.optimizeBlock(eOptimizerMethod.OM_RepeatPreWhileUntil, eByteCode.bc_jz);
    } else if (this.currElement.type == eElementType.type_until) {
      this.optimizeBlock(eOptimizerMethod.OM_RepeatPreWhileUntil, eByteCode.bc_jnz);
    } else {
      this.backElement(); // reposition to count?
      const savedExpressionElementIndex = this.saveElementLocation();
      this.skipExpression();
      this.currElement = this.getElement();
      this.restoreElementLocation(savedExpressionElementIndex);
      if (this.currElement.type == eElementType.type_end) {
        // @@count
        this.logMessage(`*  -- @@count`);
        this.redo_bnest(eElementType.type_repeat_count);
        this.optimizeBlock(eOptimizerMethod.OM_RepeatCount);
      } else if (this.currElement.type == eElementType.type_with) {
        // @@countvar
        this.logMessage(`*  -- @@countvar`);
        this.redo_bnest(eElementType.type_repeat_count_var);
        this.optimizeBlock(eOptimizerMethod.OM_RepeatCountVar);
      } else {
        this.logMessage(`*  -- @@var`);
        this.redo_bnest(eElementType.type_repeat_var);
        this.optimizeBlock(eOptimizerMethod.OM_RepeatVar);
      }
    }
    this.end_bnest();
    this.logMessage(`* cb_repeat() EXIT`);
  }

  private blockRepeat(isPostWhileUntil: boolean): boolean {
    // PNut cb_repeat: @@plaincomp:
    // code for eOptimizerMethod.OM_Repeat
    const nextElement: SpinElement = this.peekNextElement();
    this.logMessage(`* blockRepeat(isPostWhileUntil=(${isPostWhileUntil})) scopeColumn=(${this.scopeColumn}) elem=[${nextElement.toString()}]`);

    // set 'loop' address
    this.write_bstack_ptr(eRepeat.RP_LoopAddress);
    // if post-while/until flag is NOT set...
    if (isPostWhileUntil == false) {
      // set 'next' address
      this.write_bstack_ptr(eRepeat.RP_NextAddress);
    }
    // here is @@plainwu
    this.compileBlock(this.scopeColumn); // compile repeat block
    this.getElement();
    this.getColumn(); // set this.lineColumn from currentElement
    if (this.currElement.type == eElementType.type_end_file) {
      // here is @@plainloop
      this.compile_bstack_branch(eRepeat.RP_LoopAddress, eByteCode.bc_jmp);
      // set 'quit' address
      this.write_bstack_ptr(eRepeat.RP_QuitAddress);
    } else if (this.lineColumn < this.scopeColumn) {
      // here is @@plainbackup
      this.backElement();
      this.compile_bstack_branch(eRepeat.RP_LoopAddress, eByteCode.bc_jmp);
      // set 'quit' address
      this.write_bstack_ptr(eRepeat.RP_QuitAddress);
    } else if (this.currElement.type == eElementType.type_while) {
      // here is @@plainpost
      isPostWhileUntil = true; // set post-while/until flag
      // set 'next' address
      this.write_bstack_ptr(eRepeat.RP_NextAddress);
      this.compileExpression(); // compile post-while/until expression
      this.getEndOfLine();
      // here is @@plainpost2 carrying in bc_jnz
      this.compile_bstack_branch(eRepeat.RP_LoopAddress, eByteCode.bc_jnz);
      // set 'quit' address
      this.write_bstack_ptr(eRepeat.RP_QuitAddress);
    } else if (this.currElement.type == eElementType.type_until) {
      isPostWhileUntil = true; // set post-while/until flag
      // set 'next' address
      this.write_bstack_ptr(eRepeat.RP_NextAddress);
      this.compileExpression(); // compile post-while/until expression
      this.getEndOfLine();
      // here is @@plainpost2 carrying in bc_jz
      this.compile_bstack_branch(eRepeat.RP_LoopAddress, eByteCode.bc_jz);
      // set 'quit' address
      this.write_bstack_ptr(eRepeat.RP_QuitAddress);
    } else {
      // here is @@plainbackup
      this.backElement();
      this.compile_bstack_branch(eRepeat.RP_LoopAddress, eByteCode.bc_jmp);
      // set 'quit' address
      this.write_bstack_ptr(eRepeat.RP_QuitAddress);
    }
    return isPostWhileUntil;
  }

  private blockRepeatCount() {
    // PNut cb_repeat: @@countcomp:
    // code for eOptimizerMethod.OM_RepeatCount
    const nextElement: SpinElement = this.peekNextElement();
    this.logMessage(`*==* blockRepeatCount() elem=[${nextElement.toString()}] - ENTRY`);
    // compile count expression, check for constant
    const valueReturn: iValueReturn = this.compileExpressionCheckCon();
    this.getEndOfLine();
    if (valueReturn.isResolved && valueReturn.value == 0n) {
      // if 0, skip block (compile nothing)
      this.skipBlock();
    } else {
      if (valueReturn.isResolved) {
        this.compileConstant(valueReturn.value);
      } else {
        // here is @@countnc
        //  if runtime value is zero just jump to quit!
        this.compile_bstack_branch(eRepeat.RP_QuitAddress, eByteCode.bc_tjz);
      }
      // here is @@countnz
      this.write_bstack_ptr(eRepeat.RP_LoopAddress);
      this.compileBlock(this.scopeColumn); // compile repeat block
      this.write_bstack_ptr(eRepeat.RP_NextAddress);
      this.compile_bstack_branch(eRepeat.RP_LoopAddress, eByteCode.bc_djnz);
      this.write_bstack_ptr(eRepeat.RP_QuitAddress);
    }
    this.logMessage(`* blockRepeatCount() - EXIT`);
  }

  private blockRepeatCountVar() {
    // PNut cb_repeat: @@countvarcomp
    // code for eOptimizerMethod.OM_RepeatCountVar

    // compile loop address
    this.compile_bstack_address(eRepeat.RP_LoopAddress);
    this.compileExpression(); // compile count expression
    this.getWith(); // skip 'WITH'
    const variableReturn: iVariableReturn = this.getVariable();
    this.getEndOfLine();
    this.compileVariableAssign(variableReturn, eByteCode.bc_repeat_var_init_n);
    // set 'loop' address
    this.write_bstack_ptr(eRepeat.RP_LoopAddress);
    this.compileBlock(this.scopeColumn); // compile repeat block
    // set 'next' address
    this.write_bstack_ptr(eRepeat.RP_NextAddress);
    this.compileVariableAssign(variableReturn, eByteCode.bc_repeat_var_loop);
    // set 'quit' address
    this.write_bstack_ptr(eRepeat.RP_QuitAddress);
  }

  private blockRepeatPreWhileUntil(byteCode: eByteCode) {
    // PNut cb_repeat: @@prewucomp
    // code for eOptimizerMethod.OM_RepeatPreWhileUntil

    // set 'next' address
    this.write_bstack_ptr(eRepeat.RP_NextAddress);
    this.compileExpression(); // compile pre-while/until expression
    this.getEndOfLine();
    // compile forward branch ('quit')
    this.compile_bstack_branch(eRepeat.RP_QuitAddress, byteCode);
    this.compileBlock(this.scopeColumn); // compile repeat block
    // compile backward branch ('next')
    this.compile_bstack_branch(eRepeat.RP_NextAddress, eByteCode.bc_jmp);
    // set 'quit' address
    this.write_bstack_ptr(eRepeat.RP_QuitAddress);
  }

  private blockRepeatVar() {
    // PNut cb_repeat: @@varcomp
    // code for eOptimizerMethod.OM_RepeatVar

    this.compile_bstack_address(eRepeat.RP_LoopAddress);
    const variableReturn: iVariableReturn = this.getVariable();
    this.getFrom();
    // remember the FROM expression start
    const savedElementIndex = this.saveElementLocation();
    this.skipExpression();
    this.getTo();
    this.compileExpression(); // compile TO expression
    let byteCode: eByteCode = eByteCode.bc_repeat_var_init_1;
    if (this.getStepOrEndOfLine()) {
      // we found 'STEP'
      byteCode = eByteCode.bc_repeat_var_init;
      this.compileExpression(); // compile STEP expression
      this.getEndOfLine();
    }
    // here is @@varcompstep1:
    // compile FROM expression
    this.compileOutOfSequenceExpression(savedElementIndex);
    this.compileVariableAssign(variableReturn, byteCode);
    // set 'loop' address
    this.write_bstack_ptr(eRepeat.RP_LoopAddress);
    // compile repeat block
    this.compileBlock(this.scopeColumn);
    // set 'next' address
    this.write_bstack_ptr(eRepeat.RP_NextAddress);
    // compile setup + repeat_var_loop
    this.compileVariableAssign(variableReturn, eByteCode.bc_repeat_var_loop);
    // set 'quit' address
    this.write_bstack_ptr(eRepeat.RP_QuitAddress);
  }

  private compileDatRfvars(value: bigint) {
    // generates 1-4 bytes (signed)
    const masks = [
      { mask: BigInt(0x1fffffc0), bits: BigInt(0x7f) },
      { mask: BigInt(0x1fffe000), bits: BigInt(0x3fff) },
      { mask: BigInt(0x1ff00000), bits: BigInt(0x1fffff) }
    ];
    let needLastCompile: boolean = true;
    for (let i = 0; i < masks.length; i++) {
      if ((value & masks[i].mask) == 0n || (value & masks[i].mask) == masks[i].mask) {
        this.compileDatRfvar(value & masks[i].bits);
        needLastCompile = false;
        break;
      }
    }
    if (needLastCompile) {
      this.compileDatRfvar(value & BigInt(0x1fffffff)); // 29 bits
    }
  }

  private compileDatRfvar(value: bigint) {
    // generates 1-4 bytes (unsigned)
    const masks = [BigInt(0x1fffff80), BigInt(0x1fffc000), BigInt(0x1fe00000)];
    for (let i = 0; i < masks.length; i++) {
      if (value & masks[i]) {
        this.enterDataByte(BigInt(((Number(value) >> (7 * i)) & 0x7f) | 0x80));
      } else {
        this.enterDataByte(BigInt((Number(value) >> (7 * i)) & 0x7f));
        return;
      }
    }
    this.enterDataByte(BigInt((Number(value) >> 21) & 0xff));
  }

  private enterDatSymbol() {
    // TODO: possibly rename to recordDatSymbol
    let value: bigint = 0n;
    let type: eElementType;
    if (this.weHaveASymbol) {
      switch (this.wordSize) {
        case eWordSize.WS_Byte:
          type = eElementType.type_dat_byte;
          break;
        case eWordSize.WS_Word:
          type = eElementType.type_dat_word;
          break;
        case eWordSize.WS_Long:
          type = eElementType.type_dat_long;
          break;
        case eWordSize.WS_Long_Res:
          type = eElementType.type_dat_long_res;
          this.wordSize = eWordSize.WS_Long;
          break;
        default:
          // [error_INTERNAL]
          throw new Error(`[CODE] unexpected wordSize=(${this.wordSize}) !`);
      }
      if (this.hubMode) {
        value = BigInt(this.objImage.offset | 0xfff00000) & BigInt(0xffffffff);
        //const checkValue: bigint;
      } else {
        if ((this.cogOrg & 0x3) != 0) {
          // [error_csmbla]
          throw new Error('Cog symbol must be long-aligned');
        }
        // NOTE: cog address is bytes
        value = BigInt(this.objImage.offset | (this.cogOrg << (32 - 14))) & BigInt(0xffffffff);
      }
      this.logMessage(`* enterDatSymbol value=(${float32ToHexString(value)}) upper=(${value.toString(16).toUpperCase()})`);
      const newSymbol: iSymbol = { name: this.symbolName, type: type, value: value };
      //this.logMessage(`* enterDatSymbol() calling record symbol [${newSymbol}]`);
      this.recordSymbol(newSymbol);
    }
  }

  private incrementLocalScopeCounter() {
    this.asmLocal++;
    if (this.asmLocal > 9999) {
      // [error_loxdse]
      throw new Error('Limit of 10k DAT symbols exceeded');
    }
    this.logMessage(`* incrementLocalScopeCounter() ctr now (${this.asmLocal})`);
  }

  private isDatStorageType(): boolean {
    let matchStatus: boolean = true;
    switch (this.currElement.type) {
      case eElementType.type_dat_byte:
      case eElementType.type_dat_word:
      case eElementType.type_dat_long:
      case eElementType.type_dat_long_res:
        break;
      default:
        matchStatus = false;
        break;
    }
    return matchStatus;
  }

  private checkLocalSymbol(): [boolean, iSymbol] {
    let symbolFoundStatus: boolean = false;
    let symbolFound: iSymbol = { name: '', type: eElementType.type_undefined, value: 0n };
    if (this.currElement.type == eElementType.type_dot) {
      // using element as location info, get the symbol from the
      //  associated source code
      this.getElement();
      const symbolName: string = getSourceSymbol(this.context, this.currElement);
      this.logMessage(`* checkLocalSymbol() nextElement=[${this.currElement.toString()}] symbolName=[${symbolName}]`);
      if (symbolName.length == 0) {
        // we have error this should be a symbol!
        // [error_eals]
        throw new Error('Expected a local symbol');
      }
      let newLocalSymbolName = `${symbolName}'${this.asmLocal.toString().padStart(4, '0')}`;
      const tmpSymbolFound = this.findSymbol(newLocalSymbolName);
      // if we are undefined then replace the value with the new LOCAL NAME
      if (tmpSymbolFound.type == eElementType.type_undefined) {
        tmpSymbolFound.value = newLocalSymbolName;
      }
      symbolFound = tmpSymbolFound;
      symbolFoundStatus = true;
      // replace our global values with our local
      this.currElement.setType(symbolFound.type);
      this.currElement.setValue(symbolFound.value);
    }
    this.logMessage(
      `* checkLocalSymbol() symbolFoundStatus=(${symbolFoundStatus}), symbolFound=[${symbolFound.name}], [${eElementType[symbolFound.type]}], [${hexString(symbolFound.value)}]`
    );
    return [symbolFoundStatus, symbolFound];
  }

  private findSymbol(name: string): iSymbol {
    let symbolFound: iSymbol = { name: '', type: eElementType.type_undefined, value: 0n };
    let containingTable: SymbolTable | undefined = undefined;
    // TODO: COVERAGE test me
    if (this.autoSymbols.exists(name)) {
      containingTable = this.autoSymbols;
    } else if (this.levelSymbols.exists(name)) {
      containingTable = this.levelSymbols;
    } else if (this.mainSymbols.exists(name)) {
      containingTable = this.mainSymbols;
    } else if (this.localSymbols.exists(name)) {
      containingTable = this.localSymbols;
    } else if (this.inlineSymbols.exists(name)) {
      containingTable = this.inlineSymbols;
    }
    if (containingTable !== undefined) {
      const tmpSymbolFound = containingTable.get(name);
      if (tmpSymbolFound !== undefined) {
        symbolFound.name = tmpSymbolFound.name;
        symbolFound.type = tmpSymbolFound.type;
        symbolFound.value = tmpSymbolFound.value;
      }
    }
    return symbolFound;
  }

  private recordSymbol(newSymbol: iSymbol) {
    // PNut enter_symbol2: (which is called from enter_symbol2_print:)
    let symbolNumber: number = 0;
    let tableName: string = '';
    this.logMessage(`* recordSymbol name=[${newSymbol.name}] into [${eSymbolTableId[this.activeSymbolTable]}]`);
    switch (this.activeSymbolTable) {
      case eSymbolTableId.STI_MAIN:
        this.mainSymbols.add(newSymbol.name, newSymbol.type, newSymbol.value);
        symbolNumber = this.mainSymbols.length;
        tableName = 'mainSymbols';
        break;
      case eSymbolTableId.STI_LOCAL:
        this.localSymbols.add(newSymbol.name, newSymbol.type, newSymbol.value);
        this.listingLocalSymbols.addAllowDupe(newSymbol.name, newSymbol.type, newSymbol.value);
        symbolNumber = this.localSymbols.length;
        tableName = 'localSymbols';
        break;
      case eSymbolTableId.STI_INLINE:
        this.inlineSymbols.add(newSymbol.name, newSymbol.type, newSymbol.value);
        this.listingLocalSymbols.addAllowDupe(newSymbol.name, newSymbol.type, newSymbol.value);
        symbolNumber = this.inlineSymbols.length;
        tableName = 'inlineSymbols';
        break;
      default:
        // [error_INTERNAL]
        throw new Error('[CODE] known table ID!');
        break;
    }
    this.logMessage(
      `* recordSymbol() ${tableName}[${symbolNumber}] name=[${newSymbol.name}], type=[${eElementType[newSymbol.type]}], value=($${Number(BigInt(newSymbol.value) & BigInt(0xffffffff)).toString(16)})`
    );
  }

  private compile_obj_blocks_id() {
    // PNut compile_obj_blocks_id:
    this.logMessage('*==* COMPILE_obj_blocks_id()');
    this.objImage.setOffsetTo(0);
    this.spinFiles.clearObjFiles();
    this.objectInstanceInMemoryCount = 0;
    this.restoreElementLocation(0); // start from first element in list

    // for each OBJ block...
    // here is @@nextblock:
    while (this.nextBlock(eBlockType.block_obj)) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // here is @@nextline:
        this.getElement();
        if (this.currElement.isTypeUndefined) {
          // here is @@newobj:
          // backup symbol
          const symbolName: string = this.currElement.stringValue;
          // handle instance [index]
          let instanceCount: number = 1;
          if (this.checkLeftBracket()) {
            const valueReturn: iValueReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
            if (valueReturn.value < 1n || valueReturn.value > 255n) {
              // [error_ocmbf1tx]
              throw new Error('Object count must be from 1 to 255');
            }
            instanceCount = Number(valueReturn.value);
            this.getRightBracket();
          }
          this.getColon();
          const filenameElementIndex = this.saveElementLocation();
          const objFilename: string = this.getFilename();
          const savedElementIndex = this.saveElementLocation();
          // the following counts object files and checks file count limit (PNut file_limit)
          // restore so Error if generated by addObjFile() is correct
          this.restoreElementLocation(filenameElementIndex);
          const objFileRecord: ObjFile = this.spinFiles.addObjFile(objFilename, filenameElementIndex);
          // and restore to where we were - after getting filename
          this.restoreElementLocation(savedElementIndex);
          // PNut  obj symbol | [obj_count]
          const objSymbolValue: number = ((this.spinFiles.objFileCount - 1) << 24) | this.objectInstanceInMemoryCount;
          this.logMessage(`  -- compObjBlksId() objectId=(${this.spinFiles.objFileCount - 1}), instanceCount=(${this.objectInstanceInMemoryCount})`);
          // PNUT enter_symbol2_print: -> enter_symbol2:
          const newObjSymbol: iSymbol = { name: symbolName, type: eElementType.type_obj, value: BigInt(objSymbolValue) };
          this.recordSymbol(newObjSymbol);
          // now let's process constant overrides
          objFileRecord.setObjectInstanceCount(instanceCount);
          // here is @@index;
          for (let index = 0; index < instanceCount; index++) {
            if (this.objectInstanceInMemoryCount > this.objs_limit) {
              // [error_loxoie]
              throw new Error(`Limit of ${this.objs_limit} OBJ instances exceeded`);
            }
            // stage these values to objImage... they will be replaced in compile_obj_blocks
            this.objWrLong(this.spinFiles.objFileCount - 1);
            this.objWrLong(0); // write placeholder VAR offset for this object
            this.objectInstanceInMemoryCount++;
          }
          if (this.getPipeOrEnd()) {
            // have '|' ... we have CONSTANT overrides for this object
            do {
              // here is @@param:
              // get parameter name
              this.getElement();
              if (!this.currElement.isTypeUndefined) {
                // [error_eas]
                throw new Error('Expected a symbol');
              }
              const overrideName: string = this.currElement.stringValue;
              this.getEqual();
              const valueReturn: iValueReturn = this.getValue(eMode.BM_IntOrFloat, eResolve.BR_Must);
              const valueType: eElementType = valueReturn.isFloat ? eElementType.type_con_float : eElementType.type_con;
              objFileRecord.recordOverride(overrideName, valueType, valueReturn.value);
            } while (this.getCommaOrEndOfLine());
          }
        } else if (this.currElement.type != eElementType.type_block) {
          // [error_eauon]
          throw new Error('Expected a unique object name');
        } else {
          this.backElement();
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // --  Compiler                                                          --
  // ------------------------------------------------------------------------
  //
  //  Usage:
  //
  //      Call Compile1 (this is called twice?!)
  //      ...
  //      Call Compile1
  //      Load any obj files
  //      Call Compile2
  //      Save new obj file
  //
  //
  //  OBJ structure:
  //
  //      (file only)     long    varsize, pgmsize
  //
  //      0/pbase:        long    $7FFF_FFFF & OBJn offset, OBJn var offset (one for each child object)
  //                      ....
  //                      long    $8000_0000 | parameters << 24 | results << 20 | PUBn offset
  //                      ....
  //                      long    $8000_0000 | parameters << 24 | results << 20 | PRIn offset
  //                      ....
  //                      long    $7FFF_FFFF & objsize (past last PRIn)
  //
  //                      byte    DAT data...
  //                      byte    PUB data...
  //                      byte    PRI data...
  //      objsize:
  //                      /alignl
  //                      \long   OBJn data...
  //                      ....
  //      pgmsize:
  //      (file only)     byte    checksum
  //      (file only)     byte    'PUBn', 0..15 results, parameters       // PUB names and parameters
  //      (file only)     byte    'CONn', 16/17 int/float, long value     // CON names and values
  //
  // ------------------------------------------------------------------------

  private compile_obj_symbols() {
    // Compile obj pub/con symbols, also validates obj files
    // PNut compile_obj_symbols:

    //  An object image so far is:
    // ---------------------
    //   LONG var size
    //   LONG psize (length of obj bytes)
    //   BYTE[] of obj bytes
    //   BYTE checksum
    //   PUB symbols table [string, byte, byte]
    //   CON symbols table [string, byte, long]
    // ---------------------
    //
    const objFileRecords: ObjFile[] = this.spinFiles.objFiles;
    this.activeSymbolTable = eSymbolTableId.STI_MAIN; // for these symbols to our MAIN symbol table
    this.logMessage(`* - -------------------------------`);
    this.logMessage(`* compObjSyms() has ${objFileRecords.length} objFiles in list`);
    for (let index = 0; index < objFileRecords.length; index++) {
      const objFile: ObjFile = objFileRecords[index];
      this.logMessage(`  -- compObjSyms() objIndex[${index}], fName=[${objFile.fileName}]`);
    }
    for (let objFileIndex = 0; objFileIndex < this.objectData.objectFileCount; objFileIndex++) {
      const [objOffset, objLength] = this.objectData.getOffsetAndLengthForFile(objFileIndex);
      this.logMessage(`  -- compObjSyms() fileIdx=[${objFileIndex}], objOffset=(${objOffset}), objLength(${objLength})`);
    }
    this.logMessage(`* - -------------------------------`);
    for (let objFileIndex = 0; objFileIndex < objFileRecords.length; objFileIndex++) {
      // here is @@getfile:
      const [objOffset, objLength] = this.objectData.getOffsetAndLengthForFile(objFileIndex);
      this.logMessage(
        `  -- compObjSyms() objFileIndex=(${objFileIndex}), fName=[${objFileRecords[objFileIndex].fileName}], objOffset=(${objOffset}), objLength=(${objLength})`
      );
      this.objectData.setOffset(objOffset); // PNut is using [esi]
      // here is @@checksum:
      if ((this.objectData.checksum(objOffset, objLength) & 0xff) != 0) {
        this.logMessage(`  -- ERROR BAD OBJ checksum`);
        this.errorBadObjectImage(objFileRecords[objFileIndex]);
      }
      const vsize: number = this.objectData.readLong();
      if ((vsize & 0b11) != 0) {
        this.logMessage(`  -- ERROR BAD OBJ vsize`);
        this.errorBadObjectImage(objFileRecords[objFileIndex]);
      }
      const psize: number = this.objectData.readLong();
      if ((psize & 0b11) != 0) {
        this.logMessage(`  -- ERROR BAD OBJ psize`);
        this.errorBadObjectImage(objFileRecords[objFileIndex]);
      }

      // calculate offsets
      const offsetToPubConList: number = objOffset + 8 + psize + 1; // 8 is two longs, 1 is checksum
      const offsetPastObj: number = objOffset + objLength; // this is obj end + 1

      // determine initial pub index
      let pubIndex: number = 0;
      let tableEntry: number = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // here is @@findpub:
        tableEntry = this.objectData.readLong();
        if ((tableEntry & 0x80000000) != 0) {
          break;
        } else {
          tableEntry = this.objectData.readLong();
          pubIndex += 2;
        }
      }

      // now record
      this.objectData.setOffset(offsetToPubConList); // PNut is using [esi]
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // here is @@nextsymbol:
        if (this.objectData.offset > offsetPastObj) {
          this.logMessage(`  -- ERROR BAD OBJ offset`);
          this.errorBadObjectImage(objFileRecords[objFileIndex]);
        } else if (this.objectData.offset == offsetPastObj) {
          break;
        }
        // get our symbol
        const objectsSymbolName: string = this.objectData.readSymbolName() + String.fromCharCode(objFileIndex + 1);
        const symbolTypeOrResults: number = this.objectData.readByte();
        if (symbolTypeOrResults <= this.results_limit) {
          // have PUB
          const symbolParameters: number = this.objectData.readByte();
          const symbolValue = (symbolParameters << 24) | (symbolTypeOrResults << 20) | pubIndex++;
          const newObjPubSymbol: iSymbol = { name: objectsSymbolName, type: eElementType.type_objpub, value: BigInt(symbolValue) };
          this.recordSymbol(newObjPubSymbol);
        } else if (symbolTypeOrResults <= this.results_limit + 2) {
          // have con or con_float
          const symbolValue: number = this.objectData.readLong();
          const symbolType: eElementType = symbolTypeOrResults == this.results_limit + 2 ? eElementType.type_objcon_float : eElementType.type_objcon;
          const newObjConSymbol: iSymbol = { name: objectsSymbolName, type: symbolType, value: BigInt(symbolValue) };
          this.recordSymbol(newObjConSymbol);
        } else {
          // [error_INTERNAL]
          throw new Error(`ERROR[INTERNAL]: failed to decode object symbols for [${objFileRecords[objFileIndex].fileName}]`);
        }
      }
    }
  }

  private errorBadObjectImage(objFileInfo: ObjFile) {
    // this meets the intent of PNut compile_obj_symbols:  @@error:
    // [error_NEW]
    this.restoreElementLocation(objFileInfo.objLineElementIndex);
    throw new Error(`Invalid object image found for file: ${objFileInfo.fileName}`);
  }

  private compile_obj_blocks() {
    // Compile obj data
    //   moves data from objects into our output binary image
    // PNut compile_obj_blocks:
    if (this.pasmMode == false) {
      this.logMessage('*==* COMPILE_obj_blocks()');
      this.pad_obj_long();
      // 1st pass

      let objPtr: number[] = [];
      let objVar: number[] = [];
      // here is @@file:
      const objFileRanges: iFileDetails[] = this.objectData.objectFileRanges;
      this.logMessage(`  -- fileRangeCt=(${objFileRanges.length})`);
      for (let objFileIndex = 0; objFileIndex < objFileRanges.length; objFileIndex++) {
        // this fileRange is offset,length
        //   length is + 8 (two longs) more than the length of the obj data we move
        const fileRange: iFileDetails = objFileRanges[objFileIndex];
        this.logMessage(`  -- compObjBlks() objFileIndex=(${objFileIndex}), objOffset=(${fileRange.offset}), objLength=(${fileRange.length})`);
        this.objectData.setOffset(fileRange.offset); // set read ptr within P2.ObjData
        const fileStartObjOffset: number = this.objImage.offset;
        // save offset to where this objects' data will be written in objImage
        objPtr.push(fileStartObjOffset);
        // save VAR size for this object [first long]
        const varsize: number = this.objectData.readLong();
        objVar.push(varsize);
        // this is the actual length of data we move [second long]
        const remainingObjLength: number = this.objectData.readLong();
        // here is @@insert:
        for (let byteCount = 0; byteCount < remainingObjLength; byteCount++) {
          const uint8byte: number = this.objectData.read();
          //this.logMessage(`  -- compObjBlks() uint8byte=(${uint8byte})`);
          this.objWrByte(uint8byte);
        }
      }

      // 2nd pass
      // here is @@filesdone:
      this.logMessage(`  -- compObjBlks() 2nd pass objectInstanceInMemoryCount=(${this.objectInstanceInMemoryCount})`);

      // TODO: add documentation describing first LONGs
      for (let index = 0; index < objPtr.length; index++) {
        const objPtrVal = objPtr[index];
        this.logMessage(`  -- objPtr[${index}] = (${objPtrVal})`);
      }
      for (let index = 0; index < objVar.length; index++) {
        const objVarVal = objVar[index];
        this.logMessage(`  -- objVar[${index}] = (${objVarVal})`);
      }

      // get number of objects in index
      for (let objectsInMemory = 0; objectsInMemory < this.objectInstanceInMemoryCount; objectsInMemory++) {
        let objOffset: number = objectsInMemory * 8; // two longs is (2 * 4) which equals 8
        // get start of object index
        // get file number from index
        const fileNumber: number = this.objImage.readLong(objOffset + 0);
        // write obj offset to index
        this.logMessage(`  -- [${objectsInMemory}] fileNumber=(${fileNumber}), objPtr=(${objPtr[fileNumber]})`);
        this.objImage.replaceLong(objPtr[fileNumber], objOffset + 0);
        // write var offset to index
        this.objImage.replaceLong(this.varPtr, objOffset + 4);
        // update var pointer, check limit
        this.logMessage(`  -- varPtr=(${this.varPtr}) += objVar[fileNumber](${objVar[fileNumber]})`);
        this.varPtr += objVar[fileNumber];
        if (this.varPtr > this.obj_limit) {
          // [error_tmvsid]
          throw new Error('Too much variable space is declared D');
        }
      }
      this.logMessage(`  -- compObjBlks() end of 2nd pass`);
    } else {
      this.logMessage('*==* COMPILE_obj_blocks() IGNORED (pasmMode == true)');
    }
  }

  // ************************************************************************
  // *  Object Distiller                                                    *
  // ************************************************************************
  //

  private distill_obj_blocks() {
    // Distill obj blocks
    // PNut distill_obj_blocks:
    if (this.pasmMode == false) {
      // here is distill_objects:
      this.logMessage(`* distill_obj_blocks()`);
      //this.objImage.setLogging(true); // REMOVE BEFORE FLIGHT
      const startingOffset: number = this.objImage.offset;
      this.distillPtr = 0;
      this.distill_build();
      //this.logMessage(`  -- post raw record longs=[${this.distiller}](${this.distiller.length})`);
      this.distillDumpRecords('post_build');
      //if (recordCount > 1) {
      this.distill_scrub(); // damages object IDs in objImage
      const removeObjectCount: number = this.distill_eliminate();
      //if (removeObjectCount > 0) {  can't do this cuz object IDs need to be repaired
      this.distill_rebuild();
      this.distill_reconnect();
      //}
      //}
      //this.objImage.setLogging(false); // REMOVE BEFORE FLIGHT
      // NOTE: PNut v43 has this as an assign, we are moving to sum from assign
      this.distilledBytes += startingOffset - this.objImage.offset;
    }
  }

  private distillRecordCount(callerId: string): number {
    let recordcount = 0;
    if (this.distiller.length > 0) {
      let recordOffset = 0;
      do {
        recordcount++;
        const subObjectCount = this.distiller[recordOffset + 2];
        recordOffset += 5 + subObjectCount;
      } while (recordOffset < this.distillPtr);
    }
    //this.logMessage(`  -- [${callerId}] distill Record Ct = (${recordcount})`);
    return recordcount;
  }

  // 0: object id
  // 1: object offset
  // 2: sub-object count
  // 3: method count
  // 4: object size
  // 5+:        sub-object id's (if any)

  private distillDumpRecords(callerId: string) {
    const recordCount: number = this.distillRecordCount(callerId);
    this.logMessage('  -- ------------------------------');
    this.logMessage(`  -- [${callerId}]: rcdCt=(${recordCount}), this.distillPtr=(${this.distillPtr})`);
    if (this.distiller.length > 0) {
      let recordOffset: number = 0;
      let recordNbr: number = 1;
      do {
        const objID = this.distiller[recordOffset + 0];
        const objOffset = this.distiller[recordOffset + 1];
        const subObjCount = this.distiller[recordOffset + 2];
        const methodCount = this.distiller[recordOffset + 3];
        const objectSize = this.distiller[recordOffset + 4];
        const subObjIDs: string[] = [];
        for (let index = 0; index < subObjCount; index++) {
          const idValue: number = this.distiller[recordOffset + 5 + index];
          const extraBit: string = (idValue & 0x80000000) != 0 ? `+` : ``;
          const subObjId = idValue & 0x7fffffff;
          subObjIDs.push(`${extraBit}${subObjId}`);
        }
        const recordIdStr: string = `#${recordNbr}[${recordOffset}](${5 + subObjCount})`;
        const extraIDBit: string = (objID & 0x80000000) != 0 ? `+` : ``;
        this.logMessage(
          `  -- ${recordIdStr} id=(${extraIDBit}${objID & 0x7fffffff}), offset=(${objOffset}), subCt=(${subObjCount}), mthdCt=(${methodCount}), objSz=(${objectSize}) subObjIDs=[${subObjIDs}]`
        );
        recordOffset += 5 + subObjCount;
        recordNbr++;
      } while (recordOffset < this.distillPtr);
    } else {
      this.logMessage('     {emtpy distiller record list}');
    }
    this.logMessage('  -- ------------------------------');
  }

  private distill_build(objectId: number = 0, objectOffset: number = 0, subObjectId: number = 1): number {
    // Build initial object list
    // PNut distill_build:
    // record object Id
    this.logMessage(`* distillBuild(objId=(${objectId}),ofs=(${objectOffset}), subObjId=(${subObjectId}))`);
    // here is @@record:
    this.distillBuildEnter(objectId);
    this.distillBuildEnter(objectOffset);

    // count sub-objects
    let tableEntry: number = 0;
    let subObjectCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@countobjects:
      tableEntry = this.objImage.readLong(objectOffset + subObjectCount * 8);
      if ((tableEntry & 0x80000000) == 0) {
        subObjectCount++;
      } else {
        break;
      }
    }
    this.distillBuildEnter(subObjectCount);

    // count methods
    tableEntry = 0;
    let methodCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@countobjects:
      tableEntry = this.objImage.readLong(objectOffset + subObjectCount * 8 + methodCount * 4);
      if ((tableEntry & 0x80000000) != 0) {
        methodCount++;
      } else {
        break;
      }
    }
    this.distillBuildEnter(methodCount);
    this.distillBuildEnter(tableEntry); // record object size

    let newSubObjectId = subObjectId;
    if (subObjectCount != 0) {
      // (initial sub object ID is passed parameter)
      // enter record for each sub object
      // here is @@id:
      for (let index = 0; index < subObjectCount; index++) {
        this.distillBuildEnter(subObjectId + index);
      }

      // here is @@sub:
      newSubObjectId = subObjectId + subObjectCount;
      for (let index = 0; index < subObjectCount; index++) {
        let subObjectOffset = this.objImage.readLong(objectOffset + index * 8);
        // recursively call distill_build to enter any sub-objects' sub-object records
        // call ourself with new  [objectId, objectOffset, and subObjectId]
        //                                  [eax] + [edx]=index,        [esi] + subObjectOffset,  [edi]
        newSubObjectId = this.distill_build(subObjectId + index, objectOffset + subObjectOffset, newSubObjectId);
      }
    }
    return newSubObjectId;
  }

  /*
  private distill_build_new(objectId: number = 0, objectOffset: number = 0, subObjectId: number = 1): number {
    // Build initial object list
    // PNut distill_build:
    // record object Id
    this.logMessage(`* distillBuild(objId=(${objectId}),ofs=(${objectOffset}), subObjId=(${subObjectId}))`);
    // here is @@record:
    // count sub-objects
    let tableEntry: number = 0;
    let subObjectCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@countobjects:
      tableEntry = this.objImage.readLong(objectOffset + subObjectCount * 8);
      if ((tableEntry & 0x80000000) == 0) {
        subObjectCount++;
      } else {
        break;
      }
    }

    // count methods
    tableEntry = 0;
    let methodCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // here is @@countobjects:
      tableEntry = this.objImage.readLong(objectOffset + subObjectCount * 8 + methodCount * 4);
      if ((tableEntry & 0x80000000) != 0) {
        methodCount++;
      } else {
        break;
      }
    }

    let subObjIDs: number[] = [];
    if (subObjectCount != 0) {
      // (initial sub object ID is passed parameter)
      // enter record for each sub object
      // here is @@id:
      for (let index = 0; index < subObjectCount; index++) {
        subObjIDs.push(subObjectId + index);
      }
    }
    const distillerRecord = new DistillerRecord(objectId, objectOffset, subObjectCount, methodCount, tableEntry, subObjIDs);
    this.distillerList.addrecord(distillerRecord);

    let newSubObjectId = subObjectId;
    if (subObjectCount != 0) {
      // here is @@sub:
      newSubObjectId = subObjectId + subObjectCount;
      for (let index = 0; index < subObjectCount; index++) {
        let subObjectOffset = this.objImage.readLong(objectOffset + index * 8);
        // recursively call distill_build to enter any sub-objects' sub-object records
        // call ourself with new  [objectId, objectOffset, and subObjectId]
        //                                  [eax] + [edx]=index,        [esi] + subObjectOffset,  [edi]
        newSubObjectId = this.distill_build(subObjectId + index, objectOffset + subObjectOffset, newSubObjectId);
      }
    }
    return newSubObjectId;
  }
  //*/

  private distillBuildEnter(value: number) {
    // PNut distill_build: @@enter:
    if (this.distillPtr >= this.distiller_limit) {
      // [error_odo]
      throw new Error('Object distiller overflow');
    }
    const newLength = this.distiller.push(value);
    this.logMessage(`  -- dbldE() distiller[${this.distillPtr}]=(${value}),  arLen=(${newLength})`);
    this.distillPtr++;
  }

  private distill_scrub() {
    // Scrub sub-object offsets within objects to enable comparison of redundant objects
    // PNut distill_scrub:
    this.logMessage(`* distill_scrub()`);
    let recordOffset = 0;
    let recordID = 0;
    //this.objImage.setLogging(true); // REMOVE BEFORE FLIGHT
    do {
      recordID++;
      const objectOffset = this.distiller[recordOffset + 1];
      const subObjectCount = this.distiller[recordOffset + 2];
      this.logMessage(`distill_scrub() #${recordID} subCnt-(${subObjectCount})`);
      for (let subObjIndex = 0; subObjIndex < subObjectCount; subObjIndex++) {
        // clear subOjbectOffsets - facilitating later compare
        this.objImage.replaceLong(0, objectOffset + subObjIndex * 8);
      }
      recordOffset += 5 + subObjectCount;
    } while (recordOffset < this.distillPtr);
    //this.objImage.setLogging(false); // REMOVE BEFORE FLIGHT
  }

  private distill_eliminate(): number {
    // Eliminate redundant objects
    // PNut distill_eliminate:
    this.logMessage(`* distill_eliminate()`);
    let recordOffset = 0;
    let recordID = 0;
    let eliminationCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    do {
      // here is @@newobject:
      const subObjectCount = this.distiller[recordOffset + 2];
      recordID++;
      // here is @@msb:
      let areAllSubObjectsCompleted: boolean = true;
      for (let index = 0; index < subObjectCount; index++) {
        const subObjectId = this.distiller[recordOffset + 5 + index];
        if ((subObjectId & 0x80000000) == 0) {
          areAllSubObjectsCompleted = false;
        }
      }

      this.logMessage(`distill_eliminate() allSubsComplete=(${areAllSubObjectsCompleted})`);
      // if this record's subObjects are marked as complete...
      if (areAllSubObjectsCompleted) {
        let elimRecordOffset = 0;
        // eslint-disable-next-line no-constant-condition
        do {
          // check for match
          const matchingRecordOffset = this.findMatchForRecord(elimRecordOffset);
          if (matchingRecordOffset !== undefined) {
            // objects match, update all related sub-object id's
            eliminationCount++;
            // set msb's of id's
            const oldObjectId = this.distiller[elimRecordOffset + 0];
            const newObjectId = this.distiller[matchingRecordOffset + 0];
            this.distillEliminateUpdate(oldObjectId, newObjectId);
            // remove redundant object record from list
            // (id is no longer referenced by any record)
            this.distillDumpRecords('preDelete');
            const elimRcdLength = 5 + this.distiller[elimRecordOffset + 2];
            this.logMessage(
              `DR: [${recordOffset}] DELETE len=(${elimRcdLength})  distPtr (${this.distillPtr}) -> (${this.distillPtr - elimRcdLength})`
            );
            this.distiller.splice(elimRecordOffset, elimRcdLength);
            this.distillPtr -= elimRcdLength;
            this.distillDumpRecords('postDelete');
            // NOW break to outer loop which starts all over from top (or call ourself?)
            eliminationCount += this.distill_eliminate();
          }
          const elimSubObjectCount = this.distiller[elimRecordOffset + 2];
          elimRecordOffset += 5 + elimSubObjectCount;
        } while (elimRecordOffset < this.distillPtr);
      }

      //  return to top of loop @@newobject:
      // here is @@nextobject:
      recordOffset += 5 + subObjectCount;
    } while (recordOffset < this.distillPtr);
    this.logMessage(`  -- distElim EXIT (return) eliminationCount=(${eliminationCount})`);
    return eliminationCount;
  }

  private findMatchForRecord(matchRecordOffset: number): number | undefined {
    // here is @@search:
    let matchingRecordOffset: number | undefined = undefined;
    let searchRecordOffset = matchRecordOffset;
    const startSubObjectCount = this.distiller[searchRecordOffset + 2];
    //this.logMessage(`* findMatchForRecord(${matchRecordOffset})`);
    let matchSubObjectCount: number = 0;
    let matchObjSize: number = 0;
    // point to first record to check for match
    searchRecordOffset = matchRecordOffset + 5 + startSubObjectCount;
    let searchSubObjectCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // if we are at end of records in search?
      if (searchRecordOffset >= this.distillPtr) {
        // yes, abort search
        break;
      }
      searchSubObjectCount = this.distiller[searchRecordOffset + 2]; // this was out of order in the new code, moved earlier
      //this.logMessage(`  -- checking rcd(${matchRecordOffset}) against rcd(${searchRecordOffset})`);
      let recordMatched: boolean = true;
      // do object sizes match?
      matchObjSize = this.distiller[matchRecordOffset + 4];
      const searchObjSize = this.distiller[searchRecordOffset + 4];
      if (matchObjSize != searchObjSize) {
        // NOT a match, abort search
        recordMatched = false;
      }
      if (recordMatched) {
        // do sub-object counts match?
        // TODO: COVERAGE test me
        matchSubObjectCount = this.distiller[matchRecordOffset + 2];
        if (matchSubObjectCount != searchSubObjectCount) {
          // NOT a match, abort search
          recordMatched = false;
        }
      }
      if (recordMatched) {
        // do sub-object id's match?
        for (let index = 0; index < matchSubObjectCount; index++) {
          const matchSubObjectId = this.distiller[matchRecordOffset + 5 + index];
          const searchSubObjectId = this.distiller[searchRecordOffset + 5 + index];
          if (matchSubObjectId != searchSubObjectId) {
            // NOT a match, abort search
            recordMatched = false;
          }
        }
      }
      if (recordMatched) {
        // do object binaries match?
        const matchObjectOffset = this.distiller[matchRecordOffset + 1];
        const searchObjectOffset = this.distiller[searchRecordOffset + 1];
        //this.logMessage(`* BINARY COMPARE matchOffset(${matchObjectOffset}), searchOffset(${searchObjectOffset}), lengthInBytes(${matchObjSize})`);
        //this.objImage.dumpBytes(matchObjectOffset, matchObjSize, 'matchObject');
        //this.objImage.dumpBytes(searchObjectOffset, matchObjSize, 'searchObject');
        for (let longIndex = 0; longIndex < matchObjSize / 4; longIndex++) {
          const matchObjLong = this.objImage.readLong(matchObjectOffset + longIndex * 4);
          const searchObjLong = this.objImage.readLong(searchObjectOffset + longIndex * 4);
          //this.logMessage(`  -- LONG COMPARE ${hexLong(matchObjLong)} <-> ${hexLong(searchObjLong)}`);
          if (matchObjLong != searchObjLong) {
            // NOT a match, abort search
            //this.logMessage(`EEEE  failed match long[${longIndex}] match(${matchObjLong}) <> search(${searchObjLong})`);
            recordMatched = false;
          }
        }
      }
      if (recordMatched) {
        // record still matched, let's return it
        matchingRecordOffset = searchRecordOffset;
        break;
      }
      //this.logMessage(`  -- srchRcdOfs=(${searchRecordOffset}), srchSubObjCt=(${searchSubObjectCount})`);
      searchRecordOffset += 5 + searchSubObjectCount;
    }
    this.logMessage(`* (distill) findMatchForRecord(${matchRecordOffset}) -> (${matchingRecordOffset})`);
    return matchingRecordOffset;
  }

  private distillEliminateUpdate(objectId: number, newObjectId: number) {
    // PNut distill_eliminate: @@update:
    // update sub-object id's in records
    this.logMessage(`* distillEliminateUpdate(${objectId}, ${newObjectId})`);
    let recordOffset: number = 0;
    do {
      const subObjectCount = this.distiller[recordOffset + 2];
      for (let subObjectIndex = 0; subObjectIndex < subObjectCount; subObjectIndex++) {
        const subObjectOffset = recordOffset + 5 + subObjectIndex;
        let subObjectId = this.distiller[subObjectOffset] & 0x7fffffff;
        if (subObjectId == objectId || subObjectId == newObjectId) {
          const bitFlag: string = (this.distiller[subObjectOffset] & 0x80000000) != 0 ? '+' : '';
          this.logMessage(
            `DR: [${recordOffset}+5+${subObjectIndex}] subObjID (${bitFlag}${this.distiller[subObjectOffset] & 0x7fffffff}) -> (+${newObjectId})`
          );
          this.distiller[subObjectOffset] = newObjectId | 0x80000000;
        }
      }
      recordOffset += 5 + subObjectCount;
    } while (recordOffset < this.distillPtr);
  }

  private distill_rebuild() {
    // Rebuild distilled object with sub-objects
    // PNut distill_rebuild:
    this.logMessage(`* distill_rebuild()`);
    let recordOffset: number = 0;
    let rebuildObjImage: ObjectImage = new ObjectImage(this.context, 'rebuildImage');
    rebuildObjImage.setOffsetTo(0);
    do {
      // read the source object offset
      const objectOffset = this.distiller[recordOffset + 1];
      // replace with destination-object offset
      this.logMessage(`DR: [${recordOffset}+1] OBJ-OFS (${this.distiller[recordOffset + 1]}) -> (${rebuildObjImage.offset})`);
      this.distiller[recordOffset + 1] = rebuildObjImage.offset;
      // get object length in bytes then convert to long count rounded up
      const objectSizeInBytes = this.distiller[recordOffset + 4];
      const objSizeInLongs = (objectSizeInBytes + 3) >> 2;
      this.logMessage(`  -- objectSize=(${objectSizeInBytes}),(${objSizeInLongs}) longs, ofs=(${objectOffset})`);
      // copy our longs from source to dest
      for (let longIndex = 0; longIndex < objSizeInLongs; longIndex++) {
        const sourceLong = this.objImage.readLong(objectOffset + longIndex * 4);
        rebuildObjImage.appendLong(sourceLong);
      }
      const subObjectCount = this.distiller[recordOffset + 2];
      // here is @@loop:
      recordOffset += 5 + subObjectCount;
    } while (recordOffset < this.distillPtr);

    // now replace objImage content with rebuildObjImage content
    this.objImage.rawUint8Array.set(rebuildObjImage.rawUint8Array.subarray(0, rebuildObjImage.offset));
    this.objImage.setOffsetTo(rebuildObjImage.offset);
  }

  private distill_reconnect(recordOffset: number = 0) {
    // Reconnect any sub-objects
    // PNut distill_reconnect:
    this.logMessage(`* distill_reconnect(${recordOffset})`);
    if (recordOffset == 0) {
      //this.logMessage(`  -- reconn raw record longs=[${this.distiller}](${this.distiller.length})`);
      this.distillDumpRecords('reconnect');
    }
    const subObjectCount = this.distiller[recordOffset + 2];
    for (let subObjectIndex = 0; subObjectIndex < subObjectCount; subObjectIndex++) {
      const objOffset = this.distiller[recordOffset + 1]; // [edx]
      // here is @@sub:
      // get sub object ID
      const subObjId = this.distiller[recordOffset + 5 + subObjectIndex] & 0x7fffffff;
      this.logMessage(`  -- ofs=(${objOffset}), subObjId=(${subObjId})`);
      let searchRcdOffset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (this.distiller[searchRcdOffset + 0] == subObjId) {
          break; // have our matching record, abort loop
        }
        const subObjectCount = this.distiller[searchRcdOffset + 2];
        searchRcdOffset += 5 + subObjectCount;
        // assert that we did find our record ;-)
        if (searchRcdOffset >= this.distillPtr) {
          throw new Error(`ERROR[INTERNAL] failed to locate Object Id ${subObjId} list`);
        }
      }
      // now searchRcdOffset points to record matching our ID
      const matchSubObjOffset = this.distiller[searchRcdOffset + 1];
      // enter relative offset of sub-object into object SubObjectId Fields
      const relativeSubObjOffset = (matchSubObjOffset - objOffset) & 0x7fffffff;
      this.objImage.replaceLong(relativeSubObjOffset, objOffset + subObjectIndex * 8);
      this.distill_reconnect(searchRcdOffset);
    }
  }

  private pad_obj_long() {
    // pad object to next long
    while (this.objImage.offset & 0b11) {
      this.objWrByte(0);
    }
  }

  private compile_con_blocks(resolve: eResolve, firstPass: boolean = false) {
    // compile all CON blocks in file
    this.logMessage(`*==* COMPILE_con_blocks(firstPass=(${firstPass}))`);
    this.restoreElementLocation(0); // start from first in list
    this.logMessage(`  -- restore to nextType=[${eElementType[this.nextElementType()]}]`);

    // move past opening CON if we have one
    if (this.nextElementType() == eElementType.type_block && this.nextElementValue() == eBlockType.block_con) {
      this.getElement(); // throw BLOCK element away
      if (this.nextElementType() == eElementType.type_end) {
        this.getElement(); // throw EOL element away
      }
    }

    // if the File is Empty we are done!
    if (this.nextElementType() == eElementType.type_end_file) {
      return;
    }

    do {
      // NEXT BLOCK
      this.logMessage(`  -- NEW BLOCK do {} elem=[${this.currElement.toString()}]`);
      // reset our enumeration
      let enumValid: boolean = true;
      let enumValue: bigint = 0n;
      let enumStep: bigint = 1n;
      //let assignFlag: boolean = false;TO-CHIO

      do {
        this.logMessage(`  -- NEW LINE do {} elem=[${this.currElement.toString()}]`);
        // here is @@nextline:   NEXT LINE
        let backupSymbolName: string = '';

        // BUGFIX: these moved from same-line loop to hear to fix CON processing
        if (this.nextElementType() == eElementType.type_end) {
          this.getElement(); // throw element away
        }
        // BUGIFX: get out of line processing if next is new non-CON block
        if (this.nextElementType() == eElementType.type_block && this.nextElementValue() != eBlockType.block_con) {
          break;
        }

        if (this.nextElementType() == eElementType.type_end_file) {
          break;
        }

        do {
          // here is @@sameline:   SAME LINE (process a line)
          this.getElement();
          this.logMessage(`  -- SAME LINE do {} elem=[${this.currElement.toString()}]`);
          //assignFlag = this.currElement.type == eElementType.type_pound ? true : false;
          // if the File is Empty we are done!

          /*  BUGFIX: moved to above...
          if (this.nextElementType() == eElementType.type_end) {
            this.getElement(); // throw element away
          }
          if (this.nextElementType() == eElementType.type_end_file) {
            break;
          }
          //*/

          // do we have an enum declaration?
          if (this.currElement.type == eElementType.type_pound) {
            // Example: we are processing the left edge of an enumeration:  #0[4], name1, name2, name3[5], name4
            // initial value
            const resultReturn = this.getValue(eMode.BM_IntOnly, resolve);
            enumValid = false;
            if (resultReturn.isResolved) {
              // we have a value!
              enumValid = true;
              enumValue = resultReturn.value;
              enumStep = 1n;
            }
            // optional step size
            if (this.checkLeftBracket()) {
              const resultReturn = this.getValue(eMode.BM_IntOnly, resolve);
              if (resultReturn.isResolved) {
                enumStep = resultReturn.value;
              } else {
                // TODO: COVERAGE test me
                enumValid = false;
              }
              this.getRightBracket();
            }
          } else if (this.currElement.type == eElementType.type_con || this.currElement.type == eElementType.type_con_float) {
            // Example: we are validating for symbol
            //   #0[4], name1, name2, name3[5], name4
            //   name = value, name = value, name = name = value, #0[4], name1, name2
            if (firstPass) {
              // [error_eaucnop]
              throw new Error('1st Expected a unique constant name or "#" (m0B0)');
            }
            backupSymbolName = this.replacedName; // stashed by getElement()
            this.logMessage(`* BACKUP SYMBOL name for use in set/verify name=[${backupSymbolName}]`);
            const elementToVerify: SpinElement = this.currElement;

            this.currElement = this.getElement();
            if (this.currElement.type == eElementType.type_equal) {
              // here is @@equal:
              const result = this.getValue(eMode.BM_IntOrFloat, eResolve.BR_Must);
              // NOTE: if we don't get a value just leave we can't do anything yet...
              if (result.isResolved) {
                // we have a value!
                // record symbol value (do assign process)
                this.verifySameValue(backupSymbolName, elementToVerify, result);
              }
            } else if (this.currElement.type == eElementType.type_leftb) {
              // here is @@enumx:
              const indexResult = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
              //  #0[nameA], nameA[nameB]
              //  #0[11], nameA[15]
              this.getRightBracket();
              if (indexResult.isResolved) {
                // we have a value
                // Example: we are processing this:  #0[4], name1, name2, name3[5], name4
                // preserve current enum value
                const symbolResult: iValueReturn = { value: enumValue, isResolved: true, isFloat: false };
                // step the enum
                enumValue += enumStep * indexResult.value;
                // record symbol with current enum value (do assign process)
                this.verifySameValue(backupSymbolName, elementToVerify, symbolResult);
              }
            } else if (this.currElement.type == eElementType.type_comma || this.currElement.type == eElementType.type_end) {
              // preserve current enum value
              const symbolResult: iValueReturn = { value: enumValue, isResolved: true, isFloat: false };
              // step the enum
              enumValue += enumStep;
              // record symbol with current enum value (do assign process)
              this.verifySameValue(backupSymbolName, elementToVerify, symbolResult);
              this.backElement(); // so we can re-discover the comma or EOL at while()
            }
          } else if (this.currElement.isTypeUndefined) {
            // we have a symbol!
            // Example: we are processing the {name} somewhere in:
            //   #0[4], name1, name2, name3[5], name4
            //   name = value, name = value, name = name = value, #0[4], name1, name2
            backupSymbolName = this.currElement.stringValue;
            this.logMessage(`* BACKUP SYMBOL name for use in set/verify name=[${backupSymbolName}]`);
            this.currElement = this.getElement();
            if (this.currElement.type == eElementType.type_equal) {
              const result = this.getValue(eMode.BM_IntOrFloat, resolve);
              // NOTE: if we don't get a value just leave we can't do anything yet...
              if (result.isResolved) {
                // we have a value!
                // record symbol value (do assign process)
                this.recordCONSymbolValue(backupSymbolName, result);
              }
            } else if (this.currElement.type == eElementType.type_leftb) {
              const indexResult = this.getValue(eMode.BM_IntOnly, resolve);
              this.getRightBracket();
              if (indexResult.isResolved && enumValid) {
                // we have a value
                // Example: we are processing this:  #0[4], name1, name2, name3[5], name4
                // preserve current enum value
                const symbolResult: iValueReturn = { value: enumValue, isResolved: true, isFloat: false };
                // step the enum
                enumValue += enumStep * indexResult.value;
                // record symbol with current enum value (do assign process)
                this.recordCONSymbolValue(backupSymbolName, symbolResult);
              } else {
                // missing new step value... invalidate enum and bail
                // TODO: COVERAGE test me
                enumValid = false;
              }
            } else if (this.currElement.type == eElementType.type_comma || this.currElement.type == eElementType.type_end) {
              this.backElement(); // so we can re-discover the comma or EOL at while()
              if (enumValid) {
                // preserve current enum value
                const symbolResult: iValueReturn = { value: enumValue, isResolved: true, isFloat: false };
                // step the enum
                enumValue += enumStep;
                // record symbol with current enum value (do assign process)
                this.recordCONSymbolValue(backupSymbolName, symbolResult);
              }
            } else {
              // [error_eelcoeol]
              throw new Error('Expected "=" "[" "," or end of line');
            }
          } else if (this.currElement.type == eElementType.type_block) {
            // let our outermost loop decide if we should process this next block
            // TODO: COVERAGE test me
            this.backElement();
            break;
          } else {
            // let's show some debug
            // TODO: COVERAGE test me
            this.backElement(); // so we can re-discover the comma or EOL at while()
            this.getElement();
            this.logMessage(`EEEE: Element at fail: [${this.currElement.toString()}]`);
            // [error_eaucnop]
            throw new Error('case Expected a unique constant name or "#" (m0B1)');
          }
        } while (this.getCommaOrEndOfLine());
        // if we hit end of file, we're done
        if (this.nextElementType() == eElementType.type_end_file) {
          break;
        }
      } while (this.nextElementType() != eElementType.type_block);
    } while (this.nextBlock(eBlockType.block_con));
  }

  private compile_final() {
    // PNut compile_final:
    this.logMessage(`*==* COMPILE_final()`);
    // TODO: place code for flash_loader file size and interpreter file size
    this.sizeFlashLoader = 0; // for now
    this.sizeInterpreter = 0;
    this.sizeObj = this.objImage.offset;
    this.sizeVar = 0;
    if (this.pasmMode == false) {
      this.sizeInterpreter = 0; // FIXME: for now,  but move  in actual length when we get it
      const checksumOffset: number = this.objImage.offset; // PNut [edx]
      this.objWrByte(0); // our checksum placeholder
      // copy the entire symbol set
      //for (const byte of this.pubConList) {
      //  this.objWrByte(byte); // copy the symbol array
      //}
      this.pubConList.setOffset(0);
      this.logMessage(`  -- pubCon list has (${this.pubConList.length}) bytes`);
      for (let index = 0; index < this.pubConList.length; index++) {
        const byte = this.pubConList.readNext();
        this.objWrByte(byte);
      }
      // We need to inject two longs at head of image...
      this.objWrLong(0); // open space for move of data
      this.objWrLong(0); // open space for move of data
      // move the data up, leaving room for our two longs at front of image
      //   here is the behavior of PNut move_obj_up
      for (let writeOffset = this.objImage.offset - 1; writeOffset >= 8; writeOffset--) {
        this.objImage.replaceByte(this.objImage.read(writeOffset - 8), writeOffset);
      }
      // now write our two longs at front of image
      //  vsize is...
      this.objImage.replaceLong(this.varPtr, 0);
      this.sizeVar = this.varPtr;
      //  psize is...
      this.objImage.replaceLong(checksumOffset, 4); // core binary length of the object
      this.sizeObj = checksumOffset;
      // now place our checksum into image before our symbols
      const checkSum = this.objImage.calculateChecksum(0, this.objImage.offset - 1);
      this.objImage.replaceByte(checkSum, checksumOffset + 8);
    }
  }

  private verifySameValue(symbolName: string, currentValue: SpinElement, expectedValue: iValueReturn) {
    const expectedType: eElementType = expectedValue.isFloat ? eElementType.type_con_float : eElementType.type_con;
    let adjustedExpected: iSymbol = { name: symbolName, type: expectedType, value: expectedValue.value };

    // We replace expected value with found symbol

    const foundSymbol: iSymbol | undefined = this.checkImportedParam(symbolName); //  checkParam - is parameter? substitute value
    if (foundSymbol !== undefined) {
      adjustedExpected.type = foundSymbol.type;
      adjustedExpected.value = foundSymbol.value;
    }
    this.logMessage(
      `  -- CONSymVrfy() [${symbolName}], curr=[${eElementType[currentValue.type]}], value=($${Number(currentValue.bigintValue & BigInt(0xffffffff)).toString(16)})`
    );
    this.logMessage(
      `  -- CONSymVrfy() [${symbolName}], expc=[${eElementType[adjustedExpected.type]}], value=($${Number(BigInt(adjustedExpected.value) & BigInt(0xffffffff)).toString(16)})`
    );

    if (currentValue.type !== adjustedExpected.type || currentValue.value !== adjustedExpected.value) {
      // [error_siad]
      throw new Error('Symbol is already defined');
    }
  }

  private recordCONSymbolValue(symbolName: string, symbolValue: iValueReturn) {
    // do assign process
    const symbolType: eElementType = symbolValue.isFloat ? eElementType.type_con_float : eElementType.type_con;
    let adjustedCONSymbol: iSymbol = { name: symbolName, type: symbolType, value: symbolValue.value };

    const foundSymbol: iSymbol | undefined = this.checkImportedParam(symbolName); //  checkParam - is parameter? substitute value
    if (foundSymbol !== undefined) {
      adjustedCONSymbol.type = foundSymbol.type;
      adjustedCONSymbol.value = foundSymbol.value;
    }

    // record our symbol in MAIN symbol table
    this.mainSymbols.add(symbolName, adjustedCONSymbol.type, adjustedCONSymbol.value);
    const symbolNumber = this.mainSymbols.length;

    this.logMessage(
      `  -- rcdCONSym() mainSymbols[${symbolNumber}] name=[${symbolName}], type=[${eElementType[adjustedCONSymbol.type]}], value=($${Number(BigInt(adjustedCONSymbol.value) & BigInt(0xffffffff)).toString(16)})`
    );

    // write info to object pub/con list
    const interfaceType: number = symbolValue.isFloat ? 17 : 16;
    this.objWrConstant(symbolName, interfaceType, BigInt(adjustedCONSymbol.value));
  }

  private checkImportedParam(symbolName: string): iSymbol | undefined {
    //  checkParam - is parameter? substitute value
    // PNut compile_con_blocks: @@checkparam:
    let overrideConSymbol: iSymbol | undefined = undefined;
    if (this.overrideSymbolTable !== undefined && this.overrideSymbolTable.exists(symbolName)) {
      overrideConSymbol = this.overrideSymbolTable.get(symbolName);
    }
    if (overrideConSymbol === undefined) {
      this.logMessage(`  -- chkImpParam([${symbolName}]) NO Overide symbol found`);
    } else {
      this.logMessage(
        `  -- chkImpParam([${symbolName}]) type=[${eElementType[overrideConSymbol.type]}], value=($${Number(BigInt(overrideConSymbol.value) & BigInt(0xffffffff)).toString(16)})`
      );
    }
    return overrideConSymbol;
  }

  private nextBlock(blockType: eBlockType): boolean {
    let foundStatus: boolean = false;
    let element: SpinElement;
    this.logMessage(`* nextBlock huntFor=[${eBlockType[blockType]}] stop log at elem=[${this.currElement.toString()}]`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      //const savedLogState: boolean = this.isLogging;
      //this.isLogging = false;
      this.getElement();
      //this.isLogging = savedLogState;
      if (this.currElement.type == eElementType.type_block && Number(this.currElement.value) == blockType) {
        this.logMessage(`  -- nextBlock() found element=[${this.currElement.toString()}]  Found!`);
        foundStatus = true;
        break;
      }
      if (this.currElement.type == eElementType.type_end_file) {
        break;
      }
    }
    this.logMessage(`  -- nextBlock resume log at elem=[${this.currElement.toString()}] foundStatus=(${foundStatus})`);
    if (foundStatus == true) {
      this.getColumn(); // set this.lineColumn from currentElement
      if (this.lineColumn != 1) {
        // [error_bdmbifc]
        throw new Error('Block designator must be in first column');
      }
      if (this.nextElementType() == eElementType.type_end) {
        this.getElement(); // throw the EOL-after-a-BLOCK away
      }
    }
    return foundStatus;
  }

  private getValue(mode: eMode, resolve: eResolve): iValueReturn {
    // in this one case we force integer math
    this.logMessage(`* getvalue() ENTRY`);
    this.mathMode = mode == eMode.BM_IntOnly ? eMathMode.MM_IntMode : eMathMode.MM_Unknown;
    this.numberStack.reset(); // empty our stack
    this.resolveExp(mode, resolve, this.lowestPrecedence);
    const value: bigint = this.numberStack.pop();
    this.logMessage(`* getvalue() EXIT`);
    return { value: value, isResolved: this.numberStack.isResolved, isFloat: this.isResultFloat() };
  }

  private isResultFloat(): boolean {
    // this brought to us by the compiler not allowing this one line to be in above routine
    const isFloat: boolean = this.mathMode == eMathMode.MM_FloatMode ? true : false;
    return isFloat;
  }

  private compileExpressionCheckCon(): iValueReturn {
    const savedObjPtr: number = this.objImage.offset;
    const compileResult = this.compileExpression();
    if (compileResult.isResolved) {
      // restore the object offset (backup over the compiled constant)
      this.objImage.setOffsetTo(savedObjPtr);
    }
    return compileResult;
  }
  private compileExpression(): iValueReturn {
    //  Compile expression with sub-expressions
    // PNut compile_exp:
    const nextElement: SpinElement = this.peekNextElement();
    this.logMessage(`*==* compileExpression() elem=[${nextElement.toString()}] - ENTRY`);
    const tryExpressionResult = this.trySpin2ConExpression();
    if (tryExpressionResult.isResolved) {
      this.compileConstant(tryExpressionResult.value);
    } else {
      this.compileSubExpression(this.lowestPrecedence);
    }
    this.logMessage(`*==* compileExpression() - EXIT`);
    return tryExpressionResult;
  }

  private compileSubExpression(entryPrecedence: number) {
    // compile this expression - recursively
    // PNut compile_exp: @@topexp:
    this.logMessage(`compileSubExpression(${entryPrecedence}) elem=[${this.currElement.toString()}] - ENTRY`);
    let currPrecedence: number = entryPrecedence; // PNut [dl] register
    if (--currPrecedence < 0) {
      // we need to resolve the term!

      // skip leading pluses
      do {
        this.getElement();
        if (this.currElement.isPlus) {
          // TODO: COVERAGE test me
          this.logMessage(`* skipping + operator`);
        }
      } while (this.currElement.isPlus);

      this.negConToCon(); // these do NOT affect the element list! only the global currElement copy
      this.SubToNeg();
      this.FSubToFNeg();
      if (this.currElement.type == eElementType.type_atat) {
        this.compileSubExpression(0); // with prec of 0
        this.objWrByte(eByteCode.bc_add_pbase);
      } else if (this.currElement.isUnary) {
        const savedElement: SpinElement = this.currElement;
        if (this.checkEqual()) {
          // we are now doing an assignment of some sort
          if (savedElement.isAssignable == false) {
            // [error_tocbufa]
            throw new Error('This operator cannot be used for assignment');
          }
          const bytecode: eByteCode = savedElement.byteCode - (eByteCode.bc_lognot - eByteCode.bc_lognot_write_push);
          this.compileVariablePre(bytecode);
        } else {
          // normal unary, NOT assignment
          this.compileSubExpression(savedElement.precedence);
          this.enterExpOp(savedElement);
        }
      } else if (this.currElement.type == eElementType.type_left) {
        // have left parem
        this.compileSubExpression(this.lowestPrecedence);
        this.getRightParen();
      } else {
        this.compileTerm();
      }
    } else {
      // precedence is 0 or greater
      this.compileSubExpression(currPrecedence);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.getElement();
        const savedElement: SpinElement = this.currElement;
        if (this.currElement.isTernary) {
          if (currPrecedence == this.ternaryPrecedence) {
            // have ternary op and is time to resolve it... (prec. match)
            this.compileSubExpression(this.lowestPrecedence);
            this.getColon();
            this.compileSubExpression(this.lowestPrecedence);
            this.objWrByte(eByteCode.bc_ternary);
            break;
          } else {
            // not ternary prec.
            this.backElement();
            break;
          }
        } else if (this.currElement.isBinary == false || currPrecedence != this.currElement.precedence) {
          this.backElement();
          break;
        } else {
          // have binary and time to resolve it (prec. match)
          this.compileSubExpression(currPrecedence);
          this.enterExpOp(savedElement);
        }
      }
    }
    this.logMessage(`compileSubExpression(${entryPrecedence}) - EXIT`);
  }

  private compileInstruction() {
    // Instruction Compiler
    // PNut compile_inst:
    this.logMessage(`*==* compileInstruction() at elem=[${this.currElement.toString()}]`);
    if (this.currElement.type == eElementType.type_back) {
      this.ct_try(eResultRequirements.RR_None, eByteCode.bc_drop_trap);
    } else if (this.currElement.type == eElementType.type_obj) {
      // obj{[]}.method({param,...})?
      this.ct_objpub(eResultRequirements.RR_None, eByteCode.bc_drop);
    } else if (this.currElement.type == eElementType.type_method) {
      // method({param,...})?
      this.ct_method(eResultRequirements.RR_None, eByteCode.bc_drop);
    } else if (this.currElement.type == eElementType.type_i_next_quit) {
      // instruction 'NEXT'/'QUIT' ?
      this.ci_next_quit();
    } else if (this.currElement.type == eElementType.type_i_return) {
      // instruction 'RETURN' ?
      this.ci_return();
    } else if (this.currElement.type == eElementType.type_i_abort) {
      // instruction 'ABORT' ?
      this.ci_abort();
    } else if (this.currElement.type == eElementType.type_i_cogspin) {
      // instruction 'COGSPIN' ?
      this.ct_cogspin(eByteCode.bc_coginit);
    } else if (this.currElement.type == eElementType.type_debug) {
      // DEBUG()?
      this.ci_debug();
    } else if (this.currElement.type == eElementType.type_i_flex) {
      // flex instruction?
      this.logMessage(`* compileInstruction() flexCode=(${this.currElement.flexByteCode})[${eByteCode[this.currElement.flexByteCode]}]`);
      if (this.currElement.flexResultCount > 0) {
        // [error_ticobu]
        throw new Error('This instruction can only be used as an expression term, since it returns results');
      }
      const flexCode: eFlexcode = this.spinSymbolTables.getFlexcodeFromBytecode(this.currElement.flexByteCode);
      this.compileFlex(flexCode);
    } else if (this.currElement.isAsmDirective(eValueType.dir_org)) {
      // inline assembly?
      this.compileInline();
    } else if (this.currElement.type == eElementType.type_inc) {
      // ++var ?
      this.compileVariablePre(eByteCode.bc_var_inc);
    } else if (this.currElement.type == eElementType.type_dec) {
      // --var ?
      this.compileVariablePre(eByteCode.bc_var_dec);
    } else if (this.currElement.type == eElementType.type_rnd) {
      // ??var ?
      this.compileVariablePre(eByteCode.bc_var_rnd);
    } else {
      this.SubToNeg(); // Convert op_sub to op_neg
      this.FSubToFNeg(); // Convert op_fsub to op_fneg
      if (this.currElement.isUnary) {
        this.ci_unary(); // NOTE: this can be inlined!
      } else {
        // remember this element
        // NOTE: get current element index, NOT next element index
        const savedNextElementIndex: number = this.saveElementLocation() - 1; // [source_start]
        if (this.currElement.type == eElementType.type_under) {
          // _,... := param(s),... ?
          this.getComma(); // this works since we are at the beginning of line!
          this.compileVariableMultiple(savedNextElementIndex); // this handles the rest of the line
        } else {
          // @@notunder:
          //this.logMessage(`  -- compInstru() at elem=[${this.currElement.toString()}]`);
          const variableReturn: iVariableReturn = this.checkVariable(); // variable ?
          if (variableReturn.isVariable == false) {
            // [error_eaiov]
            throw new Error('Expected an instruction or variable');
          }
          this.currElement = this.getElement(); // get element after variable
          if (this.currElement.type == eElementType.type_comma) {
            // var,... := param(s),... ?
            this.compileVariableMultiple(savedNextElementIndex);
          } else if (this.currElement.type == eElementType.type_left) {
            // var({param,...}){:results} ?
            this.ct_method_ptr(savedNextElementIndex, eResultRequirements.RR_None, eByteCode.bc_drop);
          } else if (this.currElement.type == eElementType.type_inc) {
            // var++ ?
            this.compileVariableAssign(variableReturn, eByteCode.bc_var_inc);
          } else if (this.currElement.type == eElementType.type_dec) {
            // var-- ?
            this.compileVariableAssign(variableReturn, eByteCode.bc_var_dec);
          } else if (this.currElement.isLogNot) {
            // var!! ?
            this.compileVariableAssign(variableReturn, eByteCode.bc_var_lognot);
          } else if (this.currElement.isBitNot) {
            // var! ?
            this.compileVariableAssign(variableReturn, eByteCode.bc_var_bitnot);
          } else if (this.currElement.type == eElementType.type_til) {
            // var~ ?
            this.compileVariableClearSetInst(variableReturn, eCompOp.CO_Clear);
          } else if (this.currElement.type == eElementType.type_tiltil) {
            // var~~ ?
            this.compileVariableClearSetInst(variableReturn, eCompOp.CO_Set);
          } else if (this.currElement.type == eElementType.type_assign) {
            // var := ?
            this.compileExpression();
            variableReturn.operation = eVariableOperation.VO_WRITE;
            this.compileVariable(variableReturn);
          } else if (this.currElement.isBinary && this.nextElementType() == eElementType.type_equal) {
            // var binary op assign (w/push)?
            if (this.currElement.isAssignable == false) {
              // [error_tocbufa]
              throw new Error('This operator cannot be used for assignment');
            }
            this.logMessage(`* compileInstruction() type_equal`);
            const baseByteCode: eByteCode = this.currElement.byteCode;
            this.getEqual(); // skip our equal sign
            this.compileExpression();
            variableReturn.operation = eVariableOperation.VO_ASSIGN;
            variableReturn.assignmentBytecode = baseByteCode - (eByteCode.bc_lognot - eByteCode.bc_lognot_write);
            this.compileVariable(variableReturn);
          } else {
            // here is @@notbin:
            this.backElement(); // backup to variable
            // [error_vnao]
            throw new Error('Variable needs an operator');
          }
        }
      }
    }
  }

  private compileVariableMultiple(startElementIndex: number) {
    // Compile multi-variable assignment - var,... := param(s),...
    // PNut compile_var_multi:
    const elementIndexStack: number[] = [];
    //this.logMessage(`  -- compileVariableMultiple() elem=[${this.nextElementIndex}] - ENTRY`);
    //this.logMessage();
    this.restoreElementLocation(startElementIndex);
    let parameterCount: number = 0;
    // eslint-disable-next-line no-constant-condition
    do {
      this.logMessage(`* pushed element index... have ${elementIndexStack.length} now...`);
      elementIndexStack.push(this.saveElementLocation());
      if (this.checkUnderscore() == false) {
        this.getVariable();
      }
      parameterCount++;
    } while (this.checkComma());
    this.getAssign();
    this.compileParametersNoParens(parameterCount);
    // capture ending index
    const endElementIndex = this.saveElementLocation();
    // set up for count down...
    let remainingParameterCount: number = parameterCount;
    do {
      const tmpIndex: number | undefined = elementIndexStack.pop();
      // ensure no underflow
      if (tmpIndex !== undefined) {
        this.restoreElementLocation(tmpIndex);
      } else {
        throw new Error('ERROR: [CODE] compileVariableMultiple() underflowed internal stack');
      }
      if (this.checkUnderscore()) {
        this.objWrByte(eByteCode.bc_pop);
      } else {
        this.compileVariableWrite();
      }
    } while (--remainingParameterCount);
    // restore to end of current assignment statement
    this.restoreElementLocation(endElementIndex);
    //this.logMessage(`  -- compileVariableMultiple(by [${callerID}]) elem=[${this.nextElementIndex}] - EXIT`);
  }

  private compileInline() {
    // Compile inline assembly section - first handle ORG operand(s)
    // PNut compile_inline:
    let inlineOrigin: number = 0;
    let inlineLimit: number = this.inlineLimit;
    // handle inline:  ORG {start{,limit}}
    if (this.checkEndOfLine() == false) {
      const startValueReturn: iValueReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
      if (startValueReturn.value > BigInt(inlineLimit)) {
        // [error_icaexl]
        //throw new Error('Inline cog address exceeds $120 limit');
        throw new Error(`Inline cog address exceeds $${this.inlineLimit.toString(16)} limit`);
      }
      inlineOrigin = Number(startValueReturn.value);
      if (this.checkComma()) {
        const limitValueReturn: iValueReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
        if (limitValueReturn.value > BigInt(inlineLimit)) {
          // [error_icaexl]
          //throw new Error('Inline cog address exceeds $120 limit');
          throw new Error(`Inline cog address exceeds $${this.inlineLimit.toString(16)} limit`);
        }
        inlineLimit = Number(limitValueReturn.value);
      }
      // this is @@orgend:
      this.getEndOfLine();
    }
    // this is @@org:
    this.objWrByte(eByteCode.bc_hub_bytecode);
    this.objWrByte(eByteCode.bc_inline);
    this.objWrWord(inlineOrigin); // enter origin
    this.objWrWord(0); // enter placeholder for length in longs
    const patchLocation: number = this.objImage.offset;
    const isInlineMode: boolean = true;
    // compile inline section
    this.compile_dat_blocks(isInlineMode, inlineOrigin << 2, inlineLimit << 2);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if ((this.objImage.offset ^ patchLocation) & 0b11) {
        this.objWrByte(0);
      } else {
        break;
      }
    }
    const lengthInLongs: number = (this.objImage.offset - patchLocation) >> 2;
    if (lengthInLongs == 0) {
      // [error_isie]
      throw new Error('Inline section is empty');
    }
    this.objImage.replaceWord(lengthInLongs - 1, patchLocation - 2); // replace the placeholder with length
    this.logMessage(`  -- compileInLine() - EXIT`);
  }

  private ci_next_quit() {
    // Compile instruction - 'next'/'quit'
    // PNut ci_next_quit:
    const isQuit: boolean = this.currElement.bigintValue == 1n ? true : false; // T/F where T means quit=1 vs. next=0
    const isNext: boolean = isQuit == false;
    let nestLevel: number = this.blockStack.topIndex; // this is PNut [ecx]
    let popCount: number = 0; // this is PNut [edx]
    let byteCode: eByteCode;
    const topItem: string = nestLevel != -1 ? eElementType[this.blockStack.typeAtLevel(nestLevel)] : '-emptyStack-';
    this.logMessage(`* ci_next_quit() nestLevel=(${nestLevel}), topItemType=[${topItem}]`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // if topIndex was -1..  if we have empty blockStack
      if (nestLevel < 0) {
        // [error_tioawarb]
        throw new Error('This instruction is only allowed within a REPEAT block');
      }
      const nestType: eElementType = this.blockStack.typeAtLevel(nestLevel);
      byteCode = eByteCode.bc_jmp;
      if (nestType == eElementType.type_repeat) {
        break;
      } else if (nestType == eElementType.type_repeat_var || nestType == eElementType.type_repeat_count_var) {
        if (isQuit) {
          popCount += 4 * 4;
        }
        break;
      } else if (nestType == eElementType.type_repeat_count) {
        byteCode = eByteCode.bc_jnz;
        break;
      } else if (nestType == eElementType.type_case) {
        popCount += 2 * 4;
      } else if (nestType == eElementType.type_case_fast) {
        popCount += 1 * 4;
      } else if (nestType == eElementType.type_if) {
        // nothing to do...
      } else {
        // [error_internal]
        throw new Error('Internal error! - ci_next_quit()');
      }
      nestLevel--;
    }
    // here is @@got
    if (popCount > 0) {
      if (popCount == 1 * 4) {
        this.objWrByte(eByteCode.bc_pop);
      } else {
        this.objWrByte(eByteCode.bc_pop_rfvar);
        this.compileRfvar(BigInt(popCount - 1 * 4));
      }
    }
    // here is @@nopops:
    if (isNext) {
      const address: number = this.blockStack.readAtLevel(nestLevel, 0);
      this.compileBranch(eByteCode.bc_jmp, address);
    } else {
      const address: number = this.blockStack.readAtLevel(nestLevel, 1);
      this.compileBranch(byteCode, address);
    }
  }

  private ci_return() {
    // Compile instruction - 'return'
    // PNut ci_return:
    if (this.nextElementType() == eElementType.type_end) {
      this.objWrByte(eByteCode.bc_return_results);
    } else {
      if (this.subResults == 0) {
        // [error_eeol]
        throw new Error('Expected end of line (m100)');
      }
      this.compileParametersNoParens(this.subResults);
      this.objWrByte(eByteCode.bc_return_args);
    }
  }

  private ci_abort() {
    // Compile instruction - 'abort'
    // PNut ci_abort:
    if (this.nextElementType() == eElementType.type_end) {
      this.objWrByte(eByteCode.bc_abort_0);
    } else {
      this.compileExpression();
      this.objWrByte(eByteCode.bc_abort_arg);
    }
  }

  private ci_send() {
    // Compile instruction - SEND()
    // PNut ci_send:
    this.logMessage(`*==* ci_send()`);
    this.getLeftParen();
    if (this.checkRightParen()) {
      // [error_esendd]
      throw new Error('Expected SEND data');
    }
    // check for string of bytes
    do {
      // here is @@trynext
      let byteCount: number = 0;
      // remember start of constants
      const savedElementIndex = this.saveElementLocation();
      // count the number of constant-bytes in sequence
      do {
        // here is @@trybytes
        this.getElement();
        if (this.currElement.type != eElementType.type_con || this.currElement.bigintValue > 255n) {
          break;
        }
        byteCount++;
      } while (this.checkComma());

      // this is @@notbyte:
      // return to start of constants
      this.restoreElementLocation(savedElementIndex);
      // if we have more than two constants...
      if (byteCount >= 2) {
        // we should declare this as string
        this.objWrByte(eByteCode.bc_call_send_bytes);
        this.compileRfvar(BigInt(byteCount));
        do {
          // this is @@enterbytes:
          this.getElement();
          this.objWrByte(Number(this.currElement.value));
          if (byteCount > 1) {
            this.getComma();
          }
        } while (--byteCount);
      } else {
        // less than two bytes or larger constant
        // here is @@tryother:
        // byteCount < 2
        const valueIsOnStack: boolean = this.compileParameterSend();
        if (valueIsOnStack) {
          this.objWrByte(eByteCode.bc_call_send);
        }
      }
    } while (this.getCommaOrRightParen());
  }

  private ci_unary() {
    // Compile instruction - unary var assignment
    // PNut ci_unary:
    if (this.currElement.isAssignable == false) {
      // [error_tocbufa]
      throw new Error('This operator cannot be used for assignment');
    }
    const byteCode: eByteCode = Number(this.currElement.byteCode);
    const adjustedByteCode: number = byteCode - (eByteCode.bc_lognot - eByteCode.bc_lognot_write);
    this.getEqual();
    this.compileVariablePre(adjustedByteCode);
  }

  // ********************************
  // *  DEBUG Instruction Compiler  *
  // ********************************
  //
  //
  //  DEBUG byte commands:
  //
  //  00000000  end                             end of DEBUG commands
  //  00000001  asm                             set asm mode
  //  00000010  IF(cond)                        abort if cond = 0
  //  00000011  IFNOT(cond)                     abort if cond <> 0
  //  00000100  cogn                            output "CogN  " with possible timestamp
  //  00000101  chr                             output chr
  //  00000110  str                             output string
  //  00000111  DLY(ms)                         delay for ms
  //  00001000  PC_KEY(ptr)                     get key
  //  00001001  PC_MOUSE(ptr)                   get mouse
  //
  //  ______00  ', ' + zstr + ' = ' + data      specifiers for ZSTR..SBIN_LONG_ARRAY
  //  ______01         zstr + ' = ' + data
  //  ______10                 ', ' + data
  //  ______11                        data
  //
  //  001000__  <empty>
  //  001001__  ZSTR(ptr)                       z-string, in quotes for show
  //  001010__  <empty>
  //  001011__  FDEC(val)                       floating-point
  //  001100__  FDEC_REG_ARRAY(ptr,len)         floating-point
  //  001101__  LSTR(ptr,len)                   length-string, in quotes for show
  //  001110__  <empty>
  //  001111__  FDEC_ARRAY(ptr,len)             floating-point
  //
  //  010000__  UDEC(val)                       unsigned decimal
  //  010001__  UDEC_BYTE(val)
  //  010010__  UDEC_WORD(val)
  //  010011__  UDEC_LONG(val)
  //  010100__  UDEC_REG_ARRAY(ptr,len)
  //  010100__  UDEC_BYTE_ARRAY(ptr,len)
  //  010110__  UDEC_WORD_ARRAY(ptr,len)
  //  010111__  UDEC_LONG_ARRAY(ptr,len)
  //
  //  011000__  SDEC(val)                       signed decimal
  //  011001__  SDEC_BYTE(val)
  //  011010__  SDEC_WORD(val)
  //  011011__  SDEC_LONG(val)
  //  011100__  SDEC_REG_ARRAY(ptr,len)
  //  011101__  SDEC_BYTE_ARRAY(ptr,len)
  //  011110__  SDEC_WORD_ARRAY(ptr,len)
  //  011111__  SDEC_LONG_ARRAY(ptr,len)
  //
  //  100000__  UHEX(val)                       unsigned hex
  //  100001__  UHEX_BYTE(val)
  //  100010__  UHEX_WORD(val)
  //  100011__  UHEX_LONG(val)
  //  100100__  UHEX_REG_ARRAY(ptr,len)
  //  100101__  UHEX_BYTE_ARRAY(ptr,len)
  //  100110__  UHEX_WORD_ARRAY(ptr,len)
  //  100111__  UHEX_LONG_ARRAY(ptr,len)
  //
  //  101000__  SHEX(val)                       signed hex
  //  101001__  SHEX_BYTE(val)
  //  101010__  SHEX_WORD(val)
  //  101011__  SHEX_LONG(val)
  //  101100__  SHEX_REG_ARRAY(ptr,len)
  //  101101__  SHEX_BYTE_ARRAY(ptr,len)
  //  101110__  SHEX_WORD_ARRAY(ptr,len)
  //  101111__  SHEX_LONG_ARRAY(ptr,len)
  //
  //  110000__  UBIN(val)                       unsigned binary
  //  110001__  UBIN_BYTE(val)
  //  110010__  UBIN_WORD(val)
  //  110011__  UBIN_LONG(val)
  //  110100__  UBIN_REG_ARRAY(ptr,len)
  //  110101__  UBIN_BYTE_ARRAY(ptr,len)
  //  110110__  UBIN_WORD_ARRAY(ptr,len)
  //  110111__  UBIN_LONG_ARRAY(ptr,len)
  //
  //  111000__  SBIN(val)                       signed binary
  //  111001__  SBIN_BYTE(val)
  //  111010__  SBIN_WORD(val)
  //  111011__  SBIN_LONG(val)
  //  111100__  SBIN_REG_ARRAY(ptr,len)
  //  111101__  SBIN_BYTE_ARRAY(ptr,len)
  //  111110__  SBIN_WORD_ARRAY(ptr,len)
  //  111111__  SBIN_LONG_ARRAY(ptr,len)
  //

  private ci_debug() {
    // Compile DEBUG for Spin2
    // PNut ci_debug:
    this.nextDebugIsFirst(); // assure first at start of new debug() line
    this.debug_record.clear(); // each debug() line, start with empty record
    this.debug_stack_depth = 0;
    const notPasmMode: boolean = false;

    if (this.context.compileOptions.enableDebug == false) {
      // remove all but end of line
      this.logMessage(`*--* ci_debug(${this.currElement.toString()}) - Debug() processing disabled`);
      this.skipToEnd();
    } else {
      this.logMessage(`*--* ci_debug(${this.currElement.toString()}) ENTRY`);
      if (!this.checkLeftParen()) {
        // consumes left paren if next is left paren
        // we found 'debug' without parens
        this.getEndOfLine();
        this.backElement();
        this.objWrByte(eByteCode.bc_debug); // enter DEBUG bytecode
        this.objWrByte(0); // enter rfvar value for stack popping
        this.objWrByte(0); // enter BRK code for debugger
      } else {
        // here is @@left
        if (this.checkRightParen()) {
          // consumes right paren if next is right paren
          // we found 'debug()'
          this.enterDebug(notPasmMode);
        } else {
          // we are at '('
          this.getElement(); // move to next after '('
          // here is ci_debug:@@tickcommand
          if (this.currElement.type == eElementType.type_tick) {
            //
            this.processBackTickDebug(notPasmMode); // this always sets debug_first
          } else {
            // here is ci_debug:@@nottick
            this.processNonTickDebug(notPasmMode);
          }
        }
      }
      this.logMessage(`*--* ci_debug(${this.currElement.toString()}) EXIT`);
    }
  }

  private processBackTickDebug(isPasmMode: boolean): number {
    // here is ci_debug:@@tickstr
    //  NOTE: debug(`...) is BackTickDebug
    // enter string, returning indication if end of line
    // NOTE: the following method always sets debug_first
    let brkCode: number = 0;
    this.logMessage(` -- processBackTickDbg(${this.currElement.toString()}) - ENTRY`);
    const anotherTickFollows: boolean = this.debugTickString();
    if (anotherTickFollows == false) {
      // found ')' and end of line, enter debug data
      this.skipToEnd(); // syncronize our element list position
      brkCode = this.enterDebug(isPasmMode);
    } else {
      // we know another tick is coming but our element list is not positioned correctly
      // syncronize our element list position
      while (this.skipToTickOrEndOfLine()) {
        // here is ci_debug:@@tickcommand
        // at '`' move to next
        this.getElement();
        this.logMessage(`  -- at elem=[${this.currElement.toString()}]`);
        if (this.currElement.type == eElementType.type_debug_cmd) {
          // here is @@tickcmd
          // this handles commands of dual and single parameters
          const skipEndOfLineBypass: boolean = true;
          this.tickCmd(this.currElement.numberValue, isPasmMode, skipEndOfLineBypass); // UBIN()
        } else if (this.currElement.type == eElementType.type_if) {
          // here is @@isif
          this.singleParam(eValueType.dc_if, isPasmMode);
          // go to @@checknext
          // logically if there is a next tick loop, else bail
          // goto @@ticknext to test for tick, if found go to @@tickcommand
        } else if (this.currElement.type == eElementType.type_ifnot) {
          // here is @@isifnot
          this.singleParam(eValueType.dc_ifnot, isPasmMode);
          // go to @@checknext
          // logically if there is a next tick loop, else bail
          // goto @@ticknext to test for tick, if found go to @@tickcommand
        } else if (this.currElement.type == eElementType.type_left) {
          // here is @@tickdec
          this.backElement(); // backup so we start with paren immediately after the tic of "`(...)"
          this.tickCmd(0b01100011, isPasmMode); // '(', back up and do SDEC_
        } else if (this.currElement.type == eElementType.type_dollar) {
          // here is @@tickhex
          this.tickCmd(0b10100011, isPasmMode); // '$', do UHEX_
        } else if (this.currElement.type == eElementType.type_percent) {
          // here is @@tickbin
          this.tickCmd(0b11000011, isPasmMode); // '%', do UBIN_
        } else if (this.currElement.type == eElementType.type_pound) {
          // here is @@tickchr
          this.getLeftParen();
          // here is @@tickchrlp
          do {
            this.debugEnterByte(eValueType.dc_chr);
            if (isPasmMode == false) {
              // spin debug
              this.compileExpression();
              this.incStack();
            } else {
              // pasm debug
              //this.logMessage(`  -- processBackTicDbg() hand off to compParamPasm() elem=[${this.currElement.toString()}]`);
              //this.compileParameter();
              this.compileParameterAsm(); // new TESTING
              //this.logMessage(`  -- processBackTicDbg() back from compParamPasm() elem=[${this.currElement.toString()}]`);
            }
            this.nextDebugIsFirst(); // reset to first
            // call	 get_comma_or_right
            // je	   @@tickchrlp
          } while (this.getCommaOrRightParen());
        } else {
          // [error_eldppodc]
          throw new Error('Expected "(", "$", "%", "#", or DEBUG command');
        }
        // if white space before next tic emit it
        // UNGH! back up, go forward to allow compile of the following if!
        this.backElement();
        this.currElement = this.getElement();
        this.logMessage(`* ProcessBackTickDbg() at tickCmd rightParen? elem=[${this.currElement.toString()}]`);
        if (this.currElement.type == eElementType.type_right) {
          this.debugWhiteSpaceString();
        }
      }
      this.logMessage(`  -- prcssBackTicDbg() dbgRcdLen=(${this.debug_record.length})`);
      // all tick commands processed, now record the new debug records
      brkCode = this.enterDebug(isPasmMode);
      this.logMessage(`  -- back to top of loop`);
    }
    this.logMessage(` -- processBackTickDbg(${this.currElement.toString()}) - EXIT w/(${brkCode})`);
    return brkCode;
  }

  private processNonTickDebug(isPasmMode: boolean): number {
    // here is ci_debug::@@nottick:
    //  NOTE: NOT THIS: debug(`...)    (this is BackTickDebug, above)
    //        but THIS: debug("...) or e.g., debug(uhex_long()) is nonTickDebug
    let brkCode: number = 0;
    let didFirstPass: boolean = false;
    this.logMessage(` -- processNonTickDbg(${this.currElement.toString()}) - ENTRY`);
    // here for 1st occurrence of if()/ifnot()
    if (this.currElement.type == eElementType.type_if) {
      this.singleParam(eValueType.dc_if, isPasmMode); // compile single-parameter command
      didFirstPass = true; // ensure next getElement works
    } else if (this.currElement.type == eElementType.type_ifnot) {
      this.singleParam(eValueType.dc_ifnot, isPasmMode); // compile single-parameter command
      didFirstPass = true; // ensure next getElement works
    } else {
      this.backElement();
    }
    this.debugEnterByte(eValueType.dc_cogn); // enter cogn command
    do {
      if (didFirstPass == true) {
        this.logMessage(`  -- found if elem=[${this.currElement.toString()}]`);
        didFirstPass = false;
      } else {
        // here is @@next:
        this.getElement();
        this.logMessage(` -- processNonTickDbg() @@next elem=[${this.currElement.toString()}]`);
        // here for 2nd or more occurrence of if()/ifnot()
        if (this.currElement.type == eElementType.type_if) {
          this.singleParam(eValueType.dc_if, isPasmMode);
        } else if (this.currElement.type == eElementType.type_ifnot) {
          this.singleParam(eValueType.dc_ifnot, isPasmMode);
        } else if (this.currElement.type == eElementType.type_debug_cmd) {
          // line above is @@notif3:
          // this handles commands of dual and single parameters
          const skipEndOfLineBypass: boolean = true;
          this.tickCmd(this.currElement.numberValue, isPasmMode, skipEndOfLineBypass);
        } else {
          // here is @@notcmd:
          const foundString: boolean = this.debugCheckString();
          if (foundString == false) {
            this.debugEnterByte(eValueType.dc_chr);
            if (isPasmMode == false) {
              this.compileExpression();
              this.incStack();
            } else {
              //this.logMessage(`  -- processNonTicDbg() hand off to compParamPasm() elem=[${this.currElement.toString()}]`);
              //this.compileParameter();
              this.compileParameterAsm(); // new TESTING
              //this.logMessage(`  -- processNonTicDbg() back from compParamPasm() elem=[${this.currElement.toString()}]`);
            }
            this.nextDebugIsFirst(); // reset to first
          }
        }
        this.logMessage(`  -- end of do...while`);
      }
      // PNut here is @@checknext
    } while (this.getCommaOrRightParen());
    brkCode = this.enterDebug(isPasmMode);
    this.logMessage(` -- processNonTickDbg(${this.currElement.toString()}) - EXIT w/(${brkCode})`);
    return brkCode;
  }

  private enterDebug(isPasmMode: boolean): number {
    // here is ci_debug:@@enterdebug
    this.logMessage(`  -- enterDebug(isPasmMode=(${isPasmMode})) ENTRY`);
    let brkCode: number = 0; // only useful if isPasmMode == true
    if (isPasmMode == false) {
      this.objWrByte(eByteCode.bc_debug); // end of DEBUG data/commands, enter DEBUG bytecode
      this.objWrByte(this.debug_stack_depth); // enter rfvar value for stack popping
      const brkCode: number = this.debugEnterRecord(); // enter record into debug data, returning brk code
      this.objWrByte(brkCode); // enter BRK code
    } else {
      // here is ci_debug:@@enterdebug
      brkCode = this.debugEnterRecord(); // enter record into debug data, returning brk code
    }
    this.logMessage(`  -- enterDebug() EXIT`);
    return brkCode;
  }

  private incStack() {
    this.debug_stack_depth += 4;
    if (this.debug_stack_depth > 127) {
      // [error_dditl]
      throw new Error('DEBUG data is too long: too many expressions (> 31)');
    }
  }

  private tickCmd(cmdValue: number, isPasmMode: boolean, skipWrapupOnLast: boolean = false) {
    //Here is @@tickCmd:
    this.logMessage(`  -- tickCmd(cmd=(${cmdValue})) - ENTRY`);
    if (isPasmMode == false) {
      if (cmdValue == eValueType.dc_dly || cmdValue == eValueType.dc_pc_key || cmdValue == eValueType.dc_pc_mouse) {
        // NOTE any of these three MUST be the last tickcommand in a debug() statement
        // here is ci_debug:@@dkm
        this.singleParam(cmdValue); // removes the dly(  --> close ')'
        this.getRightParen(); // remove debug(  --> close paren ')'
        // SPECIAL skipWrapupOnLast handling:
        //   when we are within a loop checking for ',' or ')'
        //    put our close paren back!
        if (skipWrapupOnLast) {
          this.backElement(); // now put debug(  --> close paren ')' back in place
        }
      } else {
        // here is ci_debug:@@notdkm
        if (cmdValue & 0x10) {
          // here is @@dualparam
          this.dualParamCheck(cmdValue);
        } else {
          // here is singleParam which handles @@spsimple && @@spverbose
          this.singleParamCheck(cmdValue);
        }
      }
    } else {
      this.tickCmdAsm(cmdValue, skipWrapupOnLast);
    }
    this.logMessage(`  -- tickCmd(cmd=(${cmdValue})) - EXIT`);
  }

  private tickCmdAsm(cmdValue: number, skipWrapupOnLast: boolean = false) {
    //Here is @@tickCmd:
    const pasmMode: boolean = true;
    let currCmdValue: number = cmdValue;
    this.logMessage(`* tickCmdAsm(${hexByte(cmdValue, '0x')}) ENTRY elem=[${this.currElement.toString()}]`);
    if (cmdValue == eValueType.dc_dly || cmdValue == eValueType.dc_pc_key || cmdValue == eValueType.dc_pc_mouse) {
      // NOTE any of these three MUST be the last tickcommand in a debug() statement
      // here is ci_debug:@@dkm
      this.singleParam(cmdValue, pasmMode);
      this.getRightParen();
      // SPECIAL skipWrapupOnLast handling:
      //   when we are within a loop checking for ',' or ')'
      //    put our close paren back!
      if (skipWrapupOnLast) {
        this.backElement(); // now put debug(  --> close paren ')' back in place
      }
    } else {
      // here is ci_debug:@@notdkm
      this.getLeftParen();
      // here is @@param:
      do {
        currCmdValue = this.debugEnterByteFlag(currCmdValue);
        if ((currCmdValue & 0x02) == 0) {
          // select getparam
          const [startOffset, endOffset] = this.debugExpSource(pasmMode);
          this.debugVerboseString(startOffset, endOffset);
          //this.getElement();
        }
        // here is @@notverbose
        if (currCmdValue & 0x10) {
          this.compileParameterAsm();
          this.getComma();
        }
        // here is @@oneparam:
        this.compileParameterAsm();
      } while (this.getCommaOrRightParen());
    }
    this.logMessage(`* tickCmdAsm(${hexByte(cmdValue, '0x')}) EXIT`);
  }

  private dualParamCheck(cmdValue: number) {
    this.logMessage(`* dualParamChk(${hexByte(cmdValue & 0xff, '0x')}) curElem=${this.currElement.toString()} - ENTRY`);
    if (cmdValue & 0x02) {
      // here is @@dpsimple
      this.dualParamSimple(cmdValue);
    } else {
      this.getLeftParen();
      // here is @@dpverbose
      this.dualParamVerbose(cmdValue);
    }
    this.logMessage(`* dualParamChk(${hexByte(cmdValue & 0xff, '0x')}) - EXIT`);
  }

  private dualParamSimple(cmdValue: number) {
    // PNut ci_debug:@@dpsimple
    let parameterCount = this.compileParametersMethodPtr();
    let currCmdValue: number = cmdValue;
    if (parameterCount == 0) {
      // [error_eaet]
      throw new Error('Expected an expression term (m090)');
    } else if (parameterCount & 0x1) {
      // [error_eaenop]
      throw new Error('Expected an even number of parameters');
    }
    // PNut here is @@dpsmulti
    while ((parameterCount -= 2) >= 0) {
      currCmdValue = this.debugEnterByteFlag(currCmdValue);
      this.incStack();
      this.incStack();
    }
  }

  private dualParamVerbose(cmdValue: number) {
    // PNut ci_debug:@@dpverbose:
    let currCmdValue: number = cmdValue;
    this.logMessage(`* dualParamVerbose(${hexByte(cmdValue, '0x')}) curElem=${this.currElement.toString()}`);
    //this.getElement(); // move to value after '('
    do {
      const [startCharOffset, endCharOffset] = this.debugExpSource();
      const twoParams: number = 2;
      this.compileParametersNoParens(twoParams);
      currCmdValue = this.debugEnterByteFlag(currCmdValue);
      this.incStack();
      this.incStack();
      this.debugVerboseString(startCharOffset, endCharOffset);
    } while (this.getCommaOrRightParen());
  }

  private singleParamCheck(cmdValue: number) {
    this.logMessage(`* singleParamChk(${hexByte(cmdValue, '0x')})`);
    if (cmdValue & 0x02) {
      // here is @@spsimple
      this.singleParamSimple(cmdValue);
    } else {
      this.getLeftParen();
      // here is @@spverbose
      this.singleParamVerbose(cmdValue);
    }
  }

  private singleParamSimple(cmdValue: number) {
    // PNut ci_debug:@@spsimple:
    let currCmdValue: number = cmdValue;
    this.logMessage(`* singleParamSimple(${hexByte(cmdValue, '0x')}) curElem=${this.currElement.toString()}`);
    let parameterCount = this.compileParametersMethodPtr();
    this.logMessage(`* singleParamSimple(${hexByte(cmdValue, '0x')}) curElem=${this.currElement.toString()} -> parameterCount=(${parameterCount})`);
    if (parameterCount == 0) {
      // [error_eaet]
      throw new Error('Expected an expression term (m091)');
    }
    while (parameterCount--) {
      currCmdValue = this.debugEnterByteFlag(currCmdValue);
      this.incStack();
    }
  }

  private singleParamVerbose(cmdValue: number) {
    // PNut ci_debug:@@spverbose:
    let currCmdValue: number = cmdValue;
    do {
      const [startCharOffset, endCharOffset] = this.debugExpSource();
      let parameterCount = this.compileParameter();
      currCmdValue = this.debugEnterByteFlag(currCmdValue);
      this.incStack();
      this.debugVerboseString(startCharOffset, endCharOffset);
      parameterCount--;
      if (parameterCount > 0) {
        currCmdValue |= 0x02;
        while (parameterCount--) {
          currCmdValue = this.debugEnterByteFlag(currCmdValue);
          this.incStack();
        }
        currCmdValue &= 0xfc;
      }
    } while (this.getCommaOrRightParen());
  }

  private debugExpSource(isPasmMode: boolean = false): [number, number] {
    // PNut debug_exp_source:
    const savedElementIndex = this.saveElementLocation();
    this.getElement(); // skip paren
    this.logMessage(
      `* debugExpSource(isPasm=(${isPasmMode})) - ENTRY elem=[${this.currElement.toString()}](${this.currElement.sourceCharacterOffset},?)`
    );
    const startOffset: number = this.currElement.sourceCharacterOffset;
    this.backElement();
    // here is ci_debug:@@skipparam for debug() (not asm form)
    if (isPasmMode == false) {
      const savedObjectOffset = this.objImage.offset;
      this.compileParameter(); // move currElement past our parameter parts
      this.objImage.setOffsetTo(savedObjectOffset);
    } else {
      this.checkPound(); // move past '#' if present
      // NOTE we are just skipping past so we don't use this return value
      const startValueReturn: iValueReturn = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
    }
    this.logMessage(
      `* debugExpSource() elem=[${this.currElement.toString()}](${this.currElement.sourceCharacterOffset},${this.currElement.sourceCharacterEndOffset})`
    );
    //if (this.currElement.type == eElementType.type_con) {
    //  this.getElement
    //}
    const endoffset: number = this.currElement.sourceCharacterEndOffset;
    this.logMessage(`* debugExpSource() - EXIT srt=(${startOffset}), end=(${endoffset})`);
    this.restoreElementLocation(savedElementIndex); // restore to left paren
    return [startOffset, endoffset];
  }

  private debugVerboseString(startOffset: number, endOffset: number) {
    // PNut debug_verbose_string:
    let currSrcLine = this.srcFile?.lineAt(this.currElement.sourceLineIndex).text;
    if (currSrcLine) {
      // enter string bytes
      for (let index = startOffset; index <= endOffset; index++) {
        const currCharCode: number = currSrcLine.charCodeAt(index);
        this.debugEnterByte(currCharCode);
      }
      this.debugEnterByte(0); // zero-terminate string
    }
  }

  private debugEnterByteFlag(cmdValue: number): number {
    // PNut debug_enter_byte_flag:
    this.logMessage(`* debugEnterByteFlg(${hexByte(cmdValue, '0x')}) debug_first=(${this.debug_first})`);
    this.debugEnterByte(cmdValue | (this.debug_first ? 1 : 0));
    this.nextDebugIsFirst(false); // we marked the first, remaining are not first
    return cmdValue & 0xfe;
  }

  private singleParam(cmdValue: number, isPasmMode: boolean = false) {
    // PNut ci_debug:@@singleparam:
    this.logMessage(`  -- singleParam(cmd=(${cmdValue})) - ENTRY`);
    this.debugEnterByte(cmdValue);
    if (isPasmMode == false) {
      // spin mode
      this.compileParameters(1);
      this.incStack();
    } else {
      // PNut ci_debug:@@singleparam:
      this.getLeftParen();
      this.compileParameterAsm();
      this.getRightParen();
    }
    this.logMessage(`  -- singleParam(cmd=(${cmdValue})) - EXIT`);
  }

  private compileParameterAsm() {
    // PNut @@compileparam:
    const haveImmedValue = this.checkPound(); // move past '#' if present
    // NOTE we are just skipping past so we don't use this return value
    const operandValueReturn: iValueReturn = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
    const valueFound: number = Number(operandValueReturn.value);
    if (haveImmedValue) {
      if ((valueFound & 0xffffc000) != 0) {
        this.debugEnterByte(0x40);
        this.debugEnterByte(valueFound);
        this.debugEnterByte(valueFound >> 8);
        this.debugEnterByte(valueFound >> 16);
        this.debugEnterByte(valueFound >> 24);
      } else {
        // here is @@wordparam
        this.debugEnterByte(valueFound >> 8);
        this.debugEnterByte(valueFound);
      }
    } else {
      if (valueFound > 0x3ff) {
        // [error_rpcx]
        throw new Error('Register parameter cannot exceed $3FF');
      }
      this.debugEnterByte((valueFound >> 8) | 0x80);
      this.debugEnterByte(valueFound);
    }
  }

  private debugCheckString(): boolean {
    // PNut debug_check_string:
    // If chrs expressed in source, enter string
    let foundStringStatus = true;
    this.backElement(); // postion to left paren
    let stringLength: number = 0;
    const savedElementIndex = this.saveElementLocation();
    do {
      this.getElement();
      if (this.currElement.type != eElementType.type_con) {
        break;
      }
      const charValue: number = this.currElement.numberValue;
      if (charValue < 1 || charValue > 0xff) {
        foundStringStatus = false;
        break;
      }
      stringLength++;
    } while (this.checkComma());
    // here is @@notchr:
    this.restoreElementLocation(savedElementIndex); // restore to left paren
    //this.logMessage(` -- debugCheckString(${this.currElement.toString()}) stringLength=(${stringLength})`);
    if (stringLength == 0) {
      foundStringStatus = false;
    } else {
      this.debugEnterByte(eValueType.dc_str);
      for (let index = 0; index < stringLength; index++) {
        this.getElement();
        let chrByte: number = this.currElement.numberValue;
        this.debugEnterByte(chrByte);
        if (index < stringLength - 1) {
          this.getComma();
        }
      }
      this.debugEnterByte(0); // zero terminate our string
      this.nextDebugIsFirst(); // reset to first after string
    }
    this.logMessage(` -- debugCheckString(${this.currElement.toString()})  stringLength=(${stringLength}) -> foundString=(${foundStringStatus})`);
    return foundStringStatus;
  }

  private debugWhiteSpaceString() {
    this.logMessage(` -- debugWhiteSpaceString(${this.currElement.toString()})`);
    // PNut ...
    // If chrs expressed in source, enter string
    let foundStringStatus = true;
    let stringLength: number = 0;
    const savedElementIndex = this.saveElementLocation();
    do {
      this.getElement();
      if (this.currElement.type != eElementType.type_con) {
        break;
      }
      const charValue: number = this.currElement.numberValue;
      if (charValue < 1 || charValue > 0xff) {
        foundStringStatus = false;
        break;
      }
      stringLength++;
    } while (this.checkComma());
    // here is @@notchr:
    this.restoreElementLocation(savedElementIndex); // restore to left paren
    //this.logMessage(` -- debugCheckString(${this.currElement.toString()}) stringLength=(${stringLength})`);
    if (stringLength == 0) {
      foundStringStatus = false;
    } else {
      this.debugEnterByte(eValueType.dc_str);
      for (let index = 0; index < stringLength; index++) {
        this.getElement();
        let chrByte: number = this.currElement.numberValue;
        this.debugEnterByte(chrByte);
        if (index < stringLength - 1) {
          this.getComma();
        }
      }
      this.debugEnterByte(0); // zero terminate our string
      this.nextDebugIsFirst(); // reset to first after string
    }
    this.logMessage(` -- debugWhiteSpaceString(${this.currElement.toString()}) charCount=(${stringLength})`);
  }

  private debugTickString(): boolean {
    // PNut debug_tick_string:
    // TODO: need to check for opening "(`"?
    // return value z=1 if '`', z=0 if ')'
    this.logMessage(` -- debugTickString(${this.currElement.toString()})`);
    let foundEndWithTickStatus: boolean = false;
    let currSrcLine = this.srcFile?.lineAt(this.currElement.sourceLineIndex).text;
    let charCount: number = 1;
    if (currSrcLine) {
      let charOffset = this.currElement.sourceCharacterOffset; // the backtick
      // count number of bytes to emit
      let parenNestCount: number = 0;
      for (let index = charOffset + 1; index < currSrcLine.length; index++) {
        const currChar = currSrcLine.charAt(index);
        if (currChar == '`') {
          // if we found next '`'
          foundEndWithTickStatus = true;
          break;
        } else if (currChar == '(') {
          parenNestCount++;
        } else if (currChar == ')') {
          if (parenNestCount > 0) {
            parenNestCount--;
          }
          // if we are at closing ')' at end of line
          if (parenNestCount == 0) {
            break;
          }
        }
        charCount++;
      }

      // now write the string to debug
      this.debugEnterByte(eValueType.dc_str); // enter debug string command
      // enter string bytes
      for (let index = charOffset; index < charOffset + charCount; index++) {
        const currCharCode: number = currSrcLine.charCodeAt(index);
        this.debugEnterByte(currCharCode);
      }
      this.debugEnterByte(0); // zero-terminate string
      this.nextDebugIsFirst(); // reset to first after string
    }
    this.logMessage(` -- debugTickString(${this.currElement.toString()}) charCount=(${charCount}) --> endWithTic=(${foundEndWithTickStatus})`);

    return foundEndWithTickStatus;
  }

  private debugEnterByte(byteValue: number) {
    // PNut debug_enter_byte:
    this.logMessage(` -- debugEnterByte(${hexByte(byteValue & 0xff, '0x')})`);
    this.debug_record.append(byteValue);
  }

  private debugEnterRecord(): number {
    // PNut debug_enter_record:
    this.logMessage(`debugEnterRcd() curr rcd len=(${this.debug_record.length}) - ENTRY`);
    this.debugEnterByte(0); // zero-terminate record
    let entryIndex: number = 1; // PNut bl register
    let recordPresent: boolean = false;
    do {
      recordPresent = this.debug_data.recordExists(entryIndex);
      if (recordPresent) {
        if (this.debug_data.recordIsMatch(entryIndex, this.debug_record)) {
          break; // return != 0 offset out of loop
        }
        if (++entryIndex > DebugData.MAX_ENTRIES) {
          // [error_dditl] WAS: DEBUG data is too long
          throw new Error(`DEBUG data is too long: too many records: max ${DebugData.MAX_ENTRIES}`);
        }
      }
    } while (recordPresent);
    // add new record here
    if (recordPresent == false) {
      this.debug_data.setRecord(entryIndex, this.debug_record);
    }
    this.debug_record.clear(); // record recorded or skipped, empty it
    this.logMessage(`debugEnterRcd() curr rcd len=(${this.debug_record.length}) - EXIT w/(${entryIndex})`);
    return entryIndex; // index of matched record or new record
  }

  private collapse_debug_data(isTopLevel: boolean) {
    // PNut collapse_debug_data:
    if (this.context.compileOptions.enableDebug == true && isTopLevel) {
      // compress our debug data then store it for listing and binary writing
      this.logMessage('* collapse_debug_data()');
      this.debug_compressed_data = this.debug_data.collapseDebugData;
    }
  }

  private ci_debug_asm(): number {
    // Compile DEBUG for assembler
    // PNut ci_debug_asm:
    // NOTE: only here if we have debug(...) or debug()
    this.logMessage(`*--* ci_debug_asm(${this.currElement.toString()}) - ENTRY`);
    let brkCode: number = 0;
    this.nextDebugIsFirst(); // assure first at start of new debug() line
    this.debug_record.clear(); // each debug() line, start with empty record
    const isPasmMode: boolean = true;
    // here is @@left
    if (this.checkRightParen()) {
      // consumes right paren if next is right paren
      // we found 'debug()'
      brkCode = this.enterDebug(isPasmMode);
    } else {
      this.debugEnterByte(eValueType.dc_asm); // asm mode debug
      // we are at '('
      this.getElement(); // move to next after '('
      // here is ci_debug:@@tickcommand
      if (this.currElement.type == eElementType.type_tick) {
        //
        brkCode = this.processBackTickDebug(isPasmMode); // this always sets debug_first
      } else {
        // here is ci_debug:@@nottick
        brkCode = this.processNonTickDebug(isPasmMode);
      }
    }
    this.logMessage(`*--* ci_debug_asm(${this.currElement.toString()}) - EXIT`);
    return brkCode;
  }

  private nextDebugIsFirst(isFirst: boolean = true) {
    const changed: boolean = isFirst == this.debug_first;
    if (changed) {
      this.logMessage(`  -- debug_first=(${this.debug_first}) -> (${isFirst})`);
    } else {
      this.logMessage(`  -- debug_first=(${this.debug_first})`);
    }
    this.debug_first = isFirst;
  }

  private compileTerm() {
    // PNut compile_term:
    const elementType: eElementType = this.currElement.type;
    this.logMessage(`*--* compileTerm(${eElementType[elementType]}[${this.currElement.toString()}])`);
    const elementValue: number = Number(this.currElement.bigintValue);
    if (this.currElement.isConstantInt || this.currElement.isConstantFloat) {
      // constant integer? or constant float?
      this.compileConstant(this.currElement.bigintValue);
    } else if (this.currElement.type == eElementType.type_constr) {
      // STRING?
      this.compileConString();
    } else if (this.currElement.type == eElementType.type_conlstr) {
      // LSTRING?
      this.compileConLString();
    } else if (this.currElement.type == eElementType.type_size && this.checkLeftParen()) {
      // BYTE/WORD/LONG?
      this.compileConData(elementValue);
    } else if (this.currElement.type == eElementType.type_float) {
      // FLOAT?
      this.compileFlex(eFlexcode.fc_float);
    } else if (this.currElement.type == eElementType.type_round) {
      // ROUND?
      this.compileFlex(eFlexcode.fc_round);
    } else if (this.currElement.type == eElementType.type_trunc) {
      // TRUNC?
      this.compileFlex(eFlexcode.fc_trunc);
    } else if (this.currElement.type == eElementType.type_back) {
      // \obj{[]}.method({param,...}), \method({param,...}), \var({param,...}){:results} ?
      this.ct_try(eResultRequirements.RR_None, eByteCode.bc_drop_trap_push);
    } else if (this.currElement.type == eElementType.type_obj) {
      // obj{[]}.method({param,...}) : ? or obj.con ?
      this.ct_objpubcon(eResultRequirements.RR_One, eByteCode.bc_drop_push);
    } else if (this.currElement.type == eElementType.type_method) {
      // method({param,...}) : ?
      this.ct_method(eResultRequirements.RR_One, eByteCode.bc_drop_push);
    } else if (this.currElement.type == eElementType.type_i_look) {
      // instruction LOOKUP/LOOKDOWN ?
      this.ct_look();
    } else if (this.currElement.type == eElementType.type_i_cogspin) {
      // instruction COGSPIN ?
      this.ct_cogspin(eByteCode.bc_coginit_push);
    } else if (this.currElement.type == eElementType.type_i_flex) {
      // flex instruction?
      if (this.currElement.flexByteCode == eByteCode.bc_coginit) {
        this.compileFlex(eFlexcode.fc_coginit_push);
      } else {
        if (this.currElement.flexResultCount != 1) {
          // [error_etmrasr]
          throw new Error('Expression terms must return a single result');
        }
        const flexCode: eFlexcode = this.spinSymbolTables.getFlexcodeFromBytecode(this.currElement.flexByteCode);
        this.compileFlex(flexCode);
      }
    } else if (this.currElement.type == eElementType.type_at) {
      // @"string", @obj{[]}.method, @method, @hubvar ?
      this.ct_at();
    } else if (this.currElement.type == eElementType.type_upat) {
      // ^@var
      this.ct_upat();
    } else if (this.currElement.type == eElementType.type_inc) {
      // ++var ?
      this.compileVariablePre(eByteCode.bc_var_preinc_push);
    } else if (this.currElement.type == eElementType.type_dec) {
      // --var ?
      this.compileVariablePre(eByteCode.bc_var_predec_push);
    } else if (this.currElement.type == eElementType.type_rnd) {
      // ??var ?
      this.compileVariablePre(eByteCode.bc_var_rnd_push);
    } else {
      // NOTE: get current element index, NOT next element index
      const startElementIndex = this.saveElementLocation() - 1; // [source_start]
      const variableResult: iVariableReturn = this.checkVariable(); // var ?
      if (variableResult.isVariable == false) {
        // [error_eaet]
        throw new Error('Expected an expression term (m092)');
      }
      this.currElement = this.getElement(); // get element after variable
      if (this.currElement.type == eElementType.type_left) {
        // var({param,...}){:results} ?
        this.ct_method_ptr(startElementIndex, eResultRequirements.RR_One, eByteCode.bc_drop_push);
      } else if (this.currElement.type == eElementType.type_inc) {
        // var++ ?
        this.compileVariableAssign(variableResult, eByteCode.bc_var_postinc_push);
      } else if (this.currElement.type == eElementType.type_dec) {
        // var-- ?
        this.compileVariableAssign(variableResult, eByteCode.bc_var_postdec_push);
      } else if (this.currElement.isLogNot) {
        // var!! ?
        this.compileVariableAssign(variableResult, eByteCode.bc_var_lognot_push);
      } else if (this.currElement.isBitNot) {
        // var! ?
        this.compileVariableAssign(variableResult, eByteCode.bc_var_bitnot_push);
      } else if (this.currElement.type == eElementType.type_back) {
        // var\x ?
        this.compileVariableExpression(variableResult, eByteCode.bc_var_swap);
      } else if (this.currElement.type == eElementType.type_til) {
        // var~ ?
        this.compileVariableClearSetTerm(variableResult, eCompOp.CO_Clear);
      } else if (this.currElement.type == eElementType.type_tiltil) {
        // var~~ ?
        this.compileVariableClearSetTerm(variableResult, eCompOp.CO_Set);
      } else if (this.currElement.type == eElementType.type_assign) {
        // var := x ?
        this.compileVariableExpression(variableResult, eByteCode.bc_write_push);
      } else if (this.currElement.isBinary && this.currElement.isAssignable && this.nextElementType() == eElementType.type_equal) {
        const opByteCode: number = this.currElement.byteCode;
        this.getElement(); // get the equal
        this.compileExpression();
        variableResult.operation = eVariableOperation.VO_ASSIGN;
        variableResult.assignmentBytecode = opByteCode - (eByteCode.bc_lognot - eByteCode.bc_lognot_write_push);
        this.compileVariable(variableResult);
      } else {
        // here is @@notbin:
        this.backElement();
        variableResult.operation = eVariableOperation.VO_READ;
        this.compileVariable(variableResult);
      }
    }
  }

  private compileFlex(flexCode: eFlexcode) {
    // Compile flex instruction
    // PNut compile_flex:
    //  // symbol               =               bytecode + (params shl 8) + (results shl 11) + (pinfld shl 14) + (hubcode shl 15)
    const flexEncodedValue: number = this.spinSymbolTables.flexValue(flexCode);
    // break out the values from within...
    const bytecode: number = flexEncodedValue & 0xff;
    const paramCount: number = (flexEncodedValue >> 8) & 0b111;
    const resultCount: number = (flexEncodedValue >> 11) & 0b111;
    const isPinField: boolean = (flexEncodedValue >> 14) & 1 ? true : false;
    const isHubCode: boolean = (flexEncodedValue >> 15) & 1 ? true : false;

    this.getLeftParen();
    if (paramCount > 0) {
      if (isPinField) {
        // we have a pinfield
        const savedElementIndex: number = this.saveElementLocation();
        const savedObjectOffset: number = this.objImage.offset;
        let remainingParamCount = paramCount;
        let numberReturnValues: number = this.compileParameter();
        // if first parameter returns single value followed by '..', pinfield
        if (--numberReturnValues == 0) {
          // we have 1 parameter which is a pinfield description
          if (this.checkDotDot()) {
            // restore locations (element index and object offset)
            this.objImage.setOffsetTo(savedObjectOffset);
            this.restoreElementLocation(savedElementIndex);

            let failedToResolveValue: boolean = false;
            const firstValueReturn = this.skipExpressionCheckCon();
            if (firstValueReturn.isResolved == false) {
              // failed to resulve secondValue
              failedToResolveValue = true;
            } else {
              const firstValue: number = Number(BigInt(firstValueReturn.value) & BigInt(0x3f));
              let encodedBitfield: number = firstValue; // default: pin number
              this.getDotDot();
              // we have a pin plus additional pin(s)
              const secondValueReturn = this.skipExpressionCheckCon();
              if (secondValueReturn.isResolved == false) {
                // failed to resulve firstValue
                failedToResolveValue = true;
              } else {
                const secondValue: number = Number(BigInt(secondValueReturn.value) & BigInt(0x3f));
                if ((firstValue ^ secondValue) & 0x20) {
                  // [error_pmbttsp]
                  throw new Error('Pins must belong to the same port');
                }
                // encode: count of additional bits | bit number
                encodedBitfield = (((firstValue - secondValue) & 0x1f) << 6) | (secondValue & 0x3f);
                // have pin plus additional pin(s)
                this.compileConstant(BigInt(encodedBitfield));
                if (--remainingParamCount > 0) {
                  this.getComma();
                  this.compileParametersNoParens(remainingParamCount);
                }
              }
            }
            if (failedToResolveValue) {
              // one or more failures to resolve
              // restore locations (element index and object offset)
              this.objImage.setOffsetTo(savedObjectOffset);
              this.restoreElementLocation(savedElementIndex);
              this.compileExpression();
              this.getDotDot();
              this.compileExpression();
              this.objWrByte(eByteCode.bc_bitrange);
              this.objWrByte(eByteCode.bc_addpins);
              if (--remainingParamCount > 0) {
                this.getComma();
                this.compileParametersNoParens(remainingParamCount);
              }
            }
          } else {
            // no DOT DOT
            // restore locations (element index and object offset)
            this.objImage.setOffsetTo(savedObjectOffset);
            this.restoreElementLocation(savedElementIndex);
            this.compileParametersNoParens(paramCount);
          }
        } else {
          // more than 1 return value
          // restore locations (element index and object offset)
          this.objImage.setOffsetTo(savedObjectOffset);
          this.restoreElementLocation(savedElementIndex);
          this.compileParametersNoParens(paramCount);
        }
      } else {
        // NOT a pinField
        this.compileParametersNoParens(paramCount);
      }
    }
    this.getRightParen();
    if (isHubCode) {
      this.objWrByte(eByteCode.bc_hub_bytecode);
    }
    this.objWrByte(bytecode);
  }

  private getMethodPointer(): iVariableReturn {
    // Get method pointer variable - must be long/reg without bitfield
    // PNut get_method_ptr:
    const variableReturn: iVariableReturn = this.getVariable();
    if (
      variableReturn.bitfieldFlag == true ||
      (variableReturn.wordSize == eWordSize.WS_Long || variableReturn.type == eElementType.type_register) == false
    ) {
      // [error_mpmblv]
      throw new Error('Method pointers must be long variables without bitfields');
    }
    return variableReturn;
  }

  private scanToRightParen() {
    // Scan to right parenthesis
    // PNut scan_to_right: (after left paren)
    let nestingCount: number = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.getElement();
      if (this.currElement.type == eElementType.type_end) {
        // [error_eright]
        throw new Error('Expected ")"');
      }
      if (this.currElement.type == eElementType.type_left) {
        nestingCount++;
      }
      if (this.currElement.type == eElementType.type_right) {
        nestingCount--;
      }
      if (nestingCount <= 0) {
        break;
      }
    }
  }

  private scanToRightBracket() {
    // Scan to ']'
    // PNut scan_to_rightb: (after left bracket)
    let nestingCount: number = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.getElement();
      if (this.currElement.type == eElementType.type_end) {
        // [error_erightb]
        throw new Error('Expected "]"');
      }
      if (this.currElement.type == eElementType.type_leftb) {
        // NOTE: this may be extra capability which SPIN2 doesn't support
        //  So let's NOT worry about coverage
        nestingCount++;
      }
      if (this.currElement.type == eElementType.type_rightb) {
        nestingCount--;
      }
      if (nestingCount <= 0) {
        break;
      }
    }
  }

  private compileParameters(parameterCount: number) {
    this.logMessage(`* compileParameters(${parameterCount}) elem=[${this.currElement.toString()}]`);
    this.getLeftParen();
    if (parameterCount > 0) {
      this.compileParametersNoParens(parameterCount);
    }
    this.logMessage(`* compileParameters() returned from compileParametersNoParens(), get right`);
    this.getRightParen();
  }

  private compileParametersNoParens(parameterCount: number) {
    // PNut compile_parameters_np:
    this.logMessage(`* compileParametersNoParens(${parameterCount}) - ENTRY`);
    let parametersRemaining: number = parameterCount;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const numberReturnValues = this.compileParameter();
      parametersRemaining -= numberReturnValues;
      this.logMessage(` -- nbrRetVals=(${numberReturnValues}), paramRem=(${parametersRemaining})`);
      if (parametersRemaining < 0) {
        // [error_enope]
        throw new Error('Expected number of parameters exceeded');
      } else if (parametersRemaining == 0) {
        break; // matched expected, get outta here
      }
      this.getComma();
    }
    this.logMessage(`* compileParametersNoParens(${parameterCount}) - EXIT`);
  }

  private compileParameter(): number {
    // Compile a parameter - accommodates instructions/methods with multiple return values
    // on exit, eax holds number of actual parameters compiled
    //
    //  rotxy/polxy/xypol
    //  obj{[]}.method({params,...})
    //  method({params,...})
    //  var({params,...}):2+
    //
    // PNut compile_parameter:
    this.logMessage(`*--* compileParameter() elem=[${this.currElement.toString()}]`);
    let compiledParameterCount: number = -1; // flag saying we need to compile expression
    const savedElementIndex: number = this.saveElementLocation();
    this.getElement();
    if (this.currElement.type == eElementType.type_i_flex) {
      const flexResultCount: number = this.currElement.flexResultCount;
      if (flexResultCount >= 2) {
        const flexCode: eFlexcode = this.spinSymbolTables.getFlexcodeFromBytecode(this.currElement.flexByteCode);
        this.compileFlex(flexCode);
        compiledParameterCount = flexResultCount;
      }
    } else if (this.currElement.type == eElementType.type_obj) {
      const savedElement: SpinElement = this.currElement;
      this.checkIndex();
      this.getDot();
      let [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
      if (objSymType == eElementType.type_objpub) {
        // remember ct_objpub()
        // here is @@checkmult:
        const returnValueCount: number = (Number(objSymValue) >> 20) & 0x0f;
        // PNut @@checkmult2:
        if (returnValueCount >= 2) {
          this.restoreElementLocation(savedElementIndex);
          this.getElement();
          this.ct_objpub(eResultRequirements.RR_OneOrMore, eByteCode.bc_drop_push);
          compiledParameterCount = returnValueCount;
        }
      }
    } else if (this.currElement.type == eElementType.type_method) {
      // remember ct_method()
      // here is @@checkmult: (just coded differently)
      const returnValueCount: number = this.currElement.methodResultCount;
      // PNut @@checkmult2:
      if (returnValueCount >= 2) {
        this.restoreElementLocation(savedElementIndex);
        this.getElement();
        this.ct_method(eResultRequirements.RR_OneOrMore, eByteCode.bc_drop_push);
        compiledParameterCount = returnValueCount;
      }
    } else {
      // remember ct_method_ptr()
      const [isMethod, returnCount] = this.checkVariableMethod();
      if (isMethod && returnCount >= 2) {
        this.restoreElementLocation(savedElementIndex);
        this.getElement();
        this.ct_method_ptr(savedElementIndex, eResultRequirements.RR_OneOrMore, eByteCode.bc_drop_push);
        compiledParameterCount = returnCount;
      }
    }
    // if no count found so far then treat it as 1 and compile the expression
    if (compiledParameterCount == -1) {
      // PNut @@single:
      this.restoreElementLocation(savedElementIndex);
      this.compileExpression();
      compiledParameterCount = 1;
    }
    return compiledParameterCount;
  }

  private ct_try(resultsNeeded: eResultRequirements, byteCode: eByteCode) {
    // Compile term - \obj{[]}.method({param,...}), \method({param,...}), \var({param,...}){:results}
    // PNut ct_try:
    this.logMessage(`* ct_try([${eResultRequirements[resultsNeeded]}], bc=(${byteCode}))`);
    this.getElement();
    if (this.currElement.type == eElementType.type_obj) {
      // \obj{[]}.method({param,...}) ?
      this.ct_objpub(resultsNeeded, byteCode);
    } else if (this.currElement.type == eElementType.type_method) {
      // \method({param,...}) ?
      this.ct_method(resultsNeeded, byteCode);
    } else {
      // NOTE: get current element index, NOT next element index
      const savedElementIndex: number = this.saveElementLocation() - 1; // [source_start]
      const variableResult: iVariableReturn = this.checkVariable();
      if (variableResult.isVariable) {
        // \var({param,...}){:results} ?
        this.getLeftParen();
        this.ct_method_ptr(savedElementIndex, resultsNeeded, byteCode);
      } else {
        // [error_eamoov]
        throw new Error('Expected a method, object, or variable');
      }
    }
  }

  private ct_look() {
    // Compile term - LOOKUP/LOOKDOWN
    // PNut ct_look:
    const lookType: number = Number(this.currElement.bigintValue);
    this.new_bnest(eElementType.type_i_look, 1);
    this.optimizeBlock(eOptimizerMethod.OM_Look, lookType);
    this.end_bnest();
  }

  private blockLook(lookType: number) {
    // code for eOptimizerMethod.OM_Look
    // PNut ct_look:@@comp:
    this.compile_bstack_address(0);
    this.getLeftParen();
    this.compileExpression(); // compile target value
    this.getColon();
    this.objWrByte(eByteCode.bc_con_n + 1 + (lookType & 1)); // lookupz or lookup
    do {
      let tempLookType = (lookType >> 1) & 0b01;
      const isRange: boolean = this.compileRange(); // compile (next) value/range
      if (isRange) {
        tempLookType |= 0b10;
      }
      // create (bc_lookup_value, bc_lookdown_value, bc_lookup_range, bc_lookdown_range) code
      this.objWrByte(eByteCode.bc_lookup_value + tempLookType);
    } while (this.getCommaOrRightParen());
    this.objWrByte(eByteCode.bc_look_done);
    this.write_bstack_ptr(0);
  }

  private compileRange(): boolean {
    let rangeFoundStatus: boolean = false;
    this.compileExpression();
    if (this.checkDotDot()) {
      this.compileExpression();
      rangeFoundStatus = true;
    }
    return rangeFoundStatus;
  }

  private new_bnest(type: eElementType, size: number) {
    this.blockStack.add(type, size);
    const nestLevel: number = this.blockStack.topIndex; // this is PNut [ecx]
    const topItem: string = nestLevel != -1 ? eElementType[this.blockStack.typeAtLevel(nestLevel)] : '-emptyStack-';
    this.logMessage(`* new_bnest() nestLevel=(${nestLevel}), topItemType=[${topItem}]`);
  }

  private redo_bnest(type: eElementType) {
    this.blockStack.overrideType(type);
    const nestLevel: number = this.blockStack.topIndex; // this is PNut [ecx]
    const topItem: string = nestLevel != -1 ? eElementType[this.blockStack.typeAtLevel(nestLevel)] : '-emptyStack-';
    this.logMessage(`* redo_bnest() nestLevel=(${nestLevel}), topItemType=[${topItem}]`);
  }

  private end_bnest() {
    const nestLevel: number = this.blockStack.topIndex; // this is PNut [ecx]
    const topItem: string = nestLevel != -1 ? eElementType[this.blockStack.typeAtLevel(nestLevel)] : '-emptyStack-';
    this.logMessage(`* end_bnest() nestLevel=(${nestLevel}), topItemType=[${topItem}]`);
    this.blockStack.remove();
  }

  private write_bstack(index: number, value: number) {
    this.blockStack.write(index, value);
  }

  private write_bstack_ptr(index: number) {
    const offset: number = this.objImage.offset;
    this.blockStack.write(index, offset);
  }

  private read_bstack(index: number): number {
    const valueRead: number = this.blockStack.read(index);
    return valueRead;
  }

  private compile_bstack_address(index: number) {
    const address: number = this.blockStack.read(index);
    if (address > 0xffff) {
      this.objWrByte(eByteCode.bc_con_rflong);
      this.objWrLong(address);
    } else if (address > 0xff) {
      this.objWrByte(eByteCode.bc_con_rfword);
      this.objWrWord(address);
    } else {
      this.objWrByte(eByteCode.bc_con_rfbyte);
      this.objWrByte(address);
    }
  }

  private compile_bstack_branch(index: number, byteCode: eByteCode) {
    const address: number = this.blockStack.read(index);
    this.compileBranch(byteCode, address);
  }

  private compileBranch(byteCode: eByteCode, address: number) {
    // PNut compile_branch:
    this.objWrByte(byteCode);
    this.compileRfvars(BigInt(address - this.objImage.offset));
  }

  private optimizeBlock(methodId: eOptimizerMethod, subType: number = 0) {
    // Optimizing block compiler
    // PNut optimize_block:
    this.logMessage(`* optimizeBlock(${eOptimizerMethod[methodId]}, (${subType})) elem=[${this.currElement.toString()}]`);
    const savedElementIndex = this.saveElementLocation();
    const savedObjOffset = this.objImage.offset;
    let lastOffset: number = 0;
    let notDone: boolean = true;
    let isPostWhileUntil: boolean = false; // used in blockRepeat()
    do {
      // restore for next pass
      this.restoreElementLocation(savedElementIndex);
      this.objImage.setOffsetTo(savedObjOffset);
      // call block compiler
      switch (methodId) {
        case eOptimizerMethod.OM_Look:
          this.blockLook(subType);
          break;
        case eOptimizerMethod.OM_If:
          this.blockIfnIfNot(eByteCode.bc_jz);
          break;
        case eOptimizerMethod.OM_IfNot:
          this.blockIfnIfNot(eByteCode.bc_jnz);
          break;
        case eOptimizerMethod.OM_Case:
          this.blockCase();
          break;
        case eOptimizerMethod.OM_CaseFast:
          this.blockCaseFast();
          break;
        case eOptimizerMethod.OM_Repeat:
          isPostWhileUntil = this.blockRepeat(isPostWhileUntil);
          break;
        case eOptimizerMethod.OM_RepeatCount:
          this.blockRepeatCount();
          break;
        case eOptimizerMethod.OM_RepeatCountVar:
          this.blockRepeatCountVar();
          break;
        case eOptimizerMethod.OM_RepeatPreWhileUntil:
          this.blockRepeatPreWhileUntil(subType);
          break;
        case eOptimizerMethod.OM_RepeatVar:
          this.blockRepeatVar();
          break;

        default:
          break;
      }
      notDone = lastOffset != this.objImage.offset;
      this.logMessage(`* optimizeBlock() lastOffset=(${lastOffset}), this.objImage.offset=(${this.objImage.offset})`);
      lastOffset = this.objImage.offset;
    } while (notDone);
  }

  private ct_cogspin(byteCode: eByteCode) {
    // Compile term - COGSPIN(cog,method(parameters),stackadr)
    // PNut ct_cogspin:
    this.getLeftParen();
    this.compileExpression();
    this.getComma();
    this.getElement(); // method/obj/var
    // NOTE: get current element index, NOT next element index
    const startElementIndex = this.saveElementLocation() - 1; // [source_start]
    let parameterCount: number = 0;
    if (this.currElement.type == eElementType.type_obj) {
      const savedElement: SpinElement = this.currElement;
      this.checkIndex();
      this.getDot();
      let [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
      if (objSymType != eElementType.type_objpub) {
        // [error_eamn]
        throw new Error('Expected a method name (m0A0)');
      }
      // here is @@method:
      parameterCount = (Number(objSymValue) >> 24) & 0x7f;
      this.compileParameters(parameterCount);
      // compile a method point without affecting nextElementIndex
      const savedElementIndex = this.saveElementLocation(); // push
      this.restoreElementLocation(startElementIndex);
      this.ct_at();
      this.restoreElementLocation(savedElementIndex); // pop
    } else if (this.currElement.type == eElementType.type_method) {
      parameterCount = this.currElement.methodParameterCount;
      this.compileParameters(parameterCount);
      // compile a method point without affecting nextElementIndex
      const savedElementIndex = this.saveElementLocation(); // push
      this.restoreElementLocation(startElementIndex);
      this.ct_at();
      this.restoreElementLocation(savedElementIndex); // pop
    } else {
      // method_ptr
      const variableReturn: iVariableReturn = this.checkVariable();
      if (variableReturn.isVariable == false) {
        // [error_eamomp]
        throw new Error('Expected a method, object, or method pointer');
      }
      /// here is @@method_ptr:
      this.restoreElementLocation(startElementIndex);
      this.getMethodPointer();
      parameterCount = this.compileParametersMethodPtr();
      const savedElementIndex = this.saveElementLocation(); // push
      this.restoreElementLocation(startElementIndex);
      this.compileVariableRead();
      this.restoreElementLocation(savedElementIndex); // pop
    }
    // here is @@finish:
    this.getComma();
    this.compileExpression();
    this.getRightParen();
    this.objWrByte(eByteCode.bc_hub_bytecode);
    this.objWrByte(eByteCode.bc_cogspin);
    this.objWrByte(parameterCount);
    this.objWrByte(byteCode);
  }

  private ct_at() {
    // Compile term - @"string", @obj{[]}.method, @method, or @hubvar
    // PNut ct_at:
    this.getElement();
    this.logMessage(`* ct_at() get then elem=[${this.currElement.toString()}]`);
    if (this.currElement.type == eElementType.type_con) {
      // here is @@string:
      this.objWrByte(eByteCode.bc_string);
      const patchLocation: number = this.objImage.offset;
      this.objWrByte(0); // placeholder for now
      let stringLength: number = 1;
      this.backElement();
      do {
        const valueReturn: iValueReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
        if (valueReturn.value < 1n || valueReturn.value > 255n) {
          // [error_scmrf]
          throw new Error('STRING characters must range from 1 to 255');
        }
        this.objWrByte(Number(valueReturn.value));
        if (++stringLength > 255) {
          // [error_sdcx]
          throw new Error('@"string"/STRING/LSTRING data cannot exceed 254 bytes');
        }
        this.logMessage(`* ct_at() post getValue elem=[${this.currElement.toString()}]`);
        this.getElement();
        if (this.currElement.isMidStringComma == false) {
          break; // this could be comma (not mid), right-paren or EOL
        }
        // eslint-disable-next-line no-constant-condition
      } while (true);
      this.backElement();
      this.objWrByte(0); // emit string terminator
      this.objImage.replaceByte(stringLength, patchLocation); // replace the placeholder with length
    } else if (this.currElement.type == eElementType.type_obj) {
      // here is @@object:
      const savedElement: SpinElement = this.currElement;
      const [indexFound, objectElementIndex] = this.checkIndex();
      this.getDot();
      const [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
      if (objSymType != eElementType.type_objpub) {
        // [error_eamn]
        throw new Error('Expected a method name (m0A1)');
      }
      if (indexFound) {
        this.compileOutOfSequenceExpression(objectElementIndex);
      }
      this.objWrByte(indexFound ? eByteCode.bc_mptr_obji_sub : eByteCode.bc_mptr_obj_sub);
      this.compileRfvar(BigInt(savedElement.numberValue & 0xffffff));
      this.compileRfvar(BigInt(Number(objSymValue) & 0xfffff));
    } else if (this.currElement.type == eElementType.type_method) {
      // here is @@method:
      // get index to PUB/PRI then write it
      const methodIndex: number = Number(this.currElement.bigintValue);
      this.objWrByte(eByteCode.bc_mptr_sub);
      this.compileRfvar(BigInt(methodIndex & 0xfffff));
    } else {
      // have @hubvar case
      const variableReturn: iVariableReturn = this.checkVariable();
      if (variableReturn.isVariable == false) {
        // [error_easvmoo]
        throw new Error('Expected a string, variable, method, or object');
      }
      // here is @@var:
      if (variableReturn.type == eElementType.type_register) {
        // [error_arina]
        throw new Error('@register is not allowed, use ^@ to get field pointer');
      }
      if (variableReturn.bitfieldFlag) {
        // [error_ainafbf]
        throw new Error('@ is not allowed for bitfields, use ^@ to get field pointer');
      }
      this.compileVariableAssign(variableReturn, eByteCode.bc_get_addr);
    }
  }

  private ct_objpubcon(resultsNeeded: eResultRequirements, byteCode: eByteCode) {
    // Compile term - obj{[]}.method({param,...}) or obj.con
    // PNut ct_objpubcon:
    // NOTE: get current element index, NOT next element index
    const savedElementIndex: number = this.saveElementLocation() - 1; // [source_start]
    const savedElement: SpinElement = this.currElement; // our type_obj element on entry
    const [foundIndex, nextElementIndex] = this.checkIndex();
    if (foundIndex) {
      // compile obj{[]}.method({param,...})
      this.restoreElementLocation(savedElementIndex);
      this.getElement();
      this.ct_objpub(resultsNeeded, byteCode);
    } else {
      // could be object constant OR object method
      this.getDot();
      const [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
      if (objSymType == eElementType.type_objpub) {
        // compile obj.method({param,...})
        this.restoreElementLocation(savedElementIndex);
        this.getElement();
        this.ct_objpub(resultsNeeded, byteCode);
      } else {
        // compile obj.constant (integer or float)
        this.compileConstant(BigInt(objSymValue));
      }
    }
  }

  private ct_objpub(resultsNeeded: eResultRequirements, byteCode: eByteCode) {
    // Compile term - obj{[]}.method({param,...})
    // PNut ct_objpub:
    this.objWrByte(byteCode);
    const savedElement: SpinElement = this.currElement;
    const [foundIndex, elementIndexOfIndex] = this.checkIndex();
    this.getDot();
    // if type_objpub: then objSymValue is methodValue: 7-bit parameterCount, 4-bit resultCount, 20-bit Address
    const [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
    if (objSymType != eElementType.type_objpub) {
      // [error_eamn]
      throw new Error('Expected a method name (m0A2)');
    }
    const symValueAsNumber: number = Number(objSymValue);
    this.confirmResult(resultsNeeded, symValueAsNumber);
    const parameterCount: number = (symValueAsNumber >> 24) & 0x7f;
    this.compileParameters(parameterCount);
    if (foundIndex) {
      this.compileOutOfSequenceExpression(elementIndexOfIndex);
    }
    this.objWrByte(foundIndex ? eByteCode.bc_call_obji_sub : eByteCode.bc_call_obj_sub);
    this.compileRfvar(BigInt(savedElement.numberValue & 0xffffff));
    this.compileRfvar(BigInt(symValueAsNumber & 0xfffff));
  }

  private ct_method(resultsNeeded: eResultRequirements, byteCode: eByteCode) {
    // Compile term - method({param,...})
    // PNut ct_method:
    // fields 7-bit parameterCount, 4-bit resultCount, 20-bit Address
    this.logMessage(`* ct_method(${eResultRequirements[resultsNeeded]}, elem=[${this.currElement.toString()}] ...)`);
    const methodValue: number = Number(this.currElement.bigintValue);
    this.confirmResult(resultsNeeded, methodValue);
    this.objWrByte(byteCode);
    const parameterCount: number = (methodValue >> 24) & 0x7f;
    this.compileParameters(parameterCount);
    this.objWrByte(eByteCode.bc_call_sub);
    this.compileRfvar(BigInt(methodValue & 0xfffff));
  }

  private ct_method_ptr(nextElementIndex: number, resultsNeeded: eResultRequirements, byteCode: eByteCode) {
    // Compile term - var({param,...}){:results} or RECV() or SEND(param{,...})
    // PNut ct_method_ptr:
    this.logMessage(`*==* ct_method_ptr(elemIdx=${nextElementIndex})`);
    this.restoreElementLocation(nextElementIndex); // start from passed nextElementIndex
    const methodResult: iVariableReturn = this.getMethodPointer();
    if (methodResult.type == eElementType.type_register && methodResult.address == this.mrecvReg) {
      // have  RECV()
      if (byteCode != eByteCode.bc_drop_push) {
        // [error_recvcbu]
        throw new Error('RECV() can be used only as a term and \\RECV() is not allowed');
      }
      this.getLeftParen();
      this.getRightParen();
      this.objWrByte(eByteCode.bc_call_recv);
    } else if (methodResult.type == eElementType.type_register && methodResult.address == this.msendReg) {
      // have  SEND(param{,...})
      if (byteCode != eByteCode.bc_drop) {
        // [error_sendcbu]
        throw new Error('SEND() can be used only as an instruction and \\SEND() is not allowed');
      }
      this.ci_send();
    } else {
      // have var({param,...}){:results} (long is method-pointer)
      // this is @@notsend:
      this.objWrByte(byteCode);
      const parameterCount: number = this.compileParametersMethodPtr();
      let returnValueCount: number = 0;
      if (this.checkColon()) {
        returnValueCount = this.getConInt();
        if (returnValueCount > this.results_limit) {
          // [error_loxre]
          throw new Error(`Limit of ${this.results_limit} results exceeded`);
        }
      }
      // this is @@noresults:
      this.confirmResult(resultsNeeded, returnValueCount << 20);
      // this is @@varread:
      const savedElementIndex: number = this.saveElementLocation(); // push
      this.restoreElementLocation(nextElementIndex); // restart from passed nextElementIndex
      this.compileVariableRead(); // get method pointer
      this.restoreElementLocation(savedElementIndex); // pop
      this.objWrByte(eByteCode.bc_call_ptr); // invoke method
    }
  }

  private ct_upat() {
    // Compile term - ^@var
    // PNut ct_upat:
    this.logMessage(`*==* ct_upat()`);
    this.getElement();
    const variableReturn: iVariableReturn = this.checkVariable();
    if (variableReturn.isVariable == false) {
      // [error_eav]
      throw new Error('Expected a variable (m0F0)');
    }
    this.compileVariableAssign(variableReturn, eByteCode.bc_get_field);
  }

  private compileParametersMethodPtr(): number {
    // Compile term - var({param,...}){:results} or RECV() or SEND(param{,...})
    // PNut compile_parameters_mptr:
    let parameterCount: number = 0;
    this.getLeftParen();
    if (this.checkRightParen() == false) {
      do {
        parameterCount += this.compileParameter();
        if (parameterCount > this.params_limit) {
          // [error_loxpe]
          throw new Error(`Limit of ${this.params_limit} parameters exceeded`);
        }
      } while (this.getCommaOrRightParen());
    }
    return parameterCount;
  }

  private compileParameterSend(): boolean {
    // Compile a parameter for SEND - accommodates methods with no return value
    // PNut compile_parameter_send:
    this.logMessage(`*==* compileParameterSend()`);
    let valueOnStackStatus: boolean = false;
    const savedElementIndex: number = this.saveElementLocation();
    this.getElement();
    if (this.currElement.type == eElementType.type_obj) {
      //  obj{[]}.method({params,...})
      const savedElement: SpinElement = this.currElement;
      this.checkIndex();
      this.getDot();
      let [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
      this.restoreElementLocation(savedElementIndex);
      let returnValueCount: number = 0;
      if (objSymType == eElementType.type_objpub) {
        // remember ct_objpub()
        // @@checkmult:
        returnValueCount = (Number(objSymValue) >> 20) & 0x0f;
        // PNut @@checkmult2:
        if (returnValueCount > 1) {
          // [error_spmcrmv]
          throw new Error('SEND parameter methods cannot return multiple values');
        } else if (returnValueCount == 0) {
          //no return value
          this.getElement();
          this.ct_objpub(eResultRequirements.RR_None, eByteCode.bc_drop);
        }
      }
      if (objSymType != eElementType.type_objpub || (objSymType == eElementType.type_objpub && returnValueCount == 1)) {
        // have obj_con or obj_con_float
        // this is @@exp:
        this.compileExpression();
        valueOnStackStatus = true;
      }
    } else if (this.currElement.type == eElementType.type_method) {
      //  method({params,...})
      // this is  @@checkmult:
      const returnValueCount: number = this.currElement.methodResultCount;
      // this is @@checkmult2:
      if (returnValueCount > 1) {
        // [error_spmcrmv]
        throw new Error('SEND parameter methods cannot return multiple values');
      } else if (returnValueCount == 1) {
        // this is @@exp:
        this.logMessage(`* compileParameterSend() type_method, retValCt==1`);
        this.restoreElementLocation(savedElementIndex);
        this.compileExpression();
        valueOnStackStatus = true;
      } else {
        //no return value (returnValueCount == 0)
        this.restoreElementLocation(savedElementIndex);
        this.getElement();
        this.ct_method(eResultRequirements.RR_None, eByteCode.bc_drop);
      }
    } else {
      //  var({params,...}){:1}
      const [isMethod, returnCount] = this.checkVariableMethod();
      this.restoreElementLocation(savedElementIndex);
      if (isMethod) {
        // this is @@checkmult2:
        if (returnCount > 1) {
          // [error_spmcrmv]
          throw new Error('SEND parameter methods cannot return multiple values');
        } else if (returnCount == 0) {
          //no return value
          this.getElement();
          this.ct_method_ptr(savedElementIndex, eResultRequirements.RR_None, eByteCode.bc_drop);
        }
      }
      if (isMethod == false || (isMethod && returnCount == 1)) {
        // this is @@exp:
        this.compileExpression();
        valueOnStackStatus = true;
      }
    }
    return valueOnStackStatus;
  }

  private compileOutOfSequenceExpression(nextElementIndex: number) {
    // PNut compile_oos_exp:
    const savedElementIndex: number = this.saveElementLocation();
    this.restoreElementLocation(nextElementIndex);
    this.compileExpression();
    this.restoreElementLocation(savedElementIndex);
  }

  private confirmResult(resultsNeeded: eResultRequirements, value: number) {
    // PNut confirm_result:
    // NOTE: value is methodValue: 7-bit parameterCount, 4-bit resultCount, 20-bit Address
    this.logMessage(`* confirmResult(${eResultRequirements[resultsNeeded]}, 0x${value.toString(16).toUpperCase().padStart(8, '0')})`);
    if (resultsNeeded != eResultRequirements.RR_None) {
      const numberResults: number = (value >> 20) & 0x0f;
      if (numberResults == 0) {
        // [error_tmrnr]
        throw new Error('This method returns no results');
      } else if (numberResults > 1 && resultsNeeded == eResultRequirements.RR_One) {
        // [error_tmrmr]
        throw new Error('This method returns multiple results');
      }
    }
  }

  private compileConData(initialWordSize: number) {
    // Compile term - BYTE/WORD/LONG(value, value, BYTE/WORD/LONG value)
    // PNut ct_condata:
    this.objWrByte(eByteCode.bc_string);
    const offSetToLength = this.objImage.offset;
    this.objWrByte(0); // place holder for length
    let dataCount: number = 0;
    do {
      let wordSize: eWordSize = initialWordSize;
      if (this.nextElementType() == eElementType.type_size) {
        this.getElement();
        wordSize = Number(this.currElement.bigintValue);
      }
      const allowedMode: eMode = wordSize == eWordSize.WS_Long ? eMode.BM_IntOrFloat : eMode.BM_IntOnly;
      const dataReturn: iValueReturn = this.getValue(allowedMode, eResolve.BR_Must);
      const data: number = Number(dataReturn.value);
      switch (wordSize) {
        case eWordSize.WS_Byte:
          this.objWrByte(data);
          dataCount += 1;
          break;
        case eWordSize.WS_Word:
          this.objWrWord(data);
          dataCount += 2;
          break;
        case eWordSize.WS_Long:
          this.objWrLong(data);
          dataCount += 4;
          break;
      }
      if (dataCount > 255) {
        // [error_bwldcx]
        throw new Error('BYTE/WORD/LONG data cannot exceed 255 bytes (m011)');
      }
    } while (this.getCommaOrRightParen());
    // and place final data length just before data in object
    this.objImage.replaceByte(dataCount, offSetToLength);
  }

  private compileConString() {
    // Compile term - STRING("constantstring")
    // PNut ct_constr:
    this.getLeftParen();
    this.objWrByte(eByteCode.bc_string);
    const offSetToLength = this.objImage.offset;
    this.objWrByte(0); // place holder for length
    let charCount: number = 0;
    do {
      let charReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
      if (BigInt(charReturn.value) < 1n || BigInt(charReturn.value) > 255n) {
        // [error_scmrf]
        throw new Error('STRING characters must range from 1 to 255');
      }
      this.objWrByte(Number(charReturn.value));
      if (++charCount > 254) {
        // [error_sdcx]
        throw new Error('@"string"/STRING/LSTRING data cannot exceed 254 bytes');
      }
    } while (this.getCommaOrRightParen());
    this.objWrByte(0); // place zero terminator
    // and place final string length just before string in object
    this.objImage.replaceByte(charCount + 1, offSetToLength);
  }

  private compileConLString() {
    // Compile term - LSTRING("constantstring")
    // PNut ct_conlstr:
    this.getLeftParen();
    this.objWrByte(eByteCode.bc_string);
    const offSetToLength = this.objImage.offset;
    this.objWrByte(0); // place holder for length for interpreter
    this.objWrByte(0); // place holder for length for user
    let charCount: number = 0;
    do {
      let charReturn = this.getValue(eMode.BM_IntOnly, eResolve.BR_Must);
      if ((BigInt(charReturn.value) & BigInt(0xffffff00)) != 0n) {
        // [error_lscmrf]
        throw new Error('LSTRING characters must range from 0 to 255');
      }
      this.objWrByte(Number(charReturn.value));
      if (++charCount > 254) {
        // [error_sdcx]
        throw new Error('@"string"/STRING/LSTRING data cannot exceed 254 bytes');
      }
    } while (this.getCommaOrRightParen());
    // and place interpreter string length just before length and string in object
    this.objImage.replaceByte(charCount + 1, offSetToLength);
    // and place final string length just before string in object
    this.objImage.replaceByte(charCount, offSetToLength + 1);
  }

  private enterExpOp(element: SpinElement) {
    // PNut @@enterop:
    // is f* instruction?
    this.logMessage(`* enterExpOp(Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset})${eElementType[element.type]})`);
    if (element.isHubcode) {
      this.objWrByte(eByteCode.bc_hub_bytecode);
    }
    this.objWrByte(element.byteCode);
  }

  private negConToCon() {
    // NOTE: this does not leave op_neg in current element like SubToNeg() does!
    if (this.currElement.type == eElementType.type_op && this.currElement.operation == eOperationType.op_sub) {
      this.getElement();
      if (this.currElement.isConstantInt) {
        this.currElement.negateBigIntValue();
      } else if (this.currElement.isConstantFloat) {
        this.currElement.setValue(BigInt(this.currElement.bigintValue) ^ BigInt(0x80000000));
      } else {
        this.backElement(); // return our element
      }
    }
  }

  private compileConstant(value: bigint) {
    // compile this constant
    const workingValue: number = Number(this.signExtendFrom32Bit(value));
    if (workingValue >= -1 && workingValue <= 14) {
      // -1 to 14
      this.objWrByte(eByteCode.bc_con_n | ((workingValue + 1) & 0x0f));
    } else if (workingValue >= 0 && workingValue <= 0xff) {
      // 0 to 0xff
      this.objWrByte(eByteCode.bc_con_rfbyte);
      this.objWrByte(workingValue);
    } else if (workingValue >= -0x100 && workingValue <= -1) {
      // -0x100 to -1
      this.objWrByte(eByteCode.bc_con_rfbyte_not);
      this.objWrByte(~workingValue);
    } else if (this.constantWasDecoded(workingValue)) {
      // nothing more to do...
    } else if (workingValue >= 0 && workingValue <= 0xffff) {
      // 0 to 0xFFFF
      this.objWrByte(eByteCode.bc_con_rfword);
      this.objWrWord(workingValue);
    } else if (workingValue >= -0x10000 && workingValue <= -1) {
      // -0x10000 to -1
      this.objWrByte(eByteCode.bc_con_rfword_not);
      this.objWrWord(~workingValue);
    } else {
      // the long value
      this.objWrByte(eByteCode.bc_con_rflong);
      this.objWrLong(workingValue);
    }
  }

  private constantWasDecoded(value: number): boolean {
    let didDecodeStatus: boolean = false;
    for (let shiftValue = 0; shiftValue < 0x20; shiftValue++) {
      if (1 << shiftValue == value) {
        this.objWrByte(eByteCode.bc_con_rfbyte_decod);
        this.objWrByte(shiftValue);
        didDecodeStatus = true;
        break;
      } else if (((1 << shiftValue) ^ 0xffffffff) == value) {
        this.objWrByte(eByteCode.bc_con_rfbyte_decod_not);
        this.objWrByte(shiftValue);
        didDecodeStatus = true;
        break;
      } else if ((2 << shiftValue) - 1 == value) {
        this.objWrByte(eByteCode.bc_con_rfbyte_bmask);
        this.objWrByte(shiftValue);
        didDecodeStatus = true;
        break;
      } else if ((((2 << shiftValue) - 1) ^ 0xffffffff) == value) {
        this.objWrByte(eByteCode.bc_con_rfbyte_bmask_not);
        this.objWrByte(shiftValue);
        didDecodeStatus = true;
        break;
      }
    }
    return didDecodeStatus;
  }

  private objWrLong(longValue: number) {
    this.objWrWord(longValue & 0xffff);
    this.objWrWord((longValue >> 16) & 0xffff);
  }

  private objWrWord(wordValue: number) {
    //this.logMessage(`* objWrWord(${hexWord(wordValue, '0x')})`);
    this.objWrByte(wordValue & 0xff);
    this.objWrByte((wordValue >> 8) & 0xff);
  }

  private objWrByte(byteValue: number) {
    //this.logMessage(`* objWrByte(${hexByte(byteValue, '0x')})`);
    this.objImage.append(byteValue & 0xff);
  }

  private objWrPubSymbol(name: string, resultCount: number, paramterCount: number) {
    // add to this objects' public interface symbol store PubConList
    this.pubConList.writeSymbolName(name);
    this.pubConList.writeByte(resultCount);
    this.pubConList.writeByte(paramterCount);
  }

  private objWrConstant(name: string, type: number, value: bigint) {
    // add to this objects' public interface symbol store PubConList
    this.pubConList.writeSymbolName(name);
    this.pubConList.writeByte(type);
    this.pubConList.writeLong(value);
  }

  private trySpin2ConExpression(): iValueReturn {
    // PNut try_spin2_con_exp:
    this.logMessage(`*==* trySpin2ConExpression()`);
    const valueResult: iValueReturn = { value: 0n, isResolved: false, isFloat: false };
    this.numberStack.reset(); // empty our stack
    const savedElementIndex = this.saveElementLocation();
    let didResolve: boolean = true;
    try {
      this.resolveExp(eMode.BM_Spin2, eResolve.BR_Must, this.lowestPrecedence);
    } catch (error) {
      // code to handle the exception
      this.logMessage(`!!! trySpin2ConExpression() caught INTERNAL error`);
      if (error instanceof Error) {
        if (error.message !== '[INTERNAL] Spin2 Constant failed to resolve') {
          // forward to actually cause our compiler stop
          throw new Error(error.message);
        }
      }
      this.restoreElementLocation(savedElementIndex);
      //this.getElement();
      didResolve = false;
    } finally {
      if (didResolve) {
        const value: bigint = this.numberStack.pop();
        valueResult.value = value;
        valueResult.isResolved = true;
      }
    }
    this.logMessage(`*==* trySpin2ConExpression() - EXIT`);
    return valueResult;
  }

  private resolveExp(mode: eMode, resolve: eResolve, precedence: number) {
    // leaves answer on stack
    let currPrecedence: number = precedence;
    this.logMessage(`* resolveExp(${precedence}) - ENTRY w/Elem=[${this.currElement.toString()}]`);
    if (--currPrecedence < 0) {
      // we need to resove the term!
      this.logMessage(`* MUST resolve!`);
      // skip leading pluses
      do {
        this.getElement();
        if (this.currElement.isPlus) {
          this.logMessage(`* skipping + operator`);
        }
      } while (this.currElement.isPlus);
      let activeOperation: eOperationType = this.currElement.operation;
      let activePrecedence: number = this.currElement.precedence;
      let activeFloatCompatibility: boolean = this.currElement.isFloatCompatible;
      this.logMessage(`* resolvExp() currElement=[${this.currElement.toString()}]`);

      // NOTE: we could move negation handling to here from within getConstant()

      // attempt to get a constant
      const resolution = this.getConstant(mode, resolve);
      if (resolution.foundConstant) {
        // we have a constant in hand
        // place it on our stack and we're done
        this.numberStack.push(resolution.value);
      } else {
        this.logMessage(`* resolvExp() did NOT find constant... mode=[${eMode[mode]}]`);
        // no constant found, currElement is not a constant
        this.SubToNeg(); // these do NOT affect the element list! only the global currElement copy
        this.FSubToFNeg();
        activeOperation = this.currElement.operation;
        activePrecedence = this.currElement.precedence;
        activeFloatCompatibility = this.currElement.isFloatCompatible;

        if (this.currElement.isUnary) {
          // our element is a unary operation
          this.logMessage(`  -- resolvExp() currElement.isUnary!`);
          this.checkDualModeOp(activeFloatCompatibility, mode); // (this IS in good place...)
          this.resolveExp(mode, resolve, activePrecedence);
          // Perform Unary
          const aValue = this.numberStack.pop();
          let exprResult: bigint = 0n;
          if (this.numberStack.isUnresolved) {
            this.logMessage(`* SKIP Unary a=(${float32ToHexString(aValue)}), b=(0), op=[${eOperationType[activeOperation]}]`);
          } else {
            this.logMessage(`* Perform Unary a=(${float32ToHexString(aValue)}), b=(0), op=[${eOperationType[activeOperation]}]`);
            exprResult = this.resolveOperation(aValue, 0n, activeOperation, this.mathMode == eMathMode.MM_FloatMode);
          }
          this.logMessage(`* Push result=(${float32ToHexString(exprResult)})`);
          this.numberStack.push(exprResult);
        } else if (this.currElement.type == eElementType.type_left) {
          this.resolveExp(mode, resolve, this.lowestPrecedence);
          this.getRightParen();
        } else {
          if (mode == eMode.BM_Spin2) {
            // [error_NEW for Pnut-ts] (BEING CAPTURED)
            throw new Error('[INTERNAL] Spin2 Constant failed to resolve');
          } else {
            // [error_eacuool]
            throw new Error('Expected a constant, unary operator, or "("');
          }
        }
      }
    } else {
      // precendence is NOT zero (> 0)
      this.resolveExp(mode, resolve, currPrecedence);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.getElement();
        this.logMessage(`* resolvExp() LOOP currElement=[${this.currElement.toString()}] currPrec=${currPrecedence} prec=${precedence}`);
        const activeOperation: eOperationType = this.currElement.operation;
        const activePrecedence: number = this.currElement.precedence;
        const activeFloatCompatibility: boolean = this.currElement.isFloatCompatible;
        if (this.currElement.isTernary) {
          // we have '?' op
          this.logMessage(`* Have op ternary`);
          if (currPrecedence == activePrecedence) {
            this.logMessage(`* Ternary Precedence`);
            // Perform Ternary
            this.resolveExp(mode, resolve, this.lowestPrecedence); // push true value
            this.getColon();
            this.resolveExp(mode, resolve, this.lowestPrecedence); // push false value
            const falseValue = this.numberStack.pop();
            const trueValue = this.numberStack.pop();
            const decisionValue = this.numberStack.pop();
            let exprResult: bigint = 0n;
            if (this.numberStack.isUnresolved) {
              this.logMessage(
                `* SKIP Ternary F=(${falseValue}), T=(${trueValue}), decision=(${decisionValue}), op=[${eOperationType[activeOperation]}]`
              );
            } else {
              this.logMessage(
                `* Perform Ternary F=(${falseValue}), T=(${trueValue}), decision=(${decisionValue}), op=[${eOperationType[activeOperation]}]`
              );
              exprResult = decisionValue != 0n ? trueValue : falseValue;
            }
            this.numberStack.push(exprResult);
            this.logMessage(`* Push result=(${float32ToHexString(exprResult)})`);
            break; // done,  exit loop
          } else {
            // not a binary op
            this.backElement(); // leave the constant
            break; // done,  exit loop
          }
        } else if (this.currElement.isBinary) {
          // we have binary operator
          this.checkDualModeOp(activeFloatCompatibility, mode); // NOTE: maybe this moves down below exit?
          if (activePrecedence == currPrecedence) {
            // Perform Binary
            this.resolveExp(mode, resolve, currPrecedence); // push rhs value
            // Perform binary
            const bValue = this.numberStack.pop();
            const aValue = this.numberStack.pop();
            let exprResult: bigint = 0n;
            if (this.numberStack.isUnresolved) {
              this.logMessage(
                `* SKIP Binary a=(${float32ToHexString(aValue)}), b=(${float32ToHexString(bValue)}), op=[${eOperationType[activeOperation]}]`
              );
            } else {
              this.logMessage(
                `* Perform Binary a=(${float32ToHexString(aValue)}), b=(${float32ToHexString(bValue)}), op=[${eOperationType[activeOperation]}]`
              );
              exprResult = this.resolveOperation(aValue, bValue, activeOperation, this.mathMode == eMathMode.MM_FloatMode);
            }
            this.logMessage(`* Push result=(${float32ToHexString(exprResult)})`);
            this.numberStack.push(exprResult);
            // let loop occur
          } else {
            // not a binary precedence
            this.backElement(); // leave the constant
            break; // done,  exit loop
          }
        } else {
          // not a binary precedence
          this.backElement(); // leave the constant
          break; // done,  exit loop
        }
      }
    }
    this.logMessage(`resolveExp(${precedence}) - EXIT`);
  }

  private checkDualModeOp(isElementFloatCompatible: boolean, mode: eMode) {
    // [preview_op]
    if (isElementFloatCompatible == false && mode != eMode.BM_Spin2) {
      if (this.mathMode == eMathMode.MM_FloatMode) {
        // [error_ionaifpe]
        throw new Error('Integer operator not allowed in floating-point expression');
      }
      this.mathMode = eMathMode.MM_IntMode;
      this.logMessage(`* mathMode = Int`);
    }
  }

  private getConstant(mode: eMode, resolve: eResolve): iConstantReturn {
    // PNut check_constant:
    //  this 'check_constant', now 'get_constant' in Pnut v44 and later
    const resultStatus: iConstantReturn = { value: 0n, foundConstant: true };
    this.logMessage(`* getCon mode=(${eMode[mode]}), resolve=(${eResolve[resolve]}), ele=[${(this, this.currElement.toString())}]`);

    if (mode == eMode.BM_Spin2) {
      // trying to resolve spin2 constant
      this.logMessage(`  -- in Spin2, not PASM`);
      if (this.SubToNeg()) {
        this.getElement(); // get element following the minus sign
        if (this.currElement.isConstantInt) {
          resultStatus.value = this.currElement.negateBigIntValue();
        } else if (this.currElement.isConstantFloat) {
          //this.logMessage(`  -- have con_float`);
          resultStatus.value = BigInt(this.currElement.bigintValue) ^ BigInt(0x80000000);
          //this.logMessage(`  -- new value = ${float32ToHexString(resultStatus.value)}`);
        } else {
          this.backElement(); // return this element
          this.backElement(); // return the minus sign
          resultStatus.foundConstant = false;
        }
      } else if (this.currElement.isConstantInt || this.currElement.isConstantFloat) {
        // this is a constant
        resultStatus.value = this.currElement.bigintValue;
      } else if (this.currElement.type == eElementType.type_pound) {
        this.getElement();
        const registerAddress: number = Number((this.currElement.bigintValue & BigInt(0xfff00000)) >> (32n - 12n));
        if (this.isDatStorageType() && registerAddress < 0x400) {
          resultStatus.value = BigInt(registerAddress);
        } else {
          // [error_eregsym]
          throw new Error('Expected a register symbol');
        }
      } else if (this.currElement.type == eElementType.type_obj) {
        // Handle Spin2 object-instance reference
        const savedElement: SpinElement = this.currElement;
        if (this.checkDot() == false) {
          // [error_NEW for Pnut-ts] (BEING CAPTURED)
          throw new Error('[INTERNAL] Spin2 Constant failed to resolve');
        }
        const [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
        if (objSymType == eElementType.type_objpub) {
          // [error_NEW for Pnut-ts] (BEING CAPTURED)
          throw new Error('[INTERNAL] Spin2 Constant failed to resolve');
        }
        resultStatus.value = BigInt(objSymValue);
      } else {
        resultStatus.foundConstant = false;
      }
    } else {
      // in PASM
      // replace our currElement with an oc_neg [sub-to-neg] if it was sub!
      this.logMessage(`  -- in PASM, not Spin2 w/elem=[${this.currElement.toString()}]`);
      // TODO: replace this with other form from spin2 side of things
      this.SubToNeg(); // makes currentElem op_neg if was op_sub!
      if (this.currElement.operation == eOperationType.op_neg) {
        // if the next element is a constant we can negate it
        if (this.nextElementType() == eElementType.type_con) {
          // coerce element to negative value
          this.getElement();
          this.logMessage(`* type_con e=[${this.currElement.toString()}]`);
          resultStatus.value = this.currElement.negateBigIntValue();
          this.checkIntMode(); // throw if we were float
          // if not set then set else
        } else if (this.nextElementType() == eElementType.type_con_float) {
          // coerce element to negative value
          this.getElement();
          this.logMessage(`* type_con_float e=[${this.currElement.toString()}]`);
          resultStatus.value = BigInt(this.currElement.value) ^ BigInt(0x80000000);
          this.checkFloatMode(); // throw if we were int
          // if not set then set else
        } else {
          // we didn't find a constant
          resultStatus.foundConstant = false;
        }
      } else {
        // continuing without a '-' sign
        if (this.currElement.isConstantInt) {
          // have integer constant
          resultStatus.value = this.currElement.bigintValue;
          this.checkIntMode();
        } else if (this.currElement.isConstantFloat) {
          // have float constant
          resultStatus.value = this.currElement.bigintValue;
          this.checkFloatMode();
        } else if (this.currElement.type == eElementType.type_float) {
          // have FLOAT()
          this.checkFloatMode();
          this.getLeftParen();
          this.mathMode = eMathMode.MM_IntMode;
          this.logMessage(`* mathMode = Int`);
          this.resolveExp(mode, resolve, this.lowestPrecedence); // places result on stack
          this.mathMode = eMathMode.MM_FloatMode;
          this.logMessage(`* mathMode = Float`);
          this.getRightParen();
          const intValue = this.numberStack.pop(); // get result
          // convert uint32 to float
          // FIXME: TODO: this needs to make "1" into a 1.0
          const floatValue: number = Number(intValue) / 1.0;
          // return the converted result
          resultStatus.value = numberToBigIntFloat32(floatValue);
        } else if (this.currElement.type == eElementType.type_trunc || this.currElement.type == eElementType.type_round) {
          // have TRUNC() or ROUND()
          const origElementType: eElementType = this.currElement.type;
          // TODO: determine if we care about overflow checking... because we don't do any here
          //this.logMessage(`* getCon() type=[${eElementType[this.currElement.type]}]`);
          this.checkIntMode();
          this.getLeftParen();
          this.mathMode = eMathMode.MM_FloatMode;
          this.logMessage(`* mathMode = Float`);
          this.resolveExp(mode, resolve, this.lowestPrecedence); // places result on stack
          this.mathMode = eMathMode.MM_IntMode;
          this.logMessage(`* mathMode = Int`);
          this.getRightParen();
          const float32Value = this.numberStack.pop(); // get result
          // convert uint32 to float
          const float64Value = Number(bigIntFloat32ToNumber(BigInt(float32Value)));
          //this.logMessage(`* getCon() round/trunc float64Value=[0x${float64Value.toString(16).toUpperCase().padStart(8, '0')}]`);
          if (origElementType == eElementType.type_trunc) {
            // truncate our float value
            const truncatedUInt32 = Math.trunc(float64Value) & 0xffffffff;
            // return the converted result
            resultStatus.value = BigInt(truncatedUInt32);
          } else if (origElementType == eElementType.type_round) {
            // truncate our float value
            const roundedUInt32 = Math.round(float64Value) & 0xffffffff;
            //this.logMessage(`* getCon() round/trunc roundedUInt32=[0x${roundedUInt32.toString(16).toUpperCase().padStart(8, '0')}]`);
            // return the converted result
            resultStatus.value = BigInt(roundedUInt32);
          }
        } else {
          // DAT section handling
          this.logMessage(`* getCon DAT section handling`);
          let didFindLocal: boolean = false;
          let symbol: iSymbol = { name: '', type: eElementType.type_undefined, value: 0n };
          if (mode == eMode.BM_OperandIntOnly || mode == eMode.BM_OperandIntOrFloat) {
            [didFindLocal, symbol] = this.checkLocalSymbol();
            if (didFindLocal) {
              this.logMessage(`* getCon FOUND local symbol value=[${hexString(symbol.value)}]`);
              // we have a local symbol... (must be undef or is storage type)
            }
          }
          // have checkUndefined() consider the local symbol type if it is present
          const haveUndefinedSymbol = this.checkUndefined(resolve, didFindLocal, symbol.type);
          if (haveUndefinedSymbol == false) {
            this.logMessage(`* getCON haveUndefinedSymbol == false`);
            // FIXME: TODO: handle DAT symbols
            if (this.currElement.type == eElementType.type_dollar) {
              // HANDLE an origin symbol
              if (mode != eMode.BM_OperandIntOnly && mode != eMode.BM_OperandIntOrFloat) {
                // [error_oinah]
                throw new Error('"$" is not allowed here');
              }
              this.checkIntMode();
              resultStatus.value = BigInt(this.hubMode ? this.hubOrg : this.cogOrg >> 2);
            } else if (this.currElement.type == eElementType.type_register) {
              // PNut here is @@notorg:
              this.logMessage(`* getCON type_register`);
              // HANDLE a cog register
              if (mode != eMode.BM_OperandIntOnly && mode != eMode.BM_OperandIntOrFloat) {
                // [error_rinah]
                throw new Error('Register is not allowed here');
              }
              this.checkIntMode();
              resultStatus.value = this.currElement.bigintValue;
            } else if (this.inlineModeForGetConstant) {
              this.logMessage(`* getCON inlineModeForGetConstant`);
              // HANDLE DAT Local variable now in register for inline access
              if (this.currElement.type == eElementType.type_loc_byte || this.currElement.type == eElementType.type_loc_word) {
                // [error_lvmb]
                // We don't quite like this message (so we adjusted to not match PNut)
                throw new Error('Local variable must be LONG and within first 16 longs');
              }
              if (this.currElement.type == eElementType.type_loc_long) {
                if (this.currElement.bigintValue & BigInt(0b11) || this.currElement.bigintValue >= BigInt(0x10 << 2)) {
                  // [error_lvmb]
                  // We don't quite like this message (so we adjusted to not match PNut)
                  throw new Error('Local variable must be LONG and within first 16 longs');
                }
              }
              // return address of local var
              resultStatus.value = (this.currElement.bigintValue >> 2n) + BigInt(this.inlineLocalsStart);
            } else if (this.currElement.type == eElementType.type_obj) {
              // HANDLE object.constant reference
              const savedElement: SpinElement = this.currElement;
              this.getDot();
              const [objSymType, objSymValue] = this.getObjSymbol(savedElement.numberValue);
              if (objSymType == eElementType.type_objpub) {
                // [error_eacn]
                throw new Error('Expected a constant name (m080)');
              }
              // Adjust element replacing current and pass new
              this.currElement.setType(objSymType);
              this.currElement.setValue(BigInt(objSymValue));
              return this.getConstant(mode, resolve);
            } else if (this.currElement.type == eElementType.type_at) {
              // HANDLE address of DAT symbol
              this.checkIntMode();
              this.currElement = this.getElement();
              if (this.checkDat(mode) || this.currElement.type == eElementType.type_hub_long) {
                // we have DAT variable address
                // here is @@trim:
                resultStatus.value = this.currElement.bigintValue & BigInt(0xfffff);
                this.logMessage(`* getConstant() have @ e=[${this.currElement.toString()}, value=(${hexString(resultStatus.value)})]`);
              } else {
                if (this.checkUndefined(resolve) == false) {
                  // [error_eads]
                  throw new Error('Expected a DAT symbol');
                }
              }
            } else if (this.checkDat(mode)) {
              // above line is @@notat:
              // HANDLE DAT symbol itself
              this.checkIntMode();
              if (mode == eMode.BM_OperandIntOnly || mode == eMode.BM_OperandIntOrFloat) {
                // within pasm instruction
                this.logMessage(`* getCON DAT symbol currElement=[${this.currElement.toString()}]`);
                if (this.currElement.bigintValue >= BigInt(0xfff00000)) {
                  // here is @@orghsymbol:
                  this.logMessage(`* getCON DAT symbol have hub address this.pasmMode=(${this.pasmMode})`);
                  this.locOrghSymbolFlag = true;
                  resultStatus.value = this.currElement.bigintValue + BigInt(this.pasmMode ? 0 : this.orghOffset);
                } else {
                  resultStatus.value = this.currElement.bigintValue >> (32n - 12n);
                }
              } else {
                // outside of pasm instruction - address of DAT variable
                this.logMessage(`  -- outside of PASM instru.`);
                resultStatus.value = this.currElement.bigintValue;
              }
              // here is @@trim: (again)
              resultStatus.value &= BigInt(0xfffff);
              this.logMessage(`* getCON DAT symbol elem=[${this.currElement.toString()}] value=0x${resultStatus.value.toString(16)}`);
            } else {
              // we didn't find a constant
              resultStatus.foundConstant = false;
            }
          }
        }
      }
    }
    this.logMessage(`* getConstant() EXIT w/foundConstant=(${resultStatus.foundConstant})`);
    return resultStatus;
  }

  private checkDat(mode: eMode): boolean {
    // note this can modify the passed element!!
    let dataStatus: boolean = false;
    if ((mode == eMode.BM_OperandIntOnly || mode == eMode.BM_OperandIntOrFloat) && this.currElement.type == eElementType.type_dat_long_res) {
      this.currElement.setType(eElementType.type_dat_long);
    }
    dataStatus =
      this.currElement.type == eElementType.type_dat_byte ||
      this.currElement.type == eElementType.type_dat_word ||
      this.currElement.type == eElementType.type_dat_long;
    this.logMessage(`* checkDat() status=(${dataStatus})`);
    return dataStatus;
  }

  private getObjSymbol(elementValue: number): [eElementType, bigint | string] {
    // PNut get_obj_symbol:
    let desiredType: eElementType = eElementType.type_undefined;
    let desiredValue: bigint | string = 0n;
    this.getElement(); // get element after dot...
    const objectId: number = elementValue >> 24;
    const symbolName: string = this.currElement.stringValue + String.fromCharCode(objectId + 1);
    this.logMessage(`  -- getObjSymbol() looking up [${symbolName}] objectId=(${objectId}) elem=${this.currElement.toString()}`);
    const foundSymbol: iSymbol = this.findSymbol(symbolName);
    desiredValue = foundSymbol.value;
    if (foundSymbol.type == eElementType.type_objpub) {
      desiredType = foundSymbol.type;
    } else if (foundSymbol.type == eElementType.type_objcon) {
      desiredType = eElementType.type_con;
    } else if (foundSymbol.type == eElementType.type_objcon_float) {
      desiredType = eElementType.type_con_float;
    } else {
      // [error_eaocom]
      throw new Error('Expected an object constant or method');
    }
    return [desiredType, desiredValue];
  }

  private checkUndefined(resolve: eResolve, haveLocalType: boolean = false, localType: eElementType = eElementType.type_undefined): boolean {
    // for obj.con references ... and ...
    let undefinedStatus: boolean = false;
    if (this.currElement.isTypeUndefined || (haveLocalType && localType == eElementType.type_undefined)) {
      this.numberStack.setUnresolved();
      // do we have a '.' preceeding a user name?
      if (this.checkDot()) {
        // is the next element a user undefined symbol?
        // TODO: COVERAGE test me
        this.getElement(); // position to bad element! so "throw" line-number is correct -OR- caller doesn't see this again
        if (!(this.currElement.isTypeUndefined || this.currElement.sourceElementWasUndefined)) {
          // [error_eacn]
          throw new Error('Expected a constant name (m081)');
        }
      }
      // have one or both undefined
      if (resolve == eResolve.BR_Must) {
        // [error_us]
        throw new Error(`Undefined symbol`);
      }
      undefinedStatus = true;
    }
    this.logMessage(`* checkUndefined(elem=[${this.currElement.toString()}]) undefinedStatus=(${undefinedStatus})`);
    return undefinedStatus;
  }

  private checkLeftParen(): boolean {
    return this.checkElementType(eElementType.type_left);
  }

  private checkRightParen(): boolean {
    return this.checkElementType(eElementType.type_right);
  }

  private checkLeftBracket(): boolean {
    return this.checkElementType(eElementType.type_leftb);
  }

  private checkComma(): boolean {
    return this.checkElementType(eElementType.type_comma);
  }

  /*
  private checkMidstringComma(): boolean {
    let foundStatus: boolean = false;
    if (this.nextElementType() == eElementType.type_comma) {
      foundStatus = true;
      this.getElement();
    }
    return foundStatus;
  }
  //*/

  private checkPound(): boolean {
    return this.checkElementType(eElementType.type_pound);
  }

  private checkColon(): boolean {
    return this.checkElementType(eElementType.type_colon);
  }

  private checkEqual(): boolean {
    return this.checkElementType(eElementType.type_equal);
  }

  private checkUnderscore(): boolean {
    return this.checkElementType(eElementType.type_under);
  }

  private checkDot(): boolean {
    return this.checkElementType(eElementType.type_dot);
  }

  private checkDotDot(): boolean {
    return this.checkElementType(eElementType.type_dotdot);
  }

  private checkAt(): boolean {
    return this.checkElementType(eElementType.type_at);
  }

  /*
  private checkInc(): boolean {
    return this.checkElementType(eElementType.type_inc);
  }
  //*/

  /*
private checkDec(): boolean {
    return this.checkElementType(eElementType.type_dec);
  }
  //*/

  private checkBackslash(): boolean {
    return this.checkElementType(eElementType.type_back);
  }

  /*
  private checkTick(): boolean {
    return this.checkElementType(eElementType.type_tick);
  }
  //*/

  private checkEndOfLine(): boolean {
    return this.checkElementType(eElementType.type_end);
  }

  private checkElementType(type: eElementType): boolean {
    let foundStatus: boolean = false;
    if (this.nextElementType() == type) {
      foundStatus = true;
      this.getElement();
    }
    return foundStatus;
  }

  private skipToTickOrEndOfLine(): boolean {
    let foundTickStatus: boolean = false;
    this.logMessage(` -- skipToTickOrEndOfLine(${this.currElement.toString()})`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.nextElementType() == eElementType.type_end) {
        break;
      }
      this.getElement();
      if (this.currElement.type == eElementType.type_tick) {
        foundTickStatus = true;
        break;
      }
    }
    this.logMessage(` -- skipToTickOrEndOfLine() -> foundTic=(${foundTickStatus})`);
    return foundTickStatus;
  }

  private skipToEnd() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.nextElementType() == eElementType.type_end || this.nextElementType() == eElementType.type_end_file) {
        break;
      }
      this.getElement();
    }
  }

  private getCommaOrEndOfLine(): boolean {
    let foundCommaStatus: boolean = false;
    this.getElement();
    if (this.currElement.type == eElementType.type_comma) {
      foundCommaStatus = true;
    } else if (this.currElement.type != eElementType.type_end) {
      // [error_ecoeol]
      throw new Error('Expected "," or end of line');
    }
    return foundCommaStatus;
  }

  private getStepOrEndOfLine(): boolean {
    let foundStepStatus: boolean = false;
    this.getElement();
    if (this.currElement.type == eElementType.type_step) {
      foundStepStatus = true;
    } else if (this.currElement.type != eElementType.type_end) {
      // [error_esoeol]
      throw new Error('Expected STEP or end of line');
    }
    return foundStepStatus;
  }

  private getEndOfLine() {
    this.getElement();
    if (this.currElement.type != eElementType.type_end) {
      // [error_eeol]
      throw new Error('Expected end of line (m101)');
    }
  }

  private getCommaOrRightParen(): boolean {
    let foundCommaStatus: boolean = false;
    this.getElement();
    if (this.currElement.type == eElementType.type_comma) {
      foundCommaStatus = true;
    } else if (this.currElement.type != eElementType.type_right) {
      // [error_ecor]
      throw new Error('Expected "," or ")"');
    }
    this.logMessage(`* getCommaOrRightParen() -> fndComma=(${foundCommaStatus})`);
    return foundCommaStatus;
  }

  private getPipeOrEnd(): boolean {
    let foundPipeStatus: boolean = false;
    this.getElement();
    if (this.currElement.operation == eOperationType.op_bitor) {
      foundPipeStatus = true;
    } else if (this.currElement.type != eElementType.type_end) {
      // [error_epoeol]
      throw new Error('Expected "|" or end of line');
    }
    return foundPipeStatus;
  }

  private compileVariable(variable: iVariableReturn) {
    // PNut compile_var:
    this.logMessage(`*==* compileVariable()`);
    const resumeIndex: number = this.saveElementLocation();
    let workIsComplete: boolean = false;
    this.restoreElementLocation(variable.nextElementIndex);

    // runtime-resolved bitfield
    if (variable.bitfieldFlag && variable.bitfieldConstantFlag == false) {
      const saveIndex: number = this.saveElementLocation();
      if (variable.type == eElementType.type_size) {
        this.skipIndex();
      }
      // here is @@bfnotsize:
      if (variable.sizeOverrideFlag == true) {
        this.getDot();
        this.getSize();
      }
      // here is @@bfnsor:
      if (variable.indexFlag == true) {
        this.skipIndex();
      }
      // here is @@bfnoindex:
      this.getDot();
      this.getLeftBracket();
      this.compileExpression(); // standalone or lower end of range
      if (this.checkDotDot()) {
        this.compileExpression(); // upper end of range
        // handle low and high of range
        this.objWrByte(eByteCode.bc_bitrange); // prepare for add
        this.objWrByte(eByteCode.bc_addbits); // add then result back on stack
      }
      this.getRightBracket();
      this.restoreElementLocation(saveIndex); // return to starting location
    }

    // field
    //
    if (variable.type == eElementType.type_field) {
      this.compileIndex();
      if (variable.indexFlag == true) {
        this.compileIndex();
        this.objWrByte(eByteCode.bc_setup_field_pi);
      } else {
        this.objWrByte(eByteCode.bc_setup_field_p);
      }
      this.compileVariableReadWriteAssign(variable);
      workIsComplete = true; // DONE
    }

    // register
    //  REG[register][index]{.[bitfield]}
    //  (or actual register name constants)
    if (variable.type == eElementType.type_register) {
      if (variable.address >= this.pasmRegs && variable.address <= this.pasmRegs + 7 && variable.indexFlag == false) {
        this.objWrByte(eByteCode.bc_setup_reg_1D8_1F8 + (variable.address - this.pasmRegs));
      } else if (variable.address >= 0x1f8 && variable.address <= 0x1ff && variable.indexFlag == false) {
        this.objWrByte(eByteCode.bc_setup_reg_1D8_1F8 + (variable.address - 0x1f8 + 8));
      } else {
        if (variable.indexFlag == true) {
          // have an index
          const valueReturn = this.compileIndexCheckCon(); // local version of @@compileindex:
          if (valueReturn.isResolved) {
            // we have a constant
            this.objWrByte(eByteCode.bc_setup_reg);
            // TODO: ?? check for 0-0x1ff else throw error out-of-bounds (not in PNut)
            variable.address += Number(valueReturn.value);
            // NOTE: this could likely be optimized to use single byte opcodes (as we did above)
          } else {
            // we have runtime eval not constant
            this.objWrByte(eByteCode.bc_setup_reg_pi);
          }
        } else {
          // don't have an index
          this.objWrByte(eByteCode.bc_setup_reg);
        }
        const signedRegister: number = variable.address & 0x100 ? variable.address | 0xfffffe00 : variable.address & 0x1ff;
        this.compileRfvars(BigInt(signedRegister));
      }
      this.compileVariableBitfield(variable);
      this.compileVariableReadWriteAssign(variable);
      workIsComplete = true; // DONE
    }

    // type size
    //  [BYTE|WORD|LONG][address][index]{.[bitfield]}
    if (variable.type == eElementType.type_size) {
      this.compileIndex();
      if (variable.indexFlag == true) {
        this.compileIndex();
        this.objWrByte(eByteCode.bc_setup_byte_pb_pi + variable.wordSize); // pop base and index
      } else {
        this.objWrByte(eByteCode.bc_setup_byte_pa + variable.wordSize); // pop address
      }
      this.compileVariableBitfield(variable);
      this.compileVariableReadWriteAssign(variable);
      workIsComplete = true; // DONE
    }

    // adjust wordSize if override is present
    if (variable.sizeOverrideFlag == true) {
      this.getDot();
      this.getSize();
      variable.wordSize = Number(this.currElement.bigintValue);
    }

    // handle var... special case, first 16 longs
    if (
      variable.type == eElementType.type_var_byte &&
      variable.wordSize == eWordSize.WS_Long &&
      (variable.address & 0b11) == 0 &&
      variable.address < 16 * 4 &&
      variable.indexFlag == false
    ) {
      this.objWrByte(eByteCode.bc_setup_var_0_15 + (variable.address >> 2)); // one of our first 16
      this.compileVariableBitfield(variable);
      this.compileVariableReadWriteAssign(variable);
      workIsComplete = true; // DONE
    }

    // handle loc... special case, first 16 longs
    if (
      variable.type == eElementType.type_loc_byte &&
      variable.wordSize == eWordSize.WS_Long &&
      (variable.address & 0b11) == 0 &&
      variable.address < 16 * 4 &&
      variable.indexFlag == false
    ) {
      this.logMessage(`* compileVariable() op=[${eVariableOperation[variable.operation]}] bitfield=(${variable.bitfieldFlag})`);
      if (variable.bitfieldFlag == true || variable.operation == eVariableOperation.VO_ASSIGN) {
        this.objWrByte(eByteCode.bc_setup_local_0_15 + (variable.address >> 2)); // one of our first 16
        this.compileVariableBitfield(variable);
        this.compileVariableReadWriteAssign(variable);
      } else if (variable.operation == eVariableOperation.VO_WRITE) {
        this.objWrByte(eByteCode.bc_write_local_0_15 + (variable.address >> 2)); // one of our first 16
      } else {
        this.objWrByte(eByteCode.bc_read_local_0_15 + (variable.address >> 2)); // one of our first 16
      }
      workIsComplete = true; // DONE
    }

    // handle hub byte/word/long with possible index
    if (variable.type == eElementType.type_hub_byte) {
      // special handling for CLKFREQ read
      if (
        variable.wordSize == eWordSize.WS_Long &&
        variable.operation === eVariableOperation.VO_READ &&
        variable.address == this.clkfreqAddress &&
        variable.indexFlag == false &&
        variable.bitfieldFlag == false
      ) {
        this.objWrByte(eByteCode.bc_hub_bytecode);
        this.objWrByte(eByteCode.bc_read_clkfreq);
      } else {
        // not a CLKFREQ read
        this.logMessage(`  -- compileVariable() variable.wordSize=(${variable.wordSize})`);
        this.compileConstant(BigInt(variable.address));
        if (variable.indexFlag == true) {
          this.compileIndex();
          this.objWrByte(eByteCode.bc_setup_byte_pb_pi + variable.wordSize);
        } else {
          this.objWrByte(eByteCode.bc_setup_byte_pa + variable.wordSize);
        }
        this.compileVariableBitfield(variable);
        this.compileVariableReadWriteAssign(variable);
      }
      workIsComplete = true; // DONE
    }

    // handle leftover cases of variable access (DAT, VAR, PUB/PRI(loc))
    if (workIsComplete == false) {
      let accessBytecode: number = eByteCode.bc_setup_byte_pbase + variable.wordSize * 6;
      this.logMessage(`* compileVariable() variable.type=[${eElementType[variable.type]}], accessBytecode=(${accessBytecode})`);
      switch (variable.type) {
        case eElementType.type_dat_byte: // pbase - program base
          accessBytecode += 0;
          break;
        case eElementType.type_var_byte: // vbase - variable base
          accessBytecode += 1;
          break;
        case eElementType.type_loc_byte: // dbase - stack base
          accessBytecode += 2;
          break;
      }
      this.logMessage(`* compileVariable() variable.indexFlag=(${variable.indexFlag}), accessBytecode=(${accessBytecode})`);
      if (variable.indexFlag == true) {
        accessBytecode += 3;
        const indexReturn: iValueReturn = this.compileIndexCheckCon();
        if (indexReturn.isResolved) {
          this.objWrByte(accessBytecode - 3); // undo the +3, not needed when index
          this.compileRfvar(BigInt(variable.address) + (indexReturn.value << BigInt(variable.wordSize)));
        } else {
          this.objWrByte(accessBytecode);
          this.compileRfvar(BigInt(variable.address));
        }
      } else {
        this.objWrByte(accessBytecode);
        this.compileRfvar(BigInt(variable.address));
      }
      this.compileVariableBitfield(variable);
      this.compileVariableReadWriteAssign(variable);
      // NOTE: possible post optimization did we wind up in one of our 16 vars
    }
    this.restoreElementLocation(resumeIndex); // return to location at entry
  }

  private compileVariableClearSetInst(variable: iVariableReturn, mode: eCompOp) {
    // PNut: compile_var_clrset_inst:
    const bytecode: eByteCode = mode == eCompOp.CO_Clear ? eByteCode.bc_con_n + 1 : eByteCode.bc_con_n;
    this.objWrByte(bytecode);
    variable.operation = eVariableOperation.VO_WRITE;
    this.compileVariable(variable); // this is var~ // var~~
  }

  private compileVariableClearSetTerm(variable: iVariableReturn, mode: eCompOp) {
    // PNut: compile_var_clrset_term:
    const bytecode: eByteCode = mode == eCompOp.CO_Clear ? eByteCode.bc_con_n + 1 : eByteCode.bc_con_n;
    this.objWrByte(bytecode);
    variable.operation = eVariableOperation.VO_ASSIGN;
    // uses post assignment to effect var~ // var~~
    variable.assignmentBytecode = eByteCode.bc_var_swap; // this is \value post assignment
    this.compileVariable(variable);
  }

  private compileVariableRead() {
    // PNut: compile_var_read:
    const variable: iVariableReturn = this.getVariable();
    variable.operation = eVariableOperation.VO_READ;
    this.compileVariable(variable);
  }

  private compileVariableWrite() {
    // PNut: compile_var_write:
    const variable: iVariableReturn = this.getVariable();
    variable.operation = eVariableOperation.VO_WRITE;
    this.compileVariable(variable);
  }

  private compileVariableExpression(variable: iVariableReturn, bytecode: eByteCode) {
    // PNut: compile_var_exp:
    this.compileExpression(); // cause constant to be written
    variable.operation = eVariableOperation.VO_ASSIGN;
    variable.assignmentBytecode = bytecode;
    this.compileVariable(variable);
  }

  private compileVariablePre(bytecode: eByteCode) {
    // PNut: compile_var_pre:
    const variable: iVariableReturn = this.getVariable();
    variable.operation = eVariableOperation.VO_ASSIGN;
    variable.assignmentBytecode = bytecode;
    this.compileVariable(variable);
  }

  private compileVariableAssign(variable: iVariableReturn, bytecode: eByteCode) {
    // PNut: compile_var_assign:
    variable.operation = eVariableOperation.VO_ASSIGN;
    variable.assignmentBytecode = bytecode;
    this.compileVariable(variable);
  }

  private getVariable(): iVariableReturn {
    // PNut: get_variable:
    this.logMessage(`*==* getVariable()`);
    this.getElement();
    const variableResult: iVariableReturn = this.checkVariable();
    if (variableResult.isVariable == false) {
      // [error_eav]
      throw new Error('Expected a variable (m0F1)');
    }
    return variableResult;
  }

  private compileVariableReadWriteAssign(variable: iVariableReturn) {
    switch (variable.operation) {
      case eVariableOperation.VO_READ:
        this.objWrByte(eByteCode.bc_read);
        break;

      case eVariableOperation.VO_WRITE:
        this.objWrByte(eByteCode.bc_write);
        break;

      case eVariableOperation.VO_ASSIGN:
        this.objWrByte(variable.assignmentBytecode);
        break;
    }
  }

  private compileVariableBitfield(variable: iVariableReturn) {
    // PNut @@enterbit:
    if (variable.bitfieldFlag === true) {
      this.getDot();
      this.getLeftBracket();
      if (variable.bitfieldConstantFlag == false) {
        this.skipExpression(); // already compiled, skip it
        if (this.checkDotDot()) {
          this.skipExpression();
        }
        // not constant bitfield, already compiled
        this.objWrByte(eByteCode.bc_setup_bfield_pop);
      } else {
        // bitfieldConstantFlag is true
        const firstValueReturn = this.skipExpressionCheckCon();
        if (firstValueReturn.isResolved === false) {
          // [error_eicon]
          throw new Error('Expected integer constant (m110)');
        }
        const firstValue: number = Number(BigInt(firstValueReturn.value) & BigInt(0x3ff));
        let encodedBitfield: number = firstValue; // default: count of additional bits | bit number
        if (this.checkDotDot()) {
          // we have a bit plus additional bit(s)
          const secondValueReturn = this.skipExpressionCheckCon();
          if (secondValueReturn.isResolved === false) {
            // [error_eicon]
            throw new Error('Expected integer constant (m111)');
          }
          const secondValue: number = Number(BigInt(secondValueReturn.value) & BigInt(0x3ff));
          // encode: count of additional bits | bit number
          encodedBitfield = (((firstValue - secondValue) & 0x1f) << 5) | (secondValue & 0x1f);
        }
        if (encodedBitfield <= 0x1f) {
          // have single bit
          this.objWrByte(eByteCode.bc_setup_bfield_0_31 + encodedBitfield);
        } else {
          // have bit plus additional bit(s)
          this.objWrByte(eByteCode.bc_setup_bfield_rfvar);
          this.compileRfvar(BigInt(encodedBitfield));
        }
      }
      this.getRightBracket();
    }
  }

  private compileRfvars(value: bigint) {
    // coded per PNut compile_rfvars:
    let workingValue: bigint = value & BigInt(0xffffffff);
    if (value & BigInt(0x10000000)) {
      workingValue |= BigInt(0xf0000000);
    } else {
      workingValue &= BigInt(0x0fffffff);
    }
    if (workingValue >= BigInt(0xffffffc0) || workingValue <= BigInt(0x0000003f)) {
      // 1 BYTE value
      this.objWrByte(Number(workingValue & BigInt(0x7f)));
    } else if (workingValue >= BigInt(0xffffe000) || workingValue <= BigInt(0x00001fff)) {
      // 2 BYTE value
      this.objWrByte(Number(workingValue | BigInt(0x80)));
      this.objWrByte(Number((workingValue >> 7n) & BigInt(0x7f)));
    } else if (workingValue >= BigInt(0xfff00000) || workingValue <= BigInt(0x000fffff)) {
      // 3 BYTE value
      this.objWrByte(Number(workingValue | BigInt(0x80)));
      this.objWrByte(Number((workingValue >> 7n) | BigInt(0x80)));
      this.objWrByte(Number((workingValue >> 14n) & BigInt(0x7f)));
    } else {
      // 4 BYTE value
      // NOTE: unable to figure out, so far, how to coverage test this
      this.objWrByte(Number(workingValue | BigInt(0x80)));
      this.objWrByte(Number((workingValue >> 7n) | BigInt(0x80)));
      this.objWrByte(Number((workingValue >> 14n) | BigInt(0x80)));
      this.objWrByte(Number(workingValue >> 21n));
    }
  }

  private compileRfvar(value: bigint) {
    // generates 1-4 bytes (unsigned)
    const masks = [BigInt(0x1fffff80), BigInt(0x1fffc000), BigInt(0x1fe00000)];
    for (let i = 0; i < masks.length; i++) {
      if (value & masks[i]) {
        this.objImage.append(((Number(value) >> (7 * i)) & 0x7f) | 0x80);
      } else {
        this.objImage.append((Number(value) >> (7 * i)) & 0x7f);
        return;
      }
    }
    // NOTE: unable to figure out, so far, how to coverage test this
    this.objImage.append((Number(value) >> 21) & 0xff);
  }

  private compileIndexCheckCon(): iValueReturn {
    // PNut @@compileindex: (local version of compileIndex)
    this.getLeftBracket();
    const valueReturn = this.compileExpressionCheckCon();
    this.getRightBracket();
    return valueReturn;
  }

  private checkVariable(): iVariableReturn {
    //
    //  field - type_field
    //  ------------------
    //
    //  FIELD[memfield]
    //  FIELD[memfield][index]
    //
    //
    //  register - type_register
    //  ------------------------
    //
    //  regname
    //  regname.[bitfield]
    //  regname[index]
    //  regname[index].[bitfield]
    //
    //
    //  hub memory - type_loc_???? / type_var_???? / type_dat_???? / type_hub_????
    //  --------------------------------------------------------------------------
    //
    //  hubname{.BYTE/WORD/LONG}
    //  hubname{.BYTE/WORD/LONG}.[bitfield]
    //  hubname{.BYTE/WORD/LONG}[index]
    //  hubname{.BYTE/WORD/LONG}[index].[bitfield]
    //
    //
    //  hub memory - type_size
    //  ----------------------
    //
    //  BYTE/WORD/LONG[base]
    //  BYTE/WORD/LONG[base].[bitfield]
    //  BYTE/WORD/LONG[base][index]
    //  BYTE/WORD/LONG[base][index].[bitfield]
    //
    let resultVariable: iVariableReturn = {
      isVariable: true,
      type: eElementType.type_undefined,
      address: 0,
      nextElementIndex: 0,
      wordSize: 0,
      sizeOverrideFlag: false,
      indexFlag: false,
      bitfieldFlag: false,
      bitfieldConstantFlag: false,
      operation: eVariableOperation.VO_Unknown,
      assignmentBytecode: 0
    };

    this.logMessage(`* checkVariable() elem=[${this.currElement.toString()}]`);

    // preserve initial values (PNut al,ebx)
    let variableType: eElementType = this.currElement.type;
    let variableAddress: number = Number(this.currElement.bigintValue);

    switch (variableType) {
      case eElementType.type_recv:
        variableType = eElementType.type_register;
        variableAddress = this.mrecvReg;
        break;
      case eElementType.type_send:
        variableType = eElementType.type_register;
        variableAddress = this.msendReg;
        break;
    }

    resultVariable.address = variableAddress;
    resultVariable.nextElementIndex = this.nextElementIndex; // next to be gotten
    resultVariable.address &= 0xfffff; // forecast for structure stuff

    switch (variableType) {
      case eElementType.type_loc_byte:
      case eElementType.type_loc_word:
      case eElementType.type_loc_long:
        resultVariable.type = eElementType.type_loc_byte;
        resultVariable.wordSize = variableType - eElementType.type_loc_byte;
        this.checkVariableSizeOverride(resultVariable);
        this.checkVariableIndex(resultVariable);
        this.checkVariableBitfield(resultVariable);
        break;

      case eElementType.type_var_byte:
      case eElementType.type_var_word:
      case eElementType.type_var_long:
        resultVariable.type = eElementType.type_var_byte;
        resultVariable.wordSize = variableType - eElementType.type_var_byte;
        this.checkVariableSizeOverride(resultVariable);
        this.checkVariableIndex(resultVariable);
        this.checkVariableBitfield(resultVariable);
        break;

      case eElementType.type_dat_byte:
      case eElementType.type_dat_word:
      case eElementType.type_dat_long:
        resultVariable.type = eElementType.type_dat_byte;
        resultVariable.wordSize = variableType - eElementType.type_dat_byte;
        this.checkVariableSizeOverride(resultVariable);
        this.checkVariableIndex(resultVariable);
        this.checkVariableBitfield(resultVariable);
        break;

      // NOTE: the _byte and _word cases really don't occur, can't coverage test
      case eElementType.type_hub_byte:
      case eElementType.type_hub_word:
      case eElementType.type_hub_long:
        resultVariable.type = eElementType.type_hub_byte;
        resultVariable.wordSize = variableType - eElementType.type_hub_byte;
        this.checkVariableSizeOverride(resultVariable);
        this.checkVariableIndex(resultVariable);
        this.checkVariableBitfield(resultVariable);
        break;

      case eElementType.type_reg:
        {
          this.getLeftBracket();
          const registerResult = this.getValue(eMode.BM_OperandIntOnly, eResolve.BR_Must);
          const registerAddress: number = Number(this.signExtendFrom32Bit(registerResult.value));
          if (registerAddress < 0 || registerAddress > 511) {
            // [error_cmbf0t511]
            throw new Error('Constant must be from 0 to 511 (m041)');
          }
          this.getRightBracket();
          resultVariable.type = eElementType.type_register;
          resultVariable.address = registerAddress;
          resultVariable.nextElementIndex = this.nextElementIndex; // after the right bracket
          this.checkVariableIndex(resultVariable);
          this.checkVariableBitfield(resultVariable);
        }
        break;

      case eElementType.type_field:
        resultVariable.type = eElementType.type_field;
        this.skipIndex();
        this.checkVariableIndex(resultVariable); // this sets the flag if present
        break;

      case eElementType.type_register:
        resultVariable.type = eElementType.type_register;
        this.checkVariableIndex(resultVariable);
        this.checkVariableBitfield(resultVariable);
        break;

      case eElementType.type_size:
        {
          const [foundIndex, nextElementIndex] = this.checkIndex();
          if (foundIndex == false) {
            // NOTE coverage: this appears to be an exception case...
            resultVariable.isVariable = false;
          } else {
            resultVariable.type = eElementType.type_size;
            resultVariable.wordSize = variableAddress;
            this.checkVariableIndex(resultVariable);
            this.checkVariableBitfield(resultVariable);
          }
        }
        break;

      default:
        resultVariable.isVariable = false;
        break;
    }
    return resultVariable;
  }

  private checkVariableMethod(): [boolean, number] {
    // Check for var({params,...}){:returns}
    //  on exit, z=1 if method with number of return values in ebx
    // PNut check_var_method:
    let foundMethodStatus: boolean = false;
    let returnValueCount: number = 0;
    const variableResult: iVariableReturn = this.checkVariable();
    if (variableResult.isVariable) {
      this.logMessage(`  -- checkVariableMethod() type=[${eElementType[variableResult.type]}], addr=(${hexLong(variableResult.address, '0x')})`);
      if (this.checkLeftParen()) {
        if (variableResult.type == eElementType.type_register && variableResult.address == this.mrecvReg) {
          // have RECV(), no parameters allowed, one return value
          this.getRightParen();
          returnValueCount = 1;
          foundMethodStatus = true;
        } else if (variableResult.type == eElementType.type_register && variableResult.address == this.msendReg) {
          // have SEND(param{,...}), parameters allowed, no return value (0 is default!)
          this.scanToRightParen();
          foundMethodStatus = true;
        } else {
          this.scanToRightParen();
          // if no following colon then return 0 (0 is default!)
          foundMethodStatus = true;
          if (this.checkColon()) {
            returnValueCount = this.getConInt();
            if (returnValueCount > this.results_limit) {
              // [error_loxre]
              throw new Error('Limit of 15 results exceeded');
            }
          }
        }
      }
    } else {
      this.logMessage(`  -- checkVariableMethod() isVariable=(${variableResult.isVariable})`);
    }
    return [foundMethodStatus, returnValueCount];
  }

  private checkVariableSizeOverride(resultSoFar: iVariableReturn) {
    if (this.checkDot()) {
      this.getElement();
      if (this.currElement.type == eElementType.type_size) {
        resultSoFar.wordSize = Number(this.currElement.bigintValue);
        resultSoFar.sizeOverrideFlag = true;
      } else {
        // not a size... so back out
        this.backElement();
        this.backElement();
      }
    }
  }

  private checkVariableIndex(resultSoFar: iVariableReturn) {
    // PNut (not in PNut):
    let [foundIndex, nextElementIndex] = this.checkIndex();
    if (foundIndex) {
      resultSoFar.indexFlag = true;
    }
  }

  private checkVariableBitfield(resultSoFar: iVariableReturn) {
    // PNut (not in PNut):
    if (this.checkDot()) {
      resultSoFar.bitfieldFlag = true;
      this.getLeftBracket();
      const expressionAReturn = this.skipExpressionCheckCon();
      if (expressionAReturn.isResolved) {
        resultSoFar.bitfieldConstantFlag = true;
      }
      // do we have a range?
      if (this.checkDotDot()) {
        const expressionBReturn = this.skipExpressionCheckCon();
        if (expressionBReturn.isResolved == false) {
          // don't have both expressions!
          resultSoFar.bitfieldConstantFlag = false;
        }
      }
      this.getRightBracket();
    }
  }

  private compileIndex() {
    // Pnut compile_index:
    this.getLeftBracket();
    this.compileExpression();
    this.getRightBracket();
  }

  private checkIndex(): [boolean, number] {
    // PNut: check_index:
    let indexPresentStatus: boolean = false;
    let nextElementIndex: number = 0;
    if (this.checkLeftBracket()) {
      nextElementIndex = this.saveElementLocation();
      indexPresentStatus = true;
      this.skipExpression();
      this.getRightBracket();
    }
    return [indexPresentStatus, nextElementIndex];
  }

  private skipIndex() {
    // Pnut skip_index:
    this.getLeftBracket();
    this.skipExpression();
    this.getRightBracket();
  }

  private skipExpression() {
    // Pnut skip_exp:
    const savedObjOffset = this.objImage.offset;
    this.compileExpression();
    this.objImage.setOffsetTo(savedObjOffset);
  }

  private skipExpressionCheckCon(): iValueReturn {
    // PNut skip_exp_check_con:
    const savedObjOffset = this.objImage.offset;
    const constantReturn = this.compileExpressionCheckCon();
    this.objImage.setOffsetTo(savedObjOffset);
    return constantReturn;
  }

  private getConInt(): number {
    this.getElement();
    if (this.currElement.type != eElementType.type_con) {
      // [error_eicon]
      throw new Error('Expected integer constant (m112)');
    }
    return Number(this.currElement.bigintValue);
  }

  private getLeftParen() {
    this.getElement();
    if (this.currElement.type != eElementType.type_left) {
      // [error_eleft]
      throw new Error('Expected "("');
    }
  }

  private getRightParen() {
    this.getElement();
    if (this.currElement.type != eElementType.type_right) {
      // [error_eright]
      throw new Error('get Expected ")"');
    }
  }

  private getLeftBracket() {
    this.getElement();
    if (this.currElement.type != eElementType.type_leftb) {
      // [error_eleftb]
      throw new Error('Expected "["');
    }
  }

  private getRightBracket() {
    this.getElement();
    if (this.currElement.type != eElementType.type_rightb) {
      // [error_erightb]
      throw new Error('Expected "]"');
    }
  }

  private getComma() {
    this.getElement();
    if (this.currElement.type != eElementType.type_comma) {
      // [error_ecomma]
      throw new Error('Expected ","');
    }
  }
  private getPound() {
    this.getElement();
    if (this.currElement.type != eElementType.type_pound) {
      // [error_epound]
      throw new Error('Expected "#"');
    }
  }
  private getEqual() {
    this.getElement();
    if (this.currElement.type != eElementType.type_equal) {
      // [error_eequal]
      throw new Error('Expected "="');
    }
  }

  private getColon() {
    this.getElement();
    if (this.currElement.type != eElementType.type_colon) {
      // [error_ecolon]
      throw new Error('Expected ":"');
    }
  }

  private getDot() {
    this.getElement();
    if (this.currElement.type != eElementType.type_dot) {
      // [error_edot]
      throw new Error('Expected "."');
    }
  }

  private getDotDot() {
    this.getElement();
    if (this.currElement.type != eElementType.type_dotdot) {
      // [error_edotdot]
      throw new Error('Expected ".."');
    }
  }

  private getAssign() {
    this.getElement();
    if (this.currElement.type != eElementType.type_assign) {
      // [error_eassign]
      throw new Error('Expected ":="');
    }
  }

  private getSize() {
    this.getElement();
    if (this.currElement.type != eElementType.type_size) {
      // [error_ebwl]
      throw new Error('Expected BYTE/WORD/LONG');
    }
  }

  private getFrom() {
    this.getElement();
    if (this.currElement.type != eElementType.type_from) {
      // [error_efrom]
      throw new Error('Expected FROM');
    }
  }

  private getTo() {
    this.getElement();
    if (this.currElement.type != eElementType.type_to) {
      // [error_eto]
      throw new Error('Expected TO');
    }
  }

  private getWith() {
    this.getElement();
    if (this.currElement.type != eElementType.type_with) {
      // [error_ewith]
      throw new Error('Expected WITH');
    }
  }

  private checkFloatMode() {
    if (this.mathMode == eMathMode.MM_IntMode) {
      // [error_fpnaiie]
      throw new Error('Floating-point not allowed in integer expression');
    } else {
      this.mathMode = eMathMode.MM_FloatMode;
      this.logMessage(`* mathMode = Float`);
    }
  }

  private checkIntMode() {
    if (this.mathMode == eMathMode.MM_FloatMode) {
      // [error_inaifpe]
      throw new Error('Integer not allowed in floating-point expression');
    } else {
      this.mathMode = eMathMode.MM_IntMode;
      this.logMessage(`* mathMode = Int`);
    }
  }

  private SubToNeg(): boolean {
    // replace our element with a better element
    this.logMessage(`  -- SubToNeg() at elem=[${this.currElement.toString()}]`);
    let elementAdjustedStatus: boolean = false;
    if (this.currElement.operation == eOperationType.op_sub) {
      // replace our element with an oc_neg [sub-to-neg]
      this.currElement.setValue(BigInt(this.spinSymbolTables.opcodeValue(eOpcode.oc_neg)) & BigInt(0xffffffff));
      elementAdjustedStatus = true;
    }
    const actionInterp: string = elementAdjustedStatus ? 'ADJUSTED' : 'left-alone';
    this.logMessage(`  -- SubToNeg() ${actionInterp} elem=[${this.currElement.toString()}]`);
    return elementAdjustedStatus;
  }

  private FSubToFNeg() {
    // replace our element with a better element
    if (this.currElement.operation == eOperationType.op_fsub) {
      // replace our element with an oc_fneg [fsub-to-fneg]
      this.currElement.setValue(BigInt(this.spinSymbolTables.opcodeValue(eOpcode.oc_fneg)) & BigInt(0xffffffff));
    }
  }

  private nextElementType(): eElementType {
    const element = this.spinElements[this.nextElementIndex];
    //this.logMessage(`* NEXTele i#${this.nextElementIndex}, e=[${this.spinElements[this.nextElementIndex].toString()}]`);
    return element.type;
  }

  private nextElementValue(): eValueType | eBlockType {
    const element = this.spinElements[this.nextElementIndex];
    return Number(element.value);
  }

  private saveElementLocation(): number {
    // return current index for later restore
    const savedElementIndex: number = this.nextElementIndex;
    this.logMessage(`*** SAVEd Element Index (${savedElementIndex})`);
    return savedElementIndex;
  }

  private restoreElementLocation(savedLocation: number) {
    this.logMessage(`*** RESTOREd Element Index (${this.nextElementIndex}) -> (${savedLocation})`);
    this.nextElementIndex = savedLocation;
  }

  private setScopeColumn(newScopeColumn: number) {
    this.logMessage(`* LINE_SCOPE scopeColumn SET (${this.scopeColumn}) -> (${newScopeColumn})`);
    this.scopeColumn = newScopeColumn;
  }

  private getElement(): SpinElement {
    //this.logMessage(`* Element Index=(${this.nextElementIndex + 1})`);
    if (this.spinElements.length == 0) {
      throw new Error(`NO Elements`);
    }
    let element = this.spinElements[this.nextElementIndex];
    // if we reach end, stay on this element forever
    if (element.type != eElementType.type_end_file) {
      if (this.nextElementIndex > this.spinElements.length - 1) {
        throw new Error(`Off end of Element List`);
      }
      this.nextElementIndex++;
    }

    // if the symbol exists, return it instead of undefined
    this.replacedName = '';
    if (element.isTypeUndefined) {
      const foundSymbol = this.lookupSymbol(element.stringValue);
      if (foundSymbol !== undefined) {
        this.replacedName = element.stringValue;
        const symbolLength = element.getSymbolLength();
        this.logMessage(`* GETele REPLACING element=[${element.toString()}]`);
        element = new SpinElement(-1, eElementType.type_undefined, '', -1, -1, element);
        element.setType(foundSymbol.type);
        element.setValue(foundSymbol.value);
        element.setSymbolLength(symbolLength);
        this.logMessage(`*       with element=[${element.toString()}]`);
        element.setSourceElementWasUndefined(); // mark this NEW symbol as replacing an undefined symbol
      }
    }
    //*
    this.logMessage(`* GETele GOT i#${this.nextElementIndex - 1}, e=[${element.toString()}]`);
    if (element.type != eElementType.type_end_file) {
      //this.logMessage(`*        NEXT i#${this.nextElementIndex}, e=[${this.spinElements[this.nextElementIndex].toString()}]`);
    } else {
      this.logMessage(`*        NEXT -- at EOF --`);
    }
    //*/

    // save a copy of the element into our global
    this.currElement = new SpinElement(0, eElementType.type_undefined, '', 0, 0, element);
    return this.currElement; // NOTE: (WARNING!) this is a reference into our active element list
  }

  private lookupSymbol(symbolName: string): iSymbol | undefined {
    let desiredSymbol: iSymbol | undefined = this.mainSymbols.get(symbolName);
    if (desiredSymbol === undefined) {
      desiredSymbol = this.localSymbols.get(symbolName);
    }
    if (desiredSymbol === undefined) {
      desiredSymbol = this.inlineSymbols.get(symbolName);
    }
    return desiredSymbol;
  }

  private peekNextElement(): SpinElement {
    // for logging use ONLY
    const nextElement: SpinElement = new SpinElement(0, eElementType.type_undefined, '', 0, 0, this.spinElements[this.nextElementIndex]);
    return nextElement;
  }

  private backElement(): void {
    // don't let our index get < 0!
    this.nextElementIndex -= this.nextElementIndex > 2 ? 2 : this.nextElementIndex;
    this.logMessage(`* BACKele nextElemIdx=(${this.nextElementIndex})`);
    this.currElement = new SpinElement(0, eElementType.type_undefined, '', 0, 0, this.spinElements[this.nextElementIndex++]);
    // and make sure our column offset into the line is set
    this.logMessage(`* BACKele i#${this.nextElementIndex - 1}, e=[${this.currElement.toString()}], nextElemIdx=(${this.nextElementIndex})`);
  }

  private getColumn() {
    if (this.currElement.sourceColumnOffset != 0) {
      this.logMessage(`* LINE_SCOPE getColumn() lineColumn (${this.lineColumn}) -> (${this.currElement.sourceColumnOffset})`);
      this.lineColumn = this.currElement.sourceColumnOffset;
    } else {
      this.logMessage(`WARNING: getColumn() sourceColumnOffset in SpinElement NOT SET!`);
    }
  }

  private resolveOperation(parmA: bigint, parmB: bigint, operation: eOperationType, isFloatInConBlock: boolean): bigint {
    // runtime expression compiler (puts byte codes together to solve at runtime)
    //   calls compile time to reduce constants before emitting byte code
    // compile-time resolver - THIS CODE
    //  isFloatInConBlock is ONLY true if we are compiling CON blocks and we have a floating point context
    const msb32Bit: bigint = BigInt(0x80000000);
    const float1p0: bigint = BigInt(0x3f800000);
    const mask32Bit: bigint = BigInt(0xffffffff);
    const mask31Bit: bigint = BigInt(0x7fffffff);
    const true32Bit: bigint = BigInt(0xffffffff);
    const false32Bit: bigint = 0n;

    this.logMessage(
      `* resolveOperation(${float32ToHexString(parmA)}, ${float32ToHexString(parmB)}) ${eOperationType[operation]} isFloat=(${isFloatInConBlock})`
    );

    // conditioning the incoming params
    let a: bigint = parmA;
    let b: bigint = parmB;
    a &= mask32Bit;
    b &= mask32Bit;

    // clip in values before we operate on them
    const bitCountFromB: bigint = b & 31n;

    switch (operation) {
      case eOperationType.op_bitnot: // !
        this.logMessage(`resolveOperation() have op_bitnot:`);
        // invert our 32bits
        a ^= mask32Bit;
        break;
      case eOperationType.op_neg: //  - (uses op_sub sym)
        this.logMessage(`resolveOperation() have op_neg:`);
        if (isFloatInConBlock) {
          // our 32bit float  signbit in msb, 8 exponent bits, 23 mantissa bits
          a ^= msb32Bit;
        } else {
          a = ((a ^ mask32Bit) + 1n) & mask32Bit;
        }
        break;
      case eOperationType.op_fneg: // -.  (uses op_fsub sym)
        a ^= msb32Bit;
        break;
      case eOperationType.op_abs: //  ABS
        if (isFloatInConBlock) {
          a &= mask31Bit;
        } else {
          a = a & msb32Bit ? ((a ^ mask32Bit) + 1n) & mask32Bit : a;
        }
        break;
      case eOperationType.op_fabs: //  FABS
        a &= mask31Bit;
        break;
      case eOperationType.op_encod: //  ENCOD
        {
          let bitPosition: bigint = 0n;
          for (let index: bigint = 31n; index >= 0n; index--) {
            if (a & (1n << index)) {
              bitPosition = index;
              break;
            }
          }
          a = bitPosition;
        }
        break;
      case eOperationType.op_decod: //  DECOD
        a = 1n << (a & 31n);
        break;
      case eOperationType.op_bmask: //  BMASK
        a = mask32Bit >> (31n - (a & 31n));
        break;

      case eOperationType.op_ones: //  ONES
        {
          let bitCount: bigint = 0n;
          for (let index: bigint = 31n; index >= 0n; index--) {
            if (a & (1n << index)) {
              bitCount++;
            }
          }
          a = bitCount;
        }
        break;

      case eOperationType.op_sqrt: //  SQRT
        {
          let root: bigint = 0n;
          for (let index: bigint = 15n; index >= 0n; index--) {
            root |= 1n << index;
            if (root * root > a) {
              root ^= 1n << index;
            }
          }
          a = root;
        }
        break;

      case eOperationType.op_fsqrt: //  FSQRT
        {
          if (a > msb32Bit) {
            // [error_fpcmbp]
            throw new Error(`Floating-point constant must be positive`);
          }
          // convert to internal from float32
          const internalFloat64: number = bigIntFloat32ToNumber(a);
          // get square root
          const internalSqRoot64: number = Math.sqrt(internalFloat64);
          // convert back to float32
          a = numberToBigIntFloat32(internalSqRoot64);
        }
        break;

      case eOperationType.op_qlog: //  QLOG
        // if a is non-zero... then calculate else leave it at zero
        //
        // WARNING this result MAY cause binary differences in our output file! WARNING
        //  consider this code if we see problems in our regression tests
        //  it's all a matter of precision...
        if (a) {
          a = BigInt(Math.trunc(Math.log2(Number(a)) * Math.pow(2, 27))); // +/- 2 bits
        }
        break;

      case eOperationType.op_qexp: //  QEXP
        // WARNING this result MAY cause binary differences in our output file! WARNING
        //  consider this code if we see problems in our regression tests
        //  it's all a matter of precision...
        a = BigInt(Math.trunc(Math.pow(2, Number(a) / Math.pow(2, 27)))); //  +/- 3 bits  // trunc ..E9, round ..EA (Chip gets E8!) a=0xFFFFFFFF
        break;

      case eOperationType.op_shr: //  >>
        a = a >> bitCountFromB;
        break;

      case eOperationType.op_shl: //  <<
        a = (a << bitCountFromB) & mask32Bit;
        break;

      case eOperationType.op_sar: //  SAR
        {
          const isNeg: boolean = a & msb32Bit ? true : false;
          a = (((isNeg ? mask32Bit << 32n : 0n) | a) >> bitCountFromB) & mask32Bit;
        }
        break;

      case eOperationType.op_ror: //  ROR
        {
          const doubleUp: bigint = (a << 32n) | a;
          a = (doubleUp >> bitCountFromB) & mask32Bit;
        }
        break;

      case eOperationType.op_rol: //  ROL
        {
          //
          const doubleUp: bigint = (a << 32n) | a;
          a = (doubleUp >> (32n - bitCountFromB)) & mask32Bit;
        }
        break;

      case eOperationType.op_rev: //  REV
        {
          // reverse b ls-bits of a
          let revValue: bigint = 0n;
          for (let index: bigint = 0n; index <= bitCountFromB; index++) {
            revValue = (revValue << 1n) | (a & 1n);
            a = a >> 1n;
          }
          a = revValue;
        }
        break;

      case eOperationType.op_zerox: //  ZEROX
        // zero extend a from bit b
        a &= mask32Bit >> (31n - bitCountFromB);
        break;

      case eOperationType.op_signx: //  SIGNX
        // copy bit b of a to all higher bits of a
        {
          const isNeg: boolean = (a >> bitCountFromB) & 1n ? true : false;
          a &= mask32Bit >> (31n - bitCountFromB);
          a |= isNeg ? (BigInt(0xfffffffe) << bitCountFromB) & mask32Bit : 0n;
        }
        break;

      case eOperationType.op_bitand: //  &
        a &= b;
        break;

      case eOperationType.op_bitxor: //  ^
        a ^= b;
        break;

      case eOperationType.op_bitor: //  |
        a |= b;
        break;

      case eOperationType.op_mul: //  *
        // multiply a by b
        {
          if (isFloatInConBlock) {
            // convert to internal from float32
            let aInternalFloat64: number = bigIntFloat32ToNumber(a);
            const bInternalFloat64: number = bigIntFloat32ToNumber(b);
            aInternalFloat64 *= bInternalFloat64;
            // convert back to float32
            a = numberToBigIntFloat32(aInternalFloat64);
            this.checkOverflow(a);
          } else {
            a = (a * b) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fmul: //  *.
        {
          // convert to internal from float32
          let aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          aInternalFloat64 *= bInternalFloat64;
          // convert back to float32
          a = numberToBigIntFloat32(aInternalFloat64);
          this.checkOverflow(a);
        }
        break;

      case eOperationType.op_div: //  /
        // divide a by b
        {
          if (isFloatInConBlock) {
            // convert to internal from float32
            if ((b & mask31Bit) == 0n) {
              // [error_fpo]
              // (technically this is divide-by-zero attempted)
              throw new Error(`Floating-point overflow`);
            }
            let aInternalFloat64: number = bigIntFloat32ToNumber(a);
            const bInternalFloat64: number = bigIntFloat32ToNumber(b);
            aInternalFloat64 /= bInternalFloat64;
            // convert back to float32
            a = numberToBigIntFloat32(aInternalFloat64);
            this.checkOverflow(a);
          } else {
            if (b == 0n) {
              // [error_dbz]
              throw new Error(`Divide by zero (m050)`);
            }
            a = (this.signExtendFrom32Bit(a) / this.signExtendFrom32Bit(b)) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fdiv: //  /.
        {
          // convert to internal from float32
          if ((b & mask31Bit) == 0n) {
            // [error_fpo]
            // (technically this is divide-by-zero attempted)
            throw new Error(`Floating-point overflow`);
          }
          let aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          aInternalFloat64 /= bInternalFloat64;
          // convert back to float32
          a = numberToBigIntFloat32(aInternalFloat64);
          this.checkOverflow(a);
        }
        break;

      case eOperationType.op_divu: //  +/
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero (m051)`);
        }
        a /= b;
        break;

      case eOperationType.op_rem: //  //
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero (m052)`);
        }
        a = this.signExtendFrom32Bit(a) % this.signExtendFrom32Bit(b) & mask32Bit;
        break;

      case eOperationType.op_remu: //  +//
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero (m053)`);
        }
        a %= b;
        break;

      case eOperationType.op_sca: //  SCA
        a = (a * b) >> 32n;
        break;

      case eOperationType.op_scas: //  SCAS
        a = ((this.signExtendFrom32Bit(a) * this.signExtendFrom32Bit(b)) >> 30n) & mask32Bit;
        break;

      case eOperationType.op_frac: //  FRAC
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero (m054)`);
        }
        // our testing shows that this BigInt behavior is behaving like it's larger than 64 bits...
        a = (a << 32n) / b;
        if ((a >> 32n) & mask32Bit) {
          // [error_divo]
          throw new Error(`Division overflow`);
        }
        break;

      case eOperationType.op_add: //  +
        {
          // add b to a returning a
          if (isFloatInConBlock) {
            let aInternalFloat64: number = bigIntFloat32ToNumber(a);
            const bInternalFloat64: number = bigIntFloat32ToNumber(b);
            aInternalFloat64 += bInternalFloat64;
            // convert back to float32
            a = numberToBigIntFloat32(aInternalFloat64);
            this.checkOverflow(a);
          } else {
            a = (a + b) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fadd: //  +.
        {
          // add b to a returning a
          let aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          aInternalFloat64 += bInternalFloat64;
          // convert back to float32
          a = numberToBigIntFloat32(aInternalFloat64);
          this.checkOverflow(a);
        }
        break;

      case eOperationType.op_sub: //  -
        {
          // subtract b from a returning a
          if (isFloatInConBlock) {
            let aInternalFloat64: number = bigIntFloat32ToNumber(a);
            const bInternalFloat64: number = bigIntFloat32ToNumber(b);
            aInternalFloat64 -= bInternalFloat64;
            // convert back to float32
            a = numberToBigIntFloat32(aInternalFloat64);
            this.checkOverflow(a);
          } else {
            a = (a - b) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fsub: //  -.
        {
          let aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          aInternalFloat64 -= bInternalFloat64;
          // convert back to float32
          a = numberToBigIntFloat32(aInternalFloat64);
          this.checkOverflow(a);
        }
        break;

      case eOperationType.op_fge: //  #>
        {
          // force a to be greater than or equal to b
          if (isFloatInConBlock) {
            let aInternalFloat64: number = bigIntFloat32ToNumber(a);
            const bInternalFloat64: number = bigIntFloat32ToNumber(b);
            aInternalFloat64 = aInternalFloat64 < bInternalFloat64 ? bInternalFloat64 : aInternalFloat64;
            // convert back to float32
            a = numberToBigIntFloat32(aInternalFloat64);
          } else {
            a = this.signExtendFrom32Bit(a) < this.signExtendFrom32Bit(b) ? b : a;
          }
        }
        break;

      case eOperationType.op_fle: //  <#
        {
          // force a to be less than or equal to b
          if (isFloatInConBlock) {
            let aInternalFloat64: number = bigIntFloat32ToNumber(a);
            const bInternalFloat64: number = bigIntFloat32ToNumber(b);
            aInternalFloat64 = aInternalFloat64 > bInternalFloat64 ? bInternalFloat64 : aInternalFloat64;
            // convert back to float32
            a = numberToBigIntFloat32(aInternalFloat64);
          } else {
            a = this.signExtendFrom32Bit(a) > this.signExtendFrom32Bit(b) ? b : a;
          }
        }
        break;

      case eOperationType.op_addbits: //  ADDBITS
        // build bit-base (a) and bit-count (b) into a
        //  our 32-bit value: 00000000_00000000_000000bb_bbbaaaaa
        a = (a & 31n) | ((b & 31n) << 5n);
        break;

      case eOperationType.op_addpins: //  ADDPINS
        // build pin-base (a) and pin-count (b) into a
        //  our 32-bit value: 00000000_00000000_00000bbb_bbaaaaaa
        a = (a & 63n) | ((b & 31n) << 6n);
        break;

      case eOperationType.op_lt: //  <
        // force a to be less than b
        // NOTE: in CON blocks return 1 or 0,
        //       runtime it returns all 1 bits or all 0 bits

        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 < bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = this.signExtendFrom32Bit(a) < this.signExtendFrom32Bit(b) ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_flt: //  <.
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 < bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_ltu: //  +<
        // unsigned less than
        a = a < b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_lte: //  <=
        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 <= bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = this.signExtendFrom32Bit(a) <= this.signExtendFrom32Bit(b) ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_flte: //  <=.
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 <= bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_lteu: //  +<=
        a = a <= b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_e: //  ==
        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 == bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a == b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fe: //  ==.
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 == bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_ne: //  <>
        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 != bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a != b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fne: //  <>.
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 != bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_gte: //  >=
        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 >= bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a >= b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fgte: //  >=.
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 >= bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_gteu: //  +>=
        a = a >= b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_gt: //  >
        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 > bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a > b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fgt: //  >.
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          a = aInternalFloat64 > bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_gtu: //  +>
        a = a > b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_ltegt: //  <=>
        if (isFloatInConBlock) {
          const aInternalFloat64: number = bigIntFloat32ToNumber(a);
          const bInternalFloat64: number = bigIntFloat32ToNumber(b);
          const testStatus: boolean = aInternalFloat64 < bInternalFloat64;
          this.logMessage(` *** op_ltegt a(${aInternalFloat64}) < b(${bInternalFloat64}) = (${testStatus})`);
          a = aInternalFloat64 == bInternalFloat64 ? 0n : aInternalFloat64 < bInternalFloat64 ? float1p0 | msb32Bit : float1p0;
        } else {
          const extendedA = this.signExtendFrom32Bit(a);
          const extendedB = this.signExtendFrom32Bit(b);
          a = extendedA == extendedB ? 0n : extendedA < extendedB ? mask32Bit : 1n;
        }
        break;

      case eOperationType.op_lognot: //  !!,  NOT
        a = a ? false32Bit : true32Bit;
        break;

      case eOperationType.op_logand: //  &&, AND
        a = a != 0n && b != 0n ? true32Bit : false32Bit;
        break;

      case eOperationType.op_logxor: //  ^^, XOR
        a = (a == 0n && b != 0n) || (a != 0n && b == 0n) ? true32Bit : false32Bit;
        break;

      case eOperationType.op_logor: //  ||, OR
        a = a != 0n || b != 0n ? true32Bit : false32Bit;
        break;

      default:
        // [error_INTERNAL]
        throw new Error(`this operation NOT YET IMPLEMENTED`);
        break;
    }

    return a;
  }

  private checkOverflow(value: bigint) {
    if ((value & BigInt(0x7fffffff)) == BigInt(0x7f800000)) {
      // [error_fpo]
      throw new Error('Floating-point overflow');
    }
  }

  private signExtendFrom32Bit(value: bigint): bigint {
    // This code is performing a two's complement conversion on a 32-bit integer.
    //
    // Here's a step-by-step explanation:
    //
    // A bitwise AND operation between the value and 0xffffffff masks the value to keep only the lower 32 bits.
    //
    // Check to see if the most significant bit (bit 31) of the result is set.
    // This bit is the sign bit in a 32 - bit two's complement integer, and if it's set, the number is negative.
    //
    // If the sign bit is set, calculate the two's complement of the result to convert it to a negative number.
    // Inverts all bits of the result, and the + 1n adds 1 to the result, which are the steps to calculate the two's complement.
    // The - sign then makes the result negative.
    //
    // return result; Finally, the result is returned. If the original value was a positive 32-bit integer or zero,
    // it's returned as is. If it was a negative 32-bit integer, it's converted to a negative BigInt.
    //
    // In summary, this code is converting a 32-bit two's complement integer to a BigInt that can represent negative numbers.
    //
    let result: bigint = value & BigInt(0xffffffff);
    if (result & BigInt(0x80000000)) {
      result = -((result ^ BigInt(0xffffffff)) + 1n);
    }
    return result;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
