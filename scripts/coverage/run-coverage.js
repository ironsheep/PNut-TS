#!/usr/bin/env node
/*
 * run-coverage — measure which compiler lines the gated regression suite executes.
 *
 * Two evidence limbs, unioned per dist line:
 *   V8        Every gated root runs under NODE_V8_COVERAGE. Each compiler process
 *             the tests spawn writes a dump; the dump's block ranges are painted
 *             onto a per-file bitmap indexed in UTF-16 code units (JS string
 *             indices, which is what V8 reports). A dump written by the Jest
 *             process itself is skipped and counted: Jest runs transformed copies
 *             of dist/*.js whose offsets do not match the files on disk.
 *   istanbul  A root whose tests load compiler modules into the Jest process
 *             (detected from the require() calls in its dist/tests files) also
 *             collects istanbul coverage (collectCoverage, json reporter, set in
 *             the generated config rather than on argv). A statement credits
 *             only its first line: a compound statement spans its children,
 *             which carry their own counts.
 *
 * Dist lines map to src lines through the tsc source maps (tsconfig sourceMap).
 * Unexecuted src lines are classified against a local review list,
 * PROCESS/coverage/classified.json, keyed {file, function, normalized text}.
 *
 * Usage:
 *   node scripts/coverage/run-coverage.js [options]
 *     --roots A,B        run only these gated roots (partial; requires --out)
 *     --out DIR          where cov-state.json and the report go (default PROCESS/coverage)
 *     --work DIR         parent of the scratch directory for dumps (default: OS temp dir)
 *     --jest-arg ARG     extra argument for every Jest run (repeatable)
 *     --accumulate       fold this run into the state already at --out (same build;
 *                        a root may appear once), so the gated roots can be measured
 *                        over several sequential invocations
 *     --report-only      do not run; report from DIR/cov-state.json
 *     --state FILE       with --report-only: report from FILE instead (copied into DIR)
 *     --check            exit 0 clean, 1 unlisted unexecuted line, 2 not evaluable
 *     --classified FILE  review list (default PROCESS/coverage/classified.json)
 *     --emit-unlisted FILE
 *                        write the unlisted unexecuted lines as review-list entries
 *                        (class "unreviewed", which classifies nothing until edited)
 *     --merge-reviewed FILE
 *                        fold reviewed entries into the review list and drop its stale
 *                        entries (repeatable; needs a complete state). An entry still
 *                        "unreviewed" or for a line now executed is not added; an entry
 *                        with no reason is a hard error
 *     --trace REGEX     print the verdict of every src code line whose text matches
 *     --file SPIN2 [compiler flags...]
 *                        single compile: report the throw sites and lines it executes
 *                        (must be the last option; everything after SPIN2 goes to the compiler)
 *     --show SUBSTR      with --file: list executed line ranges of src files matching SUBSTR
 *
 * Exit codes: 0 done / clean; 1 an unexecuted line missing from the list (--check);
 *             2 not evaluable (--check without the list, or on a partial scope);
 *             3 hard error (missing state, a root that produced no evidence,
 *               a failing test, a changed build, an unreadable dump).
 */
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileURLToPath } = require('url');

const REPO = path.resolve(__dirname, '..', '..');
const DIST = path.join(REPO, 'dist');
const GATE_CONFIG = path.join(REPO, 'jest-config', 'jest-coverage-config.json');
const BASE_CONFIG = path.join(REPO, 'old.jestconfig.json');
const DEFAULT_OUT = path.join(REPO, 'PROCESS', 'coverage');
const STATE_NAME = 'cov-state.json';
const REPORT_NAME = 'Regression-Coverage-Baseline.md';
const STATE_VERSION = 1;
const TARGET_DIRS = ['classes', 'utils'];

const EXIT_OK = 0;
const EXIT_UNLISTED = 1;
const EXIT_NOT_EVALUABLE = 2;
const EXIT_HARD = 3;

class HardError extends Error {}

// A dump whose script list includes Jest's own modules was written by a Jest process.
const JEST_PROCESS_URL =
  /"url":"file:\/\/[^"]*\/node_modules\/(?:jest|@jest|babel-jest|ts-jest|jest-[^/"]+)\//;

// ---------------------------------------------------------------------------
// line model

// A dist line that counts as code. Identical to the measurement this tool replaced,
// so its dist totals stay comparable.
function isCode(text) {
  const s = text.trim();
  if (!s) return false;
  if (/^(\/\/|\/\*|\*)/.test(s)) return false;
  if (
    /^[})\]];?,?\)?;?$/.test(s) ||
    /^}\s*(else\s*{)?$/.test(s) ||
    s === '});' ||
    s === '};'
  )
    return false;
  if (/^(case .*:|default:)$/.test(s)) return false;
  return true;
}

// A src line that only continues a statement begun on another line: `catch (…) {`,
// `finally {`, or the `} while (…);` of a do/while. istanbul has no statement that
// starts on it, so only V8 could credit it; the clause body (or the `do {` line)
// carries the verdict instead. V8 opens a catch range at the `catch` keyword,
// runs `finally` within the try's range, and evaluates `while` in the loop's.
function isClauseLine(text) {
  const code = text.replace(/\s\/\/.*$/, '').trim();
  return /^(}\s*)?(catch\b[^{]*{|finally\s*{)$|^}\s*while\s*\(.*\);?$/.test(
    code
  );
}

function isSrcCode(text) {
  return isCode(text) && !isClauseLine(text);
}

// The column whose V8 count decides a line: the first character after any leading
// closers and `else` keywords. Those belong to the enclosing range, which ran even
// when the branch that follows them did not.
function creditColumn(text) {
  let j = 0;
  for (;;) {
    while (j < text.length && /[\s})\],;]/.test(text[j])) j++;
    if (text.startsWith('else', j) && !/[\w$]/.test(text[j + 4] || '')) {
      j += 4;
      continue;
    }
    break;
  }
  if (j >= text.length) j = Math.max(0, text.search(/\S/));
  return j;
}

// A line that raises a new error, ignoring any trailing line comment.
function isThrowSite(text) {
  return /\bthrow\s+new\s+[\w$.]*Error\b/.test(text.replace(/\s\/\/.*$/, ''));
}

function normalizeText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// files

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function rel(abs) {
  return path.relative(REPO, abs).split(path.sep).join('/');
}

