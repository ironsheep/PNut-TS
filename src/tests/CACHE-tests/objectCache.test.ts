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
  cleanupCacheDir,
  cleanupDir,
  cleanupOutputFiles,
  compileSpin2,
  makeTempCacheDir,
  makeTextLines,
  readMapForComparison
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

  test('symbols round-trip through .sym sidecar with bigint values preserved', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = 'e'.repeat(64);
    const symbols: SymbolEntry[] = [
      new SymbolEntry('FOO', eElementType.type_con_int, BigInt('0xDEADBEEF12345678'), false),
      new SymbolEntry('BAR', eElementType.type_method, BigInt(42), false),
      new SymbolEntry('STR', eElementType.type_constr, 'hello world', false),
      new SymbolEntry('INLINE_X', eElementType.type_register, BigInt(0x1f0), true)
    ];

    cache.set(key, new Uint8Array([0x01, 0x02]), { symbols });
    const restored = cache.getSymbols(key);

    expect(restored).toBeDefined();
    expect(restored!.length).toBe(symbols.length);
    for (let i = 0; i < symbols.length; i++) {
      expect(restored![i].name).toBe(symbols[i].name);
      expect(restored![i].type).toBe(symbols[i].type);
      expect(restored![i].value).toBe(symbols[i].value);
      expect(restored![i].isInline).toBe(symbols[i].isInline);
    }
  });

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

  test('getSymbols returns undefined when sidecar is missing', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = 'f'.repeat(64);
    cache.set(key, new Uint8Array([0x01])); // no symbols
    expect(cache.getSymbols(key)).toBeUndefined();
  });

  test('getSymbols returns undefined when sidecar is malformed', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '0'.repeat(64);
    fs.writeFileSync(path.join(cacheDir, `${key}.sym`), 'this is not json');
    expect(cache.getSymbols(key)).toBeUndefined();
  });

  test('getSymbols returns undefined when sidecar has wrong format version', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = '1'.repeat(64);
    fs.writeFileSync(path.join(cacheDir, `${key}.sym`), JSON.stringify({ cacheFormatVersion: CACHE_FORMAT_VERSION + 999, symbols: [] }));
    expect(cache.getSymbols(key)).toBeUndefined();
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

  afterAll(() => {
    // Clean up any cache directories left by tests
    cleanupCacheDir(objTestDir);
    cleanupCacheDir(overrideTestDir);
  });

  // --- Cache Miss/Hit Path ---

  test('first compilation stores to cache, second uses cache', () => {
    cleanupCacheDir(objTestDir);
    const cachePath = path.join(objTestDir, '.pnut-cache');

    // First run: cache miss — should create cache entries
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O --cache --cache-clear');
    expect(fs.existsSync(cachePath)).toBe(true);
    const cacheFiles = fs.readdirSync(cachePath).filter((f) => f.endsWith('.bin'));
    expect(cacheFiles.length).toBeGreaterThan(0);

    // Save first-run outputs (.obj and .bin are the critical outputs)
    const objContent1 = fs.readFileSync(path.join(objTestDir, 'spin_test14.obj'));
    const binContent1 = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));

    // Second run: should use cache (cache hit)
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O --cache');
    const objContent2 = fs.readFileSync(path.join(objTestDir, 'spin_test14.obj'));
    const binContent2 = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));

    // Object and binary outputs must be identical
    expect(Buffer.from(objContent2).equals(Buffer.from(objContent1))).toBe(true);
    expect(Buffer.from(binContent2).equals(Buffer.from(binContent1))).toBe(true);

    // Cleanup
    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupCacheDir(objTestDir);
  });

  // --- Binary Equivalence: cached vs uncached ---

  describe('binary equivalence: cached output matches uncached output', () => {
    const testFiles = [
      { dir: objTestDir, file: 'spin_test14.spin2', name: 'spin_test14' },
      { dir: objTestDir, file: 'spin_test23.spin2', name: 'spin_test23' }
    ];

    test.each(testFiles)('$name produces identical .obj with and without cache', ({ dir, file, name }) => {
      // Compile WITHOUT cache
      cleanupCacheDir(dir);
      compileSpin2(dir, file, '-l -O');
      const objUncached = fs.readFileSync(path.join(dir, `${name}.obj`));
      const binUncached = fs.readFileSync(path.join(dir, `${name}.bin`));

      // Compile WITH cache (cold cache — first run)
      compileSpin2(dir, file, '-l -O --cache --cache-clear');
      const objCached = fs.readFileSync(path.join(dir, `${name}.obj`));
      const binCached = fs.readFileSync(path.join(dir, `${name}.bin`));

      // Must be byte-identical
      expect(Buffer.from(objCached).equals(Buffer.from(objUncached))).toBe(true);
      expect(Buffer.from(binCached).equals(Buffer.from(binUncached))).toBe(true);

      // Compile WITH cache (warm cache — second run, cache hits)
      compileSpin2(dir, file, '-l -O --cache');
      const objWarmCached = fs.readFileSync(path.join(dir, `${name}.obj`));
      const binWarmCached = fs.readFileSync(path.join(dir, `${name}.bin`));

      // Must STILL be byte-identical
      expect(Buffer.from(objWarmCached).equals(Buffer.from(objUncached))).toBe(true);
      expect(Buffer.from(binWarmCached).equals(Buffer.from(binUncached))).toBe(true);

      // Also verify against GOLD files
      const goldenObjPath = path.join(dir, `${name}.obj.GOLD`);
      if (fs.existsSync(goldenObjPath)) {
        expect(compareObjOrBinFiles(path.join(dir, `${name}.obj`), goldenObjPath)).toBe(true);
      }

      // Cleanup
      cleanupOutputFiles(dir, name);
      cleanupCacheDir(dir);
    });
  });

  // --- Deduplication with cache ---

  test('cache works correctly with shared (duplicate) child objects', () => {
    cleanupCacheDir(objTestDir);

    // spin_test23 has shared1 and shared2 referencing the same child file
    compileSpin2(objTestDir, 'spin_test23.spin2', '-l -O --cache --cache-clear');
    const objContent1 = fs.readFileSync(path.join(objTestDir, 'spin_test23.obj'));

    // Second compilation should use cached children
    compileSpin2(objTestDir, 'spin_test23.spin2', '-l -O --cache');
    const objContent2 = fs.readFileSync(path.join(objTestDir, 'spin_test23.obj'));

    expect(Buffer.from(objContent2).equals(Buffer.from(objContent1))).toBe(true);

    // Verify against GOLD
    const goldenObjPath = path.join(objTestDir, 'spin_test23.obj.GOLD');
    if (fs.existsSync(goldenObjPath)) {
      expect(compareObjOrBinFiles(path.join(objTestDir, 'spin_test23.obj'), goldenObjPath)).toBe(true);
    }

    cleanupOutputFiles(objTestDir, 'spin_test23');
    cleanupCacheDir(objTestDir);
  });

  // --- Override Parameter Variants ---

  test('cache stores separate entries for different override parameters', () => {
    cleanupCacheDir(overrideTestDir);
    const cachePath = path.join(overrideTestDir, '.pnut-cache');

    // override_top.spin2 has 3 instances of param_child with different overrides
    compileSpin2(overrideTestDir, 'override_top.spin2', '-l -O --cache --cache-clear');
    expect(fs.existsSync(cachePath)).toBe(true);

    // Should have at least 3 cache entries (one per unique override combination)
    const cacheFiles = fs.readdirSync(cachePath).filter((f) => f.endsWith('.bin'));
    expect(cacheFiles.length).toBeGreaterThanOrEqual(3);

    // Save first-run output
    const objContent1 = fs.readFileSync(path.join(overrideTestDir, 'override_top.obj'));

    // Second run with warm cache
    compileSpin2(overrideTestDir, 'override_top.spin2', '-l -O --cache');
    const objContent2 = fs.readFileSync(path.join(overrideTestDir, 'override_top.obj'));

    // Must be byte-identical
    expect(Buffer.from(objContent2).equals(Buffer.from(objContent1))).toBe(true);

    cleanupOutputFiles(overrideTestDir, 'override_top');
    cleanupCacheDir(overrideTestDir);
  });

  // --- Cache Clear ---

  test('--cache-clear removes all entries and recompiles fresh', () => {
    cleanupCacheDir(objTestDir);
    const cachePath = path.join(objTestDir, '.pnut-cache');

    // Build cache
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O --cache --cache-clear');
    const filesBefore = fs.readdirSync(cachePath);
    expect(filesBefore.length).toBeGreaterThan(0);

    // Clear and rebuild
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O --cache --cache-clear');
    const filesAfter = fs.readdirSync(cachePath);
    // Same number of files (rebuilt from scratch)
    expect(filesAfter.length).toBe(filesBefore.length);

    // Verify output is still correct
    const goldenObjPath = path.join(objTestDir, 'spin_test14.obj.GOLD');
    if (fs.existsSync(goldenObjPath)) {
      expect(compareObjOrBinFiles(path.join(objTestDir, 'spin_test14.obj'), goldenObjPath)).toBe(true);
    }

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupCacheDir(objTestDir);
  });

  // --- Deep Object Hierarchy ---

  test('cache works with deep object nesting (3+ levels)', () => {
    // spin_test22 has 3 levels of nesting: top -> level1 -> level2 -> level3
    cleanupCacheDir(objTestDir);

    // Without cache
    compileSpin2(objTestDir, 'spin_test22.spin2', '-l -O');
    const objUncached = fs.readFileSync(path.join(objTestDir, 'spin_test22.obj'));

    // With cache (cold)
    compileSpin2(objTestDir, 'spin_test22.spin2', '-l -O --cache --cache-clear');
    const objColdCached = fs.readFileSync(path.join(objTestDir, 'spin_test22.obj'));
    expect(Buffer.from(objColdCached).equals(Buffer.from(objUncached))).toBe(true);

    // With cache (warm — all children should hit cache)
    compileSpin2(objTestDir, 'spin_test22.spin2', '-l -O --cache');
    const objWarmCached = fs.readFileSync(path.join(objTestDir, 'spin_test22.obj'));
    expect(Buffer.from(objWarmCached).equals(Buffer.from(objUncached))).toBe(true);

    // Verify against GOLD
    const goldenObjPath = path.join(objTestDir, 'spin_test22.obj.GOLD');
    if (fs.existsSync(goldenObjPath)) {
      expect(compareObjOrBinFiles(path.join(objTestDir, 'spin_test22.obj'), goldenObjPath)).toBe(true);
    }

    cleanupOutputFiles(objTestDir, 'spin_test22');
    cleanupCacheDir(objTestDir);
  });

  // --- Custom Cache Directory (--cache-dir) ---

  test('--cache-dir places cache in the specified directory', () => {
    const customCacheDir = path.join(objTestDir, '.custom-cache-test');
    cleanupDir(customCacheDir);
    cleanupCacheDir(objTestDir);

    // Compile with --cache-dir pointing to a custom location
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${customCacheDir}`);

    // Cache should exist at the custom location
    expect(fs.existsSync(customCacheDir)).toBe(true);
    const cacheFiles = fs.readdirSync(customCacheDir).filter((f) => f.endsWith('.bin'));
    expect(cacheFiles.length).toBeGreaterThan(0);

    // Default cache location should NOT exist
    const defaultCachePath = path.join(objTestDir, '.pnut-cache');
    expect(fs.existsSync(defaultCachePath)).toBe(false);

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupDir(customCacheDir);
  });

  test('--cache-dir produces identical output to default cache location', () => {
    const customCacheDir = path.join(objTestDir, '.custom-cache-equiv');
    cleanupDir(customCacheDir);
    cleanupCacheDir(objTestDir);

    // Compile without cache for reference
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O');
    const objUncached = fs.readFileSync(path.join(objTestDir, 'spin_test14.obj'));
    const binUncached = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));

    // Compile with custom cache dir (cold)
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${customCacheDir}`);
    const objColdCached = fs.readFileSync(path.join(objTestDir, 'spin_test14.obj'));
    const binColdCached = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));
    expect(Buffer.from(objColdCached).equals(Buffer.from(objUncached))).toBe(true);
    expect(Buffer.from(binColdCached).equals(Buffer.from(binUncached))).toBe(true);

    // Compile with custom cache dir (warm — should hit cache)
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${customCacheDir}`);
    const objWarmCached = fs.readFileSync(path.join(objTestDir, 'spin_test14.obj'));
    const binWarmCached = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));
    expect(Buffer.from(objWarmCached).equals(Buffer.from(objUncached))).toBe(true);
    expect(Buffer.from(binWarmCached).equals(Buffer.from(binUncached))).toBe(true);

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupDir(customCacheDir);
  });

  test('--cache-dir allows sharing cache across different source directories', () => {
    const sharedCacheDir = path.join(objTestDir, '.shared-cache-test');
    cleanupDir(sharedCacheDir);

    // Compile from objTestDir — populates the shared cache
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${sharedCacheDir}`);
    const cacheFilesAfterFirst = fs.readdirSync(sharedCacheDir).filter((f) => f.endsWith('.bin'));
    expect(cacheFilesAfterFirst.length).toBeGreaterThan(0);

    // Compile again — should get cache hits (same entries, no new files)
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${sharedCacheDir}`);
    const cacheFilesAfterSecond = fs.readdirSync(sharedCacheDir).filter((f) => f.endsWith('.bin'));
    expect(cacheFilesAfterSecond.length).toBe(cacheFilesAfterFirst.length);

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupDir(sharedCacheDir);
  });

  test('--cache-clear with --cache-dir clears the custom directory', () => {
    const customCacheDir = path.join(objTestDir, '.custom-cache-clear');
    cleanupDir(customCacheDir);

    // Build cache
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-dir ${customCacheDir}`);
    expect(fs.existsSync(customCacheDir)).toBe(true);
    const filesBefore = fs.readdirSync(customCacheDir).filter((f) => f.endsWith('.bin'));
    expect(filesBefore.length).toBeGreaterThan(0);

    // Clear and rebuild
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${customCacheDir}`);
    const filesAfter = fs.readdirSync(customCacheDir).filter((f) => f.endsWith('.bin'));
    expect(filesAfter.length).toBe(filesBefore.length);

    // Verify output is still correct against GOLD
    const goldenObjPath = path.join(objTestDir, 'spin_test14.obj.GOLD');
    if (fs.existsSync(goldenObjPath)) {
      expect(compareObjOrBinFiles(path.join(objTestDir, 'spin_test14.obj'), goldenObjPath)).toBe(true);
    }

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupDir(customCacheDir);
  });

  // --- Debug flag must invalidate cache across runs ---

  test('--debug toggle does not return stale non-debug binary from cache', () => {
    const debugCacheDir = path.join(objTestDir, '.debug-toggle-cache');
    cleanupDir(debugCacheDir);

    // Step 1: warm the cache with NO debug
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --cache --cache-clear --cache-dir ${debugCacheDir}`);
    const cacheFilesAfterNoDebug = fs.readdirSync(debugCacheDir).filter((f) => f.endsWith('.bin'));
    expect(cacheFilesAfterNoDebug.length).toBeGreaterThan(0);

    // Step 2: reference build WITH debug, no cache, captured first
    cleanupOutputFiles(objTestDir, 'spin_test14');
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O --debug');
    const binDebugUncached = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));

    // Step 3: now compile WITH debug using the cache that was warmed without debug.
    // The cache must NOT return the no-debug binary; the new compile must produce
    // a binary that matches the uncached --debug reference.
    cleanupOutputFiles(objTestDir, 'spin_test14');
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O --debug --cache --cache-dir ${debugCacheDir}`);
    const binDebugCached = fs.readFileSync(path.join(objTestDir, 'spin_test14.bin'));

    expect(Buffer.from(binDebugCached).equals(Buffer.from(binDebugUncached))).toBe(true);

    // After the --debug build there should be more cache entries than before
    // (the debug variants compute different keys and were written fresh).
    const cacheFilesAfterDebug = fs.readdirSync(debugCacheDir).filter((f) => f.endsWith('.bin'));
    expect(cacheFilesAfterDebug.length).toBeGreaterThan(cacheFilesAfterNoDebug.length);

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupDir(debugCacheDir);
  });

  // --- Map file fidelity with cached children ---

  test('warm cache produces identical .map output to uncached --map build', () => {
    const mapCacheDir = path.join(objTestDir, '.map-cache');
    cleanupDir(mapCacheDir);

    // The map header embeds a wall-clock timestamp ("Generated: ..."). Strip it
    // before comparing so we're testing map content, not generation time.
    const stripTimestamp = (s: string): string => s.replace(/^Generated:.*$/m, 'Generated: <stripped>');

    // Reference: uncached --map run
    cleanupOutputFiles(objTestDir, 'spin_test14');
    compileSpin2(objTestDir, 'spin_test14.spin2', '-l -O -m');
    const mapPathUncached = path.join(objTestDir, 'spin_test14.map');
    expect(fs.existsSync(mapPathUncached)).toBe(true);
    const mapUncached = stripTimestamp(fs.readFileSync(mapPathUncached, 'utf8'));

    // Cold cache --map run — fills the cache with binary + symbol sidecars
    cleanupOutputFiles(objTestDir, 'spin_test14');
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O -m --cache --cache-clear --cache-dir ${mapCacheDir}`);
    const mapColdCached = stripTimestamp(fs.readFileSync(path.join(objTestDir, 'spin_test14.map'), 'utf8'));
    expect(mapColdCached).toBe(mapUncached);

    // Confirm .sym sidecars were written for the cached children
    const symFiles = fs.readdirSync(mapCacheDir).filter((f) => f.endsWith('.sym'));
    expect(symFiles.length).toBeGreaterThan(0);

    // Warm cache --map run — children hit cache; symbols restored from .sym
    cleanupOutputFiles(objTestDir, 'spin_test14');
    compileSpin2(objTestDir, 'spin_test14.spin2', `-l -O -m --cache --cache-dir ${mapCacheDir}`);
    const mapWarmCached = stripTimestamp(fs.readFileSync(path.join(objTestDir, 'spin_test14.map'), 'utf8'));
    expect(mapWarmCached).toBe(mapUncached);

    cleanupOutputFiles(objTestDir, 'spin_test14');
    cleanupDir(mapCacheDir);
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
    const dbgFixtureDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');
    const debugRecordsCacheDir = path.join(dbgFixtureDir, '.dbg-records-cache');
    cleanupDir(debugRecordsCacheDir);
    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');

    // Reference: uncached --debug build
    compileSpin2(dbgFixtureDir, 'spin_dbg_cache_parent.spin2', '-d');
    const binUncached = fs.readFileSync(path.join(dbgFixtureDir, 'spin_dbg_cache_parent.bin'));

    // Cold cache --debug build — fills .pnut-cache with binary + sym + dbg sidecars
    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');
    compileSpin2(dbgFixtureDir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-clear --cache-dir ${debugRecordsCacheDir}`);
    const binColdCached = fs.readFileSync(path.join(dbgFixtureDir, 'spin_dbg_cache_parent.bin'));
    expect(Buffer.from(binColdCached).equals(Buffer.from(binUncached))).toBe(true);

    // Confirm .dbg sidecars exist for the cached children
    const dbgFiles = fs.readdirSync(debugRecordsCacheDir).filter((f) => f.endsWith('.dbg'));
    expect(dbgFiles.length).toBeGreaterThan(0);

    // Warm cache --debug build — child loads from cache; debug records replayed.
    // This is the path that produced garbled output before the .dbg sidecar fix.
    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');
    compileSpin2(dbgFixtureDir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-dir ${debugRecordsCacheDir}`);
    const binWarmCached = fs.readFileSync(path.join(dbgFixtureDir, 'spin_dbg_cache_parent.bin'));
    expect(Buffer.from(binWarmCached).equals(Buffer.from(binUncached))).toBe(true);

    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');
    cleanupDir(debugRecordsCacheDir);
  });

  test('debug+cache hit with missing .dbg sidecar surfaces a clear error', () => {
    const dbgFixtureDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');
    const corruptCacheDir = path.join(dbgFixtureDir, '.dbg-corrupt-cache');
    cleanupDir(corruptCacheDir);
    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');

    // Warm cache normally
    compileSpin2(dbgFixtureDir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-clear --cache-dir ${corruptCacheDir}`);
    const dbgFiles = fs.readdirSync(corruptCacheDir).filter((f) => f.endsWith('.dbg'));
    expect(dbgFiles.length).toBeGreaterThan(0);

    // Delete every .dbg sidecar — simulates a partial-write scenario where
    // .bin survived but .dbg didn't. Compiler must refuse the hit instead of
    // silently producing a broken binary.
    for (const f of dbgFiles) fs.rmSync(path.join(corruptCacheDir, f));

    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');
    expect(() => {
      compileSpin2(dbgFixtureDir, 'spin_dbg_cache_parent.spin2', `-d --cache --cache-dir ${corruptCacheDir}`);
    }).toThrow(/missing or invalid \.dbg sidecar/);

    cleanupOutputFiles(dbgFixtureDir, 'spin_dbg_cache_parent');
    cleanupDir(corruptCacheDir);
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
    const fixtureDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');
    const expdefCacheDir = path.join(fixtureDir, '.expdef-cache');
    cleanupDir(expdefCacheDir);
    cleanupOutputFiles(fixtureDir, 'expdef_parentX');
    cleanupOutputFiles(fixtureDir, 'expdef_parentY');

    // Reference 1: parentY built fresh — captures the SYM_Y-shape ground truth.
    compileSpin2(fixtureDir, 'expdef_parentY.spin2');
    const binY_uncached = fs.readFileSync(path.join(fixtureDir, 'expdef_parentY.bin'));
    cleanupOutputFiles(fixtureDir, 'expdef_parentY');

    // Cold-build parentX with cache enabled — populates the cache with the
    // shared child's SYM_X-branch binary (and the SYM_X grandchild).
    compileSpin2(fixtureDir, 'expdef_parentX.spin2', `--cache --cache-clear --cache-dir ${expdefCacheDir}`);
    cleanupOutputFiles(fixtureDir, 'expdef_parentX');

    // Warm-build parentY against the same cache. Pre-fix, the shared-child
    // entry collides on key (no defSymbols in key), and parentY's binary
    // ends up with parentX's embedded grandchild (kind=1). Post-fix, the
    // defSymbols difference forces a key miss → fresh compile → correct
    // SYM_Y branch (kind=2).
    compileSpin2(fixtureDir, 'expdef_parentY.spin2', `--cache --cache-dir ${expdefCacheDir}`);
    const binY_warm = fs.readFileSync(path.join(fixtureDir, 'expdef_parentY.bin'));
    expect(Buffer.from(binY_warm).equals(Buffer.from(binY_uncached))).toBe(true);

    cleanupOutputFiles(fixtureDir, 'expdef_parentY');
    cleanupDir(expdefCacheDir);
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
    const dbgFixtureDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');
    const sharedCacheDir = path.join(dbgFixtureDir, '.dbg-shared-cache');
    cleanupDir(sharedCacheDir);
    cleanupOutputFiles(dbgFixtureDir, 'dbg_cache_parentA');
    cleanupOutputFiles(dbgFixtureDir, 'dbg_cache_parentB');

    // Reference 1: parentA built fresh (no cache).
    compileSpin2(dbgFixtureDir, 'dbg_cache_parentA.spin2', '-d');
    const binA_uncached = fs.readFileSync(path.join(dbgFixtureDir, 'dbg_cache_parentA.bin'));
    cleanupOutputFiles(dbgFixtureDir, 'dbg_cache_parentA');

    // Reference 2: parentB built fresh (no cache).
    compileSpin2(dbgFixtureDir, 'dbg_cache_parentB.spin2', '-d');
    const binB_uncached = fs.readFileSync(path.join(dbgFixtureDir, 'dbg_cache_parentB.bin'));
    cleanupOutputFiles(dbgFixtureDir, 'dbg_cache_parentB');

    // Cold cache build of parentA — populates .pnut-cache with extraA + shared.
    compileSpin2(dbgFixtureDir, 'dbg_cache_parentA.spin2', `-d --cache --cache-clear --cache-dir ${sharedCacheDir}`);
    const binA_cold = fs.readFileSync(path.join(dbgFixtureDir, 'dbg_cache_parentA.bin'));
    expect(Buffer.from(binA_cold).equals(Buffer.from(binA_uncached))).toBe(true);
    cleanupOutputFiles(dbgFixtureDir, 'dbg_cache_parentA');

    // Warm cache build of parentB — extraB is a cache miss (different source);
    // shared HITS the entry stored during parentA's compile. extraB contributes
    // 3 records, pushing shared's records past parentA's prefix length, so the
    // remap+patch path is exercised on every brkCode in shared's binary.
    compileSpin2(dbgFixtureDir, 'dbg_cache_parentB.spin2', `-d --cache --cache-dir ${sharedCacheDir}`);
    const binB_warm = fs.readFileSync(path.join(dbgFixtureDir, 'dbg_cache_parentB.bin'));
    expect(Buffer.from(binB_warm).equals(Buffer.from(binB_uncached))).toBe(true);

    cleanupOutputFiles(dbgFixtureDir, 'dbg_cache_parentB');
    cleanupDir(sharedCacheDir);
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
    const fixtureDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');
    const subtreeCacheDir = path.join(fixtureDir, '.subtree-exp-cache');
    cleanupDir(subtreeCacheDir);
    cleanupOutputFiles(fixtureDir, 'expdef_subtree_parent');

    // Reference: fresh build with no cache.
    compileSpin2(fixtureDir, 'expdef_subtree_parent.spin2');
    const refBinary = fs.readFileSync(path.join(fixtureDir, 'expdef_subtree_parent.bin'));
    cleanupOutputFiles(fixtureDir, 'expdef_subtree_parent');

    // Cold cache build — populates the cache with sd_child + grandchild + utils_child.
    compileSpin2(fixtureDir, 'expdef_subtree_parent.spin2', `--cache --cache-clear --cache-dir ${subtreeCacheDir}`);
    const coldBinary = fs.readFileSync(path.join(fixtureDir, 'expdef_subtree_parent.bin'));
    expect(Buffer.from(coldBinary).equals(Buffer.from(refBinary))).toBe(true);
    cleanupOutputFiles(fixtureDir, 'expdef_subtree_parent');

    // Warm cache build — sd_child cache-hits, its grandchild's preprocess is
    // skipped, but the .dbg sidecar's subtreeExports replay GC_FEATURE before
    // utils_child's preprocess runs. utils_child's preprocessedLines matches
    // the cold compile, its cache key matches, it hits cache cleanly.
    compileSpin2(fixtureDir, 'expdef_subtree_parent.spin2', `--cache --cache-dir ${subtreeCacheDir}`);
    const warmBinary = fs.readFileSync(path.join(fixtureDir, 'expdef_subtree_parent.bin'));
    expect(Buffer.from(warmBinary).equals(Buffer.from(refBinary))).toBe(true);

    cleanupOutputFiles(fixtureDir, 'expdef_subtree_parent');
    cleanupDir(subtreeCacheDir);
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
    const objDir = path.resolve(__dirname, '../../../TEST/OBJ-tests');
    const cacheFixDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');
    const overrideDir = path.resolve(__dirname, '../../../TEST/MAP-tests/test4-override');

    interface Fixture {
      label: string;
      dir: string;
      file: string;
      basename: string;
      flags: string; // extra flags, applied to all three compiles
      pattern: string;
    }

    const fixtures: Fixture[] = [
      {
        label: 'simple parent + 1 child',
        dir: objDir,
        file: 'spin_test14.spin2',
        basename: 'spin_test14',
        flags: '-O',
        pattern: 'depth-1 child cached, no overrides, no debug'
      },
      {
        label: 'multi-sibling children sharing one child source',
        dir: objDir,
        file: 'spin_test23.spin2',
        basename: 'spin_test23',
        flags: '-O',
        pattern: 'two OBJ siblings reference same child file (dedup path)'
      },
      {
        label: 'override parameters',
        dir: overrideDir,
        file: 'override_top.spin2',
        basename: 'override_top',
        flags: '',
        pattern: 'OBJ block with | CONST = N overrides — distinct cache entries per override set'
      },
      {
        label: 'debug + cache (DebugData replay)',
        dir: cacheFixDir,
        file: 'spin_dbg_cache_parent.spin2',
        basename: 'spin_dbg_cache_parent',
        flags: '-d',
        pattern: 'parent + child both call debug() — exercises .dbg sidecar replay + brkSite remap'
      },
      {
        label: 'heterogeneous parents — parentA shape',
        dir: cacheFixDir,
        file: 'dbg_cache_parentA.spin2',
        basename: 'dbg_cache_parentA',
        flags: '-d',
        pattern: 'extraA + shared, populates the cache that parentB will read'
      },
      {
        label: 'heterogeneous parents — parentB shape',
        dir: cacheFixDir,
        file: 'dbg_cache_parentB.spin2',
        basename: 'dbg_cache_parentB',
        flags: '-d',
        pattern: 'extraB + shared, hits parentA-populated entry; brkSite remap exercised'
      },
      {
        label: 'exportdef key-isolation (parentX)',
        dir: cacheFixDir,
        file: 'expdef_parentX.spin2',
        basename: 'expdef_parentX',
        flags: '',
        pattern: '#pragma exportdef SYM_X — key includes defSymbols'
      },
      {
        label: 'exportdef key-isolation (parentY)',
        dir: cacheFixDir,
        file: 'expdef_parentY.spin2',
        basename: 'expdef_parentY',
        flags: '',
        pattern: '#pragma exportdef SYM_Y — must miss parentX cache despite identical shared-child source'
      },
      {
        label: 'subtree exportdef replay (v1.54.6 regression)',
        dir: cacheFixDir,
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
        dir: cacheFixDir,
        file: 'optblock_rewind_parent.spin2',
        basename: 'optblock_rewind_parent',
        flags: '-d',
        pattern: 'debug() inside REPEAT/IF/CASE that triggers optimizeBlock rewinds; brkSite capture must follow setOffsetTo'
      }
    ];

    // Each fixture gets its own cache directory so they don't pollute one
    // another. Every fixture runs three times: uncached (reference), cold
    // cache (must match ref), warm cache (must match ref).
    test.each(fixtures)(
      'warm cache produces byte-identical output to uncached: $label ($pattern)',
      ({ dir, file, basename, flags }) => {
        const cacheDirForFixture = path.join(dir, `.cache-regression-${basename}`);
        cleanupDir(cacheDirForFixture);
        cleanupOutputFiles(dir, basename);

        // `-m` on all three compiles so the MAP is compared alongside the
        // binary. The binary is still the first net — it is the artifact that
        // can carry staleness — but the map is derived from distiller and
        // symbol state on a different path, so the two can disagree, and until
        // 1.55.4 the map's own labels were too unreliable to assert on. They
        // are not any more, which makes a warm map that differs from an
        // uncached one a real signal rather than noise.
        const mapFlags = `${flags} -m`.trim();
        const binPath = path.join(dir, `${basename}.bin`);
        const mapPath = path.join(dir, `${basename}.map`);

        // Reference: fresh, no cache
        compileSpin2(dir, file, mapFlags);
        expect(fs.existsSync(binPath)).toBe(true);
        expect(fs.existsSync(mapPath)).toBe(true);
        const refBinary = fs.readFileSync(binPath);
        const refMap = readMapForComparison(mapPath);
        cleanupOutputFiles(dir, basename);

        // Cold cache: cache empty, compile populates it
        compileSpin2(dir, file, `${mapFlags} --cache --cache-clear --cache-dir ${cacheDirForFixture}`);
        const coldBinary = fs.readFileSync(binPath);
        expect(Buffer.from(coldBinary).equals(Buffer.from(refBinary))).toBe(true);
        expect(readMapForComparison(mapPath)).toBe(refMap);
        cleanupOutputFiles(dir, basename);

        // Warm cache: every child should hit
        compileSpin2(dir, file, `${mapFlags} --cache --cache-dir ${cacheDirForFixture}`);
        const warmBinary = fs.readFileSync(binPath);
        expect(Buffer.from(warmBinary).equals(Buffer.from(refBinary))).toBe(true);
        expect(readMapForComparison(mapPath)).toBe(refMap);

        cleanupOutputFiles(dir, basename);
        cleanupDir(cacheDirForFixture);
      },
      // 30 second per-fixture timeout — even the slowest fixture (-d -O) is
      // well under this in practice. Generous to absorb CI noise.
      30_000
    );
  });
});
