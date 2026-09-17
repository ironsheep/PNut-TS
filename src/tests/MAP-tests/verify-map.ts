/**
 * Map File Verification (new grammar — Map-Instance-Correctness §5)
 *
 * Cross-references a compiled `.map` file against its `expected.json` (facts
 * a human can check against source: names, VAR sizes, method/DAT/PASM-label
 * names, overrides) and against the compiled `.lst` listing, read
 * independently by `mapOracle.ts` (never by this parser, and never by the
 * compiler's own ObjectLayout/mapGenerator).
 *
 * `expected.json` never carries addresses: every address comes from the map
 * itself, and image bases are cross-checked against mapOracle's independent
 * header-walk decode. See `DOCs/internals/MAP-File-Format.md` for the grammar
 * this parses (via `mapParser.ts`, the one parser test code uses for the new
 * format) and `README.md` in this directory for what each fixture checks.
 */

/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import { decodeImage, readListingImage } from './mapOracle';
import { ParsedMap, parseMap } from './mapParser';

// --------------------------------------------------------------------------
// expected.json shape
// --------------------------------------------------------------------------

export interface ExpectedVar {
  name: string;
  type: string; // BYTE | WORD | LONG | STRUCT | ^BYTE | ^WORD | ^LONG | ^STRUCT
  size: number; // total bytes: element size * element count
}

export interface ExpectedDat {
  name: string;
  type: string;
}

export interface ExpectedImage {
  /** Source file this image's instances were compiled from (comma list for merged-source images). */
  source: string;
  methods: string[];
  dat: ExpectedDat[];
  pasm_labels: string[];
}

export interface ExpectedInstance {
  /** Instance path exactly as printed in the map: `(top)`, `A`, `A.LEAF`, `D[1]`. */
  path: string;
  /** 0-based index into `images`; the instance runs `images[image]`, map `#(image+1)`. */
  image: number;
  /** Raw Overrides cell, e.g. `-` or `SIZE=4`. Defaults to `-`. */
  overrides?: string;
  vars: ExpectedVar[];
}

export interface ExpectedJson {
  description: string;
  top_file: string;
  language_version?: number;
  images: ExpectedImage[];
  instances: ExpectedInstance[];
  totals: {
    instance_count: number;
    image_count: number;
  };
}

// --------------------------------------------------------------------------
// Results
// --------------------------------------------------------------------------

export interface CheckResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface VerificationResult {
  testName: string;
  passed: boolean;
  checks: CheckResult[];
}

function ok(name: string, expected: string, actual: string): CheckResult {
  return { name, passed: expected === actual, expected, actual };
}

// --------------------------------------------------------------------------
// Pure checkers over an already-parsed map (unit-testable without a compile —
// this is what the falsification tests in mapVerifyFalsification.test.ts drive)
// --------------------------------------------------------------------------

/**
 * Every Methods-table row must satisfy absolute == image base + relative,
 * with both numbers read from the map text itself (image base from the
 * MEMORY LAYOUT Images table). A generator bug that is off by even one long
 * fails this, naming the method.
 */
export function checkMethodEntries(map: ParsedMap): CheckResult[] {
  const checks: CheckResult[] = [];
  for (const block of map.details) {
    const imageRow = map.images.find((i) => i.image === block.image);
    if (imageRow === undefined) {
      checks.push({ name: `image #${block.image} present in MEMORY LAYOUT`, passed: false, expected: 'present', actual: 'missing' });
      continue;
    }
    for (const method of block.methods) {
      const expectedAddress = imageRow.rangeStart + method.offset;
      checks.push(
        ok(
          `Method '${method.name}' (#${block.image}) absolute == image base + relative`,
          `$${expectedAddress.toString(16).toUpperCase()}`,
          `$${method.address.toString(16).toUpperCase()}`
        )
      );
    }
  }
  return checks;
}

