/** @format */
'use strict';

// src/classes/parseUtils.ts

import { eElementType, getElementTypeString } from './types';
import { toFloatString } from '../utils/float32';

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

  get isConstant(): boolean {
    return this._type == eElementType.type_con;
  }

  get isOperation(): boolean {
    return this._type == eElementType.type_op;
  }

  get isMidStringComma(): boolean {
    return this._type == eElementType.type_comma && this._midStringComma == true;
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
      valueInterp = `(${toFloatString(this.value)})`;
    } else if (this.valueIsNumber) {
      if (this.isOperation) {
        valueInterp = `(0x${this.value.toString(16)})`;
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
}
