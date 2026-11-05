#!/usr/bin/env node
/*
 * gen-rebuild-scripts — write every TEST/<dir>/rebuild-gold.ps1 (the per-suite
 * Windows PNut GOLD scripts) from scripts/gold/suites.json, the fixture table
 * scripts/fixtures/fixtures.json, and each suite directory's .spin2 listing.
 *
 * Usage:
 *   node scripts/gold/gen-rebuild-scripts.js [--root DIR]
 *   node scripts/gold/gen-rebuild-scripts.js --check [--root DIR]
 *
 *   (none)    write every suite's rebuild-gold.ps1 that differs from what the
 *             inputs give. A problem (below) stops the run before anything is
 *             written. A suite whose directory does not exist is reported and
 *             passed over. Nothing is deleted.
 *   --check   read-only. Exit 1 if any script is missing or differs from what
 *             would be written, if a rebuild-gold.ps1 exists for a directory
 *             suites.json does not list, or on any problem.
 *   --root    read and write DIR/<dir>/ instead of TEST/<dir>/.
 *
 * Exit codes: 0 clean; 1 a problem was reported; 2 bad usage.
 * This script never creates, edits or deletes a .GOLD file.
 *
 * ---------------------------------------------------------------------------
 * suites.json is { schema: 1, doc, pnutDirectives, suites, excluded }.
 * Unknown keys are errors.
 *
 *   pnutDirectives  the preprocessor directives PNut has
 *                   (REF-V52A/p2com.asm:20094-20101). Used by classifyDirectives.
 *   suites          { "<dir relative to TEST/>": suite }. One generated script each.
 *   excluded        { "<dir>": "reason" } for suites that have a jest test but
 *                   no Windows run. Every suite in scripts/fixtures/generate.js
 *                   SUITES is in exactly one of suites / excluded.
 *
 * suite field               meaning
 * ------------------------  -------------------------------------------------
 * defaultFlag               -c | -cd | -ci. The PNut flag for every file without
 *                           an override. generate.js derives its fixture flag
 *                           class from it (-c none, -cd debug, -ci flash).
 * produces                  outputs renamed to .GOLD (default lst, obj, bin).
 * perFilePatternFlag        { "<-like pattern>": flag }, in order.
 * patternNote               comment lines written inside the pattern table.
 * perFileFlag               { "<name>.spin2": flag }. Wins over a pattern.
 * skip                      { "<name>.spin2": "reason" }: never compiled on
 *                           Windows; its GOLDs are left in place.
 * expectFailWhenErroutGold  a .spin2 that no fixtures.json row owns is expected
 *                           to fail when <base>.errout.GOLD exists beside it.
 * classifyDirectives        a .spin2 that no row owns is goldSource pnut-ts, and
 *                           so skipped, when a line starts with a # directive
 *                           not in pnutDirectives (#include, #error, ...).
 * notes                     lines for the generated header.
 *
 * Per file, the expected outcome and the gold source come from its
 * fixtures.json row when one owns the file (kind reject = expected to fail,
 * goldSource pnut-ts = skipped), and otherwise from the two rules above. The
 * expected-fail and skip lists are written into the script as PowerShell
 * arrays (-ExpectFail, -Skip) for scripts/gold/rebuild-gold-lib.ps1.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { SUITES, loadTable, manifest } = require('../fixtures/generate.js');

const REPO = path.resolve(__dirname, '..', '..');
const TEST_DIR = path.join(REPO, 'TEST');
const SUITES_FILE = path.join(__dirname, 'suites.json');
const TABLE_FILE = path.join(REPO, 'scripts', 'fixtures', 'fixtures.json');
const SCRIPT_NAME = 'rebuild-gold.ps1';

const FLAGS = ['-c', '-cd', '-ci'];
const OUTPUTS = ['lst', 'obj', 'bin', 'flash'];
const DEFAULT_PRODUCES = ['lst', 'obj', 'bin'];
const TOP_KEYS = ['schema', 'doc', 'pnutDirectives', 'suites', 'excluded'];
const SUITE_KEYS = [
  'defaultFlag',
  'produces',
  'perFilePatternFlag',
  'patternNote',
  'perFileFlag',
  'skip',
  'expectFailWhenErroutGold',
  'classifyDirectives',
  'notes'
];
// Text placed inside a PowerShell double-quoted string must not interpolate.
const PS_NAME = /^[A-Za-z0-9_.*?[\]-]+$/;
const SPIN2_NAME = /^[A-Za-z0-9_.-]+\.spin2$/;

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

function safeCommentLine(s) {
  return !/[\r\n]/.test(s) && !s.includes('#>') && !s.includes('<#');
}

/* Validate suites.json. Returns { config, problems }. */
function loadSuites(file) {
  const problems = [];
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { config: null, problems: [`suites ${file}: ${e.message}`] };
  }
  if (!isPlainObject(config))
    return { config: null, problems: ['suites: the top level is an object'] };
  for (const key of Object.keys(config))
    if (!TOP_KEYS.includes(key)) problems.push(`suites: unknown key "${key}"`);
  if (config.schema !== 1) problems.push('suites: schema must be 1');
  if (!isStringArray(config.pnutDirectives) || config.pnutDirectives.length === 0)
    problems.push('suites: pnutDirectives is a non-empty array of names');
  if (!isPlainObject(config.suites))
    return { config: null, problems: [...problems, 'suites: "suites" is an object'] };
  const excluded = has(config, 'excluded') ? config.excluded : {};
  if (!isPlainObject(excluded)) problems.push('suites: "excluded" is an object');

  for (const [dir, s] of Object.entries(config.suites)) {
    const w = `suite ${dir}`;
    if (!/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(dir)) {
      problems.push(`${w}: the key is a directory under TEST/ (letters, digits, _ - /)`);
      continue;
    }
    if (!isPlainObject(s)) {
      problems.push(`${w}: an entry is an object`);
      continue;
    }
    for (const key of Object.keys(s))
      if (!SUITE_KEYS.includes(key)) problems.push(`${w}: unknown field "${key}"`);
    if (!FLAGS.includes(s.defaultFlag))
      problems.push(`${w}: defaultFlag must be one of ${FLAGS.join(', ')}`);
    if (has(s, 'produces')) {
      if (
        !isStringArray(s.produces) ||
        s.produces.length === 0 ||
        !s.produces.every((x) => OUTPUTS.includes(x))
      )
        problems.push(`${w}: produces is a non-empty list of ${OUTPUTS.join(', ')}`);
    }
    for (const table of ['perFilePatternFlag', 'perFileFlag']) {
      if (!has(s, table)) continue;
      if (!isPlainObject(s[table])) {
        problems.push(`${w}: ${table} is an object`);
        continue;
      }
      for (const [k, v] of Object.entries(s[table])) {
        const nameOk = table === 'perFileFlag' ? SPIN2_NAME.test(k) : PS_NAME.test(k);
        if (!nameOk) problems.push(`${w}: ${table} key "${k}" is not a plain name or pattern`);
        if (!FLAGS.includes(v)) problems.push(`${w}: ${table} "${k}" flag must be one of ${FLAGS.join(', ')}`);
      }
      const lower = Object.keys(s[table]).map((k) => k.toLowerCase());
      if (new Set(lower).size !== lower.length)
        problems.push(`${w}: ${table} has keys that differ only in case (a PowerShell hashtable rejects them)`);
    }
    if (has(s, 'patternNote')) {
      if (!has(s, 'perFilePatternFlag'))
        problems.push(`${w}: patternNote needs perFilePatternFlag`);
      if (!isStringArray(s.patternNote) || !s.patternNote.every(safeCommentLine))
        problems.push(`${w}: patternNote is a list of single comment lines`);
    }
    if (has(s, 'skip')) {
      if (!isPlainObject(s.skip)) problems.push(`${w}: skip is an object of name -> reason`);
      else
        for (const [k, v] of Object.entries(s.skip)) {
          if (!SPIN2_NAME.test(k)) problems.push(`${w}: skip key "${k}" is not a plain name.spin2`);
          if (typeof v !== 'string' || v.trim() === '' || !safeCommentLine(v))
            problems.push(`${w}: skip "${k}" needs a one-line reason`);
        }
    }
    for (const b of ['expectFailWhenErroutGold', 'classifyDirectives'])
      if (has(s, b) && typeof s[b] !== 'boolean') problems.push(`${w}: ${b} is true or false`);
    if (!isStringArray(s.notes) || !s.notes.every(safeCommentLine))
      problems.push(`${w}: notes is a list of single lines (no <# or #>)`);
  }
  if (isPlainObject(excluded)) {
    for (const [dir, why] of Object.entries(excluded)) {
      if (typeof why !== 'string' || why.trim() === '')
        problems.push(`excluded ${dir}: needs a reason`);
      if (has(config.suites, dir)) problems.push(`excluded ${dir}: is also in suites`);
    }
  }
  for (const name of Object.keys(SUITES)) {
    if (!has(config.suites, name) && !(isPlainObject(excluded) && has(excluded, name)))
      problems.push(`suite ${name}: is in scripts/fixtures/generate.js SUITES but in neither suites nor excluded`);
  }
  return { config: { ...config, excluded }, problems };
}

