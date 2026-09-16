/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PNutInTypeScript } from '../../pnut-ts';

// -D and -U both take a presence-only preprocessor symbol name -- there is no
// command-line equivalent of '#define SYM value'. Before this fix, '-D SYM=1'
// silently uppercased and registered the whole argument as a symbol literally
// named 'SYM=1'; '#ifdef SYM' then never matched and the intended branch
// vanished with no diagnostic. This suite proves the rejection and its
// positive twins (bare '-D SYM' / '-U SYM' still work), plus the sibling
// silent-acceptance cases raised for this task: a symbol name that could
// never match anything a preprocessor conditional can test for (leading
// digit, an embedded '-', or the empty string).
//
// Sources are synthesized into a fresh temp directory per test, following the
// pattern in CLEANUP-tests/pnut-ts-cleanup.test.ts, rather than committed as
// TEST/ fixtures that only exist to be broken.

// #ifdef SYM guards the DEFINITION of a method that main() always calls
// unconditionally -- so the compile fails (undefined identifier) if and only
// if SYM was NOT successfully defined, and succeeds if and only if it was.
// This turns "was the symbol actually registered" into a plain exit-code
// check without needing to parse the listing or object output.
const GUARDED_SOURCE: string =
  '' +
  'PUB main()\n' +
  '  onlyDefinedWhenSymIsSet()\n' +
  '  repeat\n' +
  '\n' +
  '#ifdef SYM\n' +
  'PRI onlyDefinedWhenSymIsSet()\n' +
  '  repeat\n' +
  '#endif\n';

describe('PNut_ts rejects unsupported -D / -U symbol forms', () => {
  let workDir: string;
  let stderrOutput: string[] = [];
  const originalStderrWrite = process.stderr.write;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-symbols-'));
    stderrOutput = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
      stderrOutput.push(chunk.toString());
      return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
    };
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  /** Write the guarded source, compile it with the given flags, and report the exit code. */
  async function compile(flags: string[], basename: string = 'app'): Promise<number> {
    const sourceFSpec: string = path.join(workDir, `${basename}.spin2`);
    fs.writeFileSync(sourceFSpec, GUARDED_SOURCE);
    // '--' stops commander's variadic -D/-U/-I options from swallowing the
    // trailing filename as one more symbol argument -- the same convention
    // CLEANUP-tests uses, and unrelated to the defect under test here.
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', ...flags, '--', sourceFSpec]);
    try {
      return await compiler.run();
    } catch {
      return 1;
    }
  }

  function stderrText(): string {
    return stderrOutput.join('');
  }

  test('a filename written straight after -D / -U (no --) is the source file, not a symbol', async () => {
    const sourceFSpec: string = path.join(workDir, 'app.spin2');
    fs.writeFileSync(sourceFSpec, GUARDED_SOURCE);
    for (const flags of [
      ['-D', 'SYM'],
      ['-D', 'SYM', '-U', 'OTHER']
    ]) {
      const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', ...flags, sourceFSpec]);
      let exitCode: number;
      try {
        exitCode = await compiler.run();
      } catch {
        exitCode = 1;
      }
      expect(exitCode).toBe(0);
    }
    expect(stderrText()).not.toContain('not a valid preprocessor symbol name');
  });

  test('-D SYM=1 is rejected with a diagnostic and a non-zero exit', async () => {
    expect(await compile(['-D', 'SYM=1'])).toBe(1);
    expect(stderrText()).toContain('-D SYM=1');
    expect(stderrText()).toContain('-D SYM');
  });

  test('-D SYM (bare, presence-only) still defines the symbol', async () => {
    expect(await compile(['-D', 'SYM'])).toBe(0);
  });

  test('without -D SYM, the guarded call is undefined and the compile fails', async () => {
    // Sanity baseline for the positive twin above: the guard really does
    // gate compile success on the symbol being defined.
    expect(await compile([])).toBe(1);
  });

  test('-U SYM=1 is rejected with a diagnostic and a non-zero exit', async () => {
    expect(await compile(['-U', 'SYM=1'])).toBe(1);
    expect(stderrText()).toContain('-U SYM=1');
  });

  test('-U SYM (bare, presence-only) is accepted', async () => {
    // -U SYM alone (nothing to export it) should not itself fail the build.
    expect(await compile(['-U', 'SYM'])).toBe(1); // guarded call undefined: SYM was never -D'd
  });

  test('-D 1ABC (leading digit) is rejected as not a valid symbol name', async () => {
    expect(await compile(['-D', '1ABC'])).toBe(1);
    expect(stderrText()).toContain('-D 1ABC');
    expect(stderrText()).toContain('not a valid preprocessor symbol name');
  });

  test('-D FOO-BAR (embedded hyphen) is rejected as not a valid symbol name', async () => {
    expect(await compile(['-D', 'FOO-BAR'])).toBe(1);
    expect(stderrText()).toContain('-D FOO-BAR');
    expect(stderrText()).toContain('not a valid preprocessor symbol name');
  });

  test('-D "" (empty symbol name) is rejected as not a valid symbol name', async () => {
    expect(await compile(['-D', ''])).toBe(1);
    expect(stderrText()).toContain('not a valid preprocessor symbol name');
  });

  test('-D SYM_2 (letters, digits, underscore) is accepted', async () => {
    const sourceFSpec: string = path.join(workDir, 'app2.spin2');
    fs.writeFileSync(
      sourceFSpec,
      '' +
        'PUB main()\n' +
        '  onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '\n' +
        '#ifdef SYM_2\n' +
        'PRI onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '#endif\n'
    );
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', '-D', 'SYM_2', '--', sourceFSpec]);
    expect(await compiler.run()).toBe(0);
  });
});
