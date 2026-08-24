/**
 * Map File Verification Tests
 *
 * Tests that verify .map file output matches .lst file and expected.json
 */

/* eslint-disable no-console */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { verifyMapAgainstExpected, formatResults } from './verify-map';

// When compiled to dist/tests/MAP-tests/, __dirname is dist/tests/MAP-tests/
const COMPILER_PATH = path.resolve(__dirname, '../../pnut-ts.js');
// Test data files are in TEST/MAP-tests/, not the dist folder
const TEST_DIR = path.resolve(__dirname, '../../../TEST/MAP-tests');

function compileTest(testDir: string, topFile: string): void {
  const sourceFile = path.join(testDir, topFile);
  try {
    execSync(`node ${COMPILER_PATH} -l -m ${sourceFile}`, {
      cwd: testDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (error: unknown) {
    if (error instanceof Error && 'stderr' in error) {
      throw new Error(`Compilation failed: ${(error as { stderr: string }).stderr}`);
    }
    throw error;
  }
}

function cleanupGeneratedFiles(testDir: string): void {
  const extensions = ['.lst', '.map', '.obj', '.bin'];
  const files = fs.readdirSync(testDir);
  for (const file of files) {
    if (extensions.some((ext) => file.endsWith(ext))) {
      fs.unlinkSync(path.join(testDir, file));
    }
  }
}

describe('Map File Verification', () => {
  describe('test1-simple', () => {
    const testDir = path.join(TEST_DIR, 'test1-simple');
    const expectedJson = JSON.parse(fs.readFileSync(path.join(testDir, 'expected.json'), 'utf8'));

    beforeAll(() => {
      compileTest(testDir, expectedJson.top_file);
    });

    afterAll(() => {
      cleanupGeneratedFiles(testDir);
    });

    it('should verify map matches listing and expected values', () => {
      const result = verifyMapAgainstExpected(testDir);
      if (!result.passed) {
        console.log(formatResults(result));
      }
      expect(result.passed).toBe(true);
    });

    it('should have correct object count', () => {
      const result = verifyMapAgainstExpected(testDir);
      const objectCheck = result.checks.find((c) => c.name === 'Object count');
      expect(objectCheck?.passed).toBe(true);
    });

    it('should have correct VAR symbol count', () => {
      const result = verifyMapAgainstExpected(testDir);
      const varCheck = result.checks.find((c) => c.name === 'VAR symbol count (top object)');
      expect(varCheck?.passed).toBe(true);
    });

    it('should have correct OBJ bytes', () => {
      const result = verifyMapAgainstExpected(testDir);
      const bytesCheck = result.checks.find((c) => c.name === 'OBJ bytes match');
      expect(bytesCheck?.passed).toBe(true);
    });
  });

  describe('test2-deep', () => {
    const testDir = path.join(TEST_DIR, 'test2-deep');
    const expectedJson = JSON.parse(fs.readFileSync(path.join(testDir, 'expected.json'), 'utf8'));

    beforeAll(() => {
      compileTest(testDir, expectedJson.top_file);
    });

    afterAll(() => {
      cleanupGeneratedFiles(testDir);
    });

    it('should verify map matches listing and expected values', () => {
      const result = verifyMapAgainstExpected(testDir);
      if (!result.passed) {
        console.log(formatResults(result));
      }
      expect(result.passed).toBe(true);
    });

    it('should have correct object count for deep hierarchy', () => {
      const result = verifyMapAgainstExpected(testDir);
      const objectCheck = result.checks.find((c) => c.name === 'Object count');
      expect(objectCheck?.passed).toBe(true);
      expect(objectCheck?.expected).toBe('3'); // 3 deep levels
    });
  });

  describe('test3-wide', () => {
    const testDir = path.join(TEST_DIR, 'test3-wide');
    const expectedJson = JSON.parse(fs.readFileSync(path.join(testDir, 'expected.json'), 'utf8'));

    beforeAll(() => {
      compileTest(testDir, expectedJson.top_file);
    });

    afterAll(() => {
      cleanupGeneratedFiles(testDir);
    });

    it('should verify map matches listing and expected values', () => {
      const result = verifyMapAgainstExpected(testDir);
      if (!result.passed) {
        console.log(formatResults(result));
      }
      expect(result.passed).toBe(true);
    });

    it('should have correct object count for wide hierarchy', () => {
      const result = verifyMapAgainstExpected(testDir);
      const objectCheck = result.checks.find((c) => c.name === 'Object count');
      expect(objectCheck?.passed).toBe(true);
      expect(objectCheck?.expected).toBe('4'); // 1 top + 3 children
    });
  });

  describe('test4-override', () => {
    const testDir = path.join(TEST_DIR, 'test4-override');
    const expectedJson = JSON.parse(fs.readFileSync(path.join(testDir, 'expected.json'), 'utf8'));

    beforeAll(() => {
      compileTest(testDir, expectedJson.top_file);
    });

    afterAll(() => {
      cleanupGeneratedFiles(testDir);
    });

    it('should verify map matches listing and expected values', () => {
      const result = verifyMapAgainstExpected(testDir);
      if (!result.passed) {
        console.log(formatResults(result));
      }
      expect(result.passed).toBe(true);
    });

    it('should have correct object count for override instances', () => {
      const result = verifyMapAgainstExpected(testDir);
      const objectCheck = result.checks.find((c) => c.name === 'Object count');
      expect(objectCheck?.passed).toBe(true);
      expect(objectCheck?.expected).toBe('4'); // 1 top + 3 instances of param_child
    });

    it('should have correct OBJ bytes', () => {
      const result = verifyMapAgainstExpected(testDir);
      const bytesCheck = result.checks.find((c) => c.name === 'OBJ bytes match');
      expect(bytesCheck?.passed).toBe(true);
    });
  });

  /**
   * The index sections are lookups, and a lookup that omits an image or prints
   * a non-address is worse than no lookup at all. test4-override forks one
   * source file into three images, which is the case that exposed both faults:
   * every symbol appeared once, at the first image's base, and method rows
   * carried header-table slot indices in a column headed "Address".
   */
  describe('test4-override — index sections describe every image', () => {
    const testDir = path.join(TEST_DIR, 'test4-override');
    const expectedJson = JSON.parse(fs.readFileSync(path.join(testDir, 'expected.json'), 'utf8'));
    let mapText = '';

    beforeAll(() => {
      compileTest(testDir, expectedJson.top_file);
      mapText = fs.readFileSync(path.join(testDir, expectedJson.top_file.replace(/\.spin2$/, '.map')), 'utf8');
    });

    afterAll(() => {
      cleanupGeneratedFiles(testDir);
    });

    function sectionOf(name: string): string[] {
      const lines = mapText.split(/\r?\n/);
      const start = lines.findIndex((l) => l.startsWith(`=== ${name} ===`));
      expect(start).toBeGreaterThanOrEqual(0);
      const rest = lines.slice(start + 1);
      const end = rest.findIndex((l) => l.startsWith('=== '));
      return (end === -1 ? rest : rest.slice(0, end)).filter((l) => l.trim().length > 0);
    }

    it('SYMBOL INDEX carries one row per instance, each at its own address', () => {
      const rows = sectionOf('SYMBOL INDEX').filter((l) => /^\s+COMPUTE\s/.test(l));
      expect(rows).toHaveLength(3);

      const instances = rows.map((l) => l.trim().split(/\s+/)[2]);
      expect(instances.sort()).toEqual(['CHILD1', 'CHILD2', 'CHILD3']);

      const addresses = rows.map((l) => l.trim().split(/\s+/)[4]);
      expect(new Set(addresses).size).toBe(3);
    });

    it('ADDRESS INDEX lists every image and stays in ascending address order', () => {
      const rows = sectionOf('ADDRESS INDEX').filter((l) => /^\s+\$[0-9A-F]+\s/.test(l));
      const addresses = rows.map((l) => parseInt(l.trim().split(/\s+/)[0].replace('$', ''), 16));
      expect(addresses).toEqual([...addresses].sort((a, b) => a - b));

      // Three CODE rows for param_child — one per image, not one per file.
      const codeRows = rows.filter((l) => /\sCODE\s/.test(l) && /param_child/.test(l));
      expect(codeRows).toHaveLength(3);
    });

    it('every METHOD address falls inside its own object, not at a slot index', () => {
      const layout = sectionOf('MEMORY LAYOUT')
        .map((l) => l.match(/^\s*\$([0-9A-F]+)\s+\$([0-9A-F]+)\s+\d+\s+(\S+)\s+(\S+)/))
        .filter((m): m is RegExpMatchArray => m !== null && m[3] !== 'VAR')
        .map((m) => ({ start: parseInt(m[1], 16), end: parseInt(m[2], 16), instance: m[4] }));
      expect(layout.length).toBeGreaterThan(0);

      const methodRows = sectionOf('ADDRESS INDEX').filter((l) => /\sMETHOD\s/.test(l));
      expect(methodRows.length).toBeGreaterThan(0);

      for (const row of methodRows) {
        const parts = row.trim().split(/\s+/);
        const address = parseInt(parts[0].replace('$', ''), 16);
        const instance = parts[2];
        const owner = layout.find((o) => o.instance === instance);
        expect(owner).toBeDefined();
        // A slot index would be a small number far below its object's base.
        expect(address).toBeGreaterThanOrEqual(owner!.start);
        expect(address).toBeLessThanOrEqual(owner!.end);
      }
    });
  });

  describe('test7-version', () => {
    const testDir = path.join(TEST_DIR, 'test7-version');
    const expectedJson = JSON.parse(fs.readFileSync(path.join(testDir, 'expected.json'), 'utf8'));

    beforeAll(() => {
      compileTest(testDir, expectedJson.top_file);
    });

    afterAll(() => {
      cleanupGeneratedFiles(testDir);
    });

    it('should verify map matches listing and expected values', () => {
      const result = verifyMapAgainstExpected(testDir);
      if (!result.passed) {
        console.log(formatResults(result));
      }
      expect(result.passed).toBe(true);
    });

    it('should have correct language version from directive', () => {
      const result = verifyMapAgainstExpected(testDir);
      const versionCheck = result.checks.find((c) => c.name === 'Language version');
      expect(versionCheck?.passed).toBe(true);
      expect(versionCheck?.expected).toBe('Spin2_v45');
    });
  });
});
