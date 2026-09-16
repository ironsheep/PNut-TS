/** @format */

// The image decoder against Windows PNut GOLD bytes, and proof it can fail.
//
// Every GOLD is read in place, read-only; corruption is applied to in-memory
// copies only. No compiles run here.

'use strict';

import fs from 'fs';
import path from 'path';
import {
  RawImage,
  decodeImage,
  findLongValue,
  locateMarkers,
  missingMarkers,
  parseListingImage,
  parseObjFile,
  readListingImage,
  readLong,
  readObjFile
} from './mapOracle';

const covDir = path.resolve(__dirname, '../../../TEST/COV-tests');
const cov001Obj = path.join(covDir, 'coverage_001.obj.GOLD');
const cov001Lst = path.join(covDir, 'coverage_001.lst.GOLD');

/** Count PUB/PRI declarations straight from source text — independent of any decoder. */
function countMethodsInSource(fileSpec: string): number {
  return (fs.readFileSync(fileSpec, 'utf8').match(/^\s*(pub|pri)\b/gim) ?? []).length;
}

/** A copy of a GOLD image, so corruption never reaches the file. */
function goldCopy(): RawImage {
  const raw = readObjFile(cov001Obj, 'spin');
  return { ...raw, image: Buffer.from(raw.image) };
}

describe('mapOracle: decoder vs Windows PNut GOLD (coverage_001)', () => {
  test('.obj.GOLD header, checksum and image length', () => {
    const raw = readObjFile(cov001Obj, 'spin');
    expect(raw.varSize).toBe(4384);
    expect(raw.image.length).toBe(1072);
  });

  test('decoded tree matches an independent read of the source', () => {
    const program = decodeImage(readObjFile(cov001Obj, 'spin'));
    expect(program.problems).toEqual([]);
    // OBJ fakeChild : "coverage_002" | ... ; fakeChildren[2] : "coverage_002"  -> 3 slots.
    const top = program.images.find((object) => object.base === 0);
    expect(top?.slots.length).toBe(3);
    expect(top?.methods.length).toBe(countMethodsInSource(path.join(covDir, 'coverage_001.spin2')));
    expect(program.instances.length).toBe(4);
    // All three slots are coverage_002 with no image-changing difference: one shared image.
    const childBases = new Set(program.instances.slice(1).map((instance) => instance.codeBase));
    expect(childBases.size).toBe(1);
    const child = program.images.find((object) => object.base === [...childBases][0]);
    expect(child?.methods.length).toBe(countMethodsInSource(path.join(covDir, 'coverage_002.spin2')));
    // VAR: coverage_001 = 4 reserved + screen[1024] longs + color + myStack[64] longs = 4360;
    // coverage_002 = 4 reserved + i = 8 per instance.
    expect(program.instances[0].ownVarSize).toBe(4 + 1024 * 4 + 4 + 64 * 4);
    expect(program.instances.slice(1).map((instance) => instance.varExtent)).toEqual([8, 8, 8]);
    expect(program.topVarBase).toBe(1072);
  });

  test('second Windows container: the .lst.GOLD image dump equals the .obj.GOLD image', () => {
    const fromListing = readListingImage(cov001Lst);
    const fromObj = readObjFile(cov001Obj, 'spin');
    expect(fromListing.kind).toBe('spin');
    expect(fromListing.varSize).toBe(fromObj.varSize);
    expect(Buffer.compare(fromListing.image, fromObj.image)).toBe(0);
  });

  test('PASM-only GOLD: raw image, no header; reading it as Spin fails the checksum', () => {
    const objSpec = path.join(covDir, 'coverage_pasmonly_001.obj.GOLD');
    const fromListing = readListingImage(path.join(covDir, 'coverage_pasmonly_001.lst.GOLD'));
    expect(fromListing.kind).toBe('pasm');
    const fromObj = readObjFile(objSpec, 'pasm');
    expect(Buffer.compare(fromListing.image, fromObj.image)).toBe(0);
    expect(decodeImage(fromObj).instances).toEqual([]);
    expect(() => readObjFile(objSpec, 'spin')).toThrow(/checksum/);
  });
});

describe('mapOracle: falsification — every check must be able to fail', () => {
  test('the unmodified copy is clean (control)', () => {
    expect(decodeImage(goldCopy()).problems).toEqual([]);
  });

  test('truncated image: regions no longer tile', () => {
    const raw = goldCopy();
    const program = decodeImage({ ...raw, image: raw.image.subarray(0, raw.image.length - 4) });
    expect(program.problems.join('\n')).toMatch(/do not tile/);
  });

  test('slot 1 VAR offset rewritten onto slot 0: overlap reported', () => {
    const raw = goldCopy();
    raw.image.writeUInt32LE(readLong(raw.image, 4) as number, 12);
    const program = decodeImage(raw);
    expect(program.problems.join('\n')).toMatch(/instance 1: VAR offset .*overlaps/);
  });

  test('slot 0 code offset zeroed: reported outside the image', () => {
    const raw = goldCopy();
    raw.image.writeUInt32LE(0, 0);
    const program = decodeImage(raw);
    expect(program.problems.join('\n')).toMatch(/instance 0: code offset .* outside the image/);
  });

  test('bit 31 cleared on the first method long: header walk inconsistency reported', () => {
    const raw = goldCopy();
    raw.image.writeUInt32LE((readLong(raw.image, 24) as number) & 0x7fffffff, 24);
    const program = decodeImage(raw);
    expect(program.problems.length).toBeGreaterThan(0);
  });

  test('one flipped byte in a .obj file copy: checksum error', () => {
    const bytes = Buffer.from(fs.readFileSync(cov001Obj));
    bytes[100] ^= 0x01;
    expect(() => parseObjFile(bytes, 'spin')).toThrow(/checksum/);
  });

  test('listing dump with a missing line: rejected, not silently shortened', () => {
    const text = fs
      .readFileSync(cov001Lst, 'latin1')
      .split(/\r\n|\r|\n/)
      .filter((line) => !line.startsWith('00010-'))
      .join('\n');
    expect(() => parseListingImage(text)).toThrow(/not contiguous/);
  });

  test('DAT marker: a present value is located, an absent value is reported missing', () => {
    const raw = goldCopy();
    const present = readLong(raw.image, 0x20) as number;
    const absent = 0x0badf00d;
    expect(findLongValue(raw.image, absent)).toEqual([]);
    const hits = locateMarkers(raw.image, [
      { name: 'PRESENT', value: present },
      { name: 'ABSENT', value: absent }
    ]);
    expect(hits[0].offsets).toContain(0x20);
    expect(hits.length).toBe(2);
    expect(missingMarkers(hits)).toEqual(['ABSENT']);
  });
});
