/** @format */
'use strict';

// src/classes/parseUtils.ts

import { eElementType, eOperationType, getElementTypeString } from './types';
import { float32ToString } from '../utils/float32';

// a collection of generally useful functions for parsing spin

export class SpinElement {
  private _sourceLineIndex: number = 0;
  private _sourceCharacterOffset: number = 0;
  private _value: number | string = '';
  private _type: eElementType = eElementType.type_undefined;
  private _midStringComma: boolean = false; // valid only if type_comma

  constructor(type: eElementType, value: number | string, lineIndex: number, charIndex: number) {
    this._type = type;
    this._value = value;
    this._sourceLineIndex = lineIndex;
    this._sourceCharacterOffset = charIndex;
  }

  get type(): eElementType {
    return this._type;
  }

  get value(): string | number {
    return this._value;
  }

  get sourceLineIndex(): number {
    return this._sourceLineIndex;
  }

  get sourceLineNumber(): number {
    return this._sourceLineIndex + 1;
  }

  get sourceCharacterOffset(): number {
    return this._sourceCharacterOffset;
  }

  get isLineEnd(): boolean {
    return this._type == eElementType.type_end;
  }

  get valueIsNumber(): boolean {
    return typeof this._value === 'number';
  }

  get valueIsString(): boolean {
    return typeof this._value === 'string';
  }

  get isConstantFloat(): boolean {
    return this._type == eElementType.type_con_float;
  }

  get isConstantInt(): boolean {
    return this._type == eElementType.type_con;
  }

  get isOperation(): boolean {
    return this._type == eElementType.type_op;
  }

  get isMidStringComma(): boolean {
    return this._type == eElementType.type_comma && this._midStringComma == true;
  }
  get isPlus(): boolean {
    return this._type == eElementType.type_op && (this.operation == eOperationType.op_add || this.operation == eOperationType.op_fadd);
  }

  get isSub(): boolean {
    return this._type == eElementType.type_op && this.operation == eOperationType.op_sub;
  }

  public operationString(): string {
    return eOperationType[this.operation];
  }

  //
  // special for type_op: elements
  //
  get operation(): number {
    // returns the op_* value
    let desiredValue: number = 0;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v1 parm (v1 << 0) 8 bits
      desiredValue = this._value & 0xff; // 8 ls-bits
    }
    return desiredValue;
  }

  get precedence(): number {
    // returns the op_* value
    let desiredValue: number = 0;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v2 parm (v2 << 8) 8 bits
      desiredValue = (this._value >> 8) & 0xff; // 8 ls-bits after shift
    }
    return desiredValue;
  }

  get bytecode(): number {
    // returns the op_* value
    let desiredValue: number = 0;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v3 parm (v3 << 16) 8 bits
      desiredValue = (this._value >> 16) & 0xff; // 8 ls-bits after shift
    }
    return desiredValue;
  }

  get isTernary(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v4 parm (v4 << 24)
      status = this._value & (1 << 24) ? true : false;
    }
    return status;
  }

  get isBinary(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v5 parm (v5 << 25)
      status = this._value & (1 << 25) ? true : false;
    }
    return status;
  }

  get isUnary(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v6 parm (v6 << 26)
      status = this._value & (1 << 26) ? true : false;
    }
    return status;
  }

  get isAssign(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v7 parm (v7 << 27)
      status = this._value & (1 << 27) ? true : false;
    }
    return status;
  }

  get isFloat(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v8 parm (v8 << 28)
      status = this._value & (1 << 28) ? true : false;
    }
    return status;
  }

  get isAlias(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v9 parm (v9 << 29)
      status = this._value & (1 << 29) ? true : false;
    }
    return status;
  }

  get isHubcode(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'number') {
      // macro v10 parm (v10 << 30)
      status = this._value & (1 << 30) ? true : false;
    }
    return status;
  }

  set midStringComma(enable: boolean) {
    if (this._type == eElementType.type_comma) {
      this._midStringComma = enable;
    }
  }

  get isEndOfLine(): boolean {
    return this.type == eElementType.type_end;
  }

  get isEndOfFile(): boolean {
    return this.type == eElementType.type_end_file;
  }

  public valueString(): string {
    let valueInterp: string = `${this.value}`;
    if (this.isEndOfLine) {
      valueInterp = '';
    } else if (this.isConstantFloat) {
      valueInterp = `(${float32ToString(this.value)})`;
    } else if (this.valueIsNumber) {
      if (this.isOperation) {
        valueInterp = `(0x${this.value.toString(16).toUpperCase()})`;
      } else {
        valueInterp = `(${this.value})`;
      }
    } else if (this.valueIsString) {
      if (this.value !== '') {
        valueInterp = `"${this.value}"`;
      }
    }
    return valueInterp;
  }

  public typeString(): string {
    return getElementTypeString(this._type);
  }

  public toString(): string {
    const elemTypeStr: string = this.typeString();
    const flagInterp: string = this.isMidStringComma ? `, midString` : '';
    const valueInterp: string = this.valueString().length != 0 ? `, ${this.valueString()}` : '';
    const opInterp: string = this.isOperation ? ` ${this.operationString()}` : '';
    return `e:Ln#${this.sourceLineNumber}(${this.sourceCharacterOffset}) ${elemTypeStr}${valueInterp}${flagInterp}${opInterp}`;
  }
}
