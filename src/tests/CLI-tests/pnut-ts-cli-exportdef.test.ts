/* eslint-disable no-console */
'use strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PNutInTypeScript } from '../../pnut-ts';

// `#pragma exportdef` exports a preprocessor symbol's PRESENCE only -- child files see it as defined for `#ifdef`/`#ifndef`,
// but the symbol never text-substitutes outside the file that defined it. This
// suite proves the presence half actually reaches a child's #ifdef (the part
// Preprocessor.md documents), and measures the diagnostic a child gets when it
// tries to use the exported symbol as a VALUE (e.g. `OBJ driver : MEMDRIVER`).
//
// Sources are synthesized into a fresh temp directory per test, following the
// pattern in CLI-tests/pnut-ts-cli-symbols.test.ts, rather than committed as
// TEST/ fixtures that only exist to be broken.

describe('#pragma exportdef propagates presence (not value) to a child object', () => {
  let workDir: string;
  let stderrOutput: string[] = [];
  const originalStderrWrite = process.stderr.write;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-cli-exportdef-'));
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

  async function compile(topFSpec: string): Promise<number> {
    const compiler = new PNutInTypeScript(['node', 'pnut-ts.js', '--', topFSpec]);
    try {
      return await compiler.run();
    } catch {
      return 1;
    }
  }

  test('a symbol exported from the top file reaches a child #ifdef', async () => {
    const topFSpec = path.join(workDir, 'top.spin2');
    const childFSpec = path.join(workDir, 'child.spin2');
    // #ifdef guards the DEFINITION of a method the child's own dummy() calls
    // unconditionally -- so the child (and therefore the whole compile) fails
    // with an undefined-identifier error if and only if USE_FEATURE did NOT
    // reach it, and succeeds if and only if it did.
    fs.writeFileSync(
      topFSpec,
      '' +
        '#pragma exportdef USE_FEATURE\n' +
        '#define USE_FEATURE\n' +
        '\n' +
        'OBJ\n' +
        '  child : "child.spin2"\n' +
        '\n' +
        'PUB main()\n' +
        '  child.dummy()\n'
    );
    fs.writeFileSync(
      childFSpec,
      '' +
        'PUB dummy()\n' +
        '  onlyDefinedWhenFeatureIsSet()\n' +
        '\n' +
        '#ifdef USE_FEATURE\n' +
        'PRI onlyDefinedWhenFeatureIsSet()\n' +
        '  repeat\n' +
        '#endif\n'
    );
    expect(await compile(topFSpec)).toBe(0);
  });

  test('without the export, the child does not see the symbol and the compile fails', async () => {
    // Sanity baseline for the positive twin above: the child's #ifdef really
    // does gate compile success on the symbol reaching it, not on something
    // else (e.g. the child's own source happening to define the method).
    const topFSpec = path.join(workDir, 'top.spin2');
    const childFSpec = path.join(workDir, 'child.spin2');
    fs.writeFileSync(
      topFSpec,
      '' + '#define USE_FEATURE\n' + '\n' + 'OBJ\n' + '  child : "child.spin2"\n' + '\n' + 'PUB main()\n' + '  child.dummy()\n'
    );
    fs.writeFileSync(
      childFSpec,
      '' +
        'PUB dummy()\n' +
        '  onlyDefinedWhenFeatureIsSet()\n' +
        '\n' +
        '#ifdef USE_FEATURE\n' +
        'PRI onlyDefinedWhenFeatureIsSet()\n' +
        '  repeat\n' +
        '#endif\n'
    );
    expect(await compile(topFSpec)).toBe(1);
  });

  test('a child using an exported symbol as an OBJ filename value gets a diagnostic naming the presence-only scope', async () => {
    const topFSpec = path.join(workDir, 'top.spin2');
    const childFSpec = path.join(workDir, 'child.spin2');
    fs.writeFileSync(
      topFSpec,
      '' +
        '#define MEMDRIVER "driver2.spin2"\n' +
        '#pragma exportdef MEMDRIVER\n' +
        '\n' +
        'OBJ\n' +
        '  child : "child.spin2"\n' +
        '\n' +
        'PUB main()\n' +
        '  child.dummy()\n'
    );
    fs.writeFileSync(childFSpec, '' + 'OBJ\n' + '  driver : MEMDRIVER\n' + '\n' + 'PUB dummy()\n' + '  driver.hello()\n');
    fs.writeFileSync(path.join(workDir, 'driver2.spin2'), 'PUB hello()\n');
    expect(await compile(topFSpec)).toBe(1);
    expect(stderrText()).toContain('"MEMDRIVER" is a preprocessor symbol');
    expect(stderrText()).toContain('presence only');
  });
});
