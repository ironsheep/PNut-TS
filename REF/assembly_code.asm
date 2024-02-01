;
;
; Assembly codes
;
macro		asmcode	symbol,v1,v2,v3
symbol		=	(v3 shl 11) + (v2 shl 9) + v1
		endm

asmcode		ac_ror,		000000000b,11b,operand_ds	;	ROR	D,S/#
asmcode		ac_rol,		000000100b,11b,operand_ds	;	ROL	D,S/#
asmcode		ac_shr,		000001000b,11b,operand_ds	;	SHR	D,S/#
asmcode		ac_shl,		000001100b,11b,operand_ds	;	SHL	D,S/#
asmcode		ac_rcr,		000010000b,11b,operand_ds	;	RCR	D,S/#
asmcode		ac_rcl,		000010100b,11b,operand_ds	;	RCL	D,S/#
asmcode		ac_sar,		000011000b,11b,operand_ds	;	SAR	D,S/#
asmcode		ac_sal,		000011100b,11b,operand_ds	;	SAL	D,S/#

asmcode		ac_add,		000100000b,11b,operand_ds	;	ADD	D,S/#
asmcode		ac_addx,	000100100b,11b,operand_ds	;	ADDX	D,S/#
asmcode		ac_adds,	000101000b,11b,operand_ds	;	ADDS	D,S/#
asmcode		ac_addsx,	000101100b,11b,operand_ds	;	ADDSX	D,S/#

asmcode		ac_sub,		000110000b,11b,operand_ds	;	SUB	D,S/#
asmcode		ac_subx,	000110100b,11b,operand_ds	;	SUBX	D,S/#
asmcode		ac_subs,	000111000b,11b,operand_ds	;	SUBS	D,S/#
asmcode		ac_subsx,	000111100b,11b,operand_ds	;	SUBSX	D,S/#

asmcode		ac_cmp,		001000000b,11b,operand_ds	;	CMP	D,S/#
asmcode		ac_cmpx,	001000100b,11b,operand_ds	;	CMPX	D,S/#
asmcode		ac_cmps,	001001000b,11b,operand_ds	;	CMPS	D,S/#
asmcode		ac_cmpsx,	001001100b,11b,operand_ds	;	CMPSX	D,S/#

asmcode		ac_cmpr,	001010000b,11b,operand_ds	;	CMPR	D,S/#
asmcode		ac_cmpm,	001010100b,11b,operand_ds	;	CMPM	D,S/#
asmcode		ac_subr,	001011000b,11b,operand_ds	;	SUBR	D,S/#
asmcode		ac_cmpsub,	001011100b,11b,operand_ds	;	CMPSUB	D,S/#

asmcode		ac_fge,		001100000b,11b,operand_ds	;	FGE	D,S/#
asmcode		ac_fle,		001100100b,11b,operand_ds	;	FLE	D,S/#
asmcode		ac_fges,	001101000b,11b,operand_ds	;	FGES	D,S/#
asmcode		ac_fles,	001101100b,11b,operand_ds	;	FLES	D,S/#

asmcode		ac_sumc,	001110000b,11b,operand_ds	;	SUMC	D,S/#
asmcode		ac_sumnc,	001110100b,11b,operand_ds	;	SUMNC	D,S/#
asmcode		ac_sumz,	001111000b,11b,operand_ds	;	SUMZ	D,S/#
asmcode		ac_sumnz,	001111100b,11b,operand_ds	;	SUMNZ	D,S/#

asmcode		ac_bitl,	010000000b,00b,operand_bitx	;	BITL	D,S/#
asmcode		ac_bith,	010000100b,00b,operand_bitx	;	BITH	D,S/#
asmcode		ac_bitc,	010001000b,00b,operand_bitx	;	BITC	D,S/#
asmcode		ac_bitnc,	010001100b,00b,operand_bitx	;	BITNC	D,S/#
asmcode		ac_bitz,	010010000b,00b,operand_bitx	;	BITZ	D,S/#
asmcode		ac_bitnz,	010010100b,00b,operand_bitx	;	BITNZ	D,S/#
asmcode		ac_bitrnd,	010011000b,00b,operand_bitx	;	BITRND	D,S/#
asmcode		ac_bitnot,	010011100b,00b,operand_bitx	;	BITNOT	D,S/#

asmcode		ac_testb,	010000000b,00b,operand_testb	;	TESTB	D,S/#
asmcode		ac_testbn,	010000100b,00b,operand_testb	;	TESTBN	D,S/#

