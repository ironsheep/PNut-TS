#!/usr/bin/env node
/*
 * generate — write every generated test fixture from the one table,
 * scripts/fixtures/fixtures.json, and verify that the tree still matches it.
 *
 * Usage:
 *   node scripts/fixtures/generate.js [--out DIR] [--table FILE]
 *   node scripts/fixtures/generate.js --check [--out DIR] [--table FILE]
 *   node scripts/fixtures/generate.js --manifest [--table FILE]
 *
 *   (none)      write the fixtures under TEST/<suite>/, or under DIR/<suite>/ with --out.
 *               Nothing is deleted. A row that fails validation stops the run before
 *               any file is written. A row that adopts an existing file (see `file`)
 *               never writes it under TEST/; it is written only under --out, so the
 *               scratch copy can be byte-compared with the original.
 *   --check     read-only. Fails (exit 1) on: an invalid row (including one with no
 *               `covers`), a missing file, a file that differs from its row (drift or
 *               a hand edit), an orphan gen_* file, directory or GOLD (no row owns it),
 *               or a GOLD of the wrong kind for its row. Checks DIR instead of TEST
 *               when --out is given.
 *   --manifest  print the resolved rows as JSON (file name, GOLD names, the error
 *               line in the written file) for consumers that build on the table.
 *   --table     use another table file (default scripts/fixtures/fixtures.json).
 *
 * Exit codes: 0 clean; 1 a problem was reported; 2 bad usage.
 * This script never creates, edits or deletes a .GOLD file.
 *
 * ---------------------------------------------------------------------------
 * Table schema. fixtures.json is { "schema": 1, "doc": "...", "rows": [ row... ] }.
 * Unknown keys, in the file or in a row, are errors.
 *
 * row field      type            req.   meaning / consumer
 * -------------  --------------  -----  ----------------------------------------------
 * id             string          yes    [a-z0-9_]+, unique. Names gen_<id>.spin2.
 * suite          string          yes    a key of SUITES below; the written file lands
 *                                       in TEST/<suite>/. Consumers: the jest suite of
 *                                       that directory, rebuild-gold.ps1 generation.
 * kind           accept|reject   yes    accept: must compile, GOLDs per the suite
 *                                       (lst/obj/bin). reject: must fail, GOLD is
 *                                       <base>.errout.GOLD. Consumed by the Windows
 *                                       GOLD scripts (expected-fail list).
 * goldSource     pnut|pnut-ts    yes    who may produce the GOLD: pnut = Windows PNut;
 *                                       pnut-ts = a PNut-TS-only feature, its GOLD is
 *                                       kept and never regenerated on Windows.
 * flag           none|debug|     no     the compile flag class the source is written
 *                flash                  for (default none). Must equal the suite's own
 *                                       default flag class; there is no per-row flag.
 * source         string |        yes    the file body. A string is used as is; an array
 *                string[] |             of lines is joined with \n plus a final \n; an
 *                {template:[...]}       object holds a template (below).
 * params         object          no     named integers/strings for ${name} in templates.
 * expectLine     integer >= 1    reject 1-based line of `source` where the error is
 *                                       reported. Required for reject, forbidden for
 *                                       accept. --manifest adds expectFileLine, the
 *                                       line in the written file (it differs by the
 *                                       header line).
 * covers         string          yes    the src line or message the row exists for. A
 *                                       blank value fails --check.
 * file           string          no     adopt an existing hand-named file in the suite
 *                                       directory (name.spin2, not gen_*). The file has
 *                                       no header and must equal `source` byte for
 *                                       byte; it is checked, never renamed or rewritten
 *                                       under TEST/. GOLD names follow its name.
 * aux            object[]        no     extra files the main file refers to, written to
 *                                       TEST/<suite>/gen_<id>.d/<name> (a directory the
 *                                       jest globs do not enter). Each entry:
 *                                       { name, source, [count], [from] }; with `count`
 *                                       the entry repeats count times and ${i}
 *                                       (from..from+count-1, default from 0) and ${n}
 *                                       (= count) are available in name and template.
 * note           string          no     free text, not read by any tool.
 *
 * Template. {"template": [ part... ]}; the output is the parts concatenated.
 *   part = "text"                          literal text (newlines written as \n)
 *   part = {"repeat": N, "text": "...", "from": 0}
 *          N is an integer or "$param"; the text is emitted N times with ${i}
 *          running from `from` (default 0) and ${n} = N.
 * Placeholders inside template text: ${i}, ${n}, ${param}, ${i+3}, ${i-1};
 * ${i:4} zero-pads decimal to 4 digits; ${i:x4} / ${i:X4} zero-padded hex.
 * An unknown name is an error. Literal (string or array) sources are never expanded.
 *
 * Header. A written gen_* file starts with one '' comment line naming the row. When
 * the source's first line is a {Spin2_vNN} version directive the header follows that
 * line instead. An adopted file has no header.
 *
 * Suites. SUITES (exported) maps each supported suite directory to its default flag
 * class and the facts a consumer needs: the Windows PNut flag (pnutFlag, read from
 * the suite's defaultFlag in scripts/gold/suites.json, the one owner of it; the flag
 * class follows from it: -c none, -cd debug, -ci flash), the PNut-TS flags the jest
 * test passes, how the jest test discovers files, the GOLDs an accepted fixture
 * carries, and the kinds allowed. PREPROC-tests has no Windows run, so it carries
 * its own class and a null pnutFlag. Suites not listed (LANG-VER, V52A, LARGE,
 * INCLUDE, MAP, CACHE, FULL, SHORT)
 * pick the flag from the file name, use subdirectories, or are not a flat glob, so
 * rows cannot be placed there without a per-file override.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const TEST_DIR = path.join(REPO, 'TEST');
const DEFAULT_TABLE = path.join(__dirname, 'fixtures.json');

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_REPEAT = 1000000;
const ACCEPT_GOLDS = ['lst', 'obj', 'bin'];
const GOLD_EXTS = ['lst', 'obj', 'bin', 'pre', 'errout'];

// The Windows PNut rules, one owner: each suite's default PNut flag lives there,
// and the fixture flag class is read from it.
const WINDOWS_SUITES = JSON.parse(
  fs.readFileSync(path.join(REPO, 'scripts', 'gold', 'suites.json'), 'utf8')
).suites;
const FLAG_CLASS = { '-c': 'none', '-cd': 'debug', '-ci': 'flash' };

const FLAT_GLOB = 'glob TEST/<suite>/*.spin2';
const NON_DEBUG_GLOB =
  'glob TEST/<suite>/!(debug_|isp_|coverage_debug_)*.spin2; gen_* is in this group';

const SUITES = {
  'DAT-PASM-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'CON-tests': {
    tsFlags: '-v -l --regression element',
    discovery: FLAT_GLOB
  },
  'SPIN-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'ENCODING-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'EXT-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'VAR-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'LANG-FEAT-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'OBJ-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'LOADER-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'COV-tests': {
    tsFlags: '-v -l -O --regression element',
    discovery: NON_DEBUG_GLOB
  },
  'DBG-tests': {
    tsFlags: '-d -v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'DBG-CROP-tests': {
    tsFlags: '-d -v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'COL-tests': {
    tsFlags: '-d -v -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'WUMMI-tests': {
    tsFlags: '-v -d -l -O --regression element',
    discovery: FLAT_GLOB
  },
  'FLASH-tests': {
    tsFlags: '-v -l -O -F --regression element',
    discovery: FLAT_GLOB
  },
  // The only suite whose test compares an .errout.GOLD.
  'EXCEPT-tests': {
    tsFlags:
      '--regression element (no -d: only debug_/isp_/coverage_debug_ names get -d)',
    discovery: NON_DEBUG_GLOB,
    kinds: ['accept', 'reject']
  },
  // Compares .pre, .lst and .bin; its test passes -i and --regression preproc.
  // It has no Windows run (scripts/gold/suites.json "excluded"), so it carries
  // its flag class itself.
  'PREPROC-tests': {
    flag: 'none',
    pnutFlag: null,
    tsFlags: '-v -l -i --regression preproc',
    discovery:
      'glob TEST/<suite>/*.spin2 minus *__pre.spin2, *-pre.spin2, *.byHandPre.spin2',
    golds: ['pre', 'lst', 'bin']
  }
};
for (const [name, s] of Object.entries(SUITES)) {
  if (s.pnutFlag === undefined) {
    const windows = WINDOWS_SUITES[name];
    if (windows === undefined || !has(FLAG_CLASS, windows.defaultFlag))
      throw new Error(
        `scripts/gold/suites.json gives no usable defaultFlag for suite ${name}`
      );
    s.pnutFlag = windows.defaultFlag;
    s.flag = FLAG_CLASS[windows.defaultFlag];
  }
  if (s.kinds === undefined) s.kinds = ['accept'];
  if (s.golds === undefined) s.golds = ACCEPT_GOLDS;
}

const ROW_KEYS = [
  'id',
  'suite',
  'kind',
  'goldSource',
  'flag',
  'source',
  'params',
  'expectLine',
  'covers',
  'file',
  'aux',
  'note'
];
const REQUIRED_KEYS = ['id', 'suite', 'kind', 'goldSource', 'source', 'covers'];
const AUX_KEYS = ['name', 'source', 'count', 'from'];
const TABLE_KEYS = ['schema', 'doc', 'rows'];

class RowError extends Error {}

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function oneLine(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function expandText(text, vars, where) {
  return text.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)(?:([+-])(\d+))?(?::([xX]?)(\d+))?\}/g,
    (m, name, sign, offset, hex, width) => {
      if (!has(vars, name))
        throw new RowError(`${where}: unknown placeholder ${m}`);
      let v = vars[name];
      if (sign !== undefined) {
        if (typeof v !== 'number')
          throw new RowError(`${where}: ${m} does an offset on a non-number`);
        v = sign === '+' ? v + Number(offset) : v - Number(offset);
      }
      if (width === undefined) return String(v);
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0)
        throw new RowError(
          `${where}: ${m} formats a value that is not a non-negative integer`
        );
      let s = v.toString(hex === '' ? 10 : 16);
      if (hex === 'X') s = s.toUpperCase();
      return s.padStart(Number(width), '0');
    }
  );
}

function resolveCount(spec, params, where) {
  let v = spec;
  if (typeof spec === 'string' && spec.startsWith('$')) {
    const name = spec.slice(1);
    if (!has(params, name))
      throw new RowError(`${where}: repeat refers to unknown param ${spec}`);
    v = params[name];
  }
  if (!Number.isInteger(v) || v < 0 || v > MAX_REPEAT)
    throw new RowError(
      `${where}: repeat count ${JSON.stringify(spec)} is not an integer in 0..${MAX_REPEAT}`
    );
  return v;
}

function expandTemplate(parts, params, where) {
  if (!Array.isArray(parts))
    throw new RowError(`${where}: template must be an array of parts`);
  const out = [];
  let bytes = 0;
  const add = (s) => {
    bytes += Buffer.byteLength(s, 'utf8');
    if (bytes > MAX_BODY_BYTES)
      throw new RowError(
        `${where}: template output exceeds ${MAX_BODY_BYTES} bytes`
      );
    out.push(s);
  };
  parts.forEach((part, k) => {
    const w = `${where} part ${k}`;
    if (typeof part === 'string') {
      add(expandText(part, params, w));
    } else if (isPlainObject(part)) {
      for (const key of Object.keys(part)) {
        if (!['repeat', 'text', 'from'].includes(key))
          throw new RowError(`${w}: unknown key "${key}"`);
      }
      if (!has(part, 'repeat') || typeof part.text !== 'string')
        throw new RowError(
          `${w}: a repeat part needs "repeat" and a string "text"`
        );
      const from = has(part, 'from') ? part.from : 0;
      if (!Number.isInteger(from))
        throw new RowError(`${w}: "from" must be an integer`);
      const count = resolveCount(part.repeat, params, w);
      for (let j = 0; j < count; j++)
        add(expandText(part.text, { ...params, i: from + j, n: count }, w));
    } else {
      throw new RowError(`${w}: a part is a string or a repeat object`);
    }
  });
  return out.join('');
}

function expandSource(source, params, where) {
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) {
    if (!source.every((l) => typeof l === 'string'))
      throw new RowError(`${where}: an array source holds only strings`);
    return source.length === 0 ? '' : source.join('\n') + '\n';
  }
  if (isPlainObject(source)) {
    const keys = Object.keys(source);
    if (keys.length !== 1 || keys[0] !== 'template')
      throw new RowError(
        `${where}: an object source has exactly one key, "template"`
      );
    return expandTemplate(source.template, params, where);
  }
  throw new RowError(
    `${where}: source must be a string, an array of lines, or {template}`
  );
}

function countLines(body) {
  if (body.length === 0) return 0;
  return body.split('\n').length - (body.endsWith('\n') ? 1 : 0);
}

function withHeader(body, row) {
  const header = `'' gen_${row.id}: generated from scripts/fixtures/fixtures.json row "${row.id}"; edit the row, not this file. Covers: ${oneLine(row.covers)}\n`;
  const first = /^[^\n]*\n/.exec(body);
  if (first !== null && /^\s*\{Spin2_v\d+\}/.test(first[0])) {
    return {
      text: first[0] + header + body.slice(first[0].length),
      headerAfterLine: 1
    };
  }
  return { text: header + body, headerAfterLine: 0 };
}

function safeFileName(name) {
  return (
    typeof name === 'string' &&
    /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(name) &&
    !name.includes('..') &&
    !/\.GOLD$/i.test(name)
  );
}

/*
 * Validate one row and resolve it to the files it owns. Throws RowError.
 * Returns { row, base, file, adopted, outputs: [{rel, text}], expectFileLine, golds }.
 */
