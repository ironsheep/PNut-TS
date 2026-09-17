/**
 * Falsification tests for verify-map.ts (Map-Instance-Correctness §5).
 *
 * These don't test the compiler — they test that our checker can actually
 * fail. A checker that always reports "passed" proves nothing about the
 * fixtures it appears to guard.
 */

'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { compileSpin2, stageTree } from '../CACHE-tests/cacheFixtures';
import { parseMap } from './mapParser';
import { checkMethodEntries, verifyMapAgainstExpected } from './verify-map';

const TEST_DIR = path.resolve(__dirname, '../../../TEST/MAP-tests');

describe('falsification: a wrong method entry (off by one long) is caught', () => {
  it('checkMethodEntries fails and names the method when Address is wrong', () => {
    const tree = stageTree(
      [path.join(TEST_DIR, 'test1-simple', 'simple_top.spin2'), path.join(TEST_DIR, 'test1-simple', 'simple_child.spin2')],
      'falsify-method'
    );
    try {
      compileSpin2(tree.dir, 'simple_top.spin2', '-l -m');
      const mapText = fs.readFileSync(path.join(tree.dir, 'simple_top.map'), 'utf8');
      const map = parseMap(mapText);

      // Sanity: the real map passes this check.
      const goodChecks = checkMethodEntries(map);
      expect(goodChecks.length).toBeGreaterThan(0);
      expect(goodChecks.every((c) => c.passed)).toBe(true);

      // Corrupt one method's printed Address by one long ($00004), as a
      // generator regression that mis-adds the image base would.
      const corruptedText = mapText.replace(/GO {7}\+\$00014 {2}\$00014/, 'GO       +$00014  $00018');
      expect(corruptedText).not.toEqual(mapText);
      const corruptedMap = parseMap(corruptedText);
      const checks = checkMethodEntries(corruptedMap);
      const failed = checks.filter((c) => !c.passed);
      expect(failed.length).toBe(1);
      expect(failed[0].name).toMatch(/Method 'GO'/);
    } finally {
      tree.cleanup();
    }
  });
});

describe('falsification: an expected.json entry that names a symbol the map lacks fails naming that symbol', () => {
  it('a wrong VAR name in expected.json fails, naming the missing symbol', () => {
    const tree = stageTree(
      [path.join(TEST_DIR, 'test1-simple', 'simple_top.spin2'), path.join(TEST_DIR, 'test1-simple', 'simple_child.spin2')],
      'falsify-var'
    );
    try {
      const goodExpected = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'test1-simple', 'expected.json'), 'utf8'));
      const bad = JSON.parse(JSON.stringify(goodExpected));
      bad.instances[0].vars[0].name = 'NOT_A_REAL_SYMBOL';
      fs.writeFileSync(path.join(tree.dir, 'expected.json'), JSON.stringify(bad));

      compileSpin2(tree.dir, 'simple_top.spin2', '-l -m');
      const result = verifyMapAgainstExpected(tree.dir);
      expect(result.passed).toBe(false);
      const failing = result.checks.filter((c) => !c.passed);
      expect(failing.some((c) => c.name.includes('NOT_A_REAL_SYMBOL'))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });

  it('a wrong method name in expected.json fails, naming the missing method', () => {
    const tree = stageTree(
      [path.join(TEST_DIR, 'test1-simple', 'simple_top.spin2'), path.join(TEST_DIR, 'test1-simple', 'simple_child.spin2')],
      'falsify-method-json'
    );
    try {
      const goodExpected = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'test1-simple', 'expected.json'), 'utf8'));
      const bad = JSON.parse(JSON.stringify(goodExpected));
      bad.images[0].methods[0] = 'notARealMethod';
      fs.writeFileSync(path.join(tree.dir, 'expected.json'), JSON.stringify(bad));

      compileSpin2(tree.dir, 'simple_top.spin2', '-l -m');
      const result = verifyMapAgainstExpected(tree.dir);
      expect(result.passed).toBe(false);
      const failing = result.checks.filter((c) => !c.passed);
      expect(failing.some((c) => c.name.toLowerCase().includes('notarealmethod'))).toBe(true);
    } finally {
      tree.cleanup();
    }
  });
});
