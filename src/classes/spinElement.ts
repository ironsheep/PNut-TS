/** @format */
'use strict';

import { float32ToHexString } from '../utils/float32';
import { hexByte } from '../utils/formatUtils';
// src/classes/parseUtils.ts

import { eBlockType, eByteCode, eElementType, eOperationType, eValueType } from './types';
//import { float32ToString } from '../utils/float32';

// a collection of generally useful functions for parsing spin

export class SpinElement {
  private readonly NOTSET: number = -1;
  private _sourceLineIndex: number = 0;
  private _sourceCharacterOffset: number = 0;
  private _overrideLineIndex: number = this.NOTSET;
  private _overrideCharacterOffset: number = this.NOTSET;
  private _expandedColumn: number = 0; // expanded using tabstop=8, 1 based counting: column=[1,n], 0=NOT SET
  private _overrideExpandedColumn: number = this.NOTSET;
  private _fileId: number;
  private _value: bigint | string = '';
  private _type: eElementType = eElementType.type_undefined;
  private _midStringComma: boolean = false; // valid only if type_comma
  private _isSymbol: boolean = false; // valid when element refers to symbol in source code
  private _symbolLength: number = 0; // valid only when _isSymbol is true
  private _isObjectReference: boolean = false; // valid only when ...

  constructor(fileID: number, type: eElementType, value: bigint | string, lineIndex: number, charIndex: number, copy?: SpinElement) {
    if (copy) {
      this._fileId = copy._fileId;
      this._type = copy._type;
      this._value = copy._value;
      this._sourceLineIndex = copy._sourceLineIndex;
      this._sourceCharacterOffset = copy._sourceCharacterOffset;
      this._expandedColumn = copy._expandedColumn;
      this._midStringComma = copy._midStringComma; // valid only if type_comma
      this._isSymbol = copy._isSymbol; // valid when element referrs to symbol in source code
      this._symbolLength = copy._symbolLength; // valid only when _isSymbol is true
      this._isObjectReference = copy._isObjectReference; // valid only when _isSymbol is true
    } else {
      // if not copy constructor then load these five specifically
      this._fileId = fileID;
      this._type = type;
      this._value = value;
      this._sourceLineIndex = lineIndex;
      this._sourceCharacterOffset = charIndex;
      this._expandedColumn = 0; // we need to pass this in or set late
    }
  }

  get fileId(): number {
    // return the unique ID of the file from which this element was created
    return this._fileId;
  }

  get refersToSymbol(): boolean {
    /// this IS isSymbol()!!
    // Return T/F where T means this element refers to a symbol found in source code
    return this._isSymbol;
  }

  // elementizer USE!
  public setSourceColumnOffset(countLeftWhiteColumns: number) {
    this._expandedColumn = countLeftWhiteColumns;
  }

  // elementizer USE!
  public setAlternateSourceSourceOffsets(charOffset: number, columnOffset: number) {
    this._overrideCharacterOffset = charOffset;
    this._overrideExpandedColumn = columnOffset;
  }

  public setAlternateSourceLocation(lineNbr: number, charOffset: number, expandedColumn: number) {
    // use by getElementObj() to spoof element locations
    this._overrideLineIndex = lineNbr;
    this._overrideCharacterOffset = charOffset;
    this._overrideExpandedColumn = expandedColumn;
  }

  get haveSourceLineOverride(): boolean {
    return this._overrideLineIndex != this.NOTSET && this._sourceLineIndex != this._overrideLineIndex;
  }

  get haveSourceCharacterOffsetOverride(): boolean {
    return this._overrideCharacterOffset != this.NOTSET && this._sourceCharacterOffset != this._overrideCharacterOffset;
  }

  get haveSourceExpandedColumnOverride(): boolean {
    return this._overrideExpandedColumn != this.NOTSET && this._expandedColumn != this._overrideExpandedColumn;
  }

  public setPartOfObjReference(value: boolean) {
    this._isObjectReference = value;
  }

  get isPartOfObjReference(): boolean {
    return this._isObjectReference;
  }

  get sourceCharacterEndOffset(): number {
    return this._sourceCharacterOffset + this._symbolLength - 1;
  }

  get type(): eElementType {
    return this._type;
  }

  get value(): string | bigint {
    let tempValue: bigint;
    if (typeof this._value === 'string' && this._value.length == 1) {
      tempValue = BigInt(this._value.charCodeAt(0));
    } else if (typeof this._value === 'string') {
      return this._value;
    } else {
      tempValue = this._value;
    }
    return tempValue;
  }

