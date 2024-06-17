/* eslint-disable no-console */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// test lives in <rootDir>/src/tests/SHORT
const testDirPath = path.resolve(__dirname, '../../../TEST/SHORT/elementizerTESTs');
const toolPath = path.resolve(__dirname, '../../../out');

describe('Test directory existence', () => {
  test('Test directory should exist', () => {
    //console.log(`LOG testDirPath=[${testDirPath}]`);

    if (!fs.existsSync(testDirPath)) {
      throw new Error(`Test directory does not exist: ${testDirPath}`);
    }
  });
});

test('CLI generates correct element listings', () => {
  // Get all .spin2 files in the ./TEST/element/ directory

  const files = glob.sync(`${testDirPath}/*.spin2`);

  let passCount = 0;
  const failList = [];

  const options: string = ' --pass elementize --regression element -- ';

  // Iterate over each .spin2 file
  for (const file of files) {
    // Run the CLI with the input file
    const basename = path.basename(file, '.spin2');
    const reportFSpec = path.join(testDirPath, `${basename}.elem`);
    // if the report file exists delete it before we start
    if (fs.existsSync(reportFSpec)) {
      fs.unlinkSync(reportFSpec);
    }

    try {
      execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
    } catch (error) {
      console.error(`Error running PNut-TS: ${error}`);
    }
    // Ensure the file exists after the test run
    if (!fs.existsSync(reportFSpec)) {
      console.error(`PNut-TS: Failed to write output file [${reportFSpec}]`);
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
