/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
// various type definitions

// src/classes/types.ts

'use strict';

export enum eElementType {
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
  type_end_file = 94 //	0x5e end-of-file c=1
}

export function getElementTypeString(value: eElementType): string {
  return eElementType[value];
}

export enum eOperationType {
  //
  //
  // Operators
  //
  //	Operator precedence (highest to lowest)
  //
  //	0	!, -, ABS, FABS, ENCOD, DECOD, BMASK, ONES, SQRT, FSQRT, QLOG, QEXP	(unary)
  //	1	>>, <<, SAR, ROR, ROL, REV, ZEROX, SIGNX				(binary)
  //	2	&									(binary)
  //	3	^									(binary)
  //	4	|									(binary)
  //	5	*, *., /, /., +/, //, +//, SCA, SCAS, FRAC				(binary)
  //	6	+, +., -, -.								(binary)
  //	7	#>, <#									(binary)
  //	8	ADDBITS, ADDPINS							(binary)
  //	9	<, <., +<, <=, <=., +<=, ==, ==., <>, <>., >=, >=., +>=, >, >., +>, <=>	(binary)
  //	10	!!, NOT									(unary)
  //	11	&&, AND									(binary)
  //	12	^^, XOR									(binary)
  //	13	||, OR									(binary)
  //	14	? :									(ternary)
  //
  //
  //					oper		type		prec	float
  //
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
  op_ternary = 63 // 0x3f ? (:)		ternary		14	-
}

export enum eBlockType {
  //
  // Blocks
  //
  block_con = 0, // 0x00
  block_obj = 1, // 0x01
  block_var = 2, // 0x02
  block_pub = 3, // 0x03
  block_pri = 4, // 0x04
  block_dat = 5 // 0x05
}

export enum eValueType {
  value_undefined = 0, // no value determined
  //
  // Blocks
  //
  block_con = 0, // 0x00
  block_obj = 1, // 0x01
  block_var = 2, // 0x02
  block_pub = 3, // 0x03
  block_pri = 4, // 0x04
  block_dat = 5, // 0x05
  //
  // Directives
  //
  dir_orgh = 0, // 0x00
  dir_alignw = 1, // 0x01
  dir_alignl = 2, // 0x02
  dir_org = 3, // 0x03
  dir_orgf = 4, // 0x04
  dir_res = 5, // 0x05
  dir_fit = 6, // 0x06
  //
  // Ifs
  //
  if_ret = 0, // 0x00  (also, if_return)
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
  //
  // Info types
  //
  info_con = 0, // 0x00 data0 = value (must be followed by info_con_float)
  info_con_float = 1, // 0x01 data0 = value
  info_dat = 2, // 0x02 data0/1 = obj start/finish
  info_dat_symbol = 3, // 0x03 data0 = offset, data1 = size
  info_pub = 4, // 0x04 data0/1 = obj start/finish, data2/3 = name start/finish
  info_pri = 5, // 0x05 data0/1 = obj start/finish, data2/3 = name start/finish
  //
  // Assembly push/pops
  //
  pp_pusha = 0, // 0x00 PUSHA	D/#	-->	WRLONG	D/#,PTRA++
  pp_pushb = 1, // 0x01 PUSHB	D/#	-->	WRLONG	D/#,PTRB++
  pp_popa = 2, // 0x02 POPA	D	-->	RDLONG	D,--PTRA
  pp_popb = 3, // 0x03 POPB	D	-->	RDLONG	D,--PTRB
  //
  // lower DEBUG commands
  //
  dc_end = 0, // 0x00
  dc_asm = 1, // 0x01
  dc_if = 2, // 0x02
  dc_ifnot = 3, // 0x03
  dc_cogn = 4, // 0x04
  dc_chr = 5, // 0x05
  dc_str = 6, // 0x06
  dc_dly = 7, // 0x07
  dc_pc_key = 8, // 0x08
  dc_pc_mouse = 9, // 0x09

  // discrete values
  pasm_regs = 482, // 0x1D8

  // operands
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