function listSpin2(dirPath) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return null;
    throw e;
  }
  return entries
    .filter((e) => e.isFile() && /\.spin2$/i.test(e.name) && !/(__pre|-pre)\.spin2$/i.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
}

/* The # directives a source uses that are not among PNut's. */
function foreignDirectives(text, allowed) {
  const found = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    const m = /^\s*#([A-Za-z_][A-Za-z0-9_]*)/.exec(line);
    if (m !== null && !allowed.has(m[1].toUpperCase())) {
      const d = `#${m[1].toLowerCase()}`;
      if (!found.includes(d)) found.push(d);
    }
  }
  return found;
}

/*
 * Decide every file of one suite. Returns { plan, problems } where plan is
 * { files, expectFail: [{name, why}], skip: [{name, why}] }.
 */
function planSuite(dir, suite, files, rows, root, allowedDirectives) {
  const problems = [];
  const dirPath = path.join(root, dir);
  const byFile = new Map();
  for (const r of rows) byFile.set(r.file, r);
  const listed = new Set(files);
  for (const r of rows)
    if (!listed.has(r.file))
      problems.push(`suite ${dir}: row ${r.id} owns ${r.file}, which is not in the directory`);
  for (const table of ['perFileFlag', 'skip'])
    for (const name of Object.keys(suite[table] || {}))
      if (!listed.has(name)) problems.push(`suite ${dir}: ${table} names ${name}, which is not in the directory`);
  for (const name of files)
    if (!SPIN2_NAME.test(name)) problems.push(`suite ${dir}: ${name} is not a plain file name`);

  const expectFail = [];
  const skip = [];
  for (const name of files) {
    const row = byFile.get(name);
    const base = name.replace(/\.spin2$/i, '');
    let fails = false;
    let failWhy = '';
    let pnutTs = false;
    let pnutTsWhy = '';
    if (row !== undefined) {
      fails = row.kind === 'reject';
      failWhy = `fixtures.json row ${row.id} is reject`;
      pnutTs = row.goldSource === 'pnut-ts';
      pnutTsWhy = `fixtures.json row ${row.id} is goldSource pnut-ts`;
    } else {
      if (suite.expectFailWhenErroutGold && fs.existsSync(path.join(dirPath, `${base}.errout.GOLD`))) {
        fails = true;
        failWhy = 'has .errout.GOLD';
      }
      if (suite.classifyDirectives) {
        const used = foreignDirectives(fs.readFileSync(path.join(dirPath, name), 'latin1'), allowedDirectives);
        if (used.length > 0) {
          pnutTs = true;
          pnutTsWhy = `goldSource pnut-ts: uses ${used.join(', ')}`;
        }
      }
    }
    if (suite.skip && has(suite.skip, name)) skip.push({ name, why: suite.skip[name] });
    else if (pnutTs) skip.push({ name, why: pnutTsWhy });
    else if (fails) expectFail.push({ name, why: failWhy });
  }
  return { plan: { files, expectFail, skip }, problems };
}

