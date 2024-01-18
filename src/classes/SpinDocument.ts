/** @format */

// this is our file loader and internal interface to the file
// it also handles light-weight preprocessing of the file

'use strict';
// src/classes/spinDocument.ts

import * as path from 'path';

import { isSpin1File, isSpin2File, fileExists, fileSpecFromURI, loadFileAsString } from '../utils/files';
import { TextLine } from './TextLine';

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
      // load file and record line-ending type then split into lines (removing endings)
      const fileContents: string = loadFileAsString(fileSpec);
      this.eolType = fileContents.includes('\r\n') ? eEOLType.EOL_CRLF : eEOLType.EOL_CRLF;
      this.rawLines = fileContents.split(/\r?\n/);
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
   * @returns {TextLine} A TextLine object representing the line at the given index. If the index is out of range, returns a TextLine object representing an empty line with a line number of -1.
   */
  public lineAt(lineIndex: number): TextLine {
    let desiredString: string | undefined;
    if (lineIndex >= 0 && lineIndex < this.rawLines.length) {
      desiredString = this.rawLines[lineIndex];
    }
    // return object with additional details about this line
    const desiredLine: TextLine = desiredString ? new TextLine(desiredString, lineIndex) : new TextLine('', -1);
    return desiredLine;
  }
}