  // ************************************************************************
  // *  DEBUG Display Parser                                                *
  // ************************************************************************
  dd_end = 0, // (0x00)   end of line	elements
  dd_dis = 1, // (0x01)   display type
  dd_nam = 2, // (0x02)   display name
  dd_key = 3, // (0x03)   display command
  dd_num = 4, // (0x04)   number, $num/%num/num
  dd_str = 5, // (0x05)   string, 'text'
  dd_unk = 6, // (0x06)   unknown symbol

  dd_dis_logic = 0, // (0x00)   LOGIC		displays
  dd_dis_scope = 1, // (0x01)   SCOPE
  dd_dis_scope_xy = 2, // (0x02)   SCOPE_XY
  dd_dis_fft = 3, // (0x03)   FFT
  dd_dis_spectro = 4, // (0x04)   SPECTRO
  dd_dis_plot = 5, // (0x05)   PLOT
  dd_dis_term = 6, // (0x06)   TERM
  dd_dis_bitmap = 7, // (0x07)   BITMAP
  dd_dis_midi = 8, // (0x08)   MIDI

  dd_key_black = 0, // (0x00)   BLACK		color group
  dd_key_white = 1, // (0x01)   WHITE
  dd_key_orange = 2, // (0x02)   ORANGE
  dd_key_blue = 3, // (0x03)   BLUE
  dd_key_green = 4, // (0x04)   GREEN
  dd_key_cyan = 5, // (0x05)   CYAN
  dd_key_red = 6, // (0x06)   RED
  dd_key_magenta = 7, // (0x07)   MAGENTA
  dd_key_yellow = 8, // (0x08)   YELLOW
  dd_key_gray = 9, // (0x09)   GRAY

  dd_key_lut1 = 10, // (0x0a)   LUT1		color-mode group
  dd_key_lut2 = 11, // (0x0b)   LUT2
  dd_key_lut4 = 12, // (0x0c)   LUT4
  dd_key_lut8 = 13, // (0x0d)   LUT8
  dd_key_luma8 = 14, // (0x0e)   LUMA8
  dd_key_luma8w = 15, // (0x0f)   LUMA8W
  dd_key_luma8x = 16, // (0x10)   LUMA8X
  dd_key_hsv8 = 17, // (0x11)   HSV8
  dd_key_hsv8w = 18, // (0x12)   HSV8W
  dd_key_hsv8x = 19, // (0x13)   HSV8X
  dd_key_rgbi8 = 20, // (0x14)   RGBI8
  dd_key_rgbi8w = 21, // (0x15)   RGBI8W
  dd_key_rgbi8x = 22, // (0x16)   RGBI8X
  dd_key_rgb8 = 23, // (0x17)   RGB8
  dd_key_hsv16 = 24, // (0x18)   HSV16
  dd_key_hsv16w = 25, // (0x19)   HSV16W
  dd_key_hsv16x = 26, // (0x1a)   HSV16X
  dd_key_rgb16 = 27, // (0x1b)   RGB16
  dd_key_rgb24 = 28, // (0x1c)   RGB24

  dd_key_longs_1bit = 29, // (0x1d)   LONGS_1BIT	pack-data group
  dd_key_longs_2bit = 30, // (0x1e)   LONGS_2BIT
  dd_key_longs_4bit = 31, // (0x1f)   LONGS_4BIT
  dd_key_longs_8bit = 32, // (0x20)   LONGS_8BIT
  dd_key_longs_16bit = 33, // (0x21)   LONGS_16BIT
  dd_key_words_1bit = 34, // (0x22)   WORDS_1BIT
  dd_key_words_2bit = 35, // (0x23)   WORDS_2BIT
  dd_key_words_4bit = 36, // (0x24)   WORDS_4BIT
  dd_key_words_8bit = 37, // (0x25)   WORDS_8BIT
  dd_key_bytes_1bit = 38, // (0x26)   BYTES_1BIT
  dd_key_bytes_2bit = 39, // (0x27)   BYTES_2BIT
  dd_key_bytes_4bit = 40, // (0x28)   BYTES_4BIT

