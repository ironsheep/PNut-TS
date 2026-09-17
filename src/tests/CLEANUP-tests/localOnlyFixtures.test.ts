/* eslint-disable no-console */
'use strict';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Every suite in this project enumerates its fixtures by globbing a TEST/ folder.
// A fixture that git does not carry therefore does not merely fail on a clean
// clone -- it produces no test at all, so CI and the release gate verify LESS
// than a local run does and nothing says so. That is how the v1.55.8 release
// workflow came to die on TEST/WUMMI-tests: the shrink had always been silent.
//
// A clean checkout has every TRACKED file, so the asymmetry only runs one way:
// the local tree may carry fixtures CI never sees. This test names them. Any
// present-but-untracked fixture fails here unless it is on the allowlist below,
// which is the standing record of what CI does not verify.

const repoRoot = path.resolve(__dirname, '../../../');
const testRoot = path.join(repoRoot, 'TEST');

/** Fixture inputs and their reference outputs -- never build products. */
const FIXTURE_SUFFIXES = ['.spin2', '.pasm2', '.GOLD'];
/** Preprocessor output, written beside the source it came from. */
const GENERATED = /(-pre|__pre)\.spin2$/;
/** Scratch and editor folders that hold no fixtures. */
const SKIP_DIRS = new Set(['HOLD', 'Log']);

/**
 * Fixtures deliberately left out of the repository, each with the reason. A
 * clean clone runs without them; the suites that use them must say so rather
 * than quietly shrinking (see mapOracleGold.test.ts, which skips an absent
 * corpus by name).
 */
const ALLOWED_LOCAL_ONLY: { prefix: string; why: string }[] = [
  {
    prefix: 'TEST/WUMMI-tests/',
    why: 'Local-only corpus: a large body of third-party Spin2 kept out of the repository. Its own suite (test-wummi) and the WUMMI corpus of MAP-tests run only where it has been placed by hand.'
  },
  {
    prefix: 'TEST/LARGE-tests/TOF/isp_hdmi_debug.',
    why: 'Source is tracked, GOLDs are not: the reference outputs stay local, so CI compiles this fixture without comparing it.'
  }
];

function fixtureFiles(dir: string, relative = 'TEST'): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
        continue;
      }
      found.push(...fixtureFiles(path.join(dir, entry.name), relPath));
    } else if (FIXTURE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix)) && !GENERATED.test(entry.name)) {
      found.push(relPath);
    }
  }
  return found;
}

function trackedFiles(): Set<string> | undefined {
  try {
    const listing = execFileSync('git', ['ls-files', '-z', '--', 'TEST'], { cwd: repoRoot, encoding: 'utf8' });
    return new Set(listing.split('\0').filter((name) => name.length > 0));
  } catch (error) {
    console.error(`local-only fixture check: git unavailable (${error})`);
    return undefined;
  }
}

const tracked = trackedFiles();
// Without git there is nothing to compare against; say so rather than pass.
const checkOrSkip = tracked === undefined ? test.skip : test;

describe('every fixture a gated suite can glob is in the repository', () => {
  checkOrSkip('no local-only fixture outside the allowlist', () => {
    const trackedSet = tracked ?? new Set<string>();
    const localOnly = fixtureFiles(testRoot).filter((name) => !trackedSet.has(name));
    const unexpected = localOnly.filter((name) => !ALLOWED_LOCAL_ONLY.some((allowed) => name.startsWith(allowed.prefix)));

    for (const allowed of ALLOWED_LOCAL_ONLY) {
      const count = localOnly.filter((name) => name.startsWith(allowed.prefix)).length;
      if (count > 0) {
        console.log(`local-only: ${count} fixture file(s) under ${allowed.prefix} are not verified by CI -- ${allowed.why}`);
      }
    }

    if (unexpected.length > 0) {
      throw new Error(
        `${unexpected.length} fixture file(s) exist here but not in the repository, so no clean clone ` +
          `(CI, the release workflow, a contributor) can run them:\n  ${unexpected.join('\n  ')}\n` +
          `Commit them, or add them to ALLOWED_LOCAL_ONLY in src/tests/CLEANUP-tests/localOnlyFixtures.test.ts with the reason.`
      );
    }
  });
});
