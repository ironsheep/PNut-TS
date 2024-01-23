/** @format */
'use strict';

// src/classes/parseUtils.ts

// a collection of generally useful functions for parsing spin

import { eElementType } from './types';

export enum SpinOpCode {
  // FIXME: TODO: replace this table with correct opcode values or indexed lookup into them...
  oc_bitnot,
  oc_neg,
  oc_bitand,
  oc_bitxor,
  oc_bitor,
  oc_mul,
  oc_div,
  oc_add,
  oc_sub,
  oc_lt,
  oc_gt,
  oc_ternary,
  oc_remu,
  oc_lteu,
  oc_gteu,
  oc_ltegt,
  oc_fne,
  oc_fe,
  oc_flte,
  oc_fgte,
  oc_shr,
  oc_shl,
  oc_divu,
  oc_rem,
  oc_fge,
  oc_fle,
  oc_ltu,
  oc_lte,
  oc_e,
  oc_ne,
  oc_gte,
  oc_gtu,
  oc_lognot,
  oc_logand,
  oc_logxor,
  oc_logor
}

export interface SpinSymbol {
  symbol: string;
  type: eElementType;
  value: SpinOpCode | 0;
}

export const find_symbol_s1: SpinSymbol[] = [
  // find_symbol_s1
  { symbol: '(', type: eElementType.type_left, value: 0 },
  { symbol: ')', type: eElementType.type_right, value: 0 },
  { symbol: '[', type: eElementType.type_leftb, value: 0 },
  { symbol: ']', type: eElementType.type_rightb, value: 0 },
  { symbol: ',', type: eElementType.type_comma, value: 0 },
  { symbol: '=', type: eElementType.type_equal, value: 0 },
  { symbol: '#', type: eElementType.type_pound, value: 0 },
  { symbol: ':', type: eElementType.type_colon, value: 0 },
  { symbol: '\\', type: eElementType.type_back, value: 0 },
  { symbol: '.', type: eElementType.type_dot, value: 0 },
  { symbol: '@', type: eElementType.type_at, value: 0 },
  { symbol: '~', type: eElementType.type_til, value: 0 },
  { symbol: '`', type: eElementType.type_tick, value: 0 },
  { symbol: '!', type: eElementType.type_op, value: SpinOpCode.oc_bitnot },
  { symbol: '&', type: eElementType.type_op, value: SpinOpCode.oc_bitand },
  { symbol: '^', type: eElementType.type_op, value: SpinOpCode.oc_bitxor },
  { symbol: '|', type: eElementType.type_op, value: SpinOpCode.oc_bitor },
  { symbol: '*', type: eElementType.type_op, value: SpinOpCode.oc_mul },
  { symbol: '/', type: eElementType.type_op, value: SpinOpCode.oc_div },
  { symbol: '+', type: eElementType.type_op, value: SpinOpCode.oc_add },
  { symbol: '-', type: eElementType.type_op, value: SpinOpCode.oc_sub },
  { symbol: '<', type: eElementType.type_op, value: SpinOpCode.oc_lt },
  { symbol: '>', type: eElementType.type_op, value: SpinOpCode.oc_gt },
  { symbol: '?', type: eElementType.type_op, value: SpinOpCode.oc_ternary }
];

export const find_symbol_s2: SpinSymbol[] = [
  // find_symbol_s2
  { symbol: ':=', type: eElementType.type_assign, value: 0 },
  { symbol: '@@', type: eElementType.type_atat, value: 0 },
  { symbol: '^@', type: eElementType.type_upat, value: 0 },
  { symbol: '..', type: eElementType.type_dotdot, value: 0 },
  { symbol: '~~', type: eElementType.type_tiltil, value: 0 },
  { symbol: '++', type: eElementType.type_inc, value: 0 },
  { symbol: '--', type: eElementType.type_dec, value: 0 },
  { symbol: '??', type: eElementType.type_rnd, value: 0 },
  { symbol: '>>', type: eElementType.type_op, value: SpinOpCode.oc_shr },
  { symbol: '<<', type: eElementType.type_op, value: SpinOpCode.oc_shl },
  { symbol: '+/', type: eElementType.type_op, value: SpinOpCode.oc_divu },
  { symbol: '//', type: eElementType.type_op, value: SpinOpCode.oc_rem },
  { symbol: '#>', type: eElementType.type_op, value: SpinOpCode.oc_fge },
  { symbol: '<#', type: eElementType.type_op, value: SpinOpCode.oc_fle },
  { symbol: '+<', type: eElementType.type_op, value: SpinOpCode.oc_ltu },
  { symbol: '<=', type: eElementType.type_op, value: SpinOpCode.oc_lte },
  { symbol: '==', type: eElementType.type_op, value: SpinOpCode.oc_e },
  { symbol: '<>', type: eElementType.type_op, value: SpinOpCode.oc_ne },
  { symbol: '>=', type: eElementType.type_op, value: SpinOpCode.oc_gte },
  { symbol: '+>', type: eElementType.type_op, value: SpinOpCode.oc_gtu },
  { symbol: '!!', type: eElementType.type_op, value: SpinOpCode.oc_lognot },
  { symbol: '&&', type: eElementType.type_op, value: SpinOpCode.oc_logand },
  { symbol: '^^', type: eElementType.type_op, value: SpinOpCode.oc_logxor },
  { symbol: '||', type: eElementType.type_op, value: SpinOpCode.oc_logor }
];

export const find_symbol_s3: SpinSymbol[] = [
  // find_symbol_s3
  { symbol: '+//', type: eElementType.type_op, value: SpinOpCode.oc_remu },
  { symbol: '+<=', type: eElementType.type_op, value: SpinOpCode.oc_lteu },
  { symbol: '+>=', type: eElementType.type_op, value: SpinOpCode.oc_gteu },
  { symbol: '<=>', type: eElementType.type_op, value: SpinOpCode.oc_ltegt },
  { symbol: '<>.', type: eElementType.type_op, value: SpinOpCode.oc_fne },
  { symbol: '==.', type: eElementType.type_op, value: SpinOpCode.oc_fe },
  { symbol: '<=.', type: eElementType.type_op, value: SpinOpCode.oc_flte },
  { symbol: '>=.', type: eElementType.type_op, value: SpinOpCode.oc_fgte }
];
