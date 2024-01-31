/** @format */

// this is our file loader and internal interface to the file
// it also handles light-weight preprocessing of the file

'use strict';
// src/classes/spinDocument.ts

import * as path from 'path';

import { isSpin1File, isSpin2File, fileExists, dirExists, fileSpecFromURI, loadFileAsString } from '../utils/files';
import { TextLine } from './textLine';
import { Context } from '../utils/context';
import { SymbolTable } from './symbolTable';
import { eElementType } from './types';
import { RegressionReporter } from './regression';

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

export interface iError {
  sourceLineIndex: number;
  characterOffset: number;
  message: string;
}

/**
 * The SpinDocument class represents a Spin document, providing methods to analyze and manipulate the document's content.
 */
export class SpinDocument {
  private ctx: Context;
  private isLogging: boolean = false;
  // raw lines from file
  private readonly rawLines: string[] = [];
  // remaining lines are preprocessing
  private readonly preprocessedLines: TextLine[] = [];
  // description of file
  private readonly eolType: eEOLType = eEOLType.EOL_Unknown;
  private readonly langId: eLangaugeId = eLangaugeId.LID_Unknown;
  private readonly docFolder: string;
  private readonly fileBaseName: string;
  private haveFile: boolean = false;
  // preprocessor data
  private incFolder: string = '';
  private preProcSymbols: SymbolTable = new SymbolTable();
  // preprocess state information
  private headerComments: string[] = [];
  private trailerComments: string[] = [];
  private gatheringHeaderComment: boolean = true;
  private gatheringTrailerComment: boolean = true;
  private inDocComment: boolean = false;
  private inNonDocComment: boolean = false;
  // Pnut_TS version number handling for this .spin2 file
  private defualtVersion: number = 41;
  private legalVersions: number[] = [41, 43];
  private requiredVersion: number = 0;
  // errors reported while processing file
  private errorsfound: iError[] = [];

