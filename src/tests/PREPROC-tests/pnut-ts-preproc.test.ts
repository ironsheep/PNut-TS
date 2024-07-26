/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import path from 'path';
// Import the glob function specifically
//import { glob } from 'glob';

// Alternatively, if you want to use the synchronous version, you can do:
import { sync as globSync } from 'glob';
import { PNutInTypeScript } from '../../pnut-ts';
import {
  appendDiagnosticString,
  compareListingFiles,
  compareObjOrBinFiles,
  fileExists,
  removeExistingFiles,
  removeFileIfEmpty,
  topLevel,
  waitForFiles
} from '../testUtils';

const testDirPath = path.resolve(__dirname, '../../../TEST/PREPROC-tests');
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

describe('PNut_ts preprocesses files correctly', () => {
  // Variable to store stderr output
  let stderrOutput: string[] = [];
  let stdErrOutFile: string;
  // Store the original process.stderr.write function
  const originalStderrWrite = process.stderr.write;
  // get our list of files to compile
  let files: string[] = [];
  try {
    files = globSync(`${testDirPath}/*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }
  // Filter out files with the debug extensions
  files = files.filter((file) => !file.endsWith('.byHandPre.spin2'));
  files = files.filter((file) => !file.endsWith('-pre.spin2'));

  if (files.length > 1) {
    files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }
  //console.log(`* files=[${files.join(', ')}]`); // no extra file coming in here

  if (files.length > 0) {
    beforeEach(() => {
      // Override process.stderr.write
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
        // Store the stderr output
        stderrOutput.push(chunk.toString());
        // Call the original function to ensure any other behaviors are preserved
        return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
      };
    });

    afterEach(() => {
      // Restore the original process.stderr.write function
      process.stderr.write = originalStderrWrite;

      // Write the stderr output to a file
      fs.writeFileSync(stdErrOutFile, stderrOutput.join('\n'));

      // Clear the stderrOutput array for the next test
      stderrOutput = [];
    });
  }

  let PNut_ts_compiler: PNutInTypeScript;

  files.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, async () => {
      const basename = path.basename(file, '.spin2');
      const errorFSpec = path.join(testDirPath, `${basename}.errout`);

      const preprocessFSpec = path.join(testDirPath, `${basename}.pre`);
      const listingFSpec = path.join(testDirPath, `${basename}.lst`);
      const binaryFSpec = path.join(testDirPath, `${basename}.bin`);
      stdErrOutFile = errorFSpec; // tell stderr capture what filespec to use

      // Remove existing files
      const existingFiles: string[] = [preprocessFSpec, listingFSpec, binaryFSpec, errorFSpec];
      removeExistingFiles(existingFiles);

      // compile our file generating output files
      // build our compile argument linst
      let conditionalArgs: string[] = basename === 'include' ? ['-I', 'inc'] : [];
      if (basename === 'condCodeElse') {
        conditionalArgs = ['-D', 'CLOCK_300MHZ'];
      } else if (basename === 'condNestCodeCmdLn') {
        conditionalArgs = ['-D', 'USE_PSRAM8', '-U', 'USE_PSRAM16'];
      } else if (basename === 'include') {
        conditionalArgs = ['-I', 'inc', '--pass', 'preprocess'];
      }

      const testArguments: string[] = ['node', 'pnut-ts.js', '-v', '-l', '-i', '--log', 'preproc', '--regression', 'preproc', '--', `${file}`];
      // const testArguments: string[] = ['node', 'pnut-ts.js', '-v', '--regression', 'preproc', '--', `${file}`];
      const adjustedArgs: string[] = [...testArguments.slice(0, 2), ...conditionalArgs, ...testArguments.slice(2)];
      console.log(`* TEST sending testArguments=[${adjustedArgs}]`);

      try {
        PNut_ts_compiler = new PNutInTypeScript(adjustedArgs);
        await PNut_ts_compiler.run();
      } catch (error) {
        // Write the error message to a .errout file
        if (error instanceof Error) {
          fs.writeFileSync(errorFSpec, error.toString());
        } else {
          // Handle the case where error is not an Error object
          fs.writeFileSync(errorFSpec, `Non-error thrown: ${JSON.stringify(error)}`);
        } // Re-throw the error if you want the test to fail
        throw error;
      }

      // my wait list...
      const outFilesList: string[] = [preprocessFSpec];
      if (basename !== 'include') {
        outFilesList.push(listingFSpec);
        outFilesList.push(binaryFSpec);
      }
      const compileProducesFiles: boolean = outFilesList.length > 0;
      let whatFailed: string = '';
      if (compileProducesFiles) {
        const allFilesExist: boolean = await waitForFiles(outFilesList);
        removeFileIfEmpty(errorFSpec);
        // ensure all output files were generated!
        if (!allFilesExist) {
          // some files missing
          let allFilesPresent: boolean = true;
          let fileGenerated: boolean;
          if (outFilesList.includes(preprocessFSpec)) {
            fileGenerated = fileExists(preprocessFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.pre', ', ');
              allFilesPresent = false;
            }
            fileGenerated = fileExists(listingFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.lst', ', ');
              allFilesPresent = false;
            }
            fileGenerated = fileExists(binaryFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.bin', ', ');
              allFilesPresent = false;
            }
          }

          // detect exception output
          if (fileExists(errorFSpec)) {
            whatFailed = appendDiagnosticString(whatFailed, 'Exception Generated', ', ');
          }
          if (allFilesPresent == false) {
            whatFailed = appendDiagnosticString(whatFailed, 'File(s) Missing - Compare Aborted', ' ');
          }
        } else {
          // all files present
          whatFailed = '';
          // ID the golden listing file
          const goldenFSpec = path.join(testDirPath, `${basename}.pre.GOLD`);
          // Compare listing files
          const filterHeaders: string[] = ["' Run:"];
          let filesMatch: boolean = compareListingFiles(preprocessFSpec, goldenFSpec, filterHeaders);
          if (!filesMatch) {
            whatFailed = appendDiagnosticString(whatFailed, 'Preprocess Files', ', ');
          }

          // ID the golden listing file (optional for some tests)
          const goldenListFSpec = path.join(testDirPath, `${basename}.lst.GOLD`);
          if (fileExists(goldenListFSpec)) {
            // Compare listing files
            filesMatch = compareListingFiles(listingFSpec, goldenListFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
            }
          }

          // ID the golden .bin file (optional for some tests)
          const goldenBinFSpec = path.join(testDirPath, `${basename}.bin.GOLD`);
          // Compare binary files
          if (fileExists(goldenBinFSpec)) {
            filesMatch = compareObjOrBinFiles(binaryFSpec, goldenBinFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Binary Files', ', ');
            }
          }

          // detect exception output
          if (fileExists(errorFSpec)) {
            whatFailed = appendDiagnosticString(whatFailed, 'Exception Generated', ', ');
          }

          if (whatFailed.length > 0) {
            whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
          }
        }
      }
      expect(whatFailed).toBe('');
    });
  });
});
