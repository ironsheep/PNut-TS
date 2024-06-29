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
const testDirPath = path.resolve(__dirname, '../../../TEST/SHORT/elementizerTESTs');
const toolPath = path.resolve(__dirname, '../../../out');

const directories = [
  { name: 'Test directory', path: testDirPath, relFolder: testDirPath.replace(topLevel, './') },
  { name: 'Tool directory', path: toolPath, relFolder: toolPath.replace(topLevel, './') }
];

describe('Directory existence tests', () => {
  test.each(directories)('$relFolder should exist', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

describe('PNut_ts generates correct element listings', () => {
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
  for (const file of files) {
    // Run the CLI with the input file
    const basename = path.basename(file, '.spin2');
    const reportFSpec = path.join(testDirPath, `${basename}.elem`);
    // if the report file exists delete it before we start
    removeExistingFile(reportFSpec);

    const options: string = ' --pass elementize --regression element -- ';
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

    // Read the golden file
    const goldenFSpec = path.join(testDirPath, `${basename}.elem.GOLD`);
    const goldenContentLines = fs.readFileSync(goldenFSpec, 'utf8').split('\n');

    // Compare the output to the golden file, ignoring lines that start with '# Run:'
    const reportFiltered = reportContentLines.filter((line) => !line.startsWith('# Run:'));
    const goldenFiltered = goldenContentLines.filter((line) => !line.startsWith('# Run:'));

    // Compare the output to the golden file
    let whatFailed: string = '';
    if (reportFiltered.join('\n') === goldenFiltered.join('\n')) {
      //
    } else {
      whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
    }

    if (whatFailed.length > 0) {
      whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
    }
    expect(whatFailed).toBe('');
  }
});
