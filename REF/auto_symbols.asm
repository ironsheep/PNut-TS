macro		sym	t,v,s
		db	s,0
		dd	v
		db	t
		endm

macro		syml	t,v,l,s
		db	s,0
		dd	v shl l
		db	t
		endm
;
;
;
; Automatic symbols
;
automatic_symbols:

	sym	type_op,		oc_abs,		'ABS'		;(also asm instruction)
	sym	type_op,		oc_fabs,	'FABS'
	sym	type_op,		oc_encod,	'ENCOD'		;(also asm instruction)
	sym	type_op,		oc_decod,	'DECOD'		;(also asm instruction)
	sym	type_op,		oc_bmask,	'BMASK'		;(also asm instruction)
	sym	type_op,		oc_ones,	'ONES'		;(also asm instruction)
	sym	type_op,		oc_sqrt,	'SQRT'
	sym	type_op,		oc_fsqrt,	'FSQRT'
	sym	type_op,		oc_qlog,	'QLOG'		;(also asm instruction)
	sym	type_op,		oc_qexp,	'QEXP'		;(also asm instruction)
	sym	type_op,		oc_sar,		'SAR'		;(also asm instruction)
	sym	type_op,		oc_ror,		'ROR'		;(also asm instruction)
	sym	type_op,		oc_rol,		'ROL'		;(also asm instruction)
	sym	type_op,		oc_rev,		'REV'		;(also asm instruction)
	sym	type_op,		oc_zerox,	'ZEROX'		;(also asm instruction)
	sym	type_op,		oc_signx,	'SIGNX'		;(also asm instruction)
	sym	type_op,		oc_sca,		'SCA'		;(also asm instruction)
	sym	type_op,		oc_scas,	'SCAS'		;(also asm instruction)
	sym	type_op,		oc_frac,	'FRAC'
	sym	type_op,		oc_addbits,	'ADDBITS'
	sym	type_op,		oc_addpins,	'ADDPINS'
	sym	type_op,		oc_lognot_name,	'NOT'		;(also asm instruction)
	sym	type_op,		oc_logand_name,	'AND'		;(also asm instruction)
	sym	type_op,		oc_logxor_name,	'XOR'		;(also asm instruction)
	sym	type_op,		oc_logor_name,	'OR'		;(also asm instruction)


	sym	type_float,		0,		'FLOAT'		;floating-point operators
	sym	type_round,		0,		'ROUND'
	sym	type_trunc,		0,		'TRUNC'

	sym	type_constr,		0,		'STRING'	;string expressions

	sym	type_block,		block_con,	'CON'		;block designators
	sym	type_block,		block_obj,	'OBJ'
	sym	type_block,		block_var,	'VAR'
	sym	type_block,		block_pub,	'PUB'
	sym	type_block,		block_pri,	'PRI'
	sym	type_block,		block_dat,	'DAT'

	sym	type_field,		0,		'FIELD'		;field

	sym	type_size,		0,		'BYTE'		;size
	sym	type_size,		1,		'WORD'
	sym	type_size,		2,		'LONG'

	sym	type_size_fit,		0,		'BYTEFIT'	;size fits
	sym	type_size_fit,		1,		'WORDFIT'

	sym	type_fvar,		0,		'FVAR'		;fvar
	sym	type_fvar,		1,		'FVARS'

	sym	type_file,		0,		'FILE'		;file-related

	sym	type_if,		0,		'IF'		;high-level structures
	sym	type_ifnot,		0,		'IFNOT'
	sym	type_elseif,		0,		'ELSEIF'
	sym	type_elseifnot,		0,		'ELSEIFNOT'
	sym	type_else,		0,		'ELSE'
	sym	type_case,		0,		'CASE'
	sym	type_case_fast,		0,		'CASE_FAST'
	sym	type_other,		0,		'OTHER'
	sym	type_repeat,		0,		'REPEAT'
	sym	type_while,		0,		'WHILE'
	sym	type_until,		0,		'UNTIL'
	sym	type_from,		0,		'FROM'
	sym	type_to,		0,		'TO'
	sym	type_step,		0,		'STEP'
	sym	type_with,		0,		'WITH'

	sym	type_i_next_quit,	0,		'NEXT'		;high-level instructions
	sym	type_i_next_quit,	1,		'QUIT'
	sym	type_i_return,		0,		'RETURN'
	sym	type_i_abort,		0,		'ABORT'
	sym	type_i_look,		00b,		'LOOKUPZ'
	sym	type_i_look,		01b,		'LOOKUP'
	sym	type_i_look,		10b,		'LOOKDOWNZ'
	sym	type_i_look,		11b,		'LOOKDOWN'
	sym	type_i_cogspin,		0,		'COGSPIN'
	sym	type_recv,		0,		'RECV'
	sym	type_send,		0,		'SEND'

	sym	type_debug,		0,		'DEBUG'		;debug

	sym	type_debug_cmd,		dc_dly,		'DLY'		;debug commands
	sym	type_debug_cmd,		dc_pc_key	'PC_KEY'
	sym	type_debug_cmd,		dc_pc_mouse	'PC_MOUSE'

	sym	type_debug_cmd,		00100100b,	'ZSTR'
	sym	type_debug_cmd,		00100110b,	'ZSTR_'
	sym	type_debug_cmd,		00101100b,	'FDEC'
	sym	type_debug_cmd,		00101110b,	'FDEC_'
	sym	type_debug_cmd,		00110000b,	'FDEC_REG_ARRAY'
	sym	type_debug_cmd,		00110010b,	'FDEC_REG_ARRAY_'
	sym	type_debug_cmd,		00110100b,	'LSTR'
	sym	type_debug_cmd,		00110110b,	'LSTR_'
	sym	type_debug_cmd,		00111100b,	'FDEC_ARRAY'
	sym	type_debug_cmd,		00111110b,	'FDEC_ARRAY_'

	sym	type_debug_cmd,		01000000b,	'UDEC'
	sym	type_debug_cmd,		01000010b,	'UDEC_'
	sym	type_debug_cmd,		01000100b,	'UDEC_BYTE'
	sym	type_debug_cmd,		01000110b,	'UDEC_BYTE_'
	sym	type_debug_cmd,		01001000b,	'UDEC_WORD'
	sym	type_debug_cmd,		01001010b,	'UDEC_WORD_'
	sym	type_debug_cmd,		01001100b,	'UDEC_LONG'
	sym	type_debug_cmd,		01001110b,	'UDEC_LONG_'
	sym	type_debug_cmd,		01010000b,	'UDEC_REG_ARRAY'
	sym	type_debug_cmd,		01010010b,	'UDEC_REG_ARRAY_'
	sym	type_debug_cmd,		01010100b,	'UDEC_BYTE_ARRAY'
	sym	type_debug_cmd,		01010110b,	'UDEC_BYTE_ARRAY_'
	sym	type_debug_cmd,		01011000b,	'UDEC_WORD_ARRAY'
	sym	type_debug_cmd,		01011010b,	'UDEC_WORD_ARRAY_'
	sym	type_debug_cmd,		01011100b,	'UDEC_LONG_ARRAY'
	sym	type_debug_cmd,		01011110b,	'UDEC_LONG_ARRAY_'

	sym	type_debug_cmd,		01100000b,	'SDEC'
	sym	type_debug_cmd,		01100010b,	'SDEC_'
	sym	type_debug_cmd,		01100100b,	'SDEC_BYTE'
	sym	type_debug_cmd,		01100110b,	'SDEC_BYTE_'
	sym	type_debug_cmd,		01101000b,	'SDEC_WORD'
	sym	type_debug_cmd,		01101010b,	'SDEC_WORD_'
	sym	type_debug_cmd,		01101100b,	'SDEC_LONG'
	sym	type_debug_cmd,		01101110b,	'SDEC_LONG_'
	sym	type_debug_cmd,		01110000b,	'SDEC_REG_ARRAY'
	sym	type_debug_cmd,		01110010b,	'SDEC_REG_ARRAY_'
	sym	type_debug_cmd,		01110100b,	'SDEC_BYTE_ARRAY'
	sym	type_debug_cmd,		01110110b,	'SDEC_BYTE_ARRAY_'
	sym	type_debug_cmd,		01111000b,	'SDEC_WORD_ARRAY'
	sym	type_debug_cmd,		01111010b,	'SDEC_WORD_ARRAY_'
	sym	type_debug_cmd,		01111100b,	'SDEC_LONG_ARRAY'
	sym	type_debug_cmd,		01111110b,	'SDEC_LONG_ARRAY_'

	sym	type_debug_cmd,		10000000b,	'UHEX'
	sym	type_debug_cmd,		10000010b,	'UHEX_'
	sym	type_debug_cmd,		10000100b,	'UHEX_BYTE'
	sym	type_debug_cmd,		10000110b,	'UHEX_BYTE_'
	sym	type_debug_cmd,		10001000b,	'UHEX_WORD'
	sym	type_debug_cmd,		10001010b,	'UHEX_WORD_'
	sym	type_debug_cmd,		10001100b,	'UHEX_LONG'
	sym	type_debug_cmd,		10001110b,	'UHEX_LONG_'
	sym	type_debug_cmd,		10010000b,	'UHEX_REG_ARRAY'
	sym	type_debug_cmd,		10010010b,	'UHEX_REG_ARRAY_'
	sym	type_debug_cmd,		10010100b,	'UHEX_BYTE_ARRAY'
	sym	type_debug_cmd,		10010110b,	'UHEX_BYTE_ARRAY_'
	sym	type_debug_cmd,		10011000b,	'UHEX_WORD_ARRAY'
	sym	type_debug_cmd,		10011010b,	'UHEX_WORD_ARRAY_'
	sym	type_debug_cmd,		10011100b,	'UHEX_LONG_ARRAY'
	sym	type_debug_cmd,		10011110b,	'UHEX_LONG_ARRAY_'

	sym	type_debug_cmd,		10100000b,	'SHEX'
	sym	type_debug_cmd,		10100010b,	'SHEX_'
	sym	type_debug_cmd,		10100100b,	'SHEX_BYTE'
	sym	type_debug_cmd,		10100110b,	'SHEX_BYTE_'
	sym	type_debug_cmd,		10101000b,	'SHEX_WORD'
	sym	type_debug_cmd,		10101010b,	'SHEX_WORD_'
	sym	type_debug_cmd,		10101100b,	'SHEX_LONG'
	sym	type_debug_cmd,		10101110b,	'SHEX_LONG_'
	sym	type_debug_cmd,		10110000b,	'SHEX_REG_ARRAY'
	sym	type_debug_cmd,		10110010b,	'SHEX_REG_ARRAY_'
	sym	type_debug_cmd,		10110100b,	'SHEX_BYTE_ARRAY'
	sym	type_debug_cmd,		10110110b,	'SHEX_BYTE_ARRAY_'
	sym	type_debug_cmd,		10111000b,	'SHEX_WORD_ARRAY'
	sym	type_debug_cmd,		10111010b,	'SHEX_WORD_ARRAY_'
	sym	type_debug_cmd,		10111100b,	'SHEX_LONG_ARRAY'
	sym	type_debug_cmd,		10111110b,	'SHEX_LONG_ARRAY_'

	sym	type_debug_cmd,		11000000b,	'UBIN'
	sym	type_debug_cmd,		11000010b,	'UBIN_'
	sym	type_debug_cmd,		11000100b,	'UBIN_BYTE'
	sym	type_debug_cmd,		11000110b,	'UBIN_BYTE_'
	sym	type_debug_cmd,		11001000b,	'UBIN_WORD'
	sym	type_debug_cmd,		11001010b,	'UBIN_WORD_'
	sym	type_debug_cmd,		11001100b,	'UBIN_LONG'
	sym	type_debug_cmd,		11001110b,	'UBIN_LONG_'
	sym	type_debug_cmd,		11010000b,	'UBIN_REG_ARRAY'
	sym	type_debug_cmd,		11010010b,	'UBIN_REG_ARRAY_'
	sym	type_debug_cmd,		11010100b,	'UBIN_BYTE_ARRAY'
	sym	type_debug_cmd,		11010110b,	'UBIN_BYTE_ARRAY_'
	sym	type_debug_cmd,		11011000b,	'UBIN_WORD_ARRAY'
	sym	type_debug_cmd,		11011010b,	'UBIN_WORD_ARRAY_'
	sym	type_debug_cmd,		11011100b,	'UBIN_LONG_ARRAY'
	sym	type_debug_cmd,		11011110b,	'UBIN_LONG_ARRAY_'

	sym	type_debug_cmd,		11100000b,	'SBIN'
	sym	type_debug_cmd,		11100010b,	'SBIN_'
	sym	type_debug_cmd,		11100100b,	'SBIN_BYTE'
	sym	type_debug_cmd,		11100110b,	'SBIN_BYTE_'
	sym	type_debug_cmd,		11101000b,	'SBIN_WORD'
	sym	type_debug_cmd,		11101010b,	'SBIN_WORD_'
	sym	type_debug_cmd,		11101100b,	'SBIN_LONG'
	sym	type_debug_cmd,		11101110b,	'SBIN_LONG_'
	sym	type_debug_cmd,		11110000b,	'SBIN_REG_ARRAY'
	sym	type_debug_cmd,		11110010b,	'SBIN_REG_ARRAY_'
	sym	type_debug_cmd,		11110100b,	'SBIN_BYTE_ARRAY'
	sym	type_debug_cmd,		11110110b,	'SBIN_BYTE_ARRAY_'
	sym	type_debug_cmd,		11111000b,	'SBIN_WORD_ARRAY'
	sym	type_debug_cmd,		11111010b,	'SBIN_WORD_ARRAY_'
	sym	type_debug_cmd,		11111100b,	'SBIN_LONG_ARRAY'
	sym	type_debug_cmd,		11111110b,	'SBIN_LONG_ARRAY_'


	sym	type_asm_end,		0,		'END'		;misc
	sym	type_under,		0,		'_'


	sym	type_i_flex,		fc_hubset,	'HUBSET'	;(also asm instruction)

	sym	type_i_flex,		fc_coginit,	'COGINIT'	;(also asm instruction)
	sym	type_i_flex,		fc_cogstop,	'COGSTOP'	;(also asm instruction)
	sym	type_i_flex,		fc_cogid,	'COGID'		;(also asm instruction)
	sym	type_i_flex,		fc_cogchk,	'COGCHK'

	sym	type_i_flex,		fc_getrnd,	'GETRND'	;(also asm instruction)
	sym	type_i_flex,		fc_getct,	'GETCT'		;(also asm instruction)
	sym	type_i_flex,		fc_pollct,	'POLLCT'
	sym	type_i_flex,		fc_waitct,	'WAITCT'

	sym	type_i_flex,		fc_pinwrite,	'PINWRITE'
	sym	type_i_flex,		fc_pinwrite,	'PINW'
	sym	type_i_flex,		fc_pinlow,	'PINLOW'
	sym	type_i_flex,		fc_pinlow,	'PINL'
	sym	type_i_flex,		fc_pinhigh,	'PINHIGH'
	sym	type_i_flex,		fc_pinhigh,	'PINH'
	sym	type_i_flex,		fc_pintoggle,	'PINTOGGLE'
	sym	type_i_flex,		fc_pintoggle,	'PINT'
	sym	type_i_flex,		fc_pinfloat,	'PINFLOAT'
	sym	type_i_flex,		fc_pinfloat,	'PINF'
	sym	type_i_flex,		fc_pinread,	'PINREAD'
	sym	type_i_flex,		fc_pinread,	'PINR'

	sym	type_i_flex,		fc_pinstart,	'PINSTART'
	sym	type_i_flex,		fc_pinclear,	'PINCLEAR'

	sym	type_i_flex,		fc_wrpin,	'WRPIN'		;(also asm instruction)
	sym	type_i_flex,		fc_wxpin,	'WXPIN'		;(also asm instruction)
	sym	type_i_flex,		fc_wypin,	'WYPIN'		;(also asm instruction)
	sym	type_i_flex,		fc_akpin,	'AKPIN'		;(also asm instruction)
	sym	type_i_flex,		fc_rdpin,	'RDPIN'		;(also asm instruction)
	sym	type_i_flex,		fc_rqpin,	'RQPIN'		;(also asm instruction)

	sym	type_i_flex,		fc_rotxy,	'ROTXY'
	sym	type_i_flex,		fc_polxy,	'POLXY'
	sym	type_i_flex,		fc_xypol,	'XYPOL'

	sym	type_i_flex,		fc_locknew,	'LOCKNEW'	;(also asm instruction)
	sym	type_i_flex,		fc_lockret,	'LOCKRET'	;(also asm instruction)
	sym	type_i_flex,		fc_locktry,	'LOCKTRY'	;(also asm instruction)
	sym	type_i_flex,		fc_lockrel,	'LOCKREL'	;(also asm instruction)
	sym	type_i_flex,		fc_lockchk,	'LOCKCHK'

	sym	type_i_flex,		fc_cogatn,	'COGATN'	;(also asm instruction)
	sym	type_i_flex,		fc_pollatn,	'POLLATN'	;(also asm instruction)
	sym	type_i_flex,		fc_waitatn,	'WAITATN'	;(also asm instruction)

	sym	type_i_flex,		fc_clkset,	'CLKSET'
	sym	type_i_flex,		fc_regexec,	'REGEXEC'
	sym	type_i_flex,		fc_regload,	'REGLOAD'
	sym	type_i_flex,		fc_call,	'CALL'		;(also asm instruction)
	sym	type_i_flex,		fc_getregs,	'GETREGS'
	sym	type_i_flex,		fc_setregs,	'SETREGS'

	sym	type_i_flex,		fc_bytemove,	'BYTEMOVE'
	sym	type_i_flex,		fc_bytefill,	'BYTEFILL'
	sym	type_i_flex,		fc_wordmove,	'WORDMOVE'
	sym	type_i_flex,		fc_wordfill,	'WORDFILL'
	sym	type_i_flex,		fc_longmove,	'LONGMOVE'
	sym	type_i_flex,		fc_longfill,	'LONGFILL'

	sym	type_i_flex,		fc_strsize,	'STRSIZE'
	sym	type_i_flex,		fc_strcomp,	'STRCOMP'
	sym	type_i_flex,		fc_strcopy,	'STRCOPY'

	sym	type_i_flex,		fc_getcrc,	'GETCRC'

	sym	type_i_flex,		fc_waitus,	'WAITUS'
	sym	type_i_flex,		fc_waitms,	'WAITMS'
	sym	type_i_flex,		fc_getms,	'GETMS'
	sym	type_i_flex,		fc_getsec,	'GETSEC'
	sym	type_i_flex,		fc_muldiv64,	'MULDIV64'
	sym	type_i_flex,		fc_qsin,	'QSIN'
	sym	type_i_flex,		fc_qcos,	'QCOS'

	sym	type_i_flex,		fc_nan,		'NAN'


	sym	type_asm_dir,		dir_orgh,	'ORGH'		;assembly directives
	sym	type_asm_dir,		dir_alignw,	'ALIGNW'
	sym	type_asm_dir,		dir_alignl,	'ALIGNL'
	sym	type_asm_dir,		dir_org,	'ORG'
	sym	type_asm_dir,		dir_orgf,	'ORGF'
	sym	type_asm_dir,		dir_res,	'RES'
	sym	type_asm_dir,		dir_fit,	'FIT'

	sym	type_asm_cond,		if_never,	'_RET_'		;assembly conditionals
	sym	type_asm_cond,		if_nc_and_nz,	'IF_NC_AND_NZ'
	sym	type_asm_cond,		if_nc_and_nz,	'IF_NZ_AND_NC'
	sym	type_asm_cond,		if_nc_and_nz,	'IF_GT'
	sym	type_asm_cond,		if_nc_and_nz,	'IF_A'
	sym	type_asm_cond,		if_nc_and_z,	'IF_NC_AND_Z'
	sym	type_asm_cond,		if_nc_and_z,	'IF_Z_AND_NC'
	sym	type_asm_cond,		if_nc,		'IF_NC'
	sym	type_asm_cond,		if_nc,		'IF_GE'
	sym	type_asm_cond,		if_nc,		'IF_AE'
	sym	type_asm_cond,		if_c_and_nz,	'IF_C_AND_NZ'
	sym	type_asm_cond,		if_c_and_nz,	'IF_NZ_AND_C'
	sym	type_asm_cond,		if_nz,		'IF_NZ'
	sym	type_asm_cond,		if_nz,		'IF_NE'
	sym	type_asm_cond,		if_c_ne_z,	'IF_C_NE_Z'
	sym	type_asm_cond,		if_c_ne_z,	'IF_Z_NE_C'
	sym	type_asm_cond,		if_nc_or_nz,	'IF_NC_OR_NZ'
	sym	type_asm_cond,		if_nc_or_nz,	'IF_NZ_OR_NC'
	sym	type_asm_cond,		if_c_and_z,	'IF_C_AND_Z'
	sym	type_asm_cond,		if_c_and_z,	'IF_Z_AND_C'
	sym	type_asm_cond,		if_c_eq_z,	'IF_C_EQ_Z'
	sym	type_asm_cond,		if_c_eq_z,	'IF_Z_EQ_C'
	sym	type_asm_cond,		if_z,		'IF_Z'
	sym	type_asm_cond,		if_z,		'IF_E'
	sym	type_asm_cond,		if_nc_or_z,	'IF_NC_OR_Z'
	sym	type_asm_cond,		if_nc_or_z,	'IF_Z_OR_NC'
	sym	type_asm_cond,		if_c,		'IF_C'
	sym	type_asm_cond,		if_c,		'IF_LT'
	sym	type_asm_cond,		if_c,		'IF_B'
	sym	type_asm_cond,		if_c_or_nz,	'IF_C_OR_NZ'
	sym	type_asm_cond,		if_c_or_nz,	'IF_NZ_OR_C'
	sym	type_asm_cond,		if_c_or_z,	'IF_C_OR_Z'
	sym	type_asm_cond,		if_c_or_z,	'IF_Z_OR_C'
	sym	type_asm_cond,		if_c_or_z,	'IF_LE'
	sym	type_asm_cond,		if_c_or_z,	'IF_BE'
	sym	type_asm_cond,		if_always,	'IF_ALWAYS'

	sym	type_asm_cond,		if_nc_and_nz,	'IF_00'
	sym	type_asm_cond,		if_nc_and_z,	'IF_01'
	sym	type_asm_cond,		if_c_and_nz,	'IF_10'
	sym	type_asm_cond,		if_c_and_z,	'IF_11'
	sym	type_asm_cond,		if_nz,		'IF_X0'
	sym	type_asm_cond,		if_z,		'IF_X1'
	sym	type_asm_cond,		if_nc,		'IF_0X'
	sym	type_asm_cond,		if_c,		'IF_1X'
	sym	type_asm_cond,		if_c_or_z,	'IF_NOT_00'
	sym	type_asm_cond,		if_c_or_nz,	'IF_NOT_01'
	sym	type_asm_cond,		if_nc_or_z,	'IF_NOT_10'
	sym	type_asm_cond,		if_nc_or_nz,	'IF_NOT_11'
	sym	type_asm_cond,		if_c_eq_z,	'IF_SAME'
	sym	type_asm_cond,		if_c_ne_z,	'IF_DIFF'

	sym	type_asm_cond,		0000b,		'IF_0000'
	sym	type_asm_cond,		0001b,		'IF_0001'
	sym	type_asm_cond,		0010b,		'IF_0010'
	sym	type_asm_cond,		0011b,		'IF_0011'
	sym	type_asm_cond,		0100b,		'IF_0100'
	sym	type_asm_cond,		0101b,		'IF_0101'
	sym	type_asm_cond,		0110b,		'IF_0110'
	sym	type_asm_cond,		0111b,		'IF_0111'
	sym	type_asm_cond,		1000b,		'IF_1000'
	sym	type_asm_cond,		1001b,		'IF_1001'
	sym	type_asm_cond,		1010b,		'IF_1010'
	sym	type_asm_cond,		1011b,		'IF_1011'
	sym	type_asm_cond,		1100b,		'IF_1100'
	sym	type_asm_cond,		1101b,		'IF_1101'
	sym	type_asm_cond,		1110b,		'IF_1110'
	sym	type_asm_cond,		1111b,		'IF_1111'

									;assembly instructions

