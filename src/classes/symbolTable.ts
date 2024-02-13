/** @format */

// this is our symbol table

'use strict';

import { eElementType } from './types';

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
}
/**
 * The Pnut_ts symbol table class.
 *   Found in src/classes/symbolTable.ts
 *
 * @export
 * @class SymbolTable
 */
export class SymbolTable {
  private symbols = new Map<string, iSymbol>();

  /**
   *  Record a new symbol in this symbol table
   *
   * @param {string} symbolName
   * @param {eElementType} symbolType
   * @param {bigint} symbolValue
   * @memberof SymbolTable
   */
  public add(symbolName: string, symbolType: eElementType, symbolValue: bigint | string) {
    const nameKey: string = symbolName.toUpperCase();
    if (!this.exists(nameKey)) {
      const newSymbol: iSymbol = { name: nameKey, type: symbolType, value: symbolValue };
      this.symbols.set(nameKey, newSymbol);
    }
  }

  public remove(symbolName: string): boolean {
    const nameKey: string = symbolName.toUpperCase();
    let removeStatus: boolean = false;
    if (this.exists(nameKey)) {
      this.symbols.delete(nameKey);
      removeStatus = true;
    }
    return removeStatus;
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
    return this.symbols.get(nameKey);
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
  }
}
