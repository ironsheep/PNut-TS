/** @format */

// Compile-time floating point (src/utils/pnutFloat.ts) against Windows PNut output.
//
// The port reproduces PNut's x86 float package (REF-V52A/p2com.asm get_float and
// fp_*) bit for bit. The JS-double code it replaced parsed literals with correct
// IEEE rounding and folded LOG/EXP/POW in double precision, so it disagreed with
// PNut by 1 ULP on constants such as 3.14159 and 10.0 POW 2.0. Every expectation
// below names the GOLD file it was read from.

'use strict';

import fs from 'fs';
import path from 'path';
import {
  TENS,
  fp_add,
  fp_cmp,
  fp_div,
  fp_exp,
  fp_exp10,
  fp_exp2,
  fp_float,
  fp_fge,
  fp_fle,
  fp_log,
  fp_log10,
  fp_log2,
  fp_mul,
  fp_pow,
  fp_round,
  fp_sqrt,
  fp_sub,
  fp_trunc,
  get_float
} from '../../utils/pnutFloat';

function hex(value: number): string {
  return `$${(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function lit(text: string): number {
  const result = get_float(text);
  expect(result.carry).toBe(false);
  return result.value;
}

function neg(value: number): number {
  return (value ^ 0x80000000) >>> 0;
}

function ieeeSingle(value: number): number {
  const buffer: Buffer = Buffer.alloc(4);
  buffer.writeFloatLE(value);
  return buffer.readUInt32LE();
}

// CON float symbols defined by a single literal, VALUE read from the GOLD listing
const literalsFromGold: { text: string; expected: number; source: string }[] = [
  { text: '6.6', expected: 0x40d33333, source: 'CON-tests/Snippet_001.lst.GOLD TEST_FLOAT' },
  { text: '6.28318530718', expected: 0x40c90fda, source: 'CON-tests/Snippet_002.lst.GOLD TWOPI' },
  { text: '2.718281825', expected: 0x402df855, source: 'CON-tests/Snippet_002.lst.GOLD CONST_E' },
  { text: '1.0', expected: 0x3f800000, source: 'CON-tests/Snippet_002.lst.GOLD CONST_ONE' },
  { text: '3.3219281', expected: 0x40549a79, source: 'CON-tests/Snippet_002.lst.GOLD LOG2_10' },
  { text: '1.4426950409', expected: 0x3fb8aa3b, source: 'CON-tests/Snippet_002.lst.GOLD LOG2_E' },
  { text: '0.6931472', expected: 0x3f317218, source: 'CON-tests/Snippet_002.lst.GOLD LOGE_2' },
  { text: '1.570_796_3268', expected: 0x3fc90fda, source: 'CON-tests/contest2.lst.GOLD HALFPI' },
  { text: '1e9', expected: 0x4e6e6b28, source: 'CON-tests/contest2.lst.GOLD NEGG (= -1e9, sign applied by the resolver)' },
  { text: '1e-6', expected: 0x358637bd, source: 'CON-tests/contest2.lst.GOLD MICRO' },
  { text: '1_0e6', expected: 0x4b189680, source: 'CON-tests/contest2.lst.GOLD MARKED' },
  { text: '3.55', expected: 0x40633333, source: 'COV-tests/coverage_002.lst.GOLD MISC_FLOAT' },
  { text: '10.0', expected: 0x41200000, source: 'LARGE-tests/BLDC-Motor-drv/isp_bldc_motor.lst.GOLD F_SCALE_WATTS' },
  {
    text: '3.14159',
    expected: 0x40490fcf,
    source: 'LARGE-tests/BLDC-Motor-drv/isp_dist_utils.lst.GOLD KPI; V52A-tests/v49_test_struct_child PI_APPROX'
  },
  { text: '25.4', expected: 0x41cb3333, source: 'LARGE-tests/BLDC-Motor-drv/isp_dist_utils.lst.GOLD KMM_IN_INCH' },
  { text: '0.03937', expected: 0x3d214270, source: 'LARGE-tests/BLDC-Motor-drv/isp_dist_utils.lst.GOLD KINCH_IN_MM' },
  { text: '0.00328084', expected: 0x3b57035c, source: 'LARGE-tests/BLDC-Motor-drv/isp_dist_utils.lst.GOLD KFPS_IN_MMPS' },
  { text: '0.0036', expected: 0x3b6bedfa, source: 'LARGE-tests/BLDC-Motor-drv/isp_dist_utils.lst.GOLD KKMH_IN_MMPS' },
  { text: '0.681818', expected: 0x3f2e8ba0, source: 'LARGE-tests/BLDC-Motor-drv/isp_dist_utils.lst.GOLD KMPH_IN_FPS' }
];

describe('get_float matches PNut literal parsing', () => {
  test.each(literalsFromGold)('$text ($source)', ({ text, expected }) => {
    expect(hex(lit(text))).toBe(hex(expected));
  });

  // the old parser rounded these correctly (IEEE) and so disagreed with PNut
  test.each(['6.28318530718', '1.570_796_3268', '3.14159', '2.718281825', '3.3219281', '0.00328084'])('%s is not IEEE-rounded', (text) => {
    expect(hex(lit(text))).not.toBe(hex(ieeeSingle(Number(text.replace(/_/g, '')))));
  });

  test('invalid constants set carry (error_fpcmbw)', () => {
    expect(get_float('1e39').carry).toBe(true); // base10 exponent > 38
    expect(get_float('1e256').carry).toBe(true); // exponent byte overflow
    expect(get_float('1.5e').carry).toBe(true); // no exponent digit
    expect(get_float('3.4e38').carry).toBe(false);
  });

  test('length stops where the asm stops scanning', () => {
    expect(get_float('1.5.3').length).toBe(3); // second '.'
    expect(get_float('1.5e3.2').length).toBe(5); // non-digit after the exponent
    expect(get_float('1_000.0_ + 2').length).toBe(8); // underscores are consumed
    expect(get_float('2.5').length).toBe(3); // end of text
  });

  test('zero and underflow give 0.0', () => {
    expect(get_float('0.0')).toEqual({ value: 0, carry: false, length: 3 });
    expect(get_float('1e-46')).toEqual({ value: 0, carry: false, length: 5 });
  });
});

// TEST/V52A-tests/v51a_test_math_functions.lst.GOLD — results[0..33] are folded at
// compile time and pushed as constants. -x is the resolver's sign flip of literal x.
const operatorsFromGold: { name: string; compute: () => number; expected: number }[] = [
  { name: 'LOG2(1.0)', compute: () => fp_log2(lit('1.0')), expected: 0x00000000 },
  { name: 'LOG2(2.0)', compute: () => fp_log2(lit('2.0')), expected: 0x3f800000 },
  { name: 'LOG2(4.0)', compute: () => fp_log2(lit('4.0')), expected: 0x40000000 },
  { name: 'LOG2(8.0)', compute: () => fp_log2(lit('8.0')), expected: 0x40400000 },
  { name: 'LOG2(0.5)', compute: () => fp_log2(lit('0.5')), expected: 0xbf800000 },
  { name: 'LOG2(0.25)', compute: () => fp_log2(lit('0.25')), expected: 0xc0000000 },
  { name: 'LOG10(1.0)', compute: () => fp_log10(lit('1.0')), expected: 0x00000000 },
  { name: 'LOG10(10.0)', compute: () => fp_log10(lit('10.0')), expected: 0x3f800000 },
  { name: 'LOG10(100.0)', compute: () => fp_log10(lit('100.0')), expected: 0x40000000 },
  { name: 'LOG10(1000.0)', compute: () => fp_log10(lit('1000.0')), expected: 0x40400000 },
  { name: 'LOG10(0.1)', compute: () => fp_log10(lit('0.1')), expected: 0xbf800000 },
  { name: 'LOG10(0.01)', compute: () => fp_log10(lit('0.01')), expected: 0xc0000000 },
  { name: 'LOG(1.0)', compute: () => fp_log(lit('1.0')), expected: 0x00000000 },
  { name: 'LOG(2.718281828)', compute: () => fp_log(lit('2.718281828')), expected: 0x3f800000 },
  { name: 'EXP2(0.0)', compute: () => fp_exp2(lit('0.0')), expected: 0x3f800000 },
  { name: 'EXP2(1.0)', compute: () => fp_exp2(lit('1.0')), expected: 0x40000000 },
  { name: 'EXP2(2.0)', compute: () => fp_exp2(lit('2.0')), expected: 0x40800000 },
  { name: 'EXP2(3.0)', compute: () => fp_exp2(lit('3.0')), expected: 0x41000000 },
  { name: 'EXP2(-1.0)', compute: () => fp_exp2(neg(lit('1.0'))), expected: 0x3f000000 },
  { name: 'EXP2(0.5)', compute: () => fp_exp2(lit('0.5')), expected: 0x3fb504f3 },
  { name: 'EXP10(0.0)', compute: () => fp_exp10(lit('0.0')), expected: 0x3f800000 },
  { name: 'EXP10(1.0)', compute: () => fp_exp10(lit('1.0')), expected: 0x41200000 },
  { name: 'EXP10(2.0)', compute: () => fp_exp10(lit('2.0')), expected: 0x42c80000 },
  { name: 'EXP10(-1.0)', compute: () => fp_exp10(neg(lit('1.0'))), expected: 0x3dcccccd },
  { name: 'EXP10(0.5)', compute: () => fp_exp10(lit('0.5')), expected: 0x404a62c2 },
  { name: 'EXP(0.0)', compute: () => fp_exp(lit('0.0')), expected: 0x3f800000 },
  { name: 'EXP(1.0)', compute: () => fp_exp(lit('1.0')), expected: 0x402df854 },
  { name: 'EXP(-1.0)', compute: () => fp_exp(neg(lit('1.0'))), expected: 0x3ebc5ab2 },
  { name: '2.0 POW 3.0', compute: () => fp_pow(lit('2.0'), lit('3.0')), expected: 0x41000000 },
  { name: '2.0 POW 0.0', compute: () => fp_pow(lit('2.0'), lit('0.0')), expected: 0x3f800000 },
  { name: '10.0 POW 2.0 (also spin_builtin_math_v51.obj.GOLD)', compute: () => fp_pow(lit('10.0'), lit('2.0')), expected: 0x42c7ffff },
  { name: '2.0 POW 0.5', compute: () => fp_pow(lit('2.0'), lit('0.5')), expected: 0x3fb504f3 },
  { name: '2.0 POW -1.0', compute: () => fp_pow(lit('2.0'), neg(lit('1.0'))), expected: 0x3f000000 },
  { name: '3.0 POW 4.0', compute: () => fp_pow(lit('3.0'), lit('4.0')), expected: 0x42a20000 }
];

describe('fp_ operators match PNut (v51a_test_math_functions.lst.GOLD)', () => {
  test.each(operatorsFromGold)('$name', ({ compute, expected }) => {
    expect(hex(compute())).toBe(hex(expected));
  });
});

describe('fp_div / fp_round match PNut (CON-tests/contest2.lst.GOLD)', () => {
  test('QUARPI = HalfPi / 2.0', () => {
    expect(hex(fp_div(lit('1.570_796_3268'), lit('2.0')).value)).toBe('$3F490FDA');
  });
  test('ZZ = ROUND(4000.0 / QuarPi)', () => {
    const quarPi: number = fp_div(lit('1.570_796_3268'), lit('2.0')).value;
    expect(hex(fp_round(fp_div(lit('4000.0'), quarPi).value).value)).toBe('$000013E5');
  });
});

describe('fp_add alignment drops an operand more than 24 exponent steps smaller', () => {
  // 2^25 - 1.5: IEEE gives 33554430 ($4BFFFFFF); PNut clears the 1.5 (xor ebx,ebx)
  test('2^25 - 1.5 = 2^25 (operand dropped)', () => {
    expect(ieeeSingle(33554432 - 1.5)).toBe(0x4bffffff);
    expect(hex(fp_sub(lit('33554432.0'), lit('1.5')).value)).toBe('$4C000000');
  });
  // 2^25 - 3.0 is 24 steps apart: kept, but aligned with a truncating sar
  test('2^25 - 3.0 is aligned by truncation, not rounded', () => {
    expect(ieeeSingle(33554432 - 3)).toBe(0x4bfffffe);
    expect(hex(fp_sub(lit('33554432.0'), lit('3.0')).value)).toBe('$4BFFFFFF');
  });
  test('fp_cmp inherits the drop yet keeps the sign of the larger operand', () => {
    const compare = fp_cmp(lit('33554432.0'), lit('1.5'));
    expect(compare.carry).toBe(false);
    expect(hex(compare.difference)).toBe('$4C000000');
    expect(compare.difference).toBeGreaterThan(0);
    expect(fp_cmp(lit('1.5'), lit('33554432.0')).difference).toBeLessThan(0);
    expect(fp_cmp(lit('1.5'), lit('1.5')).difference).toBe(0);
  });
  test('fp_cmp overflow sets carry (error_fpo)', () => {
    expect(fp_cmp(lit('3e38'), neg(lit('3e38'))).carry).toBe(true);
  });
  test('fp_fge / fp_fle', () => {
    expect(hex(fp_fge(lit('1.0'), lit('2.0')).value)).toBe(hex(lit('2.0')));
    expect(hex(fp_fle(lit('1.0'), lit('2.0')).value)).toBe(hex(lit('1.0')));
  });
});

describe('error and range behavior', () => {
  test('fp_div by zero sets carry', () => {
    expect(fp_div(lit('1.0'), 0).carry).toBe(true);
  });
  test('fp_add / fp_mul overflow set carry', () => {
    expect(fp_add(lit('3e38'), lit('3e38')).carry).toBe(true);
    expect(fp_mul(lit('3e38'), lit('10.0')).carry).toBe(true);
  });
  test('fp_sqrt / LOG of a non-positive value throw error_fpcmbp', () => {
    expect(() => fp_sqrt(neg(lit('2.0')))).toThrow('Floating-point constant must be positive');
    expect(() => fp_log2(0)).toThrow('Floating-point constant must be positive');
    expect(() => fp_log(neg(lit('2.0')))).toThrow('Floating-point constant must be positive');
    expect(fp_sqrt(0x80000000)).toBe(0); // -0.0 passes 'cmp eax,80000000h ; ja'
  });
  test('EXP overflow throws error_fpo', () => {
    expect(() => fp_exp10(lit('39.0'))).toThrow('Floating-point overflow');
  });
  test('fp_float is signed', () => {
    expect(hex(fp_float(-5))).toBe(hex(neg(lit('5.0'))));
    expect(hex(fp_float(0x80000000))).toBe('$CF000000');
  });
  test('fp_round / fp_trunc', () => {
    expect(fp_round(lit('2.5')).value).toBe(3);
    expect(fp_trunc(lit('2.5')).value).toBe(2);
    expect(hex(fp_round(neg(lit('2.5'))).value)).toBe('$FFFFFFFD');
    expect(fp_round(lit('0.5')).value).toBe(1);
    expect(fp_trunc(lit('0.5')).value).toBe(0);
    expect(fp_trunc(lit('2147483648.0')).carry).toBe(true);
  });
});

// Transcription audit: @@tens against PNut's source.
// REF-V52A/ is gitignored (not in public clones), so this is skipped where absent.
const asmFSpec: string = path.resolve(__dirname, '../../../REF-V52A/p2com.asm');
const describeWithAsm = fs.existsSync(asmFSpec) ? describe : describe.skip;

describeWithAsm('pnutFloat transcription matches REF-V52A/p2com.asm', () => {
  const asmLines: string[] = fs.existsSync(asmFSpec) ? fs.readFileSync(asmFSpec, 'utf8').split(/\r?\n/) : [];
  const getFloat: number = asmLines.findIndex((line) => line.startsWith('get_float:'));
  const tableStart: number = asmLines.findIndex((line, index) => index > getFloat && /^@@tens\s+dd\s/.test(line));

  test('get_float @@tens located', () => {
    expect(getFloat).toBeGreaterThan(0);
    expect(tableStart).toBeGreaterThan(getFloat);
  });

  test('@@tens: every dd text, in order', () => {
    const texts: string[] = [];
    for (let index = tableStart; index < asmLines.length; index++) {
      const match = asmLines[index].match(/^(?:@@tens)?\s+dd\s+([0-9.]+)/);
      if (match === null) {
        break;
      }
      texts.push(match[1]);
    }
    expect(texts).toEqual(TENS.map((entry) => entry[1]));
  });

  test('@@tens: every entry is its text as an IEEE single, 1e-37 .. 1e38', () => {
    expect(TENS.length).toBe(76);
    TENS.forEach(([bits, text], index) => {
      expect(`${text} ${hex(bits)}`).toBe(`${text} ${hex(ieeeSingle(Number(text)))}`);
      expect(Number(text)).toBe(Number(`1e${index - 37}`));
    });
  });

  test('scale constants', () => {
    const text: string = asmLines.join('\n');
    expect(text).toMatch(/fp_log10:\s+mov\s+ebx,04D104D42h/);
    expect(text).toMatch(/fp_log:\s+mov\s+ebx,0B17217F8h/);
    expect(text).toMatch(/fp_exp10:\s+mov\s+ebx,0D49A784Ch/);
    expect(text).toMatch(/fp_exp:\s+mov\s+ebx,05C551D95h/);
  });
});
