/**
 * The `.map` Overrides column.
 *
 * `MEMORY LAYOUT` has carried an `Overrides` column since the map was written
 * and printed it empty every time: `ObjInstanceInfo` had `addOverride` and
 * friends, and nothing ever called them. Overrides are the reason one source
 * file becomes several images, so a reader was shown three identical-looking
 * rows with no account of why there were three.
 *
 * Two halves, and the second is the one with teeth. A direct child\'s overrides
 * are known to whichever object declared it, always. An override BELOW a cached
 * object is not: the hit is exactly what skipped re-parsing that OBJ block, so
 * the value has to ride in the entry\'s instance sidecar.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { fixturesDir, cleanupDir } from './cacheFixtures';

const toolPath = path.resolve(__dirname, '../../pnut-ts.js');

function stage(names: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-overrides-'));
  for (const name of names) fs.copyFileSync(path.join(fixturesDir, name), path.join(dir, name));
  return dir;
}

function compile(dir: string, entry: string, flags: string): void {
  execSync(`node ${toolPath} -m ${flags} ${entry}`, { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
}

function memoryLayout(dir: string, entry: string): string[] {
  const lines = fs.readFileSync(path.join(dir, entry.replace(/\.spin2$/, '.map')), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('=== MEMORY LAYOUT ==='));
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('=== '));
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => /^\s+\$[0-9A-F]+/.test(line));
}

describe('.map Overrides column', () => {
  describe('overrides declared at the top level', () => {
    const files = ['override_top.spin2', 'param_child.spin2'];
    let dir: string;

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-overrides-top-'));
      const src = path.resolve(__dirname, '../../../TEST/MAP-tests/test4-override');
      for (const name of files) fs.copyFileSync(path.join(src, name), path.join(dir, name));
    });
    afterEach(() => cleanupDir(dir));

    test('each instance shows the overrides it was declared with', () => {
      compile(dir, 'override_top.spin2', '');
      const rows = memoryLayout(dir, 'override_top.spin2');
      const child2 = rows.find((row) => /\bCHILD2\b/.test(row));
      const child3 = rows.find((row) => /\bCHILD3\b/.test(row));
      const child1 = rows.find((row) => /\bCHILD1\b/.test(row));
      expect(child2).toContain('DEFAULT_VALUE=20');
      expect(child3).toContain('DEFAULT_VALUE=30');
      expect(child3).toContain('MULTIPLIER=5');
      // child1 takes the defaults, so its cell stays empty.
      expect(child1?.trimEnd().endsWith('CHILD1')).toBe(true);
    }, 30_000);
  });

  describe('an override BELOW a cached object', () => {
    const files = ['ovr_deep_top.spin2', 'ovr_deep_mid.spin2', 'ovr_deep_leaf.spin2'];
    let dir: string;

    beforeEach(() => {
      dir = stage(files);
    });
    afterEach(() => cleanupDir(dir));

    test('survives a cache hit, so the warm map matches the cold one', () => {
      const cacheDir = path.join(dir, '.ovr-cache');
      compile(dir, 'ovr_deep_top.spin2', `--cache --cache-clear --cache-dir ${cacheDir}`);
      const cold = memoryLayout(dir, 'ovr_deep_top.spin2');
      expect(cold.find((row) => /M\.KID/.test(row))).toContain('LSEED=77');

      compile(dir, 'ovr_deep_top.spin2', `--cache --cache-dir ${cacheDir}`);
      const warm = memoryLayout(dir, 'ovr_deep_top.spin2');
      expect(warm.find((row) => /M\.KID/.test(row))).toContain('LSEED=77');
      expect(warm).toEqual(cold);
    }, 30_000);

    test('matches an uncached build exactly', () => {
      const cacheDir = path.join(dir, '.ovr-cache');
      compile(dir, 'ovr_deep_top.spin2', '');
      const uncached = memoryLayout(dir, 'ovr_deep_top.spin2');
      compile(dir, 'ovr_deep_top.spin2', `--cache --cache-clear --cache-dir ${cacheDir}`);
      compile(dir, 'ovr_deep_top.spin2', `--cache --cache-dir ${cacheDir}`);
      expect(memoryLayout(dir, 'ovr_deep_top.spin2')).toEqual(uncached);
    }, 30_000);
  });
});
