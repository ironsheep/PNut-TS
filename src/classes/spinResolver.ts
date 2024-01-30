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
import { hexStringToFloat64, stringToBigIntFloat32, bigIntToHexString, bigIntLs32bitsToNumber } from '../utils/float32';

export class SpinResolver {
  private context: Context;
  private spinElements: SpinElement[];
  private numberStack: NumberStack = new NumberStack();

  constructor(ctx: Context, elementList: SpinElement[]) {
    this.context = ctx;
    this.spinElements = elementList;
  }

  public testResolver(parmA: number, parmB: number, operation: eOperationType, isFloatOperation: boolean): number {
    const bigMSb: bigint = BigInt(0x80000000);

    let a: bigint = BigInt(parmA);
    let b: bigint = BigInt(parmB);

    // clip in values before we operate on them
    a &= BigInt(0xffffffff);
    b &= BigInt(0xffffffff);
    const bitCountFromB: bigint = b & 31n;

    switch (operation) {
      case eOperationType.op_bitnot:
        a = ~a;
        break;
      case eOperationType.op_fneg:
        isFloatOperation = true;
      case eOperationType.op_neg:
        if (isFloatOperation) {
          a = a ^ bigMSb;
        } else {
          a = -a;
        }
        break;
      case eOperationType.op_fabs:
        isFloatOperation = true;
      case eOperationType.op_abs:
        if (isFloatOperation) {
          a = a & BigInt(0x7fffffff);
        } else {
          a = a & bigMSb ? a : -a;
        }
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
        a = BigInt(0xffffffff) >> (~a & 31n);
        break;

      case eOperationType.op_ones:
        {
          let bitCount: bigint = 0n;
          for (let index: bigint = 31n; index >= 0n; index--) {
            if ((a & (1n << index)) != 0n) {
              bitCount++;
              break;
            }
          }
          a = bitCount;
        }
        break;

      case eOperationType.op_sqrt:
        a = this.bigIntSqrt(a);
        break;

      case eOperationType.op_fsqrt:
        {
          if (a > bigMSb) {
            // [error_fpcmbp]
            throw new Error(`Floating-point constant must be positive`);
          }
          // convert to internal from float32
          const internalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
          // get square root
          const internalSqRoot64: number = Math.sqrt(internalFloat64);
          // convert back to float32
          a = stringToBigIntFloat32(internalSqRoot64.toString());
        }
        break;

      //case eOperationType.op_qlog:
      //TODO: add our code here
      //  break;

      //case eOperationType.op_qexp:
      //TODO: add our code here
      //  break;

      case eOperationType.op_shr:
        a = a >> bitCountFromB;
        break;

      case eOperationType.op_shl:
        a = BigInt(a) << bitCountFromB;
        break;

      case eOperationType.op_sar:
        {
          const isNeg: boolean = a & bigMSb ? true : false;
          a = ((isNeg ? BigInt(0xffffffff00000000) : 0n) | a) >> bitCountFromB;
        }
        break;

      case eOperationType.op_ror:
        {
          const doubleUp: bigint = (a << 32n) | a;
          a = doubleUp >> bitCountFromB;
        }
        break;

      case eOperationType.op_rol:
        {
          //
          const doubleUp: bigint = (a << 32n) | a;
          a = doubleUp >> BigInt(32n - bitCountFromB);
        }
        break;

      case eOperationType.op_rev:
        {
          // reverse b ls-bits of a
          let c: bigint = 0n;
          for (let index: bigint = 0n; index <= bitCountFromB; index++) {
            c = (c << 1n) | (a & 1n);
            a = a >> 1n;
          }
          a = c;
        }
        break;

      case eOperationType.op_zerox:
        // zero extend a from bit b
        a &= BigInt(0xffffffff) >> (~b & 31n);
        break;

      case eOperationType.op_signx:
        // copy bit b of a to all higher bits of a
        {
          const isNeg: boolean = (a >> bitCountFromB) & 1n ? true : false;
          a &= BigInt(0xffffffff) >> (~b & 31n);
          a |= isNeg ? BigInt(0xfffffffe) << bitCountFromB : 0n;
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

      case eOperationType.op_fmul:
        isFloatOperation = true;
      case eOperationType.op_mul:
        // multiply a by b
        {
          if (isFloatOperation) {
            // convert to internal from float32
            let aInternalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
            const bInternalFloat64: number = hexStringToFloat64(bigIntToHexString(b));
            aInternalFloat64 *= bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a *= b;
          }
        }
        break;

      case eOperationType.op_fdiv:
        isFloatOperation = true;
      case eOperationType.op_div:
        // divide a by b
        {
          if (isFloatOperation) {
            // convert to internal from float32
            if ((b & BigInt(0x7fffffff)) == 0n) {
              // [error_fpo]
              throw new Error(`Floating-point overflow`);
            }
            let aInternalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
            const bInternalFloat64: number = hexStringToFloat64(bigIntToHexString(b));
            aInternalFloat64 /= bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            if (b == 0n) {
              // [error_dbz]
              throw new Error(`Divide by zero`);
            }
            a = this.signExtend(a) / this.signExtend(b);
          }
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
        a = this.signExtend(a) % this.signExtend(b);
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
        a = (this.signExtend(a) * this.signExtend(b)) >> 30n;
        break;

      case eOperationType.op_frac:
        if (b == 0n) {
          // [error_dbz]
          throw new Error(`Divide by zero`);
        }
        a = (a << 32n) / b;
        if (a > BigInt(0xffffffff)) {
          // [error_divo]
          throw new Error(`Division overflow`);
        }
        break;

      case eOperationType.op_fadd:
        isFloatOperation = true;
      case eOperationType.op_add:
        {
          // add b to a returning a
          if (isFloatOperation) {
            let aInternalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
            const bInternalFloat64: number = hexStringToFloat64(bigIntToHexString(b));
            aInternalFloat64 += bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a += b;
          }
        }
        break;

      case eOperationType.op_fsub:
        isFloatOperation = true;
      case eOperationType.op_sub:
        {
          // subtract b from a returning a
          if (isFloatOperation) {
            let aInternalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
            const bInternalFloat64: number = hexStringToFloat64(bigIntToHexString(b));
            aInternalFloat64 -= bInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a -= b;
          }
        }
        break;

      case eOperationType.op_fge:
        {
          // force a to be greater than or equal to b
          if (isFloatOperation) {
            let aInternalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
            const bInternalFloat64: number = hexStringToFloat64(bigIntToHexString(b));
            aInternalFloat64 = aInternalFloat64 < bInternalFloat64 ? bInternalFloat64 : aInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = a < b ? b : a;
          }
        }
        break;

      case eOperationType.op_fle:
        {
          // force a to be less than or equal to b
          if (isFloatOperation) {
            let aInternalFloat64: number = hexStringToFloat64(bigIntToHexString(a));
            const bInternalFloat64: number = hexStringToFloat64(bigIntToHexString(b));
            aInternalFloat64 = aInternalFloat64 > bInternalFloat64 ? bInternalFloat64 : aInternalFloat64;
            // convert back to float32
            a = stringToBigIntFloat32(aInternalFloat64.toString());
          } else {
            a = a > b ? b : a;
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

      default:
        a = 0n;
        // [error_MINE]
        throw new Error(`this operation NOT YET IMPLEMENTED`);
        break;
    }
    a &= BigInt(0xffffffff);
    return bigIntLs32bitsToNumber(a);
  }

  private signExtend(value: bigint): bigint {
    // value is a 32bit value stored in a BigInt  (so sign bit is 2^31)
    // positive is left alone
    // for max negative we return ...
    // for less then max negative we return ...
    let result: bigint = value;
    if (value & BigInt(0x80000000)) {
      result = value == BigInt(0x80000000) ? -value : -((~value + 1n) & BigInt(0x7fffffff));
    }
    return result;
  }

  private bigIntSqrt(n: bigint): bigint {
    // The integer square root of a number n is the largest integer x such that x * x <= n.
    // Calculate the integer square root using a binary search algorithm:

    //if (n < 0) {
    //  throw new Error('Square root of negative numbers is not supported');
    //}

    if (n < 2) {
      return n;
    }

    return this.newtonIteration(n, 1n);
  }

  private newtonIteration(n: bigint, x0: bigint): bigint {
    const x1 = (n / x0 + x0) >> 1n;
    if (x0 === x1 || x0 === x1 - 1n) {
      return x0;
    }
    return this.newtonIteration(n, x1);
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
