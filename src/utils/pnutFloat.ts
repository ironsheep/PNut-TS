/** @format */

// Compile-time floating point, ported from PNut's x86 float package.
//
// SOURCE: REF-V52A/p2com.asm — get_float (with its @@tens table), fp_fge, fp_fle,
// fp_cmp, fp_sub, fp_add, fp_mul, fp_div, fp_pow, fp_sqrt, fp_log2 / fp_log10 /
// fp_log / fp_logx, fp_exp2 / fp_exp10 / fp_exp / fp_expn, fp_float, fp_round /
// fp_trunc / fp_rt, fp_unpack_eax / fp_unpack_ebx, fp_pack_eax. The CORDIC calls
// go to src/utils/cordicQ.ts (cordic_qlog / cordic_qexp).
//
// Parity, not mathematical truth, is the goal: these reproduce PNut's truncating
// fixed-point arithmetic bit for bit, so a constant folded here equals the one PNut
// folds. They are deliberately NOT IEEE-754 double math. Do not "improve" them.
//
// WIDTHS AND SIGNS (TS numbers do not wrap for free, so every value is explicit):
//  - packed floats and mantissa registers (eax, ebx, ecx, edi as mantissa) ... unsigned
//    32-bit, a JS number 0..0xFFFFFFFF, re-normalized with >>> 0 after every
//    shift / add / neg / not
//  - exponent registers (esi, edi as exponent) ................................ signed
//    32-bit, re-normalized with | 0
//  - dl.0 / dh.0 sign bits ...... 0 or 1; only bit 0 is ever consumed (shr dl,1 /
//    test dl,1 / xor dl,dh), so the other dl/dh bits are not modeled
//  - mul (edx:eax) .............. unsigned 64-bit product in a BigInt; edx = >> 32n
//  - CF on return ............... `carry`
//  - x86 shift counts ........... masked to 5 bits, as the CPU does
//
// ERRORS: routines that return c=1 return { carry: true } and the caller raises its
// error (error_fpo, or error_fpcmbw for get_float); routines that jump straight to
// an error label (fp_sqrt, fp_logx, fp_expn, fp_pow) throw an Error carrying PNut's
// message text for that label.

'use strict';

import { cordic_qexp, cordic_qlog } from './cordicQ';

export interface iFpResult {
  value: number; // eax, unsigned 32-bit
  carry: boolean; // CF on return
}

export interface iFpScan extends iFpResult {
  length: number; // characters consumed from the source text (esi after get_float's final dec esi)
}

export interface iFpCompare {
  difference: number; // fp eax - fp ebx as packed by fp_sub, SIGNED 32-bit (cmp eax,0)
  carry: boolean; // c=1 if the subtraction overflowed
}

// PNut error-table text for the labels the float package jumps to
export const ERROR_FPCMBP: string = 'Floating-point constant must be positive';
export const ERROR_FPO: string = 'Floating-point overflow';

export interface iFpUnpacked {
  sign: number; // dl.0 / dh.0
  exponent: number; // esi / edi, signed 32-bit, biased by 127
  mantissa: number; // eax / ebx, unsigned 32-bit, bit29-justified (0 if value 0)
}