;	sym	type_asm_inst,		ac_ror,		'ROR'		(declared as type_op)
;	sym	type_asm_inst,		ac_rol,		'ROL'		(declared as type_op)
	sym	type_asm_inst,		ac_shr,		'SHR'
	sym	type_asm_inst,		ac_shl,		'SHL'
	sym	type_asm_inst,		ac_rcr,		'RCR'
	sym	type_asm_inst,		ac_rcl,		'RCL'
;	sym	type_asm_inst,		ac_sar,		'SAR'		(declared as type_op)
	sym	type_asm_inst,		ac_sal,		'SAL'

	sym	type_asm_inst,		ac_add,		'ADD'
	sym	type_asm_inst,		ac_addx,	'ADDX'
	sym	type_asm_inst,		ac_adds,	'ADDS'
	sym	type_asm_inst,		ac_addsx,	'ADDSX'

	sym	type_asm_inst,		ac_sub,		'SUB'
	sym	type_asm_inst,		ac_subx,	'SUBX'
	sym	type_asm_inst,		ac_subs,	'SUBS'
	sym	type_asm_inst,		ac_subsx,	'SUBSX'

	sym	type_asm_inst,		ac_cmp,		'CMP'
	sym	type_asm_inst,		ac_cmpx,	'CMPX'
	sym	type_asm_inst,		ac_cmps,	'CMPS'
	sym	type_asm_inst,		ac_cmpsx,	'CMPSX'

	sym	type_asm_inst,		ac_cmpr,	'CMPR'
	sym	type_asm_inst,		ac_cmpm,	'CMPM'
	sym	type_asm_inst,		ac_subr,	'SUBR'
	sym	type_asm_inst,		ac_cmpsub,	'CMPSUB'

	sym	type_asm_inst,		ac_fge,		'FGE'
	sym	type_asm_inst,		ac_fle,		'FLE'
	sym	type_asm_inst,		ac_fges,	'FGES'
	sym	type_asm_inst,		ac_fles,	'FLES'

	sym	type_asm_inst,		ac_sumc,	'SUMC'
	sym	type_asm_inst,		ac_sumnc,	'SUMNC'
	sym	type_asm_inst,		ac_sumz,	'SUMZ'
	sym	type_asm_inst,		ac_sumnz,	'SUMNZ'

	sym	type_asm_inst,		ac_bitl,	'BITL'
	sym	type_asm_inst,		ac_bith,	'BITH'
	sym	type_asm_inst,		ac_bitc,	'BITC'
	sym	type_asm_inst,		ac_bitnc,	'BITNC'
	sym	type_asm_inst,		ac_bitz,	'BITZ'
	sym	type_asm_inst,		ac_bitnz,	'BITNZ'
	sym	type_asm_inst,		ac_bitrnd,	'BITRND'
	sym	type_asm_inst,		ac_bitnot,	'BITNOT'

	sym	type_asm_inst,		ac_testb,	'TESTB'
	sym	type_asm_inst,		ac_testbn,	'TESTBN'

