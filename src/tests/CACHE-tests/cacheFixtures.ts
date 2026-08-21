/** @format */

// Shared scaffolding for the object-cache test suites.
//
// Two suites build on this: objectCache.test.ts (cache FIDELITY — does a warm
// cache reproduce what a cold compile produced?) and
// objectCacheInvalidation.test.ts (cache INVALIDATION — when an input changes,
// does the cache notice?). The second needs capability the first never did:
// stage a tree somewhere writable, change exactly one file, recompile.
//
// That "somewhere writable" is the whole reason staging exists. The fidelity
// suite compiles TEST/ fixtures in place, which is safe because it never
// modifies them. A mutation test cannot do that — it would edit checked-in
// fixtures and leave the tree dirty on failure. So mutation tests stage a copy
// into a temp directory and mutate that.
//
// ASSERTION SIGNALS. Read the `Objects:` count and DAT symbol addresses, never
// the .map's instance/source name columns. Those labels are wrong today —
// buildObjInstanceInfo() mixes four different index spaces — and the P2
// Knowledge Base independently documents them as untrustworthy
// (p2kbSpin2ObjectImageDedup, map_caveat). Addresses and counts are correct
// even while the labels are not, so tests keyed on them stay meaningful and
// stay independent of the map repair work.

'use strict';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { TextLine } from '../../classes/textLine';
import { removeExistingFile } from '../testUtils';

/** The compiled CLI entry point under test. */
export const toolPath = path.resolve(__dirname, '../../pnut-ts.js');

/** Directory holding the shared .spin2 cache fixtures. */
export const fixturesDir = path.resolve(__dirname, '../../../TEST/CACHE-fixtures');

// --- Unit-level helpers -------------------------------------------------

/** Temp directory for an ObjectCache instance under unit test. */
export function makeTempCacheDir(): string {
  return fs.mkdtempSync(path.join(__dirname, '.cache-test-'));
}

/** Remove a directory tree if it exists. Safe to call on a missing path. */
export function cleanupDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
}

/** Wrap raw strings as TextLines for computeKey() inputs. */
export function makeTextLines(texts: string[]): TextLine[] {
  return texts.map((t, i) => new TextLine(0, t, i));
}

// --- Compile drivers ----------------------------------------------------

/**
 * Compile one .spin2 file, returning the compiler's stdout.
 * Throws with the compiler's stderr attached when compilation fails, so a
 * failing test reports the diagnostic rather than an opaque exit code.
 */
export function compileSpin2(sourceDir: string, filename: string, extraFlags: string = ''): string {
  const filePath = path.join(sourceDir, filename);
  const cmd = `node ${toolPath} ${extraFlags} ${filePath}`;
  try {
    return execSync(cmd, { cwd: sourceDir, encoding: 'utf8', stdio: 'pipe' });
  } catch (error: unknown) {
    if (error instanceof Error && 'stderr' in error) {
      throw new Error(`Compilation failed for ${filename}: ${(error as { stderr: string }).stderr}`);
    }
    throw error;
  }
}

/** Remove the default `.pnut-cache` directory under `dir`. */
export function cleanupCacheDir(dir: string): void {
  cleanupDir(path.join(dir, '.pnut-cache'));
}

/** Remove the compiler outputs for `basename` in `dir`. */
export function cleanupOutputFiles(dir: string, basename: string): void {
  for (const ext of ['.lst', '.obj', '.bin', '.map']) {
    removeExistingFile(path.join(dir, `${basename}${ext}`));
  }
}

// --- Tree staging and mutation ------------------------------------------

/** A staged copy of a fixture tree, with its own private cache directory. */
export interface StagedTree {
  /** Temp directory holding the copied sources. */
  dir: string;
  /** Cache directory for this tree — private, so suites never cross-pollute. */
  cacheDir: string;
  /** Remove the whole staged tree. */
  cleanup: () => void;
}

/**
 * Copy the named fixture files into a fresh temp directory.
 *
 * Names are resolved against `fixturesDir` unless they are absolute. Every
 * file a compile touches must be listed, including non-.spin2 inputs such as
 * `DAT ... FILE` blobs — a missing blob surfaces as "DAT file not found",
 * which reads like a compiler defect rather than an incomplete stage list.
 */
