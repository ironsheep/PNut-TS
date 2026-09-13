/* eslint-disable no-console */
'use strict';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { appendDiagnosticString, compareListingFiles, compareObjOrBinFiles, removeExistingFile, topLevel } from '../testUtils';

// test lives in <rootDir>/src/tests/INCLUDE-tests
const testDirPath = path.resolve(__dirname, '../../../TEST/INCLUDE-tests');
const libDirPath = path.join(testDirPath, 'lib');
const incDirPath = path.join(testDirPath, 'inc');
const flattenedDirPath = path.join(testDirPath, 'flattened');
const toolPath = path.resolve(__dirname, '../../../dist');

const directories = [
  { name: 'Test directory', path: testDirPath, relFolder: testDirPath.replace(topLevel, './') },
  { name: 'Lib directory', path: libDirPath, relFolder: libDirPath.replace(topLevel, './') },
  { name: 'Inc directory', path: incDirPath, relFolder: incDirPath.replace(topLevel, './') },
  { name: 'Flattened directory', path: flattenedDirPath, relFolder: flattenedDirPath.replace(topLevel, './') },
  { name: 'Tool directory', path: toolPath, relFolder: toolPath.replace(topLevel, './') }
];

describe('Directory existence tests', () => {
  test.each(directories)('$relFolder should exist', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

describe('PNut_ts resolves OBJ files via -I with absolute path', () => {
  const file = path.join(testDirPath, 'inc_test_abs_path.spin2');
  const basename = 'inc_test_abs_path';

  test(`Compile file: ${basename}.spin2 with -I <absolute-path>`, () => {
    const binFSpec = path.join(testDirPath, `${basename}.bin`);
    const lstFSpec = path.join(testDirPath, `${basename}.lst`);

    removeExistingFile(binFSpec);
    removeExistingFile(lstFSpec);

    // Use absolute path for -I — verifies that locateSpin2File() handles
    // absolute include paths correctly (the bug was path.join() corrupting them)
    const options: string = `-l -I ${libDirPath} --`;
    try {
      execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`, { stdio: 'pipe' });
    } catch (error) {
      fail(`Compilation failed for ${basename}.spin2 with absolute -I path: ${error}`);
    }

    expect(fs.existsSync(binFSpec)).toBe(true);

    // cleanup
    removeExistingFile(binFSpec);
    removeExistingFile(lstFSpec);
  });
});

// Windows PNut has no #include, so each test's GOLDs come from its hand-flattened
// twin in flattened/ (the #include line replaced by the included text). An
// #include is textual, so the #include source must build to the same output.
describe('PNut_ts compiles the top-level file of an #include correctly', () => {
  const includeTests: string[] = ['inc_consts_only', 'inc_with_pub'];

  test.each(includeTests)('Compile file: %s.spin2 matches its flattened GOLDs', (basename) => {
    const file = path.join(testDirPath, `${basename}.spin2`);
    const listingFSpec = path.join(testDirPath, `${basename}.lst`);
    const objectFSpec = path.join(testDirPath, `${basename}.obj`);
    const binaryFSpec = path.join(testDirPath, `${basename}.bin`);

    removeExistingFile(listingFSpec);
    removeExistingFile(objectFSpec);
    removeExistingFile(binaryFSpec);

    const options: string = `-l -O -I ${incDirPath} --`;
    try {
      execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`, { stdio: 'pipe' });
    } catch (error) {
      fail(`Compilation failed for ${basename}.spin2: ${error}`);
    }

    let whatFailed: string = '';
    if (!compareListingFiles(listingFSpec, path.join(flattenedDirPath, `${basename}.lst.GOLD`))) {
      whatFailed = appendDiagnosticString(whatFailed, 'Listing Files', ', ');
    }
    if (!compareObjOrBinFiles(objectFSpec, path.join(flattenedDirPath, `${basename}.obj.GOLD`))) {
      whatFailed = appendDiagnosticString(whatFailed, 'Object Files', ', ');
    }
    if (!compareObjOrBinFiles(binaryFSpec, path.join(flattenedDirPath, `${basename}.bin.GOLD`))) {
      whatFailed = appendDiagnosticString(whatFailed, 'Binary Files', ', ');
    }
    if (whatFailed.length > 0) {
      fail(`Output mismatch for ${basename}.spin2: ${whatFailed}`);
    }

    // cleanup
    removeExistingFile(listingFSpec);
    removeExistingFile(objectFSpec);
    removeExistingFile(binaryFSpec);
  });
});
