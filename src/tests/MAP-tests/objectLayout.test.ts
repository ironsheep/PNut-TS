/** @format */

// ObjectLayout vs the image decoder (Map-Instance-Correctness §1-§2).
//
// The compiler builds ObjectLayout from the final image and what each compile
// recorded. This suite checks it against mapOracle's independent header walk
// and the shape expectations, cold and warm-cached.
//
// Each compile runs as a subprocess with PNUT_TS_LAYOUT_JSON set, which makes
// the compiler write the layout builder's INPUT and the layout it built. The
// test then rebuilds the layout in-process from that input with
// buildObjectLayout, requires the two to agree, and asserts on the in-process
// result, so the builder itself is exercised in this process. Nothing is
// written into TEST/; every compile is staged in a temp directory with a
// private cache.

'use strict';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import {
  LayoutBuildInput,
  LayoutInstance,
  ObjectLayout,
  SerializedLayoutInput,
  buildObjectLayout,
  layoutInputFromJson,
  layoutToJson
} from '../../classes/objectLayout';
import { DecodedProgram, decodeImage, describeProgram, readListingImage } from './mapOracle';
import { ExpectedNode, ShapeExpectation, expectedInstances, loadShapeExpectations, shapesDir } from './shapeMatrix';

const COMPILE_TIMEOUT_MS = 120000;
const toolPath = path.resolve(__dirname, '../../pnut-ts.js');
const specExampleDir = path.resolve(__dirname, '../../../TEST/MAP-tests/spec-example');
const SPEC_EXAMPLE_FILES = ['map_demo.spin2', 'demo_led.spin2', 'demo_motor.spin2', 'demo_buf.spin2'].map((f) => path.join(specExampleDir, f));

// --- Staging and compiling ------------------------------------------------

interface Stage {
  dir: string;
  cacheDir: string;
  cleanup: () => void;
}

