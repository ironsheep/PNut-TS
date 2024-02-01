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

/*
This assembly code defines a function check_word_chr that checks if the ASCII value in the al register is a
word character. A word character in this context is a digit (0-9), an underscore (_), or a letter (A-Z, case
insensitive).

Here's a step-by-step explanation:

cmp al,'0' and cmp al,'9'+1: These two lines check if al is a digit. If al is less than '0' or greater than '9',
it jumps to cwc_done or cwc_flip respectively.

cmp al,'_' : This line checks if al is an underscore. If it is, it jumps to cwc_done.

call uppercase: This line calls a function uppercase that converts al to uppercase if it's a lowercase letter.

cmp al,'A' and cmp al,'Z'+1: These two lines check if al is a letter. If al is less than 'A' or greater than 'Z',
it jumps to cwc_done.

cwc_flip: cmc: This line complements the carry flag. If the carry flag was set (indicating al was a non-word
character), it's now cleared, and vice versa.

cwc_done: ret: This is the end of the function. It returns to the caller. The carry flag indicates whether al
was a word character (carry clear) or not (carry set).

Note: This function also has a label check_word_chr_initial which is used to check a character that cannot
be a digit. It's not called within this function, but it can be called from elsewhere in the code.
 */

 function checkWordChr(ch: string): boolean {
  const charCode = ch.charCodeAt(0);
  const isDigit = charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0);
  const isUnderscore = ch === '_';
  const isLetter = charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0) || charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0);

  return isDigit || isUnderscore || isLetter;
}

function checkWordChrInitial(ch: string): boolean {
  const charCode = ch.charCodeAt(0);
  const isUnderscore = ch === '_';
  const isLetter = charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0) || charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0);

  return isUnderscore || isLetter;
}
