#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/*
 * generate-coverage-report — regenerates the MEASURED block inside
 * DOCs/Regression-Test-Coverage-Report.md.
 *
 * This derives numbers deterministically from the repo state alone:
 *   - .spin2 fixture counts per TEST/*-tests directory (recursive)
 *   - which of those fixtures contain PUB/PRI/CON/VAR/DAT/OBJ blocks
 *     (regex line-start match, best-effort — a fixture with a block
 *     keyword only inside a string or comment would be a false positive,
 *     but none are known to exist)
 *   - Jest suite (test *file*) count and list, via `jest --listTests`
 *
 * It does NOT run any compiles and does NOT know individual `it()`/`test()`
 * case counts inside a suite (that needs `--verbose`, which is a live test
 * run, not a listing). Those true per-test-case counts are exactly what the
 * doc's in-document banner already points at:
 *   npx jest --runInBand --verbose -c smm.jestconfig.js
 *
 * Everything else in the report — the descriptive feature-coverage
 * narrative (which operators, which PASM2 instruction families, which
 * DEBUG display types, etc. are exercised) is hand-authored: no script can
 * derive "is REPEAT WHILE tested" without opinion about what counts as a
 * test of it. That material lives outside the GENERATED markers and this
 * script does not touch it.
 *
 * Usage: node scripts/generate-coverage-report.js [--check]
 *   --check   exit 1 if regenerating would change the file (CI-style gate),
 *             without writing
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TEST_ROOT = path.join(REPO_ROOT, 'TEST');
const REPORT_PATH = path.join(REPO_ROOT, 'DOCs', 'Regression-Test-Coverage-Report.md');
const BEGIN_MARKER = '<!-- GENERATED:BEGIN (scripts/generate-coverage-report.js — do not hand-edit between these markers) -->';
const END_MARKER = '<!-- GENERATED:END -->';

const BLOCK_KEYWORDS = ['CON', 'VAR', 'DAT', 'OBJ', 'PUB', 'PRI'];

function findSpin2Files(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSpin2Files(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.spin2')) {
      results.push(fullPath);
    }
  }
  return results;
}

function countBlockOccurrences(files) {
  const counts = {};
  for (const kw of BLOCK_KEYWORDS) counts[kw] = 0;
  const blockLineRe = new RegExp(`^\\s*(${BLOCK_KEYWORDS.join('|')})\\b`, 'i');
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (e) {
      continue;
    }
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(blockLineRe);
      if (m) seen.add(m[1].toUpperCase());
    }
    for (const kw of seen) counts[kw]++;
  }
  return counts;
}

function getTestCategories() {
  const categories = [];
  for (const entry of fs.readdirSync(TEST_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('-tests')) continue;
    const dirPath = path.join(TEST_ROOT, entry.name);
    const files = findSpin2Files(dirPath);
    categories.push({ name: entry.name, path: dirPath, fileCount: files.length, files });
  }
  categories.sort((a, b) => b.fileCount - a.fileCount);
  return categories;
}

function getJestSuiteList() {
  try {
    const out = execFileSync('npx', ['jest', '--listTests', '-c', 'smm.jestconfig.js'], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } catch (e) {
    console.error('WARNING: could not run `jest --listTests` (is the project built?) — suite count omitted.');
    console.error(String(e.message || e));
    return null;
  }
}

function buildGeneratedBlock() {
  const categories = getTestCategories();
  const totalFixtures = categories.reduce((sum, c) => sum + c.fileCount, 0);
  const suiteList = getJestSuiteList();

  const lines = [];
  lines.push(BEGIN_MARKER);
  lines.push('');
  lines.push(`> Measured ${new Date().toISOString().slice(0, 10)} by \`npm run coverage-report\`. This block is`);
  lines.push('> regenerated from the repo as committed — it is not hand-edited. Regenerate with');
  lines.push('> `npm run coverage-report` after adding or removing fixtures or suites. Everything');
  lines.push('> outside the GENERATED markers is hand-authored descriptive material — see the note');
  lines.push('> at the top of this document.');
  lines.push('');
  lines.push('### Measured fixture counts (`TEST/*-tests`, recursive `.spin2` count)');
  lines.push('');
  lines.push('| Category | .spin2 fixtures | Files with CON | VAR | DAT | OBJ | PUB | PRI |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const cat of categories) {
    const counts = countBlockOccurrences(cat.files);
    lines.push(
      `| **${cat.name}** | ${cat.fileCount} | ${counts.CON} | ${counts.VAR} | ${counts.DAT} | ${counts.OBJ} | ${counts.PUB} | ${counts.PRI} |`
    );
  }
  lines.push(`| **Total** | **${totalFixtures}** | | | | | | |`);
  lines.push('');
  lines.push(`Test categories (directories matching \`TEST/*-tests\`): **${categories.length}**.`);
  lines.push('');
  if (suiteList) {
    const bySuiteDir = new Map();
    for (const suitePath of suiteList) {
      const m = suitePath.match(/\/tests\/([^/]+)\//);
      const dir = m ? m[1] : '(unmatched)';
      bySuiteDir.set(dir, (bySuiteDir.get(dir) || 0) + 1);
    }
    lines.push(`### Measured Jest suite count (\`jest --listTests -c smm.jestconfig.js\`)`);
    lines.push('');
    lines.push(`Total suite files (what \`npm test\` collects): **${suiteList.length}**, across **${bySuiteDir.size}** \`src/tests/*\` directories.`);
    lines.push('');
    lines.push('This is a *file* count, not an individual `it()`/`test()` case count — that requires');
    lines.push('a live run: `npx jest --runInBand --verbose -c smm.jestconfig.js`.');
    lines.push('');
    lines.push('| src/tests/ directory | suite files |');
    lines.push('|---|---|');
    for (const [dir, count] of [...bySuiteDir.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${dir} | ${count} |`);
    }
    lines.push('');
  } else {
    lines.push('### Measured Jest suite count');
    lines.push('');
    lines.push('_Not available this run — see the warning above. Run `npm run build` first._');
    lines.push('');
  }
  lines.push(END_MARKER);
  return lines.join('\n');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const generated = buildGeneratedBlock();
  const existing = fs.readFileSync(REPORT_PATH, 'utf8');

  const beginIdx = existing.indexOf(BEGIN_MARKER);
  const endIdx = existing.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    console.error(`ERROR: ${REPORT_PATH} is missing the GENERATED:BEGIN/END markers. Not touching the file.`);
    process.exit(2);
  }

  const before = existing.slice(0, beginIdx);
  const after = existing.slice(endIdx + END_MARKER.length);
  const updated = before + generated + after;

  if (checkOnly) {
    if (updated !== existing) {
      console.error('STALE: the GENERATED block in Regression-Test-Coverage-Report.md does not match the repo. Run `npm run coverage-report`.');
      process.exit(1);
    }
    console.log('CURRENT: the GENERATED block matches the repo.');
    return;
  }

  fs.writeFileSync(REPORT_PATH, updated);
  console.log(`Wrote ${REPORT_PATH}`);
}

main();