  public setType(newType: eElementType) {
    // override type
    this._type = newType;
  }

  public setValue(newValue: string | bigint) {
    // override value
    this._value = newValue;
  }

  public negateBigIntValue(): bigint {
    // negate our 32bit value in-place!
    this._value = ((this.bigintValue ^ BigInt(0xffffffff)) + 1n) & BigInt(0xffffffff);
    return this._value;
  }

  get stringValue(): string {
    let returnedValue: string = '';
    if (typeof this._value === 'string') {
      returnedValue = this._value;
    }
    return returnedValue;
  }

  get bigintValue(): bigint {
    let returnedValue: bigint = 0n;
    if (typeof this._value === 'bigint') {
      returnedValue = this._value;
    } else if (typeof this._value === 'string' && this._value.length == 1) {
      returnedValue = BigInt(this._value.charCodeAt(0));
    }
    return returnedValue;
  }

  get numberValue(): number {
    let returnedValue: number = 0;
    if (typeof this._value === 'bigint') {
      returnedValue = Number(this._value);
    } else if (typeof this._value === 'string' && this._value.length == 1) {
      returnedValue = this._value.charCodeAt(0);
    }
    return returnedValue;
  }

  get sourceLineIndex(): number {
    // if we have override, return it instead
    // can be spoofed due to getElementObj() need
    return this._overrideLineIndex != this.NOTSET ? this._overrideLineIndex : this._sourceLineIndex;
  }

  get sourceLineNumber(): number {
    // can be spoofed due to getElementObj() need
    return this.sourceLineIndex + 1;
  }

  get sourceCharacterOffset(): number {
    // can be spoofed due to getElementObj() need
    // if we have override, return it instead
    return this._overrideCharacterOffset != this.NOTSET ? this._overrideCharacterOffset : this._sourceCharacterOffset;
  }

  get sourceColumnOffset(): number {
    // used by SpinResolver.getColumn()
    // can be spoofed due to getElementObj() need
    // if we have override, return it instead
    return this._overrideExpandedColumn != this.NOTSET ? this._overrideExpandedColumn : this._expandedColumn;
  }

  get valueIsNumber(): boolean {
    return typeof this._value === 'bigint';
  }

  get valueIsString(): boolean {
    return typeof this._value === 'string';
  }

  get isLineEnd(): boolean {
    return this._type == eElementType.type_end;
  }

  get isTypeUndefined(): boolean {
    return this._type == eElementType.type_undefined;
  }

  get isSymbol(): boolean {
    // Same answer as refersToSymbol, which is the accessor the compiler calls; this one is kept as the
    // named counterpart of PNut's [symbol_flag] (p2com.asm:4145, 8412, 8708).
    // PNut uses a [symbol_flag] set to zero or one and DOES NOT distinguish between built-in or not
    return this._isSymbol;
  }

  get isConstantFloat(): boolean {
    return this._type == eElementType.type_con_float;
  }

  get isConstantInt(): boolean {
    return this._type == eElementType.type_con_int;
  }

