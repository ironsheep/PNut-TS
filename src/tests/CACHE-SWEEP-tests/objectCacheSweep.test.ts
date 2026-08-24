/**
 * Systematic mutation sweep: change EVERY input, one at a time.
 *
 * The hand-written invalidation tests each assert that one mutation someone
 * thought of is noticed. This asserts the general property instead: for every
 * file a fixture tree is built from, editing that file and rebuilding warm must
 * produce exactly what an uncached build of the same edited tree produces --
 * binary AND map.
 *
 * Why it is worth having, stated honestly: it is insurance against the NEXT
 * change to cache code, not proof of the current one. It can only mutate inputs
 * that appear in fixtures we wrote, and the defect class that has actually bitten
 * this project five times is "an input nobody realised was an input" -- which no
 * mutation sweep can invent. What it does catch is a regression in a pattern we
 * already cover, immediately, without anyone remembering to write the test.
 *
 * Kept out of the standard regression run because it is roughly a hundred
 * compiles. Run with `npm run test-cache-sweep`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { fixturesDir, cleanupDir } from '../CACHE-tests/cacheFixtures';

const toolPath = path.resolve(__dirname, '../../pnut-ts.js');

interface Tree {
  label: string;
  entry: string;
  files: string[];
  /** extra compiler flags applied identically to every compile in the sweep */
  flags: string;
}

const TREES: Tree[] = [
  {
    label: 'singleton diamond, depth 3 + DAT FILE',
    entry: 'sgl_app_top.spin2',
    files: [
      'sgl_app_top.spin2',
      'sgl_shared_state.spin2',
      'sgl_svc_logger.spin2',
      'sgl_svc_config.spin2',
      'sgl_fmt_util.spin2',
      'sgl_tick_leaf.spin2',
      'sgl_cfg_defaults.dat'
    ],
    flags: ''
  },
  {
    label: 'singleton diamond with debug',
    entry: 'sgl_app_top.spin2',
    files: [
      'sgl_app_top.spin2',
      'sgl_shared_state.spin2',
      'sgl_svc_logger.spin2',
      'sgl_svc_config.spin2',
      'sgl_fmt_util.spin2',
      'sgl_tick_leaf.spin2',
      'sgl_cfg_defaults.dat'
    ],
    flags: '-d'
  },
  {
    label: 'exportdef subtree',
    entry: 'expdef_subtree_parent.spin2',
    files: ['expdef_subtree_parent.spin2', 'expdef_subtree_sd_child.spin2', 'expdef_subtree_utils_child.spin2', 'expdef_subtree_grandchild.spin2'],
    flags: ''
  },
  {
    label: 'exportdef key isolation',
    entry: 'expdef_parentX.spin2',
    files: ['expdef_parentX.spin2', 'expdef_shared_child.spin2', 'expdef_grandchild.spin2'],
    flags: ''
  },
  {
    label: 'override below a cached object',
    entry: 'ovr_deep_top.spin2',
    files: ['ovr_deep_top.spin2', 'ovr_deep_mid.spin2', 'ovr_deep_leaf.spin2'],
    flags: ''
  },
  {
    label: 'optimizer rewind with debug',
    entry: 'optblock_rewind_parent.spin2',
    files: ['optblock_rewind_parent.spin2', 'optblock_rewind_child.spin2'],
    flags: '-d'
  }
];

/**
 * Apply a semantic edit to one staged input.
 *
 * Two tiers on purpose. Bumping an integer is the smallest edit that changes
 * emitted code, but plenty of files have no convenient literal -- and skipping
 * those would quietly shrink the sweep to whatever happened to be easy. So the
 * fallback appends a method, which always changes the object's size and its
 * header table.
 */
function mutate(filePath: string): string {
  if (filePath.endsWith('.dat')) {
    const data = fs.readFileSync(filePath);
    data[0] = (data[0] + 1) & 0xff;
    fs.writeFileSync(filePath, data);
    return 'blob byte 0 incremented';
  }
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const code = lines[index].split("'")[0];
    if (code.trim().length === 0 || code.trimStart().startsWith('#')) continue;
    const match = code.match(/(?<![\w$%])(\d+)(?![\w])/);
    if (match !== null && match.index !== undefined) {
      const bumped = String(Number(match[1]) + 7);
      lines[index] = code.slice(0, match.index) + bumped + code.slice(match.index + match[1].length) + lines[index].slice(code.length);
      fs.writeFileSync(filePath, lines.join('\n'));
      return `literal ${match[1]} -> ${bumped} on line ${index + 1}`;
    }
  }
  fs.appendFileSync(filePath, '\n\nPUB sweep_probe() : r\n  r := 1\n');
  return 'appended a PUB method';
}

function compile(dir: string, entry: string, flags: string): void {
  execSync(`node ${toolPath} -m ${flags} ${entry}`, { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
}

function artifacts(dir: string, entry: string): { binary: Buffer; map: string } {
  const base = entry.replace(/\.spin2$/i, '');
  return {
    binary: fs.readFileSync(path.join(dir, `${base}.bin`)),
    map: fs
      .readFileSync(path.join(dir, `${base}.map`), 'utf8')
      .split(/\r?\n/)
      .filter((line) => !line.startsWith('Generated:'))
      .join('\n')
  };
}

describe.each(TREES)('mutation sweep: $label', ({ entry, files, flags }) => {
  test.each(files)(
    'editing %s is reflected in the warm build',
    (target) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-sweep-'));
      try {
        for (const name of files) fs.copyFileSync(path.join(fixturesDir, name), path.join(dir, name));
        const cacheDir = path.join(dir, '.sweep-cache');

        // Populate the cache from the pristine tree, exactly as a first build would.
        compile(dir, entry, `${flags} --cache --cache-clear --cache-dir ${cacheDir}`);

        mutate(path.join(dir, target));

        // Rebuild warm, then build the same edited tree with no cache at all.
        compile(dir, entry, `${flags} --cache --cache-dir ${cacheDir}`);
        const warm = artifacts(dir, entry);
        compile(dir, entry, flags);
        const truth = artifacts(dir, entry);

        expect(warm.binary.length).toBe(truth.binary.length);
        expect(Buffer.compare(warm.binary, truth.binary)).toBe(0);
        expect(warm.map).toBe(truth.map);
      } finally {
        cleanupDir(dir);
      }
    },
    60_000
  );
});
