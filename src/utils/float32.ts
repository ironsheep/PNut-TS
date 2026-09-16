/** @format */

// Display helpers for 32-bit values and packed floats.
//
// Float VALUES are never computed here: literal parsing and every compile-time
// float operation go through PNut's own routines in src/utils/pnutFloat.ts.

'use strict';
// src/utils/float32.ts
export function hexString(value: bigint | number | string): string {
  // general non-masked bigint to float
  if (typeof value === 'string') {
    return value;
  } else {
    return `0x${BigInt(value).toString(16).padStart(8, '0').toUpperCase()}`;
  }
}

export function float32ToHexString(float32: bigint): string {
  // used by: spinElementizer.ts
  const tempNumber: number = Number(float32 & BigInt(0xffffffff));
  return `0x${tempNumber.toString(16).toUpperCase()}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function float32ToString(float32: bigint | string): string {
  // used by: spinElement.ts, spinElementizer.ts
  return '';
}
