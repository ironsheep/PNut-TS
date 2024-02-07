export enum Operands {
  operand_ds = 0, // 0x00
  operand_bitx = 1, // 0x01
  operand_testb = 2, // 0x02
  operand_du = 3, // 0x03
  operand_duii = 4, // 0x04
  operand_duiz = 5, // 0x05
  operand_ds3set = 6, // 0x06
  operand_ds3get = 7, // 0x07
  operand_ds2set = 8, // 0x08
  operand_ds2get = 9, // 0x09
  operand_ds1set = 10, // 0x0a
  operand_ds1get = 11, // 0x0b
  operand_dsj = 12, // 0x0c
  operand_ls = 13, // 0x0d
  operand_lsj = 14, // 0x0e
  operand_dsp = 15, // 0x0f
  operand_lsp = 16, // 0x10
  operand_rep = 17, // 0x11
  operand_jmp = 18, // 0x12
  operand_call = 19, // 0x13
  operand_calld = 20, // 0x14
  operand_jpoll = 21, // 0x15
  operand_loc = 22, // 0x16
  operand_aug = 23, // 0x17
  operand_d = 24, // 0x18
  operand_de = 25, // 0x19
  operand_l = 26, // 0x1a
  operand_cz = 27, // 0x1b
  operand_pollwait = 28, // 0x1c
  operand_getbrk = 29, // 0x1d
  operand_pinop = 30, // 0x1e
  operand_testp = 31, // 0x1f
  operand_pushpop = 32, // 0x20
  operand_xlat = 33, // 0x21
  operand_akpin = 34, // 0x22
  operand_asmclk = 35, // 0x23
  operand_nop = 36, // 0x24
  operand_debug = 37, // 0x25
  pp_pusha = 0, // 0x00 PUSHA	D/#	-->	WRLONG	D/#,PTRA++
  pp_pushb = 1, // 0x01 PUSHB	D/#	-->	WRLONG	D/#,PTRB++
  pp_popa = 2, // 0x02 POPA	D	-->	RDLONG	D,--PTRA
  pp_popb = 3, // 0x03 POPB	D	-->	RDLONG	D,--PTRB
  type_undefined = 0, // 0x00 (undefined symbol, must be 0)
  type_left = 1, // 0x01 (
  type_right = 2, // 0x02 )
  type_leftb = 3, // 0x03 [
  type_rightb = 4, // 0x04 ]
  type_comma = 5, // 0x05 ,
  type_equal = 6, // 0x06 =
  type_pound = 7, // 0x07 #
  type_colon = 8, // 0x08 :
  type_back = 9, // 0x09 \
  type_under = 10, // 0x0a _
  type_tick = 11, // 0x0b `
  type_dollar = 12, // 0x0c $ (without a hex digit following)
  type_percent = 13, // 0x0d % (without a bin digit following)
  type_dot = 14, // 0x0e .
  type_dotdot = 15, // 0x0f ..
  type_at = 16, // 0x10 @
  type_atat = 17, // 0x11 @@
  type_upat = 18, // 0x12 ^@
  type_til = 19, // 0x13 ~
  type_tiltil = 20, // 0x14 ~~
  type_inc = 21, // 0x15 ++
  type_dec = 22, // 0x16 --
  type_rnd = 23, // 0x17 ??
  type_assign = 24, // 0x18 :=
  type_op = 25, // 0x19 !, -, ABS, ENC, etc.
  type_float = 26, // 0x1a FLOAT
  type_round = 27, // 0x1b ROUND
  type_trunc = 28, // 0x1c TRUNC
  type_constr = 29, // 0x1d STRING
  type_conlstr = 30, // 0x1e LSTRING
  type_block = 31, // 0x1f CON, VAR, DAT, OBJ, PUB, PRI
  type_field = 32, // 0x20 FIELD
  type_size = 33, // 0x21 BYTE, WORD, LONG
  type_size_fit = 34, // 0x22 BYTEFIT, WORDFIT
  type_fvar = 35, // 0x23 FVAR, FVARS
  type_file = 36, // 0x24 FILE
  type_if = 37, // 0x25 IF
  type_ifnot = 38, // 0x26 IFNOT
  type_elseif = 39, // 0x27 ELSEIF
  type_elseifnot = 40, // 0x28 ELSEIFNOT
  type_else = 41, // 0x29 ELSE
  type_case = 42, // 0x2a CASE
  type_case_fast = 43, // 0x2b CASE_FAST
  type_other = 44, // 0x2c OTHER
  type_repeat = 45, // 0x2d REPEAT
  type_repeat_var = 46, // 0x2e REPEAT var		- different QUIT method
  type_repeat_count = 47, // 0x2f REPEAT count		- different QUIT method
  type_repeat_count_var = 48, // 0x30 REPEAT count WITH var	- different QUIT method
  type_while = 49, // 0x31 WHILE
  type_until = 50, // 0x32 UNTIL
  type_from = 51, // 0x33 FROM
  type_to = 52, // 0x34 TO
  type_step = 53, // 0x35 STEP
  type_with = 54, // 0x36 WITH
  type_i_next_quit = 55, // 0x37 NEXT/QUIT
  type_i_return = 56, // 0x38 RETURN
  type_i_abort = 57, // 0x39 ABORT
  type_i_look = 58, // 0x3a LOOKUPZ/LOOKUP/LOOKDOWNZ/LOOKDOWN
  type_i_cogspin = 59, // 0x3b COGSPIN
  type_i_flex = 60, // 0x3c HUBSET, COGINIT, COGSTOP...
  type_recv = 61, // 0x3d RECV
  type_send = 62, // 0x3e SEND
  type_debug = 63, // 0x3f DEBUG
  type_debug_cmd = 64, // 0x40 DEBUG commands
  type_asm_end = 65, // 0x41 END
  type_asm_dir = 66, // 0x42 ORGH, ORG, ORGF, RES, FIT
  type_asm_cond = 67, // 0x43 IF_C, IF_Z, IF_NC, etc
  type_asm_inst = 68, // 0x44 RDBYTE, RDWORD, RDLONG, etc.
  type_asm_effect = 69, // 0x45 WC, WZ, WCZ
  type_asm_effect2 = 70, // 0x46 ANDC, ANDZ, ORC, ORZ, XORC, XORZ
  type_reg = 71, // 0x47 REG
  type_con = 72, // 0x48 user constant integer (must be followed by type_con_float)
  type_con_float = 73, // 0x49 user constant float
  type_register = 74, // 0x4a user long register
  type_loc_byte = 75, // 0x4b user byte local
  type_loc_word = 76, // 0x4c user word local
  type_loc_long = 77, // 0x4d user long local
  type_var_byte = 78, // 0x4e V0	user byte var
  type_var_word = 79, // 0x4f V1	user word var
  type_var_long = 80, // 0x50 V2	user long var
  type_dat_byte = 81, // 0x51 D0	user byte dat
  type_dat_word = 82, // 0x52 D1	user word dat (must follow type_dat_byte)
  type_dat_long = 83, // 0x53 D2	user long dat (must follow type_dat_word)
  type_dat_long_res = 84, // 0x54 (D2)	user res dat (must follow type_dat_long)
  type_hub_byte = 85, // 0x55 H0	user byte hub
  type_hub_word = 86, // 0x56 H1	user word hub
  type_hub_long = 87, // 0x57 H2	user long hub
  type_obj = 88, // 0x58 user object
  type_objpub = 89, // 0x59 user object.subroutine
  type_objcon = 90, // 0x5a user object.constant (must be followed by type_objcon_float)
  type_objcon_float = 91, // 0x5b user object.constant float
  type_method = 92, // 0x5c user method
  type_end = 93, // 0x5d end-of-line c=0, end-of-file c=1
  op_bitnot = 0, // 0x00 !		unary		0	-
  op_neg = 1, // 0x01 -		unary		0	yes
  op_fneg = 2, // 0x02 -.		unary		0	-
  op_abs = 3, // 0x03 ABS		unary		0	yes
  op_fabs = 4, // 0x04 FABS		unary		0	-
  op_encod = 5, // 0x05 ENCOD		unary		0	-
  op_decod = 6, // 0x06 DECOD		unary		0	-
  op_bmask = 7, // 0x07 BMASK		unary		0	-
  op_ones = 8, // 0x08 ONES		unary		0	-
  op_sqrt = 9, // 0x09 SQRT		unary		0	-
  op_fsqrt = 10, // 0x0a FSQRT		unary		0	-
  op_qlog = 11, // 0x0b QLOG		unary		0	-
  op_qexp = 12, // 0x0c QEXP		unary		0	-
  op_shr = 13, // 0x0d >>		binary		1	-
  op_shl = 14, // 0x0e <<		binary		1	-
  op_sar = 15, // 0x0f SAR		binary		1	-
  op_ror = 16, // 0x10 ROR		binary		1	-
  op_rol = 17, // 0x11 ROL		binary		1	-
  op_rev = 18, // 0x12 REV		binary		1	-
  op_zerox = 19, // 0x13 ZEROX		binary		1	-
  op_signx = 20, // 0x14 SIGNX		binary		1	-
  op_bitand = 21, // 0x15 &		binary		2	-
  op_bitxor = 22, // 0x16 ^		binary		3	-
  op_bitor = 23, // 0x17 |		binary		4	-
  op_mul = 24, // 0x18 *		binary		5	yes
  op_fmul = 25, // 0x19 *.		binary		5	-
  op_div = 26, // 0x1a /		binary		5	yes
  op_fdiv = 27, // 0x1b /.		binary		5	-
  op_divu = 28, // 0x1c +/		binary		5	-
  op_rem = 29, // 0x1d //		binary		5	-
  op_remu = 30, // 0x1e +//		binary		5	-
  op_sca = 31, // 0x1f SCA		binary		5	-
  op_scas = 32, // 0x20 SCAS		binary		5	-
  op_frac = 33, // 0x21 FRAC		binary		5	-
  op_add = 34, // 0x22 +		binary		6	yes
  op_fadd = 35, // 0x23 +.		binary		6	-
  op_sub = 36, // 0x24 -		binary		6	yes
  op_fsub = 37, // 0x25 -.		binary		6	-
  op_fge = 38, // 0x26 #>		binary		7	yes
  op_fle = 39, // 0x27 <#		binary		7	yes
  op_addbits = 40, // 0x28 ADDBITS		binary		8	-
  op_addpins = 41, // 0x29 ADDPINS		binary		8	-
  op_lt = 42, // 0x2a <		binary		9	yes
  op_flt = 43, // 0x2b <.		binary		9	-
  op_ltu = 44, // 0x2c +<		binary		9	-
  op_lte = 45, // 0x2d <=		binary		9	yes
  op_flte = 46, // 0x2e <=.		binary		9	-
  op_lteu = 47, // 0x2f +<=		binary		9	-
  op_e = 48, // 0x30 ==		binary		9	yes
  op_fe = 49, // 0x31 ==.		binary		9	-
  op_ne = 50, // 0x32 <>		binary		9	yes
  op_fne = 51, // 0x33 <>.		binary		9	-
  op_gte = 52, // 0x34 >=		binary		9	yes
  op_fgte = 53, // 0x35 >=.		binary		9	-
  op_gteu = 54, // 0x36 +>=		binary		9	-
  op_gt = 55, // 0x37 >		binary		9	yes
  op_fgt = 56, // 0x38 >.		binary		9	-
  op_gtu = 57, // 0x39 +>		binary		9	-
  op_ltegt = 58, // 0x3a <=>		binary		9	yes
  op_lognot = 59, // 0x3b !!, NOT		unary		10	-
  op_logand = 60, // 0x3c &&, AND		binary		11	-
  op_logxor = 61, // 0x3d ^^, XOR		binary		12	-
  op_logor = 62, // 0x3e ||, OR		binary		13	-
  op_ternary = 63, // 0x3f ? (:)		ternary		14	-
  block_con = 0, // 0x00
  block_obj = 1, // 0x01
  block_var = 2, // 0x02
  block_pub = 3, // 0x03
  block_pri = 4, // 0x04
  block_dat = 5, // 0x05
  dir_orgh = 0, // 0x00
  dir_alignw = 1, // 0x01
  dir_alignl = 2, // 0x02
  dir_org = 3, // 0x03
  dir_orgf = 4, // 0x04
  dir_res = 5, // 0x05
  dir_fit = 6, // 0x06
  if_never = 0, // 0x00
  if_nc_and_nz = 1, // 0x01
  if_nc_and_z = 2, // 0x02
  if_nc = 3, // 0x03
  if_c_and_nz = 4, // 0x04
  if_nz = 5, // 0x05
  if_c_ne_z = 6, // 0x06
  if_nc_or_nz = 7, // 0x07
  if_c_and_z = 8, // 0x08
  if_c_eq_z = 9, // 0x09
  if_z = 10, // 0x0a
  if_nc_or_z = 11, // 0x0b
  if_c = 12, // 0x0c
  if_c_or_nz = 13, // 0x0d
  if_c_or_z = 14, // 0x0e
  if_always = 15, // 0x0f
  info_con = 0, // 0x00 data0 = value (must be followed by info_con_float)
  info_con_float = 1, // 0x01 data0 = value
  info_dat = 2, // 0x02 data0/1 = obj start/finish
  info_dat_symbol = 3, // 0x03 data0 = offset, data1 = size
  info_pub = 4, // 0x04 data0/1 = obj start/finish, data2/3 = name start/finish
  info_pri = 5, // 0x05 data0/1 = obj start/finish, data2/3 = name start/finish
  dc_end = 0, // 0x00 lower DEBUG commands
  dc_asm = 1, // 0x01
  dc_if = 2, // 0x02
  dc_ifnot = 3, // 0x03
  dc_cogn = 4, // 0x04
  dc_chr = 5, // 0x05
  dc_str = 6, // 0x06
  dc_dly = 7, // 0x07
  dc_pc_key = 8, // 0x08
  dc_pc_mouse = 9 // 0x09
}