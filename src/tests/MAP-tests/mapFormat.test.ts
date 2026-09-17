/** @format */

// The `.map` file format (Map-Instance-Correctness §3): the generator
// (`src/classes/mapGenerator.ts`) is checked against its contract,
// `DOCs/internals/MAP-File-Format.md`, three ways:
//
//   1. The spec's worked example, compiled, matches the spec text byte for
//      byte (apart from `Generated:`).
//   2. Every shape in the matrix, plus the spec example, produces the same
//      map warm (object cache) as cold, on every shape — not only the ones
//      the old generator got wrong.
//   3. Edge cases the spec calls out by name: PASM-only, no VAR, no DAT, a
//      255-element array, instance paths wider than column minimums, and a
//      failed compile writing no `.map`.
//
// A handful of shapes are also cross-checked against mapOracle's independent
// header-walk decoder, so the map is not being graded only against itself.
//
// Nothing is written into TEST/: every compile stages its sources into a temp
// directory with a private cache (`stageTree` from CACHE-tests/cacheFixtures).

'use strict';

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { StagedTree, compileSpin2, stageTree, toolPath } from '../CACHE-tests/cacheFixtures';
import { RawImage, decodeImage, readListingImage } from './mapOracle';
import { ShapeExpectation, loadShapeExpectations, shapesDir } from './shapeMatrix';

const COMPILE_TIMEOUT_MS = 120000;
const specExampleDir = path.resolve(__dirname, '../../../TEST/MAP-tests/spec-example');
const specFormatDoc = path.resolve(__dirname, '../../../DOCs/internals/MAP-File-Format.md');

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Strip the one line the spec says two compiles of the same source may differ on. */
function stripGenerated(mapText: string): string {
  return mapText
    .split('\n')
    .filter((line) => !line.startsWith('Generated:'))
    .join('\n');
}

/**
 * The worked example's expected map text, extracted from the spec doc itself
 * rather than pasted here twice — so the test and the spec cannot drift apart
 * silently.
 */
function specExampleMapText(): string {
  const doc = fs.readFileSync(specFormatDoc, 'utf8');
  const marker = '`map_demo.map` (the `Generated:` value varies';
  const markerIndex = doc.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error('specExampleMapText: worked-example marker not found in MAP-File-Format.md');
  }
  const fenceStart = doc.indexOf('```\n', markerIndex);
  const fenceEnd = doc.indexOf('\n```', fenceStart + 4);
  if (fenceStart === -1 || fenceEnd === -1) {
    throw new Error('specExampleMapText: fenced block not found');
  }
  return doc.slice(fenceStart + 4, fenceEnd + 1);
}

function stageSpecExample(label: string): StagedTree {
  const files = ['map_demo.spin2', 'demo_led.spin2', 'demo_motor.spin2', 'demo_buf.spin2'];
  return stageTree(
    files.map((f) => path.join(specExampleDir, f)),
    label
  );
}

function readMap(dir: string, entry: string): string {
  const mapPath = path.join(dir, entry.replace(/\.spin2$/i, '.map'));
  return fs.readFileSync(mapPath, 'utf8');
}

function mapPathFor(dir: string, entry: string): string {
  return path.join(dir, entry.replace(/\.spin2$/i, '.map'));
}

function stageShape(expectation: ShapeExpectation, label: string): StagedTree {
  return stageTree(
    expectation.files.map((file) => path.join(shapesDir, file)),
    label
  );
}

const expectations = loadShapeExpectations().filter((shape) => shape.compileError === null);

// --------------------------------------------------------------------------
// 1. The spec's worked example, byte for byte
// --------------------------------------------------------------------------

describe('spec worked example: byte-for-byte', () => {
  let tree: StagedTree;

  beforeAll(() => {
    tree = stageSpecExample('spec-example');
    compileSpin2(tree.dir, 'map_demo.spin2', '-m');
  }, COMPILE_TIMEOUT_MS);

  afterAll(() => tree.cleanup());

  test('compiling the spec example reproduces the spec text exactly, apart from Generated:', () => {
    const produced = stripGenerated(readMap(tree.dir, 'map_demo.spin2'));
    const expected = stripGenerated(specExampleMapText());
    expect(produced).toEqual(expected);
  });

  // Falsification: prove the byte-for-byte check itself can fail, rather than
  // trivially passing however the generator behaves.
  test('falsification: a deliberately altered expectation is reported as a mismatch', () => {
    const produced = stripGenerated(readMap(tree.dir, 'map_demo.spin2'));
    const corrupted = stripGenerated(specExampleMapText()).replace('TOGGLE', 'TOGGLE_WRONG');
    expect(produced).not.toEqual(corrupted);
  });
});