function quoted(s) {
  return `"${s}"`;
}

function hashtableLines(table, note) {
  const keys = Object.keys(table);
  const width = Math.max(...keys.map((k) => quoted(k).length));
  const lines = (note || []).map((l) => `            # ${l}`);
  for (const k of keys) lines.push(`            ${quoted(k).padEnd(width)} = ${quoted(table[k])}`);
  return lines;
}

/* One comment per distinct reason (in order of first use), its files under it. */
function arrayLines(entries) {
  const groups = new Map();
  for (const e of entries) {
    if (!groups.has(e.why)) groups.set(e.why, []);
    groups.get(e.why).push(e.name);
  }
  const lines = [];
  for (const [why, names] of groups) {
    lines.push(`            # ${why}`);
    for (const n of names) lines.push(`            ${quoted(n)}`);
  }
  return lines;
}

function rulesSummary(suite, plan) {
  const produces = suite.produces || DEFAULT_PRODUCES;
  const pairs = (t) =>
    t && Object.keys(t).length > 0
      ? Object.entries(t)
          .map(([k, v]) => `${k} -> ${v}`)
          .join('; ')
      : '(none)';
  const counted = (list, arg) =>
    list.length === 0 ? '(none)' : `${list.length} file(s), listed in ${arg} below`;
  return [
    'Rules:',
    `  - Default flag: ${suite.defaultFlag}`,
    `  - Produces:     ${produces.join(', ')}`,
    `  - Patterns:     ${pairs(suite.perFilePatternFlag)}`,
    `  - Per-file:     ${pairs(suite.perFileFlag)}`,
    `  - Skip:         ${counted(plan.skip, '-Skip')}`,
    `  - Expect fail:  ${counted(plan.expectFail, '-ExpectFail')}` +
      (plan.expectFail.length > 0 ? '; Error.txt -> <base>.errout.GOLD' : '')
  ];
}