function stageFiles(files: string[], label: string): Stage {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pnut-layout-${label}-`));
  for (const file of files) {
    fs.copyFileSync(file, path.join(dir, path.basename(file)));
  }
  return { dir, cacheDir: path.join(dir, '.layout-cache'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

function writeSource(stage: Stage, name: string, text: string): void {
  fs.writeFileSync(path.join(stage.dir, name), text);
}

interface LayoutRun {
  input: LayoutBuildInput;
  inputJson: SerializedLayoutInput;
  layoutJson: unknown;
  layout: ObjectLayout;
}

/** Compile with the layout hook; rebuild the layout in-process from the recorded input. */
function compileWithLayout(stage: Stage, top: string, flags: string): LayoutRun {
  const dumpPath = path.join(stage.dir, `${top}.layout.json`);
  if (fs.existsSync(dumpPath)) {
    fs.rmSync(dumpPath);
  }
  try {
    execSync(`node ${toolPath} -q ${flags} ${top}`, {
      cwd: stage.dir,
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, PNUT_TS_LAYOUT_JSON: dumpPath }
    });
  } catch (error: unknown) {
    const stderr = error instanceof Error && 'stderr' in error ? (error as { stderr: string }).stderr : String(error);
    throw new Error(`compile of ${top} (${flags}) failed: ${stderr}`);
  }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8')) as { input: SerializedLayoutInput; layout: unknown };
  const input = layoutInputFromJson(dump.input);
  const layout = buildObjectLayout(input);
  // The in-process rebuild must reproduce what the compiler built.
  expect(layoutToJson(layout)).toEqual(dump.layout);
  return { input, inputJson: dump.input, layoutJson: dump.layout, layout };
}

const uncached = (extra: string = ''): string => `-l -m ${extra}`.trim();
const cached = (stage: Stage, extra: string = ''): string => `-m ${extra} --cache --cache-dir ${stage.cacheDir}`.trim();

// --- Comparison against the decoder ----------------------------------------

/** Every disagreement between a layout and the decoder's reading of the same image. */
function compareWithDecoder(layout: ObjectLayout, program: DecodedProgram): string[] {
  const problems: string[] = [];
  const same = (what: string, ours: unknown, theirs: unknown): void => {
    if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
      problems.push(`${what}: layout ${JSON.stringify(ours)} decoder ${JSON.stringify(theirs)}`);
    }
  };
  same('image bytes', layout.imageBytes, program.imageLength);
  same('top VAR base', layout.topVarBase, program.topVarBase);
  same('VAR bytes', layout.varBytes, program.varSize);
  same(
    'instance slot paths',
    layout.instances.map((i) => i.slotPath),
    program.instances.map((i) => i.path)
  );
  const count = Math.min(layout.instances.length, program.instances.length);
  for (let index = 0; index < count; index++) {
    const ours = layout.instances[index];
    const theirs = program.instances[index];
    same(`${ours.path} code base`, ours.codeBase, theirs.codeBase);
    same(`${ours.path} VAR base`, ours.varBase, theirs.varBase);
    same(`${ours.path} VAR offset`, ours.varOffset, theirs.varOffset);
    same(`${ours.path} VAR extent`, ours.varExtent, theirs.varExtent);
    same(`${ours.path} own VAR`, ours.varBytes, theirs.ownVarSize);
  }
  same(
    'image bases',
    layout.images.map((i) => i.base),
    program.images.map((i) => i.base)
  );
  const imageCount = Math.min(layout.images.length, program.images.length);
  for (let index = 0; index < imageCount; index++) {
    const ours = layout.images[index];
    const theirs = program.images[index];
    same(`image #${ours.number} number`, ours.number, index + 1);
    same(`image #${ours.number} size`, ours.size, theirs.size);
    same(`image #${ours.number} header bytes`, ours.headerBytes, theirs.headerBytes);
    same(
      `image #${ours.number} slots`,
      ours.slots.map((s) => [s.codeOffset, s.varOffset]),
      theirs.slots.map((s) => [s.codeOffset, s.varOffset])
    );
    same(
      `image #${ours.number} method offsets`,
      ours.methodTable.map((m) => m.offset),
      theirs.methods.map((m) => m.offset)
    );
    same(
      `image #${ours.number} users`,
      ours.users.map((u) => u.slotPath),
      theirs.instancePaths
    );
  }
  return problems;
}

function decode(stage: Stage, top: string): DecodedProgram {
  return decodeImage(readListingImage(path.join(stage.dir, top.replace(/\.spin2$/i, '.lst'))));
}

function readLongAt(image: Uint8Array, offset: number): number {
  return (image[offset] | (image[offset + 1] << 8) | (image[offset + 2] << 16) | (image[offset + 3] << 24)) >>> 0;
}

/** The DAT symbols of the compile this instance ran (not the image's union). */
function datOf(instance: LayoutInstance): { name: string; offset: number }[] {
  const variant = instance.image.symbolVariants.find((v) => v.users.includes(instance));
  return variant === undefined ? [] : variant.symbols.dat;
}

/** Every disagreement between a layout and a shape's constructed tree. */
function compareWithExpectation(layout: ObjectLayout, input: LayoutBuildInput, root: ExpectedNode): string[] {
  const problems: string[] = [];
  const expected = expectedInstances(root);
  if (expected.length !== layout.instances.length) {
    return [`instance count: layout ${layout.instances.length} expected ${expected.length}`];
  }
  expected.forEach((want, index) => {
    const got = layout.instances[index];
    const label = want.name === '' ? '(top)' : want.name;
    const check = (what: string, ours: unknown, theirs: unknown): void => {
      if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
        problems.push(`${label} ${what}: layout ${JSON.stringify(ours)} expected ${JSON.stringify(theirs)}`);
      }
    };
    check('path', got.path, label);
    check('source', got.sourceFileName, want.node.source);
    check(
      'overrides',
      got.overrides.map((o) => [o.name, o.bits]),
      Object.entries(want.node.overrides).map(([name, value]) => [name, value >>> 0])
    );
    check('own VAR', got.varBytes, want.node.varOwnSize);
    check('VAR extent', got.varExtent, want.node.varTotal);
    check(
      'VAR symbols',
      got.varSymbols.map((v) => [v.name, v.type, v.offset, v.size]),
      want.node.var.map((v) => [v.name, v.type.split(' ')[0], v.offset, v.size])
    );
    for (const marker of want.node.dat) {
      const symbol = datOf(got).find((s) => s.name === marker.name);
      if (symbol === undefined) {
        problems.push(`${label} DAT ${marker.name}: not in this instance's symbols`);
        continue;
      }
      const address = got.image.base + symbol.offset;
      if (address < got.image.base || address + 4 > got.image.base + got.image.size) {
        problems.push(`${label} DAT ${marker.name}: address $${address.toString(16)} outside its image`);
        continue;
      }
      check(`DAT ${marker.name} value`, readLongAt(input.image, address), Number(marker.value) >>> 0);
    }
  });
  return problems;
}

// --- Shapes ------------------------------------------------------------------

const expectations = loadShapeExpectations();
const spinShapes = expectations.filter((shape) => shape.compileError === null && shape.kind === 'spin');
const pasmShapes = expectations.filter((shape) => shape.compileError === null && shape.kind === 'pasm');

function stageShape(expectation: ShapeExpectation): Stage {
  return stageFiles(
    expectation.files.map((file) => path.join(shapesDir, file)),
    expectation.shape
  );
}