function resolveRow(row, index) {
  const where = `row ${index}${isPlainObject(row) && typeof row.id === 'string' ? ` (${row.id})` : ''}`;
  if (!isPlainObject(row)) throw new RowError(`${where}: a row is an object`);
  for (const key of Object.keys(row)) {
    if (!ROW_KEYS.includes(key))
      throw new RowError(`${where}: unknown field "${key}"`);
  }
  for (const key of REQUIRED_KEYS) {
    if (!has(row, key)) throw new RowError(`${where}: missing field "${key}"`);
  }
  if (typeof row.id !== 'string' || !/^[a-z0-9][a-z0-9_]*$/.test(row.id))
    throw new RowError(`${where}: id must match [a-z0-9][a-z0-9_]*`);
  if (typeof row.covers !== 'string' || oneLine(row.covers) === '')
    throw new RowError(
      `${where}: covers is empty; say which src line or message the row exists for`
    );
  const suite = SUITES[row.suite];
  if (suite === undefined)
    throw new RowError(
      `${where}: suite "${row.suite}" is not a supported suite (${Object.keys(SUITES).join(', ')})`
    );
  if (row.kind !== 'accept' && row.kind !== 'reject')
    throw new RowError(`${where}: kind must be accept or reject`);
  if (!suite.kinds.includes(row.kind))
    throw new RowError(
      `${where}: suite ${row.suite} does not take ${row.kind} rows (its test compares no ${row.kind === 'reject' ? '.errout' : 'listing'} GOLD)`
    );
  if (row.goldSource !== 'pnut' && row.goldSource !== 'pnut-ts')
    throw new RowError(`${where}: goldSource must be pnut or pnut-ts`);
  const flag = has(row, 'flag') ? row.flag : 'none';
  if (!['none', 'debug', 'flash'].includes(flag))
    throw new RowError(`${where}: flag must be none, debug or flash`);
  if (flag !== suite.flag) {
    throw new RowError(
      `${where}: flag "${flag}" does not fit suite ${row.suite}, whose default flag class is "${suite.flag}"; no per-row flag override exists`
    );
  }
  const params = has(row, 'params') ? row.params : {};
  if (!isPlainObject(params))
    throw new RowError(`${where}: params is an object`);
  for (const [k, v] of Object.entries(params)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || k === 'i' || k === 'n')
      throw new RowError(`${where}: param name "${k}" is not allowed`);
    if (typeof v !== 'number' && typeof v !== 'string')
      throw new RowError(`${where}: param "${k}" is a number or a string`);
  }
  const body = expandSource(row.source, params, where);
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES)
    throw new RowError(`${where}: source exceeds ${MAX_BODY_BYTES} bytes`);
  const bodyLines = countLines(body);

  if (row.kind === 'reject') {
    if (
      !Number.isInteger(row.expectLine) ||
      row.expectLine < 1 ||
      row.expectLine > bodyLines
    ) {
      throw new RowError(
        `${where}: a reject row needs expectLine, an integer 1..${bodyLines} (a line of source)`
      );
    }
  } else if (has(row, 'expectLine')) {
    throw new RowError(`${where}: expectLine belongs to reject rows only`);
  }

  let rel;
  let text;
  let headerAfterLine = 0;
  const adopted = has(row, 'file');
  if (adopted) {
    if (
      typeof row.file !== 'string' ||
      !/^[A-Za-z0-9_][A-Za-z0-9_.-]*\.spin2$/.test(row.file) ||
      row.file.includes('..') ||
      row.file.startsWith('gen_')
    ) {
      throw new RowError(
        `${where}: file must be a plain name.spin2 that does not start with gen_`
      );
    }
    rel = row.file;
    text = body;
  } else {
    rel = `gen_${row.id}.spin2`;
    const h = withHeader(body, row);
    text = h.text;
    headerAfterLine = h.headerAfterLine;
  }
  const base = rel.replace(/\.spin2$/, '');
  const outputs = [{ rel, text, adopted }];

  if (has(row, 'aux')) {
    if (adopted)
      throw new RowError(`${where}: an adopting row cannot own aux files`);
    if (!Array.isArray(row.aux))
      throw new RowError(`${where}: aux is an array`);
    row.aux.forEach((entry, k) => {
      const w = `${where} aux ${k}`;
      if (!isPlainObject(entry))
        throw new RowError(`${w}: an aux entry is an object`);
      for (const key of Object.keys(entry)) {
        if (!AUX_KEYS.includes(key))
          throw new RowError(`${w}: unknown field "${key}"`);
      }
      if (typeof entry.name !== 'string' || !has(entry, 'source'))
        throw new RowError(`${w}: needs name and source`);
      const repeated = has(entry, 'count');
      const count = repeated ? resolveCount(entry.count, params, w) : 1;
      const from = has(entry, 'from') ? entry.from : 0;
      if (!Number.isInteger(from))
        throw new RowError(`${w}: "from" must be an integer`);
      for (let j = 0; j < count; j++) {
        const vars = repeated ? { ...params, i: from + j, n: count } : params;
        const name = repeated ? expandText(entry.name, vars, w) : entry.name;
        if (!safeFileName(name))
          throw new RowError(
            `${w}: "${name}" is not a safe file name (no path, no .GOLD)`
          );
        const auxText = expandSource(entry.source, vars, w);
        outputs.push({
          rel: `gen_${row.id}.d/${name}`,
          text: auxText,
          adopted: false
        });
      }
    });
  }

  let expectFileLine = null;
  if (row.kind === 'reject') {
    if (adopted) expectFileLine = row.expectLine;
    else
      expectFileLine =
        row.expectLine + (row.expectLine > headerAfterLine ? 1 : 0);
  }
  return {
    row,
    base,
    file: rel,
    adopted,
    outputs,
    expectFileLine,
    golds: row.kind === 'reject' ? ['errout'] : suite.golds
  };
}

