/** @format */

// this is our common logging mechanism
//  TODO: make it context/runtime option aware

'use strict';
// src/classes/Log.ts

export function logMessage(message: string) {
  process.stdout.write(message);
}

export function logError(message: string) {
  process.stderr.write(message);
}
