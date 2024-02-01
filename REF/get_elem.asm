;************************************************************************
;*  Elementizer								*
;************************************************************************
;
;
; Reset element
;
reset_element:	xor	eax,eax
		mov	[source_ptr],eax
		mov	[source_flags],al

		ret
;
;
; Get element
;
; on entry:	source_ptr = source pointer
;
; on exit:	eax = element type
;		ebx = element value
;		source_start = element start
;		source_finish = element finish
;		source_ptr = new source pointer
;
;		if eof, c=1
;
get_element:	push	ecx
		push	edx
		push	esi
		push	edi

		mov	[symbol_flag],0		;reset symbol flag

		movzx	eax,[back_index]	;update back data
		and	al,03h
		mov	ebx,[source_ptr]
		mov	[back_ptrs+eax*4],ebx
		mov	bl,[source_flags]
		mov	[back_flags+eax],bl
		inc	[back_index]

		xor	eax,eax			;eax=0 (type)
		xor	ebx,ebx			;ebx=0 (value)
		xor	ecx,ecx			;ecx=0 (base)

		mov	esi,[source_ptr]	;esi points to source
		add	esi,[source]
		lea	edi,[symbol]		;edi points to symbol

@@skip:		mov	edx,esi			;get element start into edx

		lodsb				;get chr

		cmp	[source_flags],0	;old string?
		jne	@@str2

		cmp	al,'"'			;new string?
		je	@@str

		cmp	al,0			;end of file?
		je	@@eof

		cmp	al,13			;end of line?
		je	@@eol

		cmp	al,' '			;space or tab?
		jbe	@@skip

		cmp	al,"'"			;comment?
		je	@@com

		cmp	al,"{"			;brace comment start?
		je	@@bcom

		cmp	al,"}"			;unmatched brace comment end?
		je	@@error_bcom

		cmp	al,'%'			;binary or packed characters?
		je	@@bin

		cmp	al,'$'			;hex?
		je	@@hex

		cmp	al,'0'			;decimal?
		jb	@@notdec
		cmp	al,'9'
		jbe	@@dec
@@notdec:
		cmp	al,'.'			;continue on next line?
		jne	@@not3dot
		cmp	[byte esi],'.'
		jne	@@not3dot
		cmp	[byte esi + 1],'.'
		jne	@@not3dot
@@skipline:	lodsb				;skip rest of line
		cmp	al,0			;end of file?
		je	@@eof
		cmp	al,13			;end of line?
		jne	@@skipline
		jmp	@@skip			;continue on next line
@@not3dot:
		call	check_word_chr		;symbol?
		mov	cl,symbol_limit+1
		jnc	@@sym2

		shl	eax,8			;may be non-word symbol, store 1st chr
		lodsb				;get 2nd chr in case 2-chr symbol
		cmp	al,' '			;if 2nd chr is white space or eol, try 1-chr
		jbe	@@onechr
		shl	eax,8			;store 2nd chr
		lodsb				;get 3rd chr in case 3-chr symbol
		cmp	al,' '			;if 3rd chr is white space or eol, try 2-chr
		jbe	@@twochr
		call	find_symbol_s3		;check if 3-chr symbol valid
		je	@@got			;if so, got it
@@twochr:	dec	esi			;back up source ptr for 2-chr symbol
		shr	eax,8			;shift out white space or eol chr
		call	find_symbol_s2		;check if 2-chr symbol valid
		je	@@got			;if so, got it
@@onechr:	dec	esi			;back up source ptr for 1-chr symbol
		shr	eax,8			;shift out white space or eol chr
		call	find_symbol_s1		;check if 1-chr symbol valid
		je	@@got			;if so, got it
		jmp	@@error_op		;if not, error

@@str:		lodsb				;new string, get first chr
@@str2:		cmp	[source_flags],1	;old string, comma?
		je	@@str4
		mov	[source_flags],ah	;reset flags
		cmp	al,'"'			;if '"', error
		je	@@error_str		;(first time only)
		cmp	al,0			;if eof, error
		je	@@error_str2
		cmp	al,13			;if eol, error
		je	@@error_str3
		mov	bl,al			;return constant
		lodsb				;if '"' next, done
		cmp	al,'"'
		je	@@str3
		inc	[source_flags]		;not '"', set comma flag
		dec	esi
