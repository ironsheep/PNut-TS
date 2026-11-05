/** @format */

// Map output for sources the shape matrix does not reach: a PASM image with no
// named symbols, a source file whose name contains a space, and override
// constants that are floats. The format is `DOCs/internals/MAP-File-Format.md`.
//
// Every compile runs in an OS temp directory.

'use strict';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const toolPath: string = path.resolve(__dirname, '../../pnut-ts.js');
const COMPILE_TIMEOUT_MS = 120000;

describe('.map corners', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-map-corner-'));
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  function compileWithMap(topName: string): string {
    const result = spawnSync(process.execPath, [toolPath, '-m', '--', topName], { cwd: workDir, encoding: 'utf8' });
    expect(result.status).toBe(0);
    return fs.readFileSync(path.join(workDir, topName.replace(/\.spin2$/i, '.map')), 'utf8');
  }

  test(
    'a PASM image with no labels has an empty SYMBOL INDEX and a one-row ADDRESS INDEX',
    () => {
      fs.writeFileSync(path.join(workDir, 'nolabels.spin2'), '{Spin2_v55}\nDAT\n  org\n  nop\n');
      const map = compileWithMap('nolabels.spin2');
      expect(map).toContain('=== SYMBOL INDEX ===\n\n  (none)\n');
      expect(map).toContain('=== ADDRESS INDEX ===');
      expect(map).toMatch(/\$00000 {3}IMAGE {2}#1 {5}\(start\)/);
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'a child source file whose name has a space is written with %20, and float overrides are written as plain decimals',
    () => {
      fs.writeFileSync(path.join(workDir, 'my child.spin2'), 'CON\n  SCALE = 1.0\n  TINY = 1.0\nPUB compute() : v\n  v := round(SCALE * TINY)\n');
      fs.writeFileSync(
        path.join(workDir, 'top.spin2'),
        '{Spin2_v55}\nCON\n  _CLKFREQ = 160_000_000\nOBJ\n  c1 : "my child" | SCALE = 1.0e10, TINY = 1.0e-7\n  c2 : "my child" | SCALE = 12345.5\nPUB main() | i\n  i := c1.compute() + c2.compute()\n'
      );
      const map = compileWithMap('top.spin2');
      expect(map).toContain('my%20child.spin2');
      expect(map).not.toContain('my child.spin2');
      expect(map).toContain('SCALE=10000000000.0,TINY=0.0000001');
      expect(map).toContain('SCALE=12345.5');
    },
    COMPILE_TIMEOUT_MS
  );
});