  constructor(ctx: Context, fileSpec: string) {
    // record file name and location
    this.ctx = ctx;
    if (this.ctx.logOptions.logPreprocessor) {
      this.isLogging = true;
    }
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
        this.logMessage(`CODE: loaded [${this.fileBaseName}] from [${this.docFolder}]`);
      }
    } else {
      this.logMessage(`CODE: ERROR failed to load [${this.fileBaseName}] from [${this.docFolder}]`);
    }

    // load our predefined symbols with values
    this.preloadSymbolTable();

    // set include folder if provided from the command line
    if (this.ctx.preProcessorOptions.includeFolders.length > 0) {
      for (const newFolder of this.ctx.preProcessorOptions.includeFolders) {
        this.setIncludePath(newFolder);
      }
    }

    // add any symbols arriving from the command line
    const cliDefinedSymbols: string[] = this.ctx.preProcessorOptions.defSymbols;
    if (cliDefinedSymbols.length > 0) {
      for (let index = 0; index < cliDefinedSymbols.length; index++) {
        const newSymbolName = cliDefinedSymbols[index];
        this.defineSymbol(newSymbolName, 1);
      }
    }
  }

  public defineSymbol(newSymbol: string, value: string | number): void {
    this.logMessage(`CODE: defSymbol(${newSymbol})=[${value}]`);
    if (!this.preProcSymbols.exists(newSymbol)) {
      this.preProcSymbols.add(newSymbol, eElementType.type_con, value);
    } else {
      this.logMessage(`CODE: symbol(${newSymbol}) already exists, add skipped`);
    }
  }

  private undefineSymbol(oldSymbol: string): boolean {
    let removeStatus: boolean = false;
    if (this.preProcSymbols.exists(oldSymbol)) {
      this.logMessage(`CODE: undefSymbol(${oldSymbol})`);
      this.preProcSymbols.remove(oldSymbol);
      removeStatus = true;
    }
    return removeStatus;
  }

  public setIncludePath(includeDir: string): void {
    //this.logMessage(`CODE: setIncludePath(${includeDir})`);
    // is inc-folder
    const newIncludePath: string = path.join(this.dirName, includeDir);
    if (dirExists(newIncludePath)) {
      this.incFolder = newIncludePath;
      //this.logMessage(`CODE: IncludePath(${newIncludePath}) exists!`);
      this.logMessage(`CODE: Processing includes from [${this.incFolder}]`);
    } else {
      this.logMessage(`CODE: ERROR: failed locate incFolder [${newIncludePath}]`);
    }
  }

  get versionNumber(): number {
    // return the Spin language version required by this file
    return this.requiredVersion == 0 ? this.defualtVersion : this.requiredVersion;
  }

  public preProcess(): void {
    // Gather header (doc-only and non-doc) comments and trailer (doc-only) comments
    // From header (doc-only and non-doc) comments identify required version if any version
    // Process raw-lines into file content lines w/original line numbers based on #ifdef/#ifndef, etc. directives
    this.logMessage('CODE: preProcess()');
    let inPreProcIForIFNOT: boolean = false;
    let thisSideKeepsCode: boolean = false;
    for (let index = 0; index < this.rawLines.length; index++) {
      let skipThisline: boolean = false;
      const currLine = this.rawLines[index];
      if (currLine.startsWith("'")) {
        // have single line non-doc or doc comment
        this.recordComment(currLine);
      } else if (this.inNonDocComment) {
        // handle {..{..}..}
        // FIXME: TODO: add missing code
      } else if (this.inDocComment) {
        // handle {{..}}
        this.recordComment(currLine);
        if (currLine.includes('}}')) {
          this.inDocComment = false;
        }
      } else if (currLine.startsWith('#')) {
        // handle preprocessor #directive
        this.gatheringHeaderComment = false; // no more gathering once we hit text
        if (currLine.startsWith('#define')) {
          // parse #define {symbol} {value}
          const [symbol, value] = this.getSymbolValue(currLine);
          if (symbol) {
            const canAdd: boolean = this.ctx.preProcessorOptions.undefSymbols.includes(symbol) ? false : true;
            if (canAdd) {
              this.logMessage(`CODE: add new symbol [${symbol}]=[${value}]`);
              this.defineSymbol(symbol, value);
            } else {
              this.logMessage(`#define of [${symbol}] prevented by "-U ${symbol}" on command line`);
            }
          } else {
            // ERROR bad statement
            this.reportError(`#define is missing symbol name`, index, 0);
          }
        } else if (currLine.startsWith('#undef')) {
          // parse #undef {symbol}
          const symbol = this.getSymbolName(currLine);
          if (symbol) {
            // this.logMessage(`CODE: (DBG) UNDEF inPreProcIForIFNOT=(${inPreProcIForIFNOT}), thisSideKeepsCode=(${thisSideKeepsCode})`);
            if ((inPreProcIForIFNOT && thisSideKeepsCode) || !inPreProcIForIFNOT) {
              if (!this.undefineSymbol(symbol)) {
                // ERROR no such symbol
                this.reportError(`#undef symbol [${symbol}] not found`, index, 0);
              } else {
                this.logMessage(`CODE: removed symbol [${symbol}]`);
              }
            } else {
              // ignore this code since in conditional code
              this.logMessage(`CODE: NOT keeping code SKIP [${currLine}]`);
            }
          } else {
            this.reportError(`#undef is missing symbol name`, index, 0);
          }
        } else if (currLine.startsWith('#ifdef') || currLine.startsWith('#elseifdef')) {
          // parse #ifdef {symbol}
          // parse #elseifdef {symbol}
          const isElseForm: boolean = currLine.startsWith('#elseifdef');
          if (isElseForm == false || (isElseForm == true && inPreProcIForIFNOT == true)) {
            inPreProcIForIFNOT = true;
            // this.logMessage(`CODE: (DBG) inPreProcIForIFNOT=(${inPreProcIForIFNOT})`);
            const symbol = this.getSymbolName(currLine);
            if (symbol) {
              if (this.preProcSymbols.exists(symbol)) {
                this.logMessage(`CODE: have symbol [${symbol}]`);
                // found symbol... we are keeping code from IF side
                thisSideKeepsCode = true;
              } else {
                // symbol doesn't exist keep code from ELSE side
                this.logMessage(`CODE: don't have symbol [${symbol}]`);
                thisSideKeepsCode = false;
              }
              // this.logMessage(`CODE: (DBG) thisSideKeepsCode=(${thisSideKeepsCode})`);
            } else {
              // ERROR bad statement
              this.reportError(`#directive is missing symbol name`, index, 0);
            }
          } else {
            // ERROR missing preceeding #if*...
            this.reportError(`#elseifdef without earlier #if*...`, index, 0);
          }
        } else if (currLine.startsWith('#ifndef') || currLine.startsWith('#elseifndef')) {
          // parse #ifndef {symbol}
          // parse #elseifndef {symbol}
          const isElseForm: boolean = currLine.startsWith('#elseifndef');
          if (isElseForm == false || (isElseForm == true && inPreProcIForIFNOT == true)) {
            inPreProcIForIFNOT = true;
            // this.logMessage(`CODE: (DBG) inPreProcIForIFNOT=(${inPreProcIForIFNOT})`);
            const symbol = this.getSymbolName(currLine);
            if (symbol) {
              if (this.preProcSymbols.exists(symbol)) {
                // found symbol... we are keeping code from ELSE side
                this.logMessage(`CODE: don't have symbol [${symbol}]`);
                thisSideKeepsCode = false;
              } else {
                // symbol doesn't exist keep code from IF side
                this.logMessage(`CODE: have symbol [${symbol}]`);
                thisSideKeepsCode = true;
              }
              // this.logMessage(`CODE: (DBG) thisSideKeepsCode=(${thisSideKeepsCode})`);
            } else {
              // ERROR bad statement
              this.reportError(`#directive is missing symbol name`, index, 0);
            }
          } else {
            // ERROR missing preceeding #if*...
            this.reportError(`#elseifndef without earlier #if*...`, index, 0);
          }
        } else if (currLine.startsWith('#else')) {
          // parse #else
          if (inPreProcIForIFNOT) {
            thisSideKeepsCode = !thisSideKeepsCode;
            // this.logMessage(`CODE: (DBG) thisSideKeepsCode=(${thisSideKeepsCode})`);
          } else {
            // ERROR missing preceeding #if*...
            this.reportError(`#else without earlier #if*...`, index, 0);
          }
        } else if (currLine.startsWith('#endif')) {
          // parse #endif
          if (!inPreProcIForIFNOT) {
            // ERROR missing preceeding #if*...
            this.reportError(`#endif without earlier #if*...`, index, 0);
          }
          inPreProcIForIFNOT = false;
          // this.logMessage(`CODE: (DBG) inPreProcIForIFNOT=(${inPreProcIForIFNOT})`);
        } else if (currLine.startsWith('#error')) {
          // parse #error
          const message: string = currLine.substring(7);
          this.reportError(`ERROR: ${message}`, index, 0);
        } else if (currLine.startsWith('#warn')) {
          // parse #warn
          const message: string = currLine.substring(7);
          this.reportError(`WARNING: ${message}`, index, 0);
        } else {
          // generate error! vs. throwing exception
          let lineParts = this.splitLineOnWhiteSpace(currLine);
          if (lineParts.length == 0) {
            lineParts = [currLine];
          }
          this.reportError(`Unknown #directive: [${lineParts[0]}]`, index, 0);
        }
        skipThisline = true;
      } else if (currLine.startsWith('{{')) {
        // handle start of doc-comment {{..}}
        if (!currLine.substring(2).includes('}}')) {
          this.inDocComment = true;
        }
        if (this.gatheringHeaderComment) {
          this.headerComments.push(currLine);
        }
      } else if (currLine.startsWith('{')) {
        // handle preprocessor directive
        this.inNonDocComment = true;
        // FIXME: TODO: COPY CODE FROM OUR ELEMENTIZER!!!
      } else {
        // have code line
        this.gatheringHeaderComment = false; // no more gathering once we hit text
        this.gatheringTrailerComment = true; // from here on out, we are...
        this.trailerComments = []; // but every non-comment line we clear all we have so we only get final comments
      }

      // ifSideKeepsCode || inIfSide
      //     true             false    skip = true
      //     true             true     skip = false
      //     false            false    skip = false
      //     false            true     skip = true
      if (!skipThisline) {
        if (inPreProcIForIFNOT) {
          skipThisline = thisSideKeepsCode ? false : true;
        }
      }

      if (!skipThisline) {
        //this.logMessage(`CODE: Line KEEP [${currLine}]`);
        this.preprocessedLines.push(new TextLine(currLine, index));
      } else {
        //this.logMessage(`CODE: Line SKIP [${currLine}]`);
      }
    }
    this.getVersionFromHeader(this.headerComments);

    this.dumpErrors(); // report on errors if any found

    // if regression testing the emit our preprocessing result
    if (this.ctx?.reportOptions.writePreprocessReport) {
      this.logMessage('CODE: writePreprocessReport()');
      const reporter: RegressionReporter = new RegressionReporter(this.ctx);
      reporter.writeProprocessResults(this.dirName, this.fileName, this.preprocessedLines);
    }
  }

  private dumpErrors() {
    if (this.errorsfound.length > 0) {
      this.logMessage(''); // blank line
    }
    for (let index = 0; index < this.errorsfound.length; index++) {
      const error = this.errorsfound[index];
      this.logMessage(`ERROR: Ln#${error.sourceLineIndex + 1}: ${error.message}`);
    }
  }

  private recordComment(line: string) {
    if (this.gatheringHeaderComment) {
      this.headerComments.push(line);
    } else if (this.gatheringTrailerComment) {
      this.trailerComments.push(line);
    }
  }

  public reportError(message: string, lineIndex: number, characterOffset: number) {
    // record a new error
    const errorReport: iError = {
      message: message,
      sourceLineIndex: lineIndex,
      characterOffset: characterOffset
    };
    this.logMessage(`CODE: new error: Ln#${lineIndex + 1}: ${message}`);
    this.errorsfound.push(errorReport);
  }

  get errors(): iError[] {
    // return list of all errors found
    return this.errorsfound;
  }

  private splitLineOnWhiteSpace(line: string): string[] {
    const lineParts = line.split(/[ \t\r\n]/).filter(Boolean);
    // this.logMessage(`CODE: (DBG) splitLineOnWhiteSpace(${line})`);
    // this.logMessage(`CODE: (DBG) lineParts=[${lineParts}](${lineParts.length})`);
    return lineParts;
  }

  private getSymbolName(line: string): string | undefined {
    const lineParts = this.splitLineOnWhiteSpace(line);
    let symbol: string | undefined = undefined;
    if (lineParts.length > 1) {
      // internally all Preprocessor symbols are UPPER CASE
      symbol = lineParts[1].toUpperCase();
    }
    return symbol;
  }

  private getSymbolValue(line: string): [string | undefined, string] {
    const lineParts = this.splitLineOnWhiteSpace(line);
    let symbol: string | undefined = undefined;
    let value: string = '1';
    if (lineParts.length > 1) {
      // internally all Preprocessor symbols are UPPER CASE
      symbol = lineParts[1].toUpperCase();
      if (lineParts.length > 2) {
        value = lineParts[2];
      }
    }
    return [symbol, value];
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.ctx.logger.logMessage(message);
    }
  }
  get validFile(): boolean {
    return this.haveFile;
  }

  get fileName(): string {
    return this.fileBaseName;
  }
  get dirName(): string {
    return this.docFolder;
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
  public lineAtOld(lineIndex: number): TextLine {
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

  public lineAt(lineIndex: number): TextLine {
    let desiredLine: TextLine = new TextLine('', -1);
    if (lineIndex >= 0 && lineIndex < this.lineCount) {
      desiredLine = this.preprocessedLines[lineIndex];
      //this.logMessage(`DOC: lineAt(${lineIndex}) finds desiredString=[${desiredString}](${desiredString.length})`);
    }
    // return the with additional details about the line
    return desiredLine;
  }

  private getVersionFromHeader(headerComments: string[]): void {
    const spinLangVersionRegEx = /\{Spin2_v(\d{2,3})\}/;
    for (let index = 0; index < headerComments.length; index++) {
      const headerLine = headerComments[index];
      const symbolMatch = headerLine.match(spinLangVersionRegEx);
      // yields: symbolMatch=[{Spin2_v43},43](2), hdr=[' {Spin2_v43}]
      if (symbolMatch) {
        const possibleVersion = parseInt(symbolMatch[1]);
        //this.logMessage(`- #${index + 1}: symbolMatch=[${symbolMatch}](${symbolMatch?.length}), hdr=[${headerLine}]`);
        this.requiredVersion = this.legalVersions.includes(possibleVersion) ? possibleVersion : 0;
        //this.logMessage(`  -- possibleVersion=(${possibleVersion}) -> requiredVersion=(${this.requiredVersion})`);
        if (possibleVersion != this.requiredVersion) {
          this.reportError(`ERROR: ${symbolMatch[0]}, ${possibleVersion} is not a legal Spin2 Language Version!`, index, 0);
        }
      }
    }
  }

  private preloadSymbolTable() {
    const now = new Date();
    // Outputs: YYYY-MM-DD
    const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    // Outputs: HH:MM
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const baseSymbols: { [key: string]: number | string } = {};
    // build list of internal symbols
    baseSymbols['__propeller__'] = 1;
    baseSymbols['__P2__'] = 1;
    baseSymbols['__propeller2__'] = 1;
    baseSymbols['__PNUT_TS__'] = 1;
    baseSymbols['__DATE__'] = formattedDate;
    baseSymbols['__FILE__'] = this.fileBaseName;
    baseSymbols['__TIME__'] = formattedTime;
    if (this.ctx?.compileOptions.enableDebug) {
      baseSymbols['__DEBUG__'] = 1;
    }
    // populate our symbol table with this list
    for (const symbolKey of Object.keys(baseSymbols)) {
      const value = baseSymbols[symbolKey];
      this.defineSymbol(symbolKey, value);
    }
  }
}
