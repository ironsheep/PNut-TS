;
;
; Find non-word 3-chr symbol
;
find_symbol_s3:	syms	'+//',	type_op,	oc_remu
		syms	'+<=',	type_op,	oc_lteu
		syms	'+>=',	type_op,	oc_gteu
		syms	'<=>',	type_op,	oc_ltegt

		syms	'<>.',	type_op,	oc_fne
		syms	'==.',	type_op,	oc_fe
		syms	'<=.',	type_op,	oc_flte
		syms	'>=.',	type_op,	oc_fgte

		ret
;
;
; Find non-word 2-chr symbol
;
find_symbol_s2:	syms	':=',	type_assign,	0
		syms	'@@',	type_atat,	0
		syms	'^@',	type_upat	0
		syms	'..',	type_dotdot,	0
		syms	'~~',	type_tiltil,	0
		syms	'++',	type_inc,	0
		syms	'--',	type_dec,	0
		syms	'??',	type_rnd,	0

		syms	'>>',	type_op,	oc_shr
		syms	'<<',	type_op,	oc_shl
		syms	'+/',	type_op,	oc_divu
		syms	'//',	type_op,	oc_rem
		syms	'#>',	type_op,	oc_fge
		syms	'<#',	type_op,	oc_fle
		syms	'+<',	type_op,	oc_ltu
		syms	'<=',	type_op,	oc_lte
		syms	'==',	type_op,	oc_e
		syms	'<>',	type_op,	oc_ne
		syms	'>=',	type_op,	oc_gte
		syms	'+>',	type_op,	oc_gtu
		syms	'!!',	type_op,	oc_lognot
		syms	'&&',	type_op,	oc_logand
		syms	'^^',	type_op,	oc_logxor
		syms	'||',	type_op,	oc_logor

;		syms	'-.',	type_op,	oc_fneg		(uses oc_fsub symbol)
		syms	'<.',	type_op,	oc_flt
		syms	'>.',	type_op,	oc_fgt
		syms	'+.',	type_op,	oc_fadd
		syms	'-.',	type_op,	oc_fsub
		syms	'*.',	type_op,	oc_fmul
		syms	'/.',	type_op,	oc_fdiv

		ret
;
;
; Find non-word 1-chr symbol
;
find_symbol_s1:	syms	'(',	type_left,	0
		syms	')',	type_right,	0
		syms	'[',	type_leftb,	0
		syms	']',	type_rightb,	0
		syms	',',	type_comma,	0
		syms	'=',	type_equal,	0
		syms	'#',	type_pound,	0
		syms	':',	type_colon,	0
		syms	'\',	type_back,	0
		syms	'.',	type_dot,	0
		syms	'@',	type_at,	0
		syms	'~',	type_til,	0
		syms	'`',	type_tick,	0
		syms	'!',	type_op,	oc_bitnot
;		syms	'-',	type_op,	oc_neg		(uses oc_sub symbol)
		syms	'&',	type_op,	oc_bitand
		syms	'^',	type_op,	oc_bitxor
		syms	'|',	type_op,	oc_bitor
		syms	'*',	type_op,	oc_mul
		syms	'/',	type_op,	oc_div
		syms	'+',	type_op,	oc_add
		syms	'-',	type_op,	oc_sub
		syms	'<',	type_op,	oc_lt
		syms	'>',	type_op,	oc_gt
		syms	'?',	type_op,	oc_ternary

		ret
;
;
;
; Macro for non-word symbol checks
;
macro		syms	s,t,v
		local	no

		cmp	eax,s
		jne	no
		mov	eax,t
		mov	ebx,v
		ret
no:
		endm
;
;
; Macros for automatic symbols
;
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
