/* eslint-disable no-console */
'use strict';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
// Import the glob function specifically
//import { glob } from 'glob';

// Alternatively, if you want to use the synchronous version, you can do:
import { sync as globSync } from 'glob';
import { appendDiagnosticString, compareListingFiles, compareObjOrBinFiles, removeExistingFile, topLevel } from '../testUtils';

// test lives in <rootDir>/src/tests/FULL
const testDirPath = path.resolve(__dirname, '../../../TEST/COV-tests');
const toolPath = path.resolve(__dirname, '../../../dist');

const directories = [
  {
    name: 'Test directory',
    path: testDirPath,
    relFolder: testDirPath.replace(topLevel, './')
  },
  {
    name: 'Tool directory',
    path: toolPath,
    relFolder: toolPath.replace(topLevel, './')
  }
];

// Files that use debug() without matching the debug_/isp_/coverage_debug_ prefix.
// Must agree with the -PerFileFlag list in TEST/COV-tests/rebuild-gold.ps1, which
// is how their Windows GOLDs were built (-cd).
const debugByFile: string[] = ['coverage_clock_003'];

function listFixtures(pattern: string): string[] {
  let files: string[] = [];
  try {
    files = globSync(`${testDirPath}/${pattern}`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }
  // Filter out files that match the *__pre.spin2 pattern (-i output files)
  files = files.filter((file) => !file.endsWith('__pre.spin2') && !file.endsWith('-pre.spin2'));
  if (files.length > 1) {
    files.sort();
  }
  return files;
}

function compileAndCompare(file: string, isDebugGroup: boolean) {
  const basename = path.basename(file, '.spin2');

  const listingFSpec = path.join(testDirPath, `${basename}.lst`);
  const objectFSpec = path.join(testDirPath, `${basename}.obj`);
  const binaryFSpec = path.join(testDirPath, `${basename}.bin`);
  const elementsFSpec = path.join(testDirPath, `${basename}.elem`);

  // Remove existing files
  removeExistingFile(listingFSpec);
  removeExistingFile(objectFSpec);
  removeExistingFile(binaryFSpec);
  removeExistingFile(elementsFSpec);

  const args: string[] = ['-v', '-l'];
  if (isDebugGroup || debugByFile.includes(basename)) {
    args.push('-d');
  }
  args.push('-O', '--regression', 'element', '--');

  // compile our file generating output files
  try {
    execSync(`node ${toolPath}/pnut-ts.js ${args.join(' ')} ${file}`);
  } catch (error) {
    console.error(`ERROR: running PNut-ts: ${error}`);
    fail(`Execution failed for ${file}`);
  }

  let whatFailed: string = '';
  // Compare listing files
  const goldenFSpec = path.join(testDirPath, `${basename}.lst.GOLD`);
  if (!compareListingFiles(listingFSpec, goldenFSpec)) {
    whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
  }

  // Compare object and binary files byte-for-byte.
  const goldenObjFSpec = path.join(testDirPath, `${basename}.obj.GOLD`);
  if (!compareObjOrBinFiles(objectFSpec, goldenObjFSpec)) {
    whatFailed = appendDiagnosticString(whatFailed, 'Object Files', ', ');
  }
  const goldenBinFSpec = path.join(testDirPath, `${basename}.bin.GOLD`);
  if (!compareObjOrBinFiles(binaryFSpec, goldenBinFSpec)) {
    whatFailed = appendDiagnosticString(whatFailed, 'Binary Files', ', ');
  }

  if (whatFailed.length > 0) {
    whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
  }
  expect(whatFailed).toBe('');
}

// Fixtures committed ahead of their Windows GOLD regeneration. Named, not
// inferred from a missing GOLD: any other fixture without GOLDs must fail, so a
// lost GOLD cannot pass silently. Remove a name once its GOLDs are committed.
const PENDING_WINDOWS_GOLDS: string[] = [];

function testOrPending(file: string): jest.It {
  const basename = path.basename(file, '.spin2');
  return PENDING_WINDOWS_GOLDS.includes(basename) ? test.skip : test;
}

describe('Directory existence tests', () => {
  test.each(directories)('$relFolder should exist', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

describe('PNut_ts builds our COV non-debug() test files correctly', () => {
  const files: string[] = listFixtures('!(debug_|isp_|coverage_debug_)*.spin2');
  files.forEach((file) => {
    testOrPending(file)(`Compile file: ${path.basename(file)}`, () => {
      compileAndCompare(file, false);
    });
  });
});

describe('PNut_ts builds our COV debug() test files correctly', () => {
  const files: string[] = listFixtures('{debug_,isp_,coverage_debug_}*.spin2');
  files.forEach((file) => {
    testOrPending(file)(`Compile file: ${path.basename(file)}`, () => {
      compileAndCompare(file, true);
    });
  });
});
