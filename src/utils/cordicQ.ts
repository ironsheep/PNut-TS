/** @format */

// Compile-time QLOG / QEXP, ported from PNut's integer CORDIC.
//
// SOURCE: REF-V52A/p2com.asm, "Cordic QLOG/QEXP resolver" — routines
// cordic_qlog / cordic_qexp / cordic_q and their local helpers @@sec,
// @@sec_next, @@adj_next, @@get, @@sar, @@neg, @@add, @@sub, @@put and the
// @@zdeltas table.
//
// Parity, not mathematical truth, is the goal: this reproduces PNut's x86
// fixed-point arithmetic bit for bit so a constant folded here equals the one
// PNut folds. Do not "improve" the algorithm.
//
// WIDTHS AND SIGNS (TS numbers do not wrap for free, so every value is explicit):
//  - input / result ..... unsigned 32-bit (eax), carried as a JS number 0..0xFFFFFFFF
//  - @@x @@y @@z ........ 64-bit two's-complement (edx:eax pairs), carried as a
//    BigInt normalized to UNSIGNED 64 (0..2^64-1); every add/sub/neg is masked
//    with BigInt.asUintN(64, ...), which is exactly add/adc, sub/sbb, not/add/adc
//  - @@xd @@yd @@zd ..... same 64-bit representation
//  - @@sar .............. shrd eax,edx,cl + sar edx,cl: an ARITHMETIC 64-bit right
//    shift; every count used by cordic_q is 0..31, where the x86 pair is exact
//  - @@mag .............. unsigned byte, 0..31
//  - @@exp .............. mode bit (the CF shifted in by rcl): false = QLOG, true = QEXP
//  - steering tests ..... `cmp [hi dword],0 / jl` is the 64-bit sign bit (bit 63)

'use strict';

const MASK64: bigint = (1n << 64n) - 1n;

// @@exp_pre init x: mov [@@x+0],42E61C5Ah / mov [@@x+4],0000007Fh
export const QEXP_X_INIT: bigint = 0x0000007f42e61c5an;

// @@zdeltas — hyperbolic cordic deltas, dq, indexed [@@zdeltas-8+ecx*8] (ecx 1..31)
export const ZDELTAS: readonly bigint[] = [
  0x32b803473fn,
  0x179538dea7n,
  0x0b9a2c912fn,
  0x05c73f7233n,
  0x02e2e683f7n,
  0x01715c285fn,
  0x00b8ab3164n,
  0x005c553c5cn,
  0x002e2a92a3n,
  0x00171547e0n,
  0x000b8aa3c2n,
  0x0005c551dbn,
  0x0002e2a8edn,
  0x0001715476n,
  0x0000b8aa3bn,
  0x00005c551en,
  0x00002e2a8fn,
  0x0000171547n,
  0x00000b8aa4n,
  0x000005c552n,
  0x000002e2a9n,
  0x0000017154n,
  0x000000b8aan,
  0x0000005c55n,
  0x0000002e2bn,
  0x0000001715n,
  0x0000000b8bn,
  0x00000005c5n,
  0x00000002e3n,
  0x0000000171n,
  0x00000000b9n
];

// The @@iterations call sequence, one entry per `call`, in source order.
//  'sec' = @@sec, 'sec_next' = @@sec_next, 'adj_next' = @@adj_next
export type CordicStep = 'sec' | 'sec_next' | 'adj_next';
export const ITERATIONS: readonly CordicStep[] = [
  'sec', //       sec01
  'adj_next', //  adj02
  'sec', //       sec02
  'adj_next', //  adj03
  'sec', //       sec03
  'adj_next', //  adj04
  'sec', //       sec04
  'sec', //       sec04x
  'sec_next', //  sec05
  'sec_next', //  sec06
  'adj_next', //  adj07
  'sec', //       sec07
  'adj_next', //  adj08
  'sec', //       sec08
  'sec_next', //  sec09
  'adj_next', //  adj10
  'sec', //       sec10
  'sec_next', //  sec11
  'adj_next', //  adj12
  'sec', //       sec12
  'sec_next', //  sec13
  'sec', //       sec13x
  'adj_next', //  adj14
  'sec', //       sec14
  'sec_next', //  sec15
  'adj_next', //  adj16
  'sec', //       sec16
  'sec_next', //  sec17
  'sec_next', //  sec18
  'adj_next', //  adj19
  'sec', //       sec19
  'adj_next', //  adj20
  'sec', //       sec20
  'sec_next', //  sec21
  'adj_next', //  adj22
  'sec', //       sec22
  'adj_next', //  adj23
  'sec', //       sec23
  'adj_next', //  adj24
  'sec', //       sec24
  'adj_next', //  adj25
  'sec', //       sec25
  'sec_next', //  sec26
  'sec_next', //  sec27
  'sec_next', //  sec28
  'sec_next', //  sec29
  'adj_next', //  adj30
  'sec', //       sec30
  'sec_next' //   sec31
];

// @@sar — 64-bit arithmetic shift right by cl (cl 0..31); input/output unsigned-64 BigInt
function sar64(value: bigint, cl: number): bigint {
  return BigInt.asUintN(64, BigInt.asIntN(64, value) >> BigInt(cl));
}

// @@neg — not/not/add 1/adc 0: 64-bit two's-complement negate
function neg64(value: bigint): bigint {
  return BigInt.asUintN(64, -value);
}

// @@add / @@sub — add/adc, sub/sbb: modulo 2^64
function add64(a: bigint, b: bigint): bigint {
  return (a + b) & MASK64;
}
function sub64(a: bigint, b: bigint): bigint {
  return BigInt.asUintN(64, a - b);
}