@@str3:		mov	al,type_con		;return constant
		jmp	@@got
@@str4:		inc	[source_flags]		;cancel comma flag
		dec	esi
		mov	al,type_comma		;return comma
		jmp	@@got

@@com:		cmp	[byte esi],"'"		;comment, doc comment?
		jne	@@com2

		inc	esi			;yes, skip second "'"
		mov	[doc_flag],1		;set doc flag
@@doc:		lodsb				;get comment chr
		cmp	al,0			;end of file?
		je	@@com3
		call	@@docprint		;print doc comment chr
		cmp	al,13			;end of line?
		je	@@eol
		jmp	@@doc

@@com2:		lodsb				;get comment chr
		cmp	al,13			;end of line?
		je	@@eol
		cmp	al,0			;end of file?
		jne	@@com2
@@com3:		dec	esi			;eof, repoint to eof
		jmp	@@eof2

@@bcom:		cmp	[byte esi],"{"		;brace comment, doc comment?
		jne	@@bcom2

		mov	[doc_flag],1		;yes, set doc comment flag
		inc	esi			;skip second "{"
		lodsb				;skip end if present
		cmp	al,13
		je	@@bdoc
		dec	esi
@@bdoc:		lodsb
		cmp	al,0
		je	@@error_bdoc
		cmp	al,"}"
		jne	@@bdoc2
		cmp	[byte esi],"}"
		je	@@bdoc3
@@bdoc2:	call	@@docprint
		jmp	@@bdoc
@@bdoc3:	inc	esi
		jmp	@@skip			;brace doc comment done, skip

@@bcom2:	inc	ebx			;brace comment, level up
@@bcom3:	lodsb				;get comment chr
		cmp	al,0			;if eof, error
		je	@@error_bcom2
		cmp	al,"{"			;level up?
		je	@@bcom2
		cmp	al,"}"			;level down?
		jne	@@bcom3			;ignore other chrs
		dec	ebx
		jne	@@bcom3
		jmp	@@skip			;brace comment done, skip

@@eof:		dec	esi			;end of file, repoint to eof
		mov	edx,esi
@@eof2:		dec	ecx			;on exit, c=1
@@eol:		mov	al,type_end		;end of line
		jmp	@@got

@@bin:		lodsb				;%"?
		cmp	al,'"'
		je	@@packed
		cmp	al,'%'			;% or %%?
		je	@@double

		mov	cl,2			;% binary or $
		call	check_digit
		jnc	@@con
		dec	esi
		mov	al,type_percent
		jmp	@@got

@@double:	lodsb				;%% double binary
		mov	cl,4
		call	check_digit
		jnc	@@con
		call	@@setptrs
		jmp	error_idbn

@@hex:		lodsb				;$ hex or $
		mov	cl,16
		call	check_digit
		jnc	@@con
		dec	esi
		mov	al,type_dollar
		jmp	@@got

@@dec:		mov	cl,10			;decimal

@@con:		dec	esi			;back up to first digit
@@con2:		lodsb				;get next chr
		cmp	al,'_'			;if underscore, ignore
		je	@@con2
		call	check_digit		;mac digit in al into ebx
		jc	@@con4
		movzx	eax,al
		xchg	eax,ebx
		push	edx
		push	ecx
		movzx	ecx,cl
		mul	ecx
		pop	ecx
		or	edx,edx
		pop	edx
		jnz	@@con3			;note overflow
		add	ebx,eax
		jnc	@@con2
@@con3:		mov	ch,1
		jmp	@@con2
@@con4:		cmp	cl,10			;check for floating-point constant
		jne	@@con7
		dec	esi			;base 10, look for '.' or 'e'
		lodsb
		cmp	al,'.'
		jne	@@con5
		lodsb				;make sure '.' followed by digit
		dec	esi
		call	check_digit
		jnc	@@con6
		jmp	@@con7
@@con5:		call	uppercase
		cmp	al,'E'
		jne	@@con7			;if neither, integer
@@con6:		call	get_float		;get floating-point constant at edx
		jc	@@error_flt		;invalid?
		mov	eax,type_con_float	;return constant float
		jmp	@@got
@@con7:		dec	esi			;integer done, back up to last chr
		cmp	ch,0			;trap overflow
		jne	@@error_con
