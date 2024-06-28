/* eslint-disable no-console */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { removeExistingFile, topLevel } from '../testUtils';

// test lives in <rootDir>/src/tests/SHORT
const dirPath = path.resolve(__dirname, '../../../TEST/SHORT/tablesTESTs');
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

test('CLI generates correct resolver responses', () => {
  // Get all .spin2 files in the ./TEST/tablesTESTs/ directory

  const files = glob.sync(`${dirPath}/*.spin2`);

  let passCount = 0;
  const failList = [];

  const options: string = '-c --regression resolver -- ';

  // Iterate over each .spin2 file
  for (const file of files) {
    // Run the CLI with the input file
    const basename = path.basename(file, '.spin2');
    const reportFSpec = path.join(dirPath, `${basename}.resolv`);
    // if the report file exists delete it before we start
    removeExistingFile(reportFSpec);

    try {
      execSync(`node ${toolPath}/pnut-ts.js ${options} ${file}`);
    } catch (error) {
      console.error(`Error running PNut-TS: ${error}`);
    }
    // Read the generated output file
    const reportContentLines = fs.readFileSync(reportFSpec, 'utf8').split('\n');
    const reportDebugFSpec = path.join(dirPath, `${basename}.resolv.txt`);
    // if the diagnostic file exists delete it before we start
    removeExistingFile(reportDebugFSpec);

    // Read the golden file
    const goldenFSpec = path.join(dirPath, `${basename}.resolv.GOLD`);
    const goldenContentLines = fs.readFileSync(goldenFSpec, 'utf8').split('\n');
    const goldenDebugFSpec = path.join(dirPath, `${basename}.resolv.GOLD.txt`);
    // if the diagnostic file exists delete it before we start
    removeExistingFile(goldenDebugFSpec);

    // Compare the output to the golden file, ignoring lines that start with
    //  '#' which are comments
    //  ';' which are comments
    //  'type_end_file' which is a type new to Pnut_TS
    //  'unused' which are unused in Pnut

    const stringsToExclude = ['#', ';', "'", 'type_end_file', 'unused'];

    const reportFiltered = reportContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));
    const goldenFiltered = goldenContentLines.filter((line) => !stringsToExclude.some((excludeString) => line.startsWith(excludeString)));

    // Compare the output to the golden file
    if (reportFiltered.join('\n') === goldenFiltered.join('\n')) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passCount++;
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
      failList.push(file);
    }
  }

  //console.log(`Pass count: ${passCount}`);
  //console.log(`Fail list: ${failList}`);

  // Expect all tests to pass
  expect(failList.length).toBe(0);
});
