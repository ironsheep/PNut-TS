/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { Context } from '../../utils/context';
import { PreprocessorError, SpinDocument } from '../../classes/spinDocument';
import { patchBrkSite, recomputeChildChecksum } from '../../classes/objectCache';

// Message text of the diagnostics that have no source line, so no .spin2 fixture row
// can carry them: command-line argument errors, the preprocessor's summary
// exceptions, and the object-cache guards that fire only on a damaged cache.
//
// -D / -U name errors are asserted in pnut-ts-cli-symbols.test.ts; the missing
// .dbg and .sym sidecar errors in CACHE-tests (objectCache.test.ts,
// cacheLayoutPayload.test.ts).
//
// Every compile runs in an OS temp directory. The compiler is spawned as its own
// process where the behaviour depends on the process (exit status, argv handling,
// what reaches stderr); the preprocessor and the cache helpers are called directly.

const toolPath: string = path.resolve(__dirname, '../../pnut-ts.js');

const MINIMAL_SOURCE: string = 'PUB main()\n  repeat\n';

interface iRunResult {
  status: number | null;
  output: string; // stdout followed by stderr
  stderr: string;
}

describe('PNut_ts command-line diagnostics', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-diag-'));
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function runCompiler(args: string[]): iRunResult {
    const result = spawnSync(process.execPath, [toolPath, ...args], { cwd: workDir, encoding: 'utf8' });
    return { status: result.status, output: `${result.stdout}${result.stderr}`, stderr: result.stderr };
  }

  test('two .spin2 files after a variadic option are refused, and nothing is written', () => {
    // -D takes several values, so both filenames land in its list and the filename
    // is recovered from the raw argument list, where the second one is found.
    const first: string = path.join(workDir, 'first.spin2');
    const second: string = path.join(workDir, 'second.spin2');
    fs.writeFileSync(first, MINIMAL_SOURCE);
    fs.writeFileSync(second, MINIMAL_SOURCE);
    const result = runCompiler(['-q', '-D', 'X', first, second]);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Compiling more than one .spin2 files at a time, not supported!');
    expect(fs.existsSync(path.join(workDir, 'first.bin'))).toBe(false);
    expect(fs.existsSync(path.join(workDir, 'second.bin'))).toBe(false);
  });

  test('an option that needs a file, given none, reports a missing filename', () => {
    const result = runCompiler(['-q', '-d']);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Missing filename argument');
  });

  test('a .spin2 file that does not exist is reported by name', () => {
    const result = runCompiler(['-q', 'nothere.spin2']);
    expect(result.status).toBe(1);
    expect(result.output).toContain('File [nothere.spin2] does not exist or is not a .spin2 file!');
  });

  test('an existing file that is not a .spin2 file is reported the same way', () => {
    fs.writeFileSync(path.join(workDir, 'notes.txt'), MINIMAL_SOURCE);
    const result = runCompiler(['-q', 'notes.txt']);
    expect(result.status).toBe(1);
    expect(result.output).toContain('File [notes.txt] does not exist or is not a .spin2 file!');
  });

  test('a preprocessor failure prints its diagnostics once and not the summary exception text', () => {
    fs.writeFileSync(path.join(workDir, 'stray.spin2'), '#endif\n' + MINIMAL_SOURCE);
    fs.writeFileSync(path.join(workDir, 'stopped.spin2'), '#error stop here\n' + MINIMAL_SOURCE);
    const stray = runCompiler(['-q', 'stray.spin2']);
    expect(stray.status).toBe(1);
    expect(stray.stderr).toContain('stray.spin2:1:error:Must be preceeded by #IFDEF or #IFNDEF');
    expect(stray.output).not.toContain('Preprocessing failed');
    const stopped = runCompiler(['-q', 'stopped.spin2']);
    expect(stopped.status).toBe(1);
    expect(stopped.stderr).toContain('stopped.spin2:1:error:stop here');
    expect(stopped.output).not.toContain('Preprocessing stopped');
  });
});

describe('SpinDocument preprocessor summary exceptions', () => {
  let workDir: string;
  const originalStderrWrite = process.stderr.write;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-diag-pp-'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stderr.write = (() => true) as any;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function preprocessError(basename: string, source: string): unknown {
    const fileSpec: string = path.join(workDir, basename);
    fs.writeFileSync(fileSpec, source);
    try {
      new SpinDocument(new Context(), fileSpec);
    } catch (error) {
      return error;
    }
    return undefined;
  }

  test('a source with fatal diagnostics ends with a PreprocessorError naming the file', () => {
    const error = preprocessError('bad.spin2', '#endif\n' + MINIMAL_SOURCE);
    expect(error).toBeInstanceOf(PreprocessorError);
    expect((error as Error).message).toBe('Preprocessing failed for [bad.spin2]');
  });

  test('#error stops the pass at once with its own PreprocessorError', () => {
    const error = preprocessError('halt.spin2', '#error stop here\n' + MINIMAL_SOURCE);
    expect(error).toBeInstanceOf(PreprocessorError);
    expect((error as Error).message).toBe('Preprocessing stopped by #error in [halt.spin2]');
  });

  test('a clean source ends with no exception', () => {
    expect(preprocessError('good.spin2', MINIMAL_SOURCE)).toBeUndefined();
  });
});

