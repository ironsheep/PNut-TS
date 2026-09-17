/** @format */

// GOLD corpora vs the image decoder and the .map (Map-Instance-Correctness §4).
//
// For every existing fixture whose Windows .obj.GOLD has child objects:
//   1. the GOLD decodes with no inconsistency (PNut's own bytes);
//   2. a fresh compile, staged in a temp directory, yields the same image in
//      its listing dump and its .obj (two containers, one compile);
//   3. that image equals the GOLD image byte for byte — or, for the fixtures
//      below with a known numeric divergence, has the identical decoded tree
//      (part 1);
//   4. the fresh compile's .map agrees structurally (image regions, slot
//      counts, VAR bases, method addresses) with that same decode — which is
//      already proven structurally equal to the GOLD bytes by step 3 (part 2,
//      mapGroundTruth.checkMapStructure — these fixtures carry no
//      expected.json, so only structural facts, not names, are checked here).
//
// GOLD files are read in place, read-only. Nothing is written into TEST/.
// Slow: roughly 130 s in total (WUMMI and LARGE compiles dominate).

'use strict';

import fs from 'fs';
import path from 'path';
import { compileSpin2, stageTree, StagedTree } from '../CACHE-tests/cacheFixtures';
import { DecodedProgram, decodeImage, describeProgram, readListingImage, readObjFile } from './mapOracle';
import { checkMapStructure } from './mapGroundTruth';
import { parseMap } from './mapParser';

const testRoot = path.resolve(__dirname, '../../../TEST');
const COMPILE_TIMEOUT_MS = 180000;

interface Corpus {
  dir: string;
  /** Only these basenames (default: every GOLD with children). */
  only?: string[];
  /** Basenames excluded (punch §21: WUMMI Group B, deferred). */
  exclude?: string[];
  /** Compile flags per fixture, matching how its GOLD was built (see the category suites). */
  debug: (basename: string) => boolean;
  /** Non-.spin2 inputs (DAT FILE blobs). */
  blobs?: string[];
  /**
   * Case aliases: sources name "Serial" but the file is serial.spin2. The
   * checked-in tree lives on a case-insensitive mount; the temp stage does not.
   */
  aliases?: Record<string, string>;
  /**
   * Fixtures whose .obj.GOLD predates the v55 GOLD regeneration (Test-Suite
   * Punch List item 6.4): the bytecode values differ, so bytes cannot match
   * until they are regenerated on Windows. The decoded tree must still match.
   */
  knownByteDivergence?: string[];
}

const corpora: Corpus[] = [
  { dir: 'OBJ-tests', debug: () => false },
  { dir: 'COV-tests', only: ['coverage_001', 'debug_test_002', 'debug_test_002_c1', 'debug_test_002_c2'], debug: (b) => b.startsWith('debug_test') },
  { dir: 'LARGE-tests/HUB75', debug: () => false },
  { dir: 'LARGE-tests/PnlLtMeas', debug: () => false },
  { dir: 'LARGE-tests/eInk', debug: () => false },
  { dir: 'LARGE-tests/Flash-FS', debug: (b) => b.startsWith('flash_fs_demo') },
  { dir: 'LARGE-tests/MultSrvo', debug: (b) => b.startsWith('demo_quad') },
  { dir: 'LARGE-tests/OctoSerial', debug: (b) => b.startsWith('demo_octo') },
  {
    dir: 'LARGE-tests/TOF',
    debug: (basename) => basename.startsWith('demo_180'),
    blobs: ['vl53l5cx_mm1_1_fw.dat', 'p2font16'],
    knownByteDivergence: ['demo_180degrFOV', 'isp_180degrFOV_TOFsensor', 'isp_hdmi_debug', 'isp_vl53l5cx', 'p2textdrv']
  },
  {
    dir: 'WUMMI-tests',
    exclude: ['FG1', 'Main', 'Mustererkennung'],
    debug: () => true,
    aliases: { 'Serial.spin2': 'serial.spin2', 'send_to_mem.spin2': 'send_to_Mem.spin2' }
  }
];

