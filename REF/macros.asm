;
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

macro		asmcode	symbol,v1,v2,v3
symbol		=	(v3 shl 11) + (v2 shl 9) + v1
		endm


macro		flexcode	symbol,bytecode,params,results,pinfld,hubcode
symbol		=		bytecode + (params shl 8) + (results shl 11) + (pinfld shl 14) + (hubcode shl 15)
		endm

macro		opcode	symbol,v1,v2,v3,v4,v5,v6,v7,v8,v9,v10
symbol		=	v1 + (v2 shl 8) + (v3 shl 16) + (v4 shl 24) + (v5 shl 25) + (v6 shl 26) + (v7 shl 27) + (v8 shl 28) + (v9 shl 29) + (v10 shl 30)
		endm

;
;
; Macro to establish undefined byte(s)
;
; dbx		symbol(,count)
;
macro		dbx	symbol,count
		udataseg
		ifb	<count>
symbol		db	?
		else
symbol		db	count dup (?)
		endif
		codeseg
		endm
;
;
; Macro to establish undefined word(s)
;
; dwx		symbol(,count)
;
macro		dwx	symbol,count
		udataseg
		ifb	<count>
symbol		dw	?
		else
symbol		dw	count dup (?)
		endif
		codeseg
		endm
;
;
; Macro to establish undefined doubleword(s)
;
; ddx		symbol(,count)
;
macro		ddx	symbol,count
		udataseg
		ifb	<count>
symbol		dd	?
		else
symbol		dd	count dup (?)
		endif
		codeseg
		endm
;
;
macro	disasm	mnem,im,dm,sm,iv,dv,sv,disop	;macro for disassembler table entries
	dd	(im shl 18) + (dm shl 9) + sm
	dd	(iv shl 18) + (dv shl 9) + sv
	db	disop
	db	mnem
	endm
