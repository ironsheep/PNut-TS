/* eslint-disable no-console */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// test lives in <rootDir>/src/tests/FULL
const dirPath = path.resolve(__dirname, '../../../TEST/FULL/preprocessTESTs');
const toolPath = path.resolve(__dirname, '../../../dist');

describe('Test directory existence', () => {
  test('Test directory should exist', () => {
    //console.log(`LOG dirPath=[${dirPath}]`);

    if (!fs.existsSync(dirPath)) {
      throw new Error(`Test directory does not exist: ${dirPath}`);
    }
  });
});

test('CLI generates correct parser output', () => {
  // Get all .spin2 files in the ./TEST/element/ directory

  const files = glob.sync(`${dirPath}/*.spin2`);

  let passCount = 0;
  const failList = [];
  const options: string = '--regression preproc --';

  // Iterate over each .spin2 file
  for (const file of files) {
    // Run the CLI with the input file
    const basename = path.basename(file, '.spin2');
    //console.log(`LOG basename=[${basename}]`);

    try {
      execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
    } catch (error) {
      console.error(`Error running PNut-TS: ${error}`);
    }
    // Read the generated output file
    const reportFSpec = path.join(dirPath, `${basename}.pre`);
    const reportContentLines = fs.readFileSync(reportFSpec, 'utf8').split('\n');

    // Read the golden file
    const goldenFSpec = path.join(dirPath, `${basename}.pre.GOLD`);
    const goldenContentLines = fs.readFileSync(goldenFSpec, 'utf8').split('\n');

    // Compare the output to the golden file, ignoring lines that start with
    //  '#' which are comments
    //  ';' which are comments
    //  'type_end_file' which is a type new to Pnut_TS
    //  'unused' which are unused in Pnut

    const stringsToExclude = ['#', ';', 'type_end_file', 'unused'];

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

  //console.log(`Pass count: ${passCount}`);
  //console.log(`Fail list: ${failList}`);

  // Expect all tests to pass
  expect(failList.length).toBe(0);
});