function loadTable(tableFile) {
  const problems = [];
  let table;
  try {
    table = JSON.parse(fs.readFileSync(tableFile, 'utf8'));
  } catch (e) {
    return { rows: [], problems: [`table ${tableFile}: ${e.message}`] };
  }
  if (!isPlainObject(table))
    return {
      rows: [],
      problems: [`table ${tableFile}: the top level is an object`]
    };
  for (const key of Object.keys(table)) {
    if (!TABLE_KEYS.includes(key)) problems.push(`table: unknown key "${key}"`);
  }
  if (table.schema !== 1) problems.push(`table: schema must be 1`);
  if (!Array.isArray(table.rows))
    return {
      rows: [],
      problems: [...problems, 'table: rows must be an array']
    };

  const resolved = [];
  const ids = new Set();
  const paths = new Set();
  table.rows.forEach((row, index) => {
    try {
      const r = resolveRow(row, index);
      if (ids.has(r.row.id))
        throw new RowError(`row ${index} (${r.row.id}): duplicate id`);
      ids.add(r.row.id);
      for (const out of r.outputs) {
        const key = `${r.row.suite}/${out.rel}`.toLowerCase();
        if (paths.has(key))
          throw new RowError(
            `row ${index} (${r.row.id}): ${r.row.suite}/${out.rel} is already owned by another row`
          );
        paths.add(key);
      }
      resolved.push(r);
    } catch (e) {
      if (e instanceof RowError) problems.push(e.message);
      else throw e;
    }
  });
  return { rows: resolved, problems };
}

