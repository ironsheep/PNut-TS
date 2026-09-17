/**
 * Map File Verification Tests (Map-Instance-Correctness §5)
 *
 * Eight named fixtures, each compiled once (staged into a temp tree — see
 * `TEST/MAP-tests/README.md` for what each one checks) and checked with
 * `verifyMapAgainstExpected` against its `expected.json`. `expected.json`
 * carries only facts a human can check against source; every address in the
 * check comes from the map itself, cross-checked against mapOracle's
 * independent header-walk decode of the `.lst`.
 *
 * `mapFormat.test.ts` already covers the spec's worked example, warm==cold
 * and named edge cases — this suite does not repeat that; it owns the eight
 * named fixtures' exact facts instead.
 */

/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import { compileSpin2, StagedTree, stageTree } from '../CACHE-tests/cacheFixtures';
import { formatResults, verifyMapAgainstExpected } from './verify-map';

const TEST_DIR = path.resolve(__dirname, '../../../TEST/MAP-tests');
const COMPILE_TIMEOUT_MS = 60000;

interface Fixture {
  dir: string;
  top: string;
  files: string[];
}

const FIXTURES: Record<string, Fixture> = {
  'test1-simple': { dir: 'test1-simple', top: 'simple_top.spin2', files: ['simple_top.spin2', 'simple_child.spin2'] },
  'test2-deep': { dir: 'test2-deep', top: 'deep_top.spin2', files: ['deep_top.spin2', 'deep_mid.spin2', 'deep_leaf.spin2'] },
  'test3-wide': { dir: 'test3-wide', top: 'wide_top.spin2', files: ['wide_top.spin2', 'wide_a.spin2', 'wide_b.spin2', 'wide_c.spin2'] },
  'test4-override': { dir: 'test4-override', top: 'override_top.spin2', files: ['override_top.spin2', 'param_child.spin2'] },
  'test5-inline': { dir: 'test5-inline', top: 'inline_top.spin2', files: ['inline_top.spin2'] },
  'test6-hubexec': { dir: 'test6-hubexec', top: 'hubexec_top.spin2', files: ['hubexec_top.spin2'] },
  'test7-version': { dir: 'test7-version', top: 'version_top.spin2', files: ['version_top.spin2'] },
  'test8-struct': { dir: 'test8-struct', top: 'struct_map.spin2', files: ['struct_map.spin2'] }
};

/** Stage a fixture's sources and its expected.json into a fresh temp tree. Nothing is written under TEST/. */
function stageFixture(name: string): StagedTree {
  const fixture = FIXTURES[name];
  const sources = [...fixture.files, 'expected.json'].map((f) => path.join(TEST_DIR, fixture.dir, f));
  return stageTree(sources, name);
}

describe.each(Object.keys(FIXTURES))('Map File Verification: %s', (name) => {
  const fixture = FIXTURES[name];
  const expectedJson = JSON.parse(fs.readFileSync(path.join(TEST_DIR, fixture.dir, 'expected.json'), 'utf8'));
  let tree: StagedTree;

  beforeAll(() => {
    tree = stageFixture(name);
    compileSpin2(tree.dir, fixture.top, '-l -m');
  }, COMPILE_TIMEOUT_MS);

  afterAll(() => {
    tree.cleanup();
  });

  it('verifies map against expected.json, cross-checked against mapOracle', () => {
    const result = verifyMapAgainstExpected(tree.dir);
    if (!result.passed) {
      console.log(formatResults(result));
    }
    expect(result.passed).toBe(true);
  });

  it('has the expected instance and image counts', () => {
    const result = verifyMapAgainstExpected(tree.dir);
    const instCheck = result.checks.find((c) => c.name === 'instance count');
    const imgCheck = result.checks.find((c) => c.name === 'image count');
    expect(instCheck?.passed).toBe(true);
    expect(instCheck?.expected).toBe(String(expectedJson.totals.instance_count));
    expect(imgCheck?.passed).toBe(true);
    expect(imgCheck?.expected).toBe(String(expectedJson.totals.image_count));
  });
});

/**
 * test4-override forks one source file into three images. This is the case
 * that exposed both faults the old grammar's checker missed: every symbol
 * appearing once at the first image's base, and method rows carrying
 * header-table slot indices in a column headed "Address".
 */
describe('test4-override — index sections describe every image', () => {
  let tree: StagedTree;

  beforeAll(() => {
    tree = stageFixture('test4-override');
    compileSpin2(tree.dir, 'override_top.spin2', '-l -m');
  }, COMPILE_TIMEOUT_MS);

  afterAll(() => {
    tree.cleanup();
  });

  function mapText(): string {
    return fs.readFileSync(path.join(tree.dir, 'override_top.map'), 'utf8');
  }

  function sectionOf(name: string): string[] {
    const lines = mapText().split(/\r?\n/);
    const start = lines.findIndex((l: string) => l.startsWith(`=== ${name} ===`));
    expect(start).toBeGreaterThanOrEqual(0);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((l: string) => l.startsWith('=== '));
    return (end === -1 ? rest : rest.slice(0, end)).filter((l: string) => l.trim().length > 0);
  }

  it('SYMBOL INDEX carries one row per instance, each at its own address', () => {
    const rows = sectionOf('SYMBOL INDEX').filter((l) => /^\s+COMPUTE\s/.test(l));
    expect(rows).toHaveLength(3);

    const owners = rows.map((l) => l.trim().split(/\s+/)[2]);
    expect(owners.sort()).toEqual(['#2', '#3', '#4']);

    const addresses = rows.map((l) => l.trim().split(/\s+/)[3]);
    expect(new Set(addresses).size).toBe(3);
  });

  it('ADDRESS INDEX lists every image and stays in ascending address order', () => {
    const rows = sectionOf('ADDRESS INDEX').filter((l) => /^\s+\$[0-9A-F]+\s/.test(l));
    const addresses = rows.map((l) => parseInt(l.trim().split(/\s+/)[0].replace('$', ''), 16));
    expect(addresses).toEqual([...addresses].sort((a, b) => a - b));

    const imageStartRows = rows.filter((l) => /\sIMAGE\s/.test(l));
    expect(imageStartRows).toHaveLength(4);
  });

  it('every METHOD address falls inside its own image, not at a slot index', () => {
    const layout = sectionOf('MEMORY LAYOUT')
      .map((l) => l.match(/^\s*\$([0-9A-F]+)-\$([0-9A-F]+)\s+\d+\s+#(\d+)/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => ({ start: parseInt(m[1], 16), end: parseInt(m[2], 16), image: `#${m[3]}` }));
    expect(layout.length).toBeGreaterThan(0);

    const methodRows = sectionOf('ADDRESS INDEX').filter((l) => /\sMETHOD\s/.test(l));
    expect(methodRows.length).toBeGreaterThan(0);

    for (const row of methodRows) {
      const parts = row.trim().split(/\s+/);
      const address = parseInt(parts[0].replace('$', ''), 16);
      const owner = layout.find((o) => o.image === parts[2]);
      expect(owner).toBeDefined();
      // A slot index would be a small number far below its image's base.
      expect(address).toBeGreaterThanOrEqual(owner!.start);
      expect(address).toBeLessThanOrEqual(owner!.end);
    }
  });
});