// `cmp [@@v+4],0 / jl` — true when the 64-bit value is negative
function isNeg64(value: bigint): boolean {
  return value >> 63n !== 0n;
}

/**
 * cordic_q — PNut's shared QLOG/QEXP resolver.
 * @param eax unsigned 32-bit operand
 * @param isExp false: cordic_qlog (clc), true: cordic_qexp (stc)
 * @returns unsigned 32-bit result (eax)
 */
function cordic_q(eax: number, isExp: boolean): number {
  let a32: number = eax >>> 0; // eax, unsigned 32
  let mag: number; // @@mag, unsigned byte 0..31
  let x: bigint; // @@x, 64-bit
  let y: bigint; // @@y, 64-bit
  let z: bigint; // @@z, 64-bit

  if (!isExp) {
    // qlog pre-fix, save ~magnitude in mag
    //  @@getmag: ecx=31; shl ebx,1 / jc @@gotmag / loop @@getmag
    let ebx: number = a32;
    let ecx: number = 31;
    for (;;) {
      const carry: boolean = (ebx & 0x80000000) !== 0;
      ebx = (ebx << 1) >>> 0;
      if (carry) {
        break; // jc @@gotmag
      }
      ecx = ecx - 1; // loop: dec ecx, jnz
      if (ecx === 0) {
        break;
      }
    }
    // @@gotmag: xor cl,1Fh
    mag = (ecx & 0xff) ^ 0x1f;
    const cl: number = mag;
    a32 = cl === 0 ? a32 : (a32 << cl) >>> 0; // shl eax,cl (cl 0..31)
    a32 = (a32 & 0x7fffffff) >>> 0; // and eax,7FFFFFFFh
    // edx=0; shld edx,eax,6; shl eax,6 -> 64-bit (eax << 6)
    y = BigInt(a32) << 6n; // init y
    x = y | (0b010n << 37n); // init x: or edx,010b shl (37-32)
    z = 0n; // init z
  } else {
    // qexp pre-fix, save ~exponent in mag
    const ecx: number = a32 >>> (32 - 5); // shr ecx,32-5
    mag = (ecx & 0xff) ^ 0x1f; // xor cl,1Fh
    x = QEXP_X_INIT; // init x
    y = 0n; // init y
    z = BigInt((a32 & 0x07ffffff) >>> 0) << 11n; // and eax,07FFFFFFh; shld/shl 11 -> init z
  }

  // @@iterations
  let cl: number = 1; // mov ecx,1 (only cl is ever used as a shift count / table index)
  for (const step of ITERATIONS) {
    if (step === 'adj_next') {
      // @@adj_next: inc cl; x -= x sar cl; y -= y sar cl
      cl++;
      x = sub64(x, sar64(x, cl));
      y = sub64(y, sar64(y, cl));
      continue;
    }
    if (step === 'sec_next') {
      cl++; // @@sec_next: inc cl, falls into @@sec
    }
    // @@sec
    let xd: bigint = sar64(y, cl); // get xd
    let yd: bigint = sar64(x, cl); // get yd
    let zd: bigint = ZDELTAS[cl - 1]; // get zd: [@@zdeltas-8+ecx*8]
    // qlog or qexp steering logic?
    let flip: boolean;
    if (!isExp) {
      flip = isNeg64(y); // cmp [@@y+4],0 / jl @@flip / jmp @@same
    } else {
      flip = !isNeg64(z); // @@qexp: cmp [@@z+4],0 / jl @@same, else @@flip
    }
    if (flip) {
      // @@flip: negate xd/yd/zd
      xd = neg64(xd);
      yd = neg64(yd);
      zd = neg64(zd);
    }
    // @@same
    x = sub64(x, xd); // update x
    y = sub64(y, yd); // update y
    z = add64(z, zd); // update z
  }

  // post-shift x and y down by ~mag
  x = sar64(x, mag);
  y = sar64(y, mag);

  let v: bigint; // edx:eax, 64-bit
  let shift: number; // cl for the final @@sar at @@done
  if (!isExp) {
    // qlog post-fix
    v = sar64(z, 9 - 7);
    v = v & 0xffffffffffffff80n; // and eax,0FFFFFF80h (edx untouched)
    const ecx: bigint = BigInt((mag ^ 0x1f) << (35 - 32)); // movzx ecx,[@@mag]; xor cl,1Fh; shl ecx,35-32
    v = add64(v, 0x80n + (ecx << 32n)); // add eax,80h; adc edx,ecx
    if (mag === 0 && (v & (1n << 39n)) === 0n) {
      // cmp [@@mag],0 / jne; test edx,1 shl (39-32) / jnz; else saturate
      v = MASK64; // mov eax,0FFFFFFFFh; mov edx,eax
    }
    shift = 8; // @@log_post: mov cl,8
  } else {
    // @@exp_post: qexp post-fix
    v = add64(x, y); // add eax,[@@y+0]; adc edx,[@@y+4]
    v = add64(v, 0x40n); // add eax,40h; adc edx,0
    shift = 7; // mov cl,7
  }
  // @@done: call @@sar; result in eax
  v = sar64(v, shift);
  return Number(v & 0xffffffffn);
}

/** cordic_qlog — compile-time QLOG, unsigned 32-bit in and out. */
export function cordic_qlog(value: number): number {
  return cordic_q(value, false);
}

/** cordic_qexp — compile-time QEXP, unsigned 32-bit in and out. */
export function cordic_qexp(value: number): number {
  return cordic_q(value, true);
}
