/* eslint-disable no-console */
'use strict';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
// Import the glob function specifically
//import { glob } from 'glob';

// Alternatively, if you want to use the synchronous version, you can do:
import { sync as globSync } from 'glob';
import { appendDiagnosticString, removeExistingFile, topLevel } from '../testUtils';

// test lives in <rootDir>/src/tests/SHORT
const testDirPath = path.resolve(__dirname, '../../../TEST/SHORT/tablesTESTs');
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

describe('PNut-ts generates correct table listings', () => {
  // Get all .spin2 files in the ./TEST/SHORT/tablesTESTs/ directory
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
      const reportFSpec = path.join(testDirPath, `${basename}.tabl`);
      // if the report file exists delete it before we start
      removeExistingFile(reportFSpec);

      const options: string = '--pass preprocess --regression tables -- ';
      try {
        execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
      } catch (error) {
        console.error(`Error running PNut-ts: ${error}`);
      }
      // Ensure the file exists after the test run
      if (!fs.existsSync(reportFSpec)) {
        fail(`PNut-ts: Failed to write output file [${reportFSpec}]`);
      }
      // Read the generated output file
      const reportContentLines = fs.readFileSync(reportFSpec, 'utf8').split('\n');
      const reportDebugFSpec = path.join(testDirPath, `${basename}.tabl.txt`);
      // if the diagnostic file exists delete it before we start
      removeExistingFile(reportDebugFSpec);

      // Read the golden file
      const goldenFSpec = path.join(testDirPath, `${basename}.tabl.GOLD`);
      const goldenContentLines = fs.readFileSync(goldenFSpec, 'utf8').split('\n');
      const goldenDebugFSpec = path.join(testDirPath, `${basename}.tabl.GOLD.txt`);
      // if the diagnostic file exists delete it before we start
      removeExistingFile(goldenDebugFSpec);

      // Compare the output to the golden file, ignoring lines that start with
      //  '#' which are comments
      //  ';' which are comments
      //  'type_end_file' which is a type new to PNut-ts
      //  'unused' which are unused in Pnut

      const stringsToExclude = ['#', ';', 'type_end_file', 'unused'];

      const reportFiltered = reportContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));
      const goldenFiltered = goldenContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));
      // Compare the output to the golden file
      let whatFailed: string = '';
      if (reportFiltered.join('\n') === goldenFiltered.join('\n')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } else {
        fs.writeFileSync(reportDebugFSpec, reportFiltered.join('\n'));
        fs.writeFileSync(goldenDebugFSpec, goldenFiltered.join('\n'));
        if (reportFiltered.length != goldenFiltered.length) {
          console.error(`Files are different lengths (${reportFiltered.length}) vs (${goldenFiltered.length})`);
        }
        const nbrLines: number = reportFiltered.length > goldenFiltered.length ? reportFiltered.length : goldenFiltered.length;
        let maxDiffLines: number = 4;
        for (let index = 0; index < nbrLines; index++) {
          const rptLine = reportFiltered[index];
          const goldLine = goldenFiltered[index];
          if (maxDiffLines > 0 && rptLine !== goldLine) {
            console.error(`(${index + 1}): [${rptLine}] vs [${goldLine}]`);
            maxDiffLines--;
          }
        }
        whatFailed = appendDiagnosticString(whatFailed, '.tabl Files', ', ');
      }

      //console.log(`Pass count: ${passCount}`);
      //console.log(`Fail list: ${failList}`);

      // Expect all tests to pass
      if (whatFailed.length > 0) {
        whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
      }
      expect(whatFailed).toBe('');
    });
  });
});