  dd_key_alt = 41, // (0x29)   ALT		keywords
  dd_key_auto = 42, // (0x2a)   AUTO
  dd_key_backcolor = 43, // (0x2b)   BACKCOLOR
  dd_key_box = 44, // (0x2c)   BOX
  dd_key_cartesian = 45, // (0x2d)   CARTESIAN
  dd_key_channel = 46, // (0x2e)   CHANNEL
  dd_key_circle = 47, // (0x2f)   CIRCLE
  dd_key_clear = 48, // (0x30)   CLEAR
  dd_key_close = 49, // (0x31)   CLOSE
  dd_key_color = 50, // (0x32)   COLOR
  dd_key_depth = 51, // (0x33)   DEPTH
  dd_key_dot = 52, // (0x34)   DOT
  dd_key_dotsize = 53, // (0x35)   DOTSIZE
  dd_key_hidexy = 54, // (0x36)   HIDEXY
  dd_key_holdoff = 55, // (0x37)   HOLDOFF
  dd_key_line = 56, // (0x38)   LINE
  dd_key_linesize = 57, // (0x39)   LINESIZE
  dd_key_logscale = 58, // (0x3a)   LOGSCALE
  dd_key_lutcolors = 59, // (0x3b)   LUTCOLORS
  dd_key_mag = 60, // (0x3c)   MAG
  dd_key_obox = 61, // (0x3d)   OBOX
  dd_key_opacity = 62, // (0x3e)   OPACITY
  dd_key_origin = 63, // (0x3f)   ORIGIN
  dd_key_oval = 64, // (0x40)   OVAL
  dd_key_pc_key = 65, // (0x41)   PC_KEY
  dd_key_pc_mouse = 66, // (0x42)   PC_MOUSE
  dd_key_polar = 67, // (0x43)   POLAR
  dd_key_pos = 68, // (0x44)   POS
  dd_key_precise = 69, // (0x45)   PRECISE
  dd_key_range = 70, // (0x46)   RANGE
  dd_key_rate = 71, // (0x47)   RATE
  dd_key_samples = 72, // (0x48)   SAMPLES
  dd_key_save = 73, // (0x49)   SAVE
  dd_key_scroll = 74, // (0x4a)   SCROLL
  dd_key_set = 75, // (0x4b)   SET
  dd_key_signed = 76, // (0x4c)   SIGNED
  dd_key_size = 77, // (0x4d)   SIZE
  dd_key_spacing = 78, // (0x4e)   SPACING
  dd_key_sparse = 79, // (0x4f)   SPARSE
  dd_key_sprite = 80, // (0x50)   SPRITE
  dd_key_spritedef = 81, // (0x51)   SPRITEDEF
  dd_key_text = 82, // (0x52)   TEXT
  dd_key_textangle = 83, // (0x53)   TEXTANGLE
  dd_key_textsize = 84, // (0x54)   TEXTSIZE
  dd_key_textstyle = 85, // (0x55)   TEXTSTYLE
  dd_key_title = 86, // (0x56)   TITLE
  dd_key_trace = 87, // (0x57)   TRACE
  dd_key_trigger = 88, // (0x58)   TRIGGER
  dd_key_update = 89, // (0x59)   UPDATE
  dd_key_window = 90, // (0x5a)   WINDOW

  // ************************************************************************
  // *  Disassembler                                                        *
  // ************************************************************************
  disop_addr20 = 0, // (0x00)   operand symbols
  disop_aug = 1, // (0x01)
  disop_cz = 2, // (0x02)
  disop_d = 3, // (0x03)
  disop_dc = 4, // (0x04)
  disop_dc_modc = 5, // (0x05)
  disop_dcz = 6, // (0x06)
  disop_dcz_modcz = 7, // (0x07)
  disop_ds = 8, // (0x08)
  disop_ds_alt = 9, // (0x09)
  disop_ds_alti = 10, // (0x0a)
  disop_ds_branch = 11, // (0x0b)
  disop_ds_byte = 12, // (0x0c)
  disop_ds_nib = 13, // (0x0d)
  disop_ds_ptr = 14, // (0x0e)
  disop_ds_single = 15, // (0x0f)
  disop_ds_word = 16, // (0x10)
  disop_dsc = 17, // (0x11)
  disop_dscz = 18, // (0x12)
  disop_dscz_bit = 19, // (0x13)
  disop_dscz_bit_log = 20, // (0x14)
  disop_dscz_branch = 21, // (0x15)
  disop_dscz_ptr = 22, // (0x16)
  disop_dscz_single = 23, // (0x17)
  disop_dsz = 24, // (0x18)
  disop_dz_modz = 25, // (0x19)
  disop_l = 26, // (0x1a)
  disop_lc = 27, // (0x1b)
  disop_lcz = 28, // (0x1c)
  disop_lcz_pin = 29, // (0x1d)
  disop_lcz_pin_log = 30, // (0x1e)
  disop_ls = 31, // (0x1f)
  disop_ls_branch = 32, // (0x20)
  disop_ls_pin = 33, // (0x21)
  disop_ls_ptr = 34, // (0x22)
  disop_lsc = 35, // (0x23)
  disop_lx = 36, // (0x24)
  disop_none = 37, // (0x25)
  disop_p_addr20 = 38, // (0x26)
  disop_s = 39, // (0x27)
  disop_s_branch = 40, // (0x28)
  disop_s_pin = 41 // (0x29)
}

