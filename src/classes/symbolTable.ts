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
  value: number;
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
   * @param {number} symbolValue
   * @memberof SymbolTable
   */
  public enter_symbol(symbolName: string, symbolType: eElementType, symbolValue: number) {
    if (!this.symbol_exists(symbolName)) {
      const newSymbol: iSymbol = { name: symbolName, type: symbolType, value: symbolValue };
      this.symbols.set(symbolName, newSymbol);
    }
  }

  /**
   * Return the symbol and its attributes if present in table
   *
   * @param {string} symbolName
   * @return {*}  {(iSymbol | undefined)}
   * @memberof SymbolTable
   */
  public find_symbol(symbolName: string): iSymbol | undefined {
    return this.symbols.get(symbolName);
  }

  /**
   * Return T/F where T means the symbol is present in our table
   *
   * @param {string} symbolName
   * @return {*}  {boolean}
   * @memberof SymbolTable
   */
  public symbol_exists(symbolName: string): boolean {
    return this.symbols.has(symbolName);
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