;	sym	type_asm_inst,		ac_and,		'AND'		(declared as type_op)
	sym	type_asm_inst,		ac_andn,	'ANDN'
;	sym	type_asm_inst,		ac_or,		'OR'		(declared as type_op)
;	sym	type_asm_inst,		ac_xor,		'XOR'		(declared as type_op)

	sym	type_asm_inst,		ac_muxc,	'MUXC'
	sym	type_asm_inst,		ac_muxnc,	'MUXNC'
	sym	type_asm_inst,		ac_muxz,	'MUXZ'
	sym	type_asm_inst,		ac_muxnz,	'MUXNZ'

	sym	type_asm_inst,		ac_mov,		'MOV'
;	sym	type_asm_inst,		ac_not,		'NOT'		(declared as type_op)
;	sym	type_asm_inst,		ac_abs,		'ABS'		(declared as type_op)
	sym	type_asm_inst,		ac_neg,		'NEG'

	sym	type_asm_inst,		ac_negc,	'NEGC'
	sym	type_asm_inst,		ac_negnc,	'NEGNC'
	sym	type_asm_inst,		ac_negz,	'NEGZ'
	sym	type_asm_inst,		ac_negnz,	'NEGNZ'

	sym	type_asm_inst,		ac_incmod,	'INCMOD'
	sym	type_asm_inst,		ac_decmod,	'DECMOD'