// get_float @@tens — dd table 1e-37 .. 1e38, indexed [@@tens+37*4+edi*4].
// Transcribed VERBATIM: each entry keeps the asm's dd source text beside its bits,
// which are that text as an IEEE single (TASM's conversion; the asm notes TASM is
// right for these, all of which have a non-zero exponent field). pnutFloat.test.ts
// re-parses the asm table and checks every text and every bit pattern.
export const TENS: readonly (readonly [number, string])[] = [
  [0x02081cea, '0.0000000000000000000000000000000000001'], // 1e-37
  [0x03aa2425, '0.000000000000000000000000000000000001'], // 1e-36
  [0x0554ad2e, '0.00000000000000000000000000000000001'], // 1e-35
  [0x0704ec3d, '0.0000000000000000000000000000000001'], // 1e-34
  [0x08a6274c, '0.000000000000000000000000000000001'], // 1e-33
  [0x0a4fb11f, '0.00000000000000000000000000000001'], // 1e-32
  [0x0c01ceb3, '0.0000000000000000000000000000001'], // 1e-31
  [0x0da24260, '0.000000000000000000000000000001'], // 1e-30
  [0x0f4ad2f8, '0.00000000000000000000000000001'], // 1e-29
  [0x10fd87b6, '0.0000000000000000000000000001'], // 1e-28
  [0x129e74d2, '0.000000000000000000000000001'], // 1e-27
  [0x14461206, '0.00000000000000000000000001'], // 1e-26
  [0x15f79688, '0.0000000000000000000000001'], // 1e-25
  [0x179abe15, '0.000000000000000000000001'], // 1e-24
  [0x19416d9a, '0.00000000000000000000001'], // 1e-23
  [0x1af1c901, '0.0000000000000000000001'], // 1e-22
  [0x1c971da0, '0.000000000000000000001'], // 1e-21
  [0x1e3ce508, '0.00000000000000000001'], // 1e-20
  [0x1fec1e4a, '0.0000000000000000001'], // 1e-19
  [0x219392ef, '0.000000000000000001'], // 1e-18
  [0x233877aa, '0.00000000000000001'], // 1e-17
  [0x24e69595, '0.0000000000000001'], // 1e-16
  [0x26901d7d, '0.000000000000001'], // 1e-15
  [0x283424dc, '0.00000000000001'], // 1e-14
  [0x29e12e13, '0.0000000000001'], // 1e-13
  [0x2b8cbccc, '0.000000000001'], // 1e-12
  [0x2d2febff, '0.00000000001'], // 1e-11
  [0x2edbe6ff, '0.0000000001'], // 1e-10
  [0x3089705f, '0.000000001'], // 1e-9
  [0x322bcc77, '0.00000001'], // 1e-8
  [0x33d6bf95, '0.0000001'], // 1e-7
  [0x358637bd, '0.000001'], // 1e-6
  [0x3727c5ac, '0.00001'], // 1e-5
  [0x38d1b717, '0.0001'], // 1e-4
  [0x3a83126f, '0.001'], // 1e-3
  [0x3c23d70a, '0.01'], // 1e-2
  [0x3dcccccd, '0.1'], // 1e-1
  [0x3f800000, '1.0'], // 1e0
  [0x41200000, '10.0'], // 1e1
  [0x42c80000, '100.0'], // 1e2
  [0x447a0000, '1000.0'], // 1e3
  [0x461c4000, '10000.0'], // 1e4
  [0x47c35000, '100000.0'], // 1e5
  [0x49742400, '1000000.0'], // 1e6
  [0x4b189680, '10000000.0'], // 1e7
  [0x4cbebc20, '100000000.0'], // 1e8
  [0x4e6e6b28, '1000000000.0'], // 1e9
  [0x501502f9, '10000000000.0'], // 1e10
  [0x51ba43b7, '100000000000.0'], // 1e11
  [0x5368d4a5, '1000000000000.0'], // 1e12
  [0x551184e7, '10000000000000.0'], // 1e13
  [0x56b5e621, '100000000000000.0'], // 1e14
  [0x58635fa9, '1000000000000000.0'], // 1e15
  [0x5a0e1bca, '10000000000000000.0'], // 1e16
  [0x5bb1a2bc, '100000000000000000.0'], // 1e17
  [0x5d5e0b6b, '1000000000000000000.0'], // 1e18
  [0x5f0ac723, '10000000000000000000.0'], // 1e19
  [0x60ad78ec, '100000000000000000000.0'], // 1e20
  [0x6258d727, '1000000000000000000000.0'], // 1e21
  [0x64078678, '10000000000000000000000.0'], // 1e22
  [0x65a96816, '100000000000000000000000.0'], // 1e23
  [0x6753c21c, '1000000000000000000000000.0'], // 1e24
  [0x69045951, '10000000000000000000000000.0'], // 1e25
  [0x6aa56fa6, '100000000000000000000000000.0'], // 1e26
  [0x6c4ecb8f, '1000000000000000000000000000.0'], // 1e27
  [0x6e013f39, '10000000000000000000000000000.0'], // 1e28
  [0x6fa18f08, '100000000000000000000000000000.0'], // 1e29
  [0x7149f2ca, '1000000000000000000000000000000.0'], // 1e30
  [0x72fc6f7c, '10000000000000000000000000000000.0'], // 1e31
  [0x749dc5ae, '100000000000000000000000000000000.0'], // 1e32
  [0x76453719, '1000000000000000000000000000000000.0'], // 1e33
  [0x77f684df, '10000000000000000000000000000000000.0'], // 1e34
  [0x799a130c, '100000000000000000000000000000000000.0'], // 1e35
  [0x7b4097ce, '1000000000000000000000000000000000000.0'], // 1e36
  [0x7cf0bdc2, '10000000000000000000000000000000000000.0'], // 1e37
  [0x7e967699, '100000000000000000000000000000000000000.0'] // 1e38
];