function manifest(rows) {
  return rows.map((r) => ({
    id: r.row.id,
    suite: r.row.suite,
    kind: r.row.kind,
    goldSource: r.row.goldSource,
    flag: has(r.row, 'flag') ? r.row.flag : 'none',
    file: r.file,
    base: r.base,
    adopted: r.adopted,
    golds: r.golds.map((g) => `${r.base}.${g}.GOLD`),
    expectLine: has(r.row, 'expectLine') ? r.row.expectLine : null,
    expectFileLine: r.expectFileLine,
    covers: oneLine(r.row.covers),
    aux: r.outputs.filter((o) => o.rel.includes('/')).map((o) => o.rel)
  }));
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return [];
    throw e;
  }
}

function checkTree(rows, root) {
  const problems = [];
  const ownedFiles = new Set();
  const ownedBases = new Set();
  for (const r of rows) {
    ownedBases.add(`${r.row.suite}/${r.base}`);
    for (const out of r.outputs) {
      ownedFiles.add(`${r.row.suite}/${out.rel}`);
      const have = readIfExists(path.join(root, r.row.suite, out.rel));
      const label = out.adopted ? 'adopted file' : 'file';
      if (have === null)
        problems.push(
          `MISSING ${r.row.suite}/${out.rel}: ${label} of row ${r.row.id} does not exist`
        );
      else if (!have.equals(Buffer.from(out.text, 'utf8'))) {
        problems.push(
          `DIFFERS ${r.row.suite}/${out.rel}: ${label} does not match row ${r.row.id} (drift or a hand edit)`
        );
      }
    }
    const wrong = r.row.kind === 'reject' ? ['lst', 'obj', 'bin'] : ['errout'];
    for (const ext of wrong) {
      if (
        readIfExists(path.join(root, r.row.suite, `${r.base}.${ext}.GOLD`)) !==
        null
      ) {
        problems.push(
          `KIND ${r.row.suite}/${r.base}.${ext}.GOLD: row ${r.row.id} is ${r.row.kind}, which carries no .${ext} GOLD`
        );
      }
    }
  }
  for (const suiteName of Object.keys(SUITES)) {
    for (const entry of listDir(path.join(root, suiteName))) {
      const rel = `${suiteName}/${entry.name}`;
      if (
        entry.isFile() &&
        /^gen_.*\.spin2$/.test(entry.name) &&
        !/(__pre|-pre)\.spin2$/.test(entry.name)
      ) {
        if (!ownedFiles.has(rel))
          problems.push(`ORPHAN ${rel}: no row owns this gen_ file`);
      } else if (entry.isDirectory() && /^gen_.*\.d$/.test(entry.name)) {
        for (const child of listDir(path.join(root, suiteName, entry.name))) {
          if (!ownedFiles.has(`${rel}/${child.name}`))
            problems.push(`ORPHAN ${rel}/${child.name}: no row owns this file`);
        }
      } else if (entry.isFile()) {
        const g = new RegExp(
          `^(gen_.+)\\.(${GOLD_EXTS.join('|')})\\.GOLD$`
        ).exec(entry.name);
        if (g !== null && !ownedBases.has(`${suiteName}/${g[1]}`))
          problems.push(`ORPHAN ${rel}: no row owns this GOLD`);
      }
    }
  }
  return problems;
}

