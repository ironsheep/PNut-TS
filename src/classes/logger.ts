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

  // Diagnostics are emitted as plain text, without ANSI escapes. Colorizing at the
  // source prevents downstream consumers -- editors, build wrappers, log collectors,
  // grep -- from filtering or recolorizing our output; that decision belongs to
  // whatever is displaying the text, not to the compiler producing it.
  public errorMsg(message: string | unknown) {
    this.logErrorMessage(`${this.programName}: ERROR- ${message}`);
  }

  public compilerErrorMsg(message: string) {
    // The non-string guard that used to sit here is redundant: logErrorMessage
    // carries the identical check one level down, for every caller rather than
    // just this one.
    this.logErrorMessage(`${message}`);
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
    if (typeof message !== 'string') {
      this.logMessage(`* logErrorMessage() - message is ${typeof message}`);
    }
    process.stderr.write(`${message}\r\n`);
  }
}
