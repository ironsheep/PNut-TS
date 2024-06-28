/* eslint-disable no-console */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { topLevel } from '../testUtils';

// test lives in <rootDir>/src/tests/FULL
const dirPath = path.resolve(__dirname, '../../../TEST/FULL/preprocessTESTs');
const toolPath = path.resolve(__dirname, '../../../dist');

const directories = [
  { name: 'Test directory', path: dirPath, relFolder: dirPath.replace(topLevel, './') },
  { name: 'Tool directory', path: toolPath, relFolder: toolPath.replace(topLevel, './') }
];

describe('Directory existence tests', () => {
  test.each(directories)('Directory exists: $relFolder', ({ path }) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
  });
});

test('CLI generates correct preProcessor output', () => {
  // Get all .spin2 files in the ./TEST/element/ directory

  const files = glob.sync(`${dirPath}/*.spin2`);

  let passCount = 0;
  const failList = [];
  const options: string = '-c -I inc --regression preproc --';

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
    const goldenFSpec = path.join(dirPath, `${basename}.pre.GOLD`);
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