// The compiler's dist files: dist/classes/*.js, dist/utils/*.js, dist/pnut-ts.js.
// A dist file whose src/*.ts no longer exists is an orphan of an earlier build
// (tsc never deletes output); it is listed in ORPHANS and not measured.
const ORPHANS = [];
function targetFiles() {
  const out = [];
  ORPHANS.length = 0;
  for (const d of TARGET_DIRS) {
    const dir = path.join(DIST, d);
    if (!fs.existsSync(dir))
      throw new HardError(`${rel(dir)} is missing: run npm run build`);
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith('.js')) continue;
      const abs = path.join(dir, name);
      if (
        !fs.existsSync(path.join(REPO, 'src', d, name.replace(/\.js$/, '.ts')))
      )
        ORPHANS.push(rel(abs));
      else out.push(abs);
    }
  }
  const main = path.join(DIST, 'pnut-ts.js');
  if (!fs.existsSync(main))
    throw new HardError('dist/pnut-ts.js is missing: run npm run build');
  out.push(main);
  return out;
}

const textCache = new Map();
function readText(abs) {
  if (!textCache.has(abs)) textCache.set(abs, fs.readFileSync(abs, 'utf8'));
  return textCache.get(abs);
}

// Content hashes of every dist file, its map and the src files the map names.
function buildSignature(targets) {
  const sig = {};
  for (const abs of targets) {
    sig[rel(abs)] = sha1(fs.readFileSync(abs));
    const mapPath = `${abs}.map`;
    if (!fs.existsSync(mapPath))
      throw new HardError(
        `${rel(mapPath)} is missing: tsconfig.json needs "sourceMap": true, then npm run build`
      );
    const mapText = fs.readFileSync(mapPath, 'utf8');
    sig[rel(mapPath)] = sha1(mapText);
    for (const src of mapSources(abs, JSON.parse(mapText)))
      sig[rel(src)] = sha1(fs.readFileSync(src));
  }
  return sig;
}

function compareSignature(recorded, current, when) {
  const changed = [];
  for (const k of new Set([...Object.keys(recorded), ...Object.keys(current)]))
    if (recorded[k] !== current[k]) changed.push(k);
  if (changed.length > 0) {
    throw new HardError(
      `${when}: ${changed.length} file(s) differ from the recorded state (${changed.slice(0, 5).join(', ')}${changed.length > 5 ? ', …' : ''}); re-run the measurement`
    );
  }
}

// ---------------------------------------------------------------------------
// source maps

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_VALUE = new Map([...B64].map((c, i) => [c, i]));

function decodeVlq(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const c of segment) {
    const digit = B64_VALUE.get(c);
    if (digit === undefined)
      throw new HardError(`bad source-map character '${c}'`);
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      values.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

function mapSources(distAbs, map) {
  const base = path.resolve(path.dirname(distAbs), map.sourceRoot || '');
  return map.sources.map((s) => path.resolve(base, s));
}

// Per dist line: segments [generatedColumn, sourceIndex, sourceLine] (0-based).
function loadMap(distAbs) {
  const map = JSON.parse(fs.readFileSync(`${distAbs}.map`, 'utf8'));
  const lines = [];
  let srcIdx = 0;
  let srcLine = 0;
  for (const lineText of map.mappings.split(';')) {
    const segs = [];
    let genCol = 0;
    if (lineText) {
      for (const seg of lineText.split(',')) {
        const v = decodeVlq(seg);
        genCol += v[0];
        if (v.length >= 4) {
          srcIdx += v[1];
          srcLine += v[2];
          segs.push([genCol, srcIdx, srcLine]);
        }
      }
    }
    lines.push(segs);
  }
  return { sources: mapSources(distAbs, map), lines };
}

function mapPosition(map, line, col) {
  const segs = map.lines[line];
  if (!segs || segs.length === 0) return null;
  let pick = segs[0];
  for (const s of segs) if (s[0] <= col) pick = s;
  return { src: map.sources[pick[1]], line: pick[2] };
}

// ---------------------------------------------------------------------------
// function names (src)

function functionNames(srcAbs, text) {
  const ts = require(path.join(REPO, 'node_modules', 'typescript'));
  const sf = ts.createSourceFile(srcAbs, text, ts.ScriptTarget.Latest, true);
  const names = new Array(sf.getLineStarts().length).fill('<module>');
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line;
  const nameOf = (node) => (node.name ? node.name.getText(sf) : null);
  const ownName = (node) => {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node))
      return nameOf(node) || '<anonymous>';
    if (ts.isGetAccessorDeclaration(node)) return `get ${nameOf(node)}`;
    if (ts.isSetAccessorDeclaration(node)) return `set ${nameOf(node)}`;
    if (ts.isConstructorDeclaration(node)) return 'constructor';
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      if (node.name) return nameOf(node);
      const p = node.parent;
      if (
        p &&
        (ts.isVariableDeclaration(p) ||
          ts.isPropertyDeclaration(p) ||
          ts.isPropertyAssignment(p)) &&
        p.name
      )
        return p.name.getText(sf);
      return '<anonymous>';
    }
    if (ts.isClassLike(node)) return nameOf(node) || '<class>';
    return null;
  };
  const visit = (node, chain) => {
    let next = chain;
    const own = ownName(node);
    if (own !== null) {
      next = chain ? `${chain}.${own}` : own;
      const a = lineOf(node.getStart(sf));
      const b = lineOf(node.end);
      for (let l = a; l <= b; l++) names[l] = next;
    }
    ts.forEachChild(node, (c) => visit(c, next));
  };
  visit(sf, '');
  return names;
}

// ---------------------------------------------------------------------------
// state

function newState(signature, roots) {
  return {
    version: STATE_VERSION,
    created: new Date().toISOString(),
    head: gitHead(),
    complete: false,
    rootsConfigured: roots.map((r) => r.name),
    rootsRun: [],
    orphans: [...ORPHANS],
    signature,
    v8: {},
    istanbul: {}
  };
}

function loadState(outDir, name = STATE_NAME) {
  const file = path.join(outDir, name);
  if (!fs.existsSync(file))
    throw new HardError(
      `no coverage state at ${file}: run the measurement first (a missing state is never read as zero coverage)`
    );
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (state.version !== STATE_VERSION)
    throw new HardError(
      `${file} is state version ${state.version}, expected ${STATE_VERSION}`
    );
  if (
    Object.keys(state.v8).length === 0 &&
    Object.keys(state.istanbul).length === 0
  )
    throw new HardError(`${file} holds no evidence at all`);
  return state;
}

