/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';
// src/classes/Log.ts

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

  public logMessage(message: string) {
    process.stdout.write(message);
  }

  public logError(message: string) {
    process.stderr.write(message);
  }

  public verboseMsg(msg: string): void {
    if (this.verboseEnabled) {
      this.logMessage(`${this.programName}: Verbose- ${msg}\r\n`);
    }
  }

  public warningMsg(msg: string): void {
    this.logMessage(`${this.programName}: WARNING- ${msg}\r\n`);
  }

  public progressMsg(msg: string): void {
    this.logMessage(`${this.programName}: ${msg}\r\n`);
  }
}
