// generated opcode table load

export enum eOpcode {
  oc_bitnot,
  oc_neg,
  oc_fneg,
  oc_abs,
  oc_fabs,
  oc_encod,
  oc_decod,
  oc_bmask,
  oc_ones,
  oc_sqrt,
  oc_fsqrt,
  oc_qlog,
  oc_qexp,
  oc_shr,
  oc_shl,
  oc_sar,
  oc_ror,
  oc_rol,
  oc_rev,
  oc_zerox,
  oc_signx,
  oc_bitand,
  oc_bitxor,
  oc_bitor,
  oc_mul,
  oc_fmul,
  oc_div,
  oc_fdiv,
  oc_divu,
  oc_rem,
  oc_remu,
  oc_sca,
  oc_scas,
  oc_frac,
  oc_add,
  oc_fadd,
  oc_sub,
  oc_fsub,
  oc_fge,
  oc_fle,
  oc_addbits,
  oc_addpins,
  oc_lt,
  oc_flt,
  oc_ltu,
  oc_lte,
  oc_flte,
  oc_lteu,
  oc_e,
  oc_fe,
  oc_ne,
  oc_fne,
  oc_gte,
  oc_fgte,
  oc_gteu,
  oc_gt,
  oc_fgt,
  oc_gtu,
  oc_ltegt,
  oc_lognot,
  oc_lognot_name,
  oc_logand,
  oc_logand_name,
  oc_logxor,
  oc_logxor_name,
  oc_logor,
  oc_logor_name,
  oc_ternary
}

// generated opcode table load

