/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';
// src/classes/logger.ts

export class Logger {
  private verboseEnabled: boolean = false;
  private programName: string = '{notSet}';

  public setProgramName(name: string) {
    this.programName = name;
  }

  public enabledVerbose() {
    this.progressMsg('Verbose output is enabled');
    this.verboseEnabled = true;
  }

  public errorMsg(message: string | unknown) {
    const redMessage: string = this.errorColor(message);
    this.logErrorMessage(`${this.programName}: ERROR- ${redMessage}`);
  }

  public compilerErrorMsg(message: string, underTest: boolean = false) {
    if (typeof message !== 'string') {
      this.logMessage(`* compilerErrorMsg() - message is ${typeof message}`);
    }
    const redMessage: string = underTest ? message : this.errorColor(message);
    if (typeof redMessage !== 'string') {
      this.logMessage(`* compilerErrorMsg() - redMessage is ${typeof redMessage}`);
    }
    this.logErrorMessage(`${redMessage}`);
  }

  public verboseMsg(message: string): void {
    if (this.verboseEnabled) {
      if (message.length == 0) {
        this.logMessage(``); // blank line
      } else {
        this.logMessage(`${this.programName}: Verbose- ${message}`);
      }
    }
  }

  public infoMsg(message: string): void {
    this.logMessage(`${this.programName}: ${message}`);
  }

  public warningMsg(message: string): void {
    const yellowMessage: string = this.warningColor(message);
    this.logErrorMessage(`${this.programName}: WARNING- ${yellowMessage}`);
  }

  public progressMsg(message: string): void {
    this.logMessage(`${this.programName}: ${message}`);
  }

  private errorColor(str: string | unknown): string {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`;
  }

  private warningColor(str: string | unknown): string {
    // Add ANSI escape codes to display text in yellow.
    return `\x1b[33m${str}\x1b[0m`;
  }

  /**
   * Write message to stdout with trailing CRLF
   *
   * @param {string} message
   * @memberof Logger
   */
  public logMessage(message: string) {
    process.stdout.write(`${message}\r\n`);
  }
  /**
   * Write message to stderr with trailing CRLF
   *
   * @param {string} message
   * @memberof Logger
   */
  public logErrorMessage(message: string) {
    if (typeof message !== 'string') {
      this.logMessage(`* logErrorMessage() - message is ${typeof message}`);
    }
    process.stderr.write(`${message}\r\n`);
  }
}
