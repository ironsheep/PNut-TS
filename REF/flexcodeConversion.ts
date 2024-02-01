// generated opcode table load

export enum eFlexcodes {
  fc_coginit,
  fc_coginit_push,
  fc_cogstop,
  fc_cogid,
  fc_cogchk,
  fc_getrnd,
  fc_getct,
  fc_pollct,
  fc_waitct,
  fc_pinwrite,
  fc_pinlow,
  fc_pinhigh,
  fc_pintoggle,
  fc_pinfloat,
  fc_pinread,
  fc_pinstart,
  fc_pinclear,
  fc_wrpin,
  fc_wxpin,
  fc_wypin,
  fc_akpin,
  fc_rdpin,
  fc_rqpin,
  fc_locknew,
  fc_lockret,
  fc_locktry,
  fc_lockrel,
  fc_lockchk,
  fc_cogatn,
  fc_pollatn,
  fc_waitatn,
  fc_hubset,
  fc_clkset,
  fc_regexec,
  fc_regload,
  fc_call,
  fc_getregs,
  fc_setregs,
  fc_bytemove,
  fc_bytefill,
  fc_wordmove,
  fc_wordfill,
  fc_longmove,
  fc_longfill,
  fc_strsize,
  fc_strcomp,
  fc_strcopy,
  fc_getcrc,
  fc_waitus,
  fc_waitms,
  fc_getms,
  fc_getsec,
  fc_muldiv64,
  fc_qsin,
  fc_qcos,
  fc_rotxy,
  fc_polxy,
  fc_xypol,
  fc_nan,
  fc_round,
  fc_trunc,
  fc_float,
}

// generated flexcode table load

//		flexcode	bytecode	params	results	pinfld	hubcode
//		---------------------------------------------------------------------------------------
  this.flexcodeValues.set(eFlexcodes.fc_coginit, flexcodeValue(eByteCodes.bc_coginit, 3, 0, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_coginit_push, flexcodeValue(eByteCodes.bc_coginit_push, 3, 1, 0, 0))
  this.flexcodeValues.set(eFlexcodes.fc_cogstop, flexcodeValue(eByteCodes.bc_cogstop, 1, 0, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_cogid, flexcodeValue(eByteCodes.bc_cogid, 0, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_cogchk, flexcodeValue(eByteCodes.bc_cogchk, 1, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_getrnd, flexcodeValue(eByteCodes.bc_getrnd, 0, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_getct, flexcodeValue(eByteCodes.bc_getct, 0, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_pollct, flexcodeValue(eByteCodes.bc_pollct, 1, 1, 0, 0))
  this.flexcodeValues.set(eFlexcodes.fc_waitct, flexcodeValue(eByteCodes.bc_waitct, 1, 0, 0, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinwrite, flexcodeValue(eByteCodes.bc_pinwrite, 2, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinlow, flexcodeValue(eByteCodes.bc_pinlow, 1, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinhigh, flexcodeValue(eByteCodes.bc_pinhigh, 1, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pintoggle, flexcodeValue(eByteCodes.bc_pintoggle, 1, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinfloat, flexcodeValue(eByteCodes.bc_pinfloat, 1, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinread, flexcodeValue(eByteCodes.bc_pinread, 1, 1, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinstart, flexcodeValue(eByteCodes.bc_pinstart, 4, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_pinclear, flexcodeValue(eByteCodes.bc_pinclear, 1, 0, 1, 0))
  this.flexcodeValues.set(eFlexcodes.fc_wrpin, flexcodeValue(eByteCodes.bc_wrpin, 2, 0, 1, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_wxpin, flexcodeValue(eByteCodes.bc_wxpin, 2, 0, 1, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_wypin, flexcodeValue(eByteCodes.bc_wypin, 2, 0, 1, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_akpin, flexcodeValue(eByteCodes.bc_akpin, 1, 0, 1, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_rdpin, flexcodeValue(eByteCodes.bc_rdpin, 1, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_rqpin, flexcodeValue(eByteCodes.bc_rqpin, 1, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_locknew, flexcodeValue(eByteCodes.bc_locknew, 0, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_lockret, flexcodeValue(eByteCodes.bc_lockret, 1, 0, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_locktry, flexcodeValue(eByteCodes.bc_locktry, 1, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_lockrel, flexcodeValue(eByteCodes.bc_lockrel, 1, 0, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_lockchk, flexcodeValue(eByteCodes.bc_lockchk, 1, 1, 0, 0))
  this.flexcodeValues.set(eFlexcodes.fc_cogatn, flexcodeValue(eByteCodes.bc_cogatn, 1, 0, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_pollatn, flexcodeValue(eByteCodes.bc_pollatn, 0, 1, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_waitatn, flexcodeValue(eByteCodes.bc_waitatn, 0, 0, 0, 0))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_hubset, flexcodeValue(eByteCodes.bc_hubset, 1, 0, 0, 1))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_clkset, flexcodeValue(eByteCodes.bc_clkset, 2, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_regexec, flexcodeValue(eByteCodes.bc_regexec, 1, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_regload, flexcodeValue(eByteCodes.bc_regload, 1, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_call, flexcodeValue(eByteCodes.bc_call, 1, 0, 0, 1))   // (also asm instruction)

  this.flexcodeValues.set(eFlexcodes.fc_getregs, flexcodeValue(eByteCodes.bc_getregs, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_setregs, flexcodeValue(eByteCodes.bc_setregs, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_bytemove, flexcodeValue(eByteCodes.bc_bytemove, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_bytefill, flexcodeValue(eByteCodes.bc_bytefill, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_wordmove, flexcodeValue(eByteCodes.bc_wordmove, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_wordfill, flexcodeValue(eByteCodes.bc_wordfill, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_longmove, flexcodeValue(eByteCodes.bc_longmove, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_longfill, flexcodeValue(eByteCodes.bc_longfill, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_strsize, flexcodeValue(eByteCodes.bc_strsize, 1, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_strcomp, flexcodeValue(eByteCodes.bc_strcomp, 2, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_strcopy, flexcodeValue(eByteCodes.bc_strcopy, 3, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_getcrc, flexcodeValue(eByteCodes.bc_getcrc, 3, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_waitus, flexcodeValue(eByteCodes.bc_waitus, 1, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_waitms, flexcodeValue(eByteCodes.bc_waitms, 1, 0, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_getms, flexcodeValue(eByteCodes.bc_getms, 0, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_getsec, flexcodeValue(eByteCodes.bc_getsec, 0, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_muldiv64, flexcodeValue(eByteCodes.bc_muldiv64, 3, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_qsin, flexcodeValue(eByteCodes.bc_qsin, 3, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_qcos, flexcodeValue(eByteCodes.bc_qcos, 3, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_rotxy, flexcodeValue(eByteCodes.bc_rotxy, 3, 2, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_polxy, flexcodeValue(eByteCodes.bc_polxy, 2, 2, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_xypol, flexcodeValue(eByteCodes.bc_xypol, 2, 2, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_nan, flexcodeValue(eByteCodes.bc_nan, 1, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_round, flexcodeValue(eByteCodes.bc_round, 1, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_trunc, flexcodeValue(eByteCodes.bc_trunc, 1, 1, 0, 1))
  this.flexcodeValues.set(eFlexcodes.fc_float, flexcodeValue(eByteCodes.bc_float, 1, 1, 0, 1))