export enum eByteCode {
  bc_drop = 0, // 0x00 main bytecodes
  bc_drop_push = 1, // 0x01
  bc_drop_trap = 2, // 0x02
  bc_drop_trap_push = 3, // 0x03
  bc_return_results = 4, // 0x04
  bc_return_args = 5, // 0x05
  bc_abort_0 = 6, // 0x06
  bc_abort_arg = 7, // 0x07
  bc_call_obj_sub = 8, // 0x08
  bc_call_obji_sub = 9, // 0x09
  bc_call_sub = 10, // 0x0a
  bc_call_ptr = 11, // 0x0b
  bc_call_recv = 12, // 0x0c
  bc_call_send = 13, // 0x0d
  bc_call_send_bytes = 14, // 0x0e
  bc_mptr_obj_sub = 15, // 0x0f
  bc_mptr_obji_sub = 16, // 0x10
  bc_mptr_sub = 17, // 0x11
  bc_jmp = 18, // 0x12
  bc_jz = 19, // 0x13
  bc_jnz = 20, // 0x14
  bc_tjz = 21, // 0x15
  bc_djnz = 22, // 0x16
  bc_pop = 23, // 0x17
  bc_pop_rfvar = 24, // 0x18
  bc_hub_bytecode = 25, // 0x19
  bc_case_fast_init = 26, // 0x1a
  bc_case_fast_done = 27, // 0x1b
  bc_case_value = 28, // 0x1c
  bc_case_range = 29, // 0x1d
  bc_case_done = 30, // 0x1e
  bc_lookup_value = 31, // 0x1f
  bc_lookdown_value = 32, // 0x20
  bc_lookup_range = 33, // 0x21
  bc_lookdown_range = 34, // 0x22
  bc_look_done = 35, // 0x23
  bc_add_pbase = 36, // 0x24
  bc_coginit = 37, // 0x25
  bc_coginit_push = 38, // 0x26
  bc_cogstop = 39, // 0x27
  bc_cogid = 40, // 0x28
  bc_locknew = 41, // 0x29
  bc_lockret = 42, // 0x2a
  bc_locktry = 43, // 0x2b
  bc_lockrel = 44, // 0x2c
  bc_lockchk = 45, // 0x2d
  bc_cogatn = 46, // 0x2e
  bc_pollatn = 47, // 0x2f
  bc_waitatn = 48, // 0x30
  bc_getrnd = 49, // 0x31
  bc_getct = 50, // 0x32
  bc_pollct = 51, // 0x33
  bc_waitct = 52, // 0x34
  bc_pinwrite = 53, // 0x35
  bc_pinlow = 54, // 0x36
  bc_pinhigh = 55, // 0x37
  bc_pintoggle = 56, // 0x38
  bc_pinfloat = 57, // 0x39
  bc_pinread = 58, // 0x3a
  bc_pinstart = 59, // 0x3b
  bc_pinclear = 60, // 0x3c
  bc_wrpin = 61, // 0x3d
  bc_wxpin = 62, // 0x3e
  bc_wypin = 63, // 0x3f
  bc_akpin = 64, // 0x40
  bc_rdpin = 65, // 0x41
  bc_rqpin = 66, // 0x42
  bc_debug = 67, // 0x43
  bc_con_rfbyte = 68, // 0x44
  bc_con_rfbyte_not = 69, // 0x45
  bc_con_rfword = 70, // 0x46
  bc_con_rfword_not = 71, // 0x47
  bc_con_rflong = 72, // 0x48
  bc_con_rfbyte_decod = 73, // 0x49
  bc_con_rfbyte_decod_not = 74, // 0x4a
  bc_con_rfbyte_bmask = 75, // 0x4b
  bc_con_rfbyte_bmask_not = 76, // 0x4c
  bc_setup_field_p = 77, // 0x4d
  bc_setup_field_pi = 78, // 0x4e
  bc_setup_reg = 79, // 0x4f
  bc_setup_reg_pi = 80, // 0x50
  bc_setup_byte_pbase = 81, // 0x51
  bc_setup_byte_vbase = 82, // 0x52
  bc_setup_byte_dbase = 83, // 0x53
  bc_setup_byte_pbase_pi = 84, // 0x54
  bc_setup_byte_vbase_pi = 85, // 0x55
  bc_setup_byte_dbase_pi = 86, // 0x56
  bc_setup_word_pbase = 87, // 0x57
  bc_setup_word_vbase = 88, // 0x58
  bc_setup_word_dbase = 89, // 0x59
  bc_setup_word_pbase_pi = 90, // 0x5a
  bc_setup_word_vbase_pi = 91, // 0x5b
  bc_setup_word_dbase_pi = 92, // 0x5c
  bc_setup_long_pbase = 93, // 0x5d
  bc_setup_long_vbase = 94, // 0x5e
  bc_setup_long_dbase = 95, // 0x5f
  bc_setup_long_pbase_pi = 96, // 0x60
  bc_setup_long_vbase_pi = 97, // 0x61
  bc_setup_long_dbase_pi = 98, // 0x62
  bc_setup_byte_pb_pi = 99, // 0x63
  bc_setup_word_pb_pi = 100, // 0x64
  bc_setup_long_pb_pi = 101, // 0x65
  bc_setup_byte_pa = 102, // 0x66
  bc_setup_word_pa = 103, // 0x67
  bc_setup_long_pa = 104, // 0x68
  unused1 = 105, // 0x69
  unused2 = 106, // 0x6a
  bc_ternary = 107, // 0x6b
  bc_lt = 108, // 0x6c
  bc_ltu = 109, // 0x6d
  bc_lte = 110, // 0x6e
  bc_lteu = 111, // 0x6f
  bc_e = 112, // 0x70
  bc_ne = 113, // 0x71
  bc_gte = 114, // 0x72
  bc_gteu = 115, // 0x73
  bc_gt = 116, // 0x74
  bc_gtu = 117, // 0x75
  bc_ltegt = 118, // 0x76
  bc_lognot = 119, // 0x77
  bc_bitnot = 120, // 0x78
  bc_neg = 121, // 0x79
  bc_abs = 122, // 0x7a
  bc_encod = 123, // 0x7b
  bc_decod = 124, // 0x7c
  bc_bmask = 125, // 0x7d
  bc_ones = 126, // 0x7e
  bc_sqrt = 127, // 0x7f
  bc_qlog = 128, // 0x80
  bc_qexp = 129, // 0x81
  bc_shr = 130, // 0x82
  bc_shl = 131, // 0x83
  bc_sar = 132, // 0x84
  bc_ror = 133, // 0x85
  bc_rol = 134, // 0x86
  bc_rev = 135, // 0x87
  bc_zerox = 136, // 0x88
  bc_signx = 137, // 0x89
  bc_add = 138, // 0x8a
  bc_sub = 139, // 0x8b
  bc_logand = 140, // 0x8c
  bc_logxor = 141, // 0x8d
  bc_logor = 142, // 0x8e
  bc_bitand = 143, // 0x8f
  bc_bitxor = 144, // 0x90
  bc_bitor = 145, // 0x91
  bc_fge = 146, // 0x92
  bc_fle = 147, // 0x93
  bc_addbits = 148, // 0x94
  bc_addpins = 149, // 0x95
  bc_mul = 150, // 0x96
  bc_div = 151, // 0x97
  bc_divu = 152, // 0x98
  bc_rem = 153, // 0x99
  bc_remu = 154, // 0x9a
  bc_sca = 155, // 0x9b
  bc_scas = 156, // 0x9c
  bc_frac = 157, // 0x9d
  bc_string = 158, // 0x9e
  bc_bitrange = 159, // 0x9f
  bc_con_n = 160, // 0xa0
  bc_setup_reg_1D8_1F8 = 176, // 0xb0
  bc_setup_var_0_15 = 192, // 0xc0
  bc_setup_local_0_15 = 208, // 0xd0
  bc_read_local_0_15 = 224, // 0xe0
  bc_write_local_0_15 = 240, // 0xf0

