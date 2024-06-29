/* eslint-disable no-console */
'use strict';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
// Import the glob function specifically
//import { glob } from 'glob';

// Alternatively, if you want to use the synchronous version, you can do:
import { sync as globSync } from 'glob';
import { appendDiagnosticString, compareListingFiles, removeExistingFile, topLevel } from '../testUtils';

// test lives in <rootDir>/src/tests/FULL
const testDirPath = path.resolve(__dirname, '../../../TEST/FULL/preprocessTESTs');
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

describe('PNut_ts generates correct preProcessor output', () => {
  // Get all .spin2 files in the ./TEST/element/ directory
  let files: string[] = [];
  try {
    files = globSync(`${testDirPath}/*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }
  if (files.length > 1) {
    files.sort();
  }

  // Iterate over each .spin2 file
  files.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, () => {
      // Run the CLI with the input file
      const basename = path.basename(file, '.spin2');
      const reportFSpec = path.join(testDirPath, `${basename}.pre`);
      // ID the golden listing file
      const goldenFSpec = path.join(testDirPath, `${basename}.pre.GOLD`);

      // if the report file exists delete it before we start
      removeExistingFile(reportFSpec);

      const options: string = ' -I inc --regression preproc --';
      try {
        execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
      } catch (error) {
        console.error(`Error running PNut-ts: ${error}`);
      }
      // Compare the output to the golden file, ignoring lines that start with
      //  '#' which are comments
      //  ';' which are comments
      //  'type_end_file' which is a type new to PNut-ts
      //  'unused' which are unused in Pnut

      const stringsToExclude = ['#', "'"];

      let whatFailed: string = '';
      // Compare listing files
      const filesMatch: boolean = compareListingFiles(reportFSpec, goldenFSpec, stringsToExclude);
      if (!filesMatch) {
        whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
      }

      // if we have findings adjust result string and report it
      if (whatFailed.length > 0) {
        whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
      }
      expect(whatFailed).toBe('');
    });
  });
});