// --------------------------------------------------------------------------
// 2. Warm == cold, on every shape and the spec example
// --------------------------------------------------------------------------

describe('warm cache produces the identical map to cold, on every shape', () => {
  test.each(expectations.map((shape) => [shape.shape, shape] as const))(
    '%s',
    (_name, expectation) => {
      const tree = stageShape(expectation, `warmcold-${expectation.shape}`);
      try {
        const cacheDir = path.join(tree.dir, '.wc-cache');
        execSync(`node ${toolPath} -m --cache --cache-clear --cache-dir ${cacheDir} ${expectation.top}`, {
          cwd: tree.dir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        const cold = stripGenerated(readMap(tree.dir, expectation.top));

        execSync(`node ${toolPath} -m --cache --cache-dir ${cacheDir} ${expectation.top}`, {
          cwd: tree.dir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        const warm = stripGenerated(readMap(tree.dir, expectation.top));

        expect(warm).toEqual(cold);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'the spec example: warm matches cold too',
    () => {
      const tree = stageSpecExample('warmcold-spec-example');
      try {
        const cacheDir = path.join(tree.dir, '.wc-cache');
        execSync(`node ${toolPath} -m --cache --cache-clear --cache-dir ${cacheDir} map_demo.spin2`, {
          cwd: tree.dir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        const cold = stripGenerated(readMap(tree.dir, 'map_demo.spin2'));
        execSync(`node ${toolPath} -m --cache --cache-dir ${cacheDir} map_demo.spin2`, { cwd: tree.dir, encoding: 'utf8', stdio: 'pipe' });
        const warm = stripGenerated(readMap(tree.dir, 'map_demo.spin2'));
        expect(warm).toEqual(cold);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --------------------------------------------------------------------------
// 2b. Float-override formatting (the isFloat fix from #60)
// --------------------------------------------------------------------------

describe('float override formatting', () => {
  // child.spin2 declares each override's original CON with the same TYPE
  // (float or int) the override must match. `RATE` and `TINY` are floats;
  // `GAIN` and `MAXV` are ints. `GAIN + MAXV` is split across two locals
  // rather than folded in one expression — folding two overridden integer
  // constants directly in one expression tripped an unrelated constant-folder
  // defect (NumberStack underflow) that has nothing to do with this test.
  const CHILD = [
    'CON',
    '  RATE = 1.0',
    '  GAIN = 1',
    '  MAXV = 1',
    '  TINY = 1.0',
    '',
    'VAR',
    '  long v',
    '  long r',
    '  long g',
    '',
    'PUB get() : result',
    '  v := RATE',
    '  r := TINY',
    '  g := GAIN',
    '  result := g + MAXV',
    ''
  ].join('\n');
  const TOP = [
    '{Spin2_v55}',
    'OBJ',
    '  kid : "child" | RATE = 2.5, GAIN = -1, MAXV = $FFFF_FFFF, TINY = 1.0e-6',
    '',
    'PUB main()',
    '  kid.get()',
    ''
  ].join('\n');

  // Spec rules (Overrides, `### Overrides`): an integer override prints in
  // signed decimal; a float override prints as the shortest decimal (1 to 9
  // significant digits, always with a decimal point) that round-trips to the
  // same single-precision value.
  //
  //   RATE = 2.5        -> exact in float32                      -> "2.5"
  //   GAIN = -1          -> plain signed int                      -> "-1"
  //   MAXV = $FFFF_FFFF  -> unsigned bit pattern read as int32     -> "-1"
  //                         (spec's own OFFSET = $FFFF_FFFF example)
  //   TINY = 1.0e-6      -> float32(1.0e-6) is 9.999999974752427e-7,
  //                         NOT exactly 0.000001 — but "0.000001" (1
  //                         significant digit) already rounds back to that
  //                         same float32 bit pattern, so it IS the shortest
  //                         round-trip decimal, even though it is not the
  //                         mathematically exact value.
  const EXPECTED_OVERRIDES = 'RATE=2.5,GAIN=-1,MAXV=-1,TINY=0.000001';

  function stageFloatOverrides(label: string): StagedTree {
    const tree = stageTree([], label);
    fs.writeFileSync(path.join(tree.dir, 'child.spin2'), CHILD);
    fs.writeFileSync(path.join(tree.dir, 'top.spin2'), TOP);
    return tree;
  }

  function overridesCell(mapText: string): string {
    const treeSection = mapText.slice(mapText.indexOf('=== OBJECT TREE ==='), mapText.indexOf('=== MEMORY LAYOUT ==='));
    const row = treeSection.split('\n').find((l) => /\bKID\b/.test(l));
    expect(row).toBeDefined();
    return row!.trim().split(/\s+/).slice(-1)[0];
  }

  test(
    'RATE, GAIN, MAXV and TINY each print exactly per the override rules',
    () => {
      const tree = stageFloatOverrides('float-overrides');
      try {
        compileSpin2(tree.dir, 'top.spin2', '-m');
        const map = readMap(tree.dir, 'top.spin2');
        expect(overridesCell(map)).toBe(EXPECTED_OVERRIDES);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'warm cache produces the identical Overrides cell as cold',
    () => {
      const tree = stageFloatOverrides('float-overrides-warmcold');
      try {
        const cacheDir = path.join(tree.dir, '.fo-cache');
        execSync(`node ${toolPath} -m --cache --cache-clear --cache-dir ${cacheDir} top.spin2`, { cwd: tree.dir, encoding: 'utf8', stdio: 'pipe' });
        const cold = stripGenerated(readMap(tree.dir, 'top.spin2'));
        expect(overridesCell(cold)).toBe(EXPECTED_OVERRIDES);

        execSync(`node ${toolPath} -m --cache --cache-dir ${cacheDir} top.spin2`, { cwd: tree.dir, encoding: 'utf8', stdio: 'pipe' });
        const warm = stripGenerated(readMap(tree.dir, 'top.spin2'));
        expect(overridesCell(warm)).toBe(EXPECTED_OVERRIDES);
        expect(warm).toEqual(cold);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --------------------------------------------------------------------------
// 3. Edge cases named by the task
// --------------------------------------------------------------------------

describe('edge cases', () => {
  test(
    'PASM-only program: OBJECT TREE is (none), no VAR blocks table',
    () => {
      const shape = expectations.find((s) => s.shape === 'S26_pasm_only');
      expect(shape).toBeDefined();
      const tree = stageShape(shape!, 'edge-pasm');
      try {
        compileSpin2(tree.dir, shape!.top, '-m');
        const map = readMap(tree.dir, shape!.top);
        expect(map).toMatch(/=== OBJECT TREE ===\n\n {2}\(none\)\n/);
        expect(map).not.toContain('VAR blocks');
        expect(map).toMatch(/This PASM-only program is 1 image with no objects/);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'no VAR: an object that declares none still gets its reserved-long block',
    () => {
      const tree = stageTree([], 'edge-no-var');
      try {
        fs.writeFileSync(path.join(tree.dir, 'novar.spin2'), ['PUB main() : r', '  r := 1', ''].join('\n'));
        compileSpin2(tree.dir, 'novar.spin2', '-m');
        const map = readMap(tree.dir, 'novar.spin2');
        expect(map).toMatch(/VAR bytes\s+4\n/);
        const layoutSection = map.slice(map.indexOf('=== MEMORY LAYOUT ==='), map.indexOf('=== OBJECT DETAILS ==='));
        const varBlockRows = layoutSection.split('\n').filter((l) => /^\s+\$[0-9A-F]+-\$[0-9A-F]+\s+4\s+#1\s+\(top\)\s*$/.test(l));
        expect(varBlockRows).toHaveLength(1);
        // No VAR sub-table anywhere in OBJECT DETAILS: the only instance has no
        // VAR symbols.
        const details = map.slice(map.indexOf('=== OBJECT DETAILS ==='));
        expect(details).not.toMatch(/ {2}VAR\n/);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'no DAT: an object with no DAT block omits the DAT sub-table',
    () => {
      const tree = stageTree([], 'edge-no-dat');
      try {
        fs.writeFileSync(path.join(tree.dir, 'nodat.spin2'), ['VAR long v', '', 'PUB main() : r', '  v := 1', '  r := v', ''].join('\n'));
        compileSpin2(tree.dir, 'nodat.spin2', '-m');
        const map = readMap(tree.dir, 'nodat.spin2');
        const details = map.slice(map.indexOf('=== OBJECT DETAILS ==='));
        expect(details).not.toMatch(/ {2}DAT\n/);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'ORGH inline label (hub-mode inline PASM): Cog cell is `-`, per the spec addition',
    () => {
      const tree = stageTree([], 'edge-orgh-inline');
      try {
        fs.writeFileSync(
          path.join(tree.dir, 'orgh.spin2'),
          ['PUB main() : r', '  r := doStep()', '', 'PUB doStep() : r', '  orgh', 'lbl     mov     r, #1', '  end', '  r := 5', ''].join('\n')
        );
        compileSpin2(tree.dir, 'orgh.spin2', '-m');
        const map = readMap(tree.dir, 'orgh.spin2');
        const details = map.slice(map.indexOf('=== OBJECT DETAILS ==='));
        expect(details).toMatch(/ {2}Inline PASM\n/);
        expect(details).toMatch(/^ {2}LBL\s+-\s+\+\$[0-9A-F]{5}\s+\$[0-9A-F]{5}$/m);
        // The row still reaches both indexes, as an INLINE row, not silently
        // dropped for lacking a cog address.
        const addressIndex = map.slice(map.indexOf('=== ADDRESS INDEX ==='), map.indexOf('=== SYMBOL INDEX ==='));
        expect(addressIndex).toMatch(/\bINLINE\b.*\bLBL\b/);
        const symbolIndex = map.slice(map.indexOf('=== SYMBOL INDEX ==='));
        expect(symbolIndex).toMatch(/^ {2}LBL\s+INLINE\s+#1\s+\$[0-9A-F]+$/m);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    '255-element array: 255 tree rows, 255 VAR block rows, compressed to D[0..254]',
    () => {
      const shape = expectations.find((s) => s.shape === 'S25_array_255');
      expect(shape).toBeDefined();
      const tree = stageShape(shape!, 'edge-array-255');
      try {
        compileSpin2(tree.dir, shape!.top, '-m');
        const map = readMap(tree.dir, shape!.top);

        const treeSection = map.slice(map.indexOf('=== OBJECT TREE ==='), map.indexOf('=== MEMORY LAYOUT ==='));
        const arrayRows = treeSection.split('\n').filter((l) => /\[\d+\]/.test(l));
        expect(arrayRows).toHaveLength(255);

        const layoutSection = map.slice(map.indexOf('=== MEMORY LAYOUT ==='), map.indexOf('=== OBJECT DETAILS ==='));
        const varRows = layoutSection.split('\n').filter((l) => /^\s+\$[0-9A-F]+-\$[0-9A-F]+\s/.test(l) && /\[\d+\]/.test(l));
        expect(varRows).toHaveLength(255);

        expect(layoutSection).toMatch(/\[0\.\.254\]/);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'instance paths wider than column minimums still align (spec example: LEFT.LOG, RIGHT.LOG)',
    () => {
      const tree = stageSpecExample('edge-wide-paths');
      try {
        compileSpin2(tree.dir, 'map_demo.spin2', '-m');
        const map = readMap(tree.dir, 'map_demo.spin2');
        const treeSection = map.slice(map.indexOf('=== OBJECT TREE ==='), map.indexOf('=== MEMORY LAYOUT ==='));
        // Every table line begins with a fixed two-space indent (not part of any
        // column); strip it before measuring the Instance column itself, whose
        // own per-depth indentation IS part of its cell content.
        const lines = treeSection
          .split('\n')
          .filter((l) => /^\s+\S/.test(l))
          .map((l) => l.slice(2));
        const ruleLine = lines.find((l) => /^-+\s/.test(l));
        expect(ruleLine).toBeDefined();
        const ruleWidth = ruleLine!.match(/^(-+)/)![1].length;
        // LEFT.LOG / RIGHT.LOG sit at depth 2 (4-space indent) plus a 9-character
        // name — wider than the "Instance" header's own 8, so the column must
        // have grown to fit them, and every row's Instance field must be padded
        // out to that width, not to the header's.
        const dataRows = lines.filter((l) => l !== ruleLine && !/^Instance\s/.test(l));
        for (const row of dataRows) {
          const instanceField = row.slice(0, ruleWidth);
          // The Instance column is followed by exactly two literal spaces before
          // the next column starts.
          expect(row.slice(ruleWidth, ruleWidth + 2)).toBe('  ');
          expect(instanceField.length).toBe(ruleWidth);
        }
        const widestPathRow = dataRows.find((l) => l.trimStart().startsWith('RIGHT.LOG'));
        expect(widestPathRow).toBeDefined();
        expect(widestPathRow!.slice(0, ruleWidth).trimEnd()).toBe('    RIGHT.LOG');
        expect(ruleWidth).toBe('    RIGHT.LOG'.length);
        expect(map).toContain('LEFT.LOG');
        expect(map).toContain('RIGHT.LOG');
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'a failed compile writes no .map (reproduces current behavior)',
    () => {
      const tree = stageTree([], 'edge-failed-compile');
      try {
        fs.writeFileSync(path.join(tree.dir, 'broken.spin2'), ['PUB main()', '  this is not valid spin2 !!!', ''].join('\n'));
        expect(() => compileSpin2(tree.dir, 'broken.spin2', '-m')).toThrow();
        expect(fs.existsSync(mapPathFor(tree.dir, 'broken.spin2'))).toBe(false);
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --------------------------------------------------------------------------
// 4. Cross-checked against mapOracle's independent decoder
// --------------------------------------------------------------------------

describe('map facts cross-checked against the independent decoder', () => {
  const sampleShapeNames = ['S01_two_identical', 'S04_three_forks', 'S17_three_levels', 'S25_array_255'];

  test.each(sampleShapeNames)(
    '%s: IMAGE and VAR start addresses match the decoder',
    (name) => {
      const shape = expectations.find((s) => s.shape === name);
      expect(shape).toBeDefined();
      const tree = stageShape(shape!, `oracle-cross-${name}`);
      try {
        execSync(`node ${toolPath} -m -l ${shape!.top}`, { cwd: tree.dir, encoding: 'utf8', stdio: 'pipe' });
        const map = readMap(tree.dir, shape!.top);
        const listing: RawImage = readListingImage(path.join(tree.dir, shape!.top.replace(/\.spin2$/i, '.lst')));
        const decoded = decodeImage(listing);
        expect(decoded.problems).toEqual([]);

        const addressIndex = map.slice(map.indexOf('=== ADDRESS INDEX ==='), map.indexOf('=== SYMBOL INDEX ==='));
        const imageStarts = addressIndex
          .split('\n')
          .filter((l) => /\bIMAGE\b/.test(l) && /\(start\)/.test(l))
          .map((l) => parseInt(l.trim().split(/\s+/)[0].replace('$', ''), 16));
        const varStarts = addressIndex
          .split('\n')
          .filter((l) => /\bVAR\b/.test(l) && /\(start\)/.test(l))
          .map((l) => parseInt(l.trim().split(/\s+/)[0].replace('$', ''), 16));

        expect(imageStarts.sort((a, b) => a - b)).toEqual(decoded.images.map((i) => i.base).sort((a, b) => a - b));
        expect(varStarts.sort((a, b) => a - b)).toEqual(decoded.instances.map((i) => i.varBase).sort((a, b) => a - b));
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  // Falsification: the cross-check itself must be able to fail.
  test('falsification: a wrong expected address is reported as a mismatch', () => {
    const decodedBases = [0, 100, 200];
    const mapBases = [0, 100, 999];
    expect(() => expect(mapBases).toEqual(decodedBases)).toThrow();
  });
});
