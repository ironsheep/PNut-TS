// various type definitions

// src/classes/types.ts

'use strict';

export enum eElementType {
  type_undefined, //	(undefined symbol, must be 0)
  type_left, //	(
  type_right, //	)
  type_leftb, //	[
  type_rightb, //	]
  type_comma, //	,
  type_equal, //	=
  type_pound, //	#
  type_colon, //	:
  type_back, //	\
  type_under, //	_
  type_tick, //	`
  type_dollar, //	$ (without a hex digit following)
  type_percent, //	% (without a bin digit following)
  type_dot, //	.
  type_dotdot, //	..
  type_at, //	@
  type_atat, //	@@
  type_upat, //	^@
  type_til, //	~
  type_tiltil, //	~~
  type_inc, //	++
  type_dec, //	--
  type_rnd, //	??
  type_assign, //	:=
  type_op, //	!, -, ABS, ENC, etc.
  type_float, //	FLOAT
  type_round, //	ROUND
  type_trunc, //	TRUNC
  type_constr, //	STRING
  type_conlstr, //	LSTRING
  type_block, //	CON, VAR, DAT, OBJ, PUB, PRI
  type_field, //	FIELD
  type_size, //	BYTE, WORD, LONG
  type_size_fit, //	BYTEFIT, WORDFIT
  type_fvar, //	FVAR, FVARS
  type_file, //	FILE
  type_if, //	IF
  type_ifnot, //	IFNOT
  type_elseif, //	ELSEIF
  type_elseifnot, //	ELSEIFNOT
  type_else, //	ELSE
  type_case, //	CASE
  type_case_fast, //	CASE_FAST
  type_other, //	OTHER
  type_repeat, //	REPEAT
  type_repeat_var, //	REPEAT var		- different QUIT method
  type_repeat_, //	REPEAT 		- different QUIT method
  type_repeat__var, //	REPEAT  WITH var	- different QUIT method
  type_while, //	WHILE
  type_until, //	UNTIL
  type_from, //	FROM
  type_to, //	TO
  type_step, //	STEP
  type_with, //	WITH
  type_i_next_quit, //	NEXT/QUIT
  type_i_return, //	RETURN
  type_i_abort, //	ABORT
  type_i_look, //	LOOKUPZ/LOOKUP/LOOKDOWNZ/LOOKDOWN
  type_i_cogspin, //	COGSPIN
  type_i_flex, //	HUBSET, COGINIT, COGSTOP...
  type_recv, //	RECV
  type_send, //	SEND
  type_debug, //	DEBUG
  type_debug_cmd, //	DEBUG commands
  type_asm_end, //	END
  type_asm_dir, //	ORGH, ORG, ORGF, RES, FIT
  type_asm_cond, //	IF_C, IF_Z, IF_NC, etc
  type_asm_inst, //	RDBYTE, RDWORD, RDLONG, etc.
  type_asm_effect, //	WC, WZ, WCZ
  type_asm_effect2, //	ANDC, ANDZ, ORC, ORZ, XORC, XORZ
  type_reg, //	REG
  type_con, //	user constant integer (must be followed by type_con_float)
  type_con_float, //	user constant float
  type_register, //	user long register
  type_loc_byte, //	user byte local
  type_loc_word, //	user word local
  type_loc_long, //	user long local
  type_var_byte, //V0	user byte var
  type_var_word, //V1	user word var
  type_var_long, //V2	user long var
  type_dat_byte, //D0	user byte dat
  type_dat_word, //D1	user word dat (must follow type_dat_byte)
  type_dat_long, //D2	user long dat (must follow type_dat_word)
  type_dat_long_res, //(D2)	user res dat (must follow type_dat_long)
  type_hub_byte, //H0	user byte hub
  type_hub_word, //H1	user word hub
  type_hub_long, //H2	user long hub
  type_obj, //	user object
  type_objpub, //	user object.subroutine
  type_objcon, //	user object.constant (must be followed by type_objcon_float)
  type_objcon_float, //	user object.constant float
  type_method, //	user method
  type_error_abort, // NEW we found an error, abort processing
  type_end_line, //	end-of-line c=0
  type_end //	end-of-file c=1
}

export enum eValueType {
  value_undefined, // no value determined
  block_con, // CON Block
  block_obj, // OBJ Block
  block_var, // VAR Block
  block_pub, // PUB Block
  block_pri, // PRI Block
  block_dat, // DAT Block
  dir_orgh,
  dir_alignw,
  dir_alignl,
  dir_org,
  dir_orgf,
  dir_res,
  dir_fit,
  op_bitnot, //	!		unary		0	-
  op_neg, //	-		unary		0	yes
  op_fneg, //	-.		unary		0	-
  op_abs, //	ABS		unary		0	yes
  op_fabs, //	FABS		unary		0	-
  op_encod, //	ENCOD		unary		0	-
  op_decod, //	DECOD		unary		0	-
  op_bmask, //	BMASK		unary		0	-
  op_ones, //	ONES		unary		0	-
  op_sqrt, //	SQRT		unary		0	-
  op_fsqrt, //	FSQRT		unary		0	-
  op_qlog, //	QLOG		unary		0	-
  op_qexp, //	QEXP		unary		0	-
  op_shr, //	>>		binary		1	-
  op_shl, //	<<		binary		1	-
  op_sar, //	SAR		binary		1	-
  op_ror, //	ROR		binary		1	-
  op_rol, //	ROL		binary		1	-
  op_rev, //	REV		binary		1	-
  op_zerox, //	ZEROX		binary		1	-
  op_signx, //	SIGNX		binary		1	-
  op_bitand, //	&		binary		2	-
  op_bitxor, //	^		binary		3	-
  op_bitor, //	|		binary		4	-
  op_mul, //	*		binary		5	yes
  op_fmul, //	*.		binary		5	-
  op_div, //	/		binary		5	yes
  op_fdiv, //	/.		binary		5	-
  op_divu, //	+/		binary		5	-
  op_rem, //	//		binary		5	-
  op_remu, //	+//		binary		5	-
  op_sca, //	SCA		binary		5	-
  op_scas, //	SCAS		binary		5	-
  op_frac, //	FRAC		binary		5	-
  op_add, //	+		binary		6	yes
  op_fadd, //	+.		binary		6	-
  op_sub, //	-		binary		6	yes
  op_fsub, //	-.		binary		6	-
  op_fge, //	#>		binary		7	yes
  op_fle, //	<#		binary		7	yes
  op_addbits, //	ADDBITS		binary		8	-
  op_addpins, //	ADDPINS		binary		8	-
  op_lt, //	<		binary		9	yes
  op_flt, //	<.		binary		9	-
  op_ltu, //	+<		binary		9	-
  op_lte, //	<=		binary		9	yes
  op_flte, //	<=.		binary		9	-
  op_lteu, //	+<=		binary		9	-
  op_e, //	==		binary		9	yes
  op_fe, //	==.		binary		9	-
  op_ne, //	<>		binary		9	yes
  op_fne, //	<>.		binary		9	-
  op_gte, //	>=		binary		9	yes
  op_fgte, //	>=.		binary		9	-
  op_gteu, //	+>=		binary		9	-
  op_gt, //	>		binary		9	yes
  op_fgt, //	>.		binary		9	-
  op_gtu, //	+>		binary		9	-
  op_ltegt, //	<=>		binary		9	yes
  op_lognot, //	!!, NOT		unary		10	-
  op_logand, //	&&, AND		binary		11	-
  op_logxor, //	^^, XOR		binary		12	-
  op_logor, //	||, OR		binary		13	-
  op_ternary //	? (:)		ternary		14	-
}
