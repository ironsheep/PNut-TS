/** @format */

// The .map file vs the image, for every shape (Map-Instance-Correctness §4
// part 2). mapOracleShapes.test.ts already checks the image against
// construction; this suite adds the .map itself: it must state the same
// facts, checked against the SAME independent decode (mapOracle.ts) and, for
// symbols and DAT, against the shape's construction record (shapeMatrix.ts).
//
// mapFormat.test.ts already owns warm==cold identity (byte for byte, apart
// from `Generated:`) on every shape — not repeated here.

'use strict';

import fs from 'fs';
import path from 'path';
import { compileSpin2, stageTree, StagedTree } from '../CACHE-tests/cacheFixtures';
import { DecodedProgram, RawImage, decodeImage, describeProgram, findLongValue, readListingImage } from './mapOracle';
import { checkDatMarkersAgainstShape, checkMapAgainstShape, checkMapStructure, checkVarSymbolsAgainstShape } from './mapGroundTruth';
import { parseMap, ParsedMap } from './mapParser';
import { ShapeExpectation, loadShapeExpectations, shapesDir } from './shapeMatrix';

const COMPILE_TIMEOUT_MS = 60000;

interface Compiled {
  raw: RawImage;
  program: DecodedProgram;
  map: ParsedMap;
  mapPath: string;
}

function stageShape(expectation: ShapeExpectation, label: string): StagedTree {
  return stageTree(
    expectation.files.map((file) => path.join(shapesDir, file)),
    label
  );
}

function compileShape(dir: string, top: string): Compiled {
  compileSpin2(dir, top, '-q -l -m -O');
  const basename = top.replace(/\.spin2$/i, '');
  const raw = readListingImage(path.join(dir, `${basename}.lst`));
  const program = decodeImage(raw);
  const mapPath = path.join(dir, `${basename}.map`);
  const map = parseMap(fs.readFileSync(mapPath, 'utf8'));
  return { raw, program, map, mapPath };
}

const spinExpectations = loadShapeExpectations().filter((shape) => shape.compileError === null && shape.kind === 'spin');
const pasmExpectations = loadShapeExpectations().filter((shape) => shape.compileError === null && shape.kind === 'pasm');

describe('map ground truth: matrix', () => {
  test.each(spinExpectations.map((shape) => [shape.shape, shape] as const))(
    '%s: .map facts match the decoded image and construction',
    (_name, expectation) => {
      const tree = stageShape(expectation, `mapgt-${expectation.shape}`);
      try {
        const { raw, program, map } = compileShape(tree.dir, expectation.top);
        if (program.problems.length > 0) {
          throw new Error(`decode inconsistent:\n${describeProgram(program)}`);
        }
        const problems = checkMapAgainstShape(expectation, map, raw, program);
        if (problems.length > 0) {
          throw new Error(`${expectation.shape}:\n${problems.join('\n')}`);
        }
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test.each(pasmExpectations.map((shape) => [shape.shape, shape] as const))(
    '%s (PASM-only): .map structure matches the decoded image',
    (_name, expectation) => {
      const tree = stageShape(expectation, `mapgt-${expectation.shape}`);
      try {
        const { raw, program, map } = compileShape(tree.dir, expectation.top);
        // A PASM-only image has no object header, so the decoder yields no
        // images or instances; the map shows the whole program as image #1.
        expect(program.images.length).toBe(0);
        expect(program.instances.length).toBe(0);
        expect(map.images.length).toBe(1);
        expect(map.images[0].image).toBe(1);
        expect(map.images[0].rangeStart).toBe(0);
        expect(map.images[0].size).toBe(raw.image.length);
        expect(map.varBlocks.length).toBe(0);
        expect(map.tree.length).toBe(0);
        expect(map.totals.codeDataBytes).toBe(raw.image.length);
        expect(map.totals.varBytes).toBe(0);
        for (const marker of expectation.dat ?? []) {
          const value = Number(marker.value) >>> 0;
          const hits = findLongValue(raw.image, value);
          const block = map.details[0];
          const found = block?.dat.find((d) => d.name.toUpperCase() === marker.name.toUpperCase());
          expect(found).toBeDefined();
          expect(hits).toContain(found!.address);
        }
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

// --------------------------------------------------------------------------
// Falsification: the checkers used above must be able to fail, and fail
// naming the one thing that's wrong.
// --------------------------------------------------------------------------

describe('map ground truth: falsification', () => {
  const s01 = loadShapeExpectations().find((shape) => shape.shape === 'S01_two_identical') as ShapeExpectation;
  let tree: StagedTree;
  let compiled: Compiled;

  beforeAll(() => {
    tree = stageShape(s01, 'mapgt-falsify');
    compiled = compileShape(tree.dir, s01.top);
  }, COMPILE_TIMEOUT_MS);

  afterAll(() => tree?.cleanup());

  test('control: the true map and expectation pass every checker', () => {
    expect(checkMapAgainstShape(s01, compiled.map, compiled.raw, compiled.program)).toEqual([]);
  });

  test('a copied map with one VAR base altered reports exactly one failure naming it', () => {
    const copy: ParsedMap = JSON.parse(JSON.stringify(compiled.map));
    const row = copy.varBlocks.find((v) => v.instance.toUpperCase() === 'A');
    expect(row).toBeDefined();
    row!.rangeStart += 4; // one VAR base, altered
    const problems = checkMapStructure(copy, compiled.program);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/VAR block row \d+ \(A\)/);
  });

  test('a shape with a deliberately wrong expected VAR offset fails', () => {
    const copy = JSON.parse(JSON.stringify(s01)) as ShapeExpectation;
    copy.tree!.objs[0].node.var[0].offset += 4; // A.V1 offset, deliberately wrong
    const problems = checkVarSymbolsAgainstShape(copy, compiled.map, compiled.program);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.includes('A.V1'))).toBe(true);
  });

  test('a DAT marker value absent from the image is reported', () => {
    const copy = JSON.parse(JSON.stringify(s01)) as ShapeExpectation;
    copy.tree!.objs[0].node.dat[0].value = '0x0BADF00D';
    const problems = checkDatMarkersAgainstShape(copy, compiled.map, compiled.raw);
    expect(problems.some((p) => p.includes('not among byte-search hits'))).toBe(true);
  });
});