function writeTree(rows, root) {
  const verifyOnly = path.resolve(root) === path.resolve(TEST_DIR);
  const problems = [];
  let written = 0;
  let unchanged = 0;
  for (const r of rows) {
    for (const out of r.outputs) {
      const target = path.join(root, r.row.suite, out.rel);
      const buf = Buffer.from(out.text, 'utf8');
      const have = readIfExists(target);
      if (have !== null && have.equals(buf)) {
        unchanged++;
        continue;
      }
      if (out.adopted && verifyOnly) {
        problems.push(
          `ADOPTED ${r.row.suite}/${out.rel}: ${have === null ? 'does not exist' : 'differs from row ' + r.row.id}; an adopted file is never rewritten, fix the row or the file`
        );
        continue;
      }
      if (/\.GOLD$/i.test(target))
        throw new Error(`refusing to write a GOLD: ${target}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      written++;
    }
  }
  return { problems, written, unchanged };
}

function parseArgs(argv) {
  const opts = {
    check: false,
    manifest: false,
    out: null,
    table: DEFAULT_TABLE
  };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--check') opts.check = true;
    else if (a === '--manifest') opts.manifest = true;
    else if (a === '--out' || a === '--table') {
      if (k + 1 >= argv.length) throw new Error(`${a} needs a value`);
      opts[a.slice(2)] = path.resolve(argv[++k]);
    } else throw new Error(`unknown argument ${a}`);
  }
  if (opts.check && opts.manifest)
    throw new Error('--check and --manifest are exclusive');
  return opts;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write(
      `generate: ${e.message}\nusage: generate.js [--check | --manifest] [--out DIR] [--table FILE]\n`
    );
    return 2;
  }
  const { rows, problems } = loadTable(opts.table);
  if (opts.manifest) {
    if (problems.length > 0) {
      process.stderr.write(problems.map((p) => `INVALID ${p}\n`).join(''));
      return 1;
    }
    process.stdout.write(JSON.stringify(manifest(rows), null, 2) + '\n');
    return 0;
  }
  const root = opts.out !== null ? opts.out : TEST_DIR;
  if (opts.check) {
    const found = [
      ...problems.map((p) => `INVALID ${p}`),
      ...checkTree(rows, root)
    ];
    if (found.length > 0) {
      process.stderr.write(found.map((p) => `${p}\n`).join(''));
      process.stderr.write(`generate --check: ${found.length} problem(s)\n`);
      return 1;
    }
    process.stdout.write(
      `generate --check: ${rows.length} row(s) clean under ${root}\n`
    );
    return 0;
  }
  if (problems.length > 0) {
    process.stderr.write(problems.map((p) => `INVALID ${p}\n`).join(''));
    process.stderr.write('generate: invalid table; nothing written\n');
    return 1;
  }
  const result = writeTree(rows, root);
  if (result.problems.length > 0)
    process.stderr.write(result.problems.map((p) => `${p}\n`).join(''));
  const orphans = checkTree(rows, root).filter((p) => p.startsWith('ORPHAN'));
  if (orphans.length > 0)
    process.stderr.write(orphans.map((p) => `${p} (left in place)\n`).join(''));
  process.stdout.write(
    `generate: ${rows.length} row(s), ${result.written} written, ${result.unchanged} unchanged, under ${root}\n`
  );
  return result.problems.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { SUITES, loadTable, manifest, checkTree, resolveRow };
