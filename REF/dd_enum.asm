macro		count0	count_name
count_name	=	0
counter		=	1
		endm

macro		count	count_name
count_name	=	counter
counter		=	counter+1
		endm

;
;
;************************************************************************
;*  DEBUG Display Parser						*
;************************************************************************
;
count0	dd_end				;end of line	elements
count	dd_dis				;display type
count	dd_nam				;display name
count	dd_key				;display command
count	dd_num				;number, $num/%num/num
count	dd_str				;string, 'text'
count	dd_unk				;unknown symbol

count0	dd_dis_logic			;LOGIC		displays
count	dd_dis_scope			;SCOPE
count	dd_dis_scope_xy			;SCOPE_XY
count	dd_dis_fft			;FFT
count	dd_dis_spectro			;SPECTRO
count	dd_dis_plot			;PLOT
count	dd_dis_term			;TERM
count	dd_dis_bitmap			;BITMAP
count	dd_dis_midi			;MIDI

count0	dd_key_black			;BLACK		color group
count	dd_key_white			;WHITE
count	dd_key_orange			;ORANGE
count	dd_key_blue			;BLUE
count	dd_key_green			;GREEN
count	dd_key_cyan			;CYAN
count	dd_key_red			;RED
count	dd_key_magenta			;MAGENTA
count	dd_key_yellow			;YELLOW
count	dd_key_gray			;GRAY

count	dd_key_lut1			;LUT1		color-mode group
count	dd_key_lut2			;LUT2
count	dd_key_lut4			;LUT4
count	dd_key_lut8			;LUT8
count	dd_key_luma8			;LUMA8
count	dd_key_luma8w			;LUMA8W
count	dd_key_luma8x			;LUMA8X
count	dd_key_hsv8			;HSV8
count	dd_key_hsv8w			;HSV8W
count	dd_key_hsv8x			;HSV8X
count	dd_key_rgbi8			;RGBI8
count	dd_key_rgbi8w			;RGBI8W
count	dd_key_rgbi8x			;RGBI8X
count	dd_key_rgb8			;RGB8
count	dd_key_hsv16			;HSV16
count	dd_key_hsv16w			;HSV16W
count	dd_key_hsv16x			;HSV16X
count	dd_key_rgb16			;RGB16
count	dd_key_rgb24			;RGB24

count	dd_key_longs_1bit		;LONGS_1BIT	pack-data group
count	dd_key_longs_2bit		;LONGS_2BIT
count	dd_key_longs_4bit		;LONGS_4BIT
count	dd_key_longs_8bit		;LONGS_8BIT
count	dd_key_longs_16bit		;LONGS_16BIT
count	dd_key_words_1bit		;WORDS_1BIT
count	dd_key_words_2bit		;WORDS_2BIT
count	dd_key_words_4bit		;WORDS_4BIT
count	dd_key_words_8bit		;WORDS_8BIT
count	dd_key_bytes_1bit		;BYTES_1BIT
count	dd_key_bytes_2bit		;BYTES_2BIT
count	dd_key_bytes_4bit		;BYTES_4BIT

count	dd_key_alt			;ALT		keywords
count	dd_key_auto			;AUTO
count	dd_key_backcolor		;BACKCOLOR
count	dd_key_box			;BOX
count	dd_key_cartesian		;CARTESIAN
count	dd_key_channel			;CHANNEL
count	dd_key_circle			;CIRCLE
count	dd_key_clear			;CLEAR
count	dd_key_close			;CLOSE
count	dd_key_color			;COLOR
count	dd_key_depth			;DEPTH
count	dd_key_dot			;DOT
count	dd_key_dotsize			;DOTSIZE
count	dd_key_hidexy			;HIDEXY
count	dd_key_holdoff			;HOLDOFF
count	dd_key_line			;LINE
count	dd_key_linesize			;LINESIZE
count	dd_key_logscale			;LOGSCALE
count	dd_key_lutcolors		;LUTCOLORS
count	dd_key_mag			;MAG
count	dd_key_obox			;OBOX
count	dd_key_opacity			;OPACITY
count	dd_key_origin			;ORIGIN
count	dd_key_oval			;OVAL
count	dd_key_pc_key			;PC_KEY
count	dd_key_pc_mouse			;PC_MOUSE
count	dd_key_polar			;POLAR
count	dd_key_pos			;POS
count	dd_key_precise			;PRECISE
count	dd_key_range			;RANGE
count	dd_key_rate			;RATE
count	dd_key_samples			;SAMPLES
count	dd_key_save			;SAVE
count	dd_key_scroll			;SCROLL
count	dd_key_set			;SET
count	dd_key_signed			;SIGNED
count	dd_key_size			;SIZE
count	dd_key_spacing			;SPACING
count	dd_key_sparse			;SPARSE
count	dd_key_sprite			;SPRITE
count	dd_key_spritedef		;SPRITEDEF
count	dd_key_text			;TEXT
count	dd_key_textangle		;TEXTANGLE
count	dd_key_textsize			;TEXTSIZE
count	dd_key_textstyle		;TEXTSTYLE
count	dd_key_title			;TITLE
count	dd_key_trace			;TRACE
count	dd_key_trigger			;TRIGGER
count	dd_key_update			;UPDATE
count	dd_key_window			;WINDOW
