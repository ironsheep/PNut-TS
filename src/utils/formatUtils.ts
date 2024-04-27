/** @format */

// this is our math block stack

'use strict';

export function hexByte(uint8: number, prefixStr: string = '$'): string {
  return `${prefixStr}${uint8.toString(16).toUpperCase().padStart(2, '0')}`;
}

export function hexWord(uint16: number, prefixStr: string = '$'): string {
  return `${prefixStr}${uint16.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function hexLong(uint32: number, prefixStr: string = '$'): string {
  // NOTE: the >>> shift forces this to unsigned math
  return `${prefixStr}${(uint32 >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function hexAddress(uint32: number, prefixStr: string = '$'): string {
  // NOTE: the >>> shift forces this to unsigned math
  return `${prefixStr}${(uint32 >>> 0).toString(16).toUpperCase().padStart(5, '0')}`;
}