//		oc		op		prec	bytecode	ternary	binary	unary	assign	float	alias	hubcode
this.opcodeValues.set(eOpcode.oc_bitnot, opcodeValue(eOperationType.op_bitnot, 0, eByteCode.bc_bitnot, 0, 0, 1, 1, 0, 0, 0)); //  !
this.opcodeValues.set(eOpcode.oc_neg, opcodeValue(eOperationType.op_neg, 0, eByteCode.bc_neg, 0, 0, 1, 1, 1, 0, 0)); //  -	(uses op_sub symbol)
this.opcodeValues.set(eOpcode.oc_fneg, opcodeValue(eOperationType.op_fneg, 0, eByteCode.bc_fneg, 0, 0, 1, 0, 1, 0, 1)); //  -.	(uses op_fsub symbol)
this.opcodeValues.set(eOpcode.oc_abs, opcodeValue(eOperationType.op_abs, 0, eByteCode.bc_abs, 0, 0, 1, 1, 1, 0, 0)); //  ABS
this.opcodeValues.set(eOpcode.oc_fabs, opcodeValue(eOperationType.op_fabs, 0, eByteCode.bc_fabs, 0, 0, 1, 0, 1, 0, 1)); //  FABS
this.opcodeValues.set(eOpcode.oc_encod, opcodeValue(eOperationType.op_encod, 0, eByteCode.bc_encod, 0, 0, 1, 1, 0, 0, 0)); //  ENCOD
this.opcodeValues.set(eOpcode.oc_decod, opcodeValue(eOperationType.op_decod, 0, eByteCode.bc_decod, 0, 0, 1, 1, 0, 0, 0)); //  DECOD
this.opcodeValues.set(eOpcode.oc_bmask, opcodeValue(eOperationType.op_bmask, 0, eByteCode.bc_bmask, 0, 0, 1, 1, 0, 0, 0)); //  BMASK
this.opcodeValues.set(eOpcode.oc_ones, opcodeValue(eOperationType.op_ones, 0, eByteCode.bc_ones, 0, 0, 1, 1, 0, 0, 0)); //  ONES
this.opcodeValues.set(eOpcode.oc_sqrt, opcodeValue(eOperationType.op_sqrt, 0, eByteCode.bc_sqrt, 0, 0, 1, 1, 0, 0, 0)); //  SQRT
this.opcodeValues.set(eOpcode.oc_fsqrt, opcodeValue(eOperationType.op_fsqrt, 0, eByteCode.bc_fsqrt, 0, 0, 1, 0, 1, 0, 1)); //  FSQRT
this.opcodeValues.set(eOpcode.oc_qlog, opcodeValue(eOperationType.op_qlog, 0, eByteCode.bc_qlog, 0, 0, 1, 1, 0, 0, 0)); //  QLOG
this.opcodeValues.set(eOpcode.oc_qexp, opcodeValue(eOperationType.op_qexp, 0, eByteCode.bc_qexp, 0, 0, 1, 1, 0, 0, 0)); //  QEXP
this.opcodeValues.set(eOpcode.oc_shr, opcodeValue(eOperationType.op_shr, 1, eByteCode.bc_shr, 0, 1, 0, 1, 0, 0, 0)); //  >>
this.opcodeValues.set(eOpcode.oc_shl, opcodeValue(eOperationType.op_shl, 1, eByteCode.bc_shl, 0, 1, 0, 1, 0, 0, 0)); //  <<
this.opcodeValues.set(eOpcode.oc_sar, opcodeValue(eOperationType.op_sar, 1, eByteCode.bc_sar, 0, 1, 0, 1, 0, 0, 0)); //  SAR
this.opcodeValues.set(eOpcode.oc_ror, opcodeValue(eOperationType.op_ror, 1, eByteCode.bc_ror, 0, 1, 0, 1, 0, 0, 0)); //  ROR
this.opcodeValues.set(eOpcode.oc_rol, opcodeValue(eOperationType.op_rol, 1, eByteCode.bc_rol, 0, 1, 0, 1, 0, 0, 0)); //  ROL
this.opcodeValues.set(eOpcode.oc_rev, opcodeValue(eOperationType.op_rev, 1, eByteCode.bc_rev, 0, 1, 0, 1, 0, 0, 0)); //  REV
this.opcodeValues.set(eOpcode.oc_zerox, opcodeValue(eOperationType.op_zerox, 1, eByteCode.bc_zerox, 0, 1, 0, 1, 0, 0, 0)); //  ZEROX
this.opcodeValues.set(eOpcode.oc_signx, opcodeValue(eOperationType.op_signx, 1, eByteCode.bc_signx, 0, 1, 0, 1, 0, 0, 0)); //  SIGNX
this.opcodeValues.set(eOpcode.oc_bitand, opcodeValue(eOperationType.op_bitand, 2, eByteCode.bc_bitand, 0, 1, 0, 1, 0, 0, 0)); //  &
this.opcodeValues.set(eOpcode.oc_bitxor, opcodeValue(eOperationType.op_bitxor, 3, eByteCode.bc_bitxor, 0, 1, 0, 1, 0, 0, 0)); //  ^
this.opcodeValues.set(eOpcode.oc_bitor, opcodeValue(eOperationType.op_bitor, 4, eByteCode.bc_bitor, 0, 1, 0, 1, 0, 0, 0)); //  |
this.opcodeValues.set(eOpcode.oc_mul, opcodeValue(eOperationType.op_mul, 5, eByteCode.bc_mul, 0, 1, 0, 1, 1, 0, 0)); //  *
this.opcodeValues.set(eOpcode.oc_fmul, opcodeValue(eOperationType.op_fmul, 5, eByteCode.bc_fmul, 0, 1, 0, 0, 1, 0, 1)); //  *.
this.opcodeValues.set(eOpcode.oc_div, opcodeValue(eOperationType.op_div, 5, eByteCode.bc_div, 0, 1, 0, 1, 1, 0, 0)); //  /
this.opcodeValues.set(eOpcode.oc_fdiv, opcodeValue(eOperationType.op_fdiv, 5, eByteCode.bc_fdiv, 0, 1, 0, 0, 1, 0, 1)); //  /.
this.opcodeValues.set(eOpcode.oc_divu, opcodeValue(eOperationType.op_divu, 5, eByteCode.bc_divu, 0, 1, 0, 1, 0, 0, 0)); //  +/
this.opcodeValues.set(eOpcode.oc_rem, opcodeValue(eOperationType.op_rem, 5, eByteCode.bc_rem, 0, 1, 0, 1, 0, 0, 0)); //  //
this.opcodeValues.set(eOpcode.oc_remu, opcodeValue(eOperationType.op_remu, 5, eByteCode.bc_remu, 0, 1, 0, 1, 0, 0, 0)); //  +//
this.opcodeValues.set(eOpcode.oc_sca, opcodeValue(eOperationType.op_sca, 5, eByteCode.bc_sca, 0, 1, 0, 1, 0, 0, 0)); //  SCA
this.opcodeValues.set(eOpcode.oc_scas, opcodeValue(eOperationType.op_scas, 5, eByteCode.bc_scas, 0, 1, 0, 1, 0, 0, 0)); //  SCAS
this.opcodeValues.set(eOpcode.oc_frac, opcodeValue(eOperationType.op_frac, 5, eByteCode.bc_frac, 0, 1, 0, 1, 0, 0, 0)); //  FRAC
this.opcodeValues.set(eOpcode.oc_add, opcodeValue(eOperationType.op_add, 6, eByteCode.bc_add, 0, 1, 0, 1, 1, 0, 0)); //  +
this.opcodeValues.set(eOpcode.oc_fadd, opcodeValue(eOperationType.op_fadd, 6, eByteCode.bc_fadd, 0, 1, 0, 0, 1, 0, 1)); //  +.
this.opcodeValues.set(eOpcode.oc_sub, opcodeValue(eOperationType.op_sub, 6, eByteCode.bc_sub, 0, 1, 0, 1, 1, 0, 0)); //  -
this.opcodeValues.set(eOpcode.oc_fsub, opcodeValue(eOperationType.op_fsub, 6, eByteCode.bc_fsub, 0, 1, 0, 0, 1, 0, 1)); //  -.
this.opcodeValues.set(eOpcode.oc_fge, opcodeValue(eOperationType.op_fge, 7, eByteCode.bc_fge, 0, 1, 0, 1, 1, 0, 0)); //  #>
this.opcodeValues.set(eOpcode.oc_fle, opcodeValue(eOperationType.op_fle, 7, eByteCode.bc_fle, 0, 1, 0, 1, 1, 0, 0)); //  <#
this.opcodeValues.set(eOpcode.oc_addbits, opcodeValue(eOperationType.op_addbits, 8, eByteCode.bc_addbits, 0, 1, 0, 1, 0, 0, 0)); //  ADDBITS
this.opcodeValues.set(eOpcode.oc_addpins, opcodeValue(eOperationType.op_addpins, 8, eByteCode.bc_addpins, 0, 1, 0, 1, 0, 0, 0)); //  ADDPINS
this.opcodeValues.set(eOpcode.oc_lt, opcodeValue(eOperationType.op_lt, 9, eByteCode.bc_lt, 0, 1, 0, 0, 1, 0, 0)); //  <
this.opcodeValues.set(eOpcode.oc_flt, opcodeValue(eOperationType.op_flt, 9, eByteCode.bc_flt, 0, 1, 0, 0, 1, 0, 1)); //  <.
this.opcodeValues.set(eOpcode.oc_ltu, opcodeValue(eOperationType.op_ltu, 9, eByteCode.bc_ltu, 0, 1, 0, 0, 0, 0, 0)); //  +<
this.opcodeValues.set(eOpcode.oc_lte, opcodeValue(eOperationType.op_lte, 9, eByteCode.bc_lte, 0, 1, 0, 0, 1, 0, 0)); //  <=
this.opcodeValues.set(eOpcode.oc_flte, opcodeValue(eOperationType.op_flte, 9, eByteCode.bc_flte, 0, 1, 0, 0, 1, 0, 1)); //  <=.
this.opcodeValues.set(eOpcode.oc_lteu, opcodeValue(eOperationType.op_lteu, 9, eByteCode.bc_lteu, 0, 1, 0, 0, 0, 0, 0)); //  +<=
this.opcodeValues.set(eOpcode.oc_e, opcodeValue(eOperationType.op_e, 9, eByteCode.bc_e, 0, 1, 0, 0, 1, 0, 0)); //  ==
this.opcodeValues.set(eOpcode.oc_fe, opcodeValue(eOperationType.op_fe, 9, eByteCode.bc_fe, 0, 1, 0, 0, 1, 0, 1)); //  ==.
this.opcodeValues.set(eOpcode.oc_ne, opcodeValue(eOperationType.op_ne, 9, eByteCode.bc_ne, 0, 1, 0, 0, 1, 0, 0)); //  <>
this.opcodeValues.set(eOpcode.oc_fne, opcodeValue(eOperationType.op_fne, 9, eByteCode.bc_fne, 0, 1, 0, 0, 1, 0, 1)); //  <>.
this.opcodeValues.set(eOpcode.oc_gte, opcodeValue(eOperationType.op_gte, 9, eByteCode.bc_gte, 0, 1, 0, 0, 1, 0, 0)); //  >=
this.opcodeValues.set(eOpcode.oc_fgte, opcodeValue(eOperationType.op_fgte, 9, eByteCode.bc_fgte, 0, 1, 0, 0, 1, 0, 1)); //  >=.
this.opcodeValues.set(eOpcode.oc_gteu, opcodeValue(eOperationType.op_gteu, 9, eByteCode.bc_gteu, 0, 1, 0, 0, 0, 0, 0)); //  +>=
this.opcodeValues.set(eOpcode.oc_gt, opcodeValue(eOperationType.op_gt, 9, eByteCode.bc_gt, 0, 1, 0, 0, 1, 0, 0)); //  >
this.opcodeValues.set(eOpcode.oc_fgt, opcodeValue(eOperationType.op_fgt, 9, eByteCode.bc_fgt, 0, 1, 0, 0, 1, 0, 1)); //  >.
this.opcodeValues.set(eOpcode.oc_gtu, opcodeValue(eOperationType.op_gtu, 9, eByteCode.bc_gtu, 0, 1, 0, 0, 0, 0, 0)); //  +>
this.opcodeValues.set(eOpcode.oc_ltegt, opcodeValue(eOperationType.op_ltegt, 9, eByteCode.bc_ltegt, 0, 1, 0, 0, 1, 0, 0)); //  <=>
this.opcodeValues.set(eOpcode.oc_lognot, opcodeValue(eOperationType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 1, 0)); //  !!
this.opcodeValues.set(eOpcode.oc_lognot_name, opcodeValue(eOperationType.op_lognot, 10, eByteCode.bc_lognot, 0, 0, 1, 1, 0, 0, 0)); //  NOT
this.opcodeValues.set(eOpcode.oc_logand, opcodeValue(eOperationType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 1, 0)); //  &&
this.opcodeValues.set(eOpcode.oc_logand_name, opcodeValue(eOperationType.op_logand, 11, eByteCode.bc_logand, 0, 1, 0, 1, 0, 0, 0)); //  AND
this.opcodeValues.set(eOpcode.oc_logxor, opcodeValue(eOperationType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 1, 0)); //  ^^
this.opcodeValues.set(eOpcode.oc_logxor_name, opcodeValue(eOperationType.op_logxor, 12, eByteCode.bc_logxor, 0, 1, 0, 1, 0, 0, 0)); //  XOR
this.opcodeValues.set(eOpcode.oc_logor, opcodeValue(eOperationType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 1, 0)); //  ||
this.opcodeValues.set(eOpcode.oc_logor_name, opcodeValue(eOperationType.op_logor, 13, eByteCode.bc_logor, 0, 1, 0, 1, 0, 0, 0)); //  OR
this.opcodeValues.set(eOpcode.oc_ternary, opcodeValue(eOperationType.op_ternary, 14, 0, 1, 0, 0, 1, 0, 0, 0)); //  ?