;	sym	type_asm_inst,		ac_zerox,	'ZEROX'		(declared as type_op)
;	sym	type_asm_inst,		ac_signx,	'SIGNX'		(declared as type_op)

;	sym	type_asm_inst,		ac_encod,	'ENCOD'		(declared as type_op)
;	sym	type_asm_inst,		ac_ones,	'ONES'		(declared as type_op)
	sym	type_asm_inst,		ac_test,	'TEST'
	sym	type_asm_inst,		ac_testn,	'TESTN'

	sym	type_asm_inst,		ac_setnib,	'SETNIB'
	sym	type_asm_inst,		ac_getnib,	'GETNIB'
	sym	type_asm_inst,		ac_rolnib,	'ROLNIB'

	sym	type_asm_inst,		ac_setbyte,	'SETBYTE'
	sym	type_asm_inst,		ac_getbyte,	'GETBYTE'
	sym	type_asm_inst,		ac_rolbyte,	'ROLBYTE'

	sym	type_asm_inst,		ac_setword,	'SETWORD'
	sym	type_asm_inst,		ac_getword,	'GETWORD'
	sym	type_asm_inst,		ac_rolword,	'ROLWORD'

	sym	type_asm_inst,		ac_altsn,	'ALTSN'
	sym	type_asm_inst,		ac_altgn,	'ALTGN'
	sym	type_asm_inst,		ac_altsb,	'ALTSB'
	sym	type_asm_inst,		ac_altgb,	'ALTGB'
	sym	type_asm_inst,		ac_altsw,	'ALTSW'
	sym	type_asm_inst,		ac_altgw,	'ALTGW'
	sym	type_asm_inst,		ac_altr,	'ALTR'
	sym	type_asm_inst,		ac_altd,	'ALTD'
	sym	type_asm_inst,		ac_alts,	'ALTS'
	sym	type_asm_inst,		ac_altb,	'ALTB'
	sym	type_asm_inst,		ac_alti,	'ALTI'
	sym	type_asm_inst,		ac_setr,	'SETR'
	sym	type_asm_inst,		ac_setd,	'SETD'
	sym	type_asm_inst,		ac_sets,	'SETS'
;	sym	type_asm_inst,		ac_decod,	'DECOD'		(declared as type_op)
;	sym	type_asm_inst,		ac_bmask,	'BMASK'		(declared as type_op)
	sym	type_asm_inst,		ac_crcbit,	'CRCBIT'
	sym	type_asm_inst,		ac_crcnib,	'CRCNIB'
	sym	type_asm_inst,		ac_muxnits,	'MUXNITS'
	sym	type_asm_inst,		ac_muxnibs,	'MUXNIBS'
	sym	type_asm_inst,		ac_muxq,	'MUXQ'
	sym	type_asm_inst,		ac_movbyts,	'MOVBYTS'

	sym	type_asm_inst,		ac_mul,		'MUL'
	sym	type_asm_inst,		ac_muls,	'MULS'
;	sym	type_asm_inst,		ac_sca,		'SCA'		(declared as type_op)
;	sym	type_asm_inst,		ac_scas,	'SCAS'		(declared as type_op)

	sym	type_asm_inst,		ac_addpix,	'ADDPIX'
	sym	type_asm_inst,		ac_mulpix,	'MULPIX'
	sym	type_asm_inst,		ac_blnpix,	'BLNPIX'
	sym	type_asm_inst,		ac_mixpix,	'MIXPIX'

	sym	type_asm_inst,		ac_addct1,	'ADDCT1'
	sym	type_asm_inst,		ac_addct2,	'ADDCT2'
	sym	type_asm_inst,		ac_addct3,	'ADDCT3'
	sym	type_asm_inst,		ac_wmlong,	'WMLONG'

;	sym	type_asm_inst,		ac_rqpin,	'RQPIN'		(declared as type_i_flex)
;	sym	type_asm_inst,		ac_rdpin,	'RDPIN'		(declared as type_i_flex)
	sym	type_asm_inst,		ac_rdlut,	'RDLUT'

	sym	type_asm_inst,		ac_rdbyte,	'RDBYTE'
	sym	type_asm_inst,		ac_rdword,	'RDWORD'
	sym	type_asm_inst,		ac_rdlong,	'RDLONG'

	sym	type_asm_inst,		ac_callpa,	'CALLPA'
	sym	type_asm_inst,		ac_callpb,	'CALLPB'

	sym	type_asm_inst,		ac_djz,		'DJZ'
	sym	type_asm_inst,		ac_djnz,	'DJNZ'
	sym	type_asm_inst,		ac_djf,		'DJF'
	sym	type_asm_inst,		ac_djnf,	'DJNF'

	sym	type_asm_inst,		ac_ijz,		'IJZ'
	sym	type_asm_inst,		ac_ijnz,	'IJNZ'

	sym	type_asm_inst,		ac_tjz,		'TJZ'
	sym	type_asm_inst,		ac_tjnz,	'TJNZ'
	sym	type_asm_inst,		ac_tjf,		'TJF'
	sym	type_asm_inst,		ac_tjnf,	'TJNF'
	sym	type_asm_inst,		ac_tjs,		'TJS'
	sym	type_asm_inst,		ac_tjns,	'TJNS'
	sym	type_asm_inst,		ac_tjv,		'TJV'

	sym	type_asm_inst,		ac_jint,	'JINT'
	sym	type_asm_inst,		ac_jct1,	'JCT1'
	sym	type_asm_inst,		ac_jct2,	'JCT2'
	sym	type_asm_inst,		ac_jct3,	'JCT3'
	sym	type_asm_inst,		ac_jse1,	'JSE1'
	sym	type_asm_inst,		ac_jse2,	'JSE2'
	sym	type_asm_inst,		ac_jse3,	'JSE3'
	sym	type_asm_inst,		ac_jse4,	'JSE4'
	sym	type_asm_inst,		ac_jpat,	'JPAT'
	sym	type_asm_inst,		ac_jfbw,	'JFBW'
	sym	type_asm_inst,		ac_jxmt,	'JXMT'
	sym	type_asm_inst,		ac_jxfi,	'JXFI'
	sym	type_asm_inst,		ac_jxro,	'JXRO'
	sym	type_asm_inst,		ac_jxrl,	'JXRL'
	sym	type_asm_inst,		ac_jatn,	'JATN'
	sym	type_asm_inst,		ac_jqmt,	'JQMT'

	sym	type_asm_inst,		ac_jnint,	'JNINT'
	sym	type_asm_inst,		ac_jnct1,	'JNCT1'
	sym	type_asm_inst,		ac_jnct2,	'JNCT2'
	sym	type_asm_inst,		ac_jnct3,	'JNCT3'
	sym	type_asm_inst,		ac_jnse1,	'JNSE1'
	sym	type_asm_inst,		ac_jnse2,	'JNSE2'
	sym	type_asm_inst,		ac_jnse3,	'JNSE3'
	sym	type_asm_inst,		ac_jnse4,	'JNSE4'
	sym	type_asm_inst,		ac_jnpat,	'JNPAT'
	sym	type_asm_inst,		ac_jnfbw,	'JNFBW'
	sym	type_asm_inst,		ac_jnxmt,	'JNXMT'
	sym	type_asm_inst,		ac_jnxfi,	'JNXFI'
	sym	type_asm_inst,		ac_jnxro,	'JNXRO'
	sym	type_asm_inst,		ac_jnxrl,	'JNXRL'
	sym	type_asm_inst,		ac_jnatn,	'JNATN'
	sym	type_asm_inst,		ac_jnqmt,	'JNQMT'

