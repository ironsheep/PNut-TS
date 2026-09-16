/** @format */

// Unit and integration tests for the Persistent Object Cache feature.
// Tests: key stability, round-trip, override/version sensitivity,
//        cache miss/hit paths, binary equivalence, and cache clear.

'use strict';

import fs from 'fs';
import path from 'path';
import { CACHE_FORMAT_VERSION, ObjectCache, deserializeSymbols, patchBrkSite, serializeSymbols } from '../../classes/objectCache';
import { BrkSite } from '../../classes/objectImage';
import { SymbolEntry, SymbolTable } from '../../classes/symbolTable';
import { eElementType } from '../../classes/types';
import { compareObjOrBinFiles } from '../testUtils';
// Shared scaffolding — see cacheFixtures.ts. Both cache suites use one copy of
// these so neither drifts from the other.
import {
  StagedTree,
  cleanupDir,
  cleanupOutputFiles,
  compileCold,
  compileSpin2,
  compileUncached,
  compileWarm,
  makeTempCacheDir,
  makeTextLines,
  readMapForComparison,
  stageTree
} from './cacheFixtures';

// ====================================================================
// UNIT TESTS — ObjectCache class in isolation
// ====================================================================

describe('ObjectCache Unit Tests', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = makeTempCacheDir();
  });

  afterEach(() => {
    cleanupDir(cacheDir);
  });

  // --- Key Stability ---

  test('same inputs produce the same cache key', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['CON', '  _clkfreq = 20_000_000', 'PUB main()']);
    const inputs = {
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    };

    const key1 = cache.computeKey(inputs);
    const key2 = cache.computeKey(inputs);
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
  });

  test('different source lines produce different keys', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines1 = makeTextLines(['CON', '  X = 1']);
    const lines2 = makeTextLines(['CON', '  X = 2']);

    const key1 = cache.computeKey({
      preprocessedLines: lines1,
      overrides: undefined,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    const key2 = cache.computeKey({
      preprocessedLines: lines2,
      overrides: undefined,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    expect(key1).not.toBe(key2);
  });

  // --- Override Sensitivity ---

  test('same source with different overrides produce different keys', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['CON', '  DEFAULT_VALUE = 10']);

    const overrides1 = new SymbolTable();
    overrides1.add('DEFAULT_VALUE', eElementType.type_con_int, BigInt(100));

    const overrides2 = new SymbolTable();
    overrides2.add('DEFAULT_VALUE', eElementType.type_con_int, BigInt(200));

    const key1 = cache.computeKey({
      preprocessedLines: lines,
      overrides: overrides1,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    const key2 = cache.computeKey({
      preprocessedLines: lines,
      overrides: overrides2,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    expect(key1).not.toBe(key2);
  });

  test('same source with no overrides vs with overrides produce different keys', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['CON', '  DEFAULT_VALUE = 10']);

    const overrides = new SymbolTable();
    overrides.add('DEFAULT_VALUE', eElementType.type_con_int, BigInt(100));

    const keyNoOverrides = cache.computeKey({
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    const keyWithOverrides = cache.computeKey({
      preprocessedLines: lines,
      overrides,
      compilerVersion: '1.53.2',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    expect(keyNoOverrides).not.toBe(keyWithOverrides);
  });

  // --- Version Sensitivity ---

  test('same source with different compiler version produce different keys', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['PUB main()']);

    const key1 = cache.computeKey({
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.53.0',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    const key2 = cache.computeKey({
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.53.1',
      enableDebug: false,
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    });
    expect(key1).not.toBe(key2);
  });

  // --- Debug Sensitivity ---

  test('same source with different enableDebug produce different keys', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['PUB main()', '  DEBUG("hello")']);
    const baseInputs = {
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.54.2',
      defSymbols: [],
      resolutionRoot: cacheDir,
      includeFolders: []
    };

    const keyNoDebug = cache.computeKey({ ...baseInputs, enableDebug: false, resolutionRoot: cacheDir, includeFolders: [] });
    const keyDebug = cache.computeKey({ ...baseInputs, enableDebug: true, resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyNoDebug).not.toBe(keyDebug);
  });

  // --- defSymbols Sensitivity ---

  test('same source with different defSymbols produce different keys', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['PUB main()']);
    const baseInputs = {
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.54.5',
      enableDebug: false,
      resolutionRoot: cacheDir,
      includeFolders: []
    };

    const keyA = cache.computeKey({ ...baseInputs, defSymbols: ['SYM_X'], resolutionRoot: cacheDir, includeFolders: [] });
    const keyB = cache.computeKey({ ...baseInputs, defSymbols: ['SYM_Y'], resolutionRoot: cacheDir, includeFolders: [] });
    const keyAll = cache.computeKey({ ...baseInputs, defSymbols: ['SD_INCLUDE_ALL'], resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyAll);
    expect(keyB).not.toBe(keyAll);
  });

  test('defSymbols hashing is order- and case-insensitive and dedup-stable', () => {
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['PUB main()']);
    const baseInputs = {
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.54.5',
      enableDebug: false,
      resolutionRoot: cacheDir,
      includeFolders: []
    };

    // Order doesn't matter — both insertion sequences must hash identically.
    const keyOrderA = cache.computeKey({ ...baseInputs, defSymbols: ['ALPHA', 'BETA', 'GAMMA'], resolutionRoot: cacheDir, includeFolders: [] });
    const keyOrderB = cache.computeKey({ ...baseInputs, defSymbols: ['GAMMA', 'ALPHA', 'BETA'], resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyOrderA).toBe(keyOrderB);

    // Case is normalized — preprocessor stores symbols uppercase.
    const keyMixedCase = cache.computeKey({ ...baseInputs, defSymbols: ['alpha', 'Beta', 'GAMMA'], resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyMixedCase).toBe(keyOrderA);

    // Duplicates are deduped so a stray double-push doesn't shift the key.
    const keyDup = cache.computeKey({ ...baseInputs, defSymbols: ['ALPHA', 'ALPHA', 'BETA', 'GAMMA'], resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyDup).toBe(keyOrderA);
  });

  test('empty defSymbols matches the historical (no-defs) hash for a given source', () => {
    // Sanity: the empty defSymbols path must not perturb the key beyond what
    // the symbol set itself does. Two empty sets must hash identically.
    const cache = new ObjectCache(true, cacheDir);
    const lines = makeTextLines(['PUB main()']);
    const inputs = {
      preprocessedLines: lines,
      overrides: undefined,
      compilerVersion: '1.54.5',
      enableDebug: false,
      resolutionRoot: cacheDir,
      includeFolders: []
    };

    const keyEmpty1 = cache.computeKey({ ...inputs, defSymbols: [], resolutionRoot: cacheDir, includeFolders: [] });
    const keyEmpty2 = cache.computeKey({ ...inputs, defSymbols: [], resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyEmpty1).toBe(keyEmpty2);
    const keyOne = cache.computeKey({ ...inputs, defSymbols: ['ONE'], resolutionRoot: cacheDir, includeFolders: [] });
    expect(keyOne).not.toBe(keyEmpty1);
  });

  // --- Format Version Embedded in Key ---

  test('CACHE_FORMAT_VERSION is exported and is a positive integer', () => {
    expect(CACHE_FORMAT_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(CACHE_FORMAT_VERSION)).toBe(true);
  });

  // --- Cache Round-trip ---

  test('store and retrieve binary — byte-identical', () => {
    const cache = new ObjectCache(true, cacheDir);
    const binary = new Uint8Array([0x00, 0x0a, 0xff, 0x42, 0x13, 0x37]);
    const key = 'deadbeef'.repeat(8); // 64-char hex

    cache.set(key, binary);
    const retrieved = cache.get(key);
    expect(retrieved).toBeDefined();
    expect(retrieved!.length).toBe(binary.length);
    expect(Array.from(retrieved!)).toEqual(Array.from(binary));
  });

  test('cache miss returns undefined', () => {
    const cache = new ObjectCache(true, cacheDir);
    const result = cache.get('0000000000000000000000000000000000000000000000000000000000000000');
    expect(result).toBeUndefined();
  });

  test('disabled cache always returns undefined', () => {
    const cache = new ObjectCache(false, cacheDir);
    const binary = new Uint8Array([0x01, 0x02]);
    cache.set('aaaa', binary);
    expect(cache.get('aaaa')).toBeUndefined();
  });

  // --- Stats ---

  test('stats track hits and misses', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = 'a'.repeat(64);
    const binary = new Uint8Array([0x42]);

    cache.set(key, binary);
    cache.get(key); // hit
    cache.get('b'.repeat(64)); // miss
    cache.get(key); // hit

    expect(cache.stats.hits).toBe(2);
    expect(cache.stats.misses).toBe(1);
  });

  // --- Cache Clear ---

  test('clear removes all cached entries', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = 'c'.repeat(64);
    cache.set(key, new Uint8Array([0x01]));
    expect(cache.get(key)).toBeDefined();

    cache.clear();
    // After clear, cache dir is gone; creating a new cache should miss
    const cache2 = new ObjectCache(true, cacheDir);
    expect(cache2.get(key)).toBeUndefined();
  });

  // --- Metadata ---

  test('metadata file is written alongside binary', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = 'd'.repeat(64);
    cache.set(key, new Uint8Array([0x01]), {
      metadata: {
        source: 'test.spin2',
        overrides: '',
        compilerVersion: '1.53.2',
        enableDebug: false,
        cacheFormatVersion: CACHE_FORMAT_VERSION,
        timestamp: Date.now(),
        binarySize: 1,
        symbolCount: 0
      }
    });

    const metaPath = path.join(cacheDir, `${key}.meta`);
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.source).toBe('test.spin2');
    expect(meta.compilerVersion).toBe('1.53.2');
    expect(meta.enableDebug).toBe(false);
    expect(meta.cacheFormatVersion).toBe(CACHE_FORMAT_VERSION);
  });

  // --- Symbol Sidecar Round-trip ---

  test('serializeSymbols/deserializeSymbols are pure round-trip', () => {
    const original: SymbolEntry[] = [
      new SymbolEntry('A', eElementType.type_con_int, BigInt(0), false),
      new SymbolEntry('B', eElementType.type_con_int, BigInt(-1) << 31n, false), // negative bigint
      new SymbolEntry('C', eElementType.type_constr, '', false),
      new SymbolEntry('D', eElementType.type_method, BigInt('0xFFFFFFFFFFFFFFFF'), true)
    ];
    const restored = deserializeSymbols(serializeSymbols(original));
    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i].name).toBe(original[i].name);
      expect(restored[i].type).toBe(original[i].type);
      expect(restored[i].value).toBe(original[i].value);
      expect(restored[i].isInline).toBe(original[i].isInline);
    }
  });

  // --- Write order: .bin written last ---

  test('partial write (no .bin) is treated as miss; .sym/.meta orphans cause no harm', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '2'.repeat(64);
    // Simulate orphan sidecars without a .bin (e.g. process killed mid-write)
    fs.writeFileSync(path.join(cacheDir, `${key}.sym`), JSON.stringify({ cacheFormatVersion: CACHE_FORMAT_VERSION, symbols: [] }));
    fs.writeFileSync(path.join(cacheDir, `${key}.meta`), '{}');
    expect(cache.get(key)).toBeUndefined(); // .bin gates the hit
  });

  // --- Debug records sidecar ---

  test('debug info round-trips through .dbg sidecar byte-identical', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '3'.repeat(64);
    const records = [
      { origIndex: 1, bytes: new Uint8Array([0x04, 0x06, 0x68, 0x69, 0x00, 0x83, 0x00]) },
      { origIndex: 2, bytes: new Uint8Array([0x04, 0x06, 0x6c, 0x6f, 0x6f, 0x70, 0x00, 0x43, 0x00]) },
      { origIndex: 3, bytes: new Uint8Array([0x04, 0x06, 0x64, 0x6f, 0x6e, 0x65, 0x00, 0x00]) }
    ];
    const brkSites: BrkSite[] = [
      { offset: 16, kind: 'spin', origIndex: 1 },
      { offset: 32, kind: 'pasm', origIndex: 2 },
      { offset: 48, kind: 'spin', origIndex: 3 }
    ];
    const subtreeExports = ['SD_INCLUDE_RAW', 'GC_FEATURE'];
    cache.set(key, new Uint8Array([1, 2, 3]), { debugInfo: { records, brkSites, subtreeExports } });
    expect(fs.existsSync(path.join(cacheDir, `${key}.dbg`))).toBe(true);

    const loaded = cache.getDebugInfo(key);
    expect(loaded).toBeDefined();
    expect(loaded!.records.length).toBe(records.length);
    for (let i = 0; i < records.length; i++) {
      expect(loaded!.records[i].origIndex).toBe(records[i].origIndex);
      expect(Array.from(loaded!.records[i].bytes)).toEqual(Array.from(records[i].bytes));
    }
    expect(loaded!.brkSites).toEqual(brkSites);
    expect(loaded!.subtreeExports).toEqual(subtreeExports);
  });

  test('empty debug info still produces a .dbg sidecar with empty arrays', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '4'.repeat(64);
    cache.set(key, new Uint8Array([1]), { debugInfo: { records: [], brkSites: [], subtreeExports: [] } });
    const loaded = cache.getDebugInfo(key);
    expect(loaded).toBeDefined();
    expect(loaded!.records.length).toBe(0);
    expect(loaded!.brkSites.length).toBe(0);
    expect(loaded!.subtreeExports.length).toBe(0);
  });

  test('subtreeExports round-trips and preserves order, case, and duplicates', () => {
    // The round-trip must be lossless. Replay-side dedup happens in the
    // preprocessor's defineSymbol (idempotent, see Object-Cache-Correctness-
    // Analysis.md §5.1), not at sidecar-read time, so we don't normalize here.
    const cache = new ObjectCache(true, cacheDir);
    const key = '9'.repeat(64);
    const subtreeExports = ['ALPHA', 'beta', 'GAMMA', 'ALPHA']; // order varied, case varied, dup
    cache.set(key, new Uint8Array([0]), { debugInfo: { records: [], brkSites: [], subtreeExports } });
    const loaded = cache.getDebugInfo(key);
    expect(loaded!.subtreeExports).toEqual(subtreeExports);
  });

  test('getDebugInfo returns undefined when sidecar is missing', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '5'.repeat(64);
    cache.set(key, new Uint8Array([1])); // no debugInfo passed → no .dbg
    expect(cache.getDebugInfo(key)).toBeUndefined();
  });

  test('getDebugInfo returns undefined when sidecar is malformed', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '6'.repeat(64);
    fs.writeFileSync(path.join(cacheDir, `${key}.dbg`), '{not valid json');
    expect(cache.getDebugInfo(key)).toBeUndefined();
  });

  test('getDebugInfo returns undefined when sidecar has wrong format version', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '7'.repeat(64);
    fs.writeFileSync(
      path.join(cacheDir, `${key}.dbg`),
      JSON.stringify({ cacheFormatVersion: CACHE_FORMAT_VERSION + 999, records: [], brkSites: [] })
    );
    expect(cache.getDebugInfo(key)).toBeUndefined();
  });

  test('getDebugInfo returns undefined when sidecar is missing brkSites field (pre-v4 shape)', () => {
    // A v3-shaped .dbg with the current cacheFormatVersion patched in would
    // still be missing brkSites; the array check guards that case as malformed.
    const cache = new ObjectCache(true, cacheDir);
    const key = '8'.repeat(64);
    fs.writeFileSync(
      path.join(cacheDir, `${key}.dbg`),
      JSON.stringify({ cacheFormatVersion: CACHE_FORMAT_VERSION, records: [], subtreeExports: [] })
    );
    expect(cache.getDebugInfo(key)).toBeUndefined();
  });

  test('getDebugInfo returns undefined when sidecar is missing subtreeExports field (pre-v6 shape)', () => {
    // v4/v5-shaped .dbg with the current cacheFormatVersion patched in is
    // missing subtreeExports; the array check guards that case as malformed.
    const cache = new ObjectCache(true, cacheDir);
    const keyA = 'a'.repeat(64);
    fs.writeFileSync(path.join(cacheDir, `${keyA}.dbg`), JSON.stringify({ cacheFormatVersion: CACHE_FORMAT_VERSION, records: [], brkSites: [] }));
    expect(cache.getDebugInfo(keyA)).toBeUndefined();
  });

  test('patchBrkSite rewrites spin and pasm sites correctly', () => {
    // Spin: byte at offset replaced verbatim.
    const spinBin = new Uint8Array([0x10, 0x05, 0xab, 0x20]);
    patchBrkSite(spinBin, { offset: 2, kind: 'spin', origIndex: 0xab }, 0x42);
    expect(spinBin[2]).toBe(0x42);
    // Other bytes untouched.
    expect(Array.from(spinBin)).toEqual([0x10, 0x05, 0x42, 0x20]);

    // PASM: BRK with brkCode 0x05 baked in (0x05 << 9 = 0x0A00 → byte 1 = 0x0A).
    // Build a 4-byte long with cond=0xF, BRK opcode bits, brkCode=5, immediate flag.
    // We just need to verify we patch bits 9-16 without disturbing others.
    // Start with original brkCode=5 (byte1=0x0A bit pattern, byte2 bit0=0).
    // Other bits set arbitrarily.
    const pasmBin = new Uint8Array([0x31, 0x0a, 0xfe, 0xfd]);
    // Repatch to brkCode 0xFF. Expected: byte1 bits 1-7 = 0x7F << 1 = 0xFE,
    // preserving original byte1 bit 0 (=0). byte2 bit 0 = 1, preserving bits 1-7 of 0xFE.
    patchBrkSite(pasmBin, { offset: 0, kind: 'pasm', origIndex: 5 }, 0xff);
    expect(pasmBin[0]).toBe(0x31); // byte 0 untouched
    expect(pasmBin[1]).toBe(0xfe); // (0x0a & 0x01)=0 | (0x7f << 1)=0xFE
    expect(pasmBin[2]).toBe(0xff); // (0xfe & 0xfe)=0xFE | bit0=1 → 0xFF
    expect(pasmBin[3]).toBe(0xfd); // byte 3 untouched

    // Round-trip: patch back to 5 and confirm bytes match the original.
    patchBrkSite(pasmBin, { offset: 0, kind: 'pasm', origIndex: 0xff }, 5);
    expect(pasmBin[1]).toBe(0x0a);
    expect(pasmBin[2]).toBe(0xfe);
  });
});

