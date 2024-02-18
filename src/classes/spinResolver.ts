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
import { eElementType, eOperationType, eValueType } from './types';
import { bigIntFloat32ToNumber, float32ToHexString, numberToBigIntFloat32 } from '../utils/float32';
import { SpinSymbolTables, eOpcode, iSpinSymbol } from './parseUtils';
import { SymbolTable, iSymbol } from './symbolTable';
import { Uint8Image } from './uint8Image';
import { getSourceSymbol } from '../utils/fileUtils';

// Internal types used for passing complex values
interface iValueReturn {
  value: bigint;
  isResolved: boolean;
  isFloat: boolean;
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
  BM_Operand,
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

export class SpinResolver {
  private context: Context;
  private isLogging: boolean = false;
  // data from our elemtizer and navigation variables
  private spinElements: SpinElement[] = [];
  private elementIndex: number = 0;
  // parser state
  private mathMode: eMathMode = eMathMode.MM_Unknown;

  // CON processing support data
  private numberStack: NumberStack;
  private spinSymbolTables: SpinSymbolTables;
  private lowestPrecedence: number;

  // these first two may go away
  private autoSymbols: SymbolTable = new SymbolTable(); // neverechanging symbols
  private levelSymbols: SymbolTable = new SymbolTable(); // based on language level

  private mainSymbols: SymbolTable = new SymbolTable(); // var, dat, pub, pri, con, obj
  private parameterSymbols: SymbolTable = new SymbolTable(); // constants from parent object
  private localSymbols: SymbolTable = new SymbolTable(); // parameters, return variables and locals for PUB/PRI scope
  private inlineSymbols: SymbolTable = new SymbolTable(); // for inline code sections
  private activeSymbolTable: eSymbolTableId = eSymbolTableId.STI_MAIN;

  // DAT processing support data
  private objImage: Uint8Image;
  private asmLocal: number = 0;
  private hubOrg: number = 0x00000;
  private hubOrgLimit: number = 0x100000;
  private hubMode: boolean = false; // was orgh!
  private orghOffset: number = 0;
  private cogOrg: number = 0 << 2;
  private cogOrgLimit: number = 0x1f8 << 2;
  private pasmMode: boolean = false;
  private fitToSize: boolean = false;
  private wordSize: eWordSize = eWordSize.WS_Byte; // 0=byte, 1=word, 2=long
  private weHaveASymbol: boolean = false;
  private symbolName: string = '';

  constructor(ctx: Context) {
    this.context = ctx;
    this.numberStack = new NumberStack(ctx);
    this.isLogging = this.context.logOptions.logResolver;
    this.spinSymbolTables = new SpinSymbolTables(ctx);
    this.objImage = new Uint8Image(ctx);
    this.lowestPrecedence = this.spinSymbolTables.lowestPrecedence;
    this.numberStack.enableLogging(this.isLogging);
  }

  public setElements(updatedElementList: SpinElement[]) {
    this.spinElements = updatedElementList;
  }

  get userSymbolTable(): SymbolTable {
    return this.mainSymbols;
  }

  public compile1() {
    // reset symbol tables
    /*
      call	enter_symbols_level	;enter level symbols after determining spin2 level
      call	enter_symbols_param	;enter parameter symbols
      mov	[pubcon_list_size],0	;reset pub/con list
      mov	[list_length],0		;reset list length
      mov	[doc_length],0		;reset doc length
      mov	[doc_mode],0		;reset doc mode
      mov	[info_count],0		;reset info count
    */
    this.mainSymbols.reset();
    this.localSymbols.reset();
    this.inlineSymbols.reset();
    this.activeSymbolTable = eSymbolTableId.STI_MAIN;
    this.asmLocal = 0;
    this.objImage.reset();
    this.compile_con_blocks_1st();
    //this.compile_dat_blocks_fn();
  }

  public compile2() {
    this.compile_con_blocks_2nd();
    //this.compile_dat_blocks();
  }

  private compile_con_blocks_1st() {
    // true here means very-first pass!
    const FIRST_PASS: boolean = true;
    this.compile_con_blocks(eResolve.BR_Try, FIRST_PASS);
    this.compile_con_blocks(eResolve.BR_Try);
  }

  private compile_con_blocks_2nd() {
    this.compile_con_blocks(eResolve.BR_Try);
    this.compile_con_blocks(eResolve.BR_Must);
  }