function saveState(outDir, state, bitmaps) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [k, bits] of bitmaps)
    state.v8[k] = {
      len: bits.len,
      bits: Buffer.from(bits.bits).toString('base64'),
      runs: bits.runs
    };
  fs.writeFileSync(path.join(outDir, STATE_NAME), JSON.stringify(state));
}

function gitHead() {
  try {
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: REPO,
      encoding: 'utf8'
    }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO,
      encoding: 'utf8'
    }).trim();
    return dirty ? `${head} (+${dirty.split('\n').length} uncommitted)` : head;
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// V8 fold

function newBitmap(len) {
  return { len, bits: new Uint8Array((len >> 3) + 1), runs: 0 };
}

// Paint one script's block ranges and OR the executed characters into the bitmap.
// Ranges nest; sorted outer-to-inner, an inner range overrides its parent.
function paintScript(bitmap, functions, scratch) {
  const ranges = [];
  for (const fn of functions) for (const r of fn.ranges) ranges.push(r);
  ranges.sort(
    (a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset
  );
  scratch.fill(0, 0, bitmap.len);
  for (const r of ranges)
    scratch.fill(
      r.count > 0 ? 1 : 0,
      r.startOffset,
      Math.min(r.endOffset, bitmap.len)
    );
  for (let i = 0; i < bitmap.len; i++)
    if (scratch[i]) bitmap.bits[i >> 3] |= 1 << (i & 7);
  bitmap.runs++;
}

// Folds and deletes every dump in dumpDir. tally counts folded / skipped / other.
function foldDumps(dumpDir, targetSet, bitmaps, tally) {
  if (!fs.existsSync(dumpDir)) return;
  let scratch = new Uint8Array(0);
  for (const name of fs.readdirSync(dumpDir).sort()) {
    const full = path.join(dumpDir, name);
    if (!name.endsWith('.json')) {
      fs.rmSync(full, { recursive: true, force: true });
      continue;
    }
    const raw = fs.readFileSync(full, 'utf8');
    if (JEST_PROCESS_URL.test(raw)) {
      tally.jestSkipped++;
      fs.unlinkSync(full);
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      tally.unreadable++;
      fs.unlinkSync(full);
      continue;
    }
    let used = false;
    for (const script of data.result || []) {
      if (!script.url.startsWith('file://')) continue;
      const abs = fileURLToPath(script.url);
      if (!targetSet.has(abs)) continue;
      const len = readText(abs).length;
      // the script-level range spans the whole source: its end is the file's length
      // in the unit V8 reports, so it proves both the unit and the file version
      const end = Math.max(
        ...script.functions.map((f) => f.ranges[0].endOffset)
      );
      if (end !== len)
        throw new HardError(
          `${rel(abs)}: V8 script length ${end} != ${len} UTF-16 code units on disk (file changed, or offsets are not UTF-16)`
        );
      const k = rel(abs);
      if (!bitmaps.has(k)) bitmaps.set(k, newBitmap(len));
      if (scratch.length < len) scratch = new Uint8Array(len);
      paintScript(bitmaps.get(k), script.functions, scratch);
      used = true;
    }
    if (used) tally.folded++;
    else tally.other++;
    fs.unlinkSync(full);
  }
}

// ---------------------------------------------------------------------------
// istanbul fold

function foldIstanbul(file, targetSet, state) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let files = 0;
  for (const [key, fc] of Object.entries(data)) {
    const abs = path.resolve(key);
    if (!targetSet.has(abs)) {
      if (/\.ts$/.test(key))
        throw new HardError(
          `istanbul reported ${key}: coverage was remapped to sources; dist offsets are required`
        );
      continue;
    }
    const k = rel(abs);
    const entry = state.istanbul[k] || { stmt: [], fn: [] };
    const stmt = new Set(entry.stmt);
    const fn = new Set(entry.fn);
    for (const [id, n] of Object.entries(fc.s))
      if (n > 0) stmt.add(fc.statementMap[id].start.line);
    for (const [id, n] of Object.entries(fc.f))
      if (n > 0) fn.add((fc.fnMap[id].decl || fc.fnMap[id].loc).start.line);
    state.istanbul[k] = {
      stmt: [...stmt].sort((a, b) => a - b),
      fn: [...fn].sort((a, b) => a - b)
    };
    if (stmt.size > 0) files++;
  }
  return files;
}

// ---------------------------------------------------------------------------
// roots

function gatedRoots() {
  const cfg = JSON.parse(fs.readFileSync(GATE_CONFIG, 'utf8'));
  return cfg.roots.map((r) => {
    const relDir = r.replace('<rootDir>/', '').replace(/\/$/, '');
    return { name: path.basename(relDir), dir: path.join(REPO, relDir) };
  });
}

function walkJs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJs(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// The dist/tests files of a root that require() a compiler module into the Jest process.
function inProcessEvidence(root) {
  const hits = [];
  for (const f of walkJs(root.dir)) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/require\("(\.[^"]+)"\)/g)) {
      const target = path.resolve(path.dirname(f), m[1]);
      const r = path.relative(DIST, target).split(path.sep).join('/');
      if (
        /^(classes|utils)\//.test(r) ||
        r === 'pnut-ts' ||
        r === 'pnut-ts.js'
      ) {
        hits.push(`${path.basename(f)}→${r}`);
      }
    }
  }
  return [...new Set(hits)];
}