  //
  // reset! counter resets to =007A
  //
  bc_repeat_var_init_n = 122, // 0x7a variable operator bytecodes
  bc_repeat_var_init_1 = 123, // 0x7b
  bc_repeat_var_init = 124, // 0x7c
  bc_repeat_var_loop = 125, // 0x7d
  bc_get_field = 126, // 0x7e
  bc_get_addr = 127, // 0x7f
  bc_read = 128, // 0x80
  bc_write = 129, // 0x81
  bc_write_push = 130, // 0x82
  bc_var_inc = 131, // 0x83
  bc_var_dec = 132, // 0x84
  bc_var_preinc_push = 133, // 0x85
  bc_var_predec_push = 134, // 0x86
  bc_var_postinc_push = 135, // 0x87
  bc_var_postdec_push = 136, // 0x88
  bc_var_lognot = 137, // 0x89
  bc_var_lognot_push = 138, // 0x8a
  bc_var_bitnot = 139, // 0x8b
  bc_var_bitnot_push = 140, // 0x8c
  bc_var_swap = 141, // 0x8d
  bc_var_rnd = 142, // 0x8e
  bc_var_rnd_push = 143, // 0x8f
  bc_lognot_write = 144, // 0x90
  bc_bitnot_write = 145, // 0x91
  bc_neg_write = 146, // 0x92
  bc_abs_write = 147, // 0x93
  bc_encod_write = 148, // 0x94
  bc_decod_write = 149, // 0x95
  bc_bmask_write = 150, // 0x96
  bc_ones_write = 151, // 0x97
  bc_sqrt_write = 152, // 0x98
  bc_qlog_write = 153, // 0x99
  bc_qexp_write = 154, // 0x9a
  bc_shr_write = 155, // 0x9b
  bc_shl_write = 156, // 0x9c
  bc_sar_write = 157, // 0x9d
  bc_ror_write = 158, // 0x9e
  bc_rol_write = 159, // 0x9f
  bc_rev_write = 160, // 0xa0
  bc_zerox_write = 161, // 0xa1
  bc_signx_write = 162, // 0xa2
  bc_add_write = 163, // 0xa3
  bc_sub_write = 164, // 0xa4
  bc_logand_write = 165, // 0xa5
  bc_logxor_write = 166, // 0xa6
  bc_logor_write = 167, // 0xa7
  bc_bitand_write = 168, // 0xa8
  bc_bitxor_write = 169, // 0xa9
  bc_bitor_write = 170, // 0xaa
  bc_fge_write = 171, // 0xab
  bc_fle_write = 172, // 0xac
  bc_addbits_write = 173, // 0xad
  bc_addpins_write = 174, // 0xae
  bc_mul_write = 175, // 0xaf
  bc_div_write = 176, // 0xb0
  bc_divu_write = 177, // 0xb1
  bc_rem_write = 178, // 0xb2
  bc_remu_write = 179, // 0xb3
  bc_sca_write = 180, // 0xb4
  bc_scas_write = 181, // 0xb5
  bc_frac_write = 182, // 0xb6
  bc_lognot_write_push = 183, // 0xb7
  bc_bitnot_write_push = 184, // 0xb8
  bc_neg_write_push = 185, // 0xb9
  bc_abs_write_push = 186, // 0xba
  bc_encod_write_push = 187, // 0xbb
  bc_decod_write_push = 188, // 0xbc
  bc_bmask_write_push = 189, // 0xbd
  bc_ones_write_push = 190, // 0xbe
  bc_sqrt_write_push = 191, // 0xbf
  bc_qlog_write_push = 192, // 0xc0
  bc_qexp_write_push = 193, // 0xc1
  bc_shr_write_push = 194, // 0xc2
  bc_shl_write_push = 195, // 0xc3
  bc_sar_write_push = 196, // 0xc4
  bc_ror_write_push = 197, // 0xc5
  bc_rol_write_push = 198, // 0xc6
  bc_rev_write_push = 199, // 0xc7
  bc_zerox_write_push = 200, // 0xc8
  bc_signx_write_push = 201, // 0xc9
  bc_add_write_push = 202, // 0xca
  bc_sub_write_push = 203, // 0xcb
  bc_logand_write_push = 204, // 0xcc
  bc_logxor_write_push = 205, // 0xcd
  bc_logor_write_push = 206, // 0xce
  bc_bitand_write_push = 207, // 0xcf
  bc_bitxor_write_push = 208, // 0xd0
  bc_bitor_write_push = 209, // 0xd1
  bc_fge_write_push = 210, // 0xd2
  bc_fle_write_push = 211, // 0xd3
  bc_addbits_write_push = 212, // 0xd4
  bc_addpins_write_push = 213, // 0xd5
  bc_mul_write_push = 214, // 0xd6
  bc_div_write_push = 215, // 0xd7
  bc_divu_write_push = 216, // 0xd8
  bc_rem_write_push = 217, // 0xd9
  bc_remu_write_push = 218, // 0xda
  bc_sca_write_push = 219, // 0xdb
  bc_scas_write_push = 220, // 0xdc
  bc_frac_write_push = 221, // 0xdd
  bc_setup_bfield_pop = 222, // 0xde
  bc_setup_bfield_rfvar = 223, // 0xdf
  bc_setup_bfield_0_31 = 224, // 0xe0

