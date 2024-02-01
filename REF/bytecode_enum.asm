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
; Bytecodes
;
count0		bc_drop				;main bytecodes
count		bc_drop_push
count		bc_drop_trap
count		bc_drop_trap_push

count		bc_return_results
count		bc_return_args

count		bc_abort_0
count		bc_abort_arg

count		bc_call_obj_sub
count		bc_call_obji_sub
count		bc_call_sub
count		bc_call_ptr
count		bc_call_recv
count		bc_call_send
count		bc_call_send_bytes

count		bc_mptr_obj_sub
count		bc_mptr_obji_sub
count		bc_mptr_sub

count		bc_jmp
count		bc_jz
count		bc_jnz
count		bc_tjz
count		bc_djnz

count		bc_pop
count		bc_pop_rfvar

count		bc_hub_bytecode

count		bc_case_fast_init
count		bc_case_fast_done

count		bc_case_value
count		bc_case_range
count		bc_case_done

count		bc_lookup_value
count		bc_lookdown_value
count		bc_lookup_range
count		bc_lookdown_range
count		bc_look_done

count		bc_add_pbase

count		bc_coginit
count		bc_coginit_push
count		bc_cogstop
count		bc_cogid

count		bc_locknew
count		bc_lockret
count		bc_locktry
count		bc_lockrel
count		bc_lockchk

count		bc_cogatn
count		bc_pollatn
count		bc_waitatn

count		bc_getrnd
count		bc_getct
count		bc_pollct
count		bc_waitct

count		bc_pinwrite
count		bc_pinlow
count		bc_pinhigh
count		bc_pintoggle
count		bc_pinfloat
count		bc_pinread

count		bc_pinstart
count		bc_pinclear

count		bc_wrpin
count		bc_wxpin
count		bc_wypin
count		bc_akpin
count		bc_rdpin
count		bc_rqpin

count		bc_debug

count		bc_con_rfbyte
count		bc_con_rfbyte_not
count		bc_con_rfword
count		bc_con_rfword_not
count		bc_con_rflong
count		bc_con_rfbyte_decod
count		bc_con_rfbyte_decod_not
count		bc_con_rfbyte_bmask
count		bc_con_rfbyte_bmask_not

count		bc_setup_field_p
count		bc_setup_field_pi

count		bc_setup_reg
count		bc_setup_reg_pi

count		bc_setup_byte_pbase
count		bc_setup_byte_vbase
count		bc_setup_byte_dbase

count		bc_setup_byte_pbase_pi
count		bc_setup_byte_vbase_pi
count		bc_setup_byte_dbase_pi

count		bc_setup_word_pbase
count		bc_setup_word_vbase
count		bc_setup_word_dbase

count		bc_setup_word_pbase_pi
count		bc_setup_word_vbase_pi
count		bc_setup_word_dbase_pi

count		bc_setup_long_pbase
count		bc_setup_long_vbase
count		bc_setup_long_dbase

count		bc_setup_long_pbase_pi
count		bc_setup_long_vbase_pi
count		bc_setup_long_dbase_pi

count		bc_setup_byte_pb_pi
count		bc_setup_word_pb_pi
count		bc_setup_long_pb_pi

count		bc_setup_byte_pa
count		bc_setup_word_pa
count		bc_setup_long_pa

count		unused1
count		unused2

count		bc_ternary

count		bc_lt
count		bc_ltu
count		bc_lte
count		bc_lteu
count		bc_e
count		bc_ne
count		bc_gte
count		bc_gteu
count		bc_gt
count		bc_gtu
count		bc_ltegt

count		bc_lognot
count		bc_bitnot
count		bc_neg
count		bc_abs
count		bc_encod
count		bc_decod
count		bc_bmask
count		bc_ones
count		bc_sqrt
count		bc_qlog
count		bc_qexp

count		bc_shr
count		bc_shl
count		bc_sar
count		bc_ror
count		bc_rol
count		bc_rev
count		bc_zerox
count		bc_signx
count		bc_add
count		bc_sub

count		bc_logand
count		bc_logxor
count		bc_logor
count		bc_bitand
count		bc_bitxor
count		bc_bitor
count		bc_fge
count		bc_fle
count		bc_addbits
count		bc_addpins

count		bc_mul
count		bc_div
count		bc_divu
count		bc_rem
count		bc_remu
count		bc_sca
count		bc_scas
count		bc_frac

count		bc_string
count		bc_bitrange

