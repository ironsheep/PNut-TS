/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const topLevel: string = path.join(path.sep, 'workspaces', path.sep, 'Pnut-ts-dev', path.sep);

export function generateFileHash(filePath: string): string {
  // Function to generate an MD5 hash of a file's contents
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function compareObjOrBinFiles(outputFSpec: string, goldenFSpec: string): boolean {
  let filesMatchStatus: boolean = false;
  let inputFileCount: number = 0;
  if (fs.existsSync(outputFSpec)) {
    inputFileCount++;
  } else {
    console.error(`ERROR: missing compile output [${outputFSpec}]`);
  }
  if (fs.existsSync(goldenFSpec)) {
    inputFileCount++;
  } else {
    console.error(`ERROR: missing GOLDEN output [${goldenFSpec}]`);
  }
  if (inputFileCount == 2) {
    const file1Hash = generateFileHash(outputFSpec);
    const file2Hash = generateFileHash(goldenFSpec);
    filesMatchStatus = file1Hash === file2Hash;
  }
  return filesMatchStatus;
}

export function compareListingFiles(reportFSpec: string, goldenFSpec: string): boolean {
  let filesMatchStatus: boolean = false;
  let inputFileCount: number = 0;
  if (fs.existsSync(reportFSpec)) {
    inputFileCount++;
  } else {
    console.error(`ERROR: missing compile output [${reportFSpec}]`);
  }
  if (fs.existsSync(goldenFSpec)) {
    inputFileCount++;
  } else {
    console.error(`ERROR: missing GOLDEN output [${goldenFSpec}]`);
  }
  if (inputFileCount == 2) {
    // Read the report file and split into lines
    const reportContentLines = fs.readFileSync(reportFSpec, 'utf8').split(/\s*\r?\n/);
    // Read the golden file and split into lines
    const goldenContentLines = fs.readFileSync(goldenFSpec, 'utf8').split(/\s*\r\n|\s*\r/);

    // Strings to exclude from comparison
    const stringsToExclude = ['Redundant OBJ '];

    // Filter out lines based on exclusion criteria
    const reportFiltered = reportContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));
    const goldenFiltered = goldenContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));

    // Compare the filtered content of both files
    // NOPE, not good enough:  filesMatchStatus = reportFiltered.join('\n') === goldenFiltered.join('\n');
    filesMatchStatus = reportFiltered.length == reportFiltered.length;
    if (filesMatchStatus == true) {
      // line count is SAME, now do more detaile match
      filesMatchStatus = compareConFloatValues(reportFiltered, goldenFiltered);
    }
    //if (filesMatchStatus == false) {
    //const listingFName = path.basename(reportFSpec);
    //const goldFName = path.basename(goldenFSpec);
    //console.error(`ERROR: don't match: [${listingFName}](${reportFiltered.length}) <=> [${goldFName}](${goldenFiltered.length})`);
    /*
      for (let index = 0; index < 5; index++) {
        const lhs: string = reportContentLines[index];
        const rhs: string = goldenContentLines[index];
        console.log(`lhs=[${lhs}](${lhs.length}), rhs[${rhs}](${rhs.length})`);
      }
      */
    //}
  }
  return filesMatchStatus;
}

