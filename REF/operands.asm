;
; Macro for assigning ascending values
;
macro		count0	count_name
count_name	=	0
counter		=	1
		endm

macro		countn	count_name,n
count_name	=	n
counter		=	n+1
		endm

macro		count	count_name
count_name	=	counter
counter		=	counter+1
		endm

macro		counti	count_name,n
count_name	=	counter
counter		=	counter+n
		endm

macro		count2n	count_name,n
count_name	=	n
counter		=	n+2
		endm

macro		count2	count_name
count_name	=	counter
counter		=	counter+2
		endm
;
;
; Assembly operands
;
count0		operand_ds
count		operand_bitx
count		operand_testb
count		operand_du
count		operand_duii
count		operand_duiz
count		operand_ds3set
count		operand_ds3get
count		operand_ds2set
count		operand_ds2get
count		operand_ds1set
count		operand_ds1get
count		operand_dsj
count		operand_ls
count		operand_lsj
count		operand_dsp
count		operand_lsp
count		operand_rep
count		operand_jmp
count		operand_call
count		operand_calld
count		operand_jpoll
count		operand_loc
count		operand_aug
count		operand_d
count		operand_de
count		operand_l
count		operand_cz
count		operand_pollwait
count		operand_getbrk
count		operand_pinop
count		operand_testp
count		operand_pushpop
count		operand_xlat
count		operand_akpin
count		operand_asmclk
count		operand_nop
count		operand_debug
;
;
; Assembly push/pops
;
count0		pp_pusha	;	PUSHA	D/#	-->	WRLONG	D/#,PTRA++
count		pp_pushb	;	PUSHB	D/#	-->	WRLONG	D/#,PTRB++
count		pp_popa		;	POPA	D	-->	RDLONG	D,--PTRA
count		pp_popb		;	POPB	D	-->	RDLONG	D,--PTRB