  private compile_dat_blocks_fn() {
    //
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
    if (inLineMode) {
      this.activeSymbolTable = eSymbolTableId.STI_INLINE;
    }

    // pasm symbols sym, .sym (global and local)
    //
    // TODO: POSSIBLE LANG ENHANCEMENT: datName.localSymbol (let our symbol table remember global.local pasm reference)
    // remember where we are starting from in OBJ image, with local labelling and with
    const startingObjOffset = this.objImage.offset;
    const startingAsmLocal = this.asmLocal;
    const startingElementIndex = this.elementIndex;

    let pass: number = 0;
    do {
      // PASS Loop
      this.objImage.setOffsetTo(startingObjOffset);
      this.asmLocal = startingAsmLocal;
      this.elementIndex = startingElementIndex;
      this.hubOrg = 0x00000; // get constant(getValue) will use this
      this.hubOrgLimit = 0x100000; // get constant(getValue) will use this;
      this.wordSize = eWordSize.WS_Byte; // 0=byte, 1=word, 2=long

      if (inLineMode) {
        this.hubMode = false;
        this.cogOrg = inLineCogOrg;
        this.cogOrgLimit = inLineCogOrgLimit;
        this.elementIndex = startingElementIndex;
      } else {
        this.hubMode = true;
        this.cogOrg = 0x000 << 2;
        this.cogOrgLimit = 0x1f8 << 2;
        // location in object of start -OR- start of hub for execution
        this.hubOrg = this.pasmMode ? this.objImage.offset : 0x00400;
        this.orghOffset = this.hubOrg - this.objImage.offset;
        this.hubOrgLimit = 0x100000;
        this.elementIndex = 0; // reset to head of file
      }
      do {
        // NEXT BLOCK Loop
        if (inLineMode === false) {
          this.nextBlock(eValueType.block_dat);
        }

        // prepare DAT block info

        // NEXT LINE Loop
        do {
          //

          let currElement: SpinElement = this.getElement();
          if (currElement.type == eElementType.type_end_file) {
            break;
          }

          let fitToSize: boolean = false;
          let isLocalSymbol: boolean = false;

          const [didFindLocal, symbol] = this.checkLocalSymbol(currElement);
          if (didFindLocal) {
            // we have a local symbol... (must be undef or is storage type)
            // replace curr elem with this symbol...
            currElement = this.getElement(); // put us in proper place in element list
            currElement.setType(symbol.type);
            currElement.setValue(symbol.value); // this is our LOCAL internal name:  sym'0000
            isLocalSymbol = true;
          }
          this.weHaveASymbol = currElement.type == eElementType.type_undefined;
          const isDatStorage: boolean = this.isDatStorageType(currElement);
          if ((this.weHaveASymbol || isDatStorage) && !isLocalSymbol) {
            this.incrementLocalScopeCounter();
          }
          if (isDatStorage && pass == 0) {
            // [error_siad]
            throw new Error('Symbol is already defined');
          }
          this.symbolName = this.weHaveASymbol ? currElement.stringValue : '';

          if (this.weHaveASymbol) {
            currElement = this.getElement(); // moving on to next (past this symbol)
          }

          if (currElement.type == eElementType.type_end) {
            this.enterDatSymbol();
            // back to top of loop to get first elem of new line
            continue;
          }
          // handle size
          let isSizeFit: boolean = currElement.type == eElementType.type_size_fit;
          if (currElement.type == eElementType.type_size || isSizeFit) {
            this.wordSize = Number(currElement.value); // NOTE: this matches our enum values
            this.enterDatSymbol(); // process pending symbol
            do {
              let currSize = this.wordSize;
              currElement = this.getElement(); // moving on to next (past this symbol)
              if (currElement.type == eElementType.type_end) {
                break;
              }
              if (currElement.type == eElementType.type_size) {
                // handle size override
                currSize = Number(currElement.value);
                currElement = this.getElement(); // moving on to next (past this symbol)
              } else if (currElement.type == eElementType.type_fvar) {
                // handle FVar...
              }
            } while (this.getCommaOrEndOfLine());
            continue;
          }
          // handle alignment
          // directive
          // if-condition
          // instruction
          // if inline check for end
          // file
          // block

          // eslint-disable-next-line no-constant-condition
        } while (true); // NEXT LINE...
        // eslint-disable-next-line no-constant-condition
      } while (true); // NEXT BLOCK...
    } while (++pass < 2);
  }

