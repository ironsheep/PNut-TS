/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const topLevel: string = path.join(path.sep, 'workspaces', path.sep, 'Pnut-ts-dev', path.sep);

export async function delay_mSec(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if all files in a list exist, polling every 500ms, for up to 5 minutes.
 * @param fileSpecs Array of file paths to check.
 * @returns Promise that resolves to a boolean indicating if all files are present.
 */

export async function waitForFiles(fileSpecs: string[]): Promise<boolean> {
  //console.log(`* waitForFiles([${fileSpecs.join(', ')}])`);
  const maxAttempts = 600; // 5 minutes / 500ms

  let foundAllFilesStatus: boolean = false;
  let attempts = 0;
  while (attempts < maxAttempts) {
    let allFilesPresentStatus: boolean = true;
    for (let index = 0; index < fileSpecs.length; index++) {
      const fileSpec = fileSpecs[index];
      if (!fs.existsSync(fileSpec)) {
        allFilesPresentStatus = false;
        break;
      }
    }
    if (allFilesPresentStatus) {
      foundAllFilesStatus = true;
      break;
    }
    await delay_mSec(500); // Wait for 500ms before checking again
    attempts++;
  }

  return foundAllFilesStatus; // Timeout reached without finding all files
}

export function generateFileHash(filePath: string): string {
  // Function to generate an MD5 hash of a file's contents
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function removeFileIfEmpty(fileSpec: string) {
  if (fileExists(fileSpec)) {
    const stats = fs.statSync(fileSpec);
    if (stats.size == 0) {
      removeExistingFile(fileSpec);
    }
  }
}

export function fileEmpty(fileSpec: string): boolean {
  let emptyFileStatus: boolean = true;
  if (fileExists(fileSpec)) {
    const stats = fs.statSync(fileSpec);
    if (stats.size > 0) {
      emptyFileStatus = false;
    }
  }
  return emptyFileStatus;
}

export function fileExists(fileSpec: string): boolean {
  const fileFoundStatus: boolean = fs.existsSync(fileSpec);
  //console.log(`testUtils: fileExists([${fileSpec}]) -> (${fileFoundStatus})`);
  return fileFoundStatus;
}

/**
 * Compare a generated .obj/.bin/.flash image against its GOLD, byte for byte.
 *
 * A GOLD is PNut's exact output, so no difference is tolerated: an earlier
 * version accepted a +/-1 difference in any 4-byte window, which let wrong
 * compile-time float constants pass. On mismatch the first differing byte is
 * reported.
 */
export function compareObjOrBinFiles(outputFSpec: string, goldenFSpec: string): boolean {
  if (!fs.existsSync(outputFSpec)) {
    console.error(`ERROR: missing compile output [${outputFSpec}]`);
    return false;
  }
  if (!fs.existsSync(goldenFSpec)) {
    console.error(`ERROR: missing GOLDEN output [${goldenFSpec}]`);
    return false;
  }
  const outputBuffer = fs.readFileSync(outputFSpec);
  const goldenBuffer = fs.readFileSync(goldenFSpec);
  const filesMatch: boolean = outputBuffer.equals(goldenBuffer);
  if (!filesMatch) {
    let firstDiff: number = Math.min(outputBuffer.length, goldenBuffer.length);
    for (let index = 0; index < firstDiff; index++) {
      if (outputBuffer[index] !== goldenBuffer[index]) {
        firstDiff = index;
        break;
      }
    }
    const byteText = (buffer: Buffer): string =>
      firstDiff < buffer.length ? `$${buffer[firstDiff].toString(16).toUpperCase().padStart(2, '0')}` : 'EOF';
    console.error(
      `ERROR: [${path.basename(outputFSpec)}](${outputBuffer.length}) <=> [${path.basename(goldenFSpec)}](${goldenBuffer.length}) first difference at byte ${firstDiff}: ${byteText(outputBuffer)} <=> ${byteText(goldenBuffer)}`
    );
  }
  return filesMatch;
}

export function compareExceptionFiles(reportFSpec: string, goldenFSpec: string): boolean {
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

    // Remove empty lines at the end
    while (reportContentLines.length > 0 && reportContentLines[reportContentLines.length - 1].trim() === '') {
      reportContentLines.pop();
    }
    while (goldenContentLines.length > 0 && goldenContentLines[goldenContentLines.length - 1].trim() === '') {
      goldenContentLines.pop();
    }

    // Function to normalize error lines for comparison
    const normalizeErrorLine = (line: string): string => {
      // Remove patterns like (m123) or (m1234) at the end of error messages
      let normalized = line.replace(/\s*\(m\d+\)\s*$/, '');

      // Normalize paths - extract just the filename and line number portion
      // Match patterns like /any/path/filename.spin2:line:error:message
      // or C:\any\path\filename.spin2:line:error:message
      // Warnings carry the same shape and need the same treatment: without it a
      // fixture whose GOLD contains a warning would have to record one machine's
      // absolute path and would fail everywhere else.
      const errorPattern = /^.*[/\\]([^/\\]+\.spin2:\d+:(?:error|warning):.*)$/;
      const match = normalized.match(errorPattern);
      if (match) {
        normalized = match[1]; // Just keep filename.spin2:line:error:message
      }
      // Trim any trailing whitespace
      normalized = normalized.trim();

      return normalized;
    };

    // Only log details when there's a problem
    const debugComparison = false; // Set to true for debugging

    // Compare the filtered content of both files
    filesMatchStatus = reportContentLines.length == goldenContentLines.length;
    if (filesMatchStatus == true) {
      // line count is SAME, now do more detailed match
      // Compare each line individually, normalizing paths and stripping location markers
      for (let i = 0; i < reportContentLines.length; i++) {
        const reportLineNormalized = normalizeErrorLine(reportContentLines[i]);
        const goldenLineNormalized = normalizeErrorLine(goldenContentLines[i]);

        if (reportLineNormalized !== goldenLineNormalized) {
          console.log(`compareExceptionFiles: Mismatch at line ${i}:`);
          console.log(`  Report: [${reportContentLines[i]}]`);
          console.log(`  Golden: [${goldenContentLines[i]}]`);
          console.log(`  Report normalized: [${reportLineNormalized}]`);
          console.log(`  Golden normalized: [${goldenLineNormalized}]`);
          filesMatchStatus = false;
          break;
        }
      }
      if (filesMatchStatus && debugComparison) {
        console.log(`compareExceptionFiles: All ${reportContentLines.length} lines match`);
      }
    } else {
      console.log(`compareExceptionFiles: Line count mismatch: report=${reportContentLines.length}, golden=${goldenContentLines.length}`);
    }
  }
  return filesMatchStatus;
}

/**
 * Compare a generated listing (or preprocessor report) against its GOLD.
 *
 * Lines are compared exactly after trimming each line and dropping blank lines
 * (EOL and indentation normalization only). Lines starting with any of the
 * exclusion strings are dropped from both sides before comparing. No value
 * tolerance is applied: an earlier version accepted +/-1 in symbol values and in
 * any 4-byte window of the hex dump, which let wrong compile-time float
 * constants pass. On mismatch the first differing line is reported.
 */
export function compareListingFiles(reportFSpec: string, goldenFSpec: string, stringsToExlude?: string[]): boolean {
  if (!fs.existsSync(reportFSpec)) {
    console.error(`ERROR: missing compile output [${reportFSpec}]`);
    return false;
  }
  if (!fs.existsSync(goldenFSpec)) {
    console.error(`ERROR: missing GOLDEN output [${goldenFSpec}]`);
    return false;
  }
  // Strings to exclude from comparison - includes old and new formats
  const filterStrings: string[] =
    stringsToExlude !== undefined
      ? stringsToExlude
      : [
          'Redundant OBJ bytes removed',
          'Early deduplication bytes saved',
          'Distiller optimization bytes saved',
          'Total redundant OBJ bytes removed',
          'DEBUG records:',
          'DEBUG data:'
        ];
  const loadLines = (fileSpec: string): string[] =>
    fs
      .readFileSync(fileSpec, 'utf8')
      .split(/\r\n|\r|\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !filterStrings.some((excludeString) => line.startsWith(excludeString)));
  const reportLines: string[] = loadLines(reportFSpec);
  const goldenLines: string[] = loadLines(goldenFSpec);

  let filesMatchStatus: boolean = true;
  const lineCount: number = Math.max(reportLines.length, goldenLines.length);
  for (let index = 0; index < lineCount; index++) {
    if (reportLines[index] !== goldenLines[index]) {
      filesMatchStatus = false;
      console.error(
        `ERROR: don't match: [${path.basename(reportFSpec)}](${reportLines.length}) <=> [${path.basename(goldenFSpec)}](${goldenLines.length}) first difference at line ${index}:`
      );
      console.error(`    Report: [${reportLines[index] ?? '<EOF>'}]`);
      console.error(`    Golden: [${goldenLines[index] ?? '<EOF>'}]`);
      break;
    }
  }
  return filesMatchStatus;
}

export function removeExistingFiles(fileSpecList: string[]) {
  for (let index = 0; index < fileSpecList.length; index++) {
    const fileSpec = fileSpecList[index];
    if (fs.existsSync(fileSpec)) {
      fs.unlinkSync(fileSpec);
    }
  }
}

export function removeExistingFile(fileSpec: string) {
  if (fs.existsSync(fileSpec)) {
    fs.unlinkSync(fileSpec);
  }
}

export function appendDiagnosticString(origString: string, appendString: string, separator: string): string {
  let longerString: string = appendString;
  if (origString.length > 0) {
    longerString = `${origString}${separator}${appendString}`;
  }
  return longerString;
}

/**
 * Is this stderr chunk a Node.js internal warning rather than compiler output?
 *
 * The test suites capture stderr into .errout files that are compared against
 * .errout.GOLD (or treated as "exception generated" when non-empty). Node writes
 * its own process warnings -- deprecations, EventEmitter leak warnings, experimental
 * feature notices -- to that same stream, which would otherwise pollute every
 * fixture's captured output at once. Warnings are recognizable by Node's fixed
 * "(node:<pid>) SomethingWarning:" prefix and the trailing "(Use `node --trace-...)"
 * hint; neither shape can be produced by the compiler's own diagnostics.
 */
export function isNodeInternalWarning(chunkText: string): boolean {
  return /^\(node:\d+\)\s+\S*Warning:/.test(chunkText) || /^\(Use `node --trace-/.test(chunkText);
}

/**
 * Which of these filespecs exist? Used to assert that artifacts are ABSENT.
 *
 * A negative fixture -- one that is expected to fail to compile -- must not only
 * produce the right diagnostic, it must leave no build products behind. Checking
 * only that the expected files appeared would let a stale or wrongly-produced
 * .bin sit next to a correct error message and go unnoticed, which is exactly the
 * failure the delete-outputs-on-failure work exists to prevent.
 */
export function filesThatExist(fileSpecList: string[]): string[] {
  return fileSpecList.filter((fileSpec) => fs.existsSync(fileSpec));
}