/** fp_unpack_eax / fp_unpack_ebx — dl.0=sign, esi=exponent, eax=mantissa (bit29-justified). */
export function fp_unpack(packed: number): iFpUnpacked {
  let eax: number = packed >>> 0;
  const sign: number = eax >>> 31; // shl eax,1 ; rcl dl,1
  eax = (eax << 1) >>> 0;
  let esi: number = eax >>> 24; // mov esi,eax ; shr esi,24
  eax = (eax << 8) >>> 0; // shl eax,8
  if (esi === 0) {
    if (eax === 0) {
      return { sign, exponent: 0, mantissa: 0 }; // or eax,eax ; jz @@z
    }
    esi = 1; // inc esi
    let cf: number;
    do {
      esi = (esi - 1) | 0; // @@adj: dec esi
      cf = eax >>> 31; // shl eax,1
      eax = (eax << 1) >>> 0;
    } while (cf === 0); // jnc @@adj
  }
  eax = ((eax >>> 1) | 0x80000000) >>> 0; // @@nz: stc ; rcr eax,1
  eax = eax >>> 2; // shr eax,2
  return { sign, exponent: esi, mantissa: eax };
}

/** fp_pack_eax — pack dl.0=sign, esi=exponent, eax=mantissa (bit29-justified); c=1 if overflow. */
export function fp_pack(sign: number, exponent: number, mantissa: number): iFpResult {
  let eax: number = mantissa >>> 0;
  let esi: number = exponent | 0;
  if (eax === 0) {
    return { value: 0, carry: false }; // or eax,eax ; jz @@exit (c=0)
  }
  esi = (esi + 3) | 0; // add esi,3
  let cf: number;
  do {
    esi = (esi - 1) | 0; // @@exp: dec esi
    cf = eax >>> 31; // shl eax,1
    eax = (eax << 1) >>> 0;
  } while (cf === 0); // jnc @@exp
  const sum: number = eax + 0x100; // add eax,100h
  eax = sum >>> 0;
  esi = (esi + (sum > 0xffffffff ? 1 : 0)) | 0; // adc esi,0
  if (!(esi > 0)) {
    // cmp esi,0 ; jg @@pack (signed)
    eax = ((eax >>> 1) | 0x80000000) >>> 0; // stc ; rcr eax,1
    while (esi !== 0) {
      eax = eax >>> 1; // @@ushr: or esi,esi ; jz @@pack ; shr eax,1
      esi = (esi + 1) | 0; // inc esi
    }
  }
  // @@pack
  let ah: number = (eax >>> 8) & 0xff;
  ah = (((ah >>> 1) << 1) | (sign & 1)) & 0xff; // shr ah,1 ; shr dl,1 ; rcl ah,1
  eax = ((eax & 0xffff00ff) | (ah << 8)) >>> 0;
  eax = ((eax & 0xffffff00) | (esi & 0xff)) >>> 0; // mov edx,esi ; mov al,dl
  eax = ((eax >>> 9) | (eax << 23)) >>> 0; // ror eax,9
  return { value: eax, carry: esi >>> 0 >= 0xff }; // cmp esi,0FFh ; cmc
}

function mulHigh(a: number, b: number): number {
  // mul -> edx, the high dword of the unsigned 64-bit product
  return Number((BigInt(a >>> 0) * BigInt(b >>> 0)) >> 32n);
}

