/** @format */

// Compile-time integer comparisons and float-literal scanning, through the compiler.
//
// Integer comparisons: PNut folds <, <=, ==, <>, >=, >, <=> with @@cmp -> @@cmp1
// ('cmp eax,ecx' then jl / jg, a SIGNED compare) and @@logic (true = $FFFFFFFF);
// #> / <# use 'cmp eax,ecx' with jge / jle (signed); +<, +<=, +>, +>= use @@cmpu
// (jb / ja, unsigned). No GOLD in the corpus folds a signed comparison, so the
// expected values below are read from REF-V52A/p2com.asm.
//
// Float literals: PNut's scanner (@@con / @@con4) makes a decimal constant a float when
// its digits are followed by '.' and a digit, or by 'E'/'e', then get_float scans it and
// any c=1 is error_fpcmbw. '1.' stays integer 1 followed by '.', which the CON
// assignment rejects in get_comma_or_end (error_ecoeol); '.5' is not a constant and the
// expression term falls through to error_eacuool.

'use strict';

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const toolPath: string = path.resolve(__dirname, '../../../dist/pnut-ts.js');
const workDir: string = fs.mkdtempSync(path.join(os.tmpdir(), 'pnut-scan-cmp-'));

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

interface iCompileResult {
  symbols: Map<string, string>; // NAME -> 'TYPE VALUE'
  error: string;
}

function compileCon(name: string, conLines: string[]): iCompileResult {
  const spinFSpec: string = path.join(workDir, `${name}.spin2`);
  const listingFSpec: string = path.join(workDir, `${name}.lst`);
  fs.writeFileSync(spinFSpec, `CON\n${conLines.map((line) => `  ${line}`).join('\n')}\n\nPUB go()\n`);
  let error: string = '';
  try {
    execSync(`node ${toolPath} -l ${spinFSpec}`, { stdio: 'pipe' });
  } catch (caught) {
    const output: string = `${(caught as { stdout?: Buffer }).stdout ?? ''}${(caught as { stderr?: Buffer }).stderr ?? ''}`;
    const match = output.match(/:error:(.*)/);
    error = match !== null ? match[1].trim() : output;
  }
  const symbols = new Map<string, string>();
  if (error === '' && fs.existsSync(listingFSpec)) {
    for (const match of fs.readFileSync(listingFSpec, 'utf8').matchAll(/TYPE:\s+(\S+)\s+VALUE:\s+([0-9A-F]{8})\s+NAME:\s+(\w+)/g)) {
      symbols.set(match[3], `${match[1]} ${match[2]}`);
    }
  }
  return { symbols, error };
}

const TRUE: string = 'CON_INT FFFFFFFF';
const FALSE: string = 'CON_INT 00000000';

const comparisons: { name: string; expression: string; expected: string }[] = [
  // > (@@gt -> @@cmp1, signed)
  { name: 'GT_M1_0', expression: '-1 > 0', expected: FALSE },
  { name: 'GT_0_M1', expression: '0 > -1', expected: TRUE },
  { name: 'GT_MIN_MAX', expression: '$8000_0000 > $7FFF_FFFF', expected: FALSE },
  { name: 'GT_MAX_MIN', expression: '$7FFF_FFFF > $8000_0000', expected: TRUE },
  // >= (@@gte -> @@cmp1, signed)
  { name: 'GTE_M1_0', expression: '-1 >= 0', expected: FALSE },
  { name: 'GTE_0_M1', expression: '0 >= -1', expected: TRUE },
  { name: 'GTE_MIN_MAX', expression: '$8000_0000 >= $7FFF_FFFF', expected: FALSE },
  { name: 'GTE_MAX_MIN', expression: '$7FFF_FFFF >= $8000_0000', expected: TRUE },
  { name: 'GTE_EQ', expression: '-5 >= -5', expected: TRUE },
  // < (@@lt -> @@cmp1, signed)
  { name: 'LT_M1_0', expression: '-1 < 0', expected: TRUE },
  { name: 'LT_0_M1', expression: '0 < -1', expected: FALSE },
  { name: 'LT_MIN_MAX', expression: '$8000_0000 < $7FFF_FFFF', expected: TRUE },
  // <= (@@lte -> @@cmp1, signed)
  { name: 'LTE_M1_0', expression: '-1 <= 0', expected: TRUE },
  { name: 'LTE_0_M1', expression: '0 <= -1', expected: FALSE },
  { name: 'LTE_MAX_MIN', expression: '$7FFF_FFFF <= $8000_0000', expected: FALSE },
  // == / <> (@@e / @@ne -> @@cmp1)
  { name: 'E_M1_FFFFFFFF', expression: '-1 == $FFFF_FFFF', expected: TRUE },
  { name: 'E_MIN_MAX', expression: '$8000_0000 == $7FFF_FFFF', expected: FALSE },
  { name: 'NE_M1_0', expression: '-1 <> 0', expected: TRUE },
  { name: 'NE_M1_FFFFFFFF', expression: '-1 <> $FFFF_FFFF', expected: FALSE },
  // <=> (@@ltegt: @@cmp, then greater -> 1)
  { name: 'LTEGT_M1_0', expression: '-1 <=> 0', expected: TRUE },
  { name: 'LTEGT_0_M1', expression: '0 <=> -1', expected: 'CON_INT 00000001' },
  { name: 'LTEGT_MIN_MAX', expression: '$8000_0000 <=> $7FFF_FFFF', expected: TRUE },
  { name: 'LTEGT_EQ', expression: '-3 <=> -3', expected: FALSE },
  // #> / <# (@@fge / @@fle integer: cmp eax,ecx ; jge / jle, signed)
  { name: 'FGE_M1_0', expression: '-1 #> 0', expected: 'CON_INT 00000000' },
  { name: 'FGE_MIN_MAX', expression: '$8000_0000 #> $7FFF_FFFF', expected: 'CON_INT 7FFFFFFF' },
  { name: 'FLE_M1_0', expression: '-1 <# 0', expected: 'CON_INT FFFFFFFF' },
  { name: 'FLE_MIN_MAX', expression: '$8000_0000 <# $7FFF_FFFF', expected: 'CON_INT 80000000' },
  // unsigned forms (@@cmpu: jb / ja), for contrast
  { name: 'GTU_M1_0', expression: '-1 +> 0', expected: TRUE },
  { name: 'GTEU_M1_0', expression: '-1 +>= 0', expected: TRUE },
  { name: 'LTU_M1_0', expression: '-1 +< 0', expected: FALSE },
  { name: 'LTEU_M1_0', expression: '-1 +<= 0', expected: FALSE }
];