counti		bc_con_n		,16
counti		bc_setup_reg_1D8_1F8	,16
counti		bc_setup_var_0_15	,16
counti		bc_setup_local_0_15	,16
counti		bc_read_local_0_15	,16
counti		bc_write_local_0_15	,16


countn		bc_repeat_var_init_n	,7Ah	;variable operator bytecodes
count		bc_repeat_var_init_1
count		bc_repeat_var_init
count		bc_repeat_var_loop

count		bc_get_field
count		bc_get_addr
count		bc_read
count		bc_write
count		bc_write_push

count		bc_var_inc
count		bc_var_dec
count		bc_var_preinc_push
count		bc_var_predec_push
count		bc_var_postinc_push
count		bc_var_postdec_push
count		bc_var_lognot
count		bc_var_lognot_push
count		bc_var_bitnot
count		bc_var_bitnot_push
count		bc_var_swap
count		bc_var_rnd
count		bc_var_rnd_push

count		bc_lognot_write
count		bc_bitnot_write
count		bc_neg_write
count		bc_abs_write
count		bc_encod_write
count		bc_decod_write
count		bc_bmask_write
count		bc_ones_write
count		bc_sqrt_write
count		bc_qlog_write
count		bc_qexp_write

count		bc_shr_write
count		bc_shl_write
count		bc_sar_write
count		bc_ror_write
count		bc_rol_write
count		bc_rev_write
count		bc_zerox_write
count		bc_signx_write
count		bc_add_write
count		bc_sub_write

count		bc_logand_write
count		bc_logxor_write
count		bc_logor_write
count		bc_bitand_write
count		bc_bitxor_write
count		bc_bitor_write
count		bc_fge_write
count		bc_fle_write
count		bc_addbits_write
count		bc_addpins_write

count		bc_mul_write
count		bc_div_write
count		bc_divu_write
count		bc_rem_write
count		bc_remu_write
count		bc_sca_write
count		bc_scas_write
count		bc_frac_write

count		bc_lognot_write_push
count		bc_bitnot_write_push
count		bc_neg_write_push
count		bc_abs_write_push
count		bc_encod_write_push
count		bc_decod_write_push
count		bc_bmask_write_push
count		bc_ones_write_push
count		bc_sqrt_write_push
count		bc_qlog_write_push
count		bc_qexp_write_push

count		bc_shr_write_push
count		bc_shl_write_push
count		bc_sar_write_push
count		bc_ror_write_push
count		bc_rol_write_push
count		bc_rev_write_push
count		bc_zerox_write_push
count		bc_signx_write_push
count		bc_add_write_push
count		bc_sub_write_push

count		bc_logand_write_push
count		bc_logxor_write_push
count		bc_logor_write_push
count		bc_bitand_write_push
count		bc_bitxor_write_push
count		bc_bitor_write_push
count		bc_fge_write_push
count		bc_fle_write_push
count		bc_addbits_write_push
count		bc_addpins_write_push

count		bc_mul_write_push
count		bc_div_write_push
count		bc_divu_write_push
count		bc_rem_write_push
count		bc_remu_write_push
count		bc_sca_write_push
count		bc_scas_write_push
count		bc_frac_write_push

count		bc_setup_bfield_pop
count		bc_setup_bfield_rfvar
counti		bc_setup_bfield_0_31,32


count2n		bc_hubset		,54h	;hub bytecodes, miscellaneous (step by 2)
count2		bc_clkset
count2		bc_read_clkfreq
count2		bc_cogspin
count2		bc_cogchk
count2		bc_inline
count2		bc_regexec
count2		bc_regload
count2		bc_call
count2		bc_getregs
count2		bc_setregs
count2		bc_bytemove
count2		bc_bytefill
count2		bc_wordmove
count2		bc_wordfill
count2		bc_longmove
count2		bc_longfill
count2		bc_strsize
count2		bc_strcomp
count2		bc_strcopy
count2		bc_getcrc
count2		bc_waitus
count2		bc_waitms
count2		bc_getms
count2		bc_getsec
count2		bc_muldiv64
count2		bc_qsin
count2		bc_qcos
count2		bc_rotxy
count2		bc_polxy
count2		bc_xypol

count2		bc_nan				;hub bytecodes, floating point
count2		bc_fneg
count2		bc_fabs
count2		bc_fsqrt
count2		bc_fadd
count2		bc_fsub
count2		bc_fmul
count2		bc_fdiv
count2		bc_flt
count2		bc_fgt
count2		bc_fne
count2		bc_fe
count2		bc_flte
count2		bc_fgte
count2		bc_round
count2		bc_trunc
count2		bc_float