describe('object-cache guards that fire only on a damaged cache', () => {
  describe('recomputeChildChecksum', () => {
    test('a binary shorter than a Spin object header is refused', () => {
      expect(() => recomputeChildChecksum(new Uint8Array(8))).toThrow(
        'recomputeChildChecksum: binary too short (8 bytes) to contain a Spin object header'
      );
    });

    test('a code-size field that points past the end of the binary is refused', () => {
      const bin = new Uint8Array(16);
      bin[4] = 100; // psize = 100, so the checksum byte would sit at offset 108
      expect(() => recomputeChildChecksum(bin)).toThrow('recomputeChildChecksum: checksum offset 108 >= binary length 16 (psize=100)');
    });

    test('a well-formed binary is made to sum to zero', () => {
      const bin = new Uint8Array(16);
      bin[4] = 4; // psize = 4, checksum byte at offset 12
      bin[9] = 0x41;
      recomputeChildChecksum(bin);
      expect(bin.reduce((sum, byte) => sum + byte, 0) & 0xff).toBe(0);
    });
  });

  describe('patchBrkSite', () => {
    test('a brkCode above 255 is refused', () => {
      expect(() => patchBrkSite(new Uint8Array(16), { offset: 0, kind: 'spin', origIndex: 1 }, 256)).toThrow(
        'patchBrkSite: brkCode 256 out of range (0-255)'
      );
    });

    test('a negative brkCode is refused', () => {
      expect(() => patchBrkSite(new Uint8Array(16), { offset: 0, kind: 'pasm', origIndex: 1 }, -1)).toThrow(
        'patchBrkSite: brkCode -1 out of range (0-255)'
      );
    });

    test('a spin site past the end of the binary is refused', () => {
      expect(() => patchBrkSite(new Uint8Array(16), { offset: 16, kind: 'spin', origIndex: 1 }, 5)).toThrow(
        'patchBrkSite: spin offset 16 >= bin length 16'
      );
    });

    test('a pasm site whose long runs past the end of the binary is refused', () => {
      expect(() => patchBrkSite(new Uint8Array(16), { offset: 13, kind: 'pasm', origIndex: 1 }, 5)).toThrow(
        'patchBrkSite: pasm offset 13+3 >= bin length 16'
      );
    });

    test('in-range spin and pasm sites are rewritten in place', () => {
      const bin = new Uint8Array(16);
      patchBrkSite(bin, { offset: 2, kind: 'spin', origIndex: 1 }, 7);
      expect(bin[2]).toBe(7);
      patchBrkSite(bin, { offset: 4, kind: 'pasm', origIndex: 1 }, 0x81);
      expect(bin[5]).toBe(0x02); // low seven bits of 0x81, shifted into bits 9-15
      expect(bin[6]).toBe(0x01); // bit 7 of 0x81, in bit 16
    });
  });
});

describe('object-cache hit on a damaged or oversized cache', () => {
  let workDir: string;
  let cacheDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-diag-cache-'));
    cacheDir = path.join(workDir, 'cache');
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function runCompiler(args: string[]): iRunResult {
    const result = spawnSync(process.execPath, [toolPath, ...args], { cwd: workDir, encoding: 'utf8' });
    return { status: result.status, output: `${result.stdout}${result.stderr}`, stderr: result.stderr };
  }

  test('a .dbg sidecar whose brkSite names a record it does not hold is refused on the hit', () => {
    fs.writeFileSync(path.join(workDir, 'parent.spin2'), 'CON\n  _clkfreq = 200_000_000\nOBJ\n  child : "child"\nPUB main()\n  child.greet(1)\n');
    fs.writeFileSync(path.join(workDir, 'child.spin2'), 'PUB greet(value)\n  debug("value=", uhex_(value))\n');
    const cacheFlags: string[] = ['--cache', '--cache-dir', cacheDir];
    const cold = runCompiler(['-q', '-d', '--cache-clear', ...cacheFlags, 'parent.spin2']);
    expect(cold.status).toBe(0);
    const dbgFiles: string[] = fs.readdirSync(cacheDir).filter((name) => name.endsWith('.dbg'));
    expect(dbgFiles.length).toBeGreaterThan(0);
    for (const name of dbgFiles) {
      const fileSpec: string = path.join(cacheDir, name);
      const sidecar = JSON.parse(fs.readFileSync(fileSpec, 'utf8'));
      sidecar.brkSites = [{ o: 0, k: 0, i: 9999 }];
      fs.writeFileSync(fileSpec, JSON.stringify(sidecar));
    }
    const warm = runCompiler(['-q', '-d', ...cacheFlags, 'parent.spin2']);
    expect(warm.status).toBe(1);
    expect(warm.output).toContain('Object cache: brkSite origIndex 9999 not in records map for [');
    expect(warm.output).toContain('Run with --cache-clear to rebuild.');
  });

  test('a cache hit that would take the child images past the OBJ limit is refused (m690)', () => {
    // 27 distinct children of about 960 KB each: the cold compile stores the
    // first 26 and stops at the limit on a miss (m691); the warm compile finds
    // them in the cache and stops at the same limit on a hit (m690).
    const childCount: number = 27;
    let parent: string = 'OBJ\n';
    for (let index = 0; index < childCount; index++) {
      const name: string = `c${String(index).padStart(2, '0')}`;
      parent += `  o${name} : "${name}"\n`;
      fs.writeFileSync(path.join(workDir, `${name}.spin2`), `DAT\n  byte ${index}\n  byte 0[$F0000]\nPUB go()\n  return\n`);
    }
    parent += 'PUB main()\n  return\n';
    fs.writeFileSync(path.join(workDir, 'parent.spin2'), parent);
    const args: string[] = ['-q', '--cache', '--cache-dir', cacheDir, 'parent.spin2'];
    const cold = runCompiler(args);
    expect(cold.status).toBe(1);
    expect(cold.output).toContain('OBJ data exceeds 24576k limit (m691)');
    const warm = runCompiler(args);
    expect(warm.status).toBe(1);
    expect(warm.output).toContain('OBJ data exceeds 24576k limit (m690)');
  }, 120000);
});
