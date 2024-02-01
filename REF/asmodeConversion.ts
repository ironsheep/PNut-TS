// generated opcode table load

export enum eAsmcodes {
  ac_ror,
  ac_rol,
  ac_shr,
  ac_shl,
  ac_rcr,
  ac_rcl,
  ac_sar,
  ac_sal,
  ac_add,
  ac_addx,
  ac_adds,
  ac_addsx,
  ac_sub,
  ac_subx,
  ac_subs,
  ac_subsx,
  ac_cmp,
  ac_cmpx,
  ac_cmps,
  ac_cmpsx,
  ac_cmpr,
  ac_cmpm,
  ac_subr,
  ac_cmpsub,
  ac_fge,
  ac_fle,
  ac_fges,
  ac_fles,
  ac_sumc,
  ac_sumnc,
  ac_sumz,
  ac_sumnz,
  ac_bitl,
  ac_bith,
  ac_bitc,
  ac_bitnc,
  ac_bitz,
  ac_bitnz,
  ac_bitrnd,
  ac_bitnot,
  ac_testb,
  ac_testbn,
  ac_and,
  ac_andn,
  ac_or,
  ac_xor,
  ac_muxc,
  ac_muxnc,
  ac_muxz,
  ac_muxnz,
  ac_mov,
  ac_not,
  ac_abs,
  ac_neg,
  ac_negc,
  ac_negnc,
  ac_negz,
  ac_negnz,
  ac_incmod,
  ac_decmod,
  ac_zerox,
  ac_signx,
  ac_encod,
  ac_ones,
  ac_test,
  ac_testn,
  ac_setnib,
  ac_getnib,
  ac_rolnib,
  ac_setbyte,
  ac_getbyte,
  ac_rolbyte,
  ac_setword,
  ac_getword,
  ac_rolword,
  ac_altsn,
  ac_altgn,
  ac_altsb,
  ac_altgb,
  ac_altsw,
  ac_altgw,
  ac_altr,
  ac_altd,
  ac_alts,
  ac_altb,
  ac_alti,
  ac_setr,
  ac_setd,
  ac_sets,
  ac_decod,
  ac_bmask,
  ac_crcbit,
  ac_crcnib,
  ac_muxnits,
  ac_muxnibs,
  ac_muxq,
  ac_movbyts,
  ac_mul,
  ac_muls,
  ac_sca,
  ac_scas,
  ac_addpix,
  ac_mulpix,
  ac_blnpix,
  ac_mixpix,
  ac_addct1,
  ac_addct2,
  ac_addct3,
  ac_wmlong,
  ac_rqpin,
  ac_rdpin,
  ac_rdlut,
  ac_rdbyte,
  ac_rdword,
  ac_rdlong,
  ac_callpa,
  ac_callpb,
  ac_djz,
  ac_djnz,
  ac_djf,
  ac_djnf,
  ac_ijz,
  ac_ijnz,
  ac_tjz,
  ac_tjnz,
  ac_tjf,
  ac_tjnf,
  ac_tjs,
  ac_tjns,
  ac_tjv,
  ac_jint,
  ac_jct1,
  ac_jct2,
  ac_jct3,
  ac_jse1,
  ac_jse2,
  ac_jse3,
  ac_jse4,
  ac_jpat,
  ac_jfbw,
  ac_jxmt,
  ac_jxfi,
  ac_jxro,
  ac_jxrl,
  ac_jatn,
  ac_jqmt,
  ac_jnint,
  ac_jnct1,
  ac_jnct2,
  ac_jnct3,
  ac_jnse1,
  ac_jnse2,
  ac_jnse3,
  ac_jnse4,
  ac_jnpat,
  ac_jnfbw,
  ac_jnxmt,
  ac_jnxfi,
  ac_jnxro,
  ac_jnxrl,
  ac_jnatn,
  ac_jnqmt,
  ac_setpat,
  ac_wrpin,
  ac_wxpin,
  ac_wypin,
  ac_wrlut,
  ac_wrbyte,
  ac_wrword,
  ac_wrlong,
  ac_rdfast,
  ac_wrfast,
  ac_fblock,
  ac_xinit,
  ac_xzero,
  ac_xcont,
  ac_rep,
  ac_coginit,
  ac_qmul,
  ac_qdiv,
  ac_qfrac,
  ac_qsqrt,
  ac_qrotate,
  ac_qvector,
  ac_hubset,
  ac_cogid,
  ac_cogstop,
  ac_locknew,
  ac_lockret,
  ac_locktry,
  ac_lockrel,
  ac_qlog,
  ac_qexp,
  ac_rfbyte,
  ac_rfword,
  ac_rflong,
  ac_rfvar,
  ac_rfvars,
  ac_wfbyte,
  ac_wfword,
  ac_wflong,
  ac_getqx,
  ac_getqy,
  ac_getct,
  ac_getrnd,
  ac_setdacs,
  ac_setxfrq,
  ac_getxacc,
  ac_waitx,
  ac_setse1,
  ac_setse2,
  ac_setse3,
  ac_setse4,
  ac_pollint,
  ac_pollct1,
  ac_pollct2,
  ac_pollct3,
  ac_pollse1,
  ac_pollse2,
  ac_pollse3,
  ac_pollse4,
  ac_pollpat,
  ac_pollfbw,
  ac_pollxmt,
  ac_pollxfi,
  ac_pollxro,
  ac_pollxrl,
  ac_pollatn,
  ac_pollqmt,
  ac_waitint,
  ac_waitct1,
  ac_waitct2,
  ac_waitct3,
  ac_waitse1,
  ac_waitse2,
  ac_waitse3,
  ac_waitse4,
  ac_waitpat,
  ac_waitfbw,
  ac_waitxmt,
  ac_waitxfi,
  ac_waitxro,
  ac_waitxrl,
  ac_waitatn,
  ac_allowi,
  ac_stalli,
  ac_trgint1,
  ac_trgint2,
  ac_trgint3,
  ac_nixint1,
  ac_nixint2,
  ac_nixint3,
  ac_setint1,
  ac_setint2,
  ac_setint3,
  ac_setq,
  ac_setq2,
  ac_push,
  ac_pop,
  ac_jmprel,
  ac_skip,
  ac_skipf,
  ac_execf,
  ac_getptr,
  ac_getbrk,
  ac_cogbrk,
  ac_brk,
  ac_setluts,
  ac_setcy,
  ac_setci,
  ac_setcq,
  ac_setcfrq,
  ac_setcmod,
  ac_setpiv,
  ac_setpix,
  ac_cogatn,
  ac_testp,
  ac_testpn,
  ac_dirl,
  ac_dirh,
  ac_dirc,
  ac_dirnc,
  ac_dirz,
  ac_dirnz,
  ac_dirrnd,
  ac_dirnot,
  ac_outl,
  ac_outh,
  ac_outc,
  ac_outnc,
  ac_outz,
  ac_outnz,
  ac_outrnd,
  ac_outnot,
  ac_fltl,
  ac_flth,
  ac_fltc,
  ac_fltnc,
  ac_fltz,
  ac_fltnz,
  ac_fltrnd,
  ac_fltnot,
  ac_drvl,
  ac_drvh,
  ac_drvc,
  ac_drvnc,
  ac_drvz,
  ac_drvnz,
  ac_drvrnd,
  ac_drvnot,
  ac_splitb,
  ac_mergeb,
  ac_splitw,
  ac_mergew,
  ac_seussf,
  ac_seussr,
  ac_rgbsqz,
  ac_rgbexp,
  ac_xoro32,
  ac_rev,
  ac_rczr,
  ac_rczl,
  ac_wrc,
  ac_wrnc,
  ac_wrz,
  ac_wrnz,
  ac_modcz,
  ac_modc,
  ac_modz,
  ac_setscp,
  ac_getscp,
  ac_jmp,
  ac_call,
  ac_calla,
  ac_callb,
  ac_calld,
  ac_loc,
  ac_augs,
  ac_augd,
  ac_pusha,
  ac_pushb,
  ac_popa,
  ac_popb,
  ac_ret,
  ac_reta,
  ac_retb,
  ac_reti0,
  ac_reti1,
  ac_reti2,
  ac_reti3,
  ac_resi0,
  ac_resi1,
  ac_resi2,
  ac_resi3,
  ac_xstop,
  ac_akpin,
  ac_asmclk,
  ac_nop,
  ac_debug,
}