@@con8:		mov	eax,type_con		;return constant
		jmp	@@got

@@packed:	call	@@packedchr		;packed chrs
		cmp	al,'"'
		je	@@error_str
		mov	bl,al
		call	@@packedchr
		cmp	al,'"'
		je	@@con8
		mov	bh,al
		call	@@packedchr
		cmp	al,'"'
		je	@@con8
		ror	ebx,16
		mov	bl,al
		rol	ebx,16
		call	@@packedchr
		cmp	al,'"'
		je	@@con8
		ror	ebx,24
		mov	bl,al
		rol	ebx,24
		call	@@packedchr
		cmp	al,'"'
		je	@@con8
		jmp	@@error_nmt4c

@@packedchr:	lodsb				;get packed chr
		cmp	al,0			;if eof, error
		je	@@error_str2
		cmp	al,13			;if eol, error
		je	@@error_str3
		ret

@@sym:		lodsb				;symbol, gather chrs
		call	check_word_chr
		jc	@@sym3
@@sym2:		stosb
		loop	@@sym
		jmp	@@error_sym
@@sym3:		dec	esi			;back up to non-symbol chr
		mov	al,0			;terminate symbol
		stosb
		inc	[symbol_flag]		;set symbol flag
		call	find_symbol		;find symbol

@@got:		call	@@setptrs		;set pointers

		shl	ecx,1			;if eof, c=1

		pop	edi
		pop	esi
		pop	edx
		pop	ecx
		ret


@@setptrs:	mov	edi,[source]		;set pointers
		sub	edx,edi
		sub	esi,edi
		mov	[source_start],edx
		mov	[source_finish],esi
		mov	[source_ptr],esi
		ret

@@docprint:	cmp	[doc_mode],0		;if doc mode, print chr
		jne	print_chr
		ret


@@error_bcom:	call	@@setptrs		;error, brace comment end
		jmp	error_bmbpbb

@@error_bcom2:	dec	esi			;error, brace comment open
		mov	edx,esi
		call	@@setptrs
		jmp	error_erb

@@error_bdoc:	dec	esi			;error, brace document comment open
		mov	edx,esi
		call	@@setptrs
		jmp	error_erbb

@@error_op:	call	@@setptrs		;error, unrecognized chr
		jmp	error_uc

@@error_str:	call	@@setptrs		;error, empty string
		jmp	error_es

@@error_str2:	dec	esi			;(eof, back up)

@@error_str3:	call	@@setptrs		;error, unterminated string
		jmp	error_eatq

@@error_nmt4c:	inc	edx			;error, too many packed chrs
		inc	edx
		call	@@setptrs
		jmp	error_nmt4c

@@error_flt:	call	@@setptrs		;error, floating-point constant invalid
		jmp	error_fpcmbw

@@error_con:	call	@@setptrs		;error, constant too large
		jmp	error_ce32b

@@error_sym:	call	@@setptrs		;error, symbol too long
		jmp	error_sexc
;
;
; Back up one element
;
back_element:	push	eax

		dec	[back_index]
		movzx	eax,[back_index]
		and	al,03h
		push	[back_ptrs+eax*4]
		pop	[source_ptr]
		mov	al,[back_flags+eax]
		mov	[source_flags],al

		pop	eax
		ret
;
;
; Check al for word character
; c=0 if word character
;
check_word_chr:	cmp	al,'0'			;digit?
		jc	cwc_done
		cmp	al,'9'+1
		jc	cwc_flip

check_word_chr_initial:				;initial word chr cannot be digit

		cmp	al,'_'			;underscore?
		je	cwc_done

		call	uppercase		;make uppercase

		cmp	al,'A'			;letter?
		jc	cwc_done
		cmp	al,'Z'+1

cwc_flip:	cmc

cwc_done:	ret
;
;
; Check al for digit below cl
; c=0 if valid digit
;
check_digit:	call	check_hex		;0-F?
		jc	@@error

		cmp	al,cl			;below cl?
		cmc

@@error:	ret
;
;
; Check al for hex digit
; c=0 if hex digit
;
check_hex:	call	uppercase

		sub	al,'0'			;0-9?
		cmp	al,9+1
		jc	@@flip

		sub	al,'A'-'9'-1		;A-F?
		cmp	al,0Ah
		jc	@@done
		cmp	al,0Fh+1

