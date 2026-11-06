/** @format */

// this is our file loader and internal interface to the spin files
// it also handles light-weight preprocessing of the file

'use strict';
// src/classes/textLine.ts

/**
 * The TextLine class represents a line of text, providing methods to analyze the line's content.
 */
export class TextLine {
  /**
   * The raw line index [0 - length-1].
   */
  private readonly _rawLineIndex: number;

  /**
   * The raw text of the line.
   */
  private readonly _rawText: string;

  /**
   * Constructs a new TextLine instance.
   * @param {number} _fileID - The ID of the source file the line came from (not kept).
   * @param {string} line - The raw text of the line.
   * @param {number} lineIndex - The raw line number, zero relative [0 to lineCount - 1].
   */
  constructor(_fileID: number, line: string, lineIndex: number) {
    this._rawText = line;
    this._rawLineIndex = lineIndex;
  }

  /**
   * Gets the line itself as a string.
   * @returns {string} The line of text.
   */
  get text(): string {
    return this._rawText;
  }

  /**
   * Gets the line number.
   * @returns {number} The raw line number.
   */
  get sourceLineNumber(): number {
    return this._rawLineIndex + 1;
  }

  /**
   * Gets the zero-relative line index, as passed to the constructor.
   * @returns {number} The raw line index [0 to lineCount - 1].
   */
  get sourceLineIndex(): number {
    return this._rawLineIndex;
  }
}
