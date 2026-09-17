/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PNutInTypeScript } from '../../pnut-ts';

// A mistyped or obsolete command-line option (e.g. a dead '-44' left in a test
// script) used to print
//   PNut-TS: error: unknown option '...'
//   (See --help for available options)
// and then compile anyway, exiting 0 and writing the .bin -- silently
// discarding whatever the option was supposed to do. This suite proves an
// unknown option now aborts the run (non-zero exit, no output files), and
// that --help / --version / a normal compile keep their prior behavior.
//
// Sources are synthesized into a fresh temp directory per test, following the
// pattern in CLI-tests/pnut-ts-cli-symbols.test.ts, rather than committed as
// TEST/ fixtures that only exist to be broken.

const MINIMAL_SOURCE: string = '' + 'PUB main()\n' + '  repeat\n';

describe('PNut_ts aborts on an unrecognized command-line option', () => {
  let workDir: string;
  let stdoutOutput: string[] = [];
  let stderrOutput: string[] = [];
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-unknown-option-'));
    stdoutOutput = [];
    stderrOutput = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
      stdoutOutput.push(chunk.toString());
      return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
      stderrOutput.push(chunk.toString());
      return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
    };
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function combinedOutput(): string {
    return stdoutOutput.join('') + stderrOutput.join('');
  }

  function binFSpec(basename: string): string {
    return path.join(workDir, `${basename}.bin`);
  }

  /** Write the minimal source, compile it with the given flags, and report the exit code. */
  async function compile(flags: string[], basename: string): Promise<number> {
    const sourceFSpec: string = path.join(workDir, `${basename}.spin2`);
    fs.writeFileSync(sourceFSpec, MINIMAL_SOURCE);
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', ...flags, sourceFSpec]);
    try {
      return await compiler.run();
    } catch {
      return 1;
    }
  }

  test('an unknown long option aborts non-zero, reports the option, and writes no .bin', async () => {
    const exitCode = await compile(['--bogus-option'], 'app-long');
    expect(exitCode).not.toBe(0);
    expect(combinedOutput()).toContain("unknown option '--bogus-option'");
    expect(combinedOutput()).toContain('(See --help for available options)');
    expect(fs.existsSync(binFSpec('app-long'))).toBe(false);
  });

  test('an unknown short option (a dead flag like -44) aborts non-zero and writes no .bin', async () => {
    const exitCode = await compile(['-44'], 'app-short');
    expect(exitCode).not.toBe(0);
    expect(combinedOutput()).toContain('unknown option');
    expect(fs.existsSync(binFSpec('app-short'))).toBe(false);
  });

  test('a normal compile with no unknown options still succeeds and writes a .bin', async () => {
    const exitCode = await compile([], 'app-normal');
    expect(exitCode).toBe(0);
    expect(fs.existsSync(binFSpec('app-normal'))).toBe(true);
  });

  test('--help still exits 0 and writes no .bin', async () => {
    const sourceFSpec: string = path.join(workDir, 'app-help.spin2');
    fs.writeFileSync(sourceFSpec, MINIMAL_SOURCE);
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', '--help', sourceFSpec]);
    let exitCode: number;
    try {
      exitCode = await compiler.run();
    } catch {
      exitCode = 1;
    }
    expect(exitCode).toBe(0);
    expect(fs.existsSync(binFSpec('app-help'))).toBe(false);
  });

  test('-V / --version still exits 0 and writes no .bin', async () => {
    for (const versionFlag of ['-V', '--version']) {
      const basename = `app-version-${versionFlag.replace(/[^a-zA-Z]/g, '')}`;
      const sourceFSpec: string = path.join(workDir, `${basename}.spin2`);
      fs.writeFileSync(sourceFSpec, MINIMAL_SOURCE);
      const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', versionFlag, sourceFSpec]);
      let exitCode: number;
      try {
        exitCode = await compiler.run();
      } catch {
        exitCode = 1;
      }
      expect(exitCode).toBe(0);
      expect(fs.existsSync(binFSpec(basename))).toBe(false);
    }
  });

  test('in-process argsArray is parsed exactly, ignoring unrelated flags on the real process.argv', async () => {
    // Simulates the coverage-mode argv shape the arbiter flagged: process.argv
    // carries jest's own flags (which are NOT registered pnut-ts options)
    // alongside argsArray's self-contained ['node','pnut-ts.js',...] argv. If
    // combinedArgs ever again spliced process.argv's tail into what commander
    // parses, an unrecognized flag like '--coverage' would now abort the
    // build outright (previously it was silently tolerated).
    const savedArgv = process.argv;
    process.argv = [...savedArgv, '--coverage', '--verbose'];
    try {
      const exitCode = await compile([], 'app-coverage-shape');
      expect(exitCode).toBe(0);
      expect(fs.existsSync(binFSpec('app-coverage-shape'))).toBe(true);
    } finally {
      process.argv = savedArgv;
    }
  });
});