@@flip:		cmc

@@done:		ret
;
;
; Make al uppercase
;
uppercase:	cmp	al,'a'
		jb	@@done
		cmp	al,'z'
		ja	@@done

		sub	al,'a'-'A'

@@done:		ret
;
;
; Get floating-point constant at edx
;
get_float:	push	edx

		mov	esi,edx			;get source start in esi

		mov	ecx,10			;set base
		xor	edx,edx			;reset significant digits and decimal point flag
		xor	ebx,ebx			;reset mantissa
		xor	edi,edi			;reset base10 exponent

@@mantissa:	lodsb				;get chr
		cmp	al,'_'			;if underscore, ignore
		je	@@mantissa
		call	check_digit		;check for digit
		jc	@@notdigit		;not digit?
		cmp	dl,0			;significant digit already?
		jne	@@digitvalid
		cmp	al,0			;first significant digit?
		jne	@@digitvalid
		cmp	dh,0			;zero, if no decimal point yet, ignore
		je	@@mantissa
		dec	edi			;leading zero right of decimal point, dec exponent
		jmp	@@mantissa		;get next chr

@@digitvalid:	cmp	dl,9			;mac up to nine significant digits (30 bits max)
		jne	@@significant

		cmp	dh,0			;after nine significant digits and still no
		jne	@@mantissa		;...decimal point, just inc exponent
		inc	edi
		jmp	@@mantissa

@@significant:	inc	dl			;inc significant digits
		cmp	dh,0			;if right of decimal point, dec exponent
		je	@@notright
		dec	edi
@@notright:	movzx	eax,al			;mac digit into mantissa
		xchg	eax,ebx
		push	edx
		mul	ecx
		pop	edx
		add	ebx,eax
		jmp	@@mantissa		;get next chr


@@notdigit:	dec	esi			;not digit, get chr
		lodsb

		cmp	al,'.'			;decimal point?
		jne	@@notpoint
		cmp	dh,1			;if decimal point already, got constant string
		je	@@gotconstant
		mov	dh,1			;else, set decimal point flag
		jmp	@@mantissa		;get next chr
@@notpoint:
		call	uppercase		;'e' exponent?
		cmp	al,'E'
		jne	@@gotconstant		;if not, got constant

		lodsb				;exponent, check for '-' or '+'
		mov	dh,1			;set negative flag
		cmp	al,'-'
		je	@@expneg		;'-'?
		cmp	al,'+'
		je	@@exppos		;'+'?
		dec	esi			;neither, positive, back up
@@exppos:	mov	dh,0			;clear negative flag
@@expneg:
		lodsb				;get first exponent digit
		call	check_digit
		jc	@@error			;if invalid, error
		mov	dl,al
@@expdigit:	lodsb				;get any secondary exponent digits
		cmp	al,'_'			;if underscore, ignore
		je	@@expdigit
		call	check_digit
		jc	@@expdone
		xchg	al,dl			;mac exponent digit
		mul	cl
		cmp	ah,0			;if overflow, set flag
		jne	@@expover
		add	dl,al
		jnc	@@expdigit
@@expover:	or	dh,2
		jmp	@@expdigit

@@expdone:	test	dh,2			;exponent done
		jnz	@@error			;if overflow, error
		movzx	eax,dl			;mac 'e' exponent into mantissa exponent
		test	dh,1
		jz	@@expnotneg
		neg	eax
@@expnotneg:	add	edi,eax


@@gotconstant:	or	ebx,ebx			;got constant string, ebx=mantissa, edi=base10 exponent
		jz	@@done			;if mantissa 0, result 0, c=0

		mov	ecx,32			;justify mantissa and get base2 exponent
@@justfp:	dec	ecx
		shl	ebx,1
		jnc	@@justfp

		add	ebx,100h		;round to nearest mantissa lsb
		adc	ecx,0

		and	bh,0FEh			;clear sign, insert exponent, and justify float
		add	cl,127
		mov	bl,cl
		ror	ebx,9

@@normalize:	cmp	edi,-37			;if base10 exponent < -37, normalize
		jge	@@checkover
		mov	eax,[@@tens]
		call	fp_mul
		mov	ebx,eax
		add	edi,37
		jmp	@@normalize

