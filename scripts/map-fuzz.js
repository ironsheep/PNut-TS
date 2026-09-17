#!/usr/bin/env node
/**
 * Seeded random object trees vs the same ground-truth checks the shape
 * matrix and GOLD corpora use (Map-Instance-Correctness §4, part 2).
 *
 * Usage:
 *   npm run map-fuzz                  (seed from time, 40 trees)
 *   npm run map-fuzz -- <seed>        (one tree, that seed)
 *   npm run map-fuzz -- <seed> <n>    (n trees, seeds <seed>..<seed>+n-1)
 *
 * Needs `npm run build` first — it requires the compiled dist/tests/MAP-tests
 * checkers directly, the same code the Jest suites use, and drives the
 * compiled CLI (dist/pnut-ts.js) as a subprocess.
 *
 * Every generated source is a plain function of its seed (mulberry32), so a
 * failing seed reproduces exactly: `npm run map-fuzz -- <seed>`. Each tree
 * varies depth (leaf / mid / top), arrays, identical vs forked overrides (an
 * override on a fork-capable leaf's DAT-sizing CON forces a fork), VAR
 * presence, a STRUCT VAR member, and DAT-size forks. Generated sources live
 * only in a temp directory, removed after each tree.
 *
 * The checks: the decode is self-consistent (mapOracle), the .map's
 * structural facts match that decode (mapGroundTruth.checkMapStructure —
 * image regions, VAR blocks, VAR symbol packing/addresses, child slots,
 * method addresses), every DAT magic marker reads back correctly at the
 * address the map states for it, and the warm (object-cache) map is
 * identical to the cold one apart from `Generated:`.
 *
 * `--demo-defect` (run on its own, never as part of a normal fuzz run) proves
 * the harness itself can fail: it temporarily patches
 * dist/classes/mapGenerator.js to mis-offset a VAR row's printed address,
 * confirms one fixed seed is then reported broken, and restores the file.
 * Run it after changing the checker; a normal run never touches dist/.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(ROOT, 'dist', 'pnut-ts.js');
const MAP_GENERATOR = path.join(ROOT, 'dist', 'classes', 'mapGenerator.js');
const oracle = require(
  path.join(ROOT, 'dist', 'tests', 'MAP-tests', 'mapOracle.js')
);
const { parseMap } = require(
  path.join(ROOT, 'dist', 'tests', 'MAP-tests', 'mapParser.js')
);
const { checkMapStructure } = require(
  path.join(ROOT, 'dist', 'tests', 'MAP-tests', 'mapGroundTruth.js')
);

const DEFAULT_COUNT = 40;
const DEMO_SEED = 424242;

// --------------------------------------------------------------------------
// Deterministic PRNG
// --------------------------------------------------------------------------

function mulberry32(seed) {
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rnd, n) {
  return Math.floor(rnd() * n);
}

function hex5(value) {
  return `$${(value >>> 0).toString(16).toUpperCase().padStart(5, '0')}`;
}

// --------------------------------------------------------------------------
// Source generation
// --------------------------------------------------------------------------

function magicHex(value) {
  return `$${(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function baseName(filename) {
  return filename.replace(/\.spin2$/i, '');
}

function makeLeaf(rnd, seq) {
  const filename = `leaf${seq.file++}.spin2`;
  const magic = seq.magic++ >>> 0;
  const hasVar = rnd() < 0.75;
  const varLongs = hasVar ? 1 + pick(rnd, 3) : 0;
  const hasStruct = hasVar && rnd() < 0.3;
  const forkable = rnd() < 0.6; // a "SIZE" CON that sizes a DAT array: overriding it forks the image

  const lines = ['{Spin2_v55}', 'CON', `  N = ${1 + pick(rnd, 8)}`];
  if (hasStruct) {
    lines.push('  STRUCT PT(LONG x, LONG y)');
  }
  lines.push('', 'DAT', `  MARK  LONG  ${magicHex(magic)}`);
  if (forkable) {
    lines.push('  PAD   BYTE  0[N]');
  }
  if (hasVar) {
    lines.push('', 'VAR');
    for (let i = 0; i < varLongs; i++) {
      lines.push(`  long V${i}`);
    }
    if (hasStruct) {
      lines.push('  PT S1');
    }
  }
  lines.push('', 'PUB get() : r', '  r := MARK', '');
  return { kind: 'leaf', filename, magic, forkable, src: lines.join('\n') };
}

function pickChildren(rnd, pool, count) {
  const children = [];
  for (let c = 0; c < count; c++) {
    const item = pool[pick(rnd, pool.length)];
    const arrayCount = rnd() < 0.3 ? 2 + pick(rnd, 3) : 1;
    const override =
      item.kind === 'leaf' && item.forkable && rnd() < 0.5
        ? 1 + pick(rnd, 8)
        : null;
    children.push({ item, arrayCount, override, declName: `C${c}` });
  }
  return children;
}

function objDecl(child) {
  const arraySuffix = child.arrayCount > 1 ? `[${child.arrayCount}]` : '';
  const overrideSuffix =
    child.override !== null ? ` | N = ${child.override}` : '';
  return `  ${child.declName}${arraySuffix} : "${baseName(child.item.filename)}"${overrideSuffix}`;
}

function childCall(child) {
  return child.arrayCount > 1
    ? `${child.declName}[0].get()`
    : `${child.declName}.get()`;
}

function makeMid(rnd, seq, leafPool) {
  const filename = `mid${seq.file++}.spin2`;
  const magic = seq.magic++ >>> 0;
  const hasVar = rnd() < 0.5;
  const varLongs = hasVar ? 1 + pick(rnd, 2) : 0;
  const children = pickChildren(rnd, leafPool, 1 + pick(rnd, 2));

  const lines = [
    '{Spin2_v55}',
    'CON',
    `  Q = ${1 + pick(rnd, 4)}`,
    '',
    'DAT',
    `  MARK  LONG  ${magicHex(magic)}`
  ];
  if (hasVar) {
    lines.push('', 'VAR');
    for (let i = 0; i < varLongs; i++) {
      lines.push(`  long W${i}`);
    }
  }
  lines.push('', 'OBJ', ...children.map(objDecl));
  lines.push(
    '',
    'PUB get() : r',
    `  r := MARK + ${children.map(childCall).join(' + ')}`,
    ''
  );
  return { kind: 'mid', filename, magic, children, src: lines.join('\n') };
}

function makeTop(rnd, seq, pool) {
  const magic = seq.magic++ >>> 0;
  const children = pickChildren(rnd, pool, 1 + pick(rnd, 3));
  const lines = [
    '{Spin2_v55}',
    'DAT',
    `  MARK  LONG  ${magicHex(magic)}`,
    '',
    'VAR',
    '  long TOPV',
    '',
    'OBJ',
    ...children.map(objDecl)
  ];
  lines.push(
    '',
    'PUB main()',
    ...children.map((child) => `  ${childCall(child)}`),
    ''
  );
  return {
    kind: 'top',
    filename: 'top.spin2',
    magic,
    children,
    src: lines.join('\n')
  };
}

function generateShape(seed) {
  const rnd = mulberry32(seed);
  const seq = { file: 0, magic: 0x50000001 };
  const leaves = [];
  const leafCount = 2 + pick(rnd, 3);
  for (let i = 0; i < leafCount; i++) {
    leaves.push(makeLeaf(rnd, seq));
  }
  const mids = [];
  const midCount = pick(rnd, 3);
  for (let i = 0; i < midCount; i++) {
    mids.push(makeMid(rnd, seq, leaves));
  }
  const top = makeTop(rnd, seq, [...leaves, ...mids]);
  return { leaves, mids, top, all: [...leaves, ...mids, top] };
}

// --------------------------------------------------------------------------
// Checks
// --------------------------------------------------------------------------

/** Every generated file's magic value reads back at the address its own DAT block states for MARK. */
function checkMarkers(shape, raw, map) {
  const problems = [];
  const magicBySource = new Map(
    shape.all.map((item) => [item.filename, item.magic])
  );
  for (const block of map.details) {
    let magic;
    for (const source of block.source.split(',')) {
      if (magicBySource.has(source)) {
        magic = magicBySource.get(source);
        break;
      }
    }
    if (magic === undefined) {
      problems.push(
        `block #${block.image} source "${block.source}" not among generated files`
      );
      continue;
    }
    const row = block.dat.find((d) => d.name.toUpperCase() === 'MARK');
    if (row === undefined) {
      problems.push(`block #${block.image} (${block.source}): no MARK DAT row`);
      continue;
    }
    if (row.address + 4 > raw.image.length) {
      problems.push(
        `block #${block.image} (${block.source}): MARK address ${hex5(row.address)} runs past the image`
      );
      continue;
    }
    const actual = raw.image.readUInt32LE(row.address);
    if (actual !== magic) {
      problems.push(
        `block #${block.image} (${block.source}): MARK at ${hex5(row.address)} reads $${actual.toString(16).toUpperCase()}, expected $${magic.toString(16).toUpperCase()}`
      );
    }
  }
  return problems;
}