;	sym	type_asm_inst,		ac_empty,	'<empty>'
;	sym	type_asm_inst,		ac_empty,	'<empty>'
	sym	type_asm_inst,		ac_setpat,	'SETPAT'

;	sym	type_asm_inst,		ac_wrpin,	'WRPIN'		(declared as type_i_flex)
;	sym	type_asm_inst,		ac_wxpin,	'WXPIN'		(declared as type_i_flex)
;	sym	type_asm_inst,		ac_wypin,	'WYPIN'		(declared as type_i_flex)
	sym	type_asm_inst,		ac_wrlut,	'WRLUT'

	sym	type_asm_inst,		ac_wrbyte,	'WRBYTE'
	sym	type_asm_inst,		ac_wrword,	'WRWORD'
	sym	type_asm_inst,		ac_wrlong,	'WRLONG'

	sym	type_asm_inst,		ac_rdfast,	'RDFAST'
	sym	type_asm_inst,		ac_wrfast,	'WRFAST'
	sym	type_asm_inst,		ac_fblock,	'FBLOCK'

	sym	type_asm_inst,		ac_xinit,	'XINIT'
	sym	type_asm_inst,		ac_xzero,	'XZERO'
	sym	type_asm_inst,		ac_xcont,	'XCONT'

	sym	type_asm_inst,		ac_rep,		'REP'

;	sym	type_asm_inst,		ac_coginit,	'COGINIT'	(declared as type_i_flex)
	sym	type_asm_inst,		ac_qmul,	'QMUL'
	sym	type_asm_inst,		ac_qdiv,	'QDIV'
	sym	type_asm_inst,		ac_qfrac,	'QFRAC'
	sym	type_asm_inst,		ac_qsqrt,	'QSQRT'
	sym	type_asm_inst,		ac_qrotate,	'QROTATE'
	sym	type_asm_inst,		ac_qvector,	'QVECTOR'

;	sym	type_asm_inst,		ac_hubset,	'HUBSET'	(declared as type_i_flex)
;	sym	type_asm_inst,		ac_cogid,	'COGID'		(declared as type_i_flex)
;	sym	type_asm_inst,		ac_cogstop,	'COGSTOP'	(declared as type_i_flex)
;	sym	type_asm_inst,		ac_locknew,	'LOCKNEW'	(declared as type_i_flex)
;	sym	type_asm_inst,		ac_lockret,	'LOCKRET'	(declared as type_i_flex)
;	sym	type_asm_inst,		ac_locktry,	'LOCKTRY'	(declared as type_i_flex)
;	sym	type_asm_inst,		ac_lockrel,	'LOCKREL'	(declared as type_i_flex)
;	sym	type_asm_inst,		ac_qlog,	'QLOG'		(declared as type_op)
;	sym	type_asm_inst,		ac_qexp,	'QEXP'		(declared as type_op)

	sym	type_asm_inst,		ac_rfbyte,	'RFBYTE'
	sym	type_asm_inst,		ac_rfword,	'RFWORD'
	sym	type_asm_inst,		ac_rflong,	'RFLONG'
	sym	type_asm_inst,		ac_rfvar,	'RFVAR'
	sym	type_asm_inst,		ac_rfvars,	'RFVARS'

	sym	type_asm_inst,		ac_wfbyte,	'WFBYTE'
	sym	type_asm_inst,		ac_wfword,	'WFWORD'
	sym	type_asm_inst,		ac_wflong,	'WFLONG'

	sym	type_asm_inst,		ac_getqx,	'GETQX'
	sym	type_asm_inst,		ac_getqy,	'GETQY'

;	sym	type_asm_inst,		ac_getct,	'GETCT'		(declared as type_i_flex)
;	sym	type_asm_inst,		ac_getrnd,	'GETRND'	(declared as type_i_flex)

	sym	type_asm_inst,		ac_setdacs,	'SETDACS'
	sym	type_asm_inst,		ac_setxfrq,	'SETXFRQ'
	sym	type_asm_inst,		ac_getxacc,	'GETXACC'

	sym	type_asm_inst,		ac_waitx,	'WAITX'

	sym	type_asm_inst,		ac_setse1,	'SETSE1'
	sym	type_asm_inst,		ac_setse2,	'SETSE2'
	sym	type_asm_inst,		ac_setse3,	'SETSE3'
	sym	type_asm_inst,		ac_setse4,	'SETSE4'

	sym	type_asm_inst,		ac_pollint,	'POLLINT'
	sym	type_asm_inst,		ac_pollct1,	'POLLCT1'
	sym	type_asm_inst,		ac_pollct2,	'POLLCT2'
	sym	type_asm_inst,		ac_pollct3,	'POLLCT3'
	sym	type_asm_inst,		ac_pollse1,	'POLLSE1'
	sym	type_asm_inst,		ac_pollse2,	'POLLSE2'
	sym	type_asm_inst,		ac_pollse3,	'POLLSE3'
	sym	type_asm_inst,		ac_pollse4,	'POLLSE4'
	sym	type_asm_inst,		ac_pollpat,	'POLLPAT'
	sym	type_asm_inst,		ac_pollfbw,	'POLLFBW'
	sym	type_asm_inst,		ac_pollxmt,	'POLLXMT'
	sym	type_asm_inst,		ac_pollxfi,	'POLLXFI'
	sym	type_asm_inst,		ac_pollxro,	'POLLXRO'
	sym	type_asm_inst,		ac_pollxrl,	'POLLXRL'
;	sym	type_asm_inst,		ac_pollatn,	'POLLATN'	(declared as type_i_flex)
	sym	type_asm_inst,		ac_pollqmt,	'POLLQMT'

	sym	type_asm_inst,		ac_waitint,	'WAITINT'
	sym	type_asm_inst,		ac_waitct1,	'WAITCT1'
	sym	type_asm_inst,		ac_waitct2,	'WAITCT2'
	sym	type_asm_inst,		ac_waitct3,	'WAITCT3'
	sym	type_asm_inst,		ac_waitse1,	'WAITSE1'
	sym	type_asm_inst,		ac_waitse2,	'WAITSE2'
	sym	type_asm_inst,		ac_waitse3,	'WAITSE3'
	sym	type_asm_inst,		ac_waitse4,	'WAITSE4'
	sym	type_asm_inst,		ac_waitpat,	'WAITPAT'
	sym	type_asm_inst,		ac_waitfbw,	'WAITFBW'
	sym	type_asm_inst,		ac_waitxmt,	'WAITXMT'
	sym	type_asm_inst,		ac_waitxfi,	'WAITXFI'
	sym	type_asm_inst,		ac_waitxro,	'WAITXRO'
	sym	type_asm_inst,		ac_waitxrl,	'WAITXRL'
;	sym	type_asm_inst,		ac_waitatn,	'WAITATN'	(declared as type_i_flex)

	sym	type_asm_inst,		ac_allowi,	'ALLOWI'
	sym	type_asm_inst,		ac_stalli,	'STALLI'

	sym	type_asm_inst,		ac_trgint1,	'TRGINT1'
	sym	type_asm_inst,		ac_trgint2,	'TRGINT2'
	sym	type_asm_inst,		ac_trgint3,	'TRGINT3'

	sym	type_asm_inst,		ac_nixint1,	'NIXINT1'
	sym	type_asm_inst,		ac_nixint2,	'NIXINT2'
	sym	type_asm_inst,		ac_nixint3,	'NIXINT3'

	sym	type_asm_inst,		ac_setint1,	'SETINT1'
	sym	type_asm_inst,		ac_setint2,	'SETINT2'
	sym	type_asm_inst,		ac_setint3,	'SETINT3'

	sym	type_asm_inst,		ac_setq,	'SETQ'
	sym	type_asm_inst,		ac_setq2,	'SETQ2'

	sym	type_asm_inst,		ac_push,	'PUSH'
	sym	type_asm_inst,		ac_pop,		'POP'

	sym	type_asm_inst,		ac_jmprel,	'JMPREL'
	sym	type_asm_inst,		ac_skip,	'SKIP'
	sym	type_asm_inst,		ac_skipf,	'SKIPF'
	sym	type_asm_inst,		ac_execf,	'EXECF'

	sym	type_asm_inst,		ac_getptr,	'GETPTR'
	sym	type_asm_inst,		ac_getbrk,	'GETBRK'
	sym	type_asm_inst,		ac_cogbrk,	'COGBRK'
	sym	type_asm_inst,		ac_brk,		'BRK'

	sym	type_asm_inst,		ac_setluts,	'SETLUTS'

	sym	type_asm_inst,		ac_setcy,	'SETCY'
	sym	type_asm_inst,		ac_setci,	'SETCI'
	sym	type_asm_inst,		ac_setcq,	'SETCQ'
	sym	type_asm_inst,		ac_setcfrq,	'SETCFRQ'
	sym	type_asm_inst,		ac_setcmod,	'SETCMOD'

	sym	type_asm_inst,		ac_setpiv,	'SETPIV'
	sym	type_asm_inst,		ac_setpix,	'SETPIX'