function runRoot(root, inProcess, work, jestArgs) {
  const dumpDir = path.join(work, `v8-${root.name}`);
  const istDir = path.join(work, `ist-${root.name}`);
  const cfgPath = path.join(work, `jest-${root.name}.json`);
  const resultPath = path.join(work, `result-${root.name}.json`);
  const logPath = path.join(work, `jest-${root.name}.log`);
  fs.mkdirSync(dumpDir, { recursive: true });
  const base = JSON.parse(fs.readFileSync(BASE_CONFIG, 'utf8'));
  const gate = JSON.parse(fs.readFileSync(GATE_CONFIG, 'utf8'));
  const cfg = {
    ...base,
    ...gate,
    rootDir: REPO,
    roots: [root.dir],
    displayName: root.name,
    // istanbul is requested here, not by --coverage on the command line: the compiler
    // reads the Jest process's argv (src/pnut-ts.ts runCompile) and would take its
    // coverage-run path instead of the gated suite's
    collectCoverage: inProcess,
    coverageReporters: ['json'],
    coverageDirectory: istDir,
    collectCoverageFrom: [
      ...TARGET_DIRS.map((d) => `dist/${d}/*.js`),
      'dist/pnut-ts.js'
    ],
    reporters: [
      'default',
      [
        path.join(__dirname, 'jest-results-reporter.js'),
        { outputFile: resultPath }
      ]
    ],
    // babel would otherwise follow the tsc maps and report src offsets
    transform: {
      ...base.transform,
      '^.+\\.(js|jsx)$': ['babel-jest', { inputSourceMap: false }]
    }
  };
  delete cfg.coverageThreshold;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  // started through the bin link, as `jest` is under the gated suite: the compiler
  // recognises a Jest host by the basename of argv[1]
  const args = [
    path.join(REPO, 'node_modules', '.bin', 'jest'),
    '--runInBand',
    '-c',
    cfgPath,
    ...jestArgs
  ];
  const log = fs.openSync(logPath, 'w');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, {
    cwd: REPO,
    env: { ...process.env, NODE_V8_COVERAGE: dumpDir },
    stdio: ['ignore', log, log]
  });
  fs.closeSync(log);
  const seconds = (Date.now() - t0) / 1000;
  if (!fs.existsSync(resultPath)) {
    const tail = fs
      .readFileSync(logPath, 'utf8')
      .split('\n')
      .slice(-30)
      .join('\n');
    throw new HardError(
      `Jest wrote no results for ${root.name} (exit ${r.status}, signal ${r.signal}); log tail:\n${tail}`
    );
  }
  const res = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  const failed = res.failed;
  return {
    dumpDir,
    istFile: path.join(istDir, 'coverage-final.json'),
    seconds,
    suites: res.numTotalTestSuites,
    tests: res.numTotalTests,
    passed: res.numPassedTests,
    failedCount: res.numFailedTests + res.numRuntimeErrorTestSuites,
    skipped: res.numPendingTests + res.numTodoTests,
    failed
  };
}

