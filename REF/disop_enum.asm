macro		count0	count_name
count_name	=	0
counter		=	1
		endm

macro		count	count_name
count_name	=	counter
counter		=	counter+1
		endm

;************************************************************************
;*  Disassembler							*
;************************************************************************


		count0	disop_addr20			;operand symbols
		count	disop_aug
		count	disop_cz
		count	disop_d
		count	disop_dc
		count	disop_dc_modc
		count	disop_dcz
		count	disop_dcz_modcz
		count	disop_ds
		count	disop_ds_alt
		count	disop_ds_alti
		count	disop_ds_branch
		count	disop_ds_byte
		count	disop_ds_nib
		count	disop_ds_ptr
		count	disop_ds_single
		count	disop_ds_word
		count	disop_dsc
		count	disop_dscz
		count	disop_dscz_bit
		count	disop_dscz_bit_log
		count	disop_dscz_branch
		count	disop_dscz_ptr
		count	disop_dscz_single
		count	disop_dsz
		count	disop_dz_modz
		count	disop_l
		count	disop_lc
		count	disop_lcz
		count	disop_lcz_pin
		count	disop_lcz_pin_log
		count	disop_ls
		count	disop_ls_branch
		count	disop_ls_pin
		count	disop_ls_ptr
		count	disop_lsc
		count	disop_lx
		count	disop_none
		count	disop_p_addr20
		count	disop_s
		count	disop_s_branch
		count	disop_s_pin
