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
  compareExceptionFiles,
  compareListingFiles,
  compareObjOrBinFiles,
  fileExists,
  removeExistingFiles,
  topLevel,
  waitForFiles
} from '../testUtils';

const testDirPath = path.resolve(__dirname, '../../../TEST/LARGE-tests');
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

describe('PNut_ts detects .spin2 exceptions w/debug() & without correctly', () => {
  // Variable to store stderr output
  let stderrOutput: string[] = [];
  let stdErrOutFile: string;
  // Store the original process.stderr.write function
  const originalStderrWrite = process.stderr.write;
  // get our list of files to compile
  let files: string[] = [];
  try {
    files = globSync(`${testDirPath}/*/*.spin2`);
  } catch (error) {
    console.error('ERROR: glob issue:', error);
  }
  if (files.length > 1) {
    // BLDC-Motor-drv: these are known to fail but are good (constant bytes diff but legal)
    let filteredFiles = files.filter((file) => !file.includes('BLDC-Motor-drv'));
    // iOTgw: these are known to fail but are good (runs too long)
    filteredFiles = filteredFiles.filter((file) => !file.includes('iOTgw'));
    filteredFiles.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    files = filteredFiles;
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
  const TEST_TIMEOUT_MS = 15000;

  files.forEach((file) => {
    const fileBase = path.basename(file);
    const testFolder = path.dirname(file);
    const dirBase = path.basename(testFolder);
    const testFilename = path.join(dirBase, fileBase);
    // ID the golden listing file
    const basename = path.basename(file, '.spin2');
    const listingFSpec = path.join(testFolder, `${basename}.lst`);
    const goldenLstFSpec = `${listingFSpec}.GOLD`;
    if (fileExists(goldenLstFSpec)) {
      test(
        `Compile file: ${testFilename}`,
        async () => {
          const objectFSpec = path.join(testFolder, `${basename}.obj`);
          const binaryFSpec = path.join(testFolder, `${basename}.bin`);
          const elementsFSpec = path.join(testFolder, `${basename}.elem`);
          const errorFSpec = path.join(testFolder, `${basename}.errout`);
          stdErrOutFile = errorFSpec; // tell stderr capture what filespec to use

          // ID the golden .obj file
          const goldenObjFSpec = `${objectFSpec}.GOLD`;
          // ID the golden .bin file
          const goldenBinFSpec = `${binaryFSpec}.GOLD`;
          // ID the golden .errout file
          const goldenErroutFSpec = `${errorFSpec}.GOLD`;

          // Remove existing files
          const existingFiles: string[] = [listingFSpec, objectFSpec, binaryFSpec, elementsFSpec, errorFSpec];
          removeExistingFiles(existingFiles);

          const compileDebug: boolean =
            fileBase.startsWith('flash_fs_demo') ||
            fileBase.startsWith('demo_octo') ||
            fileBase.startsWith('demo_p2gw') ||
            fileBase.startsWith('demo_180') ||
            fileBase.startsWith('demo_quad');

          // compile our file generating output files
          const testArguments: string[] = ['node', 'pnut-ts.js', '-O', '-l', '--regression', 'element', '--', `${file}`];
          const conditionalArgs: string[] = compileDebug ? ['-d'] : [];
          const adjustedArgs: string[] = [...testArguments.slice(0, 2), ...conditionalArgs, ...testArguments.slice(2)];
          //console.log(`* TEST sending adjustedArgs=[${adjustedArgs}]`);

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
          const possibleGoldFilesList: string[] = [goldenLstFSpec, goldenObjFSpec, goldenBinFSpec];
          const outFilesList: string[] = [];
          for (let index = 0; index < possibleGoldFilesList.length; index++) {
            const goldFSpec = possibleGoldFilesList[index];
            const genFSpec = goldFSpec.replace(/\.GOLD$/, '');
            if (fileExists(goldFSpec)) {
              outFilesList.push(genFSpec); // we need to wait for this to appear
            }
          }
          const compileProducesFiles: boolean = outFilesList.length > 0;
          //console.log(`TEST: compileProducesFiles=(${compileProducesFiles}), outFilesList=[${outFilesList.join(', ')}]`);

          let whatFailed: string = '';
          if (compileProducesFiles) {
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

              if (outFilesList.includes(errorFSpec)) {
                fileGenerated = fileExists(errorFSpec);
                if (!fileGenerated) {
                  whatFailed = appendDiagnosticString(whatFailed, '.errout', ', ');
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
                filesMatch = compareListingFiles(listingFSpec, goldenLstFSpec);
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

              if (fileExists(goldenErroutFSpec)) {
                if (fileExists(errorFSpec)) {
                  filesMatch = compareExceptionFiles(errorFSpec, goldenErroutFSpec);
                  if (!filesMatch) {
                    whatFailed = appendDiagnosticString(whatFailed, 'Exception File', ', ');
                    allFilesMatch = false;
                  }
                } else {
                  whatFailed = appendDiagnosticString(whatFailed, '(MISSING) Exception File', ', ');
                  allFilesMatch = false;
                }
              }

              if (allFilesMatch == false) {
                whatFailed = appendDiagnosticString(whatFailed, 'Do(es) NOT match!', ' ');
              }
            }
          }

          expect(whatFailed).toBe('');
        },
        TEST_TIMEOUT_MS
      );
    }
  });
});
