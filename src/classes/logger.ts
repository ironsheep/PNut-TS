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
    this.logErrorMessage(`${this.programName}: ERROR- ${message}`);
  }

  public compilerErrorMsg(message: string | unknown) {
    this.logErrorMessage(`${this.errorColor(message)}`);
  }

  private errorColor(str: string | unknown): string {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`;
  }

  private warningColor(str: string | unknown): string {
    // Add ANSI escape codes to display text in yellow.
    return `\x1b[33m${str}\x1b[0m`;
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
    this.logErrorMessage(`${this.programName}: WARNING- ${message}`);
  }

  public progressMsg(message: string): void {
    this.logMessage(`${this.programName}: ${message}`);
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
    process.stderr.write(`${message}\r\n`);
  }
}
