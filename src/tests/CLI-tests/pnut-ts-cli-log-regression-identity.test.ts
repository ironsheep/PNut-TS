/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// The developer options --log, --regression and -v only report on a compile; they
// must never change it. Each fixture is compiled once with no developer option and
// then once per --log choice, once per --regression choice, once with all three
// --regression choices together, and once with -v. Every run must exit 0 and leave
// .bin, .obj, .lst and .map files byte-identical to the compile without the option.
// What the log or report says is not examined.
//
// Every compile runs as its own process in an OS temp copy of the fixture, never in
// TEST/. The filename goes before --log and --regression because they take several
// values.

const toolPath: string = path.resolve(__dirname, '../../pnut-ts.js');
const testRoot: string = path.resolve(__dirname, '../../../TEST');

const LOG_CHOICES: string[] = ['all', 'outline', 'compiler', 'elementizer', 'parser', 'distiller', 'preproc', 'resolver'];
const REGRESSION_CHOICES: string[] = ['element', 'resolver', 'preproc'];
const OUTPUT_EXTENSIONS: string[] = ['.bin', '.obj', '.lst', '.map'];

// output-producing options common to the reference compile and every option run
const BASE_OPTIONS: string[] = ['-l', '-O', '-m'];

interface iFixture {
  area: string;
  main: string; // path under TEST/
  companions: string[]; // object files the main file pulls in, paths under TEST/
}

const FIXTURES: iFixture[] = [
  { area: 'CON', main: 'CON-tests/Snippet_001.spin2', companions: [] },
  { area: 'DAT-PASM', main: 'DAT-PASM-tests/blink_pasm.spin2', companions: [] },
  { area: 'SPIN', main: 'SPIN-tests/spin_test1.spin2', companions: [] },
  { area: 'SPIN', main: 'SPIN-tests/spin_test4_parent.spin2', companions: ['SPIN-tests/spin_test4_child.spin2'] },
  { area: 'OBJ', main: 'OBJ-tests/spin_test10.spin2', companions: ['OBJ-tests/spin_test10_child.spin2'] },
  { area: 'DBG', main: 'DBG-tests/debug_test_001.spin2', companions: [] },
  { area: 'PREPROC', main: 'PREPROC-tests/ppokDefineMulti.spin2', companions: [] },
  { area: 'PREPROC', main: 'PREPROC-tests/condCode.spin2', companions: [] }
];

type OutputSet = Map<string, Buffer>;

describe.each(FIXTURES)('developer options leave the output unchanged: $main', (fixture: iFixture) => {
  const mainName: string = path.basename(fixture.main);
  const baseName: string = path.basename(fixture.main, '.spin2');
  let workDir: string;

  function runCompiler(args: string[]): number | null {
    const result = spawnSync(process.execPath, [toolPath, ...args], {
      cwd: workDir,
      encoding: 'utf8',
      maxBuffer: 1 << 28
    });
    return result.status;
  }

  // compile in the fixture's temp copy with every earlier output removed first, and
  // return what the compile left behind
  function compileAndCollect(extraOptions: string[]): { status: number | null; outputs: OutputSet } {
    for (const name of fs.readdirSync(workDir)) {
      if (OUTPUT_EXTENSIONS.includes(path.extname(name))) {
        fs.rmSync(path.join(workDir, name));
      }
    }
    const status = runCompiler([mainName, ...BASE_OPTIONS, ...extraOptions]);
    const outputs: OutputSet = new Map();
    for (const extension of OUTPUT_EXTENSIONS) {
      const outputPath = path.join(workDir, `${baseName}${extension}`);
      if (fs.existsSync(outputPath)) {
        let bytes: Buffer = fs.readFileSync(outputPath);
        if (extension === '.map') {
          // the .map header carries the compile time, the one field that differs between two compiles
          bytes = Buffer.from(bytes.toString('latin1').replace(/^Generated: .*$/m, 'Generated: <masked>'), 'latin1');
        }
        outputs.set(extension, bytes);
      }
    }
    return { status, outputs };
  }

  function expectSameOutputs(actual: OutputSet, reference: OutputSet): void {
    expect([...actual.keys()].sort()).toEqual([...reference.keys()].sort());
    for (const [extension, bytes] of reference) {
      expect(actual.get(extension)?.equals(bytes)).toBe(true);
    }
  }

  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-logid-'));
    for (const relativePath of [fixture.main, ...fixture.companions]) {
      fs.copyFileSync(path.join(testRoot, relativePath), path.join(workDir, path.basename(relativePath)));
    }
  });

  afterAll(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  test('the reference compile succeeds and produces .bin, .obj, .lst and .map', () => {
    const reference = compileAndCollect([]);
    expect(reference.status).toBe(0);
    expect([...reference.outputs.keys()].sort()).toEqual([...OUTPUT_EXTENSIONS].sort());
  });

  test.each(LOG_CHOICES)('--log %s: exit 0 and output identical', (choice: string) => {
    const reference = compileAndCollect([]);
    const logged = compileAndCollect(['--log', choice]);
    expect(logged.status).toBe(0);
    expectSameOutputs(logged.outputs, reference.outputs);
  });

  test.each(REGRESSION_CHOICES)('--regression %s: exit 0 and output identical', (choice: string) => {
    const reference = compileAndCollect([]);
    const reported = compileAndCollect(['--regression', choice]);
    expect(reported.status).toBe(0);
    expectSameOutputs(reported.outputs, reference.outputs);
  });

  test('--regression with all three choices together: exit 0 and output identical', () => {
    const reference = compileAndCollect([]);
    const reported = compileAndCollect(['--regression', ...REGRESSION_CHOICES]);
    expect(reported.status).toBe(0);
    expectSameOutputs(reported.outputs, reference.outputs);
  });

  test('-v: exit 0 and output identical', () => {
    const reference = compileAndCollect([]);
    const verbose = compileAndCollect(['-v']);
    expect(verbose.status).toBe(0);
    expectSameOutputs(verbose.outputs, reference.outputs);
  });

  test('--log all together with -d: exit 0 and output identical to the -d compile', () => {
    const reference = compileAndCollect(['-d']);
    expect(reference.status).toBe(0);
    const logged = compileAndCollect(['-d', '--log', 'all']);
    expect(logged.status).toBe(0);
    expectSameOutputs(logged.outputs, reference.outputs);
  });
});
