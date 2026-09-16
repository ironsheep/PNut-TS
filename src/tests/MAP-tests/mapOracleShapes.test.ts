/** @format */

// Shape matrix vs the image decoder (Map-Instance-Correctness §4, part 1).
//
// Each shape in TEST/MAP-tests/shapes/ is staged into a temp directory, compiled
// uncached with -l -O, and its image checked against the tree it was built to
// have. Nothing is written into TEST/. The .map is not read here — part 2 checks
// the map against these same expectations.

'use strict';

import fs from 'fs';
import path from 'path';
import { compileSpin2, stageTree, StagedTree } from '../CACHE-tests/cacheFixtures';
import { DecodedProgram, RawImage, decodeImage, describeProgram, readListingImage, readObjFile } from './mapOracle';
import {
  ShapeExpectation,
  checkExpectationArithmetic,
  checkPasmShape,
  checkShapeAgainstImage,
  loadShapeExpectations,
  shapesDir
} from './shapeMatrix';

const COMPILE_TIMEOUT_MS = 60000;

interface CompiledShape {
  listing: RawImage;
  obj: RawImage;
  program: DecodedProgram;
}

function compileShape(expectation: ShapeExpectation, tree: StagedTree): CompiledShape {
  compileSpin2(tree.dir, expectation.top, '-q -l -O');
  const basename = expectation.top.replace(/\.spin2$/i, '');
  const listing = readListingImage(path.join(tree.dir, `${basename}.lst`));
  const obj = readObjFile(path.join(tree.dir, `${basename}.obj`), expectation.kind);
  return { listing, obj, program: decodeImage(listing) };
}

function stageShape(expectation: ShapeExpectation): StagedTree {
  return stageTree(
    expectation.files.map((file) => path.join(shapesDir, file)),
    `map-shape-${expectation.shape}`
  );
}

const expectations = loadShapeExpectations();

describe('shape matrix: expectation files', () => {
  test('matrix is present', () => {
    expect(expectations.length).toBeGreaterThanOrEqual(26);
  });

  test.each(expectations.filter((shape) => shape.tree !== null).map((shape) => [shape.shape, shape] as const))(
    '%s VAR offsets follow the packing rule',
    (_name, expectation) => {
      expect(checkExpectationArithmetic(expectation.tree!)).toEqual([]);
    }
  );

  test.each(expectations.map((shape) => [shape.shape, shape] as const))('%s lists only files that exist', (_name, expectation) => {
    for (const file of expectation.files) {
      expect(fs.existsSync(path.join(shapesDir, file))).toBe(true);
    }
  });
});

describe('shape matrix: compiled image vs construction', () => {
  test.each(expectations.map((shape) => [shape.shape, shape] as const))(
    '%s',
    (_name, expectation) => {
      const tree = stageShape(expectation);
      try {
        if (expectation.compileError !== null) {
          expect(() => compileSpin2(tree.dir, expectation.top, '-q -l -O')).toThrow(expectation.compileError);
          return;
        }
        const { listing, obj, program } = compileShape(expectation, tree);
        // Two containers from one compile must carry the same image.
        expect(listing.kind).toBe(expectation.kind);
        expect(Buffer.compare(listing.image, obj.image)).toBe(0);
        expect(listing.varSize).toBe(obj.varSize);
        if (expectation.kind === 'pasm') {
          expect(checkPasmShape(expectation, listing)).toEqual([]);
          return;
        }
        const problems = [...program.problems, ...checkShapeAgainstImage(expectation, listing, program)];
        if (problems.length > 0) {
          throw new Error(`${expectation.shape}:\n${problems.join('\n')}\n${describeProgram(program)}`);
        }
      } finally {
        tree.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

describe('shape matrix: falsification — the checker must be able to fail', () => {
  const s01 = expectations.find((shape) => shape.shape === 'S01_two_identical') as ShapeExpectation;
  let compiled: CompiledShape;
  let tree: StagedTree;

  beforeAll(() => {
    tree = stageShape(s01);
    compiled = compileShape(s01, tree);
  }, COMPILE_TIMEOUT_MS);

  afterAll(() => {
    tree?.cleanup();
  });

  function mutated(edit: (copy: ShapeExpectation) => void): string {
    const copy = JSON.parse(JSON.stringify(s01)) as ShapeExpectation;
    edit(copy);
    return checkShapeAgainstImage(copy, compiled.listing, compiled.program).join('\n');
  }

  test('control: the true expectation passes', () => {
    expect(checkShapeAgainstImage(s01, compiled.listing, compiled.program)).toEqual([]);
  });

  test('claiming identical copies are distinct images is reported', () => {
    expect(mutated((copy) => (copy.tree!.objs[1].node.image = 'drvv#other'))).toMatch(/expected distinct/);
  });

  test('a wrong VAR size is reported', () => {
    expect(mutated((copy) => (copy.tree!.objs[1].node.varOwnSize = 16))).toMatch(/own VAR size decoded 12, expected 16/);
  });

  test('a DAT marker absent from the image is reported MISSING', () => {
    expect(mutated((copy) => (copy.tree!.objs[0].node.dat[0].value = '0x0BADF00D'))).toMatch(/0x0BADF00D: MISSING/);
  });

  test('a corrupted image (marker bytes overwritten) is reported', () => {
    const image = Buffer.from(compiled.listing.image);
    const at = image.indexOf(Buffer.from([0x01, 0x00, 0x50, 0xb0]));
    expect(at).toBeGreaterThan(0);
    image.writeUInt32LE(0, at);
    const raw = { ...compiled.listing, image };
    expect(checkShapeAgainstImage(s01, raw, decodeImage(raw)).join('\n')).toMatch(/MISSING/);
  });
});
