#!/usr/bin/env node
/*
 * docs-check — report documentation currency against DOCs/doc-coverage.json
 *
 * A document is OUT OF DATE when the thing it describes has changed since the
 * document was last verified against it. Absolute age is not the signal; age
 * relative to the covered source is.
 *
 * Reports three things:
 *   UNCLASSIFIED  a tracked *.md missing from the manifest, or a manifest entry
 *                 whose file no longer exists. Either is a defect in the
 *                 manifest itself and is what keeps it honest.
 *   STALE         covered source has commits newer than the doc's `verified`
 *                 release tag (or newer than the doc's own last commit, when
 *                 `verified` is null).
 *   CURRENT       everything else.
 *
 * Exit codes:  0 = no findings   1 = findings   2 = manifest/tooling error
 * `--strict` additionally fails on UNCLASSIFIED only (for a lighter gate).
 *
 * This is a BACKSTOP. The primary net is the sprint-plan documentation gate,
 * which catches omission — a doc that never mentioned the thing you just added.
 * No tool can detect a missing section. This catches the other half: drift, in
 * claims that were true once.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const MANIFEST = path.join(REPO, 'DOCs', 'doc-coverage.json');

function git(args, quiet = false) {
  return execFileSync('git', args, {
    cwd: REPO,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'inherit'],
  }).trim();
}

function fail(msg) {
  console.error(`docs-check: ${msg}`);
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
} catch (e) {
  fail(`cannot read ${path.relative(REPO, MANIFEST)}: ${e.message}`);
}

const { areas = {}, documents = {}, policy = {} } = manifest;

// ---------------------------------------------------------------- timestamps

/** Newest commit time (unix) across the given pathspecs, or 0 if none. */
function newestCommit(paths) {
  if (!paths || paths.length === 0) return 0;
  let newest = 0;
  for (const p of paths) {
    let out = '';
    try {
      out = git(['log', '-1', '--format=%ct', '--', p]);
    } catch {
      out = '';
    }
    if (out) newest = Math.max(newest, parseInt(out, 10) || 0);
  }
  return newest;
}

/** Commit time of a release tag, or null when the tag does not exist. */
const tagTimeCache = new Map();
function tagTime(version) {
  if (!version) return null;
  if (tagTimeCache.has(version)) return tagTimeCache.get(version);
  let t = null;
  for (const candidate of [`v${version}`, version]) {
    try {
      t = parseInt(git(['log', '-1', '--format=%ct', candidate], true), 10) || null;
      if (t) break;
    } catch {
      /* tag absent (e.g. the release being prepared) — try next form */
    }
  }
  tagTimeCache.set(version, t);
  return t;
}

// ---------------------------------------------------------------- evaluation

// Tracked AND untracked-but-not-ignored, so a newly added document is caught
// on the run before it is committed rather than the release after.
const tracked = [
  ...new Set(
    git(['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'])
      .split('\n')
      .filter(Boolean)
  ),
].sort();
const listed = new Set(Object.keys(documents));

const unclassified = tracked.filter((f) => !listed.has(f));
const missing = [...listed].filter((f) => !fs.existsSync(path.join(REPO, f)));

const stale = [];
const current = [];
const unknownArea = [];

for (const [file, entry] of Object.entries(documents)) {
  const cls = entry.class;
  if (cls === 'historical' || cls === 'generated' || cls === 'process') continue;
  if (!fs.existsSync(path.join(REPO, file))) continue;

  const covers = entry.covers || [];
  for (const a of covers) {
    if (!areas[a]) unknownArea.push(`${file} -> "${a}"`);
  }

  const sourcePaths = covers.flatMap((a) => areas[a] || []);
  if (sourcePaths.length === 0) {
    current.push({ file, cls, why: 'no covered source areas' });
    continue;
  }

  const srcTime = newestCommit(sourcePaths);
  // Baseline: the verified release tag, else the doc's own last commit.
  const verifiedTime = tagTime(entry.verified);
  const baseline = verifiedTime !== null ? verifiedTime : newestCommit([file]);
  const basis =
    verifiedTime !== null
      ? `verified ${entry.verified}`
      : entry.verified
        ? `tag for ${entry.verified} not found; using doc's last commit`
        : 'never verified; using doc\'s last commit';

  if (srcTime > baseline) {
    const days = Math.round((srcTime - baseline) / 86400);
    stale.push({ file, cls, days, basis, covers, note: entry.note });
  } else {
    current.push({ file, cls, why: basis });
  }
}

// ------------------------------------------------------------------- report

const RED = process.stdout.isTTY ? '\x1b[31m' : '';
const YEL = process.stdout.isTTY ? '\x1b[33m' : '';
const DIM = process.stdout.isTTY ? '\x1b[2m' : '';
const OFF = process.stdout.isTTY ? '\x1b[0m' : '';

console.log(`\ndocs-check — ${tracked.length} tracked .md, ${listed.size} in manifest\n`);

if (unknownArea.length) {
  console.log(`${RED}MANIFEST ERROR — undefined area referenced${OFF}`);
  unknownArea.forEach((u) => console.log(`  ${u}`));
  console.log('');
}

if (unclassified.length || missing.length) {
  console.log(`${RED}UNCLASSIFIED (${unclassified.length + missing.length})${OFF} ${DIM}— manifest must list every tracked .md, exactly once${OFF}`);
  unclassified.forEach((f) => console.log(`  ${f} ${DIM}(tracked, not in manifest)${OFF}`));
  missing.forEach((f) => console.log(`  ${f} ${DIM}(in manifest, file absent)${OFF}`));
  console.log('');
}

const shippedStale = stale.filter((s) => s.cls === 'shipped');
const governedStale = stale
  .filter((s) => s.cls === 'governed')
  .sort((a, b) => b.days - a.days);

if (shippedStale.length) {
  console.log(`${RED}STALE — shipped (${shippedStale.length})${OFF} ${DIM}— users read these; ALWAYS auto-added to the sprint plan${OFF}`);
  shippedStale.forEach((s) => {
    console.log(`  ${s.file}  ${DIM}covers [${s.covers.join(', ')}] · ${s.basis} · source ${s.days}d newer${OFF}`);
    if (s.note) console.log(`      ${DIM}${s.note}${OFF}`);
  });
  console.log('');
}

if (governedStale.length) {
  const n = policy.autoAddGovernedPerSprint ?? 3;
  console.log(`${YEL}STALE — governed (${governedStale.length})${OFF} ${DIM}— oldest ${n} auto-added per sprint${OFF}`);
  governedStale.forEach((s, i) => {
    const mark = i < n ? `${YEL}→${OFF}` : ' ';
    console.log(`  ${mark} ${s.file}  ${DIM}covers [${s.covers.join(', ')}] · ${s.basis} · source ${s.days}d newer${OFF}`);
  });
  if (governedStale.length > n) {
    console.log(`    ${DIM}${governedStale.length - n} more not auto-added this sprint — backlog draws down at ${n}/sprint${OFF}`);
  }
  console.log('');
}

const byClass = {};
for (const e of Object.values(documents)) byClass[e.class] = (byClass[e.class] || 0) + 1;
console.log(`${DIM}classes: ${Object.entries(byClass).map(([k, v]) => `${k}=${v}`).join('  ')}${OFF}`);
console.log(`${DIM}current: ${current.length} · stale: ${stale.length} · unclassified: ${unclassified.length + missing.length}${OFF}\n`);

const strict = process.argv.includes('--strict');
const findings = strict
  ? unclassified.length + missing.length + unknownArea.length
  : unclassified.length + missing.length + unknownArea.length + stale.length;
process.exit(findings > 0 ? 1 : 0);