;	sym	type_asm_inst,		ac_cogatn,	'COGATN'	(declared as type_i_flex)

	sym	type_asm_inst,		ac_testp,	'TESTP'
	sym	type_asm_inst,		ac_testpn,	'TESTPN'

	sym	type_asm_inst,		ac_dirl,	'DIRL'
	sym	type_asm_inst,		ac_dirh,	'DIRH'
	sym	type_asm_inst,		ac_dirc,	'DIRC'
	sym	type_asm_inst,		ac_dirnc,	'DIRNC'
	sym	type_asm_inst,		ac_dirz,	'DIRZ'
	sym	type_asm_inst,		ac_dirnz,	'DIRNZ'
	sym	type_asm_inst,		ac_dirrnd,	'DIRRND'
	sym	type_asm_inst,		ac_dirnot,	'DIRNOT'

	sym	type_asm_inst,		ac_outl,	'OUTL'
	sym	type_asm_inst,		ac_outh,	'OUTH'
	sym	type_asm_inst,		ac_outc,	'OUTC'
	sym	type_asm_inst,		ac_outnc,	'OUTNC'
	sym	type_asm_inst,		ac_outz,	'OUTZ'
	sym	type_asm_inst,		ac_outnz,	'OUTNZ'
	sym	type_asm_inst,		ac_outrnd,	'OUTRND'
	sym	type_asm_inst,		ac_outnot,	'OUTNOT'

	sym	type_asm_inst,		ac_fltl,	'FLTL'
	sym	type_asm_inst,		ac_flth,	'FLTH'
	sym	type_asm_inst,		ac_fltc,	'FLTC'
	sym	type_asm_inst,		ac_fltnc,	'FLTNC'
	sym	type_asm_inst,		ac_fltz,	'FLTZ'
	sym	type_asm_inst,		ac_fltnz,	'FLTNZ'
	sym	type_asm_inst,		ac_fltrnd,	'FLTRND'
	sym	type_asm_inst,		ac_fltnot,	'FLTNOT'

	sym	type_asm_inst,		ac_drvl,	'DRVL'
	sym	type_asm_inst,		ac_drvh,	'DRVH'
	sym	type_asm_inst,		ac_drvc,	'DRVC'
	sym	type_asm_inst,		ac_drvnc,	'DRVNC'
	sym	type_asm_inst,		ac_drvz,	'DRVZ'
	sym	type_asm_inst,		ac_drvnz,	'DRVNZ'
	sym	type_asm_inst,		ac_drvrnd,	'DRVRND'
	sym	type_asm_inst,		ac_drvnot,	'DRVNOT'

	sym	type_asm_inst,		ac_splitb,	'SPLITB'
	sym	type_asm_inst,		ac_mergeb,	'MERGEB'
	sym	type_asm_inst,		ac_splitw,	'SPLITW'
	sym	type_asm_inst,		ac_mergew,	'MERGEW'
	sym	type_asm_inst,		ac_seussf,	'SEUSSF'
	sym	type_asm_inst,		ac_seussr,	'SEUSSR'
	sym	type_asm_inst,		ac_rgbsqz,	'RGBSQZ'
	sym	type_asm_inst,		ac_rgbexp,	'RGBEXP'
	sym	type_asm_inst,		ac_xoro32,	'XORO32'
;	sym	type_asm_inst,		ac_rev,		'REV'		(declared as type_op)
	sym	type_asm_inst,		ac_rczr,	'RCZR'
	sym	type_asm_inst,		ac_rczl,	'RCZL'
	sym	type_asm_inst,		ac_wrc,		'WRC'
	sym	type_asm_inst,		ac_wrnc,	'WRNC'
	sym	type_asm_inst,		ac_wrz,		'WRZ'
	sym	type_asm_inst,		ac_wrnz,	'WRNZ'
	sym	type_asm_inst,		ac_modcz,	'MODCZ'
	sym	type_asm_inst,		ac_modc,	'MODC'
	sym	type_asm_inst,		ac_modz,	'MODZ'

	sym	type_asm_inst,		ac_setscp,	'SETSCP'
	sym	type_asm_inst,		ac_getscp,	'GETSCP'

	sym	type_asm_inst,		ac_jmp,		'JMP'
;	sym	type_asm_inst,		ac_call,	'CALL'		(declared as type_i_flex)
	sym	type_asm_inst,		ac_calla,	'CALLA'
	sym	type_asm_inst,		ac_callb,	'CALLB'
	sym	type_asm_inst,		ac_calld,	'CALLD'
	sym	type_asm_inst,		ac_loc,		'LOC'

	sym	type_asm_inst,		ac_augs,	'AUGS'
	sym	type_asm_inst,		ac_augd,	'AUGD'

	sym	type_asm_inst,		ac_pusha,	'PUSHA'		;alias instructions
	sym	type_asm_inst,		ac_pushb,	'PUSHB'
	sym	type_asm_inst,		ac_popa,	'POPA'
	sym	type_asm_inst,		ac_popb,	'POPB'

	sym	type_asm_inst,		ac_ret,		'RET'		;xlat instructions
	sym	type_asm_inst,		ac_reta,	'RETA'
	sym	type_asm_inst,		ac_retb,	'RETB'
	sym	type_asm_inst,		ac_reti0,	'RETI0'
	sym	type_asm_inst,		ac_reti1,	'RETI1'
	sym	type_asm_inst,		ac_reti2,	'RETI2'
	sym	type_asm_inst,		ac_reti3,	'RETI3'
	sym	type_asm_inst,		ac_resi0,	'RESI0'
	sym	type_asm_inst,		ac_resi1,	'RESI1'
	sym	type_asm_inst,		ac_resi2,	'RESI2'
	sym	type_asm_inst,		ac_resi3,	'RESI3'
	sym	type_asm_inst,		ac_xstop,	'XSTOP'

