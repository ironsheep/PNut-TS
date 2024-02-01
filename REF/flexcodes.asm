;
;
; Flex codes
;
macro		flexcode	symbol,bytecode,params,results,pinfld,hubcode
symbol		=		bytecode + (params shl 8) + (results shl 11) + (pinfld shl 14) + (hubcode shl 15)
		endm

;		flexcode	bytecode	params	results	pinfld	hubcode
;		---------------------------------------------------------------------------------------
flexcode	fc_coginit,	bc_coginit,	3,	0,	0,	0	;(also asm instruction)
flexcode	fc_coginit_push,bc_coginit_push,3,	1,	0,	0
flexcode	fc_cogstop,	bc_cogstop,	1,	0,	0,	0	;(also asm instruction)
flexcode	fc_cogid,	bc_cogid,	0,	1,	0,	0	;(also asm instruction)
flexcode	fc_cogchk,	bc_cogchk,	1,	1,	0,	1

flexcode	fc_getrnd,	bc_getrnd,	0,	1,	0,	0	;(also asm instruction)
flexcode	fc_getct,	bc_getct,	0,	1,	0,	0	;(also asm instruction)
flexcode	fc_pollct,	bc_pollct,	1,	1,	0,	0
flexcode	fc_waitct,	bc_waitct,	1,	0,	0,	0

flexcode	fc_pinwrite,	bc_pinwrite,	2,	0,	1,	0
flexcode	fc_pinlow,	bc_pinlow,	1,	0,	1,	0
flexcode	fc_pinhigh,	bc_pinhigh,	1,	0,	1,	0
flexcode	fc_pintoggle,	bc_pintoggle,	1,	0,	1,	0
flexcode	fc_pinfloat,	bc_pinfloat,	1,	0,	1,	0
flexcode	fc_pinread,	bc_pinread,	1,	1,	1,	0

flexcode	fc_pinstart,	bc_pinstart,	4,	0,	1,	0
flexcode	fc_pinclear,	bc_pinclear,	1,	0,	1,	0

flexcode	fc_wrpin,	bc_wrpin,	2,	0,	1,	0	;(also asm instruction)
flexcode	fc_wxpin,	bc_wxpin,	2,	0,	1,	0	;(also asm instruction)
flexcode	fc_wypin,	bc_wypin,	2,	0,	1,	0	;(also asm instruction)
flexcode	fc_akpin,	bc_akpin,	1,	0,	1,	0	;(also asm instruction)
flexcode	fc_rdpin,	bc_rdpin,	1,	1,	0,	0	;(also asm instruction)
flexcode	fc_rqpin,	bc_rqpin,	1,	1,	0,	0	;(also asm instruction)

flexcode	fc_locknew,	bc_locknew,	0,	1,	0,	0	;(also asm instruction)
flexcode	fc_lockret,	bc_lockret,	1,	0,	0,	0	;(also asm instruction)
flexcode	fc_locktry,	bc_locktry,	1,	1,	0,	0	;(also asm instruction)
flexcode	fc_lockrel,	bc_lockrel,	1,	0,	0,	0	;(also asm instruction)
flexcode	fc_lockchk,	bc_lockchk,	1,	1,	0,	0

flexcode	fc_cogatn,	bc_cogatn,	1,	0,	0,	0	;(also asm instruction)
flexcode	fc_pollatn,	bc_pollatn,	0,	1,	0,	0	;(also asm instruction)
flexcode	fc_waitatn,	bc_waitatn,	0,	0,	0,	0	;(also asm instruction)

flexcode	fc_hubset,	bc_hubset,	1,	0,	0,	1	;(also asm instruction)
flexcode	fc_clkset,	bc_clkset,	2,	0,	0,	1
flexcode	fc_regexec,	bc_regexec,	1,	0,	0,	1
flexcode	fc_regload,	bc_regload,	1,	0,	0,	1
flexcode	fc_call,	bc_call,	1,	0,	0,	1	;(also asm instruction)
flexcode	fc_getregs,	bc_getregs,	3,	0,	0,	1
flexcode	fc_setregs,	bc_setregs,	3,	0,	0,	1

flexcode	fc_bytemove,	bc_bytemove,	3,	0,	0,	1
flexcode	fc_bytefill,	bc_bytefill,	3,	0,	0,	1
flexcode	fc_wordmove,	bc_wordmove,	3,	0,	0,	1
flexcode	fc_wordfill,	bc_wordfill,	3,	0,	0,	1
flexcode	fc_longmove,	bc_longmove,	3,	0,	0,	1
flexcode	fc_longfill,	bc_longfill,	3,	0,	0,	1

flexcode	fc_strsize,	bc_strsize,	1,	1,	0,	1
flexcode	fc_strcomp,	bc_strcomp,	2,	1,	0,	1
flexcode	fc_strcopy,	bc_strcopy,	3,	0,	0,	1

flexcode	fc_getcrc,	bc_getcrc,	3,	1,	0,	1

flexcode	fc_waitus,	bc_waitus,	1,	0,	0,	1
flexcode	fc_waitms,	bc_waitms,	1,	0,	0,	1
flexcode	fc_getms,	bc_getms,	0,	1,	0,	1
flexcode	fc_getsec,	bc_getsec,	0,	1,	0,	1
flexcode	fc_muldiv64,	bc_muldiv64,	3,	1,	0,	1
flexcode	fc_qsin,	bc_qsin,	3,	1,	0,	1
flexcode	fc_qcos,	bc_qcos,	3,	1,	0,	1
flexcode	fc_rotxy,	bc_rotxy,	3,	2,	0,	1
flexcode	fc_polxy,	bc_polxy,	2,	2,	0,	1
flexcode	fc_xypol,	bc_xypol,	2,	2,	0,	1

flexcode	fc_nan,		bc_nan,		1,	1,	0,	1
flexcode	fc_round,	bc_round,	1,	1,	0,	1
flexcode	fc_trunc,	bc_trunc,	1,	1,	0,	1
flexcode	fc_float,	bc_float,	1,	1,	0,	1
