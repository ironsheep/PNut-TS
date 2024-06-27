/* eslint-disable no-console */
'use strict';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
// Import the glob function specifically
//import { glob } from 'glob';

// Alternatively, if you want to use the synchronous version, you can do:
import { sync as globSync } from 'glob';
import { compareListingFiles, compareObjOrBinFiles, removeExistingFile } from '../testUtils';

// test lives in <rootDir>/src/tests/FULL
const dirPath = path.resolve(__dirname, '../../../TEST/DAT-PASM-tests');
const toolPath = path.resolve(__dirname, '../../../dist');

describe('Test directory existence', () => {
  test('Test directory should exist', () => {
    //console.log(`LOG dirPath=[${dirPath}]`);

    if (!fs.existsSync(dirPath)) {
      throw new Error(`Test directory does not exist: ${dirPath}`);
    }
  });
});

describe('Tool directory existence', () => {
  test('Tool directory should exist', () => {
    //console.log(`LOG dirPath=[${dirPath}]`);

    if (!fs.existsSync(toolPath)) {
      throw new Error(`Tool directory does not exist: ${toolPath}`);
    }
  });
});

describe('PNut_ts compiles .spin2 DAT-PASM correctly', () => {
  let files: string[] = [];

  try {
    files = globSync(`${dirPath}/*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }

  if (files.length > 1) {
    files.sort();
  }

  files.forEach((file) => {
    test(`Test for file: ${path.basename(file)}`, () => {
      const options: string = '-v -l -O --regression element --';
      const basename = path.basename(file, '.spin2');

      const listingFSpec = path.join(dirPath, `${basename}.lst`);
      const objectFSpec = path.join(dirPath, `${basename}.obj`);
      const binaryFSpec = path.join(dirPath, `${basename}.bin`);
      const elementsFSpec = path.join(dirPath, `${basename}.elem`);

      // Remove existing files
      removeExistingFile(listingFSpec);
      removeExistingFile(objectFSpec);
      removeExistingFile(binaryFSpec);
      removeExistingFile(elementsFSpec);

      // compile our file generating output files
      try {
        execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
      } catch (error) {
        console.error(`ERROR: running PNut-TS: ${error}`);
        fail(`Execution failed for ${file}`);
      }

      // count the number of matching outputs, should be 3!
      let whatFailed: string = '';
      // ID the golden listing file
      const goldenFSpec = path.join(dirPath, `${basename}.lst.GOLD`);
      // Compare listing files
      let filesMatch: boolean = compareListingFiles(listingFSpec, goldenFSpec);
      if (!filesMatch) {
        whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
      }

      // ID the golden .obj file
      const goldenObjFSpec = path.join(dirPath, `${basename}.obj.GOLD`);
      // Compare object files
      filesMatch = compareObjOrBinFiles(objectFSpec, goldenObjFSpec);
      if (!filesMatch) {
        whatFailed = appendDiagnosticString(whatFailed, 'Object Files', ', ');
      }

      // ID the golden .bin file
      const goldenBinFSpec = path.join(dirPath, `${basename}.bin.GOLD`);
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

function appendDiagnosticString(origString: string, appendString: string, separator: string): string {
  let longerString: string = appendString;
  if (origString.length > 0) {
    longerString = `${origString}${separator}${appendString}`;
  }
  return longerString;
}

/*
test('CLI generates correct preProcessor output', () => {
  // Get all .spin2 files in the ./TEST/element/ directory

  const files = glob.sync(`${dirPath}/*.spin2`);

  let passCount = 0;
  const failList = [];
  const options: string = '-c -v -l --log resolver parser --regression element -v --';

  // Iterate over each .spin2 file
  for (const file of files) {
    // Run the CLI with the input file
    const basename = path.basename(file, '.spin2');
    const reportFSpec = path.join(dirPath, `${basename}.pre`);
    // if the report file exists delete it before we start
    if (fs.existsSync(reportFSpec)) {
      fs.unlinkSync(reportFSpec);
    }

    try {
      execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
    } catch (error) {
      console.error(`Error running PNut-TS: ${error}`);
    }
    // Read the generated output file
    // remove newlines and trailing whitespace on each line
    const reportContentLines = fs.readFileSync(reportFSpec, 'utf8').split(/\s?\n/);

    // Read the golden file
    const goldenFSpec = path.join(dirPath, `${basename}.lst.GOLD`);
    // remove newlines and trailing whitespace on each line
    const goldenContentLines = fs.readFileSync(goldenFSpec, 'utf8').split(/\s?\n/);

    // Compare the output to the golden file, ignoring lines that start with
    //  '#' which are comments
    //  ';' which are comments
    //  'type_end_file' which is a type new to Pnut_TS
    //  'unused' which are unused in Pnut

    const stringsToExclude = ['#', "'"];

    const reportFiltered = reportContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));
    const goldenFiltered = goldenContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));

    // Compare the output to the golden file
    if (reportFiltered.join('\n') === goldenFiltered.join('\n')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passCount++;
    } else {
      failList.push(file);
    }
  }

  for (let index = 0; index < failList.length; index++) {
    const fileName = failList[index];
    console.log(`-FAIL(#${index + 1}): [${fileName}]`);
  }
  //console.log(`Pass count: ${passCount}`);
  //console.log(`Fail list: ${failList}`);

  // Expect all tests to pass
  expect(failList.length).toBe(0);
});
*/
