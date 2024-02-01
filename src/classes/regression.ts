/** @format */
'use strict';

import path from 'path';
import fs from 'fs';
// src/classes/spinResolver.ts

// spin compile resolver
import { Context } from '../utils/context';
import { SpinElement } from './spinElement';
import { SpinSymbolTables } from './parseUtils';
import { TextLine } from './textLine';
import { SpinResolver } from './spinResolver';
import { eOperationType } from './types';

export class RegressionReporter {
  private context: Context;
  private isLogging: boolean = false;
  private spinElements: SpinElement[] = [];

  constructor(ctx: Context) {
    this.context = ctx;
    this.isLogging = this.context.logOptions.logResolver;
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

  public writeTableReport(dirName: string, fileName: string) {
    const fileBasename = path.basename(fileName, '.spin2');
    const outFilename = path.join(dirName, `${fileBasename}.tabl`);
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
    stream.write(`; Report for regression testing\n`);
    stream.write(`; Run: ${formattedDate}\n#\n`);
    stream.write('; ---------------------------------------\n');
    stream.write(`; - Internal table values\n`);
    stream.write('; ---------------------------------------\n');

    const pnutSymbolTables: SpinSymbolTables = new SpinSymbolTables(this.context);
    pnutSymbolTables.enableLogging();
    //
    // now display our tables in this order
    // ac_, bc_, block_, dc_, dd_, dir_, disop_, fc_, if_, info_ , oc_,
    //   op_, operand_, pp_, type_, unused1, unused2
    const acPairs: string[] = pnutSymbolTables.regressionInternalTableValuePairString();
    //this.logMessage(`- received ${acPairs.length} strings`);
    for (const keyValuePair of acPairs) {
      if (keyValuePair.length == 0) {
        stream.write(`;\n`);
        continue;
      }
      stream.write(`${keyValuePair}\n`);
    }

    stream.write('; ---------------------------------------\n');

    // Close the stream
    stream.end();
  }

  public writeProprocessResults(dirName: string, fileName: string, lines: TextLine[]) {
    const fileBasename = path.basename(fileName, '.spin2');
    const outFilename = path.join(dirName, `${fileBasename}.pre`);
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
    stream.write(`' Report for regression testing\n`);
    stream.write(`' Run: ${formattedDate}\n#\n`);
    stream.write(`' ---------------------------------------\n`);

    //this.logMessage(`- received ${acPairs.length} strings`);
    let index: number = 0;
    for (const testLine of lines) {
      const indexStr: string = index.toString().padStart(3, '0');
      stream.write(`[${indexStr}] ${testLine.sourceLineNumber}: ${testLine.text}\n`);
      index += 1;
    }

    stream.write(`' ---------------------------------------\n`);

    // Close the stream
    stream.end();
  }

  private writeResolverTestResults(dirName: string, fileName: string, lines: string[]) {
    const fileBasename = path.basename(fileName, '.spin2');
    const outFilename = path.join(dirName, `${fileBasename}.resolv`);
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
    stream.write(`' Report for resolver testing\n`);
    stream.write(`' Run: ${formattedDate}\n#\n`);
    stream.write(`' ---------------------------------------\n`);

    //this.logMessage(`- received ${acPairs.length} strings`);
    let testNumber: number = 1;
    for (const testLine of lines) {
      const testNbrStr: string = testNumber.toString().padStart(3, '0');
      stream.write(`[${testNbrStr}] ${testLine}\n`);
      testNumber += 1;
    }

    stream.write(`' ---------------------------------------\n`);

    // Close the stream
    stream.end();
  }

  public runResolverRegression(dirName: string, fileName: string) {
    const testResolver: SpinResolver = new SpinResolver(this.context, []);
    const resultStrings: string[] = [];
    let reportResult: string = '';
    //
    // INSERT generated TESTs   vvv  Below HERE
    //

    // generated reolver tests

    //	 operation     a         b         result    isFloat/    throw/             symbol   type     preced  canFloat
    //	                                             notFloat    noThrow
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_bitnot, false); //        !        unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(testResolver, 0x55555555, 0x00000000, eOperationType.op_bitnot, false); //        !        unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(testResolver, 0xffffffff, 0x00000000, eOperationType.op_bitnot, false); //        !        unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(testResolver, 0x00000000, 0x00000000, eOperationType.op_neg, false); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(testResolver, 0x55555555, 0x00000000, eOperationType.op_neg, false); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(testResolver, 0x55555555, 0x00000000, eOperationType.op_neg, false); //        -        unary    0       yes
    resultStrings.push(reportResult);
    //
    //  END of generated tests  ^^^  Above HERE
    //

    // when all done, write our report
    this.writeResolverTestResults(dirName, fileName, resultStrings);
  }

  private executeTest(
    testResolver: SpinResolver,
    parmA: number,
    parmB: number,
    operation: eOperationType,
    isFloatInConstExpression: boolean
  ): string {
    const result32: number = testResolver.regressionTestResolver(parmA, parmB, operation, isFloatInConstExpression);
    const reportResult: string = this.formatAnswer(result32, parmA, parmB, operation, isFloatInConstExpression);
    return reportResult;
  }
  private formatAnswer(result32: number, parmA: number, parmB: number, operation: eOperationType, isFloatInConstExpression: boolean): string {
    //  $xxxx_rrrr, $yyyy_vvvv, operation, fltflag = $0000_fffff
    const opName: string = eOperationType[operation];
    const floatInterp: string = isFloatInConstExpression ? `     ` : ` flt `;
    const opInterp: string = opName.padEnd(13, ' ');
    const resultStr: string = `${this.hexLong(parmA)}, ${this.hexLong(parmB)}, ${opInterp}${floatInterp} = ${this.hexLong(result32)}`;
    return resultStr;
  }
  private hexLong(parm: number): string {
    const newPair: string = `0x${parm.toString(16).toUpperCase().padStart(8, '0')}`;
    return newPair;
  }

  private logMessage(message: string): void {
    if (this.isLogging) {
      this.context.logger.logMessage(message);
    }
  }
}
