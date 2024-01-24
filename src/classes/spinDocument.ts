/** @format */

// this is our file loader and internal interface to the file
// it also handles light-weight preprocessing of the file

'use strict';
// src/classes/spinDocument.ts

import * as path from 'path';

import { isSpin1File, isSpin2File, fileExists, fileSpecFromURI, loadFileAsString } from '../utils/files';
import { TextLine } from './textLine';
import { Context } from '../utils/context';

export enum eEOLType {
  EOL_Unknown,
  EOL_CRLF,
  EOL_LF_ONLY
}

export enum eLangaugeId {
  LID_Unknown,
  LID_SPIN,
  LID_SPIN2
}

/**
 * The SpinDocument class represents a Spin document, providing methods to analyze and manipulate the document's content.
 */
export class SpinDocument {
  private readonly rawLines: string[] = [];
  private readonly eolType: eEOLType = eEOLType.EOL_Unknown;
  private readonly langId: eLangaugeId = eLangaugeId.LID_Unknown;
  private readonly docFolder: string;
  private readonly fileBaseName: string;
  private haveFile: boolean = false;
  private ctx: Context | undefined = undefined;

  constructor(fileSpec: string) {
    // record file name and location
    const bFileFound: boolean = fileExists(fileSpec);
    this.docFolder = bFileFound ? path.dirname(fileSpecFromURI(fileSpec)) : '';
    this.fileBaseName = bFileFound ? path.basename(fileSpecFromURI(fileSpec)) : '';
    // record file type (decoded from name)
    if (bFileFound) {
      if (isSpin1File(this.fileBaseName)) {
        this.langId = eLangaugeId.LID_SPIN;
      } else if (isSpin2File(this.fileBaseName)) {
        this.langId = eLangaugeId.LID_SPIN2;
        this.haveFile = true; // only spin2 files are usable for now
      }
      if (this.langId == eLangaugeId.LID_SPIN2) {
        // load file and record line-ending type then split into lines (removing endings)
        const fileContents: string = loadFileAsString(fileSpec);
        this.eolType = fileContents.includes('\r\n') ? eEOLType.EOL_CRLF : eEOLType.EOL_LF_ONLY;
        this.rawLines = fileContents.split(/\r?\n/);
      }
    }
  }

  public setDebugContext(context: Context): void {
    this.ctx = context;
  }

  private logMessage(message: string): void {
    if (this.ctx) {
      if (this.ctx.logOptions.logElementizer) {
        this.ctx.logger.logMessage(message);
      }
    }
  }
  get validFile(): boolean {
    return this.haveFile;
  }

  get fileName(): string {
    return this.fileBaseName;
  }

  get lineCount(): number {
    return this.rawLines.length;
  }

  get EndOfLine(): eEOLType {
    return this.eolType;
  }

  get languageId(): eLangaugeId {
    return this.langId;
  }

  /**
   * Returns a TextLine object representing the line at the given index.
   * @param {number} lineIndex - The index of the line to return.
   * @returns {TextLine} A TextLine object representing the line at the given index. If the index is out of range,
   * returns a TextLine object representing an empty line with a line number of -1.
   */
  public lineAt(lineIndex: number): TextLine {
    let desiredString: string | undefined = undefined;
    if (lineIndex >= 0 && lineIndex < this.lineCount) {
      desiredString = this.rawLines[lineIndex];
      //this.logMessage(`DOC: lineAt(${lineIndex}) finds desiredString=[${desiredString}](${desiredString.length})`);
      if (desiredString != null) {
        // do nothing this is good
      } else {
        desiredString = ''; // we want an empty string in this case
      }
    }
    // return object with additional details about this line
    const desiredLine: TextLine = desiredString != null ? new TextLine(desiredString, lineIndex) : new TextLine('', -1);
    return desiredLine;
  }
}
