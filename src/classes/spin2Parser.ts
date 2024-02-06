/* eslint-disable @typescript-eslint/no-unused-vars */
// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';

import { Context } from '../utils/context';
import { SpinDocument } from './spinDocument';
//import { SymbolTable } from './symbolTable';
import { SpinElementizer } from './spinElementizer';
import { SpinElement } from './spinElement';
import { RegressionReporter } from './regression';
import { eElementType, eOperationType } from './types';
import { SpinSymbolTables, eOpcode } from './parseUtils';
import { NumberStack } from './numberStack';
import { bigIntFloat32ToNumber, numberToBigIntFloat32 } from '../utils/float32';

// src/classes/spin2Parser.ts

// Internal types used for passing complex values
interface iResolveReturn {
  value: number;
  isResolved: boolean;
}

enum eMathMode {
  MM_Unknown,
  MM_FloatMode,
  MM_IntMode
}

export class Spin2Parser {
  private context: Context;
  private isLogging: boolean = false;
  private srcFile: SpinDocument;
  private elementizer: SpinElementizer;
  private spinSymbolTables: SpinSymbolTables;
  // private symbols_debug_hash_auto: SymbolTable = new SymbolTable();
  // private symbols_debug_hash_name: SymbolTable = new SymbolTable();
  // private symbols_hash_auto: SymbolTable = new SymbolTable();
  // private symbols_hash_level: SymbolTable = new SymbolTable();
  // private symbols_hash_param: SymbolTable = new SymbolTable();
  // private symbols_hash_main: SymbolTable = new SymbolTable();
  // private symbols_hash_local: SymbolTable = new SymbolTable();
  // private symbols_hash_inline: SymbolTable = new SymbolTable();

  // data from our elemtizer and navigation variables
  private element_list: SpinElement[] = [];
  private curr_element: number = 0;
  // parser state
  private mathMode: eMathMode = eMathMode.MM_Unknown;
  private mustResolve: boolean = false;
  private onlyIntAllowed: boolean = false;
  //
  private numberStack: NumberStack = new NumberStack();

  constructor(ctx: Context, spinCode: SpinDocument) {
    this.context = ctx;
    this.srcFile = spinCode;
    this.elementizer = new SpinElementizer(ctx, spinCode);
    this.spinSymbolTables = new SpinSymbolTables(ctx);
    this.isLogging = this.context.logOptions.logParser;
    this.logMessage(`* Parser is logging`);
  }

  get sourceLineNumber(): number {
    return this.elementizer.sourceLineNumber;
  }

  public testResolver() {
    // our list is in
    const element_list: SpinElement[] = this.element_list;

    // WE ARE HERE!
  }

  private resolveExp(precedence: number): boolean {
    // leaves answer on stack
    let currPrecedence: number = precedence;
    if (--currPrecedence < 0) {
      // we need to resove the term.
      let currElement: SpinElement;
      // skip leading pluses
      do {
        currElement = this.getElement();
      } while (currElement.isPlus);

      const resolution = this.tryConstant(currElement);
      if (resolution.isResolved == false) {
        // more here
      }
    }
    // returns indication of ...
    return false;
  }