;	sym	type_asm_inst,		ac_akpin,	'AKPIN'		(declared as type_i_flex)

	sym	type_asm_inst,		ac_asmclk,	'ASMCLK'

	sym	type_asm_inst,		ac_nop,		'NOP'


	sym	type_asm_effect,	0010b,		'WC'		;assembly effects
	sym	type_asm_effect,	0001b,		'WZ'
	sym	type_asm_effect,	0011b,		'WCZ'
	sym	type_asm_effect2,	0110b,		'ANDC'
	sym	type_asm_effect2,	0101b,		'ANDZ'
	sym	type_asm_effect2,	1010b,		'ORC'
	sym	type_asm_effect2,	1001b,		'ORZ'
	sym	type_asm_effect2,	1110b,		'XORC'
	sym	type_asm_effect2,	1101b,		'XORZ'


	sym	type_con,		if_never,	'_CLR'		;modcz values
	sym	type_con,		if_nc_and_nz,	'_NC_AND_NZ'
	sym	type_con,		if_nc_and_nz,	'_NZ_AND_NC'
	sym	type_con,		if_nc_and_nz,	'_GT'
	sym	type_con,		if_nc_and_z,	'_NC_AND_Z'
	sym	type_con,		if_nc_and_z,	'_Z_AND_NC'
	sym	type_con,		if_nc,		'_NC'
	sym	type_con,		if_nc,		'_GE'
	sym	type_con,		if_c_and_nz,	'_C_AND_NZ'
	sym	type_con,		if_c_and_nz,	'_NZ_AND_C'
	sym	type_con,		if_nz,		'_NZ'
	sym	type_con,		if_nz,		'_NE'
	sym	type_con,		if_c_ne_z,	'_C_NE_Z'
	sym	type_con,		if_c_ne_z,	'_Z_NE_C'
	sym	type_con,		if_nc_or_nz,	'_NC_OR_NZ'
	sym	type_con,		if_nc_or_nz,	'_NZ_OR_NC'
	sym	type_con,		if_c_and_z,	'_C_AND_Z'
	sym	type_con,		if_c_and_z,	'_Z_AND_C'
	sym	type_con,		if_c_eq_z,	'_C_EQ_Z'
	sym	type_con,		if_c_eq_z,	'_Z_EQ_C'
	sym	type_con,		if_z,		'_Z'
	sym	type_con,		if_z,		'_E'
	sym	type_con,		if_nc_or_z,	'_NC_OR_Z'
	sym	type_con,		if_nc_or_z,	'_Z_OR_NC'
	sym	type_con,		if_c,		'_C'
	sym	type_con,		if_c,		'_LT'
	sym	type_con,		if_c_or_nz,	'_C_OR_NZ'
	sym	type_con,		if_c_or_nz,	'_NZ_OR_C'
	sym	type_con,		if_c_or_z,	'_C_OR_Z'
	sym	type_con,		if_c_or_z,	'_Z_OR_C'
	sym	type_con,		if_c_or_z,	'_LE'
	sym	type_con,		if_always,	'_SET'


	sym	type_reg,		0,		'REG'		;reg

	sym	type_register,		pasm_regs+0,	'PR0'		;pasm regs
	sym	type_register,		pasm_regs+1,	'PR1'
	sym	type_register,		pasm_regs+2,	'PR2'
	sym	type_register,		pasm_regs+3,	'PR3'
	sym	type_register,		pasm_regs+4,	'PR4'
	sym	type_register,		pasm_regs+5,	'PR5'
	sym	type_register,		pasm_regs+6,	'PR6'
	sym	type_register,		pasm_regs+7,	'PR7'

	sym	type_register,		1F0h,		'IJMP3'		;interrupt vectors
	sym	type_register,		1F1h,		'IRET3'
	sym	type_register,		1F2h,		'IJMP2'
	sym	type_register,		1F3h,		'IRET2'
	sym	type_register,		1F4h,		'IJMP1'
	sym	type_register,		1F5h,		'IRET1'
	sym	type_register,		1F6h,		'PA'		;calld/loc targets
	sym	type_register,		1F7h,		'PB'
	sym	type_register,		1F8h,		'PTRA'		;special function registers
	sym	type_register,		1F9h,		'PTRB'
	sym	type_register,		1FAh,		'DIRA'
	sym	type_register,		1FBh,		'DIRB'
	sym	type_register,		1FCh,		'OUTA'
	sym	type_register,		1FDh,		'OUTB'
	sym	type_register,		1FEh,		'INA'
	sym	type_register,		1FFh,		'INB'


	sym	type_hub_long,		00040h,		'CLKMODE'	;spin permanent variables
	sym	type_hub_long,		00044h,		'CLKFREQ'

	sym	type_var_long,		0,		'VARBASE'


	sym	type_con,		0,		'FALSE'		;numeric constants
	sym	type_con,		0FFFFFFFFh,	'TRUE'
	sym	type_con,		80000000h,	'NEGX'
	sym	type_con,		7FFFFFFFh,	'POSX'
	sym	type_con_float,		40490FDBh,	'PI'


	sym	type_con,		000000b,	'COGEXEC'	;coginit constants
	sym	type_con,		100000b,	'HUBEXEC'
	sym	type_con,		010000b,	'COGEXEC_NEW'
	sym	type_con,		110000b,	'HUBEXEC_NEW'
	sym	type_con,		010001b,	'COGEXEC_NEW_PAIR'
	sym	type_con,		110001b,	'HUBEXEC_NEW_PAIR'
	sym	type_con,		010000b,	'NEWCOG'	;cogspin constant


	syml	type_con,		0b,	31,	'P_TRUE_A'	;smart pin constants
	syml	type_con,		1b,	31,	'P_INVERT_A'

	syml	type_con,		000b,	28,	'P_LOCAL_A'
	syml	type_con,		001b,	28,	'P_PLUS1_A'
	syml	type_con,		010b,	28,	'P_PLUS2_A'
	syml	type_con,		011b,	28,	'P_PLUS3_A'
	syml	type_con,		100b,	28,	'P_OUTBIT_A'
	syml	type_con,		101b,	28,	'P_MINUS3_A'
	syml	type_con,		110b,	28,	'P_MINUS2_A'
	syml	type_con,		111b,	28,	'P_MINUS1_A'

	syml	type_con,		0b,	27,	'P_TRUE_B'
	syml	type_con,		1b,	27,	'P_INVERT_B'

	syml	type_con,		000b,	24,	'P_LOCAL_B'
	syml	type_con,		001b,	24,	'P_PLUS1_B'
	syml	type_con,		010b,	24,	'P_PLUS2_B'
	syml	type_con,		011b,	24,	'P_PLUS3_B'
	syml	type_con,		100b,	24,	'P_OUTBIT_B'
	syml	type_con,		101b,	24,	'P_MINUS3_B'
	syml	type_con,		110b,	24,	'P_MINUS2_B'
	syml	type_con,		111b,	24,	'P_MINUS1_B'

	syml	type_con,		000b,	21,	'P_PASS_AB'
	syml	type_con,		001b,	21,	'P_AND_AB'
	syml	type_con,		010b,	21,	'P_OR_AB'
	syml	type_con,		011b,	21,	'P_XOR_AB'
	syml	type_con,		100b,	21,	'P_FILT0_AB'
	syml	type_con,		101b,	21,	'P_FILT1_AB'
	syml	type_con,		110b,	21,	'P_FILT2_AB'
	syml	type_con,		111b,	21,	'P_FILT3_AB'

	syml	type_con,		0000b,	17,	'P_LOGIC_A'
	syml	type_con,		0001b,	17,	'P_LOGIC_A_FB'
	syml	type_con,		0010b,	17,	'P_LOGIC_B_FB'
	syml	type_con,		0011b,	17,	'P_SCHMITT_A'
	syml	type_con,		0100b,	17,	'P_SCHMITT_A_FB'
	syml	type_con,		0101b,	17,	'P_SCHMITT_B_FB'
	syml	type_con,		0110b,	17,	'P_COMPARE_AB'
	syml	type_con,		0111b,	17,	'P_COMPARE_AB_FB'

	syml	type_con,		100000b,15,	'P_ADC_GIO'
	syml	type_con,		100001b,15,	'P_ADC_VIO'
	syml	type_con,		100010b,15,	'P_ADC_FLOAT'
	syml	type_con,		100011b,15,	'P_ADC_1X'
	syml	type_con,		100100b,15,	'P_ADC_3X'
	syml	type_con,		100101b,15,	'P_ADC_10X'
	syml	type_con,		100110b,15,	'P_ADC_30X'
	syml	type_con,		100111b,15,	'P_ADC_100X'

	syml	type_con,		10100b,	16,	'P_DAC_990R_3V'
	syml	type_con,		10101b,	16,	'P_DAC_600R_2V'
	syml	type_con,		10110b,	16,	'P_DAC_124R_3V'
	syml	type_con,		10111b,	16,	'P_DAC_75R_2V'

	syml	type_con,		1100b,	17,	'P_LEVEL_A'
	syml	type_con,		1101b,	17,	'P_LEVEL_A_FBN'
	syml	type_con,		1110b,	17,	'P_LEVEL_B_FBP'
	syml	type_con,		1111b,	17,	'P_LEVEL_B_FBN'

	syml	type_con,		0b,	16,	'P_ASYNC_IO'
	syml	type_con,		1b,	16,	'P_SYNC_IO'

	syml	type_con,		0b,	15,	'P_TRUE_IN'
	syml	type_con,		1b,	15,	'P_INVERT_IN'

	syml	type_con,		0b,	14,	'P_TRUE_OUTPUT'		;TESTT change to P_TRUE_OUT
	syml	type_con,		0b,	14,	'P_TRUE_OUT'
	syml	type_con,		1b,	14,	'P_INVERT_OUTPUT'	;TESTT change P_INVERT_OUT
	syml	type_con,		1b,	14,	'P_INVERT_OUT'

	syml	type_con,		000b,	11,	'P_HIGH_FAST'
	syml	type_con,		001b,	11,	'P_HIGH_1K5'
	syml	type_con,		010b,	11,	'P_HIGH_15K'
	syml	type_con,		011b,	11,	'P_HIGH_150K'
	syml	type_con,		100b,	11,	'P_HIGH_1MA'
	syml	type_con,		101b,	11,	'P_HIGH_100UA'
	syml	type_con,		110b,	11,	'P_HIGH_10UA'
	syml	type_con,		111b,	11,	'P_HIGH_FLOAT'

	syml	type_con,		000b,	8,	'P_LOW_FAST'
	syml	type_con,		001b,	8,	'P_LOW_1K5'
	syml	type_con,		010b,	8,	'P_LOW_15K'
	syml	type_con,		011b,	8,	'P_LOW_150K'
	syml	type_con,		100b,	8,	'P_LOW_1MA'
	syml	type_con,		101b,	8,	'P_LOW_100UA'
	syml	type_con,		110b,	8,	'P_LOW_10UA'
	syml	type_con,		111b,	8,	'P_LOW_FLOAT'

	syml	type_con,		00b,	6,	'P_TT_00'
	syml	type_con,		01b,	6,	'P_TT_01'
	syml	type_con,		10b,	6,	'P_TT_10'
	syml	type_con,		11b,	6,	'P_TT_11'
	syml	type_con,		01b,	6,	'P_OE'
	syml	type_con,		01b,	6,	'P_CHANNEL'
	syml	type_con,		10b,	6,	'P_BITDAC'

	syml	type_con,		00000b,	1,	'P_NORMAL'
	syml	type_con,		00001b,	1,	'P_REPOSITORY'
	syml	type_con,		00001b,	1,	'P_DAC_NOISE'
	syml	type_con,		00010b,	1,	'P_DAC_DITHER_RND'
	syml	type_con,		00011b,	1,	'P_DAC_DITHER_PWM'
	syml	type_con,		00100b,	1,	'P_PULSE'
	syml	type_con,		00101b,	1,	'P_TRANSITION'
	syml	type_con,		00110b,	1,	'P_NCO_FREQ'
	syml	type_con,		00111b,	1,	'P_NCO_DUTY'
	syml	type_con,		01000b,	1,	'P_PWM_TRIANGLE'
	syml	type_con,		01001b,	1,	'P_PWM_SAWTOOTH'
	syml	type_con,		01010b,	1,	'P_PWM_SMPS'
	syml	type_con,		01011b,	1,	'P_QUADRATURE'
	syml	type_con,		01100b,	1,	'P_REG_UP'
	syml	type_con,		01101b,	1,	'P_REG_UP_DOWN'
	syml	type_con,		01110b,	1,	'P_COUNT_RISES'
	syml	type_con,		01111b,	1,	'P_COUNT_HIGHS'
	syml	type_con,		10000b,	1,	'P_STATE_TICKS'
	syml	type_con,		10001b,	1,	'P_HIGH_TICKS'
	syml	type_con,		10010b,	1,	'P_EVENTS_TICKS'
	syml	type_con,		10011b,	1,	'P_PERIODS_TICKS'
	syml	type_con,		10100b,	1,	'P_PERIODS_HIGHS'
	syml	type_con,		10101b,	1,	'P_COUNTER_TICKS'
	syml	type_con,		10110b,	1,	'P_COUNTER_HIGHS'
	syml	type_con,		10111b,	1,	'P_COUNTER_PERIODS'
	syml	type_con,		11000b,	1,	'P_ADC'
	syml	type_con,		11001b,	1,	'P_ADC_EXT'
	syml	type_con,		11010b,	1,	'P_ADC_SCOPE'
	syml	type_con,		11011b,	1,	'P_USB_PAIR'
	syml	type_con,		11100b,	1,	'P_SYNC_TX'
	syml	type_con,		11101b,	1,	'P_SYNC_RX'
	syml	type_con,		11110b,	1,	'P_ASYNC_TX'
	syml	type_con,		11111b,	1,	'P_ASYNC_RX'


	syml	type_con,		0000h,	16,	'X_IMM_32X1_LUT'	;streamer constants
	syml	type_con,		1000h,	16,	'X_IMM_16X2_LUT'
	syml	type_con,		2000h,	16,	'X_IMM_8X4_LUT'
	syml	type_con,		3000h,	16,	'X_IMM_4X8_LUT'

	syml	type_con,		4000h,	16,	'X_IMM_32X1_1DAC1'
	syml	type_con,		5000h,	16,	'X_IMM_16X2_2DAC1'
	syml	type_con,		5002h,	16,	'X_IMM_16X2_1DAC2'
	syml	type_con,		6000h,	16,	'X_IMM_8X4_4DAC1'
	syml	type_con,		6002h,	16,	'X_IMM_8X4_2DAC2'
	syml	type_con,		6004h,	16,	'X_IMM_8X4_1DAC4'
	syml	type_con,		6006h,	16,	'X_IMM_4X8_4DAC2'
	syml	type_con,		6007h,	16,	'X_IMM_4X8_2DAC4'
	syml	type_con,		600Eh,	16,	'X_IMM_4X8_1DAC8'
	syml	type_con,		600Fh,	16,	'X_IMM_2X16_4DAC4'
	syml	type_con,		7000h,	16,	'X_IMM_2X16_2DAC8'
	syml	type_con,		7001h,	16,	'X_IMM_1X32_4DAC8'

	syml	type_con,		7002h,	16,	'X_RFLONG_32X1_LUT'
	syml	type_con,		7004h,	16,	'X_RFLONG_16X2_LUT'
	syml	type_con,		7006h,	16,	'X_RFLONG_8X4_LUT'
	syml	type_con,		7008h,	16,	'X_RFLONG_4X8_LUT'

	syml	type_con,		08000h,	16,	'X_RFBYTE_1P_1DAC1'
	syml	type_con,		09000h,	16,	'X_RFBYTE_2P_2DAC1'
	syml	type_con,		09002h,	16,	'X_RFBYTE_2P_1DAC2'
	syml	type_con,		0A000h,	16,	'X_RFBYTE_4P_4DAC1'
	syml	type_con,		0A002h,	16,	'X_RFBYTE_4P_2DAC2'
	syml	type_con,		0A004h,	16,	'X_RFBYTE_4P_1DAC4'
	syml	type_con,		0A006h,	16,	'X_RFBYTE_8P_4DAC2'
	syml	type_con,		0A007h,	16,	'X_RFBYTE_8P_2DAC4'
	syml	type_con,		0A00Eh,	16,	'X_RFBYTE_8P_1DAC8'
	syml	type_con,		0A00Fh,	16,	'X_RFWORD_16P_4DAC4'
	syml	type_con,		0B000h,	16,	'X_RFWORD_16P_2DAC8'
	syml	type_con,		0B001h,	16,	'X_RFLONG_32P_4DAC8'

	syml	type_con,		0B002h,	16,	'X_RFBYTE_LUMA8'
	syml	type_con,		0B003h,	16,	'X_RFBYTE_RGBI8'
	syml	type_con,		0B004h,	16,	'X_RFBYTE_RGB8'
	syml	type_con,		0B005h,	16,	'X_RFWORD_RGB16'
	syml	type_con,		0B006h,	16,	'X_RFLONG_RGB24'

	syml	type_con,		0C000h,	16,	'X_1P_1DAC1_WFBYTE'
	syml	type_con,		0D000h,	16,	'X_2P_2DAC1_WFBYTE'
	syml	type_con,		0D002h,	16,	'X_2P_1DAC2_WFBYTE'
	syml	type_con,		0E000h,	16,	'X_4P_4DAC1_WFBYTE'
	syml	type_con,		0E002h,	16,	'X_4P_2DAC2_WFBYTE'
	syml	type_con,		0E004h,	16,	'X_4P_1DAC4_WFBYTE'
	syml	type_con,		0E006h,	16,	'X_8P_4DAC2_WFBYTE'
	syml	type_con,		0E007h,	16,	'X_8P_2DAC4_WFBYTE'
	syml	type_con,		0E00Eh,	16,	'X_8P_1DAC8_WFBYTE'
	syml	type_con,		0E00Fh,	16,	'X_16P_4DAC4_WFWORD'
	syml	type_con,		0F000h,	16,	'X_16P_2DAC8_WFWORD'
	syml	type_con,		0F001h,	16,	'X_32P_4DAC8_WFLONG'

	syml	type_con,		0F002h,	16,	'X_1ADC8_0P_1DAC8_WFBYTE'
	syml	type_con,		0F003h,	16,	'X_1ADC8_8P_2DAC8_WFWORD'
	syml	type_con,		0F004h,	16,	'X_2ADC8_0P_2DAC8_WFWORD'
	syml	type_con,		0F005h,	16,	'X_2ADC8_16P_4DAC8_WFLONG'
	syml	type_con,		0F006h,	16,	'X_4ADC8_0P_4DAC8_WFLONG'

	syml	type_con,		0F007h,	16,	'X_DDS_GOERTZEL_SINC1'
	syml	type_con,		0F087h,	16,	'X_DDS_GOERTZEL_SINC2'

	syml	type_con,		0000h,	16,	'X_DACS_OFF'
	syml	type_con,		0100h,	16,	'X_DACS_0_0_0_0'
	syml	type_con,		0200h,	16,	'X_DACS_X_X_0_0'
	syml	type_con,		0300h,	16,	'X_DACS_0_0_X_X'
	syml	type_con,		0400h,	16,	'X_DACS_X_X_X_0'
	syml	type_con,		0500h,	16,	'X_DACS_X_X_0_X'
	syml	type_con,		0600h,	16,	'X_DACS_X_0_X_X'
	syml	type_con,		0700h,	16,	'X_DACS_0_X_X_X'
	syml	type_con,		0800h,	16,	'X_DACS_0N0_0N0'
	syml	type_con,		0900h,	16,	'X_DACS_X_X_0N0'
	syml	type_con,		0A00h,	16,	'X_DACS_0N0_X_X'
	syml	type_con,		0B00h,	16,	'X_DACS_1_0_1_0'
	syml	type_con,		0C00h,	16,	'X_DACS_X_X_1_0'
	syml	type_con,		0D00h,	16,	'X_DACS_1_0_X_X'
	syml	type_con,		0E00h,	16,	'X_DACS_1N1_0N0'
	syml	type_con,		0F00h,	16,	'X_DACS_3_2_1_0'

	syml	type_con,		0000h,	16,	'X_PINS_OFF'
	syml	type_con,		0080h,	16,	'X_PINS_ON'

	syml	type_con,		0000h,	16,	'X_WRITE_OFF'
	syml	type_con,		0080h,	16,	'X_WRITE_ON'

	syml	type_con,		0000h,	16,	'X_ALT_OFF'
	syml	type_con,		0001h,	16,	'X_ALT_ON'


	sym	type_con,		0,		'INT_OFF'		;event/interrupt constants
	sym	type_con,		0,		'EVENT_INT'
	sym	type_con,		1,		'EVENT_CT1'
	sym	type_con,		2,		'EVENT_CT2'
	sym	type_con,		3,		'EVENT_CT3'
	sym	type_con,		4,		'EVENT_SE1'
	sym	type_con,		5,		'EVENT_SE2'
	sym	type_con,		6,		'EVENT_SE3'
	sym	type_con,		7,		'EVENT_SE4'
	sym	type_con,		8,		'EVENT_PAT'
	sym	type_con,		9,		'EVENT_FBW'
	sym	type_con,		10,		'EVENT_XMT'
	sym	type_con,		11,		'EVENT_XFI'
	sym	type_con,		12,		'EVENT_XRO'
	sym	type_con,		13,		'EVENT_XRL'
	sym	type_con,		14,		'EVENT_ATN'
	sym	type_con,		15,		'EVENT_QMT'

	db	0