function measure(opts, outDir) {
  const roots = gatedRoots();
  let selected = roots;
  if (opts.roots) {
    const names = new Set(roots.map((r) => r.name));
    const unknown = opts.roots.filter((n) => !names.has(n));
    if (unknown.length)
      throw new HardError(
        `not gated roots: ${unknown.join(', ')} (gated: ${[...names].join(', ')})`
      );
    selected = roots.filter((r) => opts.roots.includes(r.name));
  }
  for (const r of selected)
    if (!fs.existsSync(r.dir))
      throw new HardError(`${rel(r.dir)} is missing: run npm run build`);
  const targets = targetFiles();
  const targetSet = new Set(targets);
  const signature = buildSignature(targets);
  let state;
  const bitmaps = new Map();
  if (opts.accumulate && fs.existsSync(path.join(outDir, STATE_NAME))) {
    state = loadState(outDir);
    compareSignature(
      state.signature,
      signature,
      'accumulating into the existing state'
    );
    const done = new Set(state.rootsRun.map((r) => r.name));
    const again = selected.filter((r) => done.has(r.name)).map((r) => r.name);
    if (again.length)
      throw new HardError(
        `already measured in ${rel(path.join(outDir, STATE_NAME))}: ${again.join(', ')}`
      );
    for (const [k, v] of Object.entries(state.v8))
      bitmaps.set(k, {
        len: v.len,
        bits: new Uint8Array(Buffer.from(v.bits, 'base64')),
        runs: v.runs
      });
    console.log(
      `run-coverage: accumulating into a state that holds ${state.rootsRun.length} root(s)`
    );
  } else {
    state = newState(signature, roots);
  }
  const workParent = opts.work || os.tmpdir();
  fs.mkdirSync(workParent, { recursive: true });
  const work = fs.mkdtempSync(path.join(workParent, 'pnut-coverage-'));
  console.log(
    `run-coverage: ${selected.length} of ${roots.length} gated roots; scratch ${work}`
  );
  try {
    selected.forEach((root, i) => {
      const evidence = inProcessEvidence(root);
      const inProcess = evidence.length > 0;
      const mode = inProcess ? 'in-process+spawned' : 'spawned';
      process.stdout.write(
        `  [${String(i + 1).padStart(2)}/${selected.length}] ${root.name.padEnd(16)} ${mode.padEnd(18)} `
      );
      const run = runRoot(root, inProcess, work, opts.jestArgs);
      const tally = { folded: 0, jestSkipped: 0, other: 0, unreadable: 0 };
      foldDumps(run.dumpDir, targetSet, bitmaps, tally);
      let istFiles = 0;
      if (inProcess) {
        if (!fs.existsSync(run.istFile))
          throw new HardError(
            `${root.name} ran with --coverage but wrote no ${path.basename(run.istFile)}`
          );
        istFiles = foldIstanbul(run.istFile, targetSet, state);
      }
      const row = {
        name: root.name,
        mode,
        evidence,
        suites: run.suites,
        tests: run.tests,
        passed: run.passed,
        failed: run.failedCount,
        skipped: run.skipped,
        failedNames: run.failed,
        dumpsFolded: tally.folded,
        dumpsJestSkipped: tally.jestSkipped,
        dumpsOther: tally.other,
        dumpsUnreadable: tally.unreadable,
        istanbulFiles: istFiles,
        jestArgs: opts.jestArgs,
        seconds: run.seconds
      };
      state.rootsRun.push(row);
      console.log(
        `tests ${run.passed}/${run.tests} pass, ${run.failedCount} fail, ${run.skipped} skip · dumps folded ${tally.folded}, jest-skipped ${tally.jestSkipped}, other ${tally.other}, unreadable ${tally.unreadable} · istanbul files ${istFiles} · ${run.seconds.toFixed(1)} s`
      );
      if (run.tests === 0) throw new HardError(`${root.name} ran no tests`);
      if (tally.unreadable > 0)
        throw new HardError(
          `${root.name}: ${tally.unreadable} unreadable dump(s); their evidence is lost`
        );
      if (tally.folded === 0 && istFiles === 0)
        throw new HardError(
          `${root.name} produced no compiler evidence (no compiler dump folded, no istanbul data)`
        );
    });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  compareSignature(signature, buildSignature(targets), 'after the run');
  const measured = new Set(state.rootsRun.map((r) => r.name));
  state.complete =
    roots.every((r) => measured.has(r.name)) &&
    state.rootsRun.every((r) => (r.jestArgs || []).length === 0);
  saveState(outDir, state, bitmaps);
  return state;
}

// ---------------------------------------------------------------------------
// analysis

function analyze(state) {
  const targets = targetFiles();
  compareSignature(
    state.signature,
    buildSignature(targets),
    'dist/src since the state was recorded'
  );
  const dist = [];
  const src = new Map(); // srcAbs -> Map(line0 -> {hit, from: [distRel:line]})
  const neverLoaded = [];
  for (const abs of targets) {
    const k = rel(abs);
    const text = readText(abs);
    const lines = text.split('\n');
    const v8 = state.v8[k] ? Buffer.from(state.v8[k].bits, 'base64') : null;
    const ist = state.istanbul[k];
    if (!v8 && !(ist && ist.stmt.length)) neverLoaded.push(k);
    const stmt = new Set(ist ? ist.stmt : []);
    const fnl = new Set(ist ? ist.fn : []);
    const seen = (o) => v8 !== null && (v8[o >> 3] & (1 << (o & 7))) !== 0;
    const map = loadMap(abs);
    const row = { file: k, code: 0, protoHit: 0, hit: 0 };
    const lineInfo = [];
    let off = 0;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      const info = { off, code: isCode(L), proto: false, hit: false, col: -1 };
      if (info.code) {
        for (let j = 0; j < L.length; j++) {
          if (L[j] !== ' ' && L[j] !== '\t' && seen(off + j)) {
            info.proto = true;
            break;
          }
        }
        if (stmt.has(i + 1)) info.proto = true;
        info.col = creditColumn(L);
        info.hit = seen(off + info.col) || stmt.has(i + 1) || fnl.has(i + 1);
        row.code++;
        if (info.proto) row.protoHit++;
        if (info.hit) row.hit++;
        const pos = mapPosition(map, i, info.col);
        if (pos) {
          if (!src.has(pos.src)) src.set(pos.src, new Map());
          const m = src.get(pos.src);
          const cur = m.get(pos.line) || { hit: false, from: [] };
          cur.hit = cur.hit || info.hit;
          cur.from.push({
            file: k,
            line: i + 1,
            proto: info.proto,
            hit: info.hit,
            off
          });
          m.set(pos.line, cur);
        }
      }
      lineInfo.push(info);
      off += L.length + 1;
    }
    row.lineInfo = lineInfo;
    row.text = text;
    dist.push(row);
  }
  const srcRows = [];
  for (const [srcAbs, m] of [...src.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const text = fs.readFileSync(srcAbs, 'utf8');
    const lines = text.split('\n');
    const names = functionNames(srcAbs, text);
    const row = { file: rel(srcAbs), code: 0, hit: 0, lines: [], clauses: [] };
    for (const [line, v] of [...m.entries()].sort((a, b) => a[0] - b[0])) {
      const t = lines[line];
      if (t === undefined || !isCode(t)) continue;
      const entry = {
        line: line + 1,
        text: t,
        fn: names[line] || '<module>',
        hit: v.hit,
        from: v.from
      };
      if (!isSrcCode(t)) {
        row.clauses.push(entry);
        continue;
      }
      row.code++;
      if (v.hit) row.hit++;
      row.lines.push(entry);
    }
    srcRows.push(row);
  }
  return { dist, src: srcRows, neverLoaded };
}

// ---------------------------------------------------------------------------
// classification

// The class an emitted skeleton entry carries until someone reviews it; it does not
// classify the line.
const UNREVIEWED = 'unreviewed';

// Writes every unlisted line as a review-list entry, one per key with its count.
function emitUnlisted(cls, file) {
  const byKey = new Map();
  for (const u of cls.unlisted) {
    const key = `${u.file}\u0000${u.fn}\u0000${normalizeText(u.text)}`;
    if (!byKey.has(key))
      byKey.set(key, {
        file: u.file,
        function: u.fn,
        text: normalizeText(u.text),
        class: UNREVIEWED,
        reason: '',
        count: 0,
        lines: []
      });
    const e = byKey.get(key);
    e.count++;
    e.lines.push(u.line);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify({ version: 1, entries: [...byKey.values()] }, null, 2)}\n`
  );
  return byKey.size;
}

// Rewrites the review list: its stale entries go, reviewed entries for lines that
// are still unexecuted come in. A reviewed entry replaces a listed one of the same key.
function mergeReviewed(analysis, cls, files) {
  const entryKey = (e) =>
    `${e.file}\u0000${e.function}\u0000${normalizeText(e.text)}`;
  const raw = cls.present
    ? JSON.parse(fs.readFileSync(cls.path, 'utf8'))
    : { version: 1, entries: [] };
  const staleKeys = new Set(cls.stale.map(entryKey));
  const merged = new Map();
  for (const e of Array.isArray(raw) ? raw : raw.entries)
    if (!staleKeys.has(entryKey(e))) merged.set(entryKey(e), e);
  const unexecuted = new Set();
  for (const row of analysis.src)
    for (const l of row.lines)
      if (!l.hit) unexecuted.add(`${row.file}\u0000${l.fn}\u0000${normalizeText(l.text)}`);
  const tally = { added: 0, replaced: 0, executed: 0, unreviewed: 0 };
  for (const file of files) {
    const reviewed = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const e of Array.isArray(reviewed) ? reviewed : reviewed.entries) {
      if (!e.file || e.function === undefined || !e.text || !e.class)
        throw new HardError(
          `${file}: entry lacks file/function/text/class: ${JSON.stringify(e)}`
        );
      if (e.class === UNREVIEWED) {
        tally.unreviewed++;
        continue;
      }
      if (!e.reason)
        throw new HardError(`${file}: entry has no reason: ${JSON.stringify(e)}`);
      const key = entryKey(e);
      if (!unexecuted.has(key)) {
        tally.executed++;
        continue;
      }
      tally[merged.has(key) ? 'replaced' : 'added']++;
      merged.set(key, e);
    }
  }
  const entries = [...merged.values()].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.function.localeCompare(b.function) ||
      normalizeText(a.text).localeCompare(normalizeText(b.text))
  );
  fs.mkdirSync(path.dirname(cls.path), { recursive: true });
  fs.writeFileSync(
    cls.path,
    `${JSON.stringify({ version: 1, entries }, null, 2)}\n`
  );
  console.log(
    `  merged into ${rel(cls.path)}: ${tally.added} added, ${tally.replaced} replaced, ${cls.stale.length} stale dropped; not added: ${tally.executed} for lines now executed, ${tally.unreviewed} still unreviewed`
  );
}

function classify(analysis, classifiedPath) {
  const result = {
    present: fs.existsSync(classifiedPath),
    path: classifiedPath,
    unlisted: [],
    classified: [],
    stale: [],
    byClass: {}
  };
  const entries = new Map();
  if (result.present) {
    const raw = JSON.parse(fs.readFileSync(classifiedPath, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.entries;
    if (!Array.isArray(list))
      throw new HardError(`${classifiedPath}: expected {"entries": [...]}`);
    for (const e of list) {
      if (!e.file || e.function === undefined || !e.text || !e.class)
        throw new HardError(
          `${classifiedPath}: entry lacks file/function/text/class: ${JSON.stringify(e)}`
        );
      const key = `${e.file}\u0000${e.function}\u0000${normalizeText(e.text)}`;
      entries.set(key, { entry: e, used: 0 });
    }
  }
  for (const row of analysis.src) {
    for (const l of row.lines) {
      if (l.hit) continue;
      const key = `${row.file}\u0000${l.fn}\u0000${normalizeText(l.text)}`;
      const slot = entries.get(key);
      // an entry with a count covers that many identical lines; any beyond it are new
      if (
        slot &&
        (slot.entry.count === undefined || slot.used < slot.entry.count)
      ) {
        slot.used++;
        if (slot.entry.class === UNREVIEWED) {
          result.unlisted.push({ file: row.file, ...l });
          continue;
        }
        result.classified.push({ file: row.file, ...l, cls: slot.entry.class });
        result.byClass[slot.entry.class] =
          (result.byClass[slot.entry.class] || 0) + 1;
      } else {
        result.unlisted.push({ file: row.file, ...l });
      }
    }
  }
  for (const slot of entries.values())
    if (slot.used === 0) result.stale.push(slot.entry);
  return result;
}

// ---------------------------------------------------------------------------
// report

function pct(n, d) {
  return d ? ((100 * n) / d).toFixed(1) : '100.0';
}

function totals(analysis) {
  const t = {
    distCode: 0,
    distProto: 0,
    distHit: 0,
    srcCode: 0,
    srcHit: 0,
    throwSites: 0,
    throwHit: 0
  };
  for (const r of analysis.dist) {
    t.distCode += r.code;
    t.distProto += r.protoHit;
    t.distHit += r.hit;
  }
  t.srcClauses = 0;
  for (const r of analysis.src) {
    t.srcCode += r.code;
    t.srcHit += r.hit;
    t.srcClauses += r.clauses.length;
    for (const l of r.lines) {
      if (isThrowSite(l.text)) {
        t.throwSites++;
        if (l.hit) t.throwHit++;
      }
    }
  }
  return t;
}

function scopeLines(state) {
  const run = state.rootsRun;
  const sum = (f) => run.reduce((a, r) => a + r[f], 0);
  const ranNames = new Set(run.map((r) => r.name));
  const notRun = state.rootsConfigured.filter((n) => !ranNames.has(n));
  return [
    `roots configured ${state.rootsConfigured.length} · run ${run.length} · not run ${notRun.length}${notRun.length ? ` (${notRun.join(', ')})` : ''}`,
    `in-process roots (istanbul + V8): ${
      run
        .filter((r) => r.mode !== 'spawned')
        .map((r) => r.name)
        .join(', ') || 'none'
    }`,
    `tests ${sum('passed')}/${sum('tests')} pass, ${sum('failed')} fail, ${sum('skipped')} skip, ${sum('suites')} suites · Jest time ${sum('seconds').toFixed(1)} s`,
    `dumps folded ${sum('dumpsFolded')} · jest-process dumps skipped ${sum('dumpsJestSkipped')} · other dumps ${sum('dumpsOther')} · unreadable ${sum('dumpsUnreadable')}`,
    `orphan dist files not measured (no src/*.ts): ${state.orphans.length ? state.orphans.join(', ') : 'none'}`,
    `scope: ${state.complete ? 'COMPLETE (all gated roots, no Jest filters)' : 'PARTIAL — not a measurement of the gated suite'}`
  ];
}

function writeReport(outDir, state, analysis, cls, t, wallStart) {
  const o = [];
  o.push('# Regression Coverage Baseline', '');
  o.push(
    `Generated ${new Date().toISOString()} by \`scripts/coverage/run-coverage.js\` from state recorded ${state.created} at ${state.head}.`,
    ''
  );
  o.push('## Examined scope', '');
  for (const s of scopeLines(state)) o.push(`- ${s}`);
  o.push(
    '',
    '| Root | Mode | Tests pass/total | Fail | Skip | Dumps folded | Jest dumps skipped | Other | istanbul files | Seconds |',
    '|---|---|---|---|---|---|---|---|---|---|'
  );
  for (const r of state.rootsRun) {
    o.push(
      `| ${r.name} | ${r.mode} | ${r.passed}/${r.tests} | ${r.failed} | ${r.skipped} | ${r.dumpsFolded} | ${r.dumpsJestSkipped} | ${r.dumpsOther} | ${r.istanbulFiles} | ${r.seconds.toFixed(1)} |`
    );
  }
  const failing = state.rootsRun.flatMap((r) =>
    r.failedNames.map((n) => `${r.name}: ${n}`)
  );
  if (failing.length) {
    o.push('', '**SUITE NOT GREEN — this measurement is not a baseline.**', '');
    for (const f of failing) o.push(`- ${f}`);
  }
  o.push('', '## Totals', '');
  o.push(
    `- dist code lines executed (union rule, comparable with earlier measurements): **${t.distProto} of ${t.distCode} (${pct(t.distProto, t.distCode)}%)**`
  );
  o.push(
    `- dist code lines executed (credit-column rule, used for every verdict below): ${t.distHit} of ${t.distCode} (${pct(t.distHit, t.distCode)}%)`
  );
  o.push(
    `- src code lines executed: ${t.srcHit} of ${t.srcCode} (${pct(t.srcHit, t.srcCode)}%); unexecuted ${t.srcCode - t.srcHit}`
  );
  o.push(
    `- src clause lines not counted as code (\`catch (…) {\`, \`finally {\`, \`} while (…);\` — the clause body decides): ${t.srcClauses}`
  );
  o.push(`- src \`throw\` sites executed: ${t.throwHit} of ${t.throwSites}`);
  if (analysis.neverLoaded.length)
    o.push(
      `- dist files with no evidence at all (never loaded): ${analysis.neverLoaded.join(', ')}`
    );
  o.push('', '## Review list', '');
  if (!cls.present) {
    o.push(
      `\`${rel(cls.path)}\` is absent: every unexecuted line below is **unreviewed**.`
    );
  } else {
    o.push(
      `\`${rel(cls.path)}\`: ${cls.classified.length} unexecuted lines classified, **${cls.unlisted.length} unlisted**, ${cls.stale.length} stale entries.`
    );
    for (const [c, n] of Object.entries(cls.byClass).sort())
      o.push(`- ${c}: ${n}`);
  }
  o.push(
    '',
    '## Per dist file',
    '',
    '| File | Code | Executed (union) | Executed (credit column) |',
    '|---|---|---|---|'
  );
  for (const r of analysis.dist)
    o.push(`| ${r.file} | ${r.code} | ${r.protoHit} | ${r.hit} |`);
  o.push(
    '',
    '## Per src file',
    '',
    '| File | Code | Executed | Unexecuted | Unlisted |',
    '|---|---|---|---|---|'
  );
  const unlistedBy = new Map();
  for (const u of cls.unlisted)
    unlistedBy.set(u.file, (unlistedBy.get(u.file) || 0) + 1);
  for (const r of [...analysis.src].sort(
    (a, b) => b.code - b.hit - (a.code - a.hit)
  )) {
    o.push(
      `| ${r.file} | ${r.code} | ${r.hit} | ${r.code - r.hit} | ${unlistedBy.get(r.file) || 0} |`
    );
  }
  o.push(
    '',
    `## ${cls.present ? 'Unlisted' : 'Unreviewed'} unexecuted lines`,
    ''
  );
  let curFile = '';
  let curFn = null;
  for (const u of cls.unlisted) {
    if (u.file !== curFile) {
      if (curFile) o.push('```', '');
      o.push(`### ${u.file}`, '');
      curFile = u.file;
      curFn = null;
    }
    if (u.fn !== curFn) {
      if (curFn !== null) o.push('```', '');
      o.push(`\`${u.fn}\``, '', '```');
      curFn = u.fn;
    }
    o.push(`${String(u.line).padStart(6)}  ${u.text.trim()}`);
  }
  if (curFile) o.push('```', '');
  if (cls.stale.length) {
    o.push('## Stale review entries (no unexecuted line matches)', '');
    for (const e of cls.stale)
      o.push(
        `- \`${e.file}\` \`${e.function}\` — \`${normalizeText(e.text)}\` (${e.class})`
      );
    o.push('');
  }
  o.push(
    `Report written in ${((Date.now() - wallStart) / 1000).toFixed(1)} s of run-coverage wall time.`,
    ''
  );
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, REPORT_NAME);
  fs.writeFileSync(file, o.join('\n'));
  return file;
}

function utf8Offset(text, utf16Offset) {
  return Buffer.byteLength(text.slice(0, utf16Offset), 'utf8');
}

function printTrace(analysis, pattern) {
  const re = new RegExp(pattern);
  const distByFile = new Map(analysis.dist.map((d) => [d.file, d]));
  for (const r of analysis.src) {
    const all = [
      ...r.lines.map((l) => ({ ...l, clause: false })),
      ...r.clauses.map((l) => ({ ...l, clause: true }))
    ].sort((a, b) => a.line - b.line);
    for (const l of all) {
      if (!re.test(l.text)) continue;
      const verdict = l.clause
        ? `CLAUSE(${l.hit ? 'hit' : 'miss'})`
        : l.hit
          ? 'EXECUTED'
          : 'UNEXECUTED';
      console.log(
        `  ${verdict.padEnd(12)} ${r.file}:${l.line}  ${l.fn}  ${l.text.trim()}`
      );
      for (const f of l.from) {
        const d = distByFile.get(f.file);
        const info = d.lineInfo[f.line - 1];
        const at = f.off + info.col;
        const b = utf8Offset(d.text, at);
        console.log(
          `      ← ${f.file}:${f.line} credit-column ${f.hit ? 'hit' : 'miss'}, union ${f.proto ? 'hit' : 'miss'}; offset ${at} UTF-16 = ${b} UTF-8 (${b - at} non-ASCII bytes earlier in the file)`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// single compile

function compressRanges(nums) {
  const out = [];
  for (let i = 0; i < nums.length; ) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(i === j ? `${nums[i]}` : `${nums[i]}-${nums[j]}`);
    i = j + 1;
  }
  return out.join(', ');
}

function singleCompile(opts) {
  const spin = path.resolve(opts.file);
  if (!fs.existsSync(spin)) throw new HardError(`${opts.file} does not exist`);
  const targets = targetFiles();
  const targetSet = new Set(targets);
  const signature = buildSignature(targets);
  const workParent = opts.work || os.tmpdir();
  fs.mkdirSync(workParent, { recursive: true });
  const work = fs.mkdtempSync(path.join(workParent, 'pnut-coverage-'));
  const state = newState(signature, []);
  const bitmaps = new Map();
  const tally = { folded: 0, jestSkipped: 0, other: 0, unreadable: 0 };
  let r;
  try {
    const args = [path.join(DIST, 'pnut-ts.js'), ...opts.fileFlags, spin];
    console.log(`run-coverage: node ${args.join(' ')}`);
    r = spawnSync(process.execPath, args, {
      cwd: REPO,
      env: { ...process.env, NODE_V8_COVERAGE: work },
      encoding: 'utf8'
    });
    foldDumps(work, targetSet, bitmaps, tally);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  const output = `${r.stdout || ''}${r.stderr || ''}`.trimEnd().split('\n');
  console.log(
    `  compiler exit ${r.status}; output (${output.length} lines, last 10):`
  );
  for (const l of output.slice(-10)) console.log(`    | ${l}`);
  console.log(
    `  dumps folded ${tally.folded}, other ${tally.other}, unreadable ${tally.unreadable}`
  );
  if (tally.unreadable > 0)
    throw new HardError('unreadable dump; evidence lost');
  if (tally.folded === 0)
    throw new HardError('the compile produced no compiler dump');
  for (const [k, bits] of bitmaps)
    state.v8[k] = {
      len: bits.len,
      bits: Buffer.from(bits.bits).toString('base64'),
      runs: bits.runs
    };
  const analysis = analyze(state);
  const t = totals(analysis);
  console.log(
    `  src code lines executed ${t.srcHit} of ${t.srcCode}; throw sites executed ${t.throwHit} of ${t.throwSites}:`
  );
  for (const row of analysis.src)
    for (const l of row.lines)
      if (l.hit && isThrowSite(l.text))
        console.log(`    ${row.file}:${l.line}  ${l.fn}  ${l.text.trim()}`);
  console.log('  executed src lines per file:');
  for (const row of analysis.src) {
    if (row.hit === 0) continue;
    console.log(
      `    ${String(row.hit).padStart(6)} of ${String(row.code).padStart(6)}  ${row.file}`
    );
    if (opts.show.some((s) => row.file.includes(s))) {
      console.log(
        `           lines ${compressRanges(row.lines.filter((l) => l.hit).map((l) => l.line))}`
      );
    }
  }
  if (opts.trace) printTrace(analysis, opts.trace);
  return EXIT_OK;
}

// ---------------------------------------------------------------------------
// main

function parseArgs(argv) {
  const o = {
    roots: null,
    out: null,
    work: null,
    jestArgs: [],
    accumulate: false,
    stateFile: null,
    reportOnly: false,
    check: false,
    classified: null,
    trace: null,
    emit: null,
    merge: [],
    file: null,
    fileFlags: [],
    show: []
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      if (i + 1 >= argv.length) throw new HardError(`${a} needs a value`);
      return argv[++i];
    };
    if (a.startsWith('--jest-arg=')) {
      o.jestArgs.push(a.slice('--jest-arg='.length));
      continue;
    }
    switch (a) {
      case '--roots':
        o.roots = value()
          .split(',')
          .map((s) => s.trim().replace(/\/$/, ''))
          .filter(Boolean);
        break;
      case '--out':
        o.out = path.resolve(value());
        break;
      case '--work':
        o.work = path.resolve(value());
        break;
      case '--jest-arg':
        o.jestArgs.push(value());
        break;
      case '--report-only':
        o.reportOnly = true;
        break;
      case '--check':
        o.check = true;
        break;
      case '--classified':
        o.classified = path.resolve(value());
        break;
      case '--trace':
        o.trace = value();
        break;
      case '--accumulate':
        o.accumulate = true;
        break;
      case '--state':
        o.stateFile = path.resolve(value());
        break;
      case '--emit-unlisted':
        o.emit = path.resolve(value());
        break;
      case '--merge-reviewed':
        o.merge.push(path.resolve(value()));
        break;
      case '--show':
        o.show.push(value());
        break;
      case '--file':
        o.file = value();
        o.fileFlags = argv.slice(i + 1);
        i = argv.length;
        break;
      default:
        throw new HardError(`unknown option ${a}`);
    }
  }
  return o;
}

function run(opts, wallStart) {
  if (opts.file) return singleCompile(opts);
  if (opts.roots && !opts.out)
    throw new HardError(
      'a partial run (--roots) must name --out, so it cannot replace the baseline'
    );
  if (opts.stateFile && !opts.reportOnly)
    throw new HardError('--state is for --report-only');
  const outDir = opts.out || DEFAULT_OUT;
  const classifiedPath =
    opts.classified || path.join(DEFAULT_OUT, 'classified.json');
  let state;
  if (!opts.reportOnly) {
    state = measure(opts, outDir);
  } else if (opts.stateFile) {
    state = loadState(
      path.dirname(opts.stateFile),
      path.basename(opts.stateFile)
    );
    fs.mkdirSync(outDir, { recursive: true });
    if (path.resolve(opts.stateFile) !== path.join(outDir, STATE_NAME))
      fs.copyFileSync(opts.stateFile, path.join(outDir, STATE_NAME));
  } else {
    state = loadState(outDir);
  }
  if (opts.reportOnly) for (const s of scopeLines(state)) console.log(`  ${s}`);
  const analysis = analyze(state);
  let cls = classify(analysis, classifiedPath);
  if (opts.merge.length) {
    // on a partial state a line another root runs looks unexecuted, and "stale" means nothing
    if (!state.complete)
      throw new HardError(
        '--merge-reviewed needs a state covering every gated root unfiltered'
      );
    mergeReviewed(analysis, cls, opts.merge);
    cls = classify(analysis, classifiedPath);
  }
  const t = totals(analysis);
  const report = writeReport(outDir, state, analysis, cls, t, wallStart);
  if (!opts.reportOnly)
    for (const s of scopeLines(state)) console.log(`  ${s}`);
  console.log(
    `  dist code lines executed ${t.distProto} of ${t.distCode} (${pct(t.distProto, t.distCode)}%, union rule); ${t.distHit} by credit-column rule`
  );
  console.log(
    `  src code lines executed ${t.srcHit} of ${t.srcCode}; unexecuted ${t.srcCode - t.srcHit}; throw sites executed ${t.throwHit} of ${t.throwSites}`
  );
  if (analysis.neverLoaded.length)
    console.log(
      `  dist files never loaded: ${analysis.neverLoaded.join(', ')}`
    );
  console.log(
    `  review list ${cls.present ? `${rel(cls.path)}: ${cls.classified.length} classified, ${cls.unlisted.length} unlisted, ${cls.stale.length} stale` : 'absent: every unexecuted line is unreviewed'}`
  );
  console.log(
    `  report ${rel(report)}; state ${rel(path.join(outDir, STATE_NAME))}`
  );
  if (opts.trace) printTrace(analysis, opts.trace);
  if (opts.emit)
    console.log(
      `  emitted ${emitUnlisted(cls, opts.emit)} review entries for ${cls.unlisted.length} unlisted lines to ${opts.emit}`
    );
  const red = state.rootsRun.some((r) => r.failed > 0);
  if (red)
    throw new HardError(
      'the suite is not green; the report is marked and is not a baseline'
    );
  if (!opts.check) return EXIT_OK;
  if (!state.complete) {
    console.log(
      '  check: NOT EVALUABLE — the state does not cover every gated root unfiltered'
    );
    return EXIT_NOT_EVALUABLE;
  }
  if (!cls.present) {
    console.log(`  check: NOT EVALUABLE — ${rel(classifiedPath)} is absent`);
    return EXIT_NOT_EVALUABLE;
  }
  if (cls.unlisted.length > 0) {
    console.log(
      `  check: FAIL — ${cls.unlisted.length} unexecuted line(s) missing from the review list`
    );
    return EXIT_UNLISTED;
  }
  console.log('  check: clean');
  return EXIT_OK;
}

function main() {
  const wallStart = Date.now();
  let code = EXIT_HARD;
  try {
    code = run(parseArgs(process.argv.slice(2)), wallStart);
  } catch (e) {
    if (e instanceof HardError)
      console.error(`run-coverage: HARD ERROR: ${e.message}`);
    else console.error(e && e.stack ? e.stack : e);
    code = EXIT_HARD;
  }
  console.log(
    `run-coverage: wall time ${((Date.now() - wallStart) / 1000).toFixed(1)} s; exit ${code}`
  );
  process.exit(code);
}

main();