;
; Types
;
count0		type_undefined		;	(undefined symbol, must be 0)
count		type_left		;	(
count		type_right		;	)
count		type_leftb		;	[
count		type_rightb		;	]
count		type_comma		;	,
count		type_equal		;	=
count		type_pound		;	#
count		type_colon		;	:
count		type_back		;	\
count		type_under		;	_
count		type_tick		;	`
count		type_dollar		;	$ (without a hex digit following)
count		type_percent		;	% (without a bin digit following)
count		type_dot		;	.
count		type_dotdot		;	..
count		type_at			;	@
count		type_atat		;	@@
count		type_upat		;	^@
count		type_til		;	~
count		type_tiltil		;	~~
count		type_inc		;	++
count		type_dec		;	--
count		type_rnd		;	??
count		type_assign		;	:=
count		type_op			;	!, -, ABS, ENC, etc.
count		type_float		;	FLOAT
count		type_round		;	ROUND
count		type_trunc		;	TRUNC
count		type_constr		;	STRING
count		type_conlstr		;	LSTRING
count		type_block		;	CON, VAR, DAT, OBJ, PUB, PRI
count		type_field		;	FIELD
count		type_size		;	BYTE, WORD, LONG
count		type_size_fit		;	BYTEFIT, WORDFIT
count		type_fvar		;	FVAR, FVARS
count		type_file		;	FILE
count		type_if			;	IF
count		type_ifnot		;	IFNOT
count		type_elseif		;	ELSEIF
count		type_elseifnot		;	ELSEIFNOT
count		type_else		;	ELSE
count		type_case		;	CASE
count		type_case_fast		;	CASE_FAST
count		type_other		;	OTHER
count		type_repeat		;	REPEAT
count		type_repeat_var		;	REPEAT var		- different QUIT method
count		type_repeat_count	;	REPEAT count		- different QUIT method
count		type_repeat_count_var	;	REPEAT count WITH var	- different QUIT method
count		type_while		;	WHILE
count		type_until		;	UNTIL
count		type_from		;	FROM
count		type_to			;	TO
count		type_step		;	STEP
count		type_with		;	WITH
count		type_i_next_quit	;	NEXT/QUIT
count		type_i_return		;	RETURN
count		type_i_abort		;	ABORT
count		type_i_look		;	LOOKUPZ/LOOKUP/LOOKDOWNZ/LOOKDOWN
count		type_i_cogspin		;	COGSPIN
count		type_i_flex		;	HUBSET, COGINIT, COGSTOP...
count		type_recv		;	RECV
count		type_send		;	SEND
count		type_debug		;	DEBUG
count		type_debug_cmd		;	DEBUG commands
count		type_asm_end		;	END
count		type_asm_dir		;	ORGH, ORG, ORGF, RES, FIT
count		type_asm_cond		;	IF_C, IF_Z, IF_NC, etc
count		type_asm_inst		;	RDBYTE, RDWORD, RDLONG, etc.
count		type_asm_effect		;	WC, WZ, WCZ
count		type_asm_effect2	;	ANDC, ANDZ, ORC, ORZ, XORC, XORZ
count		type_reg		;	REG
count		type_con		;	user constant integer (must be followed by type_con_float)
count		type_con_float		;	user constant float
count		type_register		;	user long register
count		type_loc_byte		;	user byte local
count		type_loc_word		;	user word local
count		type_loc_long		;	user long local
count		type_var_byte		;V0	user byte var
count		type_var_word		;V1	user word var
count		type_var_long		;V2	user long var
count		type_dat_byte		;D0	user byte dat
count		type_dat_word		;D1	user word dat (must follow type_dat_byte)
count		type_dat_long		;D2	user long dat (must follow type_dat_word)
count		type_dat_long_res	;(D2)	user res dat (must follow type_dat_long)
count		type_hub_byte		;H0	user byte hub
count		type_hub_word		;H1	user word hub
count		type_hub_long		;H2	user long hub
count		type_obj		;	user object
count		type_objpub		;	user object.subroutine
count		type_objcon		;	user object.constant (must be followed by type_objcon_float)
count		type_objcon_float	;	user object.constant float
count		type_method		;	user method
count		type_end		;	end-of-line c=0, end-of-file c=1

;
; Operators
;
;	Operator precedence (highest to lowest)
;
;	0	!, -, ABS, FABS, ENCOD, DECOD, BMASK, ONES, SQRT, FSQRT, QLOG, QEXP	(unary)
;	1	>>, <<, SAR, ROR, ROL, REV, ZEROX, SIGNX				(binary)
;	2	&									(binary)
;	3	^									(binary)
;	4	|									(binary)
;	5	*, *., /, /., +/, //, +//, SCA, SCAS, FRAC				(binary)
;	6	+, +., -, -.								(binary)
;	7	#>, <#									(binary)
;	8	ADDBITS, ADDPINS							(binary)
;	9	<, <., +<, <=, <=., +<=, ==, ==., <>, <>., >=, >=., +>=, >, >., +>, <=>	(binary)
;	10	!!, NOT									(unary)
;	11	&&, AND									(binary)
;	12	^^, XOR									(binary)
;	13	||, OR									(binary)
;	14	? :									(ternary)
;
;
;					oper		type		prec	float
;
count0		op_bitnot	;	!		unary		0	-
count		op_neg		;	-		unary		0	yes
count		op_fneg		;	-.		unary		0	-
count		op_abs		;	ABS		unary		0	yes
count		op_fabs		;	FABS		unary		0	-
count		op_encod	;	ENCOD		unary		0	-
count		op_decod	;	DECOD		unary		0	-
count		op_bmask	;	BMASK		unary		0	-
count		op_ones		;	ONES		unary		0	-
count		op_sqrt		;	SQRT		unary		0	-
count		op_fsqrt	;	FSQRT		unary		0	-
count		op_qlog		;	QLOG		unary		0	-
count		op_qexp		;	QEXP		unary		0	-
count		op_shr		;	>>		binary		1	-
count		op_shl		;	<<		binary		1	-
count		op_sar		;	SAR		binary		1	-
count		op_ror		;	ROR		binary		1	-
count		op_rol		;	ROL		binary		1	-
count		op_rev		;	REV		binary		1	-
count		op_zerox	;	ZEROX		binary		1	-
count		op_signx	;	SIGNX		binary		1	-
count		op_bitand	;	&		binary		2	-
count		op_bitxor	;	^		binary		3	-
count		op_bitor	;	|		binary		4	-
count		op_mul		;	*		binary		5	yes
count		op_fmul		;	*.		binary		5	-
count		op_div		;	/		binary		5	yes
count		op_fdiv		;	/.		binary		5	-
count		op_divu		;	+/		binary		5	-
count		op_rem		;	//		binary		5	-
count		op_remu		;	+//		binary		5	-
count		op_sca		;	SCA		binary		5	-
count		op_scas		;	SCAS		binary		5	-
count		op_frac		;	FRAC		binary		5	-
count		op_add		;	+		binary		6	yes
count		op_fadd		;	+.		binary		6	-
count		op_sub		;	-		binary		6	yes
count		op_fsub		;	-.		binary		6	-
count		op_fge		;	#>		binary		7	yes
count		op_fle		;	<#		binary		7	yes
count		op_addbits	;	ADDBITS		binary		8	-
count		op_addpins	;	ADDPINS		binary		8	-
count		op_lt		;	<		binary		9	yes
count		op_flt		;	<.		binary		9	-
count		op_ltu		;	+<		binary		9	-
count		op_lte		;	<=		binary		9	yes
count		op_flte		;	<=.		binary		9	-
count		op_lteu		;	+<=		binary		9	-
count		op_e		;	==		binary		9	yes
count		op_fe		;	==.		binary		9	-
count		op_ne		;	<>		binary		9	yes
count		op_fne		;	<>.		binary		9	-
count		op_gte		;	>=		binary		9	yes
count		op_fgte		;	>=.		binary		9	-
count		op_gteu		;	+>=		binary		9	-
count		op_gt		;	>		binary		9	yes
count		op_fgt		;	>.		binary		9	-
count		op_gtu		;	+>		binary		9	-
count		op_ltegt	;	<=>		binary		9	yes
count		op_lognot	;	!!, NOT		unary		10	-
count		op_logand	;	&&, AND		binary		11	-
count		op_logxor	;	^^, XOR		binary		12	-
count		op_logor	;	||, OR		binary		13	-
count		op_ternary	;	? (:)		ternary		14	-

;
; Blocks
;
count0		block_con
count		block_obj
count		block_var
count		block_pub
count		block_pri
count		block_dat
;
;
; Directives
;
count0		dir_orgh
count		dir_alignw
count		dir_alignl
count		dir_org
count		dir_orgf
count		dir_res
count		dir_fit
;
;
; Ifs
;
count0		if_never
count		if_nc_and_nz
count		if_nc_and_z
count		if_nc
count		if_c_and_nz
count		if_nz
count		if_c_ne_z
count		if_nc_or_nz
count		if_c_and_z
count		if_c_eq_z
count		if_z
count		if_nc_or_z
count		if_c
count		if_c_or_nz
count		if_c_or_z
count		if_always
;
;
; Info types
;
count0		info_con			;data0 = value (must be followed by info_con_float)
count		info_con_float			;data0 = value
count		info_dat			;data0/1 = obj start/finish
count		info_dat_symbol			;data0 = offset, data1 = size
count		info_pub			;data0/1 = obj start/finish, data2/3 = name start/finish
count		info_pri			;data0/1 = obj start/finish, data2/3 = name start/finish
;
;
;
count0		dc_end		;lower DEBUG commands
count		dc_asm
count		dc_if
count		dc_ifnot
count		dc_cogn
count		dc_chr
count		dc_str
count		dc_dly
count		dc_pc_key
count		dc_pc_mouse
