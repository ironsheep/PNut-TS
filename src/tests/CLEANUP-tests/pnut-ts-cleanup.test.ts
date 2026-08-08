/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PNutInTypeScript } from '../../pnut-ts';
import { filesThatExist, waitForFiles } from '../testUtils';

// A failed build must not leave output files behind. The other suites cannot express
// that: they wipe artifacts before every run, so there is never a PRIOR SUCCESSFUL
// BUILD whose stale .bin could survive -- which is the exact situation this exists to
// prevent. So this suite is procedural rather than GOLD-driven, and its distinguishing
// feature is that it SEQUENCES two compiles against the same basename.
//
// Sources are synthesized into a fresh temp directory per test rather than committed
// as fixtures: they carry no reference output to review, and generating them keeps
// the repository free of files that only exist to be broken.

const GOOD_SOURCE: string = 'PUB main()\n  repeat\n';
// Fails during preprocessing, before the compiler proper ever runs.
const BAD_PREPROCESS_SOURCE: string = '#endif\nPUB main()\n  repeat\n';
// Preprocesses cleanly and fails later, in the compiler.
const BAD_COMPILE_SOURCE: string = 'CON\n  X = \nPUB main()\n  repeat\n';

describe('PNut_ts removes output artifacts when a build fails', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cleanup-'));
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  /** Write the source, compile it with the given flags, and report the exit code. */
  async function compile(source: string, flags: string[], basename: string = 'app'): Promise<number> {
    const sourceFSpec: string = path.join(workDir, `${basename}.spin2`);
    fs.writeFileSync(sourceFSpec, source);
    return await compileExisting(sourceFSpec, flags);
  }

  async function compileExisting(sourceFSpec: string, flags: string[]): Promise<number> {
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', ...flags, '--', sourceFSpec]);
    try {
      return await compiler.run();
    } catch {
      // A thrown compile is still a failed compile; the exit code is what we assert on.
      return 1;
    }
  }

  function inWorkDir(...names: string[]): string[] {
    return names.map((name) => path.join(workDir, name));
  }

  test('a failed rebuild removes the binary left by the previous successful build', async () => {
    expect(await compile(GOOD_SOURCE, ['-l'])).toBe(0);
    expect(await waitForFiles(inWorkDir('app.bin', 'app.lst'))).toBe(true);
    const staleBytes: Buffer = fs.readFileSync(path.join(workDir, 'app.bin'));
    expect(staleBytes.length).toBeGreaterThan(0);

    expect(await compile(BAD_COMPILE_SOURCE, ['-l'])).toBe(1);
    expect(filesThatExist(inWorkDir('app.bin', 'app.lst'))).toEqual([]);
  });

  test('a rebuild that fails in the PREPROCESSOR also removes the previous binary', async () => {
    // Worth its own case: preprocessing happens inside the SpinDocument constructor,
    // so this path exits well before the compile stage the other case exercises.
    expect(await compile(GOOD_SOURCE, ['-l'])).toBe(0);
    expect(await waitForFiles(inWorkDir('app.bin', 'app.lst'))).toBe(true);

    expect(await compile(BAD_PREPROCESS_SOURCE, ['-l'])).toBe(1);
    expect(filesThatExist(inWorkDir('app.bin', 'app.lst'))).toEqual([]);
  });

  test('a failed rebuild removes a -o custom-named binary', async () => {
    expect(await compile(GOOD_SOURCE, ['-o', 'custom.bin'])).toBe(0);
    expect(await waitForFiles(inWorkDir('custom.bin'))).toBe(true);

    expect(await compile(BAD_COMPILE_SOURCE, ['-o', 'custom.bin'])).toBe(1);
    expect(filesThatExist(inWorkDir('custom.bin'))).toEqual([]);
  });

  test('a failed rebuild removes the alternate .binary chosen by -a', async () => {
    expect(await compile(GOOD_SOURCE, ['-a'])).toBe(0);
    expect(await waitForFiles(inWorkDir('app.binary'))).toBe(true);

    expect(await compile(BAD_COMPILE_SOURCE, ['-a'])).toBe(1);
    expect(filesThatExist(inWorkDir('app.binary'))).toEqual([]);
  });

  test('a failed rebuild removes every artifact requested by -l -m -O -F', async () => {
    const everything: string[] = ['-l', '-m', '-O', '-F'];
    expect(await compile(GOOD_SOURCE, everything)).toBe(0);
    expect(await waitForFiles(inWorkDir('app.bin', 'app.lst', 'app.map', 'app.obj', 'app.flash'))).toBe(true);

    expect(await compile(BAD_COMPILE_SOURCE, everything)).toBe(1);
    expect(filesThatExist(inWorkDir('app.bin', 'app.lst', 'app.map', 'app.obj', 'app.flash'))).toEqual([]);
  });

  test('a failed build leaves the -i preprocessor dump in place', async () => {
    // Decision D2: *__pre.spin2 is opt-in diagnostic output, not a build product, and
    // it is most useful exactly when the build has just failed. The source must fail
    // in the COMPILER rather than the preprocessor, or the dump is never written at all.
    expect(await compile(GOOD_SOURCE, ['-l', '-i'])).toBe(0);
    expect(await waitForFiles(inWorkDir('app.bin', 'app.lst', 'app__pre.spin2'))).toBe(true);

    expect(await compile(BAD_COMPILE_SOURCE, ['-l', '-i'])).toBe(1);
    expect(filesThatExist(inWorkDir('app.bin', 'app.lst'))).toEqual([]);
    expect(filesThatExist(inWorkDir('app__pre.spin2'))).toEqual(inWorkDir('app__pre.spin2'));
  });

  test('a nonexistent source leaves same-named artifacts from an earlier build untouched', async () => {
    // Decision D3: cleanup is gated on the source having resolved. Nothing was
    // compiled here, so nothing is ours to delete.
    expect(await compile(GOOD_SOURCE, ['-l'], 'keep')).toBe(0);
    expect(await waitForFiles(inWorkDir('keep.bin', 'keep.lst'))).toBe(true);

    fs.rmSync(path.join(workDir, 'keep.spin2'));
    expect(await compileExisting(path.join(workDir, 'keep.spin2'), ['-l'])).toBe(1);
    expect(filesThatExist(inWorkDir('keep.bin', 'keep.lst'))).toEqual(inWorkDir('keep.bin', 'keep.lst'));
  });

  test('a failing build with no prior artifacts exits 1 and creates nothing', async () => {
    expect(await compile(BAD_COMPILE_SOURCE, ['-l', '-m', '-O', '-F'])).toBe(1);
    expect(filesThatExist(inWorkDir('app.bin', 'app.lst', 'app.map', 'app.obj', 'app.flash'))).toEqual([]);
  });
});
