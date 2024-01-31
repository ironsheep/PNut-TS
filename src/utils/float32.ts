/** @format */

// this is

'use strict';
// src/utils/float32.ts

// BigInt -> Number
// BigInt -> String
// String -> Float32

export function stringToFloat32(numStr: string): number {
  //
  // In this code, stringToFloat32 function takes a string, parses it to a float
  // using parseFloat, stores it in a Float32Array(which uses single - precision
  // floating - point format), and then uses a DataView to get the single - precision
  // float value from the Float32Array.
  //
  // Please note that the returned value is still a JavaScript number, which is a
  // double - precision float, but it has the precision of a single - precision float.
  // This means that it may not have the same precision as the original string if the
  // original string had more precision than a single - precision float can represent.
  //
  const float32Array = new Float32Array(1);
  float32Array[0] = parseFloat(numStr);
  const dataView = new DataView(float32Array.buffer);
  return dataView.getFloat32(0);
}

export function stringToBigIntFloat32(numStr: string): bigint {
  const float32Array = new Float32Array(1);
  float32Array[0] = parseFloat(numStr);
  const dataView = new DataView(float32Array.buffer);
  if (float32ToHexString(dataView.getFloat32(0)) == '7f800000') {
    // [error_fpcmbw]
    throw new Error(`Floating-point constant must be within +/- 3.4e+38`);
  }
  const resultBigInt: bigint = BigInt(dataView.getFloat32(0)) & BigInt(0xffffffff);
  return resultBigInt;
}

export function bigIntToHexString(float32BigInt: bigint): string {
  return float32ToHexString(bigIntLs32bitsToFloat64(float32BigInt));
}

export function float32ToHexString(float32: number): string {
  const float32Array = new Float32Array(1);
  float32Array[0] = float32;
  const dataView = new DataView(float32Array.buffer);
  const intView = dataView.getUint32(0);
  return intView.toString(16);
}

export function float32ToString(float32: number | string): string {
  const hexValue = float32ToHexString(typeof float32 === 'number' ? float32 : 0); // replace with your hex value
  const float64Value = hexStringToFloat64(hexValue).toExponential(6);
  return float64Value.toString();
}

export function bigIntLs32bitsToFloat64(float32BigInt: bigint): number {
  const leastSignificant32Bits = float32BigInt & BigInt(0xffffffff);
  return Number(leastSignificant32Bits);
}

export function bigIntToFloat64(float32BigInt: bigint): number {
  // FIXME: this appears to NOT be working
  return hexStringToFloat64(bigIntToHexString(float32BigInt));
}

export function hexStringToFloat64(hex: string): number {
  const int = parseInt(hex, 16);
  const float32Array = new Float32Array(1);
  const dataView = new DataView(float32Array.buffer);
  dataView.setUint32(0, int);
  return dataView.getFloat32(0);
}