/** Same invariant for DAT, PASM labels and Inline PASM (hub-relative ones; inline-cog rows have no `Cog $-` requirement here). */
export function checkOtherOffsetRows(map: ParsedMap): CheckResult[] {
  const checks: CheckResult[] = [];
  for (const block of map.details) {
    const imageRow = map.images.find((i) => i.image === block.image);
    if (imageRow === undefined) continue;
    for (const row of block.dat) {
      checks.push(
        ok(
          `DAT '${row.name}' (#${block.image}) absolute == image base + relative`,
          `$${(imageRow.rangeStart + row.offset).toString(16).toUpperCase()}`,
          `$${row.address.toString(16).toUpperCase()}`
        )
      );
    }
    for (const row of block.pasmLabels) {
      checks.push(
        ok(
          `PASM label '${row.name}' (#${block.image}) absolute == image base + relative`,
          `$${(imageRow.rangeStart + row.offset).toString(16).toUpperCase()}`,
          `$${row.address.toString(16).toUpperCase()}`
        )
      );
    }
    for (const row of block.inlinePasm) {
      checks.push(
        ok(
          `Inline PASM '${row.name}' (#${block.image}) absolute == image base + relative`,
          `$${(imageRow.rangeStart + row.offset).toString(16).toUpperCase()}`,
          `$${row.address.toString(16).toUpperCase()}`
        )
      );
    }
  }
  return checks;
}

/** Cross-check each MEMORY LAYOUT image base against mapOracle's independent header-walk decode of the .lst image. */
export function checkImageBasesAgainstOracle(map: ParsedMap, lstPath: string): CheckResult[] {
  const checks: CheckResult[] = [];
  const raw = readListingImage(lstPath);
  if (raw.kind !== 'spin') {
    return checks; // PASM-only: no per-image bases to cross-check beyond #1 at $00000
  }
  const program = decodeImage(raw);
  const sortedMapImages = [...map.images].sort((a, b) => a.rangeStart - b.rangeStart);
  checks.push(ok('image count (map vs mapOracle decode)', String(program.images.length), String(sortedMapImages.length)));
  for (let i = 0; i < Math.min(program.images.length, sortedMapImages.length); i++) {
    checks.push(
      ok(
        `image #${sortedMapImages[i].image} base (map vs mapOracle)`,
        `$${program.images[i].base.toString(16).toUpperCase()}`,
        `$${sortedMapImages[i].rangeStart.toString(16).toUpperCase()}`
      )
    );
  }
  if (program.problems.length > 0) {
    checks.push({ name: 'mapOracle decode is self-consistent', passed: false, expected: 'no problems', actual: program.problems.join('; ') });
  }
  return checks;
}

// --------------------------------------------------------------------------
// expected.json driven checks
// --------------------------------------------------------------------------

function checkImages(expected: ExpectedJson, map: ParsedMap): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push(ok('image count', String(expected.totals.image_count), String(map.images.length)));

  expected.images.forEach((expImage, idx) => {
    const imageNum = idx + 1;
    const block = map.details.find((d) => d.image === imageNum);
    if (block === undefined) {
      checks.push({ name: `image #${imageNum} present in OBJECT DETAILS`, passed: false, expected: 'present', actual: 'missing' });
      return;
    }
    const actualSources = block.source
      .split(',')
      .map((s) => s.trim())
      .sort();
    const expectedSources = expImage.source
      .split(',')
      .map((s) => s.trim())
      .sort();
    checks.push(ok(`image #${imageNum} source`, expectedSources.join(','), actualSources.join(',')));

    const actualMethods = block.methods.map((m) => m.name.toUpperCase()).sort();
    const expectedMethods = expImage.methods.map((m) => m.toUpperCase()).sort();
    checks.push(ok(`image #${imageNum} methods`, expectedMethods.join(','), actualMethods.join(',')));

    for (const method of expImage.methods) {
      const found = block.methods.find((m) => m.name.toUpperCase() === method.toUpperCase());
      checks.push({
        name: `Method '${method}' present in image #${imageNum}`,
        passed: found !== undefined,
        expected: 'present',
        actual: found !== undefined ? 'present' : 'missing'
      });
    }

    for (const dat of expImage.dat) {
      const found = block.dat.find((d) => d.name.toUpperCase() === dat.name.toUpperCase());
      if (found === undefined) {
        checks.push({ name: `DAT '${dat.name}' present in image #${imageNum}`, passed: false, expected: 'present', actual: 'missing' });
      } else {
        checks.push(ok(`DAT '${dat.name}' type (#${imageNum})`, dat.type, found.type));
      }
    }

    for (const label of expImage.pasm_labels) {
      const found = block.pasmLabels.find((p) => p.name.toUpperCase() === label.toUpperCase());
      checks.push({
        name: `PASM label '${label}' present in image #${imageNum}`,
        passed: found !== undefined,
        expected: 'present',
        actual: found !== undefined ? 'present' : 'missing'
      });
    }
  });

  return checks;
}