function compareConFloatValues(compileLines: string[], goldenLines: string[]): boolean {
  let matchStatus: boolean = false;
  if (compileLines.length == goldenLines.length) {
    for (let index = 0; index < compileLines.length; index++) {
      const compLine: string = compileLines[index];
      const goldLine: string = goldenLines[index];
      matchStatus = compLine === goldLine;
      if (compLine.includes('CON_FLOAT')) {
        // diff float hex strings (can be +/- 1)
        // LHS:  TYPE: CON_FLOAT       VALUE: 40C90FDB          NAME: TWOPI (...FDB, ...FDA or ...FD9 should pass!)
        // RHS:  TYPE: CON_FLOAT       VALUE: 40C90FDA          NAME: TWOPI
        // Regular expression to extract TYPE, VALUE, and NAME
        const regex = /TYPE:\s*(\w+)\s+VALUE:\s*([0-9A-F]+)\s+NAME:\s*(\w+)/;

        // Extracting information from both lines
        const goldMatch = goldLine.match(regex);
        const compMatch = compLine.match(regex);
        if (goldMatch !== null && compMatch !== null) {
          // have good match values, let's see what we have

          // Destructuring to get TYPE, VALUE, and NAME from matches
          const [, goldType, goldValue, goldName] = goldMatch;
          const [, compType, compValue, compName] = compMatch;

          // Compare TYPE and NAME for equality
          if (goldType === compType && goldName === compName) {
            // have matching type and name, now check values

            // Convert VALUE from hex string to number and compare within +/- 1 range
            const goldValueNum = parseInt(goldValue, 16);
            const compValueNum = parseInt(compValue, 16);

            matchStatus = Math.abs(goldValueNum - compValueNum) <= 1;
          }
        }
      } else if (compLine.includes('CLKMODE_')) {
        // diff strings: this pair can pass ( our compiler has diff default clock value)
        // LHS:  TYPE: CON             VALUE: 0000000A          NAME: CLKMODE_ (0000000A should pass when other is 00000000)
        // RHS:  TYPE: CON             VALUE: 00000000          NAME: CLKMODE_
        const regex = /TYPE:\s*(\w+)\s*VALUE:\s*([0-9A-F]+)\s*NAME:\s*(\w+)/;
        const goldMatch = goldLine.match(regex);
        const compMatch = compLine.match(regex);
        if (goldMatch !== null && compMatch !== null) {
          // have good match values, let's see what we have

          // Destructuring to get TYPE, VALUE, and NAME from matches
          const [, goldType, goldValue, goldName] = goldMatch;
          const [, compType, compValue, compName] = compMatch;

          // Compare TYPE and NAME for equality
          if (goldType === compType && goldName === compName) {
            // have matching type and name, now check values

            // ensure we have expected values
            matchStatus = compValue === goldValue || (compValue === '0000000A' && goldValue === '00000000');
            //console.log(
            //  ` -- name=[${compName},${goldName}], type=[${compType},${goldType}], value=[${compValue},${goldValue}], matchStatus=(${matchStatus})`
            //);
          }
        }
      } else if (compLine.includes('CLKMODE:')) {
        // diff strings: this pair can pass ( our compiler has diff default clock value)
        // LHS:  CLKMODE:   $0000000A ($0000000A should pass when other is $00000000)
        // RHS:  CLKMODE:   $00000000
        const regex = /([A-Z]+):\s*\$(\w+)/;
        const goldMatch = goldLine.match(regex);
        const compMatch = compLine.match(regex);
        if (goldMatch !== null && compMatch !== null) {
          // have good match values, let's see what we have

          // Destructuring to get TYPE, VALUE, and NAME from matches
          const [, goldName, goldValue] = goldMatch;
          const [, compName, compValue] = compMatch;

          // Compare NAME for equality
          if (goldName === compName) {
            // have matching type and name, now check values

            // ensure we have expected values, less the '$'
            matchStatus = compValue === goldValue || (compValue === '0000000A' && goldValue === '00000000');
            //console.log(` -- name=[${compName},${goldName}], value=[${compValue},${goldValue}], matchStatus=(${matchStatus})`);
          }
        }
      } else if (compLine.includes('XINFREQ:')) {
        // diff strings: this pair can pass ( our compiler has diff default clock value)
        // LHS:  XINFREQ:  20,000,000 (20,000,000 should pass when other is 0)
        // RHS:  XINFREQ:           0
        const regex = /([A-Z]+):\s*([0-9,]+)/;
        const goldMatch = goldLine.match(regex);
        const compMatch = compLine.match(regex);
        if (goldMatch !== null && compMatch !== null) {
          // have good match values, let's see what we have

          // Destructuring to get TYPE, VALUE, and NAME from matches
          const [, goldName, goldValue] = goldMatch;
          const [, compName, compValue] = compMatch;

          // Compare NAME for equality
          if (goldName === compName) {
            // have matching type and name, now check values

            // ensure we have expected values
            matchStatus = compValue === goldValue || (compValue === '20,000,000' && goldValue === '0');
            //console.log(` -- name=[${compName},${goldName}], value=[${compValue},${goldValue}], matchStatus=(${matchStatus})`);
          }
        }
      }
      if (matchStatus == false) {
        // on first non-match, break! we have answer
        break;
      }
    }
  }
  return matchStatus;
}

export function removeExistingFile(fileSpec: string) {
  if (fs.existsSync(fileSpec)) {
    fs.unlinkSync(fileSpec);
  }
}