  get isCaret(): boolean {
    return this._type == eElementType.type_op && this.operation == eOperationType.op_bitxor;
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

  get isLogNot(): boolean {
    return this._type == eElementType.type_op && this.operation == eOperationType.op_lognot;
  }

  get isBitNot(): boolean {
    return this._type == eElementType.type_op && this.operation == eOperationType.op_bitnot;
  }

  public operationString(): string {
    return eOperationType[this.operation] !== undefined ? eOperationType[this.operation] : '{OP-NOT-FOUND}';
  }

  //
  // special for type_i_flex: elements
  //
  get flexByteCode(): eByteCode {
    // returns the op_* value
    let desiredValue: number = -1;
    if (this._type == eElementType.type_i_flex && typeof this._value === 'bigint') {
      // macro bytecode ls-8 bits
      desiredValue = Number(this._value & BigInt(0xff)); // 8 ls-bits
    }
    return desiredValue;
  }

  get flexParamCount(): number {
    // Not called by the compiler (compile_flex decodes the same bits from the symbol value); kept as the
    // accessor for the params field of PNut's flex symbol, p2com.asm:1186.
    // returns the count of parameters
    let desiredValue: number = -1;
    if (this._type == eElementType.type_i_flex && typeof this._value === 'bigint') {
      // macro (params shl 8) 3-bits
      desiredValue = Number((BigInt(this._value) >> 8n) & 7n); // 3 ls-bits
    }
    return desiredValue;
  }

  get flexResultCount(): number {
    // returns the count of return values
    let desiredValue: number = -1;
    if (this._type == eElementType.type_i_flex && typeof this._value === 'bigint') {
      // macro (results shl 11) 3 bits
      desiredValue = Number((BigInt(this._value) >> 11n) & 7n); // 7 = ls-3bits
    }
    return desiredValue;
  }

  get flexIsPinField(): boolean {
    // Not called by the compiler (compile_flex decodes the same bit from the symbol value); kept as the
    // accessor for the pinfld field of PNut's flex symbol, p2com.asm:1186.
    // returns the count of return values
    let desiredValue: boolean = false;
    if (this._type == eElementType.type_i_flex && typeof this._value === 'bigint') {
      // macro (pinfld shl 14) 1-bit
      desiredValue = Number((BigInt(this._value) >> 14n) & 1n) ? true : false;
    }
    return desiredValue;
  }

  get flexIsHUbCode(): boolean {
    // Not called by the compiler (compile_flex decodes the same bit from the symbol value); kept as the
    // accessor for the hubcode field of PNut's flex symbol, p2com.asm:1186.
    // returns the count of return values
    let desiredValue: boolean = false;
    if (this._type == eElementType.type_i_flex && typeof this._value === 'bigint') {
      // macro (hubcode shl 15) 1-bit
      desiredValue = Number((BigInt(this._value) >> 15n) & 1n) ? true : false;
    }
    return desiredValue;
  }

  //
  // special for type_method: elements
  //
  get methodResultCount(): number {
    // returns the count of return values for type_method
    let desiredValue: number = -1;
    if (this._type == eElementType.type_method && typeof this._value === 'bigint') {
      // macro (results shl 20) 4 bits
      desiredValue = Number((BigInt(this._value) >> 20n) & BigInt(0b1111)); // 4 ls-bits
    }
    return desiredValue;
  }
  get methodParameterCount(): number {
    // returns the count of return values for type_method
    let desiredValue: number = -1;
    if (this._type == eElementType.type_method && typeof this._value === 'bigint') {
      // macro (params shl 24) 7 bits
      desiredValue = Number((BigInt(this._value) >> 24n) & BigInt(0x7f)); // 7 ls-bits
    }
    return desiredValue;
  }

  get methodIsPub(): boolean {
    // Not called by the compiler; kept as the accessor for the pub/pri bit (bit 31) that PNut sets in a
    // method's index long, p2com.asm:4320.
    // returns the count of return values for type_method
    let desiredValue: boolean = false;
    if (this._type == eElementType.type_method && typeof this._value === 'bigint') {
      // macro (pub/pri shl 31) 1 bit
      desiredValue = Number((BigInt(this._value) >> 31n) & BigInt(0b1)) ? true : false; //  ls-bit
    }
    return desiredValue;
  }

  public isAsmDirective(directive: eValueType) {
    // returns T/F where T means this element describes the directive requested
    let desiredValue: boolean = false;
    if (this._type == eElementType.type_asm_dir && typeof this._value === 'bigint') {
      // is value our directive?
      desiredValue = this.bigintValue == BigInt(directive);
    }
    return desiredValue;
  }

  //
  // special for type_op: elements
  //
  get operation(): eOperationType {
    // returns the op_* value
    let desiredValue: number = -1;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v1 parm (v1 << 0) 8 bits
      desiredValue = Number(this._value & BigInt(0xff)); // 8 ls-bits
    }
    return desiredValue;
  }