function checkInstances(expected: ExpectedJson, map: ParsedMap): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push(ok('instance count', String(expected.totals.instance_count), String(map.tree.length)));

  for (const inst of expected.instances) {
    const treeRow = map.tree.find((t) => t.path.toUpperCase() === inst.path.toUpperCase());
    if (treeRow === undefined) {
      checks.push({ name: `Instance '${inst.path}' present in OBJECT TREE`, passed: false, expected: 'present', actual: 'missing' });
      continue;
    }
    checks.push(ok(`Instance '${inst.path}' image`, `#${inst.image + 1}`, `#${treeRow.image}`));
    const expectedOverrides = inst.overrides ?? '-';
    checks.push(ok(`Instance '${inst.path}' overrides`, expectedOverrides, treeRow.overrides));

    const block = map.details.find((d) => d.image === treeRow.image);
    const instanceVars = block === undefined ? [] : block.vars.filter((v) => v.instance.toUpperCase() === inst.path.toUpperCase());

    const varBlockRow = map.varBlocks.find((v) => v.instance.toUpperCase() === inst.path.toUpperCase());

    for (const expVar of inst.vars) {
      const found = instanceVars.find((v) => v.name.toUpperCase() === expVar.name.toUpperCase());
      if (found === undefined) {
        checks.push({
          name: `VAR '${expVar.name}' in instance '${inst.path}'`,
          passed: false,
          expected: 'present',
          actual: 'missing'
        });
        continue;
      }
      checks.push(ok(`VAR '${expVar.name}' (${inst.path}) type`, expVar.type, found.type));
      checks.push(ok(`VAR '${expVar.name}' (${inst.path}) size`, String(expVar.size), String(found.size)));
      if (varBlockRow !== undefined) {
        checks.push(
          ok(
            `VAR '${expVar.name}' (${inst.path}) address == instance VAR base + offset`,
            `$${(varBlockRow.rangeStart + found.offset).toString(16).toUpperCase()}`,
            `$${found.address.toString(16).toUpperCase()}`
          )
        );
      }
    }
  }

  return checks;
}

// --------------------------------------------------------------------------
// Main entry
// --------------------------------------------------------------------------

export function verifyMapAgainstExpected(testDir: string): VerificationResult {
  const testName = path.basename(testDir);
  const checks: CheckResult[] = [];

  const expectedPath = path.join(testDir, 'expected.json');
  if (!fs.existsSync(expectedPath)) {
    return { testName, passed: false, checks: [{ name: 'Load expected.json', passed: false, expected: 'File exists', actual: 'File not found' }] };
  }
  const expected: ExpectedJson = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

  const mapPath = path.join(testDir, expected.top_file.replace(/\.spin2$/i, '.map'));
  const lstPath = path.join(testDir, expected.top_file.replace(/\.spin2$/i, '.lst'));
  if (!fs.existsSync(mapPath)) {
    return {
      testName,
      passed: false,
      checks: [{ name: 'Load map file', passed: false, expected: 'File exists', actual: `${mapPath} not found - compile with -m first` }]
    };
  }
  if (!fs.existsSync(lstPath)) {
    return {
      testName,
      passed: false,
      checks: [{ name: 'Load listing file', passed: false, expected: 'File exists', actual: `${lstPath} not found - compile with -l first` }]
    };
  }

  const map = parseMap(fs.readFileSync(mapPath, 'utf8'));

  if (expected.language_version !== undefined) {
    checks.push(ok('Language version', `Spin2_v${expected.language_version}`, `Spin2_v${map.header.languageVersion}`));
  }

  checks.push(...checkImages(expected, map));
  checks.push(...checkInstances(expected, map));
  checks.push(...checkMethodEntries(map));
  checks.push(...checkOtherOffsetRows(map));
  checks.push(...checkImageBasesAgainstOracle(map, lstPath));

  const passed = checks.every((c) => c.passed);
  return { testName, passed, checks };
}

export function formatResults(result: VerificationResult): string {
  const lines: string[] = [`=== Map Verification: ${result.testName} ===`, ''];
  for (const check of result.checks) {
    const status = check.passed ? '[PASS]' : '[FAIL]';
    lines.push(`  ${status} ${check.name}`);
    if (!check.passed) {
      lines.push(`         Expected: ${check.expected}`);
      lines.push(`         Actual:   ${check.actual}`);
    }
  }
  lines.push('', result.passed ? 'All checks passed!' : 'Some checks FAILED');
  return lines.join('\n');
}