  private tryConstant(element: SpinElement): iResolveReturn {
    let currElement = element;
    const resultStatus: iResolveReturn = { value: 0, isResolved: false };
    // this 'check_constant', now 'try_constant' in Pnut
    // trying to resolve spin2 constant

    // replace our currElement with an oc_neg [sub-to-neg] if it was sub!
    currElement = this.SubToNeg(currElement);
    if (currElement.operation == eOperationType.op_neg) {
      // if the next element is a constant we can negate it
      const nextElement = this.getElement();
      if (nextElement.isConstantInt) {
        // coerce element to negative value
        resultStatus.value = ((Number(nextElement.value) ^ 0xffffffff) + 1) & 0xffffffff;
        resultStatus.isResolved = true;
        this.checkIntMode(); // throw if we were float
        // if not set then set else
      } else if (nextElement.isConstantFloat) {
        // coerce element to negative value
        resultStatus.value = Number(nextElement.value) ^ 0x80000000;
        resultStatus.isResolved = true;
        this.checkFloatMode(); // throw if we were int
        // if not set then set else
      } else {
        this.backElement(); // leave the constant
      }
      if (resultStatus.isResolved) {
        // TODO: do we need this? remove '-' from element list
      }
    } else {
      // what else is our minus sign preceeding
      if (currElement.isConstantInt) {
        resultStatus.value = Number(currElement.value);
        resultStatus.isResolved = true;
        this.checkIntMode();
      } else if (currElement.isConstantFloat) {
        resultStatus.value = Number(currElement.value);
        resultStatus.isResolved = true;
        this.checkFloatMode();
      } else if (currElement.type == eElementType.type_float) {
        // have FLOAT()
        this.checkFloatMode();
        this.getLeftParen();
        this.mathMode = eMathMode.MM_IntMode;
        this.resolveExp(this.spinSymbolTables.ternaryPrecedence + 1); // places result on stack
        this.mathMode = eMathMode.MM_FloatMode;
        this.getRightParen();
        const intValue = this.numberStack.pop(); // get result
        // convert uint32 to float
        const floatValue = Number(numberToBigIntFloat32(intValue));
        // return the converted result
        resultStatus.value = floatValue;
        resultStatus.isResolved = true;
      } else if (currElement.type == eElementType.type_trunc) {
        // have TRUNC()
        // TODO: determine if we care about overflow checking... because we don't do any here
        this.checkIntMode();
        this.getLeftParen();
        this.mathMode = eMathMode.MM_FloatMode;
        this.resolveExp(this.spinSymbolTables.ternaryPrecedence + 1); // places result on stack
        this.mathMode = eMathMode.MM_IntMode;
        this.getRightParen();
        const float32Value = this.numberStack.pop(); // get result
        // convert uint32 to float
        const exponent = float32Value & 0x7f800000;
        const float64Value = Number(bigIntFloat32ToNumber(BigInt(float32Value)));
        // truncate our float value
        const truncatedUInt32 = Math.trunc(float64Value) & 0xffffffff;
        // return the converted result
        resultStatus.value = truncatedUInt32;
        resultStatus.isResolved = true;
      } else if (currElement.type == eElementType.type_round) {
        // have ROUND()
        // TODO: determine if we care about overflow checking... because we don't do any here
        this.checkIntMode();
        this.getLeftParen();
        this.mathMode = eMathMode.MM_FloatMode;
        this.resolveExp(this.spinSymbolTables.ternaryPrecedence + 1); // places result on stack
        this.mathMode = eMathMode.MM_IntMode;
        this.getRightParen();
        const float32Value = this.numberStack.pop(); // get result
        // convert uint32 to float
        const float64Value = Number(bigIntFloat32ToNumber(BigInt(float32Value)));
        // truncate our float value
        const roundedUInt32 = Math.round(float64Value) & 0xffffffff;
        // return the converted result
        resultStatus.value = roundedUInt32;
        resultStatus.isResolved = true;
      }
    }

    return resultStatus;
  }

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

  private checkFloatMode() {
    if (this.mathMode == eMathMode.MM_IntMode) {
      // [error_fpnaiie]
      throw new Error('Floating-point not allowed in integer expression');
    } else {
      this.mathMode = eMathMode.MM_FloatMode;
    }
  }

  private checkIntMode() {
    if (this.mathMode == eMathMode.MM_IntMode) {
      // [error_inaifpe]
      throw new Error('Integer not allowed in floating-point expression');
    } else {
      this.mathMode = eMathMode.MM_IntMode;
    }
  }

  private SubToNeg(element: SpinElement): SpinElement {
    // replace our element with a better element
    let currElement: SpinElement = element;
    if (currElement.operation == eOperationType.op_sub) {
      // replace our currElement with an oc_neg [sub-to-neg]
      currElement = new SpinElement(
        eElementType.type_op,
        this.spinSymbolTables.opcodeValue(eOpcode.oc_neg),
        currElement.sourceLineIndex,
        currElement.sourceCharacterOffset
      );
    }
    return currElement;
  }

  private getElement(): SpinElement {
    return this.element_list[this.curr_element++];
  }

  private backElement(): void {
    this.curr_element--;
  }

  public testGetElementLoop() {
    // store the value(s) in list
    const element_list: SpinElement[] = this.elementizer.getFileElements();

    // now loop thru elements found
    this.logMessage(''); // blank line
    this.logMessage('// ---------------------------------------');
    this.logMessage(`- displaying ${element_list.length} entries`);
    let currSourceLine: number = -1;
    for (let index = 0; index < element_list.length; index++) {
      const element = element_list[index];
      if (element.sourceLineIndex != currSourceLine) {
        const sourceLine: string = this.srcFile.lineAt(element.sourceLineIndex).text;
        this.logMessage(`  -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) [${sourceLine}]`);
        currSourceLine = element.sourceLineIndex;
      }
      const elemTypeStr: string = element.typeString();
      const flagInterp: string = element.isMidStringComma ? `, midString` : '';
      const valueInterp: string = element.valueString().length != 0 ? `, ${element.valueString()}` : '';
      this.logMessage(
        ` (${index + 1}) -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) ${elemTypeStr}${valueInterp}${flagInterp}`
      );
    }
    this.logMessage('\\ ---------------------------------------');
    this.logMessage(''); // blank line

    // if regression reporting enabled then generate the report
    if (this.context.reportOptions.writeElementsReport) {
      const reporter: RegressionReporter = new RegressionReporter(this.context);
      reporter.writeElementReport(this.srcFile.dirName, this.srcFile.fileName, element_list);
    }

    this.element_list = element_list;
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
    return false;
  }

  private reset_element(): void {}

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