/** fp_add — fp eax + fp ebx; c=1 if overflow. */
export function fp_add(a: number, b: number): iFpResult {
  const ua: iFpUnpacked = fp_unpack(a); // call fp_unpack_eax
  const ub: iFpUnpacked = fp_unpack(b); // call fp_unpack_ebx
  let eax: number = ua.mantissa;
  let esi: number = ua.exponent;
  let ebx: number = ub.mantissa;
  let edi: number = ub.exponent;
  if (ua.sign & 1) {
    eax = -eax >>> 0; // shr dl,1 ; jnc @@apos ; neg eax
  }
  if (ub.sign & 1) {
    ebx = -ebx >>> 0; // @@apos: shr dh,1 ; jnc @@bpos ; neg ebx
  }
  if (esi < edi) {
    // @@bpos: cmp esi,edi ; jge @@order (signed) ; xchg eax,ebx ; xchg esi,edi
    [eax, ebx] = [ebx, eax];
    [esi, edi] = [edi, esi];
  }
  const ecx: number = (esi - edi) | 0; // @@order: mov ecx,esi ; sub ecx,edi
  if (ecx >>> 0 > 24) {
    ebx = 0; // cmp ecx,24 ; jbe @@inrange (unsigned) ; xor ebx,ebx
  }
  ebx = ((ebx | 0) >> (ecx & 31)) >>> 0; // @@inrange: sar ebx,cl
  eax = (eax + ebx) >>> 0; // add eax,ebx
  let sign: number = 0; // cmp eax,0 ; mov dl,0
  if ((eax | 0) < 0) {
    // jge @@rpos
    sign = 1; // mov dl,1
    eax = -eax >>> 0; // neg eax
  }
  return fp_pack(sign, esi, eax); // @@rpos: call fp_pack_eax
}

/** fp_sub — fp eax - fp ebx; c=1 if overflow. */
export function fp_sub(a: number, b: number): iFpResult {
  return fp_add(a, (b ^ 0x80000000) >>> 0); // xor ebx,80000000h, falls into fp_add
}

/** fp_mul — fp eax * fp ebx; c=1 if overflow. */
export function fp_mul(a: number, b: number): iFpResult {
  const ua: iFpUnpacked = fp_unpack(a);
  const ub: iFpUnpacked = fp_unpack(b);
  const sign: number = (ua.sign ^ ub.sign) & 1; // xor dl,dh
  const esi: number = (ua.exponent + ub.exponent - 127) | 0; // add esi,edi ; sub esi,127
  const eax: number = (mulHigh(ua.mantissa, ub.mantissa) << 3) >>> 0; // mul ebx ; shl edx,3 ; mov eax,edx
  return fp_pack(sign, esi, eax); // call fp_pack_eax
}

/** fp_div — fp eax / fp ebx; c=1 if overflow or divide by 0. */
export function fp_div(a: number, b: number): iFpResult {
  const ua: iFpUnpacked = fp_unpack(a);
  const ub: iFpUnpacked = fp_unpack(b);
  const ebx: number = ub.mantissa;
  if (ebx === 0) {
    return { value: 0, carry: true }; // or ebx,ebx ; stc ; jz @@exit
  }
  const sign: number = (ua.sign ^ ub.sign) & 1; // xor dl,dh
  const esi: number = (ua.exponent - ub.exponent + 127) | 0; // sub esi,edi ; add esi,127
  let eax: number = ua.mantissa;
  let edi: number = 0; // xor edi,edi
  for (let dh = 30; dh !== 0; dh--) {
    // @@div: cmp eax,ebx ; jb @@not
    let bit: number = 0; // below: c=1, cmc -> 0
    if (eax >= ebx) {
      eax = (eax - ebx) >>> 0; // sub eax,ebx (c=0), cmc -> 1
      bit = 1;
    }
    edi = ((edi << 1) | bit) >>> 0; // @@not: cmc ; rcl edi,1
    eax = (eax << 1) >>> 0; // shl eax,1
  }
  return fp_pack(sign, esi, edi); // mov eax,edi ; call fp_pack_eax
}

/**
 * fp_cmp — sign of (fp eax - fp ebx) as packed by fp_sub; c=1 if overflow.
 * Inherits fp_add's alignment: an operand more than 24 exponent steps below the
 * other is dropped entirely (xor ebx,ebx), not rounded.
 */
export function fp_cmp(a: number, b: number): iFpCompare {
  const result: iFpResult = fp_sub(a, b); // call fp_sub ; jc @@exit
  if (result.carry) {
    return { difference: 0, carry: true };
  }
  return { difference: result.value | 0, carry: false }; // cmp eax,0 (signed flags) ; clc
}

/** fp_fge — greatest(fp eax, fp ebx); c=1 if overflow. */
export function fp_fge(a: number, b: number): iFpResult {
  const compare: iFpCompare = fp_cmp(a, b);
  if (compare.carry) {
    return { value: a >>> 0, carry: true };
  }
  return { value: (compare.difference >= 0 ? a : b) >>> 0, carry: false }; // jge @@exit ; mov eax,ebx
}

