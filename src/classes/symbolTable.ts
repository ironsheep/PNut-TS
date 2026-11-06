/** @format */

// this is our symbol table

'use strict';

import { eElementType } from './types';

export const ID_SEPARATOR_STRING = '_$_';
// src/classes/spinDocument.ts
/**
 * A symbol consists of name, type and value
 *
 * @export
 * @interface iSymbol
 */
export interface iSymbol {
  name: string;
  type: eElementType;
  value: bigint | string;
  isInline?: boolean; // true if symbol is from inline PASM (ORG/ORGH within method)
}

export class SymbolEntry {
  private static nextInstanceNumber = 0;
  private _name: string;
  private _type: eElementType;
  private _value: bigint | string;
  private _instanceNumber: number;
  private _isInline: boolean;

  constructor(symbolName: string, symbolType: eElementType, symbolValue: bigint | string, isInline: boolean = false) {
    this._instanceNumber = ++SymbolEntry.nextInstanceNumber;
    this._name = symbolName;
    this._type = symbolType;
    this._value = symbolValue;
    this._isInline = isInline;
  }

  get name(): string {
    return this._name;
  }
  get type(): eElementType {
    return this._type;
  }
  get value(): bigint | string {
    return this._value;
  }
  get instanceNumber(): number {
    return this._instanceNumber;
  }
  get isInline(): boolean {
    return this._isInline;
  }
}
/**
 * The PNut_ts symbol table class.
 *   Found in src/classes/symbolTable.ts
 *
 * @export
 * @class SymbolTable
 */
export class SymbolTable {
  private symbols = new Map<string, SymbolEntry>();
  private _cachedRegex: RegExp | null = null;

  /**
   *  Record a new symbol in this symbol table
   *
   * @param {string} symbolName
   * @param {eElementType} symbolType
   * @param {bigint} symbolValue
   * @memberof SymbolTable
   */
  public add(symbolName: string, symbolType: eElementType, symbolValue: bigint | string, isInline: boolean = false) {
    const nameKey: string = symbolName.toUpperCase();
    if (!this.exists(nameKey)) {
      const newEntry: SymbolEntry = new SymbolEntry(symbolName, symbolType, symbolValue, isInline);
      //const newSymbol: iSymbol = { name: nameKey, type: symbolType, value: symbolValue };
      this.symbols.set(nameKey, newEntry);
      this._cachedRegex = null;
    }
  }

  public addAllowDupe(symbolName: string, symbolType: eElementType, symbolValue: bigint | string, isInline: boolean = false) {
    const newEntry: SymbolEntry = new SymbolEntry(symbolName, symbolType, symbolValue, isInline);
    const nameKey: string = `${symbolName.toUpperCase()}${ID_SEPARATOR_STRING}${newEntry.instanceNumber}`;
    if (!this.exists(nameKey)) {
      //const newSymbol: iSymbol = { name: nameKey, type: symbolType, value: symbolValue };
      this.symbols.set(nameKey, newEntry);
      this._cachedRegex = null;
    }
  }

  // support for...of iteration
  [Symbol.iterator]() {
    const entries = this.symbols.entries();
    return {
      next() {
        const result = entries.next();
        return { value: result.value, done: result.done };
      }
    };
  }

  public remove(symbolName: string): boolean {
    const nameKey: string = symbolName.toUpperCase();
    let removeStatus: boolean = false;
    if (this.exists(nameKey)) {
      this.symbols.delete(nameKey);
      this._cachedRegex = null;
      removeStatus = true;
    }
    return removeStatus;
  }

  replaceSymbolsInString(inputString: string): string {
    if (this.symbols.size === 0) return inputString;
    if (!this._cachedRegex) {
      const escaped = [...this.symbols.keys()].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      this._cachedRegex = new RegExp(escaped.join('|'), 'g');
    }
    return inputString.replace(this._cachedRegex, (match) => {
      const symbol = this.symbols.get(match);
      if (symbol === undefined) {
        throw new Error(`ERROR[INTERNAL] symbol [${match}] matched but is not in the table`);
      }
      return `${symbol.value}`;
    });
  }

  /**
   * Return the symbol and its attributes if present in table
   *
   * @param {string} symbolName
   * @return {*}  {(iSymbol | undefined)}
   * @memberof SymbolTable
   */
  public get(symbolName: string): iSymbol | undefined {
    const nameKey: string = symbolName.toUpperCase();
    let desiredSymbol: iSymbol | undefined = undefined;
    const symbolEntry: SymbolEntry | undefined = this.symbols.get(nameKey);
    if (symbolEntry !== undefined) {
      desiredSymbol = { name: symbolEntry.name, type: symbolEntry.type, value: symbolEntry.value };
    }
    return desiredSymbol;
  }

  get length(): number {
    return this.symbols.size;
  }

  get allSymbols(): SymbolEntry[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Return T/F where T means the symbol is present in our table
   *
   * @param {string} symbolName
   * @return {*}  {boolean}
   * @memberof SymbolTable
   */
  public exists(symbolName: string): boolean {
    const nameKey: string = symbolName.toUpperCase();
    return this.symbols.has(nameKey);
  }

  /**
   * Empty our symbol table
   *
   * @memberof SymbolTable
   */
  public reset(): void {
    this.symbols.clear();
    this._cachedRegex = null;
  }
}