// ====================================================================
// INTEGRATION TESTS — cache behavior during actual compilation
// ====================================================================

describe('ObjectCache Integration Tests', () => {
  // Use OBJ-tests which have parent→child object hierarchies
  const objTestDir = path.resolve(__dirname, '../../../TEST/OBJ-tests');
  // Use MAP-tests/test4-override which has override parameters
  const overrideTestDir = path.resolve(__dirname, '../../../TEST/MAP-tests/test4-override');

  // Fixture lists for the tests below that stage into a private temp tree
  // rather than compiling objTestDir/overrideTestDir in place. Absolute
  // paths so stageTree() copies straight from these fixture directories
  // instead of its default CACHE-tests fixturesDir.
  const OBJ_TEST14_FILES = ['spin_test14.spin2', 'spin_test14_child1.spin2', 'spin_test14_child2.spin2'].map((f) => path.join(objTestDir, f));
  const OBJ_TEST23_FILES = ['spin_test23.spin2', 'spin_test23_shared.spin2', 'spin_test23_unique1.spin2', 'spin_test23_unique2.spin2'].map((f) =>
    path.join(objTestDir, f)
  );
  const OBJ_TEST22_FILES = ['spin_test22.spin2', 'spin_test22_level1.spin2', 'spin_test22_level2.spin2', 'spin_test22_level3.spin2'].map((f) =>
    path.join(objTestDir, f)
  );
  const OVERRIDE_FILES = ['override_top.spin2', 'param_child.spin2'].map((f) => path.join(overrideTestDir, f));

  // Fixture lists resolved against cacheFixtures.ts's default fixturesDir
  // (TEST/CACHE-fixtures) — plain relative names, same as every other
  // stageTree() caller in this file.
  const SPIN_DBG_CACHE_FILES = ['spin_dbg_cache_parent.spin2', 'spin_dbg_cache_child.spin2'];
  const DBG_CACHE_AB_FILES = [
    'dbg_cache_parentA.spin2',
    'dbg_cache_parentB.spin2',
    'dbg_cache_extraA.spin2',
    'dbg_cache_extraB.spin2',
    'dbg_cache_shared.spin2'
  ];
  const EXPDEF_FILES = ['expdef_parentX.spin2', 'expdef_parentY.spin2', 'expdef_shared_child.spin2', 'expdef_grandchild.spin2'];
  const EXPDEF_SUBTREE_FILES = [
    'expdef_subtree_parent.spin2',
    'expdef_subtree_sd_child.spin2',
    'expdef_subtree_utils_child.spin2',
    'expdef_subtree_grandchild.spin2'
  ];
  const OPTBLOCK_REWIND_FILES = ['optblock_rewind_parent.spin2', 'optblock_rewind_child.spin2'];

  // --- Cache Miss/Hit Path ---

  // Stages into a private temp tree (own copy of the sources, own cache
  // directory) instead of compiling objTestDir in place with the default
  // `.pnut-cache` — map.test.ts's test4-override suite writes into
  // overrideTestDir too, and two suites sharing one on-disk cache directory
  // is exactly the collision --runInBand alone does not remove for the
  // fixtures compiled in place further below.
  test('first compilation stores to cache, second uses cache', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-hit');
    try {
      // First run: cache miss — should create cache entries
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      expect(fs.existsSync(tree.cacheDir)).toBe(true);
      const cacheFiles = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(cacheFiles.length).toBeGreaterThan(0);

      // Save first-run outputs (.obj and .bin are the critical outputs)
      const objContent1 = fs.readFileSync(path.join(tree.dir, 'spin_test14.obj'));
      const binContent1 = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));

      // Second run: should use cache (cache hit)
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      const objContent2 = fs.readFileSync(path.join(tree.dir, 'spin_test14.obj'));
      const binContent2 = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));

      // Object and binary outputs must be identical
      expect(Buffer.from(objContent2).equals(Buffer.from(objContent1))).toBe(true);
      expect(Buffer.from(binContent2).equals(Buffer.from(binContent1))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  // --- Binary Equivalence: cached vs uncached ---

  describe('binary equivalence: cached output matches uncached output', () => {
    const testFiles = [
      { goldDir: objTestDir, files: OBJ_TEST14_FILES, file: 'spin_test14.spin2', name: 'spin_test14', label: 'obj14-equiv' },
      { goldDir: objTestDir, files: OBJ_TEST23_FILES, file: 'spin_test23.spin2', name: 'spin_test23', label: 'obj23-equiv' }
    ];

    test.each(testFiles)('$name produces identical .obj with and without cache', ({ goldDir, files, file, name, label }) => {
      const tree = stageTree(files, label);
      try {
        // Compile WITHOUT cache
        compileSpin2(tree.dir, file, '-l -O');
        const objUncached = fs.readFileSync(path.join(tree.dir, `${name}.obj`));
        const binUncached = fs.readFileSync(path.join(tree.dir, `${name}.bin`));

        // Compile WITH cache (cold cache — first run)
        compileSpin2(tree.dir, file, `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
        const objCached = fs.readFileSync(path.join(tree.dir, `${name}.obj`));
        const binCached = fs.readFileSync(path.join(tree.dir, `${name}.bin`));

        // Must be byte-identical
        expect(Buffer.from(objCached).equals(Buffer.from(objUncached))).toBe(true);
        expect(Buffer.from(binCached).equals(Buffer.from(binUncached))).toBe(true);

        // Compile WITH cache (warm cache — second run, cache hits)
        compileSpin2(tree.dir, file, `-l -O --cache --cache-dir ${tree.cacheDir}`);
        const objWarmCached = fs.readFileSync(path.join(tree.dir, `${name}.obj`));
        const binWarmCached = fs.readFileSync(path.join(tree.dir, `${name}.bin`));

        // Must STILL be byte-identical
        expect(Buffer.from(objWarmCached).equals(Buffer.from(objUncached))).toBe(true);
        expect(Buffer.from(binWarmCached).equals(Buffer.from(binUncached))).toBe(true);

        // Also verify against GOLD files — read from the original (sacred,
        // never staged/copied) fixture location, never written to.
        const goldenObjPath = path.join(goldDir, `${name}.obj.GOLD`);
        if (fs.existsSync(goldenObjPath)) {
          expect(compareObjOrBinFiles(path.join(tree.dir, `${name}.obj`), goldenObjPath)).toBe(true);
        }
      } finally {
        tree.cleanup();
      }
    });
  });

  // --- Deduplication with cache ---

  test('cache works correctly with shared (duplicate) child objects', () => {
    const tree = stageTree(OBJ_TEST23_FILES, 'obj23-dup');
    try {
      // spin_test23 has shared1 and shared2 referencing the same child file
      compileSpin2(tree.dir, 'spin_test23.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const objContent1 = fs.readFileSync(path.join(tree.dir, 'spin_test23.obj'));

      // Second compilation should use cached children
      compileSpin2(tree.dir, 'spin_test23.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      const objContent2 = fs.readFileSync(path.join(tree.dir, 'spin_test23.obj'));

      expect(Buffer.from(objContent2).equals(Buffer.from(objContent1))).toBe(true);

      // Verify against GOLD (original location, read-only)
      const goldenObjPath = path.join(objTestDir, 'spin_test23.obj.GOLD');
      if (fs.existsSync(goldenObjPath)) {
        expect(compareObjOrBinFiles(path.join(tree.dir, 'spin_test23.obj'), goldenObjPath)).toBe(true);
      }
    } finally {
      tree.cleanup();
    }
  });

  // --- Override Parameter Variants ---

  test('cache stores separate entries for different override parameters', () => {
    const tree = stageTree(OVERRIDE_FILES, 'override-vary');
    try {
      // override_top.spin2 has 3 instances of param_child with different overrides
      compileSpin2(tree.dir, 'override_top.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      expect(fs.existsSync(tree.cacheDir)).toBe(true);

      // Should have at least 3 cache entries (one per unique override combination)
      const cacheFiles = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(cacheFiles.length).toBeGreaterThanOrEqual(3);

      // Save first-run output
      const objContent1 = fs.readFileSync(path.join(tree.dir, 'override_top.obj'));

      // Second run with warm cache
      compileSpin2(tree.dir, 'override_top.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      const objContent2 = fs.readFileSync(path.join(tree.dir, 'override_top.obj'));

      // Must be byte-identical
      expect(Buffer.from(objContent2).equals(Buffer.from(objContent1))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  // --- Cache Clear ---

  test('--cache-clear removes all entries and recompiles fresh', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-clear');
    try {
      // Build cache
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const filesBefore = fs.readdirSync(tree.cacheDir);
      expect(filesBefore.length).toBeGreaterThan(0);

      // Clear and rebuild
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const filesAfter = fs.readdirSync(tree.cacheDir);
      // Same number of files (rebuilt from scratch)
      expect(filesAfter.length).toBe(filesBefore.length);

      // Verify output is still correct (GOLD read from original location)
      const goldenObjPath = path.join(objTestDir, 'spin_test14.obj.GOLD');
      if (fs.existsSync(goldenObjPath)) {
        expect(compareObjOrBinFiles(path.join(tree.dir, 'spin_test14.obj'), goldenObjPath)).toBe(true);
      }
    } finally {
      tree.cleanup();
    }
  });

  // --- Deep Object Hierarchy ---

  test('cache works with deep object nesting (3+ levels)', () => {
    // spin_test22 has 3 levels of nesting: top -> level1 -> level2 -> level3
    const tree = stageTree(OBJ_TEST22_FILES, 'obj22-deep');
    try {
      // Without cache
      compileSpin2(tree.dir, 'spin_test22.spin2', '-l -O');
      const objUncached = fs.readFileSync(path.join(tree.dir, 'spin_test22.obj'));

      // With cache (cold)
      compileSpin2(tree.dir, 'spin_test22.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const objColdCached = fs.readFileSync(path.join(tree.dir, 'spin_test22.obj'));
      expect(Buffer.from(objColdCached).equals(Buffer.from(objUncached))).toBe(true);

      // With cache (warm — all children should hit cache)
      compileSpin2(tree.dir, 'spin_test22.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      const objWarmCached = fs.readFileSync(path.join(tree.dir, 'spin_test22.obj'));
      expect(Buffer.from(objWarmCached).equals(Buffer.from(objUncached))).toBe(true);

      // Verify against GOLD (original location, read-only)
      const goldenObjPath = path.join(objTestDir, 'spin_test22.obj.GOLD');
      if (fs.existsSync(goldenObjPath)) {
        expect(compareObjOrBinFiles(path.join(tree.dir, 'spin_test22.obj'), goldenObjPath)).toBe(true);
      }
    } finally {
      tree.cleanup();
    }
  });

  // --- Custom Cache Directory (--cache-dir) ---

  test('--cache-dir places cache in the specified directory', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-customdir');
    try {
      // Compile with --cache-dir pointing to a custom (private) location
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);

      // Cache should exist at the custom location
      expect(fs.existsSync(tree.cacheDir)).toBe(true);
      const cacheFiles = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(cacheFiles.length).toBeGreaterThan(0);

      // Default cache location should NOT exist
      const defaultCachePath = path.join(tree.dir, '.pnut-cache');
      expect(fs.existsSync(defaultCachePath)).toBe(false);
    } finally {
      tree.cleanup();
    }
  });

  test('--cache-dir produces identical output to default cache location', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-direquiv');
    try {
      // Compile without cache for reference
      compileSpin2(tree.dir, 'spin_test14.spin2', '-l -O');
      const objUncached = fs.readFileSync(path.join(tree.dir, 'spin_test14.obj'));
      const binUncached = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));

      // Compile with custom cache dir (cold)
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      const objColdCached = fs.readFileSync(path.join(tree.dir, 'spin_test14.obj'));
      const binColdCached = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));
      expect(Buffer.from(objColdCached).equals(Buffer.from(objUncached))).toBe(true);
      expect(Buffer.from(binColdCached).equals(Buffer.from(binUncached))).toBe(true);

      // Compile with custom cache dir (warm — should hit cache)
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      const objWarmCached = fs.readFileSync(path.join(tree.dir, 'spin_test14.obj'));
      const binWarmCached = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));
      expect(Buffer.from(objWarmCached).equals(Buffer.from(objUncached))).toBe(true);
      expect(Buffer.from(binWarmCached).equals(Buffer.from(binUncached))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  // Two DIFFERENT staged trees (own directories, own sources) sharing ONE
  // private cache directory that belongs to neither tree — the actual claim
  // this test's name makes. Before this fix both compiles ran against the
  // very same in-place objTestDir, so the "different source directories"
  // half of the claim was never exercised.
  test('--cache-dir shared by two source directories keeps each root separate and reuses both', () => {
    // The top-level file's directory is part of the cache key (resolution root:
    // OBJ and DAT FILE names resolve from it), so identical sources in two
    // directories must NOT share entries -- but one cache dir serves both.
    // See DOCs/internals/Object-Cache-Theory-of-Operations.md.
    const treeA = stageTree(OBJ_TEST14_FILES, 'obj14-shareA');
    const treeB = stageTree(OBJ_TEST14_FILES, 'obj14-shareB');
    const sharedCacheDir = makeTempCacheDir();
    const cacheBins = () => fs.readdirSync(sharedCacheDir).filter((f) => f.endsWith('.bin')).length;
    const objOf = (dir: string) => fs.readFileSync(path.join(dir, 'spin_test14.obj'));
    try {
      compileSpin2(treeA.dir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${sharedCacheDir}`);
      const entriesPerRoot = cacheBins();
      expect(entriesPerRoot).toBeGreaterThan(0);
      const objColdA = objOf(treeA.dir);

      // Second root: its own entries, none reused from the first.
      compileSpin2(treeB.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${sharedCacheDir}`);
      expect(cacheBins()).toBe(2 * entriesPerRoot);
      const objColdB = objOf(treeB.dir);

      // Warm rebuilds from both roots add nothing and reproduce their outputs.
      compileSpin2(treeA.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${sharedCacheDir}`);
      compileSpin2(treeB.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${sharedCacheDir}`);
      expect(cacheBins()).toBe(2 * entriesPerRoot);
      expect(Buffer.compare(objOf(treeA.dir), objColdA)).toBe(0);
      expect(Buffer.compare(objOf(treeB.dir), objColdB)).toBe(0);
    } finally {
      treeA.cleanup();
      treeB.cleanup();
      cleanupDir(sharedCacheDir);
    }
  });

  test('--cache-clear with --cache-dir clears the custom directory', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-clearcustom');
    try {
      // Build cache
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${tree.cacheDir}`);
      expect(fs.existsSync(tree.cacheDir)).toBe(true);
      const filesBefore = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(filesBefore.length).toBeGreaterThan(0);

      // Clear and rebuild
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const filesAfter = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(filesAfter.length).toBe(filesBefore.length);

      // Verify output is still correct against GOLD (original location, read-only)
      const goldenObjPath = path.join(objTestDir, 'spin_test14.obj.GOLD');
      if (fs.existsSync(goldenObjPath)) {
        expect(compareObjOrBinFiles(path.join(tree.dir, 'spin_test14.obj'), goldenObjPath)).toBe(true);
      }
    } finally {
      tree.cleanup();
    }
  });

  // --- Debug flag must invalidate cache across runs ---

  test('--debug toggle does not return stale non-debug binary from cache', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-debugtoggle');
    try {
      // Step 1: warm the cache with NO debug
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const cacheFilesAfterNoDebug = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(cacheFilesAfterNoDebug.length).toBeGreaterThan(0);

      // Step 2: reference build WITH debug, no cache, captured first
      cleanupOutputFiles(tree.dir, 'spin_test14');
      compileSpin2(tree.dir, 'spin_test14.spin2', '-l -O --debug');
      const binDebugUncached = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));

      // Step 3: now compile WITH debug using the cache that was warmed without debug.
      // The cache must NOT return the no-debug binary; the new compile must produce
      // a binary that matches the uncached --debug reference.
      cleanupOutputFiles(tree.dir, 'spin_test14');
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O --debug --cache --cache-dir ${tree.cacheDir}`);
      const binDebugCached = fs.readFileSync(path.join(tree.dir, 'spin_test14.bin'));

      expect(Buffer.from(binDebugCached).equals(Buffer.from(binDebugUncached))).toBe(true);

      // After the --debug build there should be more cache entries than before
      // (the debug variants compute different keys and were written fresh).
      const cacheFilesAfterDebug = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.bin'));
      expect(cacheFilesAfterDebug.length).toBeGreaterThan(cacheFilesAfterNoDebug.length);
    } finally {
      tree.cleanup();
    }
  });

  // --- Map file fidelity with cached children ---

  test('warm cache produces identical .map output to uncached --map build', () => {
    const tree = stageTree(OBJ_TEST14_FILES, 'obj14-mapfidelity');
    try {
      // The map header embeds a wall-clock timestamp ("Generated: ..."). Strip it
      // before comparing so we're testing map content, not generation time.
      const stripTimestamp = (s: string): string => s.replace(/^Generated:.*$/m, 'Generated: <stripped>');

      // Reference: uncached --map run
      compileSpin2(tree.dir, 'spin_test14.spin2', '-l -O -m');
      const mapPathUncached = path.join(tree.dir, 'spin_test14.map');
      expect(fs.existsSync(mapPathUncached)).toBe(true);
      const mapUncached = stripTimestamp(fs.readFileSync(mapPathUncached, 'utf8'));

      // Cold cache --map run — fills the cache with binary + symbol sidecars
      cleanupOutputFiles(tree.dir, 'spin_test14');
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O -m --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const mapColdCached = stripTimestamp(fs.readFileSync(path.join(tree.dir, 'spin_test14.map'), 'utf8'));
      expect(mapColdCached).toBe(mapUncached);

      // Confirm .sym sidecars were written for the cached children
      const symFiles = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.sym'));
      expect(symFiles.length).toBeGreaterThan(0);

      // Warm cache --map run — children hit cache; symbols restored from .sym
      cleanupOutputFiles(tree.dir, 'spin_test14');
      compileSpin2(tree.dir, 'spin_test14.spin2', `-l -O -m --cache --cache-dir ${tree.cacheDir}`);
      const mapWarmCached = stripTimestamp(fs.readFileSync(path.join(tree.dir, 'spin_test14.map'), 'utf8'));
      expect(mapWarmCached).toBe(mapUncached);
    } finally {
      tree.cleanup();
    }
  });

  // --- Debug-record fidelity on cache hit ---

  // Regression for the v1.54.2 cache-debug bug. Cached child binaries have
  // brkCodes baked in that index a shared DebugData table rebuilt every
  // compile. Without restoring the child's contributed records on cache hit,
  // those brkCodes alias to whatever the new compile happened to put at those
  // indices, producing garbled runtime output. The .dbg sidecar fixes this;
  // a warm-cache --debug build must produce a final .bin byte-identical to
  // an uncached --debug build, debug data table and all.
  test('warm cache with --debug produces .bin identical to uncached --debug build', () => {
    const tree = stageTree(SPIN_DBG_CACHE_FILES, 'dbg-fidelity');
    try {
      // Reference: uncached --debug build
      compileSpin2(tree.dir, 'spin_dbg_cache_parent.spin2', '-d');
      const binUncached = fs.readFileSync(path.join(tree.dir, 'spin_dbg_cache_parent.bin'));

      // Cold cache --debug build — fills the private cache dir with binary + sym + dbg sidecars
      cleanupOutputFiles(tree.dir, 'spin_dbg_cache_parent');
      compileSpin2(tree.dir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const binColdCached = fs.readFileSync(path.join(tree.dir, 'spin_dbg_cache_parent.bin'));
      expect(Buffer.from(binColdCached).equals(Buffer.from(binUncached))).toBe(true);

      // Confirm .dbg sidecars exist for the cached children
      const dbgFiles = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.dbg'));
      expect(dbgFiles.length).toBeGreaterThan(0);

      // Warm cache --debug build — child loads from cache; debug records replayed.
      // This is the path that produced garbled output before the .dbg sidecar fix.
      cleanupOutputFiles(tree.dir, 'spin_dbg_cache_parent');
      compileSpin2(tree.dir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-dir ${tree.cacheDir}`);
      const binWarmCached = fs.readFileSync(path.join(tree.dir, 'spin_dbg_cache_parent.bin'));
      expect(Buffer.from(binWarmCached).equals(Buffer.from(binUncached))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  test('debug+cache hit with missing .dbg sidecar surfaces a clear error', () => {
    const tree = stageTree(SPIN_DBG_CACHE_FILES, 'dbg-corrupt');
    try {
      // Warm cache normally
      compileSpin2(tree.dir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const dbgFiles = fs.readdirSync(tree.cacheDir).filter((f) => f.endsWith('.dbg'));
      expect(dbgFiles.length).toBeGreaterThan(0);

      // Delete every .dbg sidecar in the PRIVATE cache — simulates a
      // partial-write scenario where .bin survived but .dbg didn't. Compiler
      // must refuse the hit instead of silently producing a broken binary.
      for (const f of dbgFiles) fs.rmSync(path.join(tree.cacheDir, f));

      cleanupOutputFiles(tree.dir, 'spin_dbg_cache_parent');
      expect(() => {
        compileSpin2(tree.dir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-dir ${tree.cacheDir}`);
      }).toThrow(/missing or invalid \.dbg sidecar/);
    } finally {
      tree.cleanup();
    }
  });

  // Regression for the v1.54.4 #pragma exportdef cache-key bug.
  //
  // A child whose own source has no #ifdef on the propagated symbols
  // produces identical preprocessedLines across two parents that exportdef
  // different symbol sets. v1.54.4's cache key (preprocessedLines +
  // overrides + version + debug + format) collides in that case — the
  // child's compiled binary embeds GRANDCHILD bytes, and the grandchild's
  // preprocessedLines DO depend on the propagated symbols, so the embedded
  // bytes silently differ between parent contexts.
  //
  // Reproducer:
  //   parentX exports SYM_X → grandchild compiles its SYM_X branch (kind=1)
  //   parentY exports SYM_Y → grandchild compiles its SYM_Y branch (kind=2)
  // Shared child has neither symbol in its source. With v1.54.4 the second
  // compile cache-hits the first parent's shared-child binary (kind=1
  // baked in) instead of recompiling for kind=2; the resulting parentY.bin
  // ends up with the wrong embedded constant. v1.54.5 folds defSymbols
  // into the key so the two contexts get separate cache entries.
  test('warm cache distinguishes parents with different propagated #pragma exportdef symbols', () => {
    const tree = stageTree(EXPDEF_FILES, 'expdef-isolation');
    try {
      // Reference 1: parentY built fresh — captures the SYM_Y-shape ground truth.
      compileSpin2(tree.dir, 'expdef_parentY.spin2');
      const binY_uncached = fs.readFileSync(path.join(tree.dir, 'expdef_parentY.bin'));
      cleanupOutputFiles(tree.dir, 'expdef_parentY');

      // Cold-build parentX with cache enabled — populates the cache with the
      // shared child's SYM_X-branch binary (and the SYM_X grandchild).
      compileSpin2(tree.dir, 'expdef_parentX.spin2', `--cache --cache-clear --cache-dir ${tree.cacheDir}`);
      cleanupOutputFiles(tree.dir, 'expdef_parentX');

      // Warm-build parentY against the same cache. Pre-fix, the shared-child
      // entry collides on key (no defSymbols in key), and parentY's binary
      // ends up with parentX's embedded grandchild (kind=1). Post-fix, the
      // defSymbols difference forces a key miss → fresh compile → correct
      // SYM_Y branch (kind=2).
      compileSpin2(tree.dir, 'expdef_parentY.spin2', `--cache --cache-dir ${tree.cacheDir}`);
      const binY_warm = fs.readFileSync(path.join(tree.dir, 'expdef_parentY.bin'));
      expect(Buffer.from(binY_warm).equals(Buffer.from(binY_uncached))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  // Regression for the v1.54.3 "partial fix" bug. v1.54.3 only ever tested
  // recompiling the SAME parent: same children, same order → cached records
  // replayed into the same indices, brkCodes lined up by coincidence. The
  // real failure mode is heterogeneous parents sharing a child: parentA
  // populates the cache, parentB hits the cached child but precedes it with
  // DIFFERENT siblings — the shared child's records inject at different
  // indices, but its cached .bin still has the parentA-era brkCodes baked
  // in, producing garbled debug() output at runtime. v1.54.4's brkSite
  // remap+patch fixes this by rewriting each brkCode field in the cached
  // binary to the new index injectRecord assigns on hit.
  test('warm cache with --debug stays correct across heterogeneous parents sharing a child', () => {
    const tree = stageTree(DBG_CACHE_AB_FILES, 'dbg-heterogeneous');
    try {
      // Reference 1: parentA built fresh (no cache).
      compileSpin2(tree.dir, 'dbg_cache_parentA.spin2', '-d');
      const binA_uncached = fs.readFileSync(path.join(tree.dir, 'dbg_cache_parentA.bin'));
      cleanupOutputFiles(tree.dir, 'dbg_cache_parentA');

      // Reference 2: parentB built fresh (no cache).
      compileSpin2(tree.dir, 'dbg_cache_parentB.spin2', '-d');
      const binB_uncached = fs.readFileSync(path.join(tree.dir, 'dbg_cache_parentB.bin'));
      cleanupOutputFiles(tree.dir, 'dbg_cache_parentB');

      // Cold cache build of parentA — populates the private cache with extraA + shared.
      compileSpin2(tree.dir, 'dbg_cache_parentA.spin2', `-d --cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const binA_cold = fs.readFileSync(path.join(tree.dir, 'dbg_cache_parentA.bin'));
      expect(Buffer.from(binA_cold).equals(Buffer.from(binA_uncached))).toBe(true);
      cleanupOutputFiles(tree.dir, 'dbg_cache_parentA');

      // Warm cache build of parentB — extraB is a cache miss (different source);
      // shared HITS the entry stored during parentA's compile. extraB contributes
      // 3 records, pushing shared's records past parentA's prefix length, so the
      // remap+patch path is exercised on every brkCode in shared's binary.
      compileSpin2(tree.dir, 'dbg_cache_parentB.spin2', `-d --cache --cache-dir ${tree.cacheDir}`);
      const binB_warm = fs.readFileSync(path.join(tree.dir, 'dbg_cache_parentB.bin'));
      expect(Buffer.from(binB_warm).equals(Buffer.from(binB_uncached))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  // Regression for the v1.54.5 → v1.54.6 bug.
  //
  // Mechanism: a depth-1 child's source has no #ifdef on the propagated
  // exportdef, so its preprocessedLines is identical across parent contexts,
  // BUT its compile depends on a grandchild that DOES push #pragma exportdef,
  // and a sibling at depth 1 reads that exportdef in its own #ifdef. On a
  // cache hit for the depth-1 child, the grandchild's preprocess is skipped,
  // so its exportdef never pushes onto context.defSymbols. The next sibling
  // then preprocesses against a stale defSymbols and produces a binary that
  // differs from the cold-compile output.
  //
  // v1.54.6 fix: each cache entry stores `subtreeExports` (the slice of
  // defSymbols added during that child's subtree compile). On hit, replay
  // those onto context.defSymbols so subsequent siblings see them.
  test('warm cache replays subtree exportdef contributions for skipped grandchildren', () => {
    const tree = stageTree(EXPDEF_SUBTREE_FILES, 'expdef-subtree');
    try {
      // Reference: fresh build with no cache.
      compileSpin2(tree.dir, 'expdef_subtree_parent.spin2');
      const refBinary = fs.readFileSync(path.join(tree.dir, 'expdef_subtree_parent.bin'));
      cleanupOutputFiles(tree.dir, 'expdef_subtree_parent');

      // Cold cache build — populates the cache with sd_child + grandchild + utils_child.
      compileSpin2(tree.dir, 'expdef_subtree_parent.spin2', `--cache --cache-clear --cache-dir ${tree.cacheDir}`);
      const coldBinary = fs.readFileSync(path.join(tree.dir, 'expdef_subtree_parent.bin'));
      expect(Buffer.from(coldBinary).equals(Buffer.from(refBinary))).toBe(true);
      cleanupOutputFiles(tree.dir, 'expdef_subtree_parent');

      // Warm cache build — sd_child cache-hits, its grandchild's preprocess is
      // skipped, but the .dbg sidecar's subtreeExports replay GC_FEATURE before
      // utils_child's preprocess runs. utils_child's preprocessedLines matches
      // the cold compile, its cache key matches, it hits cache cleanly.
      compileSpin2(tree.dir, 'expdef_subtree_parent.spin2', `--cache --cache-dir ${tree.cacheDir}`);
      const warmBinary = fs.readFileSync(path.join(tree.dir, 'expdef_subtree_parent.bin'));
      expect(Buffer.from(warmBinary).equals(Buffer.from(refBinary))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  // ============================================================
  // COMPREHENSIVE BYTE-EQUIVALENCE REGRESSION
  // ============================================================
  //
  // For every fixture in the table below: produce a fresh-uncached reference
  // binary, then verify that BOTH a cold-cache build AND a warm-cache build
  // produce a byte-identical binary. Any future compiler change that the
  // cache fails to track correctly — for ANY of these fixtures — fails this
  // test on the PR that introduces the change.
  //
  // The fixture set covers every cache-correctness pattern we know about:
  //   - Simple parent → single child
  //   - Multi-sibling children (cache key insensitivity to sibling order)
  //   - Override parameters (parameter overrides part of the key)
  //   - Deep nesting (3 levels, transitive recursion)
  //   - --debug + cache (DebugData + brkSite remap path)
  //   - Heterogeneous parents sharing a child (different defSymbols context)
  //   - Sibling depends on grandchild's exportdef (subtreeExports replay)
  //
  // Adding a new cache-related compiler feature SHOULD include adding a
  // fixture here that exercises it, OR documenting why it doesn't need
  // separate coverage.
  describe('byte-equivalence regression: warm cache must match uncached, every fixture', () => {
    interface Fixture {
      label: string;
      files: string[];
      stageLabel: string;
      file: string;
      basename: string;
      flags: string; // extra flags, applied to all three compiles
      pattern: string;
    }

    const fixtures: Fixture[] = [
      {
        label: 'simple parent + 1 child',
        files: OBJ_TEST14_FILES,
        stageLabel: 'byteeq-simple',
        file: 'spin_test14.spin2',
        basename: 'spin_test14',
        flags: '-O',
        pattern: 'depth-1 child cached, no overrides, no debug'
      },
      {
        label: 'multi-sibling children sharing one child source',
        files: OBJ_TEST23_FILES,
        stageLabel: 'byteeq-multisib',
        file: 'spin_test23.spin2',
        basename: 'spin_test23',
        flags: '-O',
        pattern: 'two OBJ siblings reference same child file (dedup path)'
      },
      {
        label: 'override parameters',
        files: OVERRIDE_FILES,
        stageLabel: 'byteeq-override',
        file: 'override_top.spin2',
        basename: 'override_top',
        flags: '',
        pattern: 'OBJ block with | CONST = N overrides — distinct cache entries per override set'
      },
      {
        label: 'debug + cache (DebugData replay)',
        files: SPIN_DBG_CACHE_FILES,
        stageLabel: 'byteeq-dbgreplay',
        file: 'spin_dbg_cache_parent.spin2',
        basename: 'spin_dbg_cache_parent',
        flags: '-d',
        pattern: 'parent + child both call debug() — exercises .dbg sidecar replay + brkSite remap'
      },
      {
        label: 'heterogeneous parents — parentA shape',
        files: DBG_CACHE_AB_FILES,
        stageLabel: 'byteeq-heteroA',
        file: 'dbg_cache_parentA.spin2',
        basename: 'dbg_cache_parentA',
        flags: '-d',
        pattern: 'extraA + shared, populates the cache that parentB will read'
      },
      {
        label: 'heterogeneous parents — parentB shape',
        files: DBG_CACHE_AB_FILES,
        stageLabel: 'byteeq-heteroB',
        file: 'dbg_cache_parentB.spin2',
        basename: 'dbg_cache_parentB',
        flags: '-d',
        pattern: 'extraB + shared, hits parentA-populated entry; brkSite remap exercised'
      },
      {
        label: 'exportdef key-isolation (parentX)',
        files: EXPDEF_FILES,
        stageLabel: 'byteeq-expdefX',
        file: 'expdef_parentX.spin2',
        basename: 'expdef_parentX',
        flags: '',
        pattern: '#pragma exportdef SYM_X — key includes defSymbols'
      },
      {
        label: 'exportdef key-isolation (parentY)',
        files: EXPDEF_FILES,
        stageLabel: 'byteeq-expdefY',
        file: 'expdef_parentY.spin2',
        basename: 'expdef_parentY',
        flags: '',
        pattern: '#pragma exportdef SYM_Y — must miss parentX cache despite identical shared-child source'
      },
      {
        label: 'subtree exportdef replay (v1.54.6 regression)',
        files: EXPDEF_SUBTREE_FILES,
        stageLabel: 'byteeq-subtree',
        file: 'expdef_subtree_parent.spin2',
        basename: 'expdef_subtree_parent',
        flags: '',
        pattern: 'sibling depends on grandchild exportdef; cache hit must replay subtree contribution'
      },
      {
        // SD FAT32 driver suite root cause. spinResolver's optimizeBlock
        // do-while loop calls objImage.setOffsetTo(savedObjOffset) to rewind
        // and recompile a block until its byte length stabilizes. brkSites
        // captured during earlier iterations point at bytes that get
        // overwritten in later iterations. Without invalidating those stale
        // brkSites, the cache-hit patch path mutates random non-brkCode
        // bytes and the loader rejects the binary as "Invalid object image".
        // Fix in v1.54.7: ObjectImage.setOffsetTo drops brkSites at offsets
        // >= newOffset on backward seeks.
        label: 'optimizer-rewind brkSite tracking (v1.54.7 regression)',
        files: OPTBLOCK_REWIND_FILES,
        stageLabel: 'byteeq-optrewind',
        file: 'optblock_rewind_parent.spin2',
        basename: 'optblock_rewind_parent',
        flags: '-d',
        pattern: 'debug() inside REPEAT/IF/CASE that triggers optimizeBlock rewinds; brkSite capture must follow setOffsetTo'
      }
    ];

    // Each fixture stages into its own private temp tree (own sources, own
    // cache dir) so they don't pollute one another or TEST/. Every fixture
    // runs three times: uncached (reference), cold cache (must match ref),
    // warm cache (must match ref).
    test.each(fixtures)(
      'warm cache produces byte-identical output to uncached: $label ($pattern)',
      ({ files, stageLabel, file, basename, flags }) => {
        const tree = stageTree(files, stageLabel);
        try {
          // `-m` on all three compiles so the MAP is compared alongside the
          // binary. The binary is still the first net — it is the artifact that
          // can carry staleness — but the map is derived from distiller and
          // symbol state on a different path, so the two can disagree, and until
          // 1.55.4 the map's own labels were too unreliable to assert on. They
          // are not any more, which makes a warm map that differs from an
          // uncached one a real signal rather than noise.
          const mapFlags = `${flags} -m`.trim();
          const binPath = path.join(tree.dir, `${basename}.bin`);
          const mapPath = path.join(tree.dir, `${basename}.map`);

          // Reference: fresh, no cache
          compileSpin2(tree.dir, file, mapFlags);
          expect(fs.existsSync(binPath)).toBe(true);
          expect(fs.existsSync(mapPath)).toBe(true);
          const refBinary = fs.readFileSync(binPath);
          const refMap = readMapForComparison(mapPath);
          cleanupOutputFiles(tree.dir, basename);

          // Cold cache: cache empty, compile populates it
          compileSpin2(tree.dir, file, `${mapFlags} --cache --cache-clear --cache-dir ${tree.cacheDir}`);
          const coldBinary = fs.readFileSync(binPath);
          expect(Buffer.from(coldBinary).equals(Buffer.from(refBinary))).toBe(true);
          expect(readMapForComparison(mapPath)).toBe(refMap);
          cleanupOutputFiles(tree.dir, basename);

          // Warm cache: every child should hit
          compileSpin2(tree.dir, file, `${mapFlags} --cache --cache-dir ${tree.cacheDir}`);
          const warmBinary = fs.readFileSync(binPath);
          expect(Buffer.from(warmBinary).equals(Buffer.from(refBinary))).toBe(true);
          expect(readMapForComparison(mapPath)).toBe(refMap);
        } finally {
          tree.cleanup();
        }
      },
      // 30 second per-fixture timeout — even the slowest fixture (-d -O) is
      // well under this in practice. Generous to absorb CI noise.
      30_000
    );
  });

  // ----------------------------------------------------------------------
  // CROSS-PROGRAM priming. Everything above compiles ONE program cold then
  // warm, so every entry it reads was written by the same compile that reads
  // it. That is the shape the defect below escapes through: the poisoned entry
  // is written by a DIFFERENT program, and is wrong only relative to a compile
  // that never ran in the same process.
  // ----------------------------------------------------------------------
  describe('a cache primed by another program must not change what this one compiles to', () => {
    const SIBREC_FILES = ['sibrec_leaf.spin2', 'sibrec_mid.spin2', 'sibrec_utils.spin2', 'sibrec_primer.spin2', 'sibrec_target.spin2'];

    let tree: StagedTree;

    beforeEach(() => {
      tree = stageTree(SIBREC_FILES, 'sibrec');
    });

    afterEach(() => {
      tree.cleanup();
    });

    // Reported by the P2-uSD-FAT32-FS project 2026-08-30
    // (REF-CACHE-BUG/findings-260830) and reduced to this fixture graph.
    //
    // The primer declares `mid` at depth 1 AND `utils` at depth 1, so `mid`'s
    // and `leaf`'s debug records enter the shared table BEFORE utils' subtree
    // compiles. Utils' own `mid` is then a cache hit whose records dedup
    // against the ones already present — injectRecord returns existing indices
    // and does not grow the table — so a capture derived from a record COUNT
    // sees nothing and stores a utils entry missing its grandchild's records.
    //
    // The target reaches `leaf` only at depth 2, so on a hit it never compiles
    // leaf and those records are the only copy it will ever get. Byte equality
    // against the uncached build is the gate: measured on the reporter's tree,
    // both maps report identical CODE/DATA and PROGRAM totals, so a map-only
    // assertion passes on a provably wrong binary.
    it("does not drop a depth-2 grandchild's debug records when a sibling contributed them first", () => {
      const reference = compileUncached(tree, 'sibrec_target.spin2', '-d');

      compileCold(tree, 'sibrec_primer.spin2', '-d');
      const afterPriming = compileWarm(tree, 'sibrec_target.spin2', '-d');

      // The hit is the point — a miss here would pass for the wrong reason.
      expect(afterPriming.stdout).toMatch(/Object cache: [1-9]\d* hit/);
      expect(afterPriming.binary.length).toBe(reference.binary.length);
      expect(afterPriming.binary.equals(reference.binary)).toBe(true);
    }, 60_000);

    // The same invariant stated on the stored artifact rather than on the
    // output: a content-addressed key promises one payload per key. When the
    // payload is derived from a delta over a table earlier siblings also write
    // to, that promise silently depends on compile ORDER instead.
    it('stores byte-identical sidecars for one key regardless of which program filled the cache', () => {
      const viaPrimer = stageTree(SIBREC_FILES, 'sibrec-a');
      const viaTarget = stageTree(SIBREC_FILES, 'sibrec-b');
      try {
        compileCold(viaPrimer, 'sibrec_primer.spin2', '-d');
        compileCold(viaTarget, 'sibrec_target.spin2', '-d');

        const sidecars = (dir: string): Map<string, string> => {
          const found = new Map<string, string>();
          for (const name of fs.readdirSync(dir)) {
            if (name.endsWith('.dbg')) {
              found.set(name, fs.readFileSync(path.join(dir, name), 'utf8'));
            }
          }
          return found;
        };

        const fromPrimer = sidecars(viaPrimer.cacheDir);
        const fromTarget = sidecars(viaTarget.cacheDir);

        // Keys present in both caches describe the same object compiled the
        // same way; their payloads must agree byte for byte.
        const shared = [...fromTarget.keys()].filter((key) => fromPrimer.has(key));
        expect(shared.length).toBeGreaterThan(0);
        for (const key of shared) {
          expect(fromTarget.get(key)).toBe(fromPrimer.get(key));
        }
      } finally {
        viaPrimer.cleanup();
        viaTarget.cleanup();
      }
    }, 60_000);

    // The fold hands records up ONE level at a time, so a two-level graph
    // cannot distinguish a recursive fold from a fold that happens to reach
    // far enough. This chain is four deep and the target compiles with ZERO
    // misses -- the whole chain arrives from one replayed entry.
    it("folds a deep chain's records up every level, not just the first", () => {
      const deep = stageTree(
        [
          'ordfz_deep_l4.spin2',
          'ordfz_deep_l3.spin2',
          'ordfz_deep_l2.spin2',
          'ordfz_deep_l1.spin2',
          'ordfz_deep_primer.spin2',
          'ordfz_deep_target.spin2'
        ],
        'ordfz-deep'
      );
      try {
        const reference = compileUncached(deep, 'ordfz_deep_target.spin2', '-d');
        compileCold(deep, 'ordfz_deep_primer.spin2', '-d');
        const warm = compileWarm(deep, 'ordfz_deep_target.spin2', '-d');

        // 0 misses is the assertion that makes this test mean something: the
        // entire four-level subtree came back from one entry.
        expect(warm.stdout).toMatch(/Object cache: [1-9]\d* hit\(s\), 0 miss/);
        expect(warm.binary.equals(reference.binary)).toBe(true);
      } finally {
        deep.cleanup();
      }
    }, 60_000);

    // `#pragma exportdef` pushes onto the shared defSymbols array behind an
    // `!alreadyDefined` guard, so a symbol an earlier sibling already pushed
    // does not grow the array -- the same delta-over-deduplicating-accumulator
    // shape as the record defect. The audit argued the cache KEY discriminates
    // the two cases (defSymbols is a key input, snapshotted before the child's
    // own subtree contributes) and that the omission is therefore benign. This
    // test is that argument checked rather than trusted.
    it('is unaffected by whether an exportdef arrived from a sibling or from its own subtree', () => {
      const exp = stageTree(
        ['ordfz_exp_leaf.spin2', 'ordfz_exp_mid.spin2', 'ordfz_exp_utils.spin2', 'ordfz_exp_direct.spin2', 'ordfz_exp_indirect.spin2'],
        'ordfz-exp'
      );
      try {
        const reference = compileUncached(exp, 'ordfz_exp_indirect.spin2', '-d');
        compileCold(exp, 'ordfz_exp_direct.spin2', '-d');
        const warm = compileWarm(exp, 'ordfz_exp_indirect.spin2', '-d');

        expect(warm.stdout).toMatch(/Object cache: [1-9]\d* hit/);
        expect(warm.binary.equals(reference.binary)).toBe(true);
      } finally {
        exp.cleanup();
      }
    }, 60_000);

    // The riskiest branch of the §17 fix: a site inside a region the distiller
    // ELIMINATES must be dropped, not relocated. The holder declares one
    // debug-carrying object twice, so eliminateRedundantObjects collapses the
    // pair. Measured at the time of writing: the leaf stores 2 brkSites, and
    // the holder stores 3 — its own 1 plus ONE surviving copy's 2, not 5. The
    // dropped copy is not a loss; the survivor carries identical content and
    // its own sites.
    it("drops brkSites belonging to an object the distiller eliminated, and keeps the survivor's", () => {
      const dup = stageTree(['ordfz_dup_leaf.spin2', 'ordfz_dup_holder.spin2', 'ordfz_dup_primer.spin2', 'ordfz_dup_target.spin2'], 'ordfz-dup');
      try {
        const reference = compileUncached(dup, 'ordfz_dup_target.spin2', '-d');
        compileCold(dup, 'ordfz_dup_primer.spin2', '-d');
        const warm = compileWarm(dup, 'ordfz_dup_target.spin2', '-d');

        expect(warm.stdout).toMatch(/Object cache: [1-9]\d* hit\(s\), 0 miss/);
        expect(warm.binary.equals(reference.binary)).toBe(true);
      } finally {
        dup.cleanup();
      }
    }, 60_000);

    // ------------------------------------------------------------------
    // Was punch list §17, carried briefly as `it.failing` and fixed in the same
    // release. Found 2026-08-30 while auditing the reported defect for others
    // of its class. Same family, different member: a payload captured at
    // OWN-OBJECT scope while the artifact it describes is SUBTREE scope.
    //
    // A parent's cached .bin carries its descendants' relocated code, brkCodes
    // and all, but `objImage.brkSites` only ever covers the parent's own
    // region — measured on the reporter's tree, isp_rt_utilities stored a
    // 29_860-byte blob whose 62 patch sites all lay at offsets 195-1661, and
    // micro_sd_fat32_fs stored 33_890 bytes with ZERO sites while embedding a
    // grandchild that had 7. So on a hit, injectRecord can legitimately return
    // different indices, the parent's own brkCodes are patched to match, and
    // the descendants' are left pointing at whatever now occupies their old
    // indices.
    //
    // Nastier than the defect above because the SIZE is unchanged — only
    // content moves — so a length assertion passes and only byte comparison
    // catches it.
    //
    // The fix was not local. Descendant brkSites are now registered as
    // compile_obj_blocks copies each child in — rebased past the 8-byte
    // vsize/psize header their coordinates include, since shiftBrkSites(8)
    // runs with that prepend — and then relocated through distillObjects,
    // which compacts the image and drops the regions it eliminates.
    it("patches brkCodes baked into a cached parent's DESCENDANTS, not just its own", () => {
      const shifted = stageTree([...SIBREC_FILES, 'sibrec_filler.spin2', 'sibrec_shifted.spin2'], 'sibrec-shift');
      try {
        const reference = compileUncached(shifted, 'sibrec_shifted.spin2', '-d');

        // Store the utils entry from a compile where its subtree's records take
        // the LOW table indices...
        compileCold(shifted, 'sibrec_target.spin2', '-d');
        // ...then hit it from a program that fills those indices with filler's
        // records first, so the replay lands the subtree somewhere else.
        const afterShift = compileWarm(shifted, 'sibrec_shifted.spin2', '-d');

        expect(afterShift.stdout).toMatch(/Object cache: [1-9]\d* hit/);
        expect(afterShift.binary.equals(reference.binary)).toBe(true);
      } finally {
        shifted.cleanup();
      }
    }, 60_000);
  });
});