/** fp_fle — least(fp eax, fp ebx); c=1 if overflow. */
export function fp_fle(a: number, b: number): iFpResult {
  const compare: iFpCompare = fp_cmp(a, b);
  if (compare.carry) {
    return { value: a >>> 0, carry: true };
  }
  return { value: (compare.difference <= 0 ? a : b) >>> 0, carry: false }; // jle @@exit ; mov eax,ebx
}

/** fp_sqrt — FSQRT(fp eax); throws error_fpcmbp if negative, error_fpo if overflow. */
export function fp_sqrt(a: number): number {
  if (a >>> 0 > 0x80000000) {
    throw new Error(ERROR_FPCMBP); // cmp eax,80000000h ; ja error_fpcmbp
  }
  const ua: iFpUnpacked = fp_unpack(a);
  let eax: number = ua.mantissa;
  let esi: number = (ua.exponent - 127) | 0; // sub esi,127
  const cf: number = esi & 1; // sar esi,1 (CF = bit shifted out)
  esi = esi >> 1;
  if (cf === 0) {
    eax = eax >>> 1; // jc @@odd ; shr eax,1
  }
  esi = (esi + 127 - 1) | 0; // @@odd: add esi,127-1
  if (eax !== 0) {
    // or eax,eax ; jz @@zero
    const sqr: number = eax; // mov [@@sqr],eax
    let ebx: number = 0x80000000;
    let ecx: number = 0;
    let bitOut: number;
    do {
      ecx = (ecx | ebx) >>> 0; // @@sqrt2: or ecx,ebx
      if (mulHigh(ecx, ecx) > sqr) {
        ecx = (ecx ^ ebx) >>> 0; // mov eax,ecx ; mul eax ; cmp edx,[@@sqr] ; jbe @@sqrt3 ; xor ecx,ebx
      }
      bitOut = ebx & 1; // @@sqrt3: shr ebx,1
      ebx = ebx >>> 1;
    } while (bitOut === 0); // jnc @@sqrt2
    eax = ecx;
  }
  const packed: iFpResult = fp_pack(0, esi, eax); // @@zero: xor edx,edx ; call fp_pack_eax
  if (packed.carry) {
    throw new Error(ERROR_FPO); // jc error_fpo
  }
  return packed.value;
}

// fp_log10 / fp_log result scales: 2^32 * log10(2.0), 2^32 * log(2.0)
export const LOG10_SCALE: number = 0x4d104d42;
export const LOG_SCALE: number = 0xb17217f8;

/** fp_logx — log2 of fp eax, scaled by ebx when non-zero; throws error_fpcmbp if not positive. */
export function fp_logx(a: number, scale: number): number {
  const ua: iFpUnpacked = fp_unpack(a); // call fp_unpack_eax
  if (ua.sign & 1) {
    throw new Error(ERROR_FPCMBP); // test dl,1 ; jnz error_fpcmbp
  }
  if (ua.mantissa === 0) {
    throw new Error(ERROR_FPCMBP); // or eax,eax ; jz error_fpcmbp
  }
  let sign: number = ua.sign;
  let eax: number = (cordic_qlog(ua.mantissa) << 5) >>> 0; // call cordic_qlog ; shl eax,5
  let esi: number = (ua.exponent - 127) | 0; // sub esi,127
  if (esi < 0) {
    // jns @@pos
    sign |= 1; // or dl,1
    esi = ~esi; // not esi
    eax = ~eax >>> 0; // not eax
  }
  let ecx: number = 8; // @@pos: mov ecx,8
  let edi: number = 0x80; // mov edi,80h
  let found: boolean = false;
  for (;;) {
    if (esi & edi) {
      found = true; // @@int: test esi,edi ; jnz @@gotint
      break;
    }
    edi = edi >>> 1; // shr edi,1
    ecx--; // loop @@int
    if (ecx === 0) {
      break;
    }
  }
  if (!found) {
    ecx++; // inc ecx (exponent was 0, single bit)
  }
  const cl: number = ecx & 31;
  eax = eax >>> cl; // @@gotint: shr eax,cl
  const esiBits: number = esi >>> 0;
  const rotated: number = ((esiBits >>> cl) | (esiBits << (32 - cl))) >>> 0; // ror esi,cl (cl is 1..8)
  eax = (eax | rotated) >>> 0; // or eax,esi
  eax = eax >>> 3; // shr eax,3
  if (scale >>> 0 !== 0) {
    eax = mulHigh(eax, scale); // or ebx,ebx ; jz @@noadj ; mul ebx ; mov eax,edx
  }
  return fp_pack(sign, (ecx + 127) | 0, eax).value; // @@noadj: mov esi,ecx ; add esi,127 ; call fp_pack_eax
}