  //
  //  reset! counter reset to =0054
  //
  bc_hubset = 84, // 0x54 hub bytecodes, miscellaneous (step by 2)
  bc_clkset = 86, // 0x56
  bc_read_clkfreq = 88, // 0x58
  bc_cogspin = 90, // 0x5a
  bc_cogchk = 92, // 0x5c
  bc_inline = 94, // 0x5e
  bc_regexec = 96, // 0x60
  bc_regload = 98, // 0x62
  bc_call = 100, // 0x64
  bc_getregs = 102, // 0x66
  bc_setregs = 104, // 0x68
  bc_bytemove = 106, // 0x6a
  bc_bytefill = 108, // 0x6c
  bc_wordmove = 110, // 0x6e
  bc_wordfill = 112, // 0x70
  bc_longmove = 114, // 0x72
  bc_longfill = 116, // 0x74
  bc_strsize = 118, // 0x76
  bc_strcomp = 120, // 0x78
  bc_strcopy = 122, // 0x7a
  bc_getcrc = 124, // 0x7c
  bc_waitus = 126, // 0x7e
  bc_waitms = 128, // 0x80
  bc_getms = 130, // 0x82
  bc_getsec = 132, // 0x84
  bc_muldiv64 = 134, // 0x86
  bc_qsin = 136, // 0x88
  bc_qcos = 138, // 0x8a
  bc_rotxy = 140, // 0x8c
  bc_polxy = 142, // 0x8e
  bc_xypol = 144, // 0x90
  bc_nan = 146, // 0x92 hub bytecodes, floating point
  bc_fneg = 148, // 0x94
  bc_fabs = 150, // 0x96
  bc_fsqrt = 152, // 0x98
  bc_fadd = 154, // 0x9a
  bc_fsub = 156, // 0x9c
  bc_fmul = 158, // 0x9e
  bc_fdiv = 160, // 0xa0
  bc_flt = 162, // 0xa2
  bc_fgt = 164, // 0xa4
  bc_fne = 166, // 0xa6
  bc_fe = 168, // 0xa8
  bc_flte = 170, // 0xaa
  bc_fgte = 172, // 0xac
  bc_round = 174, // 0xae
  bc_trunc = 176, // 0xb0
  bc_float = 178 // 0xb2
}

export enum eFlexcode {
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
  fc_float
}
