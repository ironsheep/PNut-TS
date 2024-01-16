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
  type_end //	end-of-line c=0, end-of-file c=1
}

export enum eValueType {
  value_undefined, // no value determined
  block_con, // CON Block
  block_obj, // OBJ Block
  block_var, // VAR Block
  block_pub, // PUB Block
  block_pri, // PRI Block
  block_dat // DAT Block
}
