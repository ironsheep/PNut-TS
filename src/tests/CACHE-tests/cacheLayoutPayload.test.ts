/** @format */

// The object cache's layout payload (.sym sidecar, format 10).
//
// Two defects this payload fixed, each with a regression test that fails on
// format 9:
//   1. A hit replayed its instance subtree and symbols only when a map was
//      being written. A parent compiled above that hit in a build WITHOUT -m
//      stored an entry missing the hit's whole subtree, and a later -m build
//      that hit the parent wrote an incomplete map.
//   2. Every override was recorded with isFloat false.

'use strict';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { CACHE_FORMAT_VERSION, ObjectCache } from '../../classes/objectCache';
import { SymbolEntry } from '../../classes/symbolTable';
import { eElementType } from '../../classes/types';
import { cleanupDir, compileSpin2, makeTempCacheDir, readMapForComparison } from './cacheFixtures';

const COMPILE_TIMEOUT_MS = 60000;

interface Stage {
  dir: string;
  cacheDir: string;
  cleanup: () => void;
}

function stageSources(label: string, sources: Record<string, string>): Stage {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pnut-cache-payload-${label}-`));
  for (const [name, text] of Object.entries(sources)) {
    fs.writeFileSync(path.join(dir, name), text);
  }
  return { dir, cacheDir: path.join(dir, '.payload-cache'), cleanup: () => cleanupDir(dir) };
}

describe('layout payload: ObjectCache unit', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = makeTempCacheDir();
  });

  afterEach(() => {
    cleanupDir(cacheDir);
  });

  test('own variant, descendant variants and instances round-trip', () => {
    const cache = new ObjectCache(true, cacheDir);
    const key = 'a'.repeat(64);
    const own = [new SymbolEntry('COUNT', eElementType.type_var_long, 4n, false)];
    const leaf = [new SymbolEntry('FLIP', eElementType.type_dat_long, BigInt(0x16), true)];
    cache.set(key, new Uint8Array([1]), {
      symbols: own,
      ownVar: { sourceFileName: 'mid.spin2', varSizes: [['COUNT', 40]], ownVarBytes: 44 },
      variants: [{ sourceFileName: 'leaf.spin2', symbols: leaf, varSizes: [], ownVarBytes: 4 }],
      instances: [
        {
          relativeParent: -1,
          childPosition: 0,
          sourceFileName: 'leaf.spin2',
          overrides: [{ name: 'RATE', value: '1075838976', isFloat: true }],
          elementCount: 3,
          isArray: true,
          variant: 0
        }
      ]
    });
    const payload = cache.getLayoutPayload(key);
    expect(payload).toBeDefined();
    expect(payload!.own.sourceFileName).toBe('mid.spin2');
    expect(payload!.own.varSizes).toEqual([['COUNT', 40]]);
    expect(payload!.own.ownVarBytes).toBe(44);
    expect(payload!.own.symbols[0].value).toBe(4n);
    expect(payload!.variants[0].symbols[0].isInline).toBe(true);
    expect(payload!.instances[0]).toEqual({
      relativeParent: -1,
      childPosition: 0,
      sourceFileName: 'leaf.spin2',
      overrides: [{ name: 'RATE', value: '1075838976', isFloat: true }],
      elementCount: 3,
      isArray: true,
      variant: 0
    });
  });

  test('a format-9 sidecar, a missing own entry and a bad variant index all read as absent', () => {
    const cache = new ObjectCache(true, cacheDir);
    const write = (key: string, body: object): void => fs.writeFileSync(path.join(cacheDir, `${key}.sym`), JSON.stringify(body));
    write('1'.repeat(64), { cacheFormatVersion: 9, symbols: [], instances: [], subtreeSymbols: [] });
    write('2'.repeat(64), { cacheFormatVersion: CACHE_FORMAT_VERSION, symbols: [], variants: [], instances: [] });
    write('3'.repeat(64), {
      cacheFormatVersion: CACHE_FORMAT_VERSION,
      symbols: [],
      own: { f: 'x.spin2', z: [], w: 4 },
      variants: [],
      instances: [{ relativeParent: -1, childPosition: 0, sourceFileName: 'y.spin2', overrides: [], elementCount: 1, isArray: false, variant: 0 }]
    });
    expect(cache.getLayoutPayload('1'.repeat(64))).toBeUndefined();
    expect(cache.getLayoutPayload('2'.repeat(64))).toBeUndefined();
    expect(cache.getLayoutPayload('3'.repeat(64))).toBeUndefined();
    expect(CACHE_FORMAT_VERSION).toBe(10);
  });
});

// A three-level subtree under a wrapper, plus a program that reaches the same
// middle object directly, so the middle object can be cached by one build and
// hit under a parent that misses in another.
const SUBTREE_SOURCES: Record<string, string> = {
  'leafv.spin2': `CON LEAF_TAG = $1EAF_0000\nVAR long lv\nDAT ltag LONG LEAF_TAG\nPUB get() : r\n  r := ltag + lv\n`,
  'midv.spin2': `CON MID_TAG = $A1D0_0000\nVAR long mv, mw, mx\nOBJ leaf : "leafv" | LEAF_TAG = MID_TAG + $0100_0000\nDAT mtag LONG MID_TAG\nPUB get() : r\n  r := mtag + leaf.get() + mv\n`,
  'wrap.spin2': `VAR long w\nOBJ\n  m : "midv"\nPUB get() : r\n  r := m.get() + w\n`,
  'direct.spin2': `{Spin2_v55}\nOBJ\n  m : "midv"\nPUB main()\n  m.get()\n`,
  'target.spin2': `{Spin2_v55}\nOBJ\n  t : "wrap"\nPUB main()\n  t.get()\n`
};

describe('layout payload: a cache filled without -m', () => {
  test(
    'serves the same map as an uncached build',
    () => {
      const stage = stageSources('nomap', SUBTREE_SOURCES);
      const cacheFlags = `--cache --cache-dir ${stage.cacheDir}`;
      try {
        compileSpin2(stage.dir, 'target.spin2', '-q -m');
        const reference = readMapForComparison(path.join(stage.dir, 'target.map'));
        // Fill without -m: midv cached by one program, then hit under wrap,
        // which misses and stores its own entry above the hit.
        compileSpin2(stage.dir, 'direct.spin2', `-q ${cacheFlags}`);
        compileSpin2(stage.dir, 'target.spin2', `-q ${cacheFlags}`);
        // Now hit wrap with -m.
        compileSpin2(stage.dir, 'target.spin2', `-q -m ${cacheFlags}`);
        const warm = readMapForComparison(path.join(stage.dir, 'target.map'));
        expect(warm).toBe(reference);
        expect(warm).toContain('T.M.LEAF');
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );

  test(
    'a hit whose .sym sidecar is gone fails loudly',
    () => {
      const stage = stageSources('nosym', SUBTREE_SOURCES);
      const cacheFlags = `--cache --cache-dir ${stage.cacheDir}`;
      try {
        compileSpin2(stage.dir, 'direct.spin2', `-q ${cacheFlags}`);
        for (const name of fs.readdirSync(stage.cacheDir).filter((file) => file.endsWith('.sym'))) {
          fs.rmSync(path.join(stage.cacheDir, name));
        }
        expect(() => compileSpin2(stage.dir, 'direct.spin2', `-q ${cacheFlags}`)).toThrow('missing or invalid .sym sidecar');
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});

describe('layout payload: overrides', () => {
  test(
    'a float override is recorded as a float, an integer override as an integer',
    () => {
      const stage = stageSources('float', {
        'kid.spin2': `CON RATE = 1.0\n  OFFSET = 0\nVAR long x\nPUB get() : r\n  r := OFFSET\n`,
        'mid.spin2': `VAR long m\nOBJ k : "kid" | RATE = 2.5, OFFSET = -1\nPUB get() : r\n  r := k.get() + m\n`,
        'top.spin2': `{Spin2_v55}\nOBJ\n  c : "mid"\nPUB main()\n  c.get()\n`
      });
      try {
        compileSpin2(stage.dir, 'top.spin2', `-q --cache --cache-dir ${stage.cacheDir}`);
        const overrides = fs
          .readdirSync(stage.cacheDir)
          .filter((file) => file.endsWith('.sym'))
          .flatMap(
            (file) =>
              (JSON.parse(fs.readFileSync(path.join(stage.cacheDir, file), 'utf8')).instances ?? []) as {
                overrides?: { name: string; value: string; isFloat: boolean }[];
              }[]
          )
          .flatMap((instance) => instance.overrides ?? []);
        expect(overrides).toEqual([
          { name: 'RATE', value: '1075838976', isFloat: true },
          { name: 'OFFSET', value: '4294967295', isFloat: false }
        ]);
      } finally {
        stage.cleanup();
      }
    },
    COMPILE_TIMEOUT_MS
  );
});
