/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';
// src/classes/Log.ts

export class Logger {
  private debugEnabled: boolean = false;

  public enabledDebug() {
    this.debugEnabled = true;
  }

  public logMessage(message: string) {
    process.stdout.write(message);
  }

  public logError(message: string) {
    process.stderr.write(message);
  }
}
