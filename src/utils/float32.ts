/** @format */

// this is

'use strict';
// src/utils/float32.ts

export function stringToFloat32(numStr: string): number {
  // used by: spinElementizer.ts
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

export function float32ToHexString(float32: number): string {
  // used by: spinElementizer.ts
  const float32Array = new Float32Array(1);
  float32Array[0] = float32;
  const dataView = new DataView(float32Array.buffer);
  const intView = dataView.getUint32(0);
  return intView.toString(16);
}

export function float32ToString(float32: number | string): string {
  // used by: spinElement.ts, spinElementizer.ts
  const hexValue = float32ToHexString(typeof float32 === 'number' ? float32 : 0); // replace with your hex value
  const float64Value = hexStringToFloat64(hexValue).toExponential(6);
  return float64Value.toString();
}

export function hexStringToFloat64(hex: string): number {
  const int = parseInt(hex, 16);
  const float32Array = new Float32Array(1);
  const dataView = new DataView(float32Array.buffer);
  dataView.setUint32(0, int);
  return dataView.getFloat32(0);
}

//
//  Resolver-only functions
//
export function bigIntFloat32ToNumber(float32BigInt: bigint): number {
  // Create a new ArrayBuffer with a size of 4 bytes
  const buffer = new ArrayBuffer(4);
  // Create a new DataView from the ArrayBuffer
  const view = new DataView(buffer);
  // Get the least significant 32 bits of the BigInt and set into the DataView
  view.setUint32(0, Number(float32BigInt & BigInt(0xffffffff)), true); // true for little-endian
  // Create a new Float32Array from the ArrayBuffer
  const float32Array = new Float32Array(buffer);
  // Return the first element of the Float32Array
  return float32Array[0];
}

export function numberToBigIntFloat32(float64: number): bigint {
  // Create a new ArrayBuffer with a size of 4 bytes
  const buffer = new ArrayBuffer(4);
  // Create a new Float32Array from the ArrayBuffer
  const float32Array = new Float32Array(buffer);
  // Set the first element of the Float32Array to the number
  float32Array[0] = float64;
  // Create a new DataView from the ArrayBuffer
  const view = new DataView(buffer);
  // Return the 32 bits from that DataView as a BigInt
  //   (note true is for little - endian)
  return BigInt(view.getUint32(0, true));
}
