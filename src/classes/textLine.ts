/** @format */

// this is our file loader and internal interface to the spin files
// it also handles light-weight preprocessing of the file

'use strict';
// src/classes/textLine.ts

/**
 * The Position class represents a position in a text document, defined by a line number and a character offset.
 */
export class Position {
  /**
   * The line number, starting from 0.
   */
  public readonly line: number = 0;

  /**
   * The character offset on the line, starting from 0.
   */
  public readonly character: number = 0;

  /**
   * Constructs a new Position instance.
   * @param {number} line - The line number.
   * @param {number} character - The character offset on the line.
   */
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

/**
 * The Range class represents a range in a text document, defined by a start and end position.
 */
export class Range {
  /**
   * The start position of the range.
   */
  public readonly start: Position = new Position(0, 0);

  /**
   * The end position of the range.
   */
  public readonly end: Position = new Position(0, 0);

  /**
   * Constructs a new Range instance.
   * @param {Position} start - The start position of the range.
   * @param {Position} end - The end position of the range.
   */
  constructor(start: Position, end: Position) {
    this.start = start;
    this.end = end;
  }
}

/**
 * The TextLine class represents a line of text, providing methods to analyze the line's content.
 */
export class TextLine {
  /**
   * The index of the first non-whitespace character in the line.
   */
  private readonly _nonWhiteIndex: number;

  /**
   * The raw line index [0 - length-1].
   */
  private readonly _sourceFileId: number;

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
   * @param {string} line - The raw text of the line.
   * @param {number} lineIndex - The raw line number, zero relative [0 to lineCount - 1].
   */
  constructor(fileID: number, line: string, lineIndex: number) {
    this._sourceFileId = fileID;
    this._rawText = line;
    this._rawLineIndex = lineIndex;
    this._nonWhiteIndex = this._skipWhite(line, 0);
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

  get range(): Range {
    const startPos: Position = new Position(this._rawLineIndex, 0);
    const endPos: Position = new Position(this._rawLineIndex, this._rawText.length - 1);
    const desiredRange = new Range(startPos, endPos);
    return desiredRange;
  }

  /**
   * Gets the index of the first non-whitespace character in the line.
   * @returns {number} The index of the first non-whitespace character.
   */
  get firstNonWhitespaveCharacterIndex(): number {
    return this._nonWhiteIndex;
  }

  /**
   * Checks if the line is empty or contains only whitespace.
   * @returns {boolean} True if the line is empty or contains only whitespace, false otherwise.
   */
  get isEmptyOrWhiteSpace(): boolean {
    return this._rawText.length === 0 || this._nonWhiteIndex === 0;
  }

  /**
   * Skips whitespace characters in the line.
   * @param {string} line - The line to skip whitespace in.
   * @param {number} currentOffset - The current offset in the line.
   * @returns {number} The index of the first non-whitespace character in the line.
   */
  private _skipWhite(line: string, currentOffset: number): number {
    let firstNonWhiteIndex: number = currentOffset;
    for (let index = currentOffset; index < line.length; index++) {
      if (line.charAt(index) !== ' ' && line.charAt(index) !== '\t') {
        firstNonWhiteIndex = index;
        break;
      }
    }
    return firstNonWhiteIndex;
  }
}
