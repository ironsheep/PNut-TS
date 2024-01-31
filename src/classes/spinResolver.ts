/* eslint-disable no-fallthrough */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/** @format */
'use strict';

// src/classes/spinResolver.ts

// spin compile resolver
import { Context } from '../utils/context';
import { SpinElement } from './spinElement';
import { NumberStack } from './numberStack';
import { eElementType, eOperationType } from './types';
import { hexStringToFloat64, stringToBigIntFloat32, bigIntToHexString, bigIntLs32bitsToFloat64, bigIntToFloat64 } from '../utils/float32';

export class SpinResolver {
  private context: Context;
  private spinElements: SpinElement[];
  private numberStack: NumberStack = new NumberStack();

  constructor(ctx: Context, elementList: SpinElement[]) {
    this.context = ctx;
    this.spinElements = elementList;
  }

  public testResolver(parmA: number, parmB: number, operation: eOperationType, isFloatInConstExpression: boolean): number {
    // runtime expression compiler (puts byte codes together to solve at runtime)
    //   calls compile time to reduce constants before emitting byte code
    // compile-time resolver - THIS CODE
    //  isFloatInConstExpression is ONLY true if we are compiling CON blocks and we have a floating point context
    const msb32Bit: bigint = BigInt(0x80000000);
    const float1p0: bigint = BigInt(0x3f800000);
    const mask32Bit: bigint = BigInt(0xffffffff);
    const mask31Bit: bigint = BigInt(0x7fffffff);
    const true32Bit: bigint = BigInt(0xffffffff);
    const false32Bit: bigint = 0n;

    // conditioning the incoming params
    let a: bigint = BigInt(parmA);
    let b: bigint = BigInt(parmB);
    a &= mask32Bit;
    b &= mask32Bit;

    // clip in values before we operate on them
    const bitCountFromB: bigint = b & 31n;

    switch (operation) {
      case eOperationType.op_bitnot: // !
        // invert our 32bits
        a ^= mask32Bit;
        break;
      case eOperationType.op_neg: // -
        if (isFloatInConstExpression) {
          // our 32bit float  signbit in msb, 8 exponent bits, 23 mantissa bits
          a ^= msb32Bit;
        } else {
          a = ((a ^ mask32Bit) + 1n) & mask32Bit;
        }
        break;
      case eOperationType.op_fneg: // -.
        a ^= msb32Bit;
        break;
      case eOperationType.op_abs:
        if (isFloatInConstExpression) {
          a &= mask31Bit;
        } else {
          a = a & msb32Bit ? ((a ^ mask32Bit) + 1n) & mask32Bit : a;
        }
        break;
      case eOperationType.op_fabs:
        a &= mask31Bit;
        break;
      case eOperationType.op_encod:
        {
          let bitPosition: bigint = 0n;
          for (let index: bigint = 31n; index >= 0n; index--) {
            if (a & (1n << index)) {
              bitPosition = index;
              break;
            }
          }
          a = bitPosition;
        }
        break;
      case eOperationType.op_decod:
        a = 1n << (a & 31n);
        break;
      case eOperationType.op_bmask:
        a = mask32Bit >> (31n - (a & 31n));
        break;

      case eOperationType.op_ones:
        {
          let bitCount: bigint = 0n;
          for (let index: bigint = 31n; index >= 0n; index--) {
            if (a & (1n << index)) {
              bitCount++;
              break;
            }
          }
          a = bitCount;
        }
        break;

      case eOperationType.op_sqrt:
        {
          let root: bigint = 0n;
          for (let index: bigint = 15n; index >= 0n; index--) {
            root |= 1n << index;
            if (root * root > a) {
              root ^= 1n << index;
            }
          }
          a = root;
        }
        break;

      case eOperationType.op_fsqrt:
        {
          if (a > msb32Bit) {
            // [error_fpcmbp]
            throw new Error(`Floating-point constant must be positive`);
          }
          // convert to internal from float32
          const internalFloat64: number = bigIntToFloat64(a);
          // get square root
          const internalSqRoot64: number = Math.sqrt(internalFloat64);
          // convert back to float32
          a = stringToBigIntFloat32(internalSqRoot64.toString());
        }
        break;

      case eOperationType.op_qlog:
        // if a is non-zero... then calculate else leave it at zero
        if (a) {
          a = BigInt(Math.trunc(Math.log2(Number(a)) * Math.pow(2, 27)));
        }
        break;

      case eOperationType.op_qexp:
        // WARNING this result MAY cause binary differences in our output file! WARNING
        //  consider this code if we see problems in our regression tests
        //  it's all a matter of precision...
        a = BigInt(Math.trunc(Math.pow(2, Number(a) / Math.pow(2, 27)))); // trunc ..E9, round ..EA (Chip gets E8!) a=0xFFFFFFFF
        break;

      case eOperationType.op_shr:
        a = a >> bitCountFromB;
        break;

      case eOperationType.op_shl:
        a = (a << bitCountFromB) & mask32Bit;
        break;

      case eOperationType.op_sar:
        {
          const isNeg: boolean = a & msb32Bit ? true : false;
          a = (((isNeg ? mask32Bit << 32n : 0n) | a) >> bitCountFromB) & mask32Bit;
        }
        break;

      case eOperationType.op_ror:
        {
          const doubleUp: bigint = (a << 32n) | a;
          a = (doubleUp >> bitCountFromB) & mask32Bit;
        }
        break;

      case eOperationType.op_rol:
        {
          //
          const doubleUp: bigint = (a << 32n) | a;
          a = (doubleUp >> (32n - bitCountFromB)) & mask32Bit;
        }
        break;

      case eOperationType.op_rev:
        {
          // reverse b ls-bits of a
          let revValue: bigint = 0n;
          for (let index: bigint = 0n; index <= bitCountFromB; index++) {
            revValue = (revValue << 1n) | (a & 1n);
            a = a >> 1n;
          }
          a = revValue;
        }
        break;

      case eOperationType.op_zerox:
        // zero extend a from bit b
        a &= mask32Bit >> (31n - bitCountFromB);
        break;

      case eOperationType.op_signx:
        // copy bit b of a to all higher bits of a
        {
          const isNeg: boolean = (a >> bitCountFromB) & 1n ? true : false;
          a &= mask32Bit >> (31n - bitCountFromB);
          a |= isNeg ? (BigInt(0xfffffffe) << bitCountFromB) & mask32Bit : 0n;
        }
        break;

      case eOperationType.op_bitand:
        a &= b;
        break;

      case eOperationType.op_bitxor:
        a ^= b;
        break;

      case eOperationType.op_bitor:
        a |= b;
        break;

      case eOperationType.op_mul:
        // multiply a by b
        {
          if (isFloatInConstExpression) {
            // convert to internal from float32
            let aInternalFloat64: number = bigIntToFloat64(a);
            const bInternalFloat64: number = bigIntToFloat64(b);
            aInternalFloat64 *= bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = (a * b) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fmul:
        {
          // convert to internal from float32
          let aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          aInternalFloat64 *= bInternalFloat64;
          // convert back to float32
          a = stringToBigIntFloat32(aInternalFloat64.toString());
        }
        break;

      case eOperationType.op_div:
        // divide a by b
        {
          if (isFloatInConstExpression) {
            // convert to internal from float32
            if ((b & mask31Bit) == 0n) {
              // [error_fpo]
              throw new Error(`Floating-point overflow`);
            }
            let aInternalFloat64: number = bigIntToFloat64(a);
            const bInternalFloat64: number = bigIntToFloat64(b);
            aInternalFloat64 /= bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            if (b == 0n) {
              // [error_dbz]
              throw new Error(`Divide by zero`);
            }
            a = (this.signExtendFrom32Bit(a) / this.signExtendFrom32Bit(b)) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fdiv:
        {
          // convert to internal from float32
          if ((b & mask31Bit) == 0n) {
            // [error_fpo]
            throw new Error(`Floating-point overflow`);
          }
          let aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          aInternalFloat64 /= bInternalFloat64;
          // convert back to float32
          a = stringToBigIntFloat32(aInternalFloat64.toString());
        }
        break;

      case eOperationType.op_divu:
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
        }
        a /= b;
        break;

      case eOperationType.op_rem:
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
        }
        a = this.signExtendFrom32Bit(a) % this.signExtendFrom32Bit(b) & mask32Bit;
        break;

      case eOperationType.op_remu:
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
        }
        a %= b;
        break;

      case eOperationType.op_sca:
        a = (a * b) >> 32n;
        break;

      case eOperationType.op_scas:
        a = ((this.signExtendFrom32Bit(a) * this.signExtendFrom32Bit(b)) >> 30n) & mask32Bit;
        break;

      case eOperationType.op_frac:
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
        }
        a = (a << 32n) / b;
        if ((a >> 32n) & mask32Bit) {
          // [error_divo]
          throw new Error(`Division overflow`);
        }
        break;

      case eOperationType.op_add:
        {
          // add b to a returning a
          if (isFloatInConstExpression) {
            let aInternalFloat64: number = bigIntToFloat64(a);
            const bInternalFloat64: number = bigIntToFloat64(b);
            aInternalFloat64 += bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = (a + b) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fadd:
        {
          // add b to a returning a
          let aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          aInternalFloat64 += bInternalFloat64;
          // convert back to float32
          a = stringToBigIntFloat32(aInternalFloat64.toString());
        }
        break;

      case eOperationType.op_sub:
        {
          // subtract b from a returning a
          if (isFloatInConstExpression) {
            let aInternalFloat64: number = bigIntToFloat64(a);
            const bInternalFloat64: number = bigIntToFloat64(b);
            aInternalFloat64 -= bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = (a - b) & mask32Bit;
          }
        }
        break;

      case eOperationType.op_fsub:
        {
          let aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          aInternalFloat64 -= bInternalFloat64;
          // convert back to float32
          a = stringToBigIntFloat32(aInternalFloat64.toString());
        }
        break;

      case eOperationType.op_fge:
        {
          // force a to be greater than or equal to b
          if (isFloatInConstExpression) {
            let aInternalFloat64: number = bigIntToFloat64(a);
            const bInternalFloat64: number = bigIntToFloat64(b);
            aInternalFloat64 = aInternalFloat64 < bInternalFloat64 ? bInternalFloat64 : aInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = this.signExtendFrom32Bit(a) < this.signExtendFrom32Bit(b) ? b : a;
          }
        }
        break;

      case eOperationType.op_fle:
        {
          // force a to be less than or equal to b
          if (isFloatInConstExpression) {
            let aInternalFloat64: number = bigIntToFloat64(a);
            const bInternalFloat64: number = bigIntToFloat64(b);
            aInternalFloat64 = aInternalFloat64 > bInternalFloat64 ? bInternalFloat64 : aInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = this.signExtendFrom32Bit(a) > this.signExtendFrom32Bit(b) ? b : a;
          }
        }
        break;

      case eOperationType.op_addbits:
        // build bit-base (a) and bit-count (b) into a
        //  our 32-bit value: 00000000_00000000_000000bb_bbbaaaaa
        a = (a & 31n) | ((b & 31n) << 5n);
        break;

      case eOperationType.op_addpins:
        // build pin-base (a) and pin-count (b) into a
        //  our 32-bit value: 00000000_00000000_00000bbb_bbaaaaaa
        a = (a & 63n) | ((b & 31n) << 6n);
        break;

      case eOperationType.op_lt:
        // force a to be less than b
        // NOTE: in CON blocks return 1 or 0,
        //       runtime it returns all 1 bits or all 0 bits

        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 < bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = this.signExtendFrom32Bit(a) < this.signExtendFrom32Bit(b) ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_flt:
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 < bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_ltu:
        // unsigned less than
        a = a < b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_lte:
        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 <= bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = this.signExtendFrom32Bit(a) <= this.signExtendFrom32Bit(b) ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_flte:
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 <= bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_lteu:
        a = a <= b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_e:
        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 == bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a == b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fe:
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 == bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_ne:
        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 != bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a != b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fne:
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 != bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_gte:
        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 >= bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a >= b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fgte:
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 >= bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_gteu:
        a = a >= b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_gt:
        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 > bInternalFloat64 ? float1p0 : 0n;
        } else {
          a = a > b ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_fgt:
        {
          // this version returns True/False!!
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 > bInternalFloat64 ? true32Bit : false32Bit;
        }
        break;

      case eOperationType.op_gtu:
        a = a > b ? true32Bit : false32Bit;
        break;

      case eOperationType.op_ltegt:
        if (isFloatInConstExpression) {
          const aInternalFloat64: number = bigIntToFloat64(a);
          const bInternalFloat64: number = bigIntToFloat64(b);
          a = aInternalFloat64 == bInternalFloat64 ? 0n : aInternalFloat64 < bInternalFloat64 ? float1p0 | msb32Bit : float1p0;
        } else {
          const extendedA = this.signExtendFrom32Bit(a);
          const extendedB = this.signExtendFrom32Bit(b);
          a = extendedA == extendedB ? 0n : extendedA < extendedB ? mask32Bit : 1n;
        }
        break;

      case eOperationType.op_lognot:
        a = a ? false32Bit : true32Bit;
        break;

      case eOperationType.op_logand:
        a = a != 0n && b != 0n ? true32Bit : false32Bit;
        break;

      case eOperationType.op_logxor:
        a = (a == 0n && b != 0n) || (a != 0n && b == 0n) ? true32Bit : false32Bit;
        break;

      case eOperationType.op_logor:
        a = a != 0n || b != 0n ? true32Bit : false32Bit;
        break;

      default:
        // [error_MINE]
        throw new Error(`this operation NOT YET IMPLEMENTED`);
        break;
    }
    a &= mask32Bit;
    return bigIntLs32bitsToFloat64(a);
  }

  private signExtendFrom32Bit(value: bigint): bigint {
    // This code is performing a two's complement conversion on a 32-bit integer.
    //
    // Here's a step-by-step explanation:
    //
    // A bitwise AND operation between the value and 0xffffffff masks the value to keep only the lower 32 bits.
    //
    // Check to see if the most significant bit (bit 31) of the result is set.
    // This bit is the sign bit in a 32 - bit two's complement integer, and if it's set, the number is negative.
    //
    // If the sign bit is set, calculate the two's complement of the result to convert it to a negative number.
    // Inverts all bits of the result, and the + 1n adds 1 to the result, which are the steps to calculate the two's complement.
    // The - sign then makes the result negative.
    //
    // return result; Finally, the result is returned. If the original value was a positive 32-bit integer or zero,
    // it's returned as is. If it was a negative 32-bit integer, it's converted to a negative BigInt.
    //
    // In summary, this code is converting a 32-bit two's complement integer to a BigInt that can represent negative numbers.
    //
    let result: bigint = value & BigInt(0xffffffff);
    if (result & BigInt(0x80000000)) {
      result = -((result ^ BigInt(0xffffffff)) + 1n);
    }
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resolve_expression(elementIndex: number): SpinElement {
    return new SpinElement(eElementType.type_undefined, '', 0, 0);
  }

  private logMessage(message: string): void {
    if (this.context.logOptions.logResolver) {
      this.context.logger.logMessage(message);
    }
  }
}