  private enterDatSymbol() {
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
          break;
        default:
          // [error_INTERNAL]
          throw new Error('[CODE] unexpected wordSize!');
      }
      if (this.hubMode) {
        value = BigInt(this.objImage.offset | 0xfff00000);
      } else {
        if ((this.cogOrg & 0x3) != 0) {
          // [error_csmbla]
          throw new Error('Cog symbol must be long-aligned');
        }
        // NOTE: cog address is bytes
        value = BigInt(this.objImage.offset | (this.cogOrg << (32 - 10)));
      }
      const newSymbol: iSymbol = { name: this.symbolName, type: type, value: value };
      this.recordSymbol(newSymbol);
    }
  }

  private incrementLocalScopeCounter() {
    this.asmLocal++;
    if (this.asmLocal > 9999) {
      // [error_loxdse]
      throw new Error('Limit of 10k DAT symbols exceeded');
    }
  }

  private isDatStorageType(element: SpinElement): boolean {
    let matchStatus: boolean = true;
    switch (element.type) {
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

  private checkLocalSymbol(element: SpinElement): [boolean, iSymbol] {
    let symbolFoundStatus: boolean = false;
    let symbolFound: iSymbol = { name: '', type: eElementType.type_undefined, value: 0n };
    if (element.type == eElementType.type_dot) {
      // using element as location info, get the symbol from the
      //  associated source code
      const nextElement: SpinElement = this.getElement();
      const symbolName = getSourceSymbol(this.context, nextElement);
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
    }
    return [symbolFoundStatus, symbolFound];
  }

  private findSymbol(name: string): iSymbol {
    let symbolFound: iSymbol = { name: '', type: eElementType.type_undefined, value: 0n };
    let containingTable: SymbolTable | undefined = undefined;
    if (this.autoSymbols.exists(name)) {
      containingTable = this.autoSymbols;
    } else if (this.levelSymbols.exists(name)) {
      containingTable = this.levelSymbols;
    } else if (this.mainSymbols.exists(name)) {
      containingTable = this.mainSymbols;
    } else if (this.localSymbols.exists(name)) {
      containingTable = this.localSymbols;
    } else if (this.inlineSymbols.exists(name)) {
      containingTable = this.localSymbols;
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
    switch (this.activeSymbolTable) {
      case eSymbolTableId.STI_MAIN:
        this.mainSymbols.add(newSymbol.name, newSymbol.type, newSymbol.value);
        break;
      case eSymbolTableId.STI_LOCAL:
        this.localSymbols.add(newSymbol.name, newSymbol.type, newSymbol.value);
        break;
      case eSymbolTableId.STI_INLINE:
        this.inlineSymbols.add(newSymbol.name, newSymbol.type, newSymbol.value);
        break;
      default:
        // [error_INTERNAL]
        throw new Error('[CODE] known table ID!');
        break;
    }
  }

  // TODO: upcoming: try spin2 constant expression
  private compile_con_blocks(resolve: eResolve, firstPass: boolean = false) {
    // compile all CON blocks in file
    this.elementIndex = 0; // reset to head of file

    // move past opening CON if we have one
    if (this.nextElementType() == eElementType.type_block && this.nextElementValue() == eValueType.block_con) {
      this.getElement(); // throw element away
    }
    // if the File is Empty we are done!
    if (this.nextElementType() == eElementType.type_end_file) {
      return;
    }

    do {
      // NEXT BLOCK
      // reset our enumeration
      let enumValid: boolean = true;
      let enumValue: bigint = 0n;
      let enumStep: bigint = 1n;

      do {
        // NEXT LINE

        do {
          // SAME LINE (process a line)
          let currElement: SpinElement = this.getElement();
          // do we have an enum declaration?
          if (currElement.type == eElementType.type_pound) {
            // Example: we are processing the left edge of an enumeration:  #0[4], name1, name2, name3[5], name4
            // initial value
            const result = this.getValue(eMode.BM_IntOnly, resolve);
            enumValid = false;
            if (result.isResolved) {
              // we have a value!
              enumValid = true;
              enumValue = result.value;
              enumStep = 1n;
            }
            // optional step size
            if (this.checkLeftBracket()) {
              const result = this.getValue(eMode.BM_IntOnly, resolve);
              if (result.isResolved) {
                enumStep = result.value;
              } else {
                enumValid = false;
              }
              this.getRightBracket();
            }
          } else if (currElement.type == eElementType.type_con || currElement.type == eElementType.type_con_float) {
            // Example: we are validating for symbol
            //   #0[4], name1, name2, name3[5], name4
            //   name = value, name = value, name = name = value, #0[4], name1, name2
            if (firstPass) {
              // [error_eaucnop]
              throw new Error('Expected a unique constant name or "#"');
            } else {
              const elementToVerify = currElement;

              currElement = this.getElement();
              if (currElement.type == eElementType.type_equal) {
                const result = this.getValue(eMode.BM_IntOrFloat, eResolve.BR_Must);
                // NOTE: if we don't get a value just leave we can't do anything yet...
                if (result.isResolved) {
                  // we have a value!
                  // record symbol value (do assign process)
                  this.verifySameValue(elementToVerify, result);
                }
              } else if (currElement.type == eElementType.type_leftb) {
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
                  this.verifySameValue(elementToVerify, symbolResult);
                }
              } else if (currElement.type == eElementType.type_comma || currElement.type == eElementType.type_end) {
                // preserve current enum value
                const symbolResult: iValueReturn = { value: enumValue, isResolved: true, isFloat: false };
                // step the enum
                enumValue += enumStep;
                // record symbol with current enum value (do assign process)
                this.verifySameValue(elementToVerify, symbolResult);
                this.backElement(); // so we can re-discover the comma or EOL at while()
              }
            }
          } else if (currElement.type == eElementType.type_undefined) {
            // we have a symbol!
            // Example: we are processing the {name} somewhere in:
            //   #0[4], name1, name2, name3[5], name4
            //   name = value, name = value, name = name = value, #0[4], name1, name2
            const symbolNameElement: SpinElement = currElement;
            currElement = this.getElement();
            if (currElement.type == eElementType.type_equal) {
              const result = this.getValue(eMode.BM_IntOrFloat, resolve);
              // NOTE: if we don't get a value just leave we can't do anything yet...
              if (result.isResolved) {
                // we have a value!
                // record symbol value (do assign process)
                this.recordSymbolValue(symbolNameElement.stringValue, result);
              }
            } else if (currElement.type == eElementType.type_leftb) {
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
                this.recordSymbolValue(symbolNameElement.stringValue, symbolResult);
              } else {
                // missing new step value... invalidate enum and bail
                enumValid = false;
              }
            } else if (currElement.type == eElementType.type_comma || currElement.type == eElementType.type_end) {
              this.backElement(); // so we can re-discover the comma or EOL at while()
              if (enumValid) {
                // preserve current enum value
                const symbolResult: iValueReturn = { value: enumValue, isResolved: true, isFloat: false };
                // step the enum
                enumValue += enumStep;
                // record symbol with current enum value (do assign process)
                this.recordSymbolValue(symbolNameElement.stringValue, symbolResult);
              }
            } else {
              // [error_eelcoeol]
              throw new Error('Expected "=" "[" "," or end of line');
            }
          } else if (currElement.type == eElementType.type_block) {
            // let our outermost loop decide if we should process this next block
            this.backElement();
            break;
          } else {
            // let's show some debug
            this.backElement(); // so we can re-discover the comma or EOL at while()
            currElement = this.getElement();
            this.logMessage(`EEEE: Element at fail: [${currElement.toString()}]`);
            // [error_eaucnop]
            throw new Error('Expected a unique constant name or "#"');
          }
        } while (this.getCommaOrEndOfLine());
        // if we hit end of file, we're done
        if (this.nextElementType() == eElementType.type_end_file) {
          break;
        }
      } while (this.nextElementType() != eElementType.type_block);
    } while (this.nextBlock(eValueType.block_con));
  }

  private verifySameValue(currentValue: SpinElement, expectedValue: iValueReturn) {
    const expectedType: eElementType = expectedValue.isFloat ? eElementType.type_con_float : eElementType.type_con;
    if (currentValue.type !== expectedType || currentValue.value !== expectedValue.value) {
      // [error_siad]
      throw new Error('Symbol is already defined');
    }
  }

  private recordSymbolValue(symbolName: string, symbolValue: iValueReturn) {
    // do assign process
    this.checkImportedParam(); //  checkParam - is parameter? substitute value
    const symbolType: eElementType = symbolValue.isFloat ? eElementType.type_con_float : eElementType.type_con;
    // write info to object pub/con list
    const interfaceType: number = symbolValue.isFloat ? 17 : 16;
    this.recordObjectConstant(symbolName, interfaceType, symbolValue.value);
    // record our symbol
    this.mainSymbols.add(symbolName, symbolType, symbolValue.value);
  }

  private checkImportedParam() {
    //  checkParam - is parameter? substitute value
  }

  private recordObjectConstant(name: string, type: number, value: bigint) {
    // add to this objects' public interface
  }

  private recordPub(name: string, resultCount: number, parameterCount: number) {
    // add to this objects' public interface
  }

  private verify(element: SpinElement, value: iValueReturn) {
    const desiredType = value.isFloat ? eElementType.type_con_float : eElementType.type_con;
    if (element.type != desiredType || element.value != value.value) {
      // [error_siad]
      throw new Error('Symbol is already defined');
    }
  }

  private nextBlock(blockType: eValueType): boolean {
    let foundStatus: boolean = false;
    let currElement: SpinElement;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      currElement = this.getElement();
      if (currElement.type == eElementType.type_block && Number(currElement.value) == blockType) {
        foundStatus = true;
        break;
      }
      if (currElement.type == eElementType.type_end_file) {
        break;
      }
    }
    if (foundStatus == true) {
      if (currElement.sourceCharacterOffset != 0) {
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
    this.mathMode = mode == eMode.BM_IntOnly ? eMathMode.MM_IntMode : eMathMode.MM_Unknown;
    this.numberStack.reset(); // empty our stack
    this.resolveExp(mode, resolve, this.lowestPrecedence);
    const value: bigint = this.numberStack.pop();
    return { value: value, isResolved: this.numberStack.isResolved, isFloat: this.isResultFloat() };
  }

  private isResultFloat(): boolean {
    // this brought to us by the compiler not allowing this one line to be in above routine
    const isFloat: boolean = this.mathMode == eMathMode.MM_FloatMode ? true : false;
    return isFloat;
  }

  public resolveExp(mode: eMode, resolve: eResolve, precedence: number) {
    // leaves answer on stack
    let currPrecedence: number = precedence;
    //this.logMessage(`resolveExp(${precedence}) - ENTRY`);
    if (--currPrecedence < 0) {
      // we need to resove the term!
      let currElement: SpinElement;

      // skip leading pluses
      do {
        currElement = this.getElement();
        if (currElement.isPlus) {
          this.logMessage(`* skipping + operator`);
        }
      } while (currElement.isPlus);
      this.logMessage(`* currElement=[${currElement.toString()}]`);

      // NOTE: we could move negation handling to here from within getConstant()

      // attempt to get a constant
      const resolution = this.getConstant(mode, resolve, currElement);
      if (resolution.foundConstant) {
        // we have a constant in hand
        // place it on our stack and we're done
        this.numberStack.push(resolution.value);
      } else {
        // no constant found, currElement is not a constant
        currElement = this.SubToNeg(currElement); // these did NOT affect the element list!
        currElement = this.FSubToFNeg(currElement);

        if (currElement.isUnary) {
          // our element is a unary operation
          this.checkDualModeOp(currElement); // (this IS in good place...)
          this.resolveExp(mode, resolve, currElement.precedence);
          // Perform Unary
          const aValue = this.numberStack.pop();
          let exprResult: bigint = 0n;
          if (this.numberStack.isUnresolved) {
            this.logMessage(`* SKIP Unary a=(${float32ToHexString(aValue)}), b=(0), op=[${eOperationType[currElement.operation]}]`);
          } else {
            this.logMessage(`* Perform Unary a=(${float32ToHexString(aValue)}), b=(0), op=[${eOperationType[currElement.operation]}]`);
            exprResult = this.resolveOperation(aValue, 0n, currElement.operation, this.mathMode == eMathMode.MM_FloatMode);
          }
          this.logMessage(`* Push result=(${float32ToHexString(exprResult)})`);
          this.numberStack.push(exprResult);
        } else if (currElement.type == eElementType.type_left) {
          this.resolveExp(mode, resolve, this.lowestPrecedence);
          this.getRightParen();
        } else {
          // [error_eacuool]
          throw new Error('Expected a constant, unary operator, or "("');
        }
      }
    } else {
      // precendence is NOT zero (> 0)
      this.resolveExp(mode, resolve, currPrecedence);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const nextElement = this.getElement();
        if (nextElement.isTernary) {
          // we have '?' op
          this.logMessage(`* Have op ternary`);
          if (currPrecedence == nextElement.precedence) {
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
                `* SKIP Ternary F=(${falseValue}), T=(${trueValue}), decision=(${decisionValue}), op=[${eOperationType[nextElement.operation]}]`
              );
            } else {
              this.logMessage(
                `* Perform Ternary F=(${falseValue}), T=(${trueValue}), decision=(${decisionValue}), op=[${eOperationType[nextElement.operation]}]`
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
        } else if (nextElement.isBinary) {
          // we have binary operator
          this.checkDualModeOp(nextElement); // NOTE: maybe this moves down below exit?
          if (nextElement.precedence == currPrecedence) {
            // Perform Binary
            this.resolveExp(mode, resolve, currPrecedence); // push rhs value
            // TODO: this needs to perform binary
            const bValue = this.numberStack.pop();
            const aValue = this.numberStack.pop();
            let exprResult: bigint = 0n;
            if (this.numberStack.isUnresolved) {
              this.logMessage(
                `* SKIP Binary a=(${float32ToHexString(aValue)}), b=(${float32ToHexString(bValue)}), op=[${eOperationType[nextElement.operation]}]`
              );
            } else {
              this.logMessage(
                `* Perform Binary a=(${float32ToHexString(aValue)}), b=(${float32ToHexString(bValue)}), op=[${eOperationType[nextElement.operation]}]`
              );
              exprResult = this.resolveOperation(aValue, bValue, nextElement.operation, this.mathMode == eMathMode.MM_FloatMode);
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
    //this.logMessage(`resolveExp(${precedence}) - EXIT`);
  }

  private checkDualModeOp(element: SpinElement) {
    // [preview_op]
    if (element.isFloatCompatible == false) {
      if (this.mathMode == eMathMode.MM_FloatMode) {
        // [error_ionaifpe]
        throw new Error('Integer operator not allowed in floating-point expression');
      }
      this.mathMode = eMathMode.MM_IntMode;
      this.logMessage(`* mathMode = Int`);
    }
  }

  private getConstant(mode: eMode, resolve: eResolve, element: SpinElement): iConstantReturn {
    let currElement = element;
    const resultStatus: iConstantReturn = { value: 0n, foundConstant: true };
    // this 'check_constant', now 'try_constant' in Pnut
    // trying to resolve spin2 constant

    // replace our currElement with an oc_neg [sub-to-neg] if it was sub!
    currElement = this.SubToNeg(currElement);
    if (currElement.operation == eOperationType.op_neg) {
      // if the next element is a constant we can negate it
      const nextElement = this.getElement();
      this.logMessage(`* nextElement=[${nextElement.toString()}]`);
      if (nextElement.isConstantInt) {
        // coerce element to negative value
        resultStatus.value = (~nextElement.value + 1n) & BigInt(0xffffffff);
        this.checkIntMode(); // throw if we were float
        // if not set then set else
        // TODO: do we need to remove '-' from element list
      } else if (nextElement.isConstantFloat) {
        // coerce element to negative value
        // NOTE: ~~ this coerces the value to be a number
        resultStatus.value = BigInt(nextElement.value) ^ BigInt(0x80000000);
        this.checkFloatMode(); // throw if we were int
        // if not set then set else
        // TODO: do we need to remove '-' from element list
      } else {
        this.backElement(); // leave the constant
        resultStatus.foundConstant = false;
      }
    } else {
      // what else is our minus sign preceeding
      if (currElement.isConstantInt) {
        resultStatus.value = BigInt(currElement.value);
        this.checkIntMode();
      } else if (currElement.isConstantFloat) {
        resultStatus.value = BigInt(currElement.value);
        this.checkFloatMode();
      } else if (currElement.type == eElementType.type_float) {
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
      } else if (currElement.type == eElementType.type_trunc || currElement.type == eElementType.type_round) {
        // have TRUNC() or ROUND()
        // TODO: determine if we care about overflow checking... because we don't do any here
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
        if (currElement.type == eElementType.type_trunc) {
          // truncate our float value
          const truncatedUInt32 = Math.trunc(float64Value) & 0xffffffff;
          // return the converted result
          resultStatus.value = BigInt(truncatedUInt32);
        } else if (currElement.type == eElementType.type_round) {
          // truncate our float value
          const roundedUInt32 = Math.round(float64Value) & 0xffffffff;
          // return the converted result
          resultStatus.value = BigInt(roundedUInt32);
        }
      } else if (currElement.type == eElementType.type_undefined) {
        this.numberStack.setUnresolved();
        if (resolve == eResolve.BR_Must) {
          // [error_us]
          throw new Error(`Undefined symbol`);
        }
      } else {
        resultStatus.foundConstant = false;
      }
    }

    return resultStatus;
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

  private checkInc(): boolean {
    return this.checkElementType(eElementType.type_inc);
  }

  private checkDec(): boolean {
    return this.checkElementType(eElementType.type_dec);
  }

  private checkBackslash(): boolean {
    return this.checkElementType(eElementType.type_back);
  }

  private checkTick(): boolean {
    return this.checkElementType(eElementType.type_tick);
  }

  private checkEndOfLine(): boolean {
    return this.checkElementType(eElementType.type_end);
  }

  private checkElementType(type: eElementType): boolean {
    let foundStatus: boolean = false;
    let currElement = this.getElement();
    if (currElement.type == type) {
      foundStatus = true;
    } else {
      this.backElement();
    }
    return foundStatus;
  }

  private getCommaOrEndOfLine(): boolean {
    let foundCommaStatus: boolean = false;
    let currElement = this.getElement();
    if (currElement.type == eElementType.type_comma) {
      foundCommaStatus = true;
    } else if (currElement.type != eElementType.type_end) {
      // [error_ecoeol]
      throw new Error('Expected "," or end of line');
    }
    return foundCommaStatus;
  }

  private getCommaOrRightParen(): boolean {
    let foundCommaStatus: boolean = false;
    let currElement = this.getElement();
    if (currElement.type == eElementType.type_comma) {
      foundCommaStatus = true;
    } else if (currElement.type != eElementType.type_right) {
      // [error_ecor]
      throw new Error('Expected "," or ")"');
    }
    return foundCommaStatus;
  }

  // more here!!

  private getLeftParen() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_left) {
      // [error_eleft]
      throw new Error('Expected "("');
    }
  }

  private getRightParen() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_right) {
      // [error_eright]
      throw new Error('Expected ")"');
    }
  }

  private getLeftBracket() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_leftb) {
      // [error_eleftb]
      throw new Error('Expected "["');
    }
  }

  private getRightBracket() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_rightb) {
      // [error_erightb]
      throw new Error('Expected "]"');
    }
  }

  private getComma() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_comma) {
      // [error_ecomma]
      throw new Error('Expected ","');
    }
  }
  private getPound() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_pound) {
      // [error_epound]
      throw new Error('Expected "#"');
    }
  }
  private getEqual() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_equal) {
      // [error_eequal]
      throw new Error('Expected "="');
    }
  }

  private getColon() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_colon) {
      // [error_ecolon]
      throw new Error('Expected ":"');
    }
  }

  private getDot() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_dot) {
      // [error_edot]
      throw new Error('Expected "."');
    }
  }

  private getDotDot() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_dotdot) {
      // [error_edotdot]
      throw new Error('Expected ".."');
    }
  }

  private getAssign() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_assign) {
      // [error_eassign]
      throw new Error('Expected ":="');
    }
  }

  private getSize() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_size) {
      // [error_ebwl]
      throw new Error('Expected BYTE/WORD/LONG');
    }
  }

  private getFrom() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_from) {
      // [error_efrom]
      throw new Error('Expected FROM');
    }
  }

  private getTo() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_to) {
      // [error_eto]
      throw new Error('Expected TO');
    }
  }

  private getWith() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_with) {
      // [error_ewith]
      throw new Error('Expected WITH');
    }
  }

  private getEndOfLine() {
    const nextElement = this.getElement();
    if (nextElement.type != eElementType.type_end) {
      // [error_eeol]
      throw new Error('Expected end of line');
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

  private SubToNeg(element: SpinElement): SpinElement {
    // replace our element with a better element
    let currElement: SpinElement = element;
    if (currElement.operation == eOperationType.op_sub) {
      // replace our currElement with an oc_neg [sub-to-neg]
      currElement = new SpinElement(
        currElement.fileId,
        eElementType.type_op,
        BigInt(this.spinSymbolTables.opcodeValue(eOpcode.oc_neg)) & BigInt(0xffffffff),
        currElement.sourceLineIndex,
        currElement.sourceCharacterOffset
      );
    }
    return currElement;
  }

  private FSubToFNeg(element: SpinElement): SpinElement {
    // replace our element with a better element
    let currElement: SpinElement = element;
    if (currElement.operation == eOperationType.op_fsub) {
      // replace our currElement with an oc_fneg [fsub-to-fneg]
      currElement = new SpinElement(
        currElement.fileId,
        eElementType.type_op,
        BigInt(this.spinSymbolTables.opcodeValue(eOpcode.oc_fneg)) & BigInt(0xffffffff),
        currElement.sourceLineIndex,
        currElement.sourceCharacterOffset
      );
    }
    return currElement;
  }

  private nextElementType(): eElementType {
    const currElement = this.spinElements[this.elementIndex];
    return currElement.type;
  }

  private nextElementValue(): eValueType {
    const currElement = this.spinElements[this.elementIndex];
    return currElement.numberValue;
  }

  private getElement(): SpinElement {
    //this.logMessage(`* Element Index=(${this.elementIndex + 1})`);
    if (this.spinElements.length == 0) {
      throw new Error(`NO Elements`);
    }
    let currElement = this.spinElements[this.elementIndex];
    // if we reach end, stay on this element forever
    if (currElement.type != eElementType.type_end_file) {
      if (this.elementIndex > this.spinElements.length - 1) {
        throw new Error(`Off end of Element List`);
      }
      this.elementIndex++;
    }

    // if the symbol exists, return it instead of undefined
    if (currElement.type === eElementType.type_undefined) {
      const foundSymbol = this.mainSymbols.get(currElement.stringValue);
      if (foundSymbol !== undefined) {
        currElement = new SpinElement(
          currElement.fileId,
          foundSymbol.type,
          foundSymbol.value,
          currElement.sourceLineIndex,
          currElement.sourceCharacterOffset
        );
      }
    }
    return currElement;
  }

  private backElement(): void {
    //this.logMessage(`* Element Index=(${this.elementIndex - 1})`);
    this.elementIndex--;
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
      `resolver(${float32ToHexString(parmA)}, ${float32ToHexString(parmB)}) ${eOperationType[operation]} isFloat=(${isFloatInConBlock})`
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
        // invert our 32bits
        a ^= mask32Bit;
        break;
      case eOperationType.op_neg: //  -	(uses op_sub sym)
        if (isFloatInConBlock) {
          // our 32bit float  signbit in msb, 8 exponent bits, 23 mantissa bits
          a ^= msb32Bit;
        } else {
          a = ((a ^ mask32Bit) + 1n) & mask32Bit;
        }
        break;
      case eOperationType.op_fneg: // -.	(uses op_fsub sym)
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
        if (a) {
          a = BigInt(Math.trunc(Math.log2(Number(a)) * Math.pow(2, 27)));
        }
        break;

      case eOperationType.op_qexp: //  QEXP
        // WARNING this result MAY cause binary differences in our output file! WARNING
        //  consider this code if we see problems in our regression tests
        //  it's all a matter of precision...
        a = BigInt(Math.trunc(Math.pow(2, Number(a) / Math.pow(2, 27)))); // trunc ..E9, round ..EA (Chip gets E8!) a=0xFFFFFFFF
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
              throw new Error(`Divide by zero`);
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
          throw new Error(`Divide by zero`);
        }
        a /= b;
        break;

      case eOperationType.op_rem: //  //
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
        }
        a = this.signExtendFrom32Bit(a) % this.signExtendFrom32Bit(b) & mask32Bit;
        break;

      case eOperationType.op_remu: //  +//
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
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
          throw new Error(`Divide by zero`);
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
        // [error_MINE]
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
