/** @format */

// Compile-time QLOG / QEXP (src/utils/cordicQ.ts) against known PNut values.
//
// The port reproduces PNut's integer CORDIC (REF-V52A/p2com.asm cordic_q) bit
// for bit; the float approximation it replaced was off by 1..3 in the LSBs and
// wrapped QLOG($FFFFFFFF) to 0. Every expectation below names its source.

'use strict';

import fs from 'fs';
import path from 'path';
import { ITERATIONS, QEXP_X_INIT, ZDELTAS, cordic_qexp, cordic_qlog } from '../../utils/cordicQ';

interface iKnownValue {
  input: number;
  expected: number;
  source: string;
}

function hex(value: number): string {
  return `$${(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function named(values: iKnownValue[]): (iKnownValue & { name: string })[] {
  return values.map((value) => ({ ...value, name: hex(value.input) }));
}

// Windows PNut v55 GOLD: both constants are folded into TEST/COV-tests/coverage_004.obj.GOLD
const qlogFromPNutGold: iKnownValue[] = [{ input: 0x439eb72f, expected: 0xf0a290cc, source: 'coverage_004.obj.GOLD' }];
const qexpFromPNutGold: iKnownValue[] = [{ input: 0xf73d41fd, expected: 0x77d5e078, source: 'coverage_004.obj.GOLD' }];

// Values recorded beside the commented-out inputs in TEST/COV-tests/coverage_004.spin2
const qlogFromCoverageNotes: iKnownValue[] = [{ input: 0xd83790b2, expected: 0xfe0cfa26, source: 'coverage_004.spin2 note' }];
const qexpFromCoverageNotes: iKnownValue[] = [
  { input: 0xe3a3b5b6, expected: 0x15ee7a9e, source: 'coverage_004.spin2 note' },
  { input: 0xe6c6723e, expected: 0x1cc72f24, source: 'coverage_004.spin2 note' }
];

// TEST/SHORT/resolverTESTs/dumpTables.resolv.GOLD rows
const qlogFromResolverTable: iKnownValue[] = [
  { input: 0x00000000, expected: 0x00000000, source: 'dumpTables [036]' },
  { input: 0x00000001, expected: 0x00000000, source: 'dumpTables [037]' },
  { input: 0x0001e5e0, expected: 0x87654187, source: 'dumpTables [038]' },
  { input: 0xffffffff, expected: 0xffffffff, source: 'dumpTables [039]' }
];
const qexpFromResolverTable: iKnownValue[] = [
  { input: 0x00000000, expected: 0x00000001, source: 'dumpTables [040]' },
  { input: 0x87654321, expected: 0x0001e5e0, source: 'dumpTables [041]' }
];

// dumpTables [042] expects QEXP($EDCBA987) = $34DF5948. That table is not
// Windows PNut output (it is generated from REF/OperatorTests.txt), and the
// port gives $34DF5949 — the correctly rounded value (2^(x/2^27) = 887052616.68),
// consistent with PNut's rounding on every GOLD-backed value above. Pending the
// Windows GOLD of TEST/COV-tests/coverage_qlog_qexp.spin2, which folds this input.
const qexpPendingAdjudication: iKnownValue[] = [{ input: 0xedcba987, expected: 0x34df5948, source: 'dumpTables [042]' }];

describe('cordic_qlog matches PNut', () => {
  test.each(named([...qlogFromPNutGold, ...qlogFromCoverageNotes, ...qlogFromResolverTable]))('QLOG $name ($source)', ({ input, expected }) => {
    expect(hex(cordic_qlog(input))).toBe(hex(expected));
  });
});

describe('cordic_qexp matches PNut', () => {
  test.each(named([...qexpFromPNutGold, ...qexpFromCoverageNotes, ...qexpFromResolverTable]))('QEXP $name ($source)', ({ input, expected }) => {
    expect(hex(cordic_qexp(input))).toBe(hex(expected));
  });
  test.skip.each(named(qexpPendingAdjudication))('QEXP $name ($source) — pending Windows GOLD adjudication', ({ input, expected }) => {
    expect(hex(cordic_qexp(input))).toBe(hex(expected));
  });
});

describe('cordic_q results are unsigned 32-bit', () => {
  const inputs: number[] = [0x00000000, 0x00000001, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff];
  test.each(inputs)('QLOG/QEXP of %p stay in 0..$FFFFFFFF', (input) => {
    for (const result of [cordic_qlog(input), cordic_qexp(input)]) {
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

// Transcription audit: the port's tables and call sequence against PNut's source.
// REF-V52A/ is gitignored (not in public clones), so this is skipped where absent.
const asmFSpec: string = path.resolve(__dirname, '../../../REF-V52A/p2com.asm');
const describeWithAsm = fs.existsSync(asmFSpec) ? describe : describe.skip;

describeWithAsm('cordicQ transcription matches REF-V52A/p2com.asm', () => {
  const asmLines: string[] = fs.existsSync(asmFSpec) ? fs.readFileSync(asmFSpec, 'utf8').split(/\r?\n/) : [];
  const start: number = asmLines.findIndex((line) => line.startsWith('cordic_qlog:'));
  const end: number = asmLines.findIndex((line, index) => index > start && /^dbx\s+@@exp/.test(line));
  const routine: string[] = asmLines.slice(start, end);

  test('routine located', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
  });

  test('@@zdeltas table', () => {
    const tableStart: number = routine.findIndex((line) => line.startsWith('@@zdeltas:'));
    const deltas: bigint[] = [];
    for (let index = tableStart; index < routine.length; index++) {
      const match = routine[index].match(/\bdq\s+([0-9A-Fa-f]+)h/);
      if (match === null) {
        break;
      }
      deltas.push(BigInt(`0x${match[1]}`));
    }
    expect(deltas.map((value) => value.toString(16))).toEqual(ZDELTAS.map((value) => value.toString(16)));
  });

  test('@@iterations call sequence', () => {
    const iterStart: number = routine.findIndex((line) => line.startsWith('@@iterations:'));
    const steps: string[] = [];
    for (let index = iterStart + 1; index < routine.length; index++) {
      const match = routine[index].match(/^\s+call\s+@@(sec|sec_next|adj_next)\b/);
      if (match === null) {
        if (steps.length > 0 && !/^\s*$/.test(routine[index])) {
          break;
        }
        continue;
      }
      steps.push(match[1]);
    }
    expect(steps).toEqual([...ITERATIONS]);
  });

  test('@@exp_pre x initializer', () => {
    const text: string = routine.join('\n');
    const low = text.match(/mov\s+\[@@x\+0\],([0-9A-Fa-f]+)h\s+;init x/);
    const high = text.match(/mov\s+\[@@x\+4\],([0-9A-Fa-f]+)h/);
    expect(low).not.toBeNull();
    expect(high).not.toBeNull();
    const value: bigint = (BigInt(`0x${high![1]}`) << 32n) | BigInt(`0x${low![1]}`);
    expect(value.toString(16)).toBe(QEXP_X_INIT.toString(16));
  });
});
