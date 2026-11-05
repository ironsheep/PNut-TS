/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// Command-line behaviour that a .spin2 fixture row cannot select, because the
// fixture suites pass one fixed option string: the -I include-directory search for
// DAT FILE data, extensionless filenames, the --log and --pass option lists, and a
// run with no filename at all.
//
// Every compile runs in an OS temp directory, as its own process, with that
// directory as its working directory (-I and the extensionless lookup are
// relative to it).

const toolPath: string = path.resolve(__dirname, '../../pnut-ts.js');

const FILE_DATA_SOURCE: string = 'PUB main()\n  return\nDAT\n  orgh\n  file "incdata.bin"\n';
const FILE_DATA_BYTES: Buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x12, 0x34, 0x56, 0x78]);
const MINIMAL_SOURCE: string = 'PUB main()\n  return\n';

interface iRunResult {
  status: number | null;
  output: string; // stdout followed by stderr
}

describe('PNut_ts command-line options and environment', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-corner-'));
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function runCompiler(args: string[]): iRunResult {
    const result = spawnSync(process.execPath, [toolPath, ...args], {
      cwd: workDir,
      encoding: 'utf8',
      maxBuffer: 1 << 28
    });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  }

  describe('-I include-directory search for DAT FILE data', () => {
    test('-I data-file search: FILE data held only in a -I directory is found and placed in the binary', () => {
      fs.writeFileSync(path.join(workDir, 'withdata.spin2'), FILE_DATA_SOURCE);
      fs.mkdirSync(path.join(workDir, 'inc'));
      fs.writeFileSync(path.join(workDir, 'inc', 'incdata.bin'), FILE_DATA_BYTES);
      const result = runCompiler(['-I', 'inc', '--', 'withdata.spin2']);
      expect(result.status).toBe(0);
      const binary: Buffer = fs.readFileSync(path.join(workDir, 'withdata.bin'));
      expect(binary.indexOf(FILE_DATA_BYTES)).toBeGreaterThanOrEqual(0);
    });

    test('-I data-file search: the same source without -I does not find the data file', () => {
      fs.writeFileSync(path.join(workDir, 'withdata.spin2'), FILE_DATA_SOURCE);
      fs.mkdirSync(path.join(workDir, 'inc'));
      fs.writeFileSync(path.join(workDir, 'inc', 'incdata.bin'), FILE_DATA_BYTES);
      const result = runCompiler(['--', 'withdata.spin2']);
      expect(result.status).toBe(1);
      expect(result.output).toContain('DAT file not found [incdata.bin]');
      expect(fs.existsSync(path.join(workDir, 'withdata.bin'))).toBe(false);
    });
  });

  test('a filename given without its extension resolves to the .spin2 file', () => {
    fs.writeFileSync(path.join(workDir, 'bare.spin2'), MINIMAL_SOURCE);
    const result = runCompiler(['-v', '--', 'bare']);
    expect(result.status).toBe(0);
    expect(result.output).toContain('Resolved [bare] to [bare.spin2]');
    expect(fs.existsSync(path.join(workDir, 'bare.bin'))).toBe(true);
  });

  test('--log all names every logging area it switches on and the compile still succeeds', () => {
    fs.writeFileSync(path.join(workDir, 'logged.spin2'), MINIMAL_SOURCE);
    // --log takes several values, so the filename goes first
    const result = runCompiler(['-v', 'logged.spin2', '--log', 'all']);
    expect(result.status).toBe(0);
    expect(result.output).toContain('MODE: Logging:');
    for (const area of [' Outline', ' Distiller', ' Elementizer', ' Parser', ' Compile', ' Resolver']) {
      expect(result.output).toContain(area);
    }
    expect(result.output).not.toContain(' PreProcessor');
    expect(fs.existsSync(path.join(workDir, 'logged.bin'))).toBe(true);
  });

  test('--log preproc switches on preprocessor logging only', () => {
    fs.writeFileSync(path.join(workDir, 'logged.spin2'), MINIMAL_SOURCE);
    const result = runCompiler(['-v', 'logged.spin2', '--log', 'preproc']);
    expect(result.status).toBe(0);
    expect(result.output).toContain(' PreProcessor');
    expect(result.output).not.toContain(' Resolver');
  });

  test('--pass con-block names the pass it stops after', () => {
    fs.writeFileSync(path.join(workDir, 'passed.spin2'), MINIMAL_SOURCE);
    const result = runCompiler(['-v', 'passed.spin2', '--pass', 'con-block']);
    expect(result.output).toContain(' ConBlocks');
  });

  test('--pass elementize names the pass it stops after', () => {
    fs.writeFileSync(path.join(workDir, 'passed.spin2'), MINIMAL_SOURCE);
    const result = runCompiler(['-v', 'passed.spin2', '--pass', 'elementize']);
    expect(result.output).toContain(' Elementizer');
  });

  test('a .json filename is not taken as a source file', () => {
    fs.writeFileSync(path.join(workDir, 'settings.json'), '{}\n');
    const result = runCompiler(['-q', 'settings.json']);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Missing filename argument');
  });

  test('a run with no filename and no -v prints the argument dump and the missing-filename error', () => {
    const result = runCompiler([]);
    expect(result.status).toBe(1);
    expect(result.output).toContain('combArguments:');
    expect(result.output).toContain('Missing filename argument');
  });
});