describe('integer comparisons fold as PNut does (signed @@cmp1, unsigned @@cmpu)', () => {
  let result: iCompileResult;
  beforeAll(() => {
    result = compileCon(
      'compare',
      comparisons.map((entry) => `${entry.name} = ${entry.expression}`)
    );
  });
  test('fixture compiles', () => {
    expect(result.error).toBe('');
  });
  test.each(comparisons)('$expression', ({ name, expected }) => {
    expect(result.symbols.get(name)).toBe(expected);
  });
});

const FPCMBW: string = 'Floating-point constant must be within +/- 3.4e+38';

const literalForms: { form: string; expected: string }[] = [
  { form: '1e5', expected: 'CON_FLOAT 47C35000' }, // 'E' after digits: float without a '.'
  { form: '1.5E5', expected: 'CON_FLOAT 48127C00' }, // uppercase 'E'
  { form: '1.5e+5', expected: 'CON_FLOAT 48127C00' },
  { form: '1e-6', expected: 'CON_FLOAT 358637BD' }, // contest2.lst.GOLD MICRO
  { form: '1_0e6', expected: 'CON_FLOAT 4B189680' }, // contest2.lst.GOLD MARKED
  { form: '1_000.0', expected: 'CON_FLOAT 447A0000' }, // underscores in the digits
  { form: '1.5_', expected: 'CON_FLOAT 3FC00000' }, // trailing '_' is part of the constant
  { form: '1.5e5_', expected: 'CON_FLOAT 48127C00' }, // trailing '_' after exponent digits
  { form: '1.5e', expected: `error ${FPCMBW}` }, // get_float: no exponent digit
  { form: '1e', expected: `error ${FPCMBW}` },
  { form: '1.5e+', expected: `error ${FPCMBW}` },
  { form: '1.5e-', expected: `error ${FPCMBW}` },
  { form: '1e+_5', expected: `error ${FPCMBW}` }, // first exponent chr must be a digit
  { form: '1ex', expected: `error ${FPCMBW}` }, // 'E' always commits to a float
  { form: '1e39', expected: `error ${FPCMBW}` }, // base10 exponent > 38
  { form: '1.', expected: 'error Expected "," or end of line' }, // integer 1, then '.'
  { form: '1._5', expected: 'error Expected "," or end of line' }, // '.' not followed by a digit
  { form: '1.5.3', expected: 'error Expected "," or end of line' }, // get_float stops at the second '.'
  { form: '.5', expected: 'error Expected a constant, unary operator, or "("' } // not a constant
];

describe('float literal forms scan as PNut does', () => {
  test.each(literalForms)('X = $form', ({ form, expected }) => {
    const result: iCompileResult = compileCon(`form_${literalForms.findIndex((entry) => entry.form === form)}`, [`X = ${form}`]);
    const actual: string = result.error !== '' ? `error ${result.error}` : (result.symbols.get('X') ?? '<no X>');
    expect(actual).toBe(expected);
  });
});