@@checkover:	cmp	edi,38			;if base10 exponent > 38, error
		jg	@@error

		mov	eax,[@@tens+37*4+edi*4]	;multiply float by base 10 exponent
		call	fp_mul
		jc	@@error			;overflow?

		mov	ebx,eax			;float in ebx
		jmp	@@done			;done, c=0

@@error:	stc				;error, c=1

@@done:		dec	esi			;done, back up to last constant chr

		pop	edx
		ret


@@tens		dd	0.0000000000000000000000000000000000001		;1e-37 (Turbo Assembler right for exp $01+ values)
		dd	0.000000000000000000000000000000000001
		dd	0.00000000000000000000000000000000001
		dd	0.0000000000000000000000000000000001
		dd	0.000000000000000000000000000000001
		dd	0.00000000000000000000000000000001
		dd	0.0000000000000000000000000000001
		dd	0.000000000000000000000000000001		;1e-30
		dd	0.00000000000000000000000000001
		dd	0.0000000000000000000000000001
		dd	0.000000000000000000000000001
		dd	0.00000000000000000000000001
		dd	0.0000000000000000000000001
		dd	0.000000000000000000000001
		dd	0.00000000000000000000001
		dd	0.0000000000000000000001
		dd	0.000000000000000000001
		dd	0.00000000000000000001				;1e-20
		dd	0.0000000000000000001
		dd	0.000000000000000001
		dd	0.00000000000000001
		dd	0.0000000000000001
		dd	0.000000000000001
		dd	0.00000000000001
		dd	0.0000000000001
		dd	0.000000000001
		dd	0.00000000001
		dd	0.0000000001					;1e-10
		dd	0.000000001
		dd	0.00000001
		dd	0.0000001
		dd	0.000001
		dd	0.00001
		dd	0.0001
		dd	0.001
		dd	0.01
		dd	0.1
		dd	1.0						;1e0
		dd	10.0
		dd	100.0
		dd	1000.0
		dd	10000.0
		dd	100000.0
		dd	1000000.0
		dd	10000000.0
		dd	100000000.0
		dd	1000000000.0
		dd	10000000000.0					;1e10
		dd	100000000000.0
		dd	1000000000000.0
		dd	10000000000000.0
		dd	100000000000000.0
		dd	1000000000000000.0
		dd	10000000000000000.0
		dd	100000000000000000.0
		dd	1000000000000000000.0
		dd	10000000000000000000.0
		dd	100000000000000000000.0				;1e20
		dd	1000000000000000000000.0
		dd	10000000000000000000000.0
		dd	100000000000000000000000.0
		dd	1000000000000000000000000.0
		dd	10000000000000000000000000.0
		dd	100000000000000000000000000.0
		dd	1000000000000000000000000000.0
		dd	10000000000000000000000000000.0
		dd	100000000000000000000000000000.0
		dd	1000000000000000000000000000000.0		;1e30
		dd	10000000000000000000000000000000.0
		dd	100000000000000000000000000000000.0
		dd	1000000000000000000000000000000000.0
		dd	10000000000000000000000000000000000.0
		dd	100000000000000000000000000000000000.0
		dd	1000000000000000000000000000000000000.0
		dd	10000000000000000000000000000000000000.0
		dd	100000000000000000000000000000000000000.0	;1e38
;
;
; Get element's column +1 into [column]
;
get_column:	push	eax
		push	ebx
		push	ecx
		push	esi

		mov	ecx,[source_start]
		mov	esi,[source]

@@find:		jecxz	@@got
		dec	ecx
		cmp	[byte esi+ecx],13
		jne	@@find
		inc	ecx
@@got:		add	esi,ecx

		neg	ecx
		add	ecx,[source_start]
		jecxz	@@done

		xor	ebx,ebx
@@loop:		lodsb
		cmp	al,09h
		jne	@@nottab
		or	bl,07h
@@nottab:	inc	ebx
		loop	@@loop
		mov	ecx,ebx

@@done:		inc	ecx
		mov	[column],ecx

		pop	esi
		pop	ecx
		pop	ebx
		pop	eax
		ret


ddx		column
;
;
; Elementizer data
;
dbx		symbol_flag

ddx		source_ptr
dbx		source_flags

dbx		back_index
ddx		back_ptrs,4
dbx		back_flags,4