export function stageTree(fileNames: string[], label: string = 'tree'): StagedTree {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pnut-cache-${label}-`));
  for (const name of fileNames) {
    const src = path.isAbsolute(name) ? name : path.join(fixturesDir, name);
    if (!fs.existsSync(src)) {
      throw new Error(`stageTree: fixture not found [${src}]`);
    }
    fs.copyFileSync(src, path.join(dir, path.basename(name)));
  }
  return {
    dir,
    cacheDir: path.join(dir, '.stage-cache'),
    cleanup: () => cleanupDir(dir)
  };
}

/**
 * Replace `from` with `to` in one staged file — the mutation under test.
 *
 * Throws when `from` does not appear. That check is the point: a mutation that
 * silently matched nothing would leave the source unchanged, the cache would
 * correctly hit, and the test would pass while proving nothing.
 */
export function mutateFile(tree: StagedTree, fileName: string, from: string, to: string): void {
  const target = path.join(tree.dir, fileName);
  const before = fs.readFileSync(target, 'utf8');
  if (!before.includes(from)) {
    throw new Error(`mutateFile: pattern not found in [${fileName}]: ${from}`);
  }
  fs.writeFileSync(target, before.split(from).join(to));
}

/** Rewrite a staged binary blob wholesale (the `DAT ... FILE` mutation case). */
export function mutateBlob(tree: StagedTree, fileName: string, bytes: Buffer): void {
  const target = path.join(tree.dir, fileName);
  if (!fs.existsSync(target)) {
    throw new Error(`mutateBlob: blob not staged [${fileName}]`);
  }
  fs.writeFileSync(target, bytes);
}

/** Update a staged file's mtime without changing a byte of its content. */
export function touchFile(tree: StagedTree, fileName: string): void {
  const target = path.join(tree.dir, fileName);
  const later = new Date(Date.now() + 10_000);
  fs.utimesSync(target, later, later);
}

// --- Cold / warm compiles ------------------------------------------------

/** One compile's observable outputs. */
export interface CompileResult {
  binary: Buffer;
  mapPath: string;
  stdout: string;
}

function compileInTree(tree: StagedTree, entry: string, cacheFlags: string, extraFlags: string): CompileResult {
  const basename = entry.replace(/\.spin2$/i, '');
  cleanupOutputFiles(tree.dir, basename);
  const stdout = compileSpin2(tree.dir, entry, `-m ${extraFlags} ${cacheFlags}`.trim());
  return {
    binary: fs.readFileSync(path.join(tree.dir, `${basename}.bin`)),
    mapPath: path.join(tree.dir, `${basename}.map`),
    stdout
  };
}

/** Compile with no cache at all — the reference every other result is judged against. */
export function compileUncached(tree: StagedTree, entry: string, extraFlags: string = ''): CompileResult {
  return compileInTree(tree, entry, '', extraFlags);
}

/** Compile with an emptied cache, populating it. */
export function compileCold(tree: StagedTree, entry: string, extraFlags: string = ''): CompileResult {
  return compileInTree(tree, entry, `--cache --cache-clear --cache-dir ${tree.cacheDir}`, extraFlags);
}

/** Compile against the already-populated cache. */
export function compileWarm(tree: StagedTree, entry: string, extraFlags: string = ''): CompileResult {
  return compileInTree(tree, entry, `--cache --cache-dir ${tree.cacheDir}`, extraFlags);
}

// --- Assertion signals ---------------------------------------------------

/**
 * The `Objects:` count from the map's PROGRAM SUMMARY — how many distinct
 * object images the binary contains. A cache that serves a stale image breaks
 * content-based dedup and this count rises.
 */
export function readObjectCount(mapPath: string): number {
  const map = fs.readFileSync(mapPath, 'utf8');
  const match = map.match(/^\s*Objects:\s+(\d+)\s*$/m);
  if (match === null) {
    throw new Error(`readObjectCount: no 'Objects:' line in [${mapPath}]`);
  }
  return Number(match[1]);
}

/**
 * Every address a DAT symbol resolves to, from the map's SYMBOL INDEX.
 *
 * Returns a list per symbol name because the count is the assertion: a DAT
 * singleton must resolve to exactly ONE address however many objects declare
 * it. Two addresses means the image forked and the "singleton" is now two
 * independent regions with separate state.
 */
export function readDatSymbolAddresses(mapPath: string): Map<string, string[]> {
  const map = fs.readFileSync(mapPath, 'utf8');
  const found = new Map<string, string[]>();
  for (const line of map.split('\n')) {
    const match = line.match(/^\s*(\S+)\s+\S+\s+DAT\s+(\$[0-9A-Fa-f]+)\s*$/);
    if (match !== null) {
      const [, name, address] = match;
      const addresses = found.get(name) ?? [];
      addresses.push(address);
      found.set(name, addresses);
    }
  }
  return found;
}

/**
 * Assert a DAT symbol resolves to exactly one address — the DAT-singleton
 * guarantee, stated as a check. Returns that address so callers can compare
 * it across compiles.
 */
export function expectSingleDatRegion(mapPath: string, symbolName: string): string {
  const addresses = readDatSymbolAddresses(mapPath).get(symbolName.toUpperCase());
  if (addresses === undefined) {
    throw new Error(`expectSingleDatRegion: DAT symbol [${symbolName}] not in [${mapPath}]`);
  }
  if (addresses.length !== 1) {
    throw new Error(
      `expectSingleDatRegion: DAT symbol [${symbolName}] resolved to ${addresses.length} addresses ` +
        `(${addresses.join(', ')}) — the singleton forked into independent regions`
    );
  }
  return addresses[0];
}