// generated flexcode table load

//		flexcode	bytecode	params	results	pinfld	hubcode
//		---------------------------------------------------------------------------------------
  this.asmcodeValues.set(eAsmcodes.ac_ror, asmcodeValue(0b000000000, 0b11, eOperands.operand_ds))   // 	ROR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_rol, asmcodeValue(0b000000100, 0b11, eOperands.operand_ds))   // 	ROL	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_shr, asmcodeValue(0b000001000, 0b11, eOperands.operand_ds))   // 	SHR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_shl, asmcodeValue(0b000001100, 0b11, eOperands.operand_ds))   // 	SHL	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_rcr, asmcodeValue(0b000010000, 0b11, eOperands.operand_ds))   // 	RCR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_rcl, asmcodeValue(0b000010100, 0b11, eOperands.operand_ds))   // 	RCL	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sar, asmcodeValue(0b000011000, 0b11, eOperands.operand_ds))   // 	SAR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sal, asmcodeValue(0b000011100, 0b11, eOperands.operand_ds))   // 	SAL	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_add, asmcodeValue(0b000100000, 0b11, eOperands.operand_ds))   // 	ADD	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_addx, asmcodeValue(0b000100100, 0b11, eOperands.operand_ds))   // 	ADDX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_adds, asmcodeValue(0b000101000, 0b11, eOperands.operand_ds))   // 	ADDS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_addsx, asmcodeValue(0b000101100, 0b11, eOperands.operand_ds))   // 	ADDSX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sub, asmcodeValue(0b000110000, 0b11, eOperands.operand_ds))   // 	SUB	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_subx, asmcodeValue(0b000110100, 0b11, eOperands.operand_ds))   // 	SUBX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_subs, asmcodeValue(0b000111000, 0b11, eOperands.operand_ds))   // 	SUBS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_subsx, asmcodeValue(0b000111100, 0b11, eOperands.operand_ds))   // 	SUBSX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmp, asmcodeValue(0b001000000, 0b11, eOperands.operand_ds))   // 	CMP	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmpx, asmcodeValue(0b001000100, 0b11, eOperands.operand_ds))   // 	CMPX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmps, asmcodeValue(0b001001000, 0b11, eOperands.operand_ds))   // 	CMPS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmpsx, asmcodeValue(0b001001100, 0b11, eOperands.operand_ds))   // 	CMPSX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmpr, asmcodeValue(0b001010000, 0b11, eOperands.operand_ds))   // 	CMPR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmpm, asmcodeValue(0b001010100, 0b11, eOperands.operand_ds))   // 	CMPM	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_subr, asmcodeValue(0b001011000, 0b11, eOperands.operand_ds))   // 	SUBR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_cmpsub, asmcodeValue(0b001011100, 0b11, eOperands.operand_ds))   // 	CMPSUB	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_fge, asmcodeValue(0b001100000, 0b11, eOperands.operand_ds))   // 	FGE	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_fle, asmcodeValue(0b001100100, 0b11, eOperands.operand_ds))   // 	FLE	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_fges, asmcodeValue(0b001101000, 0b11, eOperands.operand_ds))   // 	FGES	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_fles, asmcodeValue(0b001101100, 0b11, eOperands.operand_ds))   // 	FLES	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sumc, asmcodeValue(0b001110000, 0b11, eOperands.operand_ds))   // 	SUMC	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sumnc, asmcodeValue(0b001110100, 0b11, eOperands.operand_ds))   // 	SUMNC	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sumz, asmcodeValue(0b001111000, 0b11, eOperands.operand_ds))   // 	SUMZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sumnz, asmcodeValue(0b001111100, 0b11, eOperands.operand_ds))   // 	SUMNZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitl, asmcodeValue(0b010000000, 0b00, eOperands.operand_bitx))   // 	BITL	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bith, asmcodeValue(0b010000100, 0b00, eOperands.operand_bitx))   // 	BITH	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitc, asmcodeValue(0b010001000, 0b00, eOperands.operand_bitx))   // 	BITC	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitnc, asmcodeValue(0b010001100, 0b00, eOperands.operand_bitx))   // 	BITNC	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitz, asmcodeValue(0b010010000, 0b00, eOperands.operand_bitx))   // 	BITZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitnz, asmcodeValue(0b010010100, 0b00, eOperands.operand_bitx))   // 	BITNZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitrnd, asmcodeValue(0b010011000, 0b00, eOperands.operand_bitx))   // 	BITRND	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_bitnot, asmcodeValue(0b010011100, 0b00, eOperands.operand_bitx))   // 	BITNOT	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_testb, asmcodeValue(0b010000000, 0b00, eOperands.operand_testb))   // 	TESTB	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_testbn, asmcodeValue(0b010000100, 0b00, eOperands.operand_testb))   // 	TESTBN	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_and, asmcodeValue(0b010100000, 0b11, eOperands.operand_ds))   // 	AND	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_andn, asmcodeValue(0b010100100, 0b11, eOperands.operand_ds))   // 	ANDN	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_or, asmcodeValue(0b010101000, 0b11, eOperands.operand_ds))   // 	OR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_xor, asmcodeValue(0b010101100, 0b11, eOperands.operand_ds))   // 	XOR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxc, asmcodeValue(0b010110000, 0b11, eOperands.operand_ds))   // 	MUXC	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxnc, asmcodeValue(0b010110100, 0b11, eOperands.operand_ds))   // 	MUXNC	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxz, asmcodeValue(0b010111000, 0b11, eOperands.operand_ds))   // 	MUXZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxnz, asmcodeValue(0b010111100, 0b11, eOperands.operand_ds))   // 	MUXNZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_mov, asmcodeValue(0b011000000, 0b11, eOperands.operand_ds))   // 	MOV	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_not, asmcodeValue(0b011000100, 0b11, eOperands.operand_du))   // 	NOT	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_abs, asmcodeValue(0b011001000, 0b11, eOperands.operand_du))   // 	ABS	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_neg, asmcodeValue(0b011001100, 0b11, eOperands.operand_du))   // 	NEG	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_negc, asmcodeValue(0b011010000, 0b11, eOperands.operand_du))   // 	NEGC	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_negnc, asmcodeValue(0b011010100, 0b11, eOperands.operand_du))   // 	NEGNC	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_negz, asmcodeValue(0b011011000, 0b11, eOperands.operand_du))   // 	NEGZ	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_negnz, asmcodeValue(0b011011100, 0b11, eOperands.operand_du))   // 	NEGNZ	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_incmod, asmcodeValue(0b011100000, 0b11, eOperands.operand_ds))   // 	INCMOD	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_decmod, asmcodeValue(0b011100100, 0b11, eOperands.operand_ds))   // 	DECMOD	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_zerox, asmcodeValue(0b011101000, 0b11, eOperands.operand_ds))   // 	ZEROX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_signx, asmcodeValue(0b011101100, 0b11, eOperands.operand_ds))   // 	SIGNX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_encod, asmcodeValue(0b011110000, 0b11, eOperands.operand_du))   // 	ENCOD	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_ones, asmcodeValue(0b011110100, 0b11, eOperands.operand_du))   // 	ONES	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_test, asmcodeValue(0b011111000, 0b11, eOperands.operand_du))   // 	TEST	D,{S/#}
  this.asmcodeValues.set(eAsmcodes.ac_testn, asmcodeValue(0b011111100, 0b11, eOperands.operand_ds))   // 	TESTN	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_setnib, asmcodeValue(0b100000000, 0b00, eOperands.operand_ds3set))   // 	SETNIB	{D,}S/#{,#0..7}
  this.asmcodeValues.set(eAsmcodes.ac_getnib, asmcodeValue(0b100001000, 0b00, eOperands.operand_ds3get))   // 	GETNIB	D{,S/#,#0..7}
  this.asmcodeValues.set(eAsmcodes.ac_rolnib, asmcodeValue(0b100010000, 0b00, eOperands.operand_ds3get))   // 	ROLNIB	D{,S/#,#0..7}
  this.asmcodeValues.set(eAsmcodes.ac_setbyte, asmcodeValue(0b100011000, 0b00, eOperands.operand_ds2set))   // 	SETBYTE	{D,}S/#{,#0..3}
  this.asmcodeValues.set(eAsmcodes.ac_getbyte, asmcodeValue(0b100011100, 0b00, eOperands.operand_ds2get))   // 	GETBYTE	D{,S/#,#0..3}
  this.asmcodeValues.set(eAsmcodes.ac_rolbyte, asmcodeValue(0b100100000, 0b00, eOperands.operand_ds2get))   // 	ROLBYTE	D{,S/#,#0..3}
  this.asmcodeValues.set(eAsmcodes.ac_setword, asmcodeValue(0b100100100, 0b00, eOperands.operand_ds1set))   // 	SETWORD	{D,}S/#{,#0..1}
  this.asmcodeValues.set(eAsmcodes.ac_getword, asmcodeValue(0b100100110, 0b00, eOperands.operand_ds1get))   // 	GETWORD	D{,S/#,#0..1}
  this.asmcodeValues.set(eAsmcodes.ac_rolword, asmcodeValue(0b100101000, 0b00, eOperands.operand_ds1get))   // 	ROLWORD	D{,S/#,#0..1}
  this.asmcodeValues.set(eAsmcodes.ac_altsn, asmcodeValue(0b100101010, 0b00, eOperands.operand_duiz))   // 	ALTSN	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altgn, asmcodeValue(0b100101011, 0b00, eOperands.operand_duiz))   // 	ALTGN	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altsb, asmcodeValue(0b100101100, 0b00, eOperands.operand_duiz))   // 	ALTSB	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altgb, asmcodeValue(0b100101101, 0b00, eOperands.operand_duiz))   // 	ALTGB	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altsw, asmcodeValue(0b100101110, 0b00, eOperands.operand_duiz))   // 	ALTSW	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altgw, asmcodeValue(0b100101111, 0b00, eOperands.operand_duiz))   // 	ALTGW	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altr, asmcodeValue(0b100110000, 0b00, eOperands.operand_duiz))   // 	ALTR	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altd, asmcodeValue(0b100110001, 0b00, eOperands.operand_duiz))   // 	ALTD	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_alts, asmcodeValue(0b100110010, 0b00, eOperands.operand_duiz))   // 	ALTS	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_altb, asmcodeValue(0b100110011, 0b00, eOperands.operand_duiz))   // 	ALTB	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_alti, asmcodeValue(0b100110100, 0b00, eOperands.operand_duii))   // 	ALTI	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_setr, asmcodeValue(0b100110101, 0b00, eOperands.operand_ds))   // 	SETR	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_setd, asmcodeValue(0b100110110, 0b00, eOperands.operand_ds))   // 	SETD	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sets, asmcodeValue(0b100110111, 0b00, eOperands.operand_ds))   // 	SETS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_decod, asmcodeValue(0b100111000, 0b00, eOperands.operand_du))   // 	DECOD	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_bmask, asmcodeValue(0b100111001, 0b00, eOperands.operand_du))   // 	BMASK	D{,S/#}
  this.asmcodeValues.set(eAsmcodes.ac_crcbit, asmcodeValue(0b100111010, 0b00, eOperands.operand_ds))   // 	CRCBIT	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_crcnib, asmcodeValue(0b100111011, 0b00, eOperands.operand_ds))   // 	CRCNIB	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxnits, asmcodeValue(0b100111100, 0b00, eOperands.operand_ds))   // 	MUXNITS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxnibs, asmcodeValue(0b100111101, 0b00, eOperands.operand_ds))   // 	MUXNIBS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muxq, asmcodeValue(0b100111110, 0b00, eOperands.operand_ds))   // 	MUXQ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_movbyts, asmcodeValue(0b100111111, 0b00, eOperands.operand_ds))   // 	MOVBYTS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_mul, asmcodeValue(0b101000000, 0b01, eOperands.operand_ds))   // 	MUL	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_muls, asmcodeValue(0b101000010, 0b01, eOperands.operand_ds))   // 	MULS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_sca, asmcodeValue(0b101000100, 0b01, eOperands.operand_ds))   // 	SCA	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_scas, asmcodeValue(0b101000110, 0b01, eOperands.operand_ds))   // 	SCAS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_addpix, asmcodeValue(0b101001000, 0b00, eOperands.operand_ds))   // 	ADDPIX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_mulpix, asmcodeValue(0b101001001, 0b00, eOperands.operand_ds))   // 	MULPIX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_blnpix, asmcodeValue(0b101001010, 0b00, eOperands.operand_ds))   // 	BLNPIX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_mixpix, asmcodeValue(0b101001011, 0b00, eOperands.operand_ds))   // 	MIXPIX	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_addct1, asmcodeValue(0b101001100, 0b00, eOperands.operand_ds))   // 	ADDCT1	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_addct2, asmcodeValue(0b101001101, 0b00, eOperands.operand_ds))   // 	ADDCT2	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_addct3, asmcodeValue(0b101001110, 0b00, eOperands.operand_ds))   // 	ADDCT3	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_wmlong, asmcodeValue(0b101001111, 0b00, eOperands.operand_dsp))   // 	WMLONG_	D,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_rqpin, asmcodeValue(0b101010000, 0b10, eOperands.operand_ds))   // 	RQPIN	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_rdpin, asmcodeValue(0b101010001, 0b10, eOperands.operand_ds))   // 	RDPIN	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_rdlut, asmcodeValue(0b101010100, 0b11, eOperands.operand_dsp))   // 	RDLUT	D,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_rdbyte, asmcodeValue(0b101011000, 0b11, eOperands.operand_dsp))   // 	RDBYTE	D,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_rdword, asmcodeValue(0b101011100, 0b11, eOperands.operand_dsp))   // 	RDWORD	D,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_rdlong, asmcodeValue(0b101100000, 0b11, eOperands.operand_dsp))   // 	RDLONG	D,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_callpa, asmcodeValue(0b101101000, 0b00, eOperands.operand_lsj))   // 	CALLPA	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_callpb, asmcodeValue(0b101101010, 0b00, eOperands.operand_lsj))   // 	CALLPB	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_djz, asmcodeValue(0b101101100, 0b00, eOperands.operand_dsj))   // 	DJZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_djnz, asmcodeValue(0b101101101, 0b00, eOperands.operand_dsj))   // 	DJNZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_djf, asmcodeValue(0b101101110, 0b00, eOperands.operand_dsj))   // 	DJF	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_djnf, asmcodeValue(0b101101111, 0b00, eOperands.operand_dsj))   // 	DJNF	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_ijz, asmcodeValue(0b101110000, 0b00, eOperands.operand_dsj))   // 	IJZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_ijnz, asmcodeValue(0b101110001, 0b00, eOperands.operand_dsj))   // 	IJNZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjz, asmcodeValue(0b101110010, 0b00, eOperands.operand_dsj))   // 	TJZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjnz, asmcodeValue(0b101110011, 0b00, eOperands.operand_dsj))   // 	TJNZ	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjf, asmcodeValue(0b101110100, 0b00, eOperands.operand_dsj))   // 	TJF	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjnf, asmcodeValue(0b101110101, 0b00, eOperands.operand_dsj))   // 	TJNF	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjs, asmcodeValue(0b101110110, 0b00, eOperands.operand_dsj))   // 	TJS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjns, asmcodeValue(0b101110111, 0b00, eOperands.operand_dsj))   // 	TJNS	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_tjv, asmcodeValue(0b101111000, 0b00, eOperands.operand_dsj))   // 	TJV	D,S/#
  this.asmcodeValues.set(eAsmcodes.ac_jint, asmcodeValue(0b000000000, 0b00, eOperands.operand_jpoll))   // 	JINT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jct1, asmcodeValue(0b000000001, 0b00, eOperands.operand_jpoll))   // 	JCT1	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jct2, asmcodeValue(0b000000010, 0b00, eOperands.operand_jpoll))   // 	JCT2	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jct3, asmcodeValue(0b000000011, 0b00, eOperands.operand_jpoll))   // 	JCT3	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jse1, asmcodeValue(0b000000100, 0b00, eOperands.operand_jpoll))   // 	JSE1	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jse2, asmcodeValue(0b000000101, 0b00, eOperands.operand_jpoll))   // 	JSE2	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jse3, asmcodeValue(0b000000110, 0b00, eOperands.operand_jpoll))   // 	JSE3	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jse4, asmcodeValue(0b000000111, 0b00, eOperands.operand_jpoll))   // 	JSE4	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jpat, asmcodeValue(0b000001000, 0b00, eOperands.operand_jpoll))   // 	JPAT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jfbw, asmcodeValue(0b000001001, 0b00, eOperands.operand_jpoll))   // 	JFBW	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jxmt, asmcodeValue(0b000001010, 0b00, eOperands.operand_jpoll))   // 	JXMT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jxfi, asmcodeValue(0b000001011, 0b00, eOperands.operand_jpoll))   // 	JXFI	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jxro, asmcodeValue(0b000001100, 0b00, eOperands.operand_jpoll))   // 	JXRO	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jxrl, asmcodeValue(0b000001101, 0b00, eOperands.operand_jpoll))   // 	JXRL	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jatn, asmcodeValue(0b000001110, 0b00, eOperands.operand_jpoll))   // 	JATN	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jqmt, asmcodeValue(0b000001111, 0b00, eOperands.operand_jpoll))   // 	JQMT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnint, asmcodeValue(0b000010000, 0b00, eOperands.operand_jpoll))   // 	JNINT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnct1, asmcodeValue(0b000010001, 0b00, eOperands.operand_jpoll))   // 	JNCT1	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnct2, asmcodeValue(0b000010010, 0b00, eOperands.operand_jpoll))   // 	JNCT2	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnct3, asmcodeValue(0b000010011, 0b00, eOperands.operand_jpoll))   // 	JNCT3	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnse1, asmcodeValue(0b000010100, 0b00, eOperands.operand_jpoll))   // 	JNSE1	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnse2, asmcodeValue(0b000010101, 0b00, eOperands.operand_jpoll))   // 	JNSE2	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnse3, asmcodeValue(0b000010110, 0b00, eOperands.operand_jpoll))   // 	JNSE3	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnse4, asmcodeValue(0b000010111, 0b00, eOperands.operand_jpoll))   // 	JNSE4	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnpat, asmcodeValue(0b000011000, 0b00, eOperands.operand_jpoll))   // 	JNPAT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnfbw, asmcodeValue(0b000011001, 0b00, eOperands.operand_jpoll))   // 	JNFBW	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnxmt, asmcodeValue(0b000011010, 0b00, eOperands.operand_jpoll))   // 	JNXMT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnxfi, asmcodeValue(0b000011011, 0b00, eOperands.operand_jpoll))   // 	JNXFI	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnxro, asmcodeValue(0b000011100, 0b00, eOperands.operand_jpoll))   // 	JNXRO	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnxrl, asmcodeValue(0b000011101, 0b00, eOperands.operand_jpoll))   // 	JNXRL	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnatn, asmcodeValue(0b000011110, 0b00, eOperands.operand_jpoll))   // 	JNATN	S/#
  this.asmcodeValues.set(eAsmcodes.ac_jnqmt, asmcodeValue(0b000011111, 0b00, eOperands.operand_jpoll))   // 	JNQMT	S/#
  this.asmcodeValues.set(eAsmcodes.ac_setpat, asmcodeValue(0b101111110, 0b00, eOperands.operand_ls))   // 	SETPAT	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_wrpin, asmcodeValue(0b110000000, 0b00, eOperands.operand_ls))   // 	WRPIN	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_wxpin, asmcodeValue(0b110000010, 0b00, eOperands.operand_ls))   // 	WXPIN	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_wypin, asmcodeValue(0b110000100, 0b00, eOperands.operand_ls))   // 	WYPIN	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_wrlut, asmcodeValue(0b110000110, 0b00, eOperands.operand_lsp))   // 	WRLUT	D/#,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_wrbyte, asmcodeValue(0b110001000, 0b00, eOperands.operand_lsp))   // 	WRBYTE	D/#,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_wrword, asmcodeValue(0b110001010, 0b00, eOperands.operand_lsp))   // 	WRWORD	D/#,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_wrlong, asmcodeValue(0b110001100, 0b00, eOperands.operand_lsp))   // 	WRLONG	D/#,S/#/PTRx
  this.asmcodeValues.set(eAsmcodes.ac_rdfast, asmcodeValue(0b110001110, 0b00, eOperands.operand_ls))   // 	RDFAST	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_wrfast, asmcodeValue(0b110010000, 0b00, eOperands.operand_ls))   // 	WRFAST	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_fblock, asmcodeValue(0b110010010, 0b00, eOperands.operand_ls))   // 	FBLOCK	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_xinit, asmcodeValue(0b110010100, 0b00, eOperands.operand_ls))   // 	XINIT	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_xzero, asmcodeValue(0b110010110, 0b00, eOperands.operand_ls))   // 	XZERO	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_xcont, asmcodeValue(0b110011000, 0b00, eOperands.operand_ls))   // 	XCONT	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_rep, asmcodeValue(0b110011010, 0b00, eOperands.operand_rep))   // 	REP	D/#/@,S/#
  this.asmcodeValues.set(eAsmcodes.ac_coginit, asmcodeValue(0b110011100, 0b10, eOperands.operand_ls))   // 	COGINIT	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_qmul, asmcodeValue(0b110100000, 0b00, eOperands.operand_ls))   // 	QMUL	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_qdiv, asmcodeValue(0b110100010, 0b00, eOperands.operand_ls))   // 	QDIV	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_qfrac, asmcodeValue(0b110100100, 0b00, eOperands.operand_ls))   // 	QFRAC	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_qsqrt, asmcodeValue(0b110100110, 0b00, eOperands.operand_ls))   // 	QSQRT	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_qrotate, asmcodeValue(0b110101000, 0b00, eOperands.operand_ls))   // 	QROTATE	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_qvector, asmcodeValue(0b110101010, 0b00, eOperands.operand_ls))   // 	QVECTOR	D/#,S/#
  this.asmcodeValues.set(eAsmcodes.ac_hubset, asmcodeValue(0b000000000, 0b00, eOperands.operand_l))   // 	HUBSET	D/#
  this.asmcodeValues.set(eAsmcodes.ac_cogid, asmcodeValue(0b000000001, 0b10, eOperands.operand_l))   // 	COGID	D/#
  this.asmcodeValues.set(eAsmcodes.ac_cogstop, asmcodeValue(0b000000011, 0b00, eOperands.operand_l))   // 	COGSTOP	D/#
  this.asmcodeValues.set(eAsmcodes.ac_locknew, asmcodeValue(0b000000100, 0b10, eOperands.operand_d))   // 	LOCKNEW	D
  this.asmcodeValues.set(eAsmcodes.ac_lockret, asmcodeValue(0b000000101, 0b00, eOperands.operand_l))   // 	LOCKRET	D/#
  this.asmcodeValues.set(eAsmcodes.ac_locktry, asmcodeValue(0b000000110, 0b10, eOperands.operand_l))   // 	LOCKTRY	D/#
  this.asmcodeValues.set(eAsmcodes.ac_lockrel, asmcodeValue(0b000000111, 0b10, eOperands.operand_l))   // 	LOCKREL	D/#
  this.asmcodeValues.set(eAsmcodes.ac_qlog, asmcodeValue(0b000001110, 0b00, eOperands.operand_l))   // 	QLOG	D/#
  this.asmcodeValues.set(eAsmcodes.ac_qexp, asmcodeValue(0b000001111, 0b00, eOperands.operand_l))   // 	QEXP	D/#
  this.asmcodeValues.set(eAsmcodes.ac_rfbyte, asmcodeValue(0b000010000, 0b11, eOperands.operand_d))   // 	RFBYTE	D
  this.asmcodeValues.set(eAsmcodes.ac_rfword, asmcodeValue(0b000010001, 0b11, eOperands.operand_d))   // 	RFWORD	D
  this.asmcodeValues.set(eAsmcodes.ac_rflong, asmcodeValue(0b000010010, 0b11, eOperands.operand_d))   // 	RFLONG	D
  this.asmcodeValues.set(eAsmcodes.ac_rfvar, asmcodeValue(0b000010011, 0b11, eOperands.operand_d))   // 	RFVAR	D
  this.asmcodeValues.set(eAsmcodes.ac_rfvars, asmcodeValue(0b000010100, 0b11, eOperands.operand_d))   // 	RFVARS	D
  this.asmcodeValues.set(eAsmcodes.ac_wfbyte, asmcodeValue(0b000010101, 0b00, eOperands.operand_l))   // 	WFBYTE	D/#
  this.asmcodeValues.set(eAsmcodes.ac_wfword, asmcodeValue(0b000010110, 0b00, eOperands.operand_l))   // 	WFWORD	D/#
  this.asmcodeValues.set(eAsmcodes.ac_wflong, asmcodeValue(0b000010111, 0b00, eOperands.operand_l))   // 	WFLONG	D/#
  this.asmcodeValues.set(eAsmcodes.ac_getqx, asmcodeValue(0b000011000, 0b11, eOperands.operand_d))   // 	GETQX	D
  this.asmcodeValues.set(eAsmcodes.ac_getqy, asmcodeValue(0b000011001, 0b11, eOperands.operand_d))   // 	GETQY	D
  this.asmcodeValues.set(eAsmcodes.ac_getct, asmcodeValue(0b000011010, 0b10, eOperands.operand_d))   // 	GETCT	D
  this.asmcodeValues.set(eAsmcodes.ac_getrnd, asmcodeValue(0b000011011, 0b11, eOperands.operand_de))   // 	GETRND	D
  this.asmcodeValues.set(eAsmcodes.ac_setdacs, asmcodeValue(0b000011100, 0b00, eOperands.operand_l))   // 	SETDACS	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setxfrq, asmcodeValue(0b000011101, 0b00, eOperands.operand_l))   // 	SETXFRQ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_getxacc, asmcodeValue(0b000011110, 0b00, eOperands.operand_d))   // 	GETXACC	D
  this.asmcodeValues.set(eAsmcodes.ac_waitx, asmcodeValue(0b000011111, 0b11, eOperands.operand_l))   // 	WAITX	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setse1, asmcodeValue(0b000100000, 0b00, eOperands.operand_l))   // 	SETSE1	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setse2, asmcodeValue(0b000100001, 0b00, eOperands.operand_l))   // 	SETSE2	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setse3, asmcodeValue(0b000100010, 0b00, eOperands.operand_l))   // 	SETSE3	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setse4, asmcodeValue(0b000100011, 0b00, eOperands.operand_l))   // 	SETSE4	D/#
  this.asmcodeValues.set(eAsmcodes.ac_pollint, asmcodeValue(0b000000000, 0b11, eOperands.operand_pollwait))   // 	POLLINT
  this.asmcodeValues.set(eAsmcodes.ac_pollct1, asmcodeValue(0b000000001, 0b11, eOperands.operand_pollwait))   // 	POLLCT1
  this.asmcodeValues.set(eAsmcodes.ac_pollct2, asmcodeValue(0b000000010, 0b11, eOperands.operand_pollwait))   // 	POLLCT2
  this.asmcodeValues.set(eAsmcodes.ac_pollct3, asmcodeValue(0b000000011, 0b11, eOperands.operand_pollwait))   // 	POLLCT3
  this.asmcodeValues.set(eAsmcodes.ac_pollse1, asmcodeValue(0b000000100, 0b11, eOperands.operand_pollwait))   // 	POLLSE1
  this.asmcodeValues.set(eAsmcodes.ac_pollse2, asmcodeValue(0b000000101, 0b11, eOperands.operand_pollwait))   // 	POLLSE2
  this.asmcodeValues.set(eAsmcodes.ac_pollse3, asmcodeValue(0b000000110, 0b11, eOperands.operand_pollwait))   // 	POLLSE3
  this.asmcodeValues.set(eAsmcodes.ac_pollse4, asmcodeValue(0b000000111, 0b11, eOperands.operand_pollwait))   // 	POLLSE4
  this.asmcodeValues.set(eAsmcodes.ac_pollpat, asmcodeValue(0b000001000, 0b11, eOperands.operand_pollwait))   // 	POLLPAT
  this.asmcodeValues.set(eAsmcodes.ac_pollfbw, asmcodeValue(0b000001001, 0b11, eOperands.operand_pollwait))   // 	POLLFBW
  this.asmcodeValues.set(eAsmcodes.ac_pollxmt, asmcodeValue(0b000001010, 0b11, eOperands.operand_pollwait))   // 	POLLXMT
  this.asmcodeValues.set(eAsmcodes.ac_pollxfi, asmcodeValue(0b000001011, 0b11, eOperands.operand_pollwait))   // 	POLLXFI
  this.asmcodeValues.set(eAsmcodes.ac_pollxro, asmcodeValue(0b000001100, 0b11, eOperands.operand_pollwait))   // 	POLLXRO
  this.asmcodeValues.set(eAsmcodes.ac_pollxrl, asmcodeValue(0b000001101, 0b11, eOperands.operand_pollwait))   // 	POLLXRL
  this.asmcodeValues.set(eAsmcodes.ac_pollatn, asmcodeValue(0b000001110, 0b11, eOperands.operand_pollwait))   // 	POLLATN
  this.asmcodeValues.set(eAsmcodes.ac_pollqmt, asmcodeValue(0b000001111, 0b11, eOperands.operand_pollwait))   // 	POLLQMT
  this.asmcodeValues.set(eAsmcodes.ac_waitint, asmcodeValue(0b000010000, 0b11, eOperands.operand_pollwait))   // 	WAITINT
  this.asmcodeValues.set(eAsmcodes.ac_waitct1, asmcodeValue(0b000010001, 0b11, eOperands.operand_pollwait))   // 	WAITCT1
  this.asmcodeValues.set(eAsmcodes.ac_waitct2, asmcodeValue(0b000010010, 0b11, eOperands.operand_pollwait))   // 	WAITCT2
  this.asmcodeValues.set(eAsmcodes.ac_waitct3, asmcodeValue(0b000010011, 0b11, eOperands.operand_pollwait))   // 	WAITCT3
  this.asmcodeValues.set(eAsmcodes.ac_waitse1, asmcodeValue(0b000010100, 0b11, eOperands.operand_pollwait))   // 	WAITSE1
  this.asmcodeValues.set(eAsmcodes.ac_waitse2, asmcodeValue(0b000010101, 0b11, eOperands.operand_pollwait))   // 	WAITSE2
  this.asmcodeValues.set(eAsmcodes.ac_waitse3, asmcodeValue(0b000010110, 0b11, eOperands.operand_pollwait))   // 	WAITSE3
  this.asmcodeValues.set(eAsmcodes.ac_waitse4, asmcodeValue(0b000010111, 0b11, eOperands.operand_pollwait))   // 	WAITSE4
  this.asmcodeValues.set(eAsmcodes.ac_waitpat, asmcodeValue(0b000011000, 0b11, eOperands.operand_pollwait))   // 	WAITPAT
  this.asmcodeValues.set(eAsmcodes.ac_waitfbw, asmcodeValue(0b000011001, 0b11, eOperands.operand_pollwait))   // 	WAITFBW
  this.asmcodeValues.set(eAsmcodes.ac_waitxmt, asmcodeValue(0b000011010, 0b11, eOperands.operand_pollwait))   // 	WAITXMT
  this.asmcodeValues.set(eAsmcodes.ac_waitxfi, asmcodeValue(0b000011011, 0b11, eOperands.operand_pollwait))   // 	WAITXFI
  this.asmcodeValues.set(eAsmcodes.ac_waitxro, asmcodeValue(0b000011100, 0b11, eOperands.operand_pollwait))   // 	WAITXRO
  this.asmcodeValues.set(eAsmcodes.ac_waitxrl, asmcodeValue(0b000011101, 0b11, eOperands.operand_pollwait))   // 	WAITXRL
  this.asmcodeValues.set(eAsmcodes.ac_waitatn, asmcodeValue(0b000011110, 0b11, eOperands.operand_pollwait))   // 	WAITATN
  this.asmcodeValues.set(eAsmcodes.ac_allowi, asmcodeValue(0b000100000, 0b00, eOperands.operand_pollwait))   // 	ALLOWI
  this.asmcodeValues.set(eAsmcodes.ac_stalli, asmcodeValue(0b000100001, 0b00, eOperands.operand_pollwait))   // 	STALLI
  this.asmcodeValues.set(eAsmcodes.ac_trgint1, asmcodeValue(0b000100010, 0b00, eOperands.operand_pollwait))   // 	TRGINT1
  this.asmcodeValues.set(eAsmcodes.ac_trgint2, asmcodeValue(0b000100011, 0b00, eOperands.operand_pollwait))   // 	TRGINT2
  this.asmcodeValues.set(eAsmcodes.ac_trgint3, asmcodeValue(0b000100100, 0b00, eOperands.operand_pollwait))   // 	TRGINT3
  this.asmcodeValues.set(eAsmcodes.ac_nixint1, asmcodeValue(0b000100101, 0b00, eOperands.operand_pollwait))   // 	NIXINT1
  this.asmcodeValues.set(eAsmcodes.ac_nixint2, asmcodeValue(0b000100110, 0b00, eOperands.operand_pollwait))   // 	NIXINT2
  this.asmcodeValues.set(eAsmcodes.ac_nixint3, asmcodeValue(0b000100111, 0b00, eOperands.operand_pollwait))   // 	NIXINT3
  this.asmcodeValues.set(eAsmcodes.ac_setint1, asmcodeValue(0b000100101, 0b00, eOperands.operand_l))   // 	SETINT1	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setint2, asmcodeValue(0b000100110, 0b00, eOperands.operand_l))   // 	SETINT2	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setint3, asmcodeValue(0b000100111, 0b00, eOperands.operand_l))   // 	SETINT3	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setq, asmcodeValue(0b000101000, 0b00, eOperands.operand_l))   // 	SETQ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setq2, asmcodeValue(0b000101001, 0b00, eOperands.operand_l))   // 	SETQ2	D/#
  this.asmcodeValues.set(eAsmcodes.ac_push, asmcodeValue(0b000101010, 0b00, eOperands.operand_l))   // 	PUSH	D/#
  this.asmcodeValues.set(eAsmcodes.ac_pop, asmcodeValue(0b000101011, 0b11, eOperands.operand_d))   // 	POP	D
  this.asmcodeValues.set(eAsmcodes.ac_jmprel, asmcodeValue(0b000110000, 0b00, eOperands.operand_l))   // 	JMPREL	D/#
  this.asmcodeValues.set(eAsmcodes.ac_skip, asmcodeValue(0b000110001, 0b00, eOperands.operand_l))   // 	SKIP	D/#
  this.asmcodeValues.set(eAsmcodes.ac_skipf, asmcodeValue(0b000110010, 0b00, eOperands.operand_l))   // 	SKIPF	D/#
  this.asmcodeValues.set(eAsmcodes.ac_execf, asmcodeValue(0b000110011, 0b00, eOperands.operand_l))   // 	EXECF	D/#
  this.asmcodeValues.set(eAsmcodes.ac_getptr, asmcodeValue(0b000110100, 0b00, eOperands.operand_d))   // 	GETPTR	D
  this.asmcodeValues.set(eAsmcodes.ac_getbrk, asmcodeValue(0b000110101, 0b11, eOperands.operand_getbrk))   // 	GETBRK	D
  this.asmcodeValues.set(eAsmcodes.ac_cogbrk, asmcodeValue(0b000110101, 0b00, eOperands.operand_l))   // 	COGBRK	D/#
  this.asmcodeValues.set(eAsmcodes.ac_brk, asmcodeValue(0b000110110, 0b00, eOperands.operand_l))   // 	BRK	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setluts, asmcodeValue(0b000110111, 0b00, eOperands.operand_l))   // 	SETLUTS	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setcy, asmcodeValue(0b000111000, 0b00, eOperands.operand_l))   // 	SETCY	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setci, asmcodeValue(0b000111001, 0b00, eOperands.operand_l))   // 	SETCI	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setcq, asmcodeValue(0b000111010, 0b00, eOperands.operand_l))   // 	SETCQ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setcfrq, asmcodeValue(0b000111011, 0b00, eOperands.operand_l))   // 	SETCFRQ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setcmod, asmcodeValue(0b000111100, 0b00, eOperands.operand_l))   // 	SETCMOD	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setpiv, asmcodeValue(0b000111101, 0b00, eOperands.operand_l))   // 	SETPIV	D/#
  this.asmcodeValues.set(eAsmcodes.ac_setpix, asmcodeValue(0b000111110, 0b00, eOperands.operand_l))   // 	SETPIX	D/#
  this.asmcodeValues.set(eAsmcodes.ac_cogatn, asmcodeValue(0b000111111, 0b00, eOperands.operand_l))   // 	COGATN	D/#
  this.asmcodeValues.set(eAsmcodes.ac_testp, asmcodeValue(0b001000000, 0b00, eOperands.operand_testp))   // 	TESTP	D/#
  this.asmcodeValues.set(eAsmcodes.ac_testpn, asmcodeValue(0b001000001, 0b00, eOperands.operand_testp))   // 	TESTPN	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirl, asmcodeValue(0b001000000, 0b00, eOperands.operand_pinop))   // 	DIRL	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirh, asmcodeValue(0b001000001, 0b00, eOperands.operand_pinop))   // 	DIRH	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirc, asmcodeValue(0b001000010, 0b00, eOperands.operand_pinop))   // 	DIRC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirnc, asmcodeValue(0b001000011, 0b00, eOperands.operand_pinop))   // 	DIRNC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirz, asmcodeValue(0b001000100, 0b00, eOperands.operand_pinop))   // 	DIRZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirnz, asmcodeValue(0b001000101, 0b00, eOperands.operand_pinop))   // 	DIRNZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirrnd, asmcodeValue(0b001000110, 0b00, eOperands.operand_pinop))   // 	DIRRND	D/#
  this.asmcodeValues.set(eAsmcodes.ac_dirnot, asmcodeValue(0b001000111, 0b00, eOperands.operand_pinop))   // 	DIRNOT	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outl, asmcodeValue(0b001001000, 0b00, eOperands.operand_pinop))   // 	OUTL	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outh, asmcodeValue(0b001001001, 0b00, eOperands.operand_pinop))   // 	OUTH	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outc, asmcodeValue(0b001001010, 0b00, eOperands.operand_pinop))   // 	OUTC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outnc, asmcodeValue(0b001001011, 0b00, eOperands.operand_pinop))   // 	OUTNC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outz, asmcodeValue(0b001001100, 0b00, eOperands.operand_pinop))   // 	OUTZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outnz, asmcodeValue(0b001001101, 0b00, eOperands.operand_pinop))   // 	OUTNZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outrnd, asmcodeValue(0b001001110, 0b00, eOperands.operand_pinop))   // 	OUTRND	D/#
  this.asmcodeValues.set(eAsmcodes.ac_outnot, asmcodeValue(0b001001111, 0b00, eOperands.operand_pinop))   // 	OUTNOT	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltl, asmcodeValue(0b001010000, 0b00, eOperands.operand_pinop))   // 	FLTL	D/#
  this.asmcodeValues.set(eAsmcodes.ac_flth, asmcodeValue(0b001010001, 0b00, eOperands.operand_pinop))   // 	FLTH	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltc, asmcodeValue(0b001010010, 0b00, eOperands.operand_pinop))   // 	FLTC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltnc, asmcodeValue(0b001010011, 0b00, eOperands.operand_pinop))   // 	FLTNC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltz, asmcodeValue(0b001010100, 0b00, eOperands.operand_pinop))   // 	FLTZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltnz, asmcodeValue(0b001010101, 0b00, eOperands.operand_pinop))   // 	FLTNZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltrnd, asmcodeValue(0b001010110, 0b00, eOperands.operand_pinop))   // 	FLTRND	D/#
  this.asmcodeValues.set(eAsmcodes.ac_fltnot, asmcodeValue(0b001010111, 0b00, eOperands.operand_pinop))   // 	FLTNOT	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvl, asmcodeValue(0b001011000, 0b00, eOperands.operand_pinop))   // 	DRVL	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvh, asmcodeValue(0b001011001, 0b00, eOperands.operand_pinop))   // 	DRVH	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvc, asmcodeValue(0b001011010, 0b00, eOperands.operand_pinop))   // 	DRVC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvnc, asmcodeValue(0b001011011, 0b00, eOperands.operand_pinop))   // 	DRVNC	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvz, asmcodeValue(0b001011100, 0b00, eOperands.operand_pinop))   // 	DRVZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvnz, asmcodeValue(0b001011101, 0b00, eOperands.operand_pinop))   // 	DRVNZ	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvrnd, asmcodeValue(0b001011110, 0b00, eOperands.operand_pinop))   // 	DRVRND	D/#
  this.asmcodeValues.set(eAsmcodes.ac_drvnot, asmcodeValue(0b001011111, 0b00, eOperands.operand_pinop))   // 	DRVNOT	D/#
  this.asmcodeValues.set(eAsmcodes.ac_splitb, asmcodeValue(0b001100000, 0b00, eOperands.operand_d))   // 	SPLITB	D
  this.asmcodeValues.set(eAsmcodes.ac_mergeb, asmcodeValue(0b001100001, 0b00, eOperands.operand_d))   // 	MERGEB	D
  this.asmcodeValues.set(eAsmcodes.ac_splitw, asmcodeValue(0b001100010, 0b00, eOperands.operand_d))   // 	SPLITW	D
  this.asmcodeValues.set(eAsmcodes.ac_mergew, asmcodeValue(0b001100011, 0b00, eOperands.operand_d))   // 	MERGEW	D
  this.asmcodeValues.set(eAsmcodes.ac_seussf, asmcodeValue(0b001100100, 0b00, eOperands.operand_d))   // 	SEUSSF	D
  this.asmcodeValues.set(eAsmcodes.ac_seussr, asmcodeValue(0b001100101, 0b00, eOperands.operand_d))   // 	SEUSSR	D
  this.asmcodeValues.set(eAsmcodes.ac_rgbsqz, asmcodeValue(0b001100110, 0b00, eOperands.operand_d))   // 	RGBSQZ	D
  this.asmcodeValues.set(eAsmcodes.ac_rgbexp, asmcodeValue(0b001100111, 0b00, eOperands.operand_d))   // 	RGBEXP	D
  this.asmcodeValues.set(eAsmcodes.ac_xoro32, asmcodeValue(0b001101000, 0b00, eOperands.operand_d))   // 	XORO32	D
  this.asmcodeValues.set(eAsmcodes.ac_rev, asmcodeValue(0b001101001, 0b00, eOperands.operand_d))   // 	REV	D
  this.asmcodeValues.set(eAsmcodes.ac_rczr, asmcodeValue(0b001101010, 0b11, eOperands.operand_d))   // 	RCZR	D
  this.asmcodeValues.set(eAsmcodes.ac_rczl, asmcodeValue(0b001101011, 0b11, eOperands.operand_d))   // 	RCZL	D
  this.asmcodeValues.set(eAsmcodes.ac_wrc, asmcodeValue(0b001101100, 0b00, eOperands.operand_d))   // 	WRC	D
  this.asmcodeValues.set(eAsmcodes.ac_wrnc, asmcodeValue(0b001101101, 0b00, eOperands.operand_d))   // 	WRNC	D
  this.asmcodeValues.set(eAsmcodes.ac_wrz, asmcodeValue(0b001101110, 0b00, eOperands.operand_d))   // 	WRZ	D
  this.asmcodeValues.set(eAsmcodes.ac_wrnz, asmcodeValue(0b001101111, 0b00, eOperands.operand_d))   // 	WRNZ	D
  this.asmcodeValues.set(eAsmcodes.ac_modcz, asmcodeValue(0b001101111, 0b11, eOperands.operand_cz))   // 	MODCZ	c,z
  this.asmcodeValues.set(eAsmcodes.ac_modc, asmcodeValue(0b001101111, 0b10, eOperands.operand_cz))   // 	MODC	c
  this.asmcodeValues.set(eAsmcodes.ac_modz, asmcodeValue(0b001101111, 0b01, eOperands.operand_cz))   // 	MODZ	z
  this.asmcodeValues.set(eAsmcodes.ac_setscp, asmcodeValue(0b001110000, 0b00, eOperands.operand_l))   // 	SETSCP	D/#
  this.asmcodeValues.set(eAsmcodes.ac_getscp, asmcodeValue(0b001110001, 0b00, eOperands.operand_d))   // 	GETSCP	D
  this.asmcodeValues.set(eAsmcodes.ac_jmp, asmcodeValue(0b110110000, 0b00, eOperands.operand_jmp))   // 	JMP	# <or> D
  this.asmcodeValues.set(eAsmcodes.ac_call, asmcodeValue(0b110110100, 0b00, eOperands.operand_call))   // 	CALL	# <or> D
  this.asmcodeValues.set(eAsmcodes.ac_calla, asmcodeValue(0b110111000, 0b00, eOperands.operand_call))   // 	CALLA	# <or> D
  this.asmcodeValues.set(eAsmcodes.ac_callb, asmcodeValue(0b110111100, 0b00, eOperands.operand_call))   // 	CALLB	# <or> D
  this.asmcodeValues.set(eAsmcodes.ac_calld, asmcodeValue(0b111000000, 0b00, eOperands.operand_calld))   // 	CALLD	reg,# / D,S
  this.asmcodeValues.set(eAsmcodes.ac_loc, asmcodeValue(0b111010000, 0b00, eOperands.operand_loc))   // 	LOC	reg,#
  this.asmcodeValues.set(eAsmcodes.ac_augs, asmcodeValue(0b111100000, 0b00, eOperands.operand_aug))   // 	AUGS	#
  this.asmcodeValues.set(eAsmcodes.ac_augd, asmcodeValue(0b111110000, 0b00, eOperands.operand_aug))   // 	AUGD	#
  this.asmcodeValues.set(eAsmcodes.ac_pusha, asmcodeValue(eElementType.pp_pusha, 0b00, eOperands.operand_pushpop))   // 	PUSHA	D/#	alias instructions
  this.asmcodeValues.set(eAsmcodes.ac_pushb, asmcodeValue(eElementType.pp_pushb, 0b00, eOperands.operand_pushpop))   // 	PUSHB	D/#
  this.asmcodeValues.set(eAsmcodes.ac_popa, asmcodeValue(eElementType.pp_popa, 0b11, eOperands.operand_pushpop))   // 	POPA	D
  this.asmcodeValues.set(eAsmcodes.ac_popb, asmcodeValue(eElementType.pp_popb, 0b11, eOperands.operand_pushpop))   // 	POPB	D
  this.asmcodeValues.set(eAsmcodes.ac_ret, asmcodeValue(0, 0b11, eOperands.operand_xlat))   // 	RET
  this.asmcodeValues.set(eAsmcodes.ac_reta, asmcodeValue(1, 0b11, eOperands.operand_xlat))   // 	RETA
  this.asmcodeValues.set(eAsmcodes.ac_retb, asmcodeValue(2, 0b11, eOperands.operand_xlat))   // 	RETB
  this.asmcodeValues.set(eAsmcodes.ac_reti0, asmcodeValue(3, 0b00, eOperands.operand_xlat))   // 	RETI0
  this.asmcodeValues.set(eAsmcodes.ac_reti1, asmcodeValue(4, 0b00, eOperands.operand_xlat))   // 	RETI1
  this.asmcodeValues.set(eAsmcodes.ac_reti2, asmcodeValue(5, 0b00, eOperands.operand_xlat))   // 	RETI2
  this.asmcodeValues.set(eAsmcodes.ac_reti3, asmcodeValue(6, 0b00, eOperands.operand_xlat))   // 	RETI3
  this.asmcodeValues.set(eAsmcodes.ac_resi0, asmcodeValue(7, 0b00, eOperands.operand_xlat))   // 	RESI0
  this.asmcodeValues.set(eAsmcodes.ac_resi1, asmcodeValue(8, 0b00, eOperands.operand_xlat))   // 	RESI1
  this.asmcodeValues.set(eAsmcodes.ac_resi2, asmcodeValue(9, 0b00, eOperands.operand_xlat))   // 	RESI2
  this.asmcodeValues.set(eAsmcodes.ac_resi3, asmcodeValue(10, 0b00, eOperands.operand_xlat))   // 	RESI3
  this.asmcodeValues.set(eAsmcodes.ac_xstop, asmcodeValue(11, 0b00, eOperands.operand_xlat))   // 	XSTOP
  this.asmcodeValues.set(eAsmcodes.ac_akpin, asmcodeValue(0, 0b00, eOperands.operand_akpin))   // 	AKPIN	S/#
  this.asmcodeValues.set(eAsmcodes.ac_asmclk, asmcodeValue(0, 0b00, eOperands.operand_asmclk))   // 	ASMCLK
  this.asmcodeValues.set(eAsmcodes.ac_nop, asmcodeValue(0b000000000, 0b00, eOperands.operand_nop))   // 	NOP
  this.asmcodeValues.set(eAsmcodes.ac_debug, asmcodeValue(0b000110110, 0b00, eOperands.operand_debug))   // 	DEBUG()