export function fp_log2(a: number): number {
  return fp_logx(a, 0); // xor ebx,ebx
}

export function fp_log10(a: number): number {
  return fp_logx(a, LOG10_SCALE); // mov ebx,04D104D42h
}

export function fp_log(a: number): number {
  return fp_logx(a, LOG_SCALE); // mov ebx,0B17217F8h
}

// fp_exp10 / fp_exp input scales: 2^30 / log10(2.0), 2^30 / log(2.0)
export const EXP10_SCALE: number = 0xd49a784c;
export const EXP_SCALE: number = 0x5c551d95;

/** fp_expn — 2^(fp eax), input scaled by ebx when non-zero; throws error_fpo if overflow. */
export function fp_expn(a: number, scale: number): number {
  const ua: iFpUnpacked = fp_unpack(a); // call fp_unpack_eax
  let sign: number = ua.sign;
  let eax: number = ua.mantissa;
  let esi: number = (ua.exponent - 127) | 0; // sub esi,127
  if (scale >>> 0 !== 0) {
    // or ebx,ebx ; jz @@noadj
    const product: bigint = BigInt(eax) * BigInt(scale >>> 0); // mul ebx -> edx:eax
    eax = Number((product >> 30n) & 0xffffffffn); // shld edx,eax,2 ; mov eax,edx
    if (eax & 0x80000000) {
      eax = eax >>> 1; // test eax,80000000h ; jz @@ok31 ; shr eax,1 ; inc esi
      esi = (esi + 1) | 0;
    }
    if (eax & 0x40000000) {
      eax = eax >>> 1; // @@ok31: test eax,40000000h ; jz @@ok30 ; shr eax,1 ; inc esi
      esi = (esi + 1) | 0;
    }
  }
  eax = (eax << 2) >>> 0; // @@noadj: shl eax,2
  esi = (esi + 1) | 0; // add esi,1
  if (esi > 8) {
    throw new Error(ERROR_FPO); // cmp esi,8 ; jg error_fpo
  }
  let ecx: number = esi; // mov ecx,esi
  if (ecx >= 1) {
    // cmp ecx,1 ; jl @@shiftdown
    esi = eax >>> (32 - ecx); // xor esi,esi ; shld esi,eax,cl (cl is 1..8)
    eax = (eax << ecx) >>> 0; // shl eax,cl
  } else {
    ecx = -ecx | 0; // @@shiftdown: neg ecx
    eax = eax >>> (ecx & 31); // shr eax,cl
    esi = 0; // mov esi,0
  }
  if (sign & 1) {
    // @@cont: test dl,1 ; jz @@pos
    sign = 0; // mov dl,0
    esi = ~esi; // not esi
    eax = ~eax >>> 0; // not eax
  }
  eax = ((eax >>> 5) | (29 << 27)) >>> 0; // @@pos: shr eax,5 ; or eax,29 shl 27
  eax = cordic_qexp(eax); // call cordic_qexp
  const packed: iFpResult = fp_pack(sign, (esi + 127) | 0, eax); // add esi,127 ; call fp_pack_eax
  if (packed.carry) {
    throw new Error(ERROR_FPO); // jc error_fpo
  }
  return packed.value;
}

export function fp_exp2(a: number): number {
  return fp_expn(a, 0); // xor ebx,ebx
}

export function fp_exp10(a: number): number {
  return fp_expn(a, EXP10_SCALE); // mov ebx,0D49A784Ch
}

export function fp_exp(a: number): number {
  return fp_expn(a, EXP_SCALE); // mov ebx,05C551D95h
}

/** fp_pow — fp eax to-the-power-of fp ebx; throws error_fpcmbp / error_fpo. */
export function fp_pow(a: number, b: number): number {
  const log: number = fp_log2(a); // push ebx ; call fp_log2 ; pop ebx
  const product: iFpResult = fp_mul(log, b); // call fp_mul
  if (product.carry) {
    throw new Error(ERROR_FPO); // jc error_fpo
  }
  return fp_exp2(product.value); // jmp fp_exp2
}

