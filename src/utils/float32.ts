/** @format */

// this is

'use strict';
// src/utils/float32.ts
export function toSinglePrecisionFloat(numStr: string): number {
  //
  // In this code, toSinglePrecisionFloat function takes a string, parses it to a float
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

export function toSinglePrecisionHex(float32: number): string {
  const float32Array = new Float32Array(1);
  float32Array[0] = float32;
  const dataView = new DataView(float32Array.buffer);
  const intView = dataView.getUint32(0);
  return intView.toString(16);
}

export function hexToFloat64(hex: string): number {
  const int = parseInt(hex, 16);
  const float32Array = new Float32Array(1);
  const dataView = new DataView(float32Array.buffer);
  dataView.setUint32(0, int);
  return dataView.getFloat32(0);
}

export function toFloatString(float32: number | string): string {
  const hexValue = toSinglePrecisionHex(typeof float32 === 'number' ? float32 : 0); // replace with your hex value
  const float64Value = hexToFloat64(hexValue).toExponential(6);
  return float64Value.toString();
}