describe('ObjectLayout: shapes, cold', () => {
  test('the matrix has every shape', () => {
    expect(expectations.length).toBeGreaterThanOrEqual(26);
    expect(spinShapes.length + pasmShapes.length + expectations.filter((s) => s.compileError !== null).length).toBe(expectations.length);
  });

  test.each(spinShapes.map((shape) => [shape.shape, shape] as const))(
    '%s matches the decoder and the constructed tree',
    (_name, expectation) => {
      const stage = stageShape(expectation);
      try {
        const run = compileWithLayout(stage, expectation.top, uncached());
        const program = decode(stage, expectation.top);
        expect(program.problems).toEqual([]);
        const problems = compareWithDecoder(run.layout, program);
        if (problems.length > 0) {
          problems.push(describeProgram(program));
        }
        expect(problems).toEqual([]);
        expect(compareWithExpectation(run.layout, run.input, expectation.tree!)).toEqual([]);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test.each(pasmShapes.map((shape) => [shape.shape, shape] as const))(
    '%s is one image with its DAT at the expected offsets',
    (_name, expectation) => {
      const stage = stageShape(expectation);
      try {
        const { layout, input } = compileWithLayout(stage, expectation.top, uncached());
        expect(layout.kind).toBe('pasm');
        expect(layout.instances).toEqual([]);
        expect(layout.images.length).toBe(1);
        expect(layout.imageBytes).toBe(expectation.imageLength);
        expect(layout.varBytes).toBe(0);
        for (const marker of expectation.dat ?? []) {
          const symbol = layout.images[0].symbols.dat.find((s) => s.name === marker.name);
          expect(symbol?.offset).toBe(marker.offset);
          expect(readLongAt(input.image, symbol!.offset)).toBe(Number(marker.value) >>> 0);
        }
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

describe('ObjectLayout: warm cache equals cold', () => {
  const warmCases: [string, string[], string][] = [
    ...expectations
      .filter((shape) => shape.compileError === null)
      .map((shape) => [shape.shape, shape.files.map((file) => path.join(shapesDir, file)), shape.top] as [string, string[], string]),
    ['spec-example', SPEC_EXAMPLE_FILES, 'map_demo.spin2']
  ];

  test.each(warmCases)(
    '%s',
    (label, files, top) => {
      const stage = stageFiles(files, `warm-${label}`);
      try {
        const reference = compileWithLayout(stage, top, uncached());
        const program = decode(stage, top);
        const fill = compileWithLayout(stage, top, cached(stage));
        const warm = compileWithLayout(stage, top, cached(stage));
        expect(fill.layoutJson).toEqual(reference.layoutJson);
        expect(warm.layoutJson).toEqual(reference.layoutJson);
        expect(warm.inputJson).toEqual(reference.inputJson);
        if (reference.layout.kind === 'spin') {
          expect(compareWithDecoder(warm.layout, program)).toEqual([]);
        }
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --- The worked example --------------------------------------------------------

describe('ObjectLayout: spec worked example', () => {
  test(
    'matches the decoder and the facts the specification prints',
    () => {
      const stage = stageFiles(SPEC_EXAMPLE_FILES, 'spec');
      try {
        const { layout } = compileWithLayout(stage, 'map_demo.spin2', uncached());
        expect(compareWithDecoder(layout, decode(stage, 'map_demo.spin2'))).toEqual([]);
        expect(layout.declarationCount).toBe(5);
        expect(layout.imageBytes).toBe(284);
        expect(layout.varBytes).toBe(80);
        expect(layout.images.map((i) => [i.number, i.base, i.size, i.sources.join(','), i.users.map((u) => u.path).join(',')])).toEqual([
          [1, 0x00000, 114, 'map_demo.spin2', '(top)'],
          [2, 0x00074, 31, 'demo_led.spin2', 'LED[0],LED[1],LED[2]'],
          [3, 0x00094, 29, 'demo_motor.spin2', 'LEFT,RIGHT'],
          [4, 0x000b4, 36, 'demo_buf.spin2', 'LEFT.LOG,RIGHT.LOG'],
          [5, 0x000d8, 65, 'demo_buf.spin2', 'TRACE']
        ]);
        expect(layout.instances.map((i) => [i.path, i.varBase, i.varBytes])).toEqual([
          ['(top)', 0x0011c, 8],
          ['LED[0]', 0x00124, 8],
          ['LED[1]', 0x0012c, 8],
          ['LED[2]', 0x00134, 8],
          ['LEFT', 0x0013c, 12],
          ['LEFT.LOG', 0x00148, 8],
          ['RIGHT', 0x00150, 12],
          ['RIGHT.LOG', 0x0015c, 8],
          ['TRACE', 0x00164, 8]
        ]);
        const [top, led, , bufSmall, bufLarge] = layout.images;
        expect(top.slots.map((s) => [s.names.join(','), s.image.number, s.varOffset])).toEqual([
          ['LED[0]', 2, 0x08],
          ['LED[1]', 2, 0x10],
          ['LED[2]', 2, 0x18],
          ['LEFT', 3, 0x20],
          ['RIGHT', 3, 0x34],
          ['TRACE', 5, 0x48]
        ]);
        expect(top.symbols).toEqual({
          methods: [{ name: 'MAIN', methodIndex: 0, offset: 0x4a }],
          dat: [{ name: 'VERSION', type: 'BYTE', offset: 0x38 }],
          pasmLabels: [{ name: 'BLINK', cog: 0, offset: 0x3a }],
          inlinePasm: []
        });
        expect(led.symbols.inlinePasm).toEqual([{ name: 'FLIP', cog: 0, offset: 0x16 }]);
        expect(bufSmall.symbols.dat.map((d) => [d.name, d.offset])).toEqual([
          ['BUFFER', 0x08],
          ['TAIL', 0x0c]
        ]);
        expect(bufLarge.symbols.dat.map((d) => [d.name, d.offset])).toEqual([
          ['BUFFER', 0x08],
          ['TAIL', 0x28]
        ]);
        expect(layout.instances[4].varSymbols).toEqual([
          { name: 'SPEED', type: 'LONG', offset: 4, size: 4 },
          { name: 'LIMIT', type: 'WORD', offset: 8, size: 2 }
        ]);
        expect(layout.instances[8].overrides).toEqual([{ name: 'SIZE', bits: 32, isFloat: false }]);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --- Per-variant symbols ----------------------------------------------------------

describe('ObjectLayout: symbols belong to the compile that produced them', () => {
  test(
    'S19 SIZE fork: each TAG is read inside its own image',
    () => {
      const expectation = expectations.find((shape) => shape.shape === 'S19_dat_layout_fork')!;
      const stage = stageShape(expectation);
      try {
        const { layout, input } = compileWithLayout(stage, expectation.top, uncached());
        const a = layout.instances.find((i) => i.path === 'A')!;
        const b = layout.instances.find((i) => i.path === 'B')!;
        expect(a.image).not.toBe(b.image);
        const tagA = datOf(a).find((s) => s.name === 'TAG')!;
        const tagB = datOf(b).find((s) => s.name === 'TAG')!;
        expect(tagA.offset).not.toBe(tagB.offset);
        expect(a.image.base + tagA.offset + 4).toBeLessThanOrEqual(a.image.base + a.image.size);
        expect(readLongAt(input.image, a.image.base + tagA.offset)).toBe(0xda7f0004);
        expect(readLongAt(input.image, b.image.base + tagB.offset)).toBe(0xda7f0064);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'one image, three symbol sets: every distinct row is kept',
    () => {
      const stage = stageFiles([], 'variants');
      try {
        writeSource(stage, 'lab.spin2', `CON K = 1\nDAT\nl1  BYTE  0[K]\nl2  BYTE  0[4-K]\nPUB get() : r\n  r := l1\n`);
        writeSource(stage, 'other.spin2', `DAT\nfirst   BYTE  0[1]\nrest    BYTE  0[3]\nPUB get() : r\n  r := first\n`);
        writeSource(stage, 'variants.spin2', `{Spin2_v55}\nOBJ\n  a : "lab" | K = 1\n  b : "lab" | K = 3\n  c : "other"\nPUB main()\n  a.get()\n`);
        const run = compileWithLayout(stage, 'variants.spin2', uncached());
        expect(compareWithDecoder(run.layout, decode(stage, 'variants.spin2'))).toEqual([]);
        const shared = run.layout.images[1];
        expect(run.layout.images.length).toBe(2);
        expect(shared.size).toBe(18);
        expect(shared.users.map((u) => u.path)).toEqual(['A', 'B', 'C']);
        expect(shared.sources).toEqual(['lab.spin2', 'other.spin2']);
        expect(shared.symbolVariants.length).toBe(3);
        expect(shared.symbols.dat.map((d) => [d.type, d.name, d.offset])).toEqual([
          ['BYTE', 'FIRST', 8],
          ['BYTE', 'L1', 8],
          ['BYTE', 'L2', 9],
          ['BYTE', 'REST', 9],
          ['BYTE', 'L2', 11]
        ]);
        expect(shared.symbols.methods.map((m) => [m.name, m.offset])).toEqual([['GET', shared.methodTable[0].offset]]);
        const b = run.layout.instances.find((i) => i.path === 'B')!;
        expect(datOf(b).find((d) => d.name === 'L2')!.offset).toBe(11);
        // Warm: the variants come back from the cache entries unchanged.
        compileWithLayout(stage, 'variants.spin2', cached(stage));
        const warm = compileWithLayout(stage, 'variants.spin2', cached(stage));
        expect(warm.layoutJson).toEqual(run.layoutJson);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --- Hub load base -------------------------------------------------------------

describe('ObjectLayout: hub load base is where the image sits in the .bin', () => {
  const checkBin = (stage: Stage, top: string, flags: string): number => {
    const { layout, input } = compileWithLayout(stage, top, flags);
    const bin = fs.readFileSync(path.join(stage.dir, top.replace(/\.spin2$/i, '.bin')));
    expect(bin.length).toBeGreaterThanOrEqual(layout.hubLoadBase + input.image.length);
    expect(Buffer.from(bin.subarray(layout.hubLoadBase, layout.hubLoadBase + input.image.length)).equals(Buffer.from(input.image))).toBe(true);
    return layout.hubLoadBase;
  };

  test(
    'Spin, plain and with -d',
    () => {
      const stage = stageFiles(SPEC_EXAMPLE_FILES, 'hubbase');
      try {
        const plain = checkBin(stage, 'map_demo.spin2', uncached());
        const source = fs.readFileSync(path.join(stage.dir, 'map_demo.spin2'), 'utf8');
        const withClock = source
          .replace('VAR long ticks', 'CON _clkfreq = 200_000_000\n\nVAR long ticks')
          .replace('    trace.put(ticks++)', '    trace.put(ticks++)\n    debug(udec(ticks))');
        expect(withClock).not.toBe(source);
        writeSource(stage, 'map_demo.spin2', withClock);
        const debug = checkBin(stage, 'map_demo.spin2', uncached('-d'));
        expect(debug).toBeGreaterThan(plain);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'PASM, plain, with a clock setter, and with -d',
    () => {
      const stage = stageFiles([path.join(shapesDir, 'S26_pasm_only.spin2')], 'hubbase-pasm');
      try {
        expect(checkBin(stage, 'S26_pasm_only.spin2', uncached())).toBe(0);
        const source = fs.readFileSync(path.join(stage.dir, 'S26_pasm_only.spin2'), 'utf8');
        writeSource(stage, 'S26_pasm_only.spin2', source.replace(/^DAT$/m, 'CON _clkfreq = 20_000_000\nDAT'));
        expect(checkBin(stage, 'S26_pasm_only.spin2', uncached())).toBeGreaterThan(0);
        expect(checkBin(stage, 'S26_pasm_only.spin2', uncached('-d'))).toBeGreaterThan(0);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --- Negative controls ----------------------------------------------------------

describe('ObjectLayout: checks that must fail', () => {
  test(
    'a declaration count that disagrees with the header is a loud internal error',
    () => {
      const expectation = expectations.find((shape) => shape.shape === 'S07_obj_array_obj')!;
      const stage = stageShape(expectation);
      try {
        const { input } = compileWithLayout(stage, expectation.top, uncached());
        const array = input.top.children.find((child) => child.isArray)!;
        expect(array.elementCount).toBe(2);
        array.elementCount = 3;
        expect(() => buildObjectLayout(input)).toThrow('Internal error: ObjectLayout: (top): declares 5 slots but its image header has 4');
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'an own VAR size that disagrees with the header is a loud internal error',
    () => {
      const expectation = expectations.find((shape) => shape.shape === 'S21_var_size_shared')!;
      const stage = stageShape(expectation);
      try {
        const { input } = compileWithLayout(stage, expectation.top, uncached());
        input.top.children[1].variant = input.top.children[0].variant;
        expect(() => buildObjectLayout(input)).toThrow(/Internal error: ObjectLayout: B: compiled own VAR size 12 but the image header gives 44/);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'the decoder comparison is not vacuous: S19 against the S20 image disagrees',
    () => {
      const s19 = expectations.find((shape) => shape.shape === 'S19_dat_layout_fork')!;
      const s20 = expectations.find((shape) => shape.shape === 'S20_var_size_fork')!;
      const stage19 = stageShape(s19);
      const stage20 = stageShape(s20);
      try {
        const { layout } = compileWithLayout(stage19, s19.top, uncached());
        compileWithLayout(stage20, s20.top, uncached());
        expect(compareWithDecoder(layout, decode(stage20, s20.top))).not.toEqual([]);
      } finally {
        stage19.cleanup();
        stage20.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});
