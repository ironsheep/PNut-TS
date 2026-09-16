/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PNutInTypeScript } from '../../pnut-ts';

// C-style '#if' / '#elseif' are not preprocessor directives PNut or PNut-TS
// support -- only #ifdef/#ifndef/#elseifdef/#elseifndef are (punch list §15b).
//
// Before this fix, '#if X' fell through the entire preProcess() directive
// chain and matched the CON-enumeration-start heuristic (a bare '#' followed
// by an identifier), so it was silently swallowed with no diagnostic at all;
// the first thing the author saw was an unrelated "unbalanced #endif" error
// pointing at the WRONG line. '#elseif X' fell through even worse: it
// matched the (unanchored) '#else' pattern and was silently treated as a
// bare '#else', discarding the condition with no diagnostic whatsoever.
//
// This suite proves both are now diagnosed on their own line, naming the
// supported spelling, and that the real forms (#ifdef/#ifndef/#elseifdef/
// #elseifndef) still compile normally (positive twin).
//
// Sources are synthesized into a fresh temp directory per test, following
// the pattern in CLI-tests/pnut-ts-cli-symbols.test.ts, rather than
// committed as TEST/ fixtures that only exist to be broken.

describe('PNut_ts diagnoses #if / #elseif at their own line', () => {
  let workDir: string;
  let stderrOutput: string[] = [];
  const originalStderrWrite = process.stderr.write;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-preproc-if-'));
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

  function stderrText(): string {
    return stderrOutput.join('');
  }

  async function compile(sourceFSpec: string, flags: string[] = []): Promise<number> {
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', ...flags, '--', sourceFSpec]);
    try {
      return await compiler.run();
    } catch {
      return 1;
    }
  }

  test('a bare #if is diagnosed on its own line, naming #ifdef/#ifndef', async () => {
    const sourceFSpec: string = path.join(workDir, 'app_if.spin2');
    fs.writeFileSync(
      sourceFSpec,
      '' +
        'PUB main()\n' + // line 1
        '  repeat\n' + // line 2
        '\n' + // line 3
        '#if X\n' + // line 4 <- diagnosed here
        'PRI foo()\n' + // line 5
        '  repeat\n' + // line 6
        '#endif\n' // line 7
    );
    expect(await compile(sourceFSpec)).toBe(1);
    const text = stderrText();
    expect(text).toContain(`app_if.spin2:4:error:`);
    expect(text).toContain('#if is not a supported preprocessor directive');
    expect(text).toContain('#ifdef');
    expect(text).toContain('#ifndef');
  });

  test('a bare #elseif is diagnosed on its own line, naming #elseifdef/#elseifndef', async () => {
    const sourceFSpec: string = path.join(workDir, 'app_elseif.spin2');
    fs.writeFileSync(
      sourceFSpec,
      '' +
        'PUB main()\n' + // line 1
        '  foo()\n' + // line 2
        '  repeat\n' + // line 3
        '\n' + // line 4
        '#ifdef SOMETHING\n' + // line 5
        'PRI foo()\n' + // line 6
        '  repeat\n' + // line 7
        '#elseif X\n' + // line 8 <- diagnosed here
        'PRI foo()\n' + // line 9
        '  repeat\n' + // line 10
        '#endif\n' // line 11
    );
    expect(await compile(sourceFSpec)).toBe(1);
    const text = stderrText();
    expect(text).toContain(`app_elseif.spin2:8:error:`);
    expect(text).toContain('#elseif is not a supported preprocessor directive');
    expect(text).toContain('#elseifdef');
    expect(text).toContain('#elseifndef');
    // Before the fix, '#elseif X' was silently matched by the '#else'
    // pattern and treated as a bare #else -- no diagnostic of any kind.
    expect(text).not.toBe('');
  });

  test('positive twin: #ifdef / #elseifdef / #else / #endif still compile cleanly', async () => {
    const sourceFSpec: string = path.join(workDir, 'app_ok.spin2');
    fs.writeFileSync(
      sourceFSpec,
      '' +
        'PUB main()\n' +
        '  onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '\n' +
        '#ifdef SYM\n' +
        'PRI onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '#elseifdef OTHER\n' +
        'PRI onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '#else\n' +
        'PRI onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '#endif\n'
    );
    expect(await compile(sourceFSpec, ['-D', 'SYM'])).toBe(0);
    expect(stderrText()).not.toContain('#if is not a supported preprocessor directive');
    expect(stderrText()).not.toContain('#elseif is not a supported preprocessor directive');
  });

  test('a CON enumeration starting at a constant named else... or endif... is not a directive', async () => {
    // '#else' and '#endif' match only as whole words: '#elsewhere, A, B' starts an
    // enumeration at the constant ELSEWHERE, it is not '#else' followed by text.
    const sourceFSpec: string = path.join(workDir, 'app_enum.spin2');
    fs.writeFileSync(
      sourceFSpec,
      '' +
        'CON\n' +
        '  elsewhere = 5\n' +
        '  endifx = 9\n' +
        '#elsewhere, alpha, beta\n' +
        '#endifx, gamma\n' +
        '\n' +
        'PUB main() | v\n' +
        '  v := alpha + beta + gamma\n' +
        '#ifdef NOPE\n' +
        '  v := 0\n' +
        "#else ' a comment after the directive\n" +
        '  v := 1\n' +
        "#endif' and one with no space\n"
    );
    expect(await compile(sourceFSpec)).toBe(0);
    expect(stderrText()).not.toContain('Must be preceeded by');
  });

  test('positive twin: #ifndef / #elseifndef still compile cleanly', async () => {
    const sourceFSpec: string = path.join(workDir, 'app_ok2.spin2');
    fs.writeFileSync(
      sourceFSpec,
      '' +
        'PUB main()\n' +
        '  onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '\n' +
        '#ifndef SYM\n' +
        'PRI onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '#elseifndef OTHER\n' +
        'PRI onlyDefinedWhenSymIsSet()\n' +
        '  repeat\n' +
        '#endif\n'
    );
    expect(await compile(sourceFSpec)).toBe(0);
    expect(stderrText()).not.toContain('#if is not a supported preprocessor directive');
    expect(stderrText()).not.toContain('#elseif is not a supported preprocessor directive');
  });
});