function render(dir, suite, plan) {
  const indent = (l) => (l === '' ? '' : `    ${l}`);
  const header = [
    '<#',
    '.SYNOPSIS',
    `    Regenerate GOLDs for ${dir} using Windows PNut.`,
    '',
    '.DESCRIPTION',
    '    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js',
    '    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this',
    "    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts",
    '',
    ...rulesSummary(suite, plan).map(indent),
    ...(suite.notes.length > 0 ? ['', ...suite.notes.map(indent)] : []),
    '#>'
  ];
  const ups = '..\\'.repeat(dir.split('/').length + 1);

  // Each argument is a block of lines; every block but the last ends with a backtick.
  const args = [[`        -PNutVersion $PNutVersion`], [`        -PNutInstallRoot $PNutInstallRoot`], [`        -PNutBinary $PNutBinary`]];
  args.push([`        -DefaultFlag ${quoted(suite.defaultFlag)}`]);
  if (suite.produces) args.push([`        -Produces @(${suite.produces.map(quoted).join(', ')})`]);
  if (suite.perFilePatternFlag && Object.keys(suite.perFilePatternFlag).length > 0)
    args.push(['        -PerFilePatternFlag @{', ...hashtableLines(suite.perFilePatternFlag, suite.patternNote), '        }']);
  if (suite.perFileFlag && Object.keys(suite.perFileFlag).length > 0)
    args.push(['        -PerFileFlag @{', ...hashtableLines(suite.perFileFlag), '        }']);
  if (plan.skip.length > 0) args.push(['        -Skip @(', ...arrayLines(plan.skip), '        )']);
  if (plan.expectFail.length > 0)
    args.push(['        -ExpectFail @(', ...arrayLines(plan.expectFail), '        )']);
  const argLines = [];
  args.forEach((block, k) => {
    const last = k === args.length - 1;
    block.forEach((line, j) => argLines.push(!last && j === block.length - 1 ? `${line} \`` : line));
  });

  const body = [
    'param(',
    '    [int]$PNutVersion = 55,',
    '    [string]$PNutInstallRoot = "C:\\Program Files (x86)\\Parallax Inc",',
    '    [string]$PNutBinary = ""',
    ')',
    '',
    `. (Join-Path $PSScriptRoot "${ups}scripts\\gold\\rebuild-gold-lib.ps1")`,
    '',
    'Push-Location $PSScriptRoot',
    'try {',
    '    Invoke-RebuildGold `',
    ...argLines,
    '}',
    'finally {',
    '    Pop-Location',
    '}'
  ];
  return [...header, ...body].join('\n') + '\n';
}