asmcode		ac_and,		010100000b,11b,operand_ds	;	AND	D,S/#
asmcode		ac_andn,	010100100b,11b,operand_ds	;	ANDN	D,S/#
asmcode		ac_or,		010101000b,11b,operand_ds	;	OR	D,S/#
asmcode		ac_xor,		010101100b,11b,operand_ds	;	XOR	D,S/#

asmcode		ac_muxc,	010110000b,11b,operand_ds	;	MUXC	D,S/#
asmcode		ac_muxnc,	010110100b,11b,operand_ds	;	MUXNC	D,S/#
asmcode		ac_muxz,	010111000b,11b,operand_ds	;	MUXZ	D,S/#
asmcode		ac_muxnz,	010111100b,11b,operand_ds	;	MUXNZ	D,S/#

asmcode		ac_mov,		011000000b,11b,operand_ds	;	MOV	D,S/#
asmcode		ac_not,		011000100b,11b,operand_du	;	NOT	D{,S/#}
asmcode		ac_abs,		011001000b,11b,operand_du	;	ABS	D{,S/#}
asmcode		ac_neg,		011001100b,11b,operand_du	;	NEG	D{,S/#}

asmcode		ac_negc,	011010000b,11b,operand_du	;	NEGC	D{,S/#}
asmcode		ac_negnc,	011010100b,11b,operand_du	;	NEGNC	D{,S/#}
asmcode		ac_negz,	011011000b,11b,operand_du	;	NEGZ	D{,S/#}
asmcode		ac_negnz,	011011100b,11b,operand_du	;	NEGNZ	D{,S/#}

asmcode		ac_incmod,	011100000b,11b,operand_ds	;	INCMOD	D,S/#
asmcode		ac_decmod,	011100100b,11b,operand_ds	;	DECMOD	D,S/#
asmcode		ac_zerox,	011101000b,11b,operand_ds	;	ZEROX	D,S/#
asmcode		ac_signx,	011101100b,11b,operand_ds	;	SIGNX	D,S/#

asmcode		ac_encod,	011110000b,11b,operand_du	;	ENCOD	D{,S/#}
asmcode		ac_ones,	011110100b,11b,operand_du	;	ONES	D{,S/#}
asmcode		ac_test,	011111000b,11b,operand_du	;	TEST	D,{S/#}
asmcode		ac_testn,	011111100b,11b,operand_ds	;	TESTN	D,S/#

asmcode		ac_setnib,	100000000b,00b,operand_ds3set	;	SETNIB	{D,}S/#{,#0..7}
asmcode		ac_getnib,	100001000b,00b,operand_ds3get	;	GETNIB	D{,S/#,#0..7}
asmcode		ac_rolnib,	100010000b,00b,operand_ds3get	;	ROLNIB	D{,S/#,#0..7}

asmcode		ac_setbyte,	100011000b,00b,operand_ds2set	;	SETBYTE	{D,}S/#{,#0..3}
asmcode		ac_getbyte,	100011100b,00b,operand_ds2get	;	GETBYTE	D{,S/#,#0..3}
asmcode		ac_rolbyte,	100100000b,00b,operand_ds2get	;	ROLBYTE	D{,S/#,#0..3}

asmcode		ac_setword,	100100100b,00b,operand_ds1set	;	SETWORD	{D,}S/#{,#0..1}
asmcode		ac_getword,	100100110b,00b,operand_ds1get	;	GETWORD	D{,S/#,#0..1}
asmcode		ac_rolword,	100101000b,00b,operand_ds1get	;	ROLWORD	D{,S/#,#0..1}

asmcode		ac_altsn,	100101010b,00b,operand_duiz	;	ALTSN	D{,S/#}
asmcode		ac_altgn,	100101011b,00b,operand_duiz	;	ALTGN	D{,S/#}
asmcode		ac_altsb,	100101100b,00b,operand_duiz	;	ALTSB	D{,S/#}
asmcode		ac_altgb,	100101101b,00b,operand_duiz	;	ALTGB	D{,S/#}
asmcode		ac_altsw,	100101110b,00b,operand_duiz	;	ALTSW	D{,S/#}
asmcode		ac_altgw,	100101111b,00b,operand_duiz	;	ALTGW	D{,S/#}
asmcode		ac_altr,	100110000b,00b,operand_duiz	;	ALTR	D{,S/#}
asmcode		ac_altd,	100110001b,00b,operand_duiz	;	ALTD	D{,S/#}
asmcode		ac_alts,	100110010b,00b,operand_duiz	;	ALTS	D{,S/#}
asmcode		ac_altb,	100110011b,00b,operand_duiz	;	ALTB	D{,S/#}
asmcode		ac_alti,	100110100b,00b,operand_duii	;	ALTI	D{,S/#}
asmcode		ac_setr,	100110101b,00b,operand_ds	;	SETR	D,S/#
asmcode		ac_setd,	100110110b,00b,operand_ds	;	SETD	D,S/#
asmcode		ac_sets,	100110111b,00b,operand_ds	;	SETS	D,S/#
asmcode		ac_decod,	100111000b,00b,operand_du	;	DECOD	D{,S/#}
asmcode		ac_bmask,	100111001b,00b,operand_du	;	BMASK	D{,S/#}
asmcode		ac_crcbit,	100111010b,00b,operand_ds	;	CRCBIT	D,S/#
asmcode		ac_crcnib,	100111011b,00b,operand_ds	;	CRCNIB	D,S/#
asmcode		ac_muxnits,	100111100b,00b,operand_ds	;	MUXNITS	D,S/#
asmcode		ac_muxnibs,	100111101b,00b,operand_ds	;	MUXNIBS	D,S/#
asmcode		ac_muxq,	100111110b,00b,operand_ds	;	MUXQ	D,S/#
asmcode		ac_movbyts,	100111111b,00b,operand_ds	;	MOVBYTS	D,S/#

asmcode		ac_mul,		101000000b,01b,operand_ds	;	MUL	D,S/#
asmcode		ac_muls,	101000010b,01b,operand_ds	;	MULS	D,S/#
asmcode		ac_sca,		101000100b,01b,operand_ds	;	SCA	D,S/#
asmcode		ac_scas,	101000110b,01b,operand_ds	;	SCAS	D,S/#

asmcode		ac_addpix,	101001000b,00b,operand_ds	;	ADDPIX	D,S/#
asmcode		ac_mulpix,	101001001b,00b,operand_ds	;	MULPIX	D,S/#
asmcode		ac_blnpix,	101001010b,00b,operand_ds	;	BLNPIX	D,S/#
asmcode		ac_mixpix,	101001011b,00b,operand_ds	;	MIXPIX	D,S/#

asmcode		ac_addct1,	101001100b,00b,operand_ds	;	ADDCT1	D,S/#
asmcode		ac_addct2,	101001101b,00b,operand_ds	;	ADDCT2	D,S/#
asmcode		ac_addct3,	101001110b,00b,operand_ds	;	ADDCT3	D,S/#
asmcode		ac_wmlong,	101001111b,00b,operand_dsp	;	WMLONG_	D,S/#/PTRx

asmcode		ac_rqpin,	101010000b,10b,operand_ds	;	RQPIN	D,S/#
asmcode		ac_rdpin,	101010001b,10b,operand_ds	;	RDPIN	D,S/#
asmcode		ac_rdlut,	101010100b,11b,operand_dsp	;	RDLUT	D,S/#/PTRx

asmcode		ac_rdbyte,	101011000b,11b,operand_dsp	;	RDBYTE	D,S/#/PTRx
asmcode		ac_rdword,	101011100b,11b,operand_dsp	;	RDWORD	D,S/#/PTRx
asmcode		ac_rdlong,	101100000b,11b,operand_dsp	;	RDLONG	D,S/#/PTRx

asmcode		ac_callpa,	101101000b,00b,operand_lsj	;	CALLPA	D/#,S/#
asmcode		ac_callpb,	101101010b,00b,operand_lsj	;	CALLPB	D/#,S/#

asmcode		ac_djz,		101101100b,00b,operand_dsj	;	DJZ	D,S/#
asmcode		ac_djnz,	101101101b,00b,operand_dsj	;	DJNZ	D,S/#
asmcode		ac_djf,		101101110b,00b,operand_dsj	;	DJF	D,S/#
asmcode		ac_djnf,	101101111b,00b,operand_dsj	;	DJNF	D,S/#

asmcode		ac_ijz,		101110000b,00b,operand_dsj	;	IJZ	D,S/#
asmcode		ac_ijnz,	101110001b,00b,operand_dsj	;	IJNZ	D,S/#

asmcode		ac_tjz,		101110010b,00b,operand_dsj	;	TJZ	D,S/#
asmcode		ac_tjnz,	101110011b,00b,operand_dsj	;	TJNZ	D,S/#
asmcode		ac_tjf,		101110100b,00b,operand_dsj	;	TJF	D,S/#
asmcode		ac_tjnf,	101110101b,00b,operand_dsj	;	TJNF	D,S/#
asmcode		ac_tjs,		101110110b,00b,operand_dsj	;	TJS	D,S/#
asmcode		ac_tjns,	101110111b,00b,operand_dsj	;	TJNS	D,S/#
asmcode		ac_tjv,		101111000b,00b,operand_dsj	;	TJV	D,S/#

asmcode		ac_jint,	000000000b,00b,operand_jpoll	;	JINT	S/#
asmcode		ac_jct1,	000000001b,00b,operand_jpoll	;	JCT1	S/#
asmcode		ac_jct2,	000000010b,00b,operand_jpoll	;	JCT2	S/#
asmcode		ac_jct3,	000000011b,00b,operand_jpoll	;	JCT3	S/#
asmcode		ac_jse1,	000000100b,00b,operand_jpoll	;	JSE1	S/#
asmcode		ac_jse2,	000000101b,00b,operand_jpoll	;	JSE2	S/#
asmcode		ac_jse3,	000000110b,00b,operand_jpoll	;	JSE3	S/#
asmcode		ac_jse4,	000000111b,00b,operand_jpoll	;	JSE4	S/#
asmcode		ac_jpat,	000001000b,00b,operand_jpoll	;	JPAT	S/#
asmcode		ac_jfbw,	000001001b,00b,operand_jpoll	;	JFBW	S/#
asmcode		ac_jxmt,	000001010b,00b,operand_jpoll	;	JXMT	S/#
asmcode		ac_jxfi,	000001011b,00b,operand_jpoll	;	JXFI	S/#
asmcode		ac_jxro,	000001100b,00b,operand_jpoll	;	JXRO	S/#
asmcode		ac_jxrl,	000001101b,00b,operand_jpoll	;	JXRL	S/#
asmcode		ac_jatn,	000001110b,00b,operand_jpoll	;	JATN	S/#
asmcode		ac_jqmt,	000001111b,00b,operand_jpoll	;	JQMT	S/#

asmcode		ac_jnint,	000010000b,00b,operand_jpoll	;	JNINT	S/#
asmcode		ac_jnct1,	000010001b,00b,operand_jpoll	;	JNCT1	S/#
asmcode		ac_jnct2,	000010010b,00b,operand_jpoll	;	JNCT2	S/#
asmcode		ac_jnct3,	000010011b,00b,operand_jpoll	;	JNCT3	S/#
asmcode		ac_jnse1,	000010100b,00b,operand_jpoll	;	JNSE1	S/#
asmcode		ac_jnse2,	000010101b,00b,operand_jpoll	;	JNSE2	S/#
asmcode		ac_jnse3,	000010110b,00b,operand_jpoll	;	JNSE3	S/#
asmcode		ac_jnse4,	000010111b,00b,operand_jpoll	;	JNSE4	S/#
asmcode		ac_jnpat,	000011000b,00b,operand_jpoll	;	JNPAT	S/#
asmcode		ac_jnfbw,	000011001b,00b,operand_jpoll	;	JNFBW	S/#
asmcode		ac_jnxmt,	000011010b,00b,operand_jpoll	;	JNXMT	S/#
asmcode		ac_jnxfi,	000011011b,00b,operand_jpoll	;	JNXFI	S/#
asmcode		ac_jnxro,	000011100b,00b,operand_jpoll	;	JNXRO	S/#
asmcode		ac_jnxrl,	000011101b,00b,operand_jpoll	;	JNXRL	S/#
asmcode		ac_jnatn,	000011110b,00b,operand_jpoll	;	JNATN	S/#
asmcode		ac_jnqmt,	000011111b,00b,operand_jpoll	;	JNQMT	S/#

;asmcode	ac_empty,	101111010b,00b,operand_ls	;	<empty>	D/#,S/#
;asmcode	ac_empty,	101111100b,00b,operand_ls	;	<empty>	D/#,S/#
asmcode		ac_setpat,	101111110b,00b,operand_ls	;	SETPAT	D/#,S/#

asmcode		ac_wrpin,	110000000b,00b,operand_ls	;	WRPIN	D/#,S/#
asmcode		ac_wxpin,	110000010b,00b,operand_ls	;	WXPIN	D/#,S/#
asmcode		ac_wypin,	110000100b,00b,operand_ls	;	WYPIN	D/#,S/#
asmcode		ac_wrlut,	110000110b,00b,operand_lsp	;	WRLUT	D/#,S/#/PTRx

asmcode		ac_wrbyte,	110001000b,00b,operand_lsp	;	WRBYTE	D/#,S/#/PTRx
asmcode		ac_wrword,	110001010b,00b,operand_lsp	;	WRWORD	D/#,S/#/PTRx
asmcode		ac_wrlong,	110001100b,00b,operand_lsp	;	WRLONG	D/#,S/#/PTRx

asmcode		ac_rdfast,	110001110b,00b,operand_ls	;	RDFAST	D/#,S/#
asmcode		ac_wrfast,	110010000b,00b,operand_ls	;	WRFAST	D/#,S/#
asmcode		ac_fblock,	110010010b,00b,operand_ls	;	FBLOCK	D/#,S/#

asmcode		ac_xinit,	110010100b,00b,operand_ls	;	XINIT	D/#,S/#
asmcode		ac_xzero,	110010110b,00b,operand_ls	;	XZERO	D/#,S/#
asmcode		ac_xcont,	110011000b,00b,operand_ls	;	XCONT	D/#,S/#

asmcode		ac_rep,		110011010b,00b,operand_rep	;	REP	D/#/@,S/#

asmcode		ac_coginit,	110011100b,10b,operand_ls	;	COGINIT	D/#,S/#
asmcode		ac_qmul,	110100000b,00b,operand_ls	;	QMUL	D/#,S/#
asmcode		ac_qdiv,	110100010b,00b,operand_ls	;	QDIV	D/#,S/#
asmcode		ac_qfrac,	110100100b,00b,operand_ls	;	QFRAC	D/#,S/#
asmcode		ac_qsqrt,	110100110b,00b,operand_ls	;	QSQRT	D/#,S/#
asmcode		ac_qrotate,	110101000b,00b,operand_ls	;	QROTATE	D/#,S/#
asmcode		ac_qvector,	110101010b,00b,operand_ls	;	QVECTOR	D/#,S/#

asmcode		ac_hubset,	000000000b,00b,operand_l	;	HUBSET	D/#
asmcode		ac_cogid,	000000001b,10b,operand_l	;	COGID	D/#
asmcode		ac_cogstop,	000000011b,00b,operand_l	;	COGSTOP	D/#
asmcode		ac_locknew,	000000100b,10b,operand_d	;	LOCKNEW	D
asmcode		ac_lockret,	000000101b,00b,operand_l	;	LOCKRET	D/#
asmcode		ac_locktry,	000000110b,10b,operand_l	;	LOCKTRY	D/#
asmcode		ac_lockrel,	000000111b,10b,operand_l	;	LOCKREL	D/#
asmcode		ac_qlog,	000001110b,00b,operand_l	;	QLOG	D/#
asmcode		ac_qexp,	000001111b,00b,operand_l	;	QEXP	D/#

asmcode		ac_rfbyte,	000010000b,11b,operand_d	;	RFBYTE	D
asmcode		ac_rfword,	000010001b,11b,operand_d	;	RFWORD	D
asmcode		ac_rflong,	000010010b,11b,operand_d	;	RFLONG	D
asmcode		ac_rfvar,	000010011b,11b,operand_d	;	RFVAR	D
asmcode		ac_rfvars,	000010100b,11b,operand_d	;	RFVARS	D

asmcode		ac_wfbyte,	000010101b,00b,operand_l	;	WFBYTE	D/#
asmcode		ac_wfword,	000010110b,00b,operand_l	;	WFWORD	D/#
asmcode		ac_wflong,	000010111b,00b,operand_l	;	WFLONG	D/#

asmcode		ac_getqx,	000011000b,11b,operand_d	;	GETQX	D
asmcode		ac_getqy,	000011001b,11b,operand_d	;	GETQY	D

asmcode		ac_getct,	000011010b,10b,operand_d	;	GETCT	D
asmcode		ac_getrnd,	000011011b,11b,operand_de	;	GETRND	D

asmcode		ac_setdacs,	000011100b,00b,operand_l	;	SETDACS	D/#
asmcode		ac_setxfrq,	000011101b,00b,operand_l	;	SETXFRQ	D/#
asmcode		ac_getxacc,	000011110b,00b,operand_d	;	GETXACC	D
asmcode		ac_waitx,	000011111b,11b,operand_l	;	WAITX	D/#

asmcode		ac_setse1,	000100000b,00b,operand_l	;	SETSE1	D/#
asmcode		ac_setse2,	000100001b,00b,operand_l	;	SETSE2	D/#
asmcode		ac_setse3,	000100010b,00b,operand_l	;	SETSE3	D/#
asmcode		ac_setse4,	000100011b,00b,operand_l	;	SETSE4	D/#

asmcode		ac_pollint,	000000000b,11b,operand_pollwait	;	POLLINT
asmcode		ac_pollct1,	000000001b,11b,operand_pollwait	;	POLLCT1
asmcode		ac_pollct2,	000000010b,11b,operand_pollwait	;	POLLCT2
asmcode		ac_pollct3,	000000011b,11b,operand_pollwait	;	POLLCT3
asmcode		ac_pollse1,	000000100b,11b,operand_pollwait	;	POLLSE1
asmcode		ac_pollse2,	000000101b,11b,operand_pollwait	;	POLLSE2
asmcode		ac_pollse3,	000000110b,11b,operand_pollwait	;	POLLSE3
asmcode		ac_pollse4,	000000111b,11b,operand_pollwait	;	POLLSE4
asmcode		ac_pollpat,	000001000b,11b,operand_pollwait	;	POLLPAT
asmcode		ac_pollfbw,	000001001b,11b,operand_pollwait	;	POLLFBW
asmcode		ac_pollxmt,	000001010b,11b,operand_pollwait	;	POLLXMT
asmcode		ac_pollxfi,	000001011b,11b,operand_pollwait	;	POLLXFI
asmcode		ac_pollxro,	000001100b,11b,operand_pollwait	;	POLLXRO
asmcode		ac_pollxrl,	000001101b,11b,operand_pollwait	;	POLLXRL
asmcode		ac_pollatn,	000001110b,11b,operand_pollwait	;	POLLATN
asmcode		ac_pollqmt,	000001111b,11b,operand_pollwait	;	POLLQMT

asmcode		ac_waitint,	000010000b,11b,operand_pollwait	;	WAITINT
asmcode		ac_waitct1,	000010001b,11b,operand_pollwait	;	WAITCT1
asmcode		ac_waitct2,	000010010b,11b,operand_pollwait	;	WAITCT2
asmcode		ac_waitct3,	000010011b,11b,operand_pollwait	;	WAITCT3
asmcode		ac_waitse1,	000010100b,11b,operand_pollwait	;	WAITSE1
asmcode		ac_waitse2,	000010101b,11b,operand_pollwait	;	WAITSE2
asmcode		ac_waitse3,	000010110b,11b,operand_pollwait	;	WAITSE3
asmcode		ac_waitse4,	000010111b,11b,operand_pollwait	;	WAITSE4
asmcode		ac_waitpat,	000011000b,11b,operand_pollwait	;	WAITPAT
asmcode		ac_waitfbw,	000011001b,11b,operand_pollwait	;	WAITFBW
asmcode		ac_waitxmt,	000011010b,11b,operand_pollwait	;	WAITXMT
asmcode		ac_waitxfi,	000011011b,11b,operand_pollwait	;	WAITXFI
asmcode		ac_waitxro,	000011100b,11b,operand_pollwait	;	WAITXRO
asmcode		ac_waitxrl,	000011101b,11b,operand_pollwait	;	WAITXRL
asmcode		ac_waitatn,	000011110b,11b,operand_pollwait	;	WAITATN

asmcode		ac_allowi,	000100000b,00b,operand_pollwait	;	ALLOWI
asmcode		ac_stalli,	000100001b,00b,operand_pollwait	;	STALLI

asmcode		ac_trgint1,	000100010b,00b,operand_pollwait	;	TRGINT1
asmcode		ac_trgint2,	000100011b,00b,operand_pollwait	;	TRGINT2
asmcode		ac_trgint3,	000100100b,00b,operand_pollwait	;	TRGINT3

asmcode		ac_nixint1,	000100101b,00b,operand_pollwait	;	NIXINT1
asmcode		ac_nixint2,	000100110b,00b,operand_pollwait	;	NIXINT2
asmcode		ac_nixint3,	000100111b,00b,operand_pollwait	;	NIXINT3

asmcode		ac_setint1,	000100101b,00b,operand_l	;	SETINT1	D/#
asmcode		ac_setint2,	000100110b,00b,operand_l	;	SETINT2	D/#
asmcode		ac_setint3,	000100111b,00b,operand_l	;	SETINT3	D/#

asmcode		ac_setq,	000101000b,00b,operand_l	;	SETQ	D/#
asmcode		ac_setq2,	000101001b,00b,operand_l	;	SETQ2	D/#
asmcode		ac_push,	000101010b,00b,operand_l	;	PUSH	D/#
asmcode		ac_pop,		000101011b,11b,operand_d	;	POP	D

asmcode		ac_jmprel,	000110000b,00b,operand_l	;	JMPREL	D/#
asmcode		ac_skip,	000110001b,00b,operand_l	;	SKIP	D/#
asmcode		ac_skipf,	000110010b,00b,operand_l	;	SKIPF	D/#
asmcode		ac_execf,	000110011b,00b,operand_l	;	EXECF	D/#

asmcode		ac_getptr,	000110100b,00b,operand_d	;	GETPTR	D
asmcode		ac_getbrk,	000110101b,11b,operand_getbrk	;	GETBRK	D
asmcode		ac_cogbrk,	000110101b,00b,operand_l	;	COGBRK	D/#
asmcode		ac_brk,		000110110b,00b,operand_l	;	BRK	D/#

asmcode		ac_setluts,	000110111b,00b,operand_l	;	SETLUTS	D/#

asmcode		ac_setcy,	000111000b,00b,operand_l	;	SETCY	D/#
asmcode		ac_setci,	000111001b,00b,operand_l	;	SETCI	D/#
asmcode		ac_setcq,	000111010b,00b,operand_l	;	SETCQ	D/#
asmcode		ac_setcfrq,	000111011b,00b,operand_l	;	SETCFRQ	D/#
asmcode		ac_setcmod,	000111100b,00b,operand_l	;	SETCMOD	D/#

asmcode		ac_setpiv,	000111101b,00b,operand_l	;	SETPIV	D/#
asmcode		ac_setpix,	000111110b,00b,operand_l	;	SETPIX	D/#

asmcode		ac_cogatn,	000111111b,00b,operand_l	;	COGATN	D/#

asmcode		ac_testp,	001000000b,00b,operand_testp	;	TESTP	D/#
asmcode		ac_testpn,	001000001b,00b,operand_testp	;	TESTPN	D/#

asmcode		ac_dirl,	001000000b,00b,operand_pinop	;	DIRL	D/#
asmcode		ac_dirh,	001000001b,00b,operand_pinop	;	DIRH	D/#
asmcode		ac_dirc,	001000010b,00b,operand_pinop	;	DIRC	D/#
asmcode		ac_dirnc,	001000011b,00b,operand_pinop	;	DIRNC	D/#
asmcode		ac_dirz,	001000100b,00b,operand_pinop	;	DIRZ	D/#
asmcode		ac_dirnz,	001000101b,00b,operand_pinop	;	DIRNZ	D/#
asmcode		ac_dirrnd,	001000110b,00b,operand_pinop	;	DIRRND	D/#
asmcode		ac_dirnot,	001000111b,00b,operand_pinop	;	DIRNOT	D/#

asmcode		ac_outl,	001001000b,00b,operand_pinop	;	OUTL	D/#
asmcode		ac_outh,	001001001b,00b,operand_pinop	;	OUTH	D/#
asmcode		ac_outc,	001001010b,00b,operand_pinop	;	OUTC	D/#
asmcode		ac_outnc,	001001011b,00b,operand_pinop	;	OUTNC	D/#
asmcode		ac_outz,	001001100b,00b,operand_pinop	;	OUTZ	D/#
asmcode		ac_outnz,	001001101b,00b,operand_pinop	;	OUTNZ	D/#
asmcode		ac_outrnd,	001001110b,00b,operand_pinop	;	OUTRND	D/#
asmcode		ac_outnot,	001001111b,00b,operand_pinop	;	OUTNOT	D/#

asmcode		ac_fltl,	001010000b,00b,operand_pinop	;	FLTL	D/#
asmcode		ac_flth,	001010001b,00b,operand_pinop	;	FLTH	D/#
asmcode		ac_fltc,	001010010b,00b,operand_pinop	;	FLTC	D/#
asmcode		ac_fltnc,	001010011b,00b,operand_pinop	;	FLTNC	D/#
asmcode		ac_fltz,	001010100b,00b,operand_pinop	;	FLTZ	D/#
asmcode		ac_fltnz,	001010101b,00b,operand_pinop	;	FLTNZ	D/#
asmcode		ac_fltrnd,	001010110b,00b,operand_pinop	;	FLTRND	D/#
asmcode		ac_fltnot,	001010111b,00b,operand_pinop	;	FLTNOT	D/#

asmcode		ac_drvl,	001011000b,00b,operand_pinop	;	DRVL	D/#
asmcode		ac_drvh,	001011001b,00b,operand_pinop	;	DRVH	D/#
asmcode		ac_drvc,	001011010b,00b,operand_pinop	;	DRVC	D/#
asmcode		ac_drvnc,	001011011b,00b,operand_pinop	;	DRVNC	D/#
asmcode		ac_drvz,	001011100b,00b,operand_pinop	;	DRVZ	D/#
asmcode		ac_drvnz,	001011101b,00b,operand_pinop	;	DRVNZ	D/#
asmcode		ac_drvrnd,	001011110b,00b,operand_pinop	;	DRVRND	D/#
asmcode		ac_drvnot,	001011111b,00b,operand_pinop	;	DRVNOT	D/#

asmcode		ac_splitb,	001100000b,00b,operand_d	;	SPLITB	D
asmcode		ac_mergeb,	001100001b,00b,operand_d	;	MERGEB	D
asmcode		ac_splitw,	001100010b,00b,operand_d	;	SPLITW	D
asmcode		ac_mergew,	001100011b,00b,operand_d	;	MERGEW	D
asmcode		ac_seussf,	001100100b,00b,operand_d	;	SEUSSF	D
asmcode		ac_seussr,	001100101b,00b,operand_d	;	SEUSSR	D
asmcode		ac_rgbsqz,	001100110b,00b,operand_d	;	RGBSQZ	D
asmcode		ac_rgbexp,	001100111b,00b,operand_d	;	RGBEXP	D
asmcode		ac_xoro32,	001101000b,00b,operand_d	;	XORO32	D
asmcode		ac_rev,		001101001b,00b,operand_d	;	REV	D
asmcode		ac_rczr,	001101010b,11b,operand_d	;	RCZR	D
asmcode		ac_rczl,	001101011b,11b,operand_d	;	RCZL	D
asmcode		ac_wrc,		001101100b,00b,operand_d	;	WRC	D
asmcode		ac_wrnc,	001101101b,00b,operand_d	;	WRNC	D
asmcode		ac_wrz,		001101110b,00b,operand_d	;	WRZ	D
asmcode		ac_wrnz,	001101111b,00b,operand_d	;	WRNZ	D
asmcode		ac_modcz,	001101111b,11b,operand_cz	;	MODCZ	c,z
asmcode		ac_modc,	001101111b,10b,operand_cz	;	MODC	c
asmcode		ac_modz,	001101111b,01b,operand_cz	;	MODZ	z

asmcode		ac_setscp,	001110000b,00b,operand_l	;	SETSCP	D/#
asmcode		ac_getscp,	001110001b,00b,operand_d	;	GETSCP	D

asmcode		ac_jmp,		110110000b,00b,operand_jmp	;	JMP	# <or> D
asmcode		ac_call,	110110100b,00b,operand_call	;	CALL	# <or> D
asmcode		ac_calla,	110111000b,00b,operand_call	;	CALLA	# <or> D
asmcode		ac_callb,	110111100b,00b,operand_call	;	CALLB	# <or> D
asmcode		ac_calld,	111000000b,00b,operand_calld	;	CALLD	reg,# / D,S
asmcode		ac_loc,		111010000b,00b,operand_loc	;	LOC	reg,#

asmcode		ac_augs,	111100000b,00b,operand_aug	;	AUGS	#
asmcode		ac_augd,	111110000b,00b,operand_aug	;	AUGD	#


asmcode		ac_pusha,	pp_pusha,  00b,operand_pushpop	;	PUSHA	D/#	alias instructions
asmcode		ac_pushb,	pp_pushb,  00b,operand_pushpop	;	PUSHB	D/#
asmcode		ac_popa,	pp_popa,   11b,operand_pushpop	;	POPA	D
asmcode		ac_popb,	pp_popb,   11b,operand_pushpop	;	POPB	D

asmcode		ac_ret,		0,	   11b,operand_xlat	;	RET
asmcode		ac_reta,	1,	   11b,operand_xlat	;	RETA
asmcode		ac_retb,	2,	   11b,operand_xlat	;	RETB
asmcode		ac_reti0,	3,	   00b,operand_xlat	;	RETI0
asmcode		ac_reti1,	4,	   00b,operand_xlat	;	RETI1
asmcode		ac_reti2,	5,	   00b,operand_xlat	;	RETI2
asmcode		ac_reti3,	6,	   00b,operand_xlat	;	RETI3
asmcode		ac_resi0,	7,	   00b,operand_xlat	;	RESI0
asmcode		ac_resi1,	8,	   00b,operand_xlat	;	RESI1
asmcode		ac_resi2,	9,	   00b,operand_xlat	;	RESI2
asmcode		ac_resi3,	10,	   00b,operand_xlat	;	RESI3
asmcode		ac_xstop,	11,	   00b,operand_xlat	;	XSTOP

asmcode		ac_akpin,	0,	   00b,operand_akpin	;	AKPIN	S/#

asmcode		ac_asmclk,	0,	   00b,operand_asmclk	;	ASMCLK

asmcode		ac_nop,		000000000b,00b,operand_nop	;	NOP

asmcode		ac_debug,	000110110b,00b,operand_debug	;	DEBUG()
