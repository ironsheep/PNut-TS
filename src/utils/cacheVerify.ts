/** @format */

// Prove that a cached build produces exactly what an uncached one would.

'use strict';
// src/utils/cacheVerify.ts

import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { Context } from './context';
import { iOutputFilespecs, outputFilespecs } from './outputFilespecs';

/**
 * Why a CHILD PROCESS and not a second compile in this one.
 *
 * The whole reason the object cache is hard is that compilation reads and
 * writes process-global state — the preprocessor symbol set, the debug record
 * table, the object image. A reference compile run inside this process would
 * inherit and then perturb that state, so a "reference" built that way could
 * differ from a real one for reasons having nothing to do with the cache. A
 * separate process starts from nothing, which is the only way the reference is
 * worth comparing against.
 *
 * Why the reference runs FIRST.
 *
 * `-o` renames only the binary; the listing, map and object file keep their
 * derived names. A reference compile therefore cannot be redirected somewhere
 * harmless — it writes over the same paths. So it runs first, its outputs are
 * read into memory, and the real cached compile then overwrites them. What is
 * compared is that snapshot against what the cached build finally left on disk.
 */
export interface VerifySnapshot {
  binary: Buffer | undefined;
  map: string | undefined;
}

/** The `Generated:` stamp is the one line two identical compiles may differ on. */
function readMapWithoutStamp(mapPath: string): string | undefined {
  if (!fs.existsSync(mapPath)) return undefined;
  return fs
    .readFileSync(mapPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('Generated:'))
    .join('\n');
}

/**
 * Strip this run's cache flags so the child compiles with no cache at all.
 *
 * Anything else the user passed — include paths, defines, debug, optimisation —
 * is carried through untouched: a reference built under different options would
 * differ for reasons that are not the cache's fault.
 */
export function referenceArgs(argv: string[]): string[] {
  const stripped: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '-C' || arg === '--cache' || arg === '--cache-clear' || arg === '--cache-verify') {
      continue;
    }
    if (arg === '--cache-dir') {
      index++; // drop its value too
      continue;
    }
    if (arg.startsWith('--cache-dir=')) {
      continue;
    }
    stripped.push(arg);
  }
  return stripped;
}

/**
 * Run the uncached reference compile and snapshot what it produced.
 *
 * Returns undefined when the reference compile itself failed — the caller
 * reports that rather than treating it as a verification pass, because a
 * comparison we could not make is not a comparison that succeeded.
 */
export function captureReference(context: Context): VerifySnapshot | undefined {
  const args = referenceArgs(process.argv.slice(2));
  const result = spawnSync(process.execPath, [process.argv[1], ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    context.logger.errorMsg(`--cache-verify: the uncached reference compile failed, so nothing could be verified.\n` + (result.stderr ?? '').trim());
    return undefined;
  }
  const outputs: iOutputFilespecs = outputFilespecs(context);
  return {
    binary: fs.existsSync(outputs.binary) ? fs.readFileSync(outputs.binary) : undefined,
    map: context.compileOptions.writeMapFile ? readMapWithoutStamp(outputs.map) : undefined
  };
}

/**
/**
 * 1-based index of the first byte at which two buffers disagree.
 *
 * 1-based because it is read by a person beside `cmp`, which numbers bytes
 * from 1. Returns the length of the shorter buffer plus one when one is a
 * prefix of the other, which is the same convention `cmp` uses for EOF.
 */
export function firstDifferingByte(a: Buffer, b: Buffer): number {
  const shared = Math.min(a.length, b.length);
  for (let index = 0; index < shared; index++) {
    if (a[index] !== b[index]) {
      return index + 1;
    }
  }
  return shared + 1;
}

/**
 * Compare what the cached build left on disk against the reference snapshot.
 *
 * Returns true when they agree. A mismatch names the artifact and the sizes,
 * because "your cache is lying to you" is only actionable if it says which
 * output disagreed.
 */
export function verifyAgainstReference(context: Context, reference: VerifySnapshot): boolean {
  const outputs: iOutputFilespecs = outputFilespecs(context);
  const problems: string[] = [];

  if (reference.binary !== undefined) {
    if (!fs.existsSync(outputs.binary)) {
      problems.push(`the cached build produced no binary, the uncached one produced ${reference.binary.length} bytes`);
    } else {
      const cached = fs.readFileSync(outputs.binary);
      if (!cached.equals(reference.binary)) {
        // Say WHICH way it differs. An equal-length mismatch is a real and
        // nastier case — the whole §17 defect class produces one — and
        // reporting "cached 9585 bytes, uncached 9585 bytes" prints the same
        // number twice, which reads like a broken checker at exactly the
        // moment someone is deciding whether to trust it.
        if (cached.length === reference.binary.length) {
          problems.push(
            `binary differs — same size (${cached.length} bytes), first difference at byte ${firstDifferingByte(cached, reference.binary)}`
          );
        } else {
          problems.push(`binary differs — cached ${cached.length} bytes, uncached ${reference.binary.length} bytes`);
        }
      }
    }
  }

  if (reference.map !== undefined) {
    const cachedMap = readMapWithoutStamp(outputs.map);
    if (cachedMap === undefined) {
      problems.push('the cached build produced no map, the uncached one did');
    } else if (cachedMap !== reference.map) {
      problems.push('map differs from the uncached build');
    }
  }

  if (problems.length === 0) {
    context.logger.progressMsg('Object cache verified: output matches an uncached build');
    return true;
  }

  context.logger.errorMsg(
    `Object cache VERIFICATION FAILED — a cached build did not reproduce the uncached result:\n` +
      problems.map((problem) => `  - ${problem}`).join('\n') +
      `\n  Rebuild with --cache-clear to recover, and please report this: a cache hit served content ` +
      `a fresh compile would not have produced.`
  );
  return false;
}
