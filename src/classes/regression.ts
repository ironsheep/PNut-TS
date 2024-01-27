/** @format */
'use strict';

import path from 'path';
import fs from 'fs';
// src/classes/spinResolver.ts

// spin compile resolver
import { Context } from '../utils/context';
import { SpinElement } from './spinElement';

export class RegressionReporter {
  private context: Context;
  private loggingEnabled: boolean = false;
  private spinElements: SpinElement[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
    if (this.context.logOptions.logResolver) {
      if (this.context.reportOptions.writeElementsReport || this.context.reportOptions.writeTablesReport) {
        this.loggingEnabled = true;
      }
    }
  }

  public writeElementReport(dirName: string, fileName: string, elementList: SpinElement[]) {
    this.spinElements = elementList;
    const fileBasename = path.basename(fileName, '.spin2');
    const outFilename = path.join(dirName, `${fileBasename}.elem`);
    // Create a write stream
    this.logMessage(`* writing report to ${outFilename}`);
    const stream = fs.createWriteStream(outFilename);

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    // Write each element to the file
    stream.write(`# Report for regression testing\n`);
    stream.write(`# Run: ${formattedDate}\n#\n`);
    stream.write('# ---------------------------------------\n');
    stream.write(`# - Showing ${elementList.length} entries\n`);
    let currSourceLine: number = -1;
    let itemNbr: number = 0;
    for (const element of this.spinElements) {
      if (element.sourceLineIndex != currSourceLine) {
        stream.write(''); // blank line
        currSourceLine = element.sourceLineIndex;
      }
      const elemTypeStr: string = element.typeString();
      const flagInterp: string = element.isMidStringComma ? `, midString` : '';
      const valueInterp: string = element.valueString().length != 0 ? `, ${element.valueString()}` : '';
      stream.write(` (${itemNbr}) -- Ln#${element.sourceLineNumber}(${element.sourceCharacterOffset}) ${elemTypeStr}${valueInterp}${flagInterp}\n`);
      itemNbr++;
    }
    stream.write('# ---------------------------------------\n');

    // Close the stream
    stream.end();
  }

  private logMessage(message: string): void {
    if (this.loggingEnabled) {
      this.context.logger.logMessage(message);
    }
  }
}
