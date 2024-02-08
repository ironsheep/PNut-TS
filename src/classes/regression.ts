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
      stream.write(` (${itemNbr}) -- ${element.typeString()}\n`);
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
    const resolver: SpinResolver = new SpinResolver(this.context);
    const resultStrings: string[] = [];
    let reportResult: string = '';
    //
    // INSERT generated TESTs   vvv  Below HERE
    //
    // generated resolver tests

    //	 operation     a         b         result    isFloat/    throw/             symbol   type     preced  canFloat
    //	                                             notFloat    noThrow
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_bitnot, false); //        !        unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x12345678, 0x00000000, eOperationType.op_bitnot, false); //        !        unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0x00000000, eOperationType.op_bitnot, false); //        !        unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x00000000, eOperationType.op_neg, true); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xbf800000, 0x00000000, eOperationType.op_neg, true); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_neg, false); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000000, eOperationType.op_neg, false); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x00000000, eOperationType.op_neg, false); //        -        unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x00000000, eOperationType.op_fneg, false); //        -.       unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xbf800000, 0x00000000, eOperationType.op_fneg, false); //        -.       unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x00000000, eOperationType.op_abs, true); //        ABS      unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xbf800000, 0x00000000, eOperationType.op_abs, true); //        ABS      unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0x00000000, eOperationType.op_abs, false); //        ABS      unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000000, eOperationType.op_abs, false); //        ABS      unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x00000000, eOperationType.op_abs, false); //        ABS      unary    0       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x00000000, eOperationType.op_fabs, true); //        FABS     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xbf800000, 0x00000000, eOperationType.op_fabs, true); //        FABS     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_encod, false); //        ENCOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000000, eOperationType.op_encod, false); //        ENCOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00010000, 0x00000000, eOperationType.op_encod, false); //        ENCOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x00000000, eOperationType.op_encod, false); //        ENCOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf0000000, 0x00000000, eOperationType.op_decod, false); //        DECOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0fffffec, 0x00000000, eOperationType.op_decod, false); //        DECOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0000001f, 0x00000000, eOperationType.op_decod, false); //        DECOD    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_bmask, false); //        BMASK    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0fffffec, 0x00000000, eOperationType.op_bmask, false); //        BMASK    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf00000ff, 0x00000000, eOperationType.op_bmask, false); //        BMASK    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_ones, false); //        ONES     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00100000, 0x00000000, eOperationType.op_ones, false); //        ONES     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x12345678, 0x00000000, eOperationType.op_ones, false); //        ONES     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_sqrt, false); //        SQRT     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x12345678, 0x00000000, eOperationType.op_sqrt, false); //        SQRT     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0x00000000, eOperationType.op_sqrt, false); //        SQRT     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x49742400, 0x00000000, eOperationType.op_fsqrt, false); //        FSQRT    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x00000000, eOperationType.op_fsqrt, false); //        FSQRT    unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_qlog, false); //        QLOG     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000000, eOperationType.op_qlog, false); //        QLOG     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0001e5e0, 0x00000000, eOperationType.op_qlog, false); //        QLOG     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0x00000000, eOperationType.op_qlog, false); //        QLOG     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_qexp, false); //        QEXP     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0x00000000, eOperationType.op_qexp, false); //        QEXP     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xedcba987, 0x00000000, eOperationType.op_qexp, false); //        QEXP     unary    0       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0000abcd, 0x00000008, eOperationType.op_shr, false); //        >>       binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0xffffffff, eOperationType.op_shr, false); //        >>       binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0xffffffff, eOperationType.op_shl, false); //        <<       binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x000f0010, eOperationType.op_shl, false); //        <<       binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0xffffffff, eOperationType.op_sar, false); //        SAR      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x7fffffff, 0xf000000f, eOperationType.op_sar, false); //        SAR      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0xffffffff, eOperationType.op_ror, false); //        ROR      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0x80000010, eOperationType.op_ror, false); //        ROR      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0xffffffff, eOperationType.op_rol, false); //        ROL      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0x80000008, eOperationType.op_rol, false); //        ROL      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0xfffffff0, eOperationType.op_rev, false); //        REV      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0000000f, 0x00000000, eOperationType.op_rev, false); //        REV      binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0x00f00010, eOperationType.op_zerox, false); //        ZEROX    binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0xf000001f, eOperationType.op_zerox, false); //        ZEROX    binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0x00f00010, eOperationType.op_signx, false); //        SIGNX    binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x0000000a, 0xffffffe3, eOperationType.op_signx, false); //        SIGNX    binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000007, 0xffffffe3, eOperationType.op_signx, false); //        SIGNX    binary   1       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf000f000, 0x87654321, eOperationType.op_bitand, false); //        &        binary   2       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xaaaaaaaa, 0x5555aaaa, eOperationType.op_bitand, false); //        &        binary   2       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf000ff00, 0x87654321, eOperationType.op_bitxor, false); //        ^        binary   3       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xaaaaaaaa, 0x5555aaaa, eOperationType.op_bitxor, false); //        ^        binary   3       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xaaaaaaaa, 0x55555555, eOperationType.op_bitor, false); //        |        binary   4       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x87654321, 0xf0f0f0f0, eOperationType.op_bitor, false); //        |        binary   4       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x788dbf9a, 0x3f800000, eOperationType.op_mul, true); //        *        binary   5       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xfffffffe, 0x00000100, eOperationType.op_mul, false); //        *        binary   5       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x12345678, 0x87654321, eOperationType.op_mul, false); //        *        binary   5       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x7dcca14b, 0xc1200000, eOperationType.op_fmul, false); //        *.       binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x7dcca14b, 0xbdcccccd, eOperationType.op_div, true); //        /        binary   5       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000064, 0x0000000a, eOperationType.op_div, false); //        /        binary   5       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x00010000, eOperationType.op_div, false); //        /        binary   5       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xc1c80000, 0x40e00000, eOperationType.op_fdiv, false); //        /.       binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf8000000, 0x00000003, eOperationType.op_divu, false); //        +/       binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0x3fffffff, eOperationType.op_divu, false); //        +/       binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x0000000d, eOperationType.op_rem, false); //        //       binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00001000, 0x00000100, eOperationType.op_rem, false); //        //       binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf8000000, 0x00000003, eOperationType.op_remu, false); //        +//      binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xfffffffe, 0xffffffff, eOperationType.op_remu, false); //        +//      binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0xffffffff, eOperationType.op_sca, false); //        SCA      binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x12345678, 0x87654321, eOperationType.op_sca, false); //        SCA      binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x12345678, 0x87654321, eOperationType.op_scas, false); //        SCAS     binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x12345678, eOperationType.op_scas, false); //        SCAS     binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x90000000, eOperationType.op_frac, false); //        FRAC     binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000003, eOperationType.op_frac, false); //        FRAC     binary   5       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_add, true); //        +        binary   6       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000003, 0x00000004, eOperationType.op_add, false); //        +        binary   6       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xfffffffc, 0x00000010, eOperationType.op_add, false); //        +        binary   6       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_fadd, false); //        +.       binary   6       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x42c80000, 0x42c60000, eOperationType.op_sub, true); //        -        binary   6       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000100, 0x00000001, eOperationType.op_sub, false); //        -        binary   6       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xfffffff8, 0xfffffff0, eOperationType.op_sub, false); //        -        binary   6       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x49742400, 0x4479c000, eOperationType.op_fsub, false); //        -.       binary   6       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x4479c000, 0x49742400, eOperationType.op_fge, true); //        #>       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x49742400, 0x4479c000, eOperationType.op_fge, true); //        #>       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xfffffff0, 0x00000004, eOperationType.op_fge, false); //        #>       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000080, 0xfffff000, eOperationType.op_fge, false); //        #>       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x41a00000, 0x41200000, eOperationType.op_fle, true); //        <#       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x41200000, 0x41a00000, eOperationType.op_fle, true); //        <#       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffff00, 0xff000000, eOperationType.op_fle, false); //        <#       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xff000000, 0xffffff00, eOperationType.op_fle, false); //        <#       binary   7       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xfffffff1, 0xfffffff1, eOperationType.op_addbits, false); //        ADDBITS  binary   8       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000008, 0x00000003, eOperationType.op_addbits, false); //        ADDBITS  binary   8       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffe1, 0xfffffff1, eOperationType.op_addpins, false); //        ADDPINS  binary   8       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000038, 0x00000010, eOperationType.op_addpins, false); //        ADDPINS  binary   8       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_lt, true); //        <        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_lt, true); //        <        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_lt, true); //        <        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_lt, false); //        <        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000002, eOperationType.op_lt, false); //        <        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000002, 0x00000001, eOperationType.op_lt, false); //        <        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_flt, false); //        <.       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_flt, false); //        <.       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_flt, false); //        <.       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0xfffffffe, eOperationType.op_ltu, false); //        +<       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x80000000, eOperationType.op_ltu, false); //        +<       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x00000000, eOperationType.op_ltu, false); //        +<       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_lte, true); //        <=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_lte, true); //        <=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_lte, true); //        <=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_lte, false); //        <=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000002, eOperationType.op_lte, false); //        <=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000002, 0x00000001, eOperationType.op_lte, false); //        <=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_flte, false); //        <=.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_flte, false); //        <=.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_flte, false); //        <=.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf0000000, 0xf0000000, eOperationType.op_lteu, false); //        +<=      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf0000000, 0xff000000, eOperationType.op_lteu, false); //        +<=      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xf0000000, 0x00000000, eOperationType.op_lteu, false); //        +<=      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_e, true); //        ==       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_e, true); //        ==       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_e, true); //        ==       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_e, false); //        ==       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000002, eOperationType.op_e, false); //        ==       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000002, 0x00000001, eOperationType.op_e, false); //        ==       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_fe, false); //        ==.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_fe, false); //        ==.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_fe, false); //        ==.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_ne, true); //        <>       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_ne, true); //        <>       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_ne, true); //        <>       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_ne, false); //        <>       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000002, eOperationType.op_ne, false); //        <>       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000002, 0x00000001, eOperationType.op_ne, false); //        <>       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_fne, false); //        <>.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_fne, false); //        <>.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_fne, false); //        <>.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_gte, true); //        >=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_gte, true); //        >=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_gte, true); //        >=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_gte, false); //        >=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000002, eOperationType.op_gte, false); //        >=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000002, 0x00000001, eOperationType.op_gte, false); //        >=       binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_fgte, false); //        >=.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_fgte, false); //        >=.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_fgte, false); //        >=.      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x80000000, eOperationType.op_gteu, false); //        +>=      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x00000000, eOperationType.op_gteu, false); //        +>=      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x80000000, eOperationType.op_gteu, false); //        +>=      binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_gt, true); //        >        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_gt, true); //        >        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_gt, true); //        >        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_gt, false); //        >        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000002, eOperationType.op_gt, false); //        >        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000002, 0x00000001, eOperationType.op_gt, false); //        >        binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_fgt, false); //        >.       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x40000000, eOperationType.op_fgt, false); //        >.       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x40000000, 0x3f800000, eOperationType.op_fgt, false); //        >.       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x80000000, eOperationType.op_gtu, false); //        +>       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x7fffffff, 0x80000000, eOperationType.op_gtu, false); //        +>       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x80000000, 0x7fffffff, eOperationType.op_gtu, false); //        +>       binary   9       -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xbf800000, 0x3f800000, eOperationType.op_ltegt, true); //        <=>      binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0x3f800000, eOperationType.op_ltegt, true); //        <=>      binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x3f800000, 0xbf800000, eOperationType.op_ltegt, true); //        <=>      binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0xffffffff, 0x00000001, eOperationType.op_ltegt, false); //        <=>      binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_ltegt, false); //        <=>      binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0xffffffff, eOperationType.op_ltegt, false); //        <=>      binary   9       yes
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000000, eOperationType.op_lognot, false); //        !!, NOT  unary    10      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_lognot, false); //        !!, NOT  unary    10      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000000, eOperationType.op_logand, false); //        &&, AND  binary   11      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_logand, false); //        &&, AND  binary   11      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000001, 0x00000001, eOperationType.op_logxor, false); //        ^^, XOR  binary   12      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000001, eOperationType.op_logxor, false); //        ^^, XOR  binary   12      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000000, eOperationType.op_logor, false); //        ||, OR   binary   13      -
    resultStrings.push(reportResult);
    reportResult = this.executeTest(resolver, 0x00000000, 0x00000001, eOperationType.op_logor, false); //        ||, OR   binary   13      -
    resultStrings.push(reportResult);
    //
    //  END of generated tests  ^^^  Above HERE
    //

    // when all done, write our report
    this.writeResolverTestResults(dirName, fileName, resultStrings);
  }

  private executeTest(resolver: SpinResolver, parmA: number, parmB: number, operation: eOperationType, isFloatInConstExpression: boolean): string {
    let result32: number = 0xdeadf00d;
    try {
      result32 = resolver.regressionTestResolver(parmA, parmB, operation, isFloatInConstExpression);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.context.logger.compilerErrorMsg(`-ERROR-: ${error.message} --`);
      }
    }
    const reportResult: string = this.formatAnswer(result32, parmA, parmB, operation, isFloatInConstExpression);
    return reportResult;
  }
  private formatAnswer(result32: number, parmA: number, parmB: number, operation: eOperationType, isFloatInConstExpression: boolean): string {
    //  $xxxx_rrrr, $yyyy_vvvv, operation, fltflag = $0000_fffff
    const opName: string = eOperationType[operation];
    const floatInterp: string = isFloatInConstExpression ? ` flt ` : `     `;
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
