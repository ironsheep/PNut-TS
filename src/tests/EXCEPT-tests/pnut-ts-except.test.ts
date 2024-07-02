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
  removeExistingFile,
  topLevel,
  waitForFiles
} from '../testUtils';

// test lives in <rootDir>/src/tests/FULL
const testDirPath = path.resolve(__dirname, '../../../TEST/EXCEPT-tests');
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

describe('Directory existence tests', () => {
  test.each(directories)('Directory exists: $relFolder', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

describe('PNut_ts detects .spin2 exceptions w/debug() correctly', () => {
  let files: string[] = [];
  try {
    files = globSync(`${testDirPath}/{debug_,isp_,coverage_debug_}*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }
  if (files.length > 1) {
    files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }
  //console.log(`* files=[${files.join(', ')}]`); // no extra file coming in here

  let PNut_ts_compiler: PNutInTypeScript;

  files.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, async () => {
      const basename = path.basename(file, '.spin2');

      const listingFSpec = path.join(testDirPath, `${basename}.lst`);
      const objectFSpec = path.join(testDirPath, `${basename}.obj`);
      const binaryFSpec = path.join(testDirPath, `${basename}.bin`);
      const elementsFSpec = path.join(testDirPath, `${basename}.elem`);
      const errorFSpec = path.join(testDirPath, `${basename}.errout`);

      // Remove existing files
      removeExistingFile(listingFSpec);
      removeExistingFile(objectFSpec);
      removeExistingFile(binaryFSpec);
      removeExistingFile(elementsFSpec);
      removeExistingFile(errorFSpec);

      // compile our file generating output files
      const testArguments: string[] = ['node', 'pnut-ts.js', '-d', '-l', '-O', '--regression', 'element', '--', `${file}`];
      //console.log(`* TEST sending testArguments=[${testArguments}]`);
      try {
        PNut_ts_compiler = new PNutInTypeScript(testArguments);
        //PNut_ts_instance.setArgs(testArguments);
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

      // ID the golden listing file
      const goldenFSpec = path.join(testDirPath, `${basename}.lst.GOLD`);
      // ID the golden .obj file
      const goldenObjFSpec = path.join(testDirPath, `${basename}.obj.GOLD`);
      // ID the golden .bin file
      const goldenBinFSpec = path.join(testDirPath, `${basename}.bin.GOLD`);

      // my wait list...
      let outFilesList: string[] = [];
      if (fs.existsSync(goldenFSpec)) {
        outFilesList = [listingFSpec, objectFSpec, binaryFSpec];
      }
      if (!fs.existsSync(goldenBinFSpec)) {
        outFilesList = [listingFSpec, objectFSpec];
      }
      const compileProducesFiles: boolean = outFilesList.length > 0;

      let whatFailed: string = '';
      if (compileProducesFiles) {
        //delay_mSec(500); // Wait for 200ms for files to appear
        const allFilesExist: boolean = await waitForFiles(outFilesList);
        // ensure all output files were generated!
        if (!allFilesExist) {
          let allFilesPresent: boolean = true;
          let fileGenerated: boolean;
          if (outFilesList.includes(listingFSpec)) {
            fileGenerated = fileExists(listingFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.lst', ', ');
              allFilesPresent = false;
            }
          }

          if (outFilesList.includes(objectFSpec)) {
            fileGenerated = fileExists(objectFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.obj', ', ');
              allFilesPresent = false;
            }
          }

          if (outFilesList.includes(binaryFSpec)) {
            fileGenerated = fileExists(binaryFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.bin', ', ');
              allFilesPresent = false;
            }
          }

          if (allFilesPresent == false) {
            whatFailed = appendDiagnosticString(whatFailed, 'File(s) Missing - Compare Aborted', ' ');
          }
        } else {
          let allFilesMatch: boolean = true;
          let filesMatch: boolean;
          if (outFilesList.includes(listingFSpec)) {
            // Compare listing files
            filesMatch = compareListingFiles(listingFSpec, goldenFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Listing File', ', ');
              allFilesMatch = false;
            }
          }

          if (outFilesList.includes(objectFSpec)) {
            // Compare object files
            filesMatch = compareObjOrBinFiles(objectFSpec, goldenObjFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Object File', ', ');
              allFilesMatch = false;
            }
          }

          if (outFilesList.includes(binaryFSpec)) {
            // Compare binary files
            filesMatch = compareObjOrBinFiles(binaryFSpec, goldenBinFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Binary File', ', ');
              allFilesMatch = false;
            }
          }

          if (allFilesMatch == false) {
            whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
          }
        }
      }

      expect(whatFailed).toBe('');
    });
  });
});

describe('PNut_ts detects .spin2 exceptions w/o debug() correctly', () => {
  let files: string[] = [];
  try {
    files = globSync(`${testDirPath}/!(debug_|isp_|coverage_debug_)*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }
  if (files.length > 1) {
    files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }
  //console.log(`* files=[${files.join(', ')}]`); // no extra file coming in here

  let PNut_ts_compilerNO: PNutInTypeScript;

  files.forEach((file) => {
    test(`Compile file: ${path.basename(file)}`, async () => {
      const basename = path.basename(file, '.spin2');

      const listingFSpec = path.join(testDirPath, `${basename}.lst`);
      const objectFSpec = path.join(testDirPath, `${basename}.obj`);
      const binaryFSpec = path.join(testDirPath, `${basename}.bin`);
      const elementsFSpec = path.join(testDirPath, `${basename}.elem`);
      const errorFSpec = path.join(testDirPath, `${basename}.errout`);

      // Remove existing files
      removeExistingFile(listingFSpec);
      removeExistingFile(objectFSpec);
      removeExistingFile(binaryFSpec);
      removeExistingFile(elementsFSpec);
      removeExistingFile(errorFSpec);

      // compile our file generating output files
      const testArguments: string[] = ['node', 'pnut-ts.js', '-l', '-O', '--regression', 'element', '--', `${file}`];
      //console.log(`* TEST sending testArguments=[${testArguments}]`);
      try {
        PNut_ts_compilerNO = new PNutInTypeScript(testArguments);
        //PNut_ts_instance.setArgs(testArguments);
        await PNut_ts_compilerNO.run();
      } catch (error) {
        // Write the error message to a .errout file
        console.log(`test framework sees exception [${error}]`);
        if (error instanceof Error) {
          fs.writeFileSync(errorFSpec, error.toString());
        } else {
          // Handle the case where error is not an Error object
          fs.writeFileSync(errorFSpec, `Non-error thrown: ${JSON.stringify(error)}`);
        } // Re-throw the error if you want the test to fail
        throw error;
      }

      // ID the golden listing file
      const goldenFSpec = path.join(testDirPath, `${basename}.lst.GOLD`);
      // ID the golden .obj file
      const goldenObjFSpec = path.join(testDirPath, `${basename}.obj.GOLD`);
      // ID the golden .bin file
      const goldenBinFSpec = path.join(testDirPath, `${basename}.bin.GOLD`);
      let outFilesList: string[] = [];
      if (fs.existsSync(goldenFSpec)) {
        outFilesList = [listingFSpec, objectFSpec, binaryFSpec];
      }
      if (!fs.existsSync(goldenBinFSpec)) {
        outFilesList = [listingFSpec, objectFSpec];
      }
      const compileProducesFiles: boolean = outFilesList.length > 0;

      let whatFailed: string = '';
      if (compileProducesFiles) {
        //delay_mSec(500); // Wait for 200ms for files to appear
        const allFilesExist: boolean = await waitForFiles(outFilesList);
        if (!allFilesExist) {
          // ensure all output files were generated!
          let allFilesPresent: boolean = true;
          let fileGenerated: boolean;
          if (outFilesList.includes(listingFSpec)) {
            fileGenerated = fileExists(listingFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.lst', ', ');
              allFilesPresent = false;
            }
          }

          if (outFilesList.includes(objectFSpec)) {
            fileGenerated = fileExists(objectFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.obj', ', ');
              allFilesPresent = false;
            }
          }
          if (outFilesList.includes(binaryFSpec)) {
            fileGenerated = fileExists(binaryFSpec);
            if (!fileGenerated) {
              whatFailed = appendDiagnosticString(whatFailed, '.bin', ', ');
              allFilesPresent = false;
            }
          }

          if (allFilesPresent == false) {
            whatFailed = appendDiagnosticString(whatFailed, 'File(s) Missing - Compare Aborted', ' ');
          }
        } else {
          let allFilesMatch: boolean = true;
          let filesMatch: boolean;
          if (outFilesList.includes(listingFSpec)) {
            // Compare listing files
            filesMatch = compareListingFiles(listingFSpec, goldenFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
              allFilesMatch = false;
            }
          }

          if (outFilesList.includes(objectFSpec)) {
            // Compare object files
            filesMatch = compareObjOrBinFiles(objectFSpec, goldenObjFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Object Files', ', ');
              allFilesMatch = false;
            }
          }

          if (outFilesList.includes(binaryFSpec)) {
            // Compare binary files
            filesMatch = compareObjOrBinFiles(binaryFSpec, goldenBinFSpec);
            if (!filesMatch) {
              whatFailed = appendDiagnosticString(whatFailed, 'Binary Files', ', ');
              allFilesMatch = false;
            }
          }

          if (allFilesMatch == false) {
            whatFailed = appendDiagnosticString(whatFailed, "Don't match!", ' ');
          }
        }
      }
      expect(whatFailed).toBe('');
    });
  });
});