/** fp_float — signed 32-bit integer eax to fp eax. */
export function fp_float(integer: number): number {
  let eax: number = integer >>> 0;
  const sign: number = eax >>> 31; // mov edx,eax ; shr edx,31
  if (eax === 0) {
    return 0; // or eax,eax ; jz @@exit
  }
  if (sign) {
    eax = -eax >>> 0; // jns @@pos ; neg eax
  }
  let esi: number = 32 + 127; // @@pos: mov esi,32+127
  let cf: number;
  do {
    esi--; // @@exp: dec esi
    cf = eax >>> 31; // shl eax,1
    eax = (eax << 1) >>> 0;
  } while (cf === 0); // jnc @@exp
  eax = ((eax >>> 1) | 0x80000000) >>> 0; // rcr eax,1 (c=1, replace leading 1)
  eax = eax >>> 2; // shr eax,2
  return fp_pack(sign, esi, eax).value; // call fp_pack_eax
}

/** fp_rt — fp eax to rounded (fp_round) or truncated (fp_trunc) signed 32-bit integer; c=1 if overflow. */
export function fp_rt(a: number, round: boolean): iFpResult {
  const roundBit: number = round ? 1 : 0; // stc / clc ; rcl dh,1
  const ua: iFpUnpacked = fp_unpack(a); // call fp_unpack_eax
  let eax: number = (ua.mantissa << 2) >>> 0; // shl eax,2
  const esi: number = ua.exponent;
  const ecx: number = (30 + 127 - esi) | 0; // mov ecx,30+127 ; sub ecx,esi
  if (ecx < 0) {
    return { value: eax, carry: true }; // stc ; jl @@exit
  }
  if (esi > -1 + 127) {
    // cmp esi,-1+127 ; jg @@integer
    eax = eax >>> (ecx & 31); // @@integer: shr eax,cl
    eax = eax + roundBit; // shr dh,1 ; adc eax,0 (low bits are clear, cannot carry out)
    eax = eax >>> 1; // shr eax,1
  } else if (esi < -1 + 127) {
    return { value: 0, carry: false }; // mov eax,0 ; jl @@done
  } else {
    eax = roundBit; // exponent -1: shr dh,1 ; rcl eax,1 (eax = 0), 1/2 rounds to 1
  }
  if (ua.sign & 1) {
    eax = -eax >>> 0; // @@neg: shr dl,1 ; jnc @@pos ; neg eax
  }
  return { value: eax >>> 0, carry: false }; // @@done: clc
}

export function fp_round(a: number): iFpResult {
  return fp_rt(a, true);
}

export function fp_trunc(a: number): iFpResult {
  return fp_rt(a, false);
}

function isDecimalDigit(chr: number): boolean {
  // check_digit with cl=10: check_hex accepts 0-9/A-F, then 'cmp al,cl ; cmc' rejects A-F
  return chr >= 0x30 && chr <= 0x39;
}

/**
 * get_float — floating-point constant source text -> packed float; c=1 if invalid
 * (the caller raises error_fpcmbw).
 *
 * `text` starts at the constant's first character. Scanning stops at the first
 * character that cannot continue the constant, exactly as the asm does; a read past
 * the end of `text` sees a NUL, which continues nothing.
 */
