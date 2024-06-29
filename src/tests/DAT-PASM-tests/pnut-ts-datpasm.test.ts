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
const testDirPath = path.resolve(__dirname, '../../../TEST/DAT-PASM-tests');
const toolPath = path.resolve(__dirname, '../../../dist');

const directories = [
  { name: 'Test directory', path: testDirPath, relFolder: testDirPath.replace(topLevel, './') },
  { name: 'Tool directory', path: toolPath, relFolder: toolPath.replace(topLevel, './') }
];

describe('Directory existence tests', () => {
  test.each(directories)('Directory exists: $relFolder', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

describe('PNut_ts compiles .spin2 DAT-PASM correctly', () => {
  let files: string[] = [];

  try {
    files = globSync(`${testDirPath}/*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }

  if (files.length > 1) {
    files.sort();
  }

  files.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, () => {
      const options: string = '-v -l -O --regression element --';
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
        fail(`Execution failed for ${file}`);
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
    });
  });
});