/* Every rebuild-gold.ps1 under root, as directory names relative to root. */
function findScripts(root, rel = '') {
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return found;
    throw e;
  }
  for (const e of entries) {
    const child = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) {
      if (/-rebuild-v\d/.test(e.name) || e.name === 'node_modules' || e.name.startsWith('.')) continue;
      found.push(...findScripts(root, child));
    } else if (e.isFile() && e.name === SCRIPT_NAME && rel !== '') {
      found.push(rel);
    }
  }
  return found;
}

/* Everything the run needs, without writing. */
function build(root) {
  const { config, problems } = loadSuites(SUITES_FILE);
  if (config === null) return { problems, outputs: [], absent: [] };
  const table = loadTable(TABLE_FILE);
  problems.push(...table.problems.map((p) => `fixtures.json: ${p}`));
  const rows = manifest(table.rows);
  for (const r of rows) {
    if (has(config.excluded, r.suite) && r.goldSource === 'pnut')
      problems.push(`row ${r.id}: goldSource pnut in ${r.suite}, which has no Windows run (${config.excluded[r.suite]})`);
  }
  const allowed = new Set((config.pnutDirectives || []).map((d) => d.toUpperCase()));
  const outputs = [];
  const absent = [];
  for (const [dir, suite] of Object.entries(config.suites)) {
    const files = listSpin2(path.join(root, dir));
    if (files === null) {
      absent.push(dir);
      continue;
    }
    const r = planSuite(dir, suite, files, rows.filter((x) => x.suite === dir), root, allowed);
    problems.push(...r.problems);
    outputs.push({ dir, file: path.join(root, dir, SCRIPT_NAME), text: render(dir, suite, r.plan), plan: r.plan });
  }
  for (const dir of findScripts(root))
    if (!has(config.suites, dir))
      problems.push(`ORPHAN ${dir}/${SCRIPT_NAME}: suites.json has no entry for ${dir}`);
  return { problems, outputs, absent };
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function parseArgs(argv) {
  const opts = { check: false, root: TEST_DIR };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--check') opts.check = true;
    else if (a === '--root') {
      if (k + 1 >= argv.length) throw new Error('--root needs a value');
      opts.root = path.resolve(argv[++k]);
    } else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`gen-rebuild-scripts: ${e.message}\nusage: gen-rebuild-scripts.js [--check] [--root DIR]\n`);
    return 2;
  }
  const { problems, outputs, absent } = build(opts.root);
  for (const dir of absent)
    process.stdout.write(`gen-rebuild-scripts: ${dir}: directory absent under ${opts.root}, passed over\n`);

  if (opts.check) {
    const found = [...problems];
    for (const o of outputs) {
      const have = readIfExists(o.file);
      if (have === null) found.push(`MISSING ${o.dir}/${SCRIPT_NAME}`);
      else if (have !== o.text) found.push(`DIFFERS ${o.dir}/${SCRIPT_NAME}: not what suites.json and fixtures.json give (a hand edit or a stale script); run npm run gen-rebuild-scripts`);
    }
    if (found.length > 0) {
      process.stderr.write(found.map((p) => `${p}\n`).join(''));
      process.stderr.write(`gen-rebuild-scripts --check: ${found.length} problem(s)\n`);
      return 1;
    }
    process.stdout.write(`gen-rebuild-scripts --check: ${outputs.length} script(s) clean under ${opts.root}\n`);
    return 0;
  }

  if (problems.length > 0) {
    process.stderr.write(problems.map((p) => `${p}\n`).join(''));
    process.stderr.write('gen-rebuild-scripts: problems found; nothing written\n');
    return 1;
  }
  let written = 0;
  for (const o of outputs) {
    if (readIfExists(o.file) === o.text) continue;
    fs.writeFileSync(o.file, o.text);
    written++;
  }
  process.stdout.write(
    `gen-rebuild-scripts: ${outputs.length} script(s), ${written} written, ${outputs.length - written} unchanged, under ${opts.root}\n`
  );
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { loadSuites, foreignDirectives, planSuite, render, build };
