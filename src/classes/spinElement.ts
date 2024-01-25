/** @format */
'use strict';

// src/classes/parseUtils.ts

import { eElementType, getElementTypeString } from './types';

// a collection of generally useful functions for parsing spin

export class SpinElement {
  private _sourceLineIndex: number = 0;
  private _sourceCharacterOffset: number = 0;
  private _value: number | string = 0;
  private _type: eElementType = eElementType.type_undefined;
  public midStringComma: boolean = false; // valid only if type_comma

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

  get sourceCharacterOffset(): number {
    return this._sourceCharacterOffset;
  }

  get isMidStringComma(): boolean {
    return this._type == eElementType.type_comma && this.midStringComma == true;
  }

  get isEndOfFile(): boolean {
    return this.type == eElementType.type_end_file;
  }

  public toString(): string {
    return '';
  }

  public typeString(): string {
    return getElementTypeString(this._type);
  }
}