  get precedence(): number {
    // returns the op_* value
    let desiredValue: number = 0;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v2 parm (v2 << 8) 8 bits
      desiredValue = Number((this._value >> 8n) & BigInt(0xff)); // 8 ls-bits after shift
    }
    return desiredValue;
  }

  get byteCode(): number {
    // returns the op_* value
    let desiredValue: number = 0;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v3 parm (v3 << 16) 8 bits
      desiredValue = Number((this._value >> 16n) & BigInt(0xff)); // 8 ls-bits after shift
    }
    return desiredValue;
  }

  get isTernary(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v4 parm (v4 << 24)
      status = this._value & (1n << 24n) ? true : false;
    }
    return status;
  }

  get isBinary(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v5 parm (v5 << 25)
      status = this._value & (1n << 25n) ? true : false;
    }
    return status;
  }

  get isUnary(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v6 parm (v6 << 26)
      status = this._value & (1n << 26n) ? true : false;
    }
    return status;
  }

  get isAssignable(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v7 parm (v7 << 27)
      status = this._value & (1n << 27n) ? true : false;
    }
    return status;
  }

  get isFloatCompatible(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v8 parm (v8 << 28)
      status = this._value & (1n << 28n) ? true : false;
    }
    return status;
  }

  get isAlias(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v9 parm (v9 << 29)
      status = this._value & (1n << 29n) ? true : false;
    }
    return status;
  }

  get isHubcode(): boolean {
    let status: boolean = false;
    if (this._type == eElementType.type_op && typeof this._value === 'bigint') {
      // macro v10 parm (v10 << 30)
      status = this._value & (1n << 30n) ? true : false;
    }
    return status;
  }

  get isDatVar(): boolean {
    let status: boolean = false;
    if (
      (this._type == eElementType.type_dat_byte || this._type == eElementType.type_dat_word || this._type == eElementType.type_dat_long) &&
      typeof this._value === 'bigint'
    ) {
      status = true;
    }
    return status;
  }

  get isInstruction(): boolean {
    let status: boolean = false;
    if (
      (this._type == eElementType.type_i_flex || this._type == eElementType.type_asm_inst || this._type == eElementType.type_op) &&
      typeof this._value === 'bigint'
    ) {
      status = true;
    }
    return status;
  }

  public setSymbolLength(length: number) {
    // called when this element refers to a symbol in source code
    this._isSymbol = length > 0 ? true : false;
    this._symbolLength = length;
  }

  get symbolLength(): number {
    // called when this element refers to a symbol in source code
    return this._symbolLength;
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
    } else if (this._type == eElementType.type_method || this._type == eElementType.type_dat_long_res) {
      const valueBigInt: bigint = typeof this._value === 'bigint' ? this._value : 0n;
      valueInterp = `(${this.hexLong(valueBigInt, '0x')})`;
    } else if (this._type == eElementType.type_block) {
      valueInterp = `${eBlockType[this.numberValue]}`;
    } else if (this.isConstantFloat) {
      const valueBigInt: bigint = typeof this._value === 'bigint' ? this._value : 0n;
      valueInterp = `(${float32ToHexString(valueBigInt)})`;
    } else if (this.valueIsNumber) {
      if (this.isInstruction || this.isDatVar) {
        const valueBigInt: bigint = typeof this._value === 'bigint' ? this._value : 0n;
        valueInterp = `(${float32ToHexString(valueBigInt)})`;
      } else if (this.bigintValue < 256n && this.bigintValue != 0n) {
        valueInterp = `(${this.value})(${hexByte(Number(this.value), '0x')})`;
      } else {
        valueInterp = `(${this.value})`;
      }
    } else if (this.valueIsString) {
      if (this.value !== '') {
        valueInterp = `"${this._value}"`;
      }
    }
    return valueInterp;
  }

  public toString(): string {
    const elemTypeStr: string = eElementType[this._type];
    const flagInterp: string = this.isMidStringComma ? `, midString` : '';
    const valueInterp: string = this.valueString().length != 0 ? `, ${this.valueString()}` : '';
    const opInterp: string = this.isOperation ? ` ${this.operationString()}` : '';
    const endColumn: number = this._symbolLength > 1 ? this._expandedColumn + this._symbolLength - 1 : 0;
    const endColumnInterp: string = endColumn > 0 ? `-${endColumn}` : '';
    let offsetInterp: string = '';
    const dotInterp: string = this.isPartOfObjReference ? ' DOT!' : '';
    if (this._expandedColumn != 0) {
      offsetInterp = ` COL(${this._expandedColumn}${endColumnInterp})`;
    }
    if (this.haveSourceExpandedColumnOverride) {
      offsetInterp = ` COL(${this._expandedColumn}${endColumnInterp})>(${this._overrideExpandedColumn}${endColumnInterp})`;
    }
    let lineInterp: string = `${this.sourceLineNumber}`;
    if (this.haveSourceLineOverride) {
      lineInterp = `${this._sourceLineIndex + 1}>${this._overrideLineIndex + 1}`;
    }
    let colInterp: string = `${this.sourceCharacterOffset}`;
    if (this.haveSourceCharacterOffsetOverride) {
      colInterp = `${this._sourceCharacterOffset}>${this._overrideCharacterOffset}`;
    }
    const srcLocnInterp: string = `${lineInterp}(${colInterp})`;

    return `Ln#${srcLocnInterp} ${elemTypeStr}${valueInterp}${flagInterp}${opInterp}${dotInterp}${offsetInterp}`;
  }

  private hexLong(biUint32: bigint, prefixString: string = ''): string {
    const prefixInterp: string = prefixString === '' ? '$' : prefixString;
    return `${prefixInterp}${biUint32.toString(16).toUpperCase().padStart(8, '0')}`;
  }
}