/** GOLD basenames in a corpus that have at least one child slot. */
function fixturesWithChildren(corpus: Corpus): string[] {
  const dir = path.join(testRoot, corpus.dir);
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.obj.GOLD') && fs.existsSync(path.join(dir, name.replace(/\.obj\.GOLD$/, '.spin2'))))
    .map((name) => name.replace(/\.obj\.GOLD$/, ''))
    .filter((basename) => corpus.only === undefined || corpus.only.includes(basename))
    .filter((basename) => corpus.exclude === undefined || !corpus.exclude.includes(basename))
    .filter((basename) => {
      try {
        const program = decodeImage(readObjFile(path.join(dir, `${basename}.obj.GOLD`), 'spin'));
        return program.images.length > 0 && program.images[0].slots.length > 0;
      } catch {
        return false; // PASM-only or header-less GOLD: no object tree
      }
    })
    .sort();
}

/** The decoded tree, without bytes that a numeric divergence may move. */
function topology(program: DecodedProgram): unknown {
  return {
    imageLength: program.imageLength,
    varSize: program.varSize,
    instances: program.instances,
    images: program.images.map((object) => ({
      base: object.base,
      slots: object.slots,
      methodCount: object.methods.length,
      paddedSize: (object.size + 3) & ~3
    }))
  };
}

describe.each(corpora.map((corpus) => [corpus.dir, corpus] as const))('GOLD corpus %s', (_dir, corpus) => {
  const sourceDir = path.join(testRoot, corpus.dir);
  const fixtures = fixturesWithChildren(corpus);
  let tree: StagedTree;

  beforeAll(() => {
    const files = fs
      .readdirSync(sourceDir)
      .filter((name) => name.endsWith('.spin2') || (corpus.blobs ?? []).includes(name))
      .map((name) => path.join(sourceDir, name));
    tree = stageTree(files, `map-gold-${path.basename(corpus.dir)}`);
    for (const [alias, actual] of Object.entries(corpus.aliases ?? {})) {
      fs.copyFileSync(path.join(sourceDir, actual), path.join(tree.dir, alias));
    }
  });

  afterAll(() => {
    tree?.cleanup();
  });

  test('corpus has fixtures with child objects', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  test.each(fixtures)(
    '%s',
    (basename) => {
      const gold = readObjFile(path.join(sourceDir, `${basename}.obj.GOLD`), 'spin');
      const goldProgram = decodeImage(gold);
      expect(goldProgram.problems).toEqual([]);

      compileSpin2(tree.dir, `${basename}.spin2`, corpus.debug(basename) ? '-q -d -l -m -O' : '-q -l -m -O');
      const listing = readListingImage(path.join(tree.dir, `${basename}.lst`));
      const obj = readObjFile(path.join(tree.dir, `${basename}.obj`), 'spin');
      expect(Buffer.compare(listing.image, obj.image)).toBe(0);
      expect(listing.varSize).toBe(obj.varSize);

      const freshProgram = decodeImage(listing);
      if (freshProgram.problems.length > 0) {
        throw new Error(`fresh decode inconsistent:\n${describeProgram(freshProgram)}`);
      }

      // Part 2: the .map's structural facts (image regions, slot counts, VAR
      // bases, method addresses) against this same decode — already proven
      // structurally equal to the GOLD bytes above.
      const map = parseMap(fs.readFileSync(path.join(tree.dir, `${basename}.map`), 'utf8'));
      const mapProblems = checkMapStructure(map, freshProgram);
      if (mapProblems.length > 0) {
        throw new Error(`.map structure disagrees with the decode:\n${mapProblems.join('\n')}`);
      }

      const bytesMatch = Buffer.compare(listing.image, gold.image) === 0 && listing.varSize === gold.varSize;
      if (!bytesMatch && !(corpus.knownByteDivergence ?? []).includes(basename)) {
        let firstDiff = 0;
        while (firstDiff < Math.min(listing.image.length, gold.image.length) && listing.image[firstDiff] === gold.image[firstDiff]) {
          firstDiff++;
        }
        throw new Error(
          `image differs from GOLD: length ${listing.image.length} vs ${gold.image.length}, ` +
            `VAR ${listing.varSize} vs ${gold.varSize}, first differing byte at $${firstDiff.toString(16)}`
        );
      }
      expect(topology(freshProgram)).toEqual(topology(goldProgram));
    },
    COMPILE_TIMEOUT_MS
  );
});