function stripGenerated(text) {
  return text
    .split('\n')
    .filter((line) => !line.startsWith('Generated:'))
    .join('\n');
}

/** Compile, check, clean up. Throws on any disagreement, message identifies the seed's tree by file/block. */
function runOne(seed) {
  const shape = generateShape(seed);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `mapfuzz-${seed}-`));
  try {
    for (const item of shape.all) {
      fs.writeFileSync(path.join(dir, item.filename), item.src);
    }
    const cacheDir = path.join(dir, '.fuzz-cache');
    execSync(
      `node ${TOOL} -q -l -m -O --cache --cache-clear --cache-dir ${cacheDir} ${shape.top.filename}`,
      { cwd: dir, stdio: 'pipe' }
    );

    const raw = oracle.readListingImage(path.join(dir, 'top.lst'));
    const program = oracle.decodeImage(raw);
    if (program.problems.length > 0) {
      throw new Error(
        `decode inconsistent:\n${oracle.describeProgram(program)}`
      );
    }
    const coldMapText = fs.readFileSync(path.join(dir, 'top.map'), 'utf8');
    const map = parseMap(coldMapText);

    const problems = [
      ...checkMapStructure(map, program),
      ...checkMarkers(shape, raw, map)
    ];
    if (problems.length > 0) {
      throw new Error(problems.join('\n'));
    }

    execSync(
      `node ${TOOL} -q -m --cache --cache-dir ${cacheDir} ${shape.top.filename}`,
      { cwd: dir, stdio: 'pipe' }
    );
    const warmMapText = fs.readFileSync(path.join(dir, 'top.map'), 'utf8');
    if (stripGenerated(warmMapText) !== stripGenerated(coldMapText)) {
      throw new Error(
        'warm (object-cache) map differs from cold, apart from Generated:'
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --------------------------------------------------------------------------
// Injected-defect demonstration
// --------------------------------------------------------------------------

function demoInjectedDefect() {
  const original = fs.readFileSync(MAP_GENERATOR, 'utf8');
  const needle = 'hex5(user.varBase + sym.offset)';
  const replacement = 'hex5(user.varBase + sym.offset + 4)';
  if (!original.includes(needle)) {
    console.error(
      `map-fuzz: --demo-defect could not find the patch point in ${MAP_GENERATOR} (source moved?)`
    );
    process.exitCode = 1;
    return false;
  }
  fs.writeFileSync(MAP_GENERATOR, original.replace(needle, replacement));
  let caught = false;
  try {
    runOne(DEMO_SEED);
  } catch (error) {
    caught = true;
    console.log(
      `map-fuzz: injected defect (VAR row address off by one long) CAUGHT at seed ${DEMO_SEED}:`
    );
    console.log(
      String(error.message)
        .split('\n')
        .slice(0, 3)
        .map((line) => `  ${line}`)
        .join('\n')
    );
  } finally {
    fs.writeFileSync(MAP_GENERATOR, original);
  }
  if (!caught) {
    console.error(
      `map-fuzz: FAILED to catch the injected defect at seed ${DEMO_SEED} — the checker is not sensitive to this bug`
    );
    process.exitCode = 1;
  }
  return caught;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--demo-defect') {
    const ok = demoInjectedDefect();
    process.exit(ok ? 0 : 1);
  }

  if (!fs.existsSync(TOOL)) {
    console.error(`map-fuzz: ${TOOL} not found — run "npm run build" first`);
    process.exit(1);
  }

  const startSeed =
    args[0] !== undefined ? parseInt(args[0], 10) : Date.now() >>> 0;
  const count =
    args[1] !== undefined
      ? parseInt(args[1], 10)
      : args[0] !== undefined
        ? 1
        : DEFAULT_COUNT;

  console.log(
    `map-fuzz: ${count} tree(s), seeds ${startSeed}..${startSeed + count - 1}`
  );
  let failures = 0;
  for (let i = 0; i < count; i++) {
    const seed = startSeed + i;
    try {
      runOne(seed);
    } catch (error) {
      failures++;
      console.error(
        `map-fuzz: SEED ${seed} FAILED (reproduce: npm run map-fuzz -- ${seed})`
      );
      console.error(
        String((error && error.stderr) || (error && error.message) || error)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')
      );
    }
  }
  console.log(`map-fuzz: ${count - failures}/${count} trees passed`);

  process.exit(failures === 0 && process.exitCode !== 1 ? 0 : 1);
}

main();