export function get_float(text: string): iFpScan {
  let index: number = 0;
  const lodsb = (): number => (index < text.length ? text.charCodeAt(index++) : (index++, 0));

  let digits: number = 0; // dl: significant digits
  let flags: number = 0; // dh: decimal point flag; later exponent negative (bit 0) / overflow (bit 1)
  let ebx: number = 0; // mantissa, unsigned 32-bit (nine digits max, so < 2^30)
  let edi: number = 0; // base10 exponent, signed 32-bit

  for (;;) {
    const chr: number = lodsb(); // @@mantissa: lodsb
    if (chr === 0x5f) {
      continue; // cmp al,'_' ; je @@mantissa
    }
    if (isDecimalDigit(chr)) {
      const digit: number = chr - 0x30;
      if (digits === 0 && digit === 0) {
        // no significant digit yet and this one is zero
        if (flags !== 0) {
          edi = (edi - 1) | 0; // leading zero right of decimal point, dec edi
        }
        continue;
      }
      if (digits === 9) {
        // @@digitvalid: cmp dl,9 ; jne @@significant
        if (flags === 0) {
          edi = (edi + 1) | 0; // no decimal point yet, inc edi
        }
        continue;
      }
      digits++; // @@significant: inc dl
      if (flags !== 0) {
        edi = (edi - 1) | 0; // right of decimal point, dec edi
      }
      ebx = (Math.imul(ebx, 10) + digit) >>> 0; // @@notright: xchg eax,ebx ; mul ecx ; add ebx,eax
      continue;
    }
    // @@notdigit: dec esi ; lodsb
    if (chr === 0x2e) {
      // cmp al,'.'
      if (flags === 1) {
        break; // decimal point already, got constant string
      }
      flags = 1; // mov dh,1
      continue;
    }
    if (chr === 0x45 || chr === 0x65) {
      // @@notpoint: call uppercase ; cmp al,'E'
      let expChr: number = lodsb(); // lodsb
      flags = 1; // mov dh,1 (negative)
      if (expChr !== 0x2d) {
        // cmp al,'-' ; je @@expneg
        if (expChr !== 0x2b) {
          index--; // cmp al,'+' ; je @@exppos ; dec esi
        }
        flags = 0; // @@exppos: mov dh,0
      }
      expChr = lodsb(); // @@expneg: lodsb
      if (!isDecimalDigit(expChr)) {
        return { value: 0, carry: true, length: index - 1 }; // call check_digit ; jc @@error
      }
      let dl: number = expChr - 0x30; // mov dl,al
      for (;;) {
        expChr = lodsb(); // @@expdigit: lodsb
        if (expChr === 0x5f) {
          continue; // cmp al,'_' ; je @@expdigit
        }
        if (!isDecimalDigit(expChr)) {
          break; // call check_digit ; jc @@expdone
        }
        const ax: number = dl * 10; // xchg al,dl ; mul cl
        dl = expChr - 0x30;
        if (ax > 0xff) {
          flags |= 2; // cmp ah,0 ; jne @@expover
          continue;
        }
        const sum: number = dl + ax; // add dl,al
        dl = sum & 0xff;
        if (sum > 0xff) {
          flags |= 2; // jnc @@expdigit ; @@expover: or dh,2
        }
      }
      if (flags & 2) {
        return { value: 0, carry: true, length: index - 1 }; // @@expdone: test dh,2 ; jnz @@error
      }
      edi = (edi + (flags & 1 ? -dl : dl)) | 0; // movzx eax,dl ; test dh,1 ; neg eax ; add edi,eax
    }
    break; // @@gotconstant
  }

  // @@gotconstant: ebx=mantissa, edi=base10 exponent
  if (ebx === 0) {
    return { value: 0, carry: false, length: index - 1 }; // or ebx,ebx ; jz @@done (c=0)
  }
  let ecx: number = 32; // mov ecx,32
  let cf: number;
  do {
    ecx--; // @@justfp: dec ecx
    cf = ebx >>> 31; // shl ebx,1
    ebx = (ebx << 1) >>> 0;
  } while (cf === 0); // jnc @@justfp
  const sum: number = ebx + 0x100; // add ebx,100h (round to nearest mantissa lsb)
  ebx = sum >>> 0;
  ecx = ecx + (sum > 0xffffffff ? 1 : 0); // adc ecx,0
  ebx = (ebx & 0xfffffeff) >>> 0; // and bh,0FEh (clear sign)
  ebx = ((ebx & 0xffffff00) | ((ecx + 127) & 0xff)) >>> 0; // add cl,127 ; mov bl,cl
  ebx = ((ebx >>> 9) | (ebx << 23)) >>> 0; // ror ebx,9

  while (edi < -37) {
    ebx = fp_mul(TENS[0][0], ebx).value; // @@normalize: mov eax,[@@tens] ; call fp_mul ; mov ebx,eax
    edi = (edi + 37) | 0; // add edi,37
  }
  if (edi > 38) {
    return { value: 0, carry: true, length: index - 1 }; // @@checkover: cmp edi,38 ; jg @@error
  }
  const result: iFpResult = fp_mul(TENS[37 + edi][0], ebx); // mov eax,[@@tens+37*4+edi*4] ; call fp_mul
  if (result.carry) {
    return { value: 0, carry: true, length: index - 1 }; // jc @@error
  }
  return { value: result.value, carry: false, length: index - 1 }; // mov ebx,eax ; jmp @@done
}
