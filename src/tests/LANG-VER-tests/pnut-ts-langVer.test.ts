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
const testDirPath = path.resolve(__dirname, '../../../TEST/LANG-VER-tests');
const toolPath = path.resolve(__dirname, '../../../dist');

const directories = [
  { name: 'Test directory', path: testDirPath, relFolder: testDirPath.replace(topLevel, './') },
  { name: 'Tool directory', path: toolPath, relFolder: toolPath.replace(topLevel, './') }
];

// Files that should be compiled without -d flag (no debug() statements and GOLD generated without -d)
const noDebugFiles = ['spin_builtin_math_v51.spin2'];

// Helper function to check if a file should use debug flag
function fileUsesDebugFlag(filePath: string): boolean {
  const basename = path.basename(filePath);
  return !noDebugFiles.includes(basename);
}

// Helper function to run compilation test
function runCompilationTest(file: string, useDebug: boolean): void {
  const options: string = useDebug ? '-d -v -l -O --regression element --' : '-v -l -O --regression element --';
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

  // compile our file generating output files
  try {
    execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
  } catch (error) {
    console.error(`ERROR: running PNut-ts: ${error}`);
    throw new Error(`Execution failed for ${file}: ${error}`);
  }

  // count the number of matching outputs, should be 3!
  let whatFailed: string = '';
  // ID the golden listing file
  const goldenFSpec = path.join(testDirPath, `${basename}.lst.GOLD`);
  // Compare listing files
  let filesMatch: boolean = compareListingFiles(listingFSpec, goldenFSpec);
  if (!filesMatch) {
    whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
  }

  // ID the golden .obj file
  const goldenObjFSpec = path.join(testDirPath, `${basename}.obj.GOLD`);
  // Compare object files
  filesMatch = compareObjOrBinFiles(objectFSpec, goldenObjFSpec);
  if (!filesMatch) {
    whatFailed = appendDiagnosticString(whatFailed, 'Object Files', ', ');
  }

  // ID the golden .bin file
  const goldenBinFSpec = path.join(testDirPath, `${basename}.bin.GOLD`);
  // Compare binary files
  filesMatch = compareObjOrBinFiles(binaryFSpec, goldenBinFSpec);
  if (!filesMatch) {
    whatFailed = appendDiagnosticString(whatFailed, 'Binary Files', ', ');
  }

  if (whatFailed.length > 0) {
    whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
  }
  expect(whatFailed).toBe('');
}

// Get all test files
let allFiles: string[] = [];
try {
  allFiles = globSync(`${testDirPath}/*.spin2`);
} catch (error) {
  console.error('ERROR: glob issue:', error);
}
// Filter out files that match the *__pre.spin2 pattern (-i output files)
allFiles = allFiles.filter((file) => !file.endsWith('__pre.spin2') && !file.endsWith('-pre.spin2'));
if (allFiles.length > 1) {
  allFiles.sort();
}

// Separate files into debug and non-debug
const debugFiles = allFiles.filter((file) => fileUsesDebugFlag(file));
const nonDebugFiles = allFiles.filter((file) => !fileUsesDebugFlag(file));

describe('Directory existence tests', () => {
  test.each(directories)('Directory exists: $relFolder', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

describe('PNut_ts compiles .spin2 w/debug() correctly', () => {
  debugFiles.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, () => {
      runCompilationTest(file, true);
    });
  });
});

describe('PNut_ts compiles .spin2 w/o debug() correctly', () => {
  nonDebugFiles.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, () => {
      runCompilationTest(file, false);
    });
  });
});
