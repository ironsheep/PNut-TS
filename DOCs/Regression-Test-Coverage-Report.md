# PNut-TS Regression Test Coverage Report

> ## Document status (hand-maintained, with a generated core)
>
> **This document is `hand-maintained`, not `generated`.** A prior revision
> was classed `generated` with a "do not hand-edit" note while no generator
> existed — the figures froze at v1.51.7 (January 2026) and drifted for two
> minor releases before anyone noticed (punch list §13d). That silent-staleness
> failure mode is why the class no longer says `generated`: most of this
> document (which operators are tested, which PASM2 instruction families,
> which DEBUG display types) is descriptive judgement text a script cannot
> derive from the repo, and a document that is mostly hand-authored has no
> business claiming to be generated.
>
> The one part that *can* be derived mechanically — fixture counts per
> category and the Jest suite count — **is** generated, by
> `scripts/generate-coverage-report.js` (`npm run coverage-report`), and lives
> between the `GENERATED:BEGIN`/`GENERATED:END` markers below. Regenerate it
> after adding or removing test fixtures or suites; do not hand-edit between
> the markers. Individual `it()`/`test()` case counts still require a live
> run: `npx jest --runInBand --verbose -c smm.jestconfig.js`.
>
> Everything else in this document — the feature-coverage narrative — is
> hand-authored reference material describing *what kinds* of things the
> suite exercises, and needs the same manual re-verification as any other
> hand-maintained doc when the suite's content changes materially.

**Test Suite:** see the measured fixture/suite counts below (regenerate with
`npm run coverage-report`)

---

## Executive Summary

The PNut-TS regression test suite validates compiler compatibility with the original PNut compiler through binary-identical output comparison. Tests cover the complete Spin2 and PASM2 language specification. See the **Measured Snapshot** below for current, machine-counted fixture/suite/block-type numbers — the paragraph-style claims that used to sit here (exact public/private method counts, "X files with DAT blocks") duplicated that table and went stale independently of it; the table is now the one place those numbers live.

---

## Measured Snapshot

<!-- GENERATED:BEGIN (scripts/generate-coverage-report.js — do not hand-edit between these markers) -->

> Measured 2026-09-17 by `npm run coverage-report`. This block is
> regenerated from the repo as committed — it is not hand-edited. Regenerate with
> `npm run coverage-report` after adding or removing fixtures or suites. Everything
> outside the GENERATED markers is hand-authored descriptive material — see the note
> at the top of this document.

### Measured fixture counts (`TEST/*-tests`, recursive `.spin2` count)

| Category | .spin2 fixtures | Files with CON | VAR | DAT | OBJ | PUB | PRI |
|---|---|---|---|---|---|---|---|
| **LARGE-tests** | 91 | 90 | 52 | 60 | 62 | 90 | 61 |
| **MAP-tests** | 59 | 22 | 54 | 22 | 36 | 56 | 3 |
| **WUMMI-tests** | 47 | 40 | 34 | 29 | 34 | 47 | 36 |
| **OBJ-tests** | 37 | 16 | 10 | 2 | 21 | 35 | 0 |
| **ENCODING-tests** | 32 | 20 | 0 | 32 | 0 | 13 | 0 |
| **EXCEPT-tests** | 32 | 8 | 0 | 6 | 3 | 27 | 0 |
| **DBG-tests** | 28 | 24 | 3 | 6 | 5 | 26 | 1 |
| **PREPROC-tests** | 28 | 27 | 0 | 10 | 0 | 20 | 0 |
| **COV-tests** | 25 | 23 | 2 | 6 | 4 | 24 | 3 |
| **V52A-tests** | 20 | 19 | 19 | 2 | 1 | 19 | 9 |
| **CON-tests** | 14 | 12 | 1 | 13 | 0 | 2 | 1 |
| **LANG-VER-tests** | 14 | 10 | 6 | 4 | 2 | 13 | 5 |
| **SPIN-tests** | 14 | 5 | 10 | 3 | 3 | 14 | 3 |
| **DAT-PASM-tests** | 12 | 9 | 0 | 11 | 0 | 1 | 1 |
| **LANG-FEAT-tests** | 9 | 9 | 9 | 3 | 0 | 9 | 9 |
| **INCLUDE-tests** | 8 | 4 | 0 | 0 | 1 | 7 | 0 |
| **EXT-tests** | 5 | 4 | 0 | 5 | 0 | 0 | 0 |
| **LOADER-tests** | 4 | 4 | 1 | 0 | 1 | 4 | 0 |
| **COL-tests** | 2 | 0 | 0 | 0 | 1 | 2 | 0 |
| **VAR-tests** | 2 | 1 | 2 | 1 | 1 | 2 | 0 |
| **DBG-CROP-tests** | 1 | 1 | 0 | 0 | 0 | 1 | 1 |
| **FLASH-tests** | 1 | 1 | 1 | 0 | 1 | 1 | 0 |
| **ALLCODE-tests** | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **485** | | | | | | |

Test categories (directories matching `TEST/*-tests`): **23**.

### Measured Jest suite count (`jest --listTests -c smm.jestconfig.js`)

Total suite files (what `npm test` collects): **43**, across **23** `src/tests/*` directories.

This is a *file* count, not an individual `it()`/`test()` case count — that requires
a live run: `npx jest --runInBand --verbose -c smm.jestconfig.js`.

| src/tests/ directory | suite files |
|---|---|
| MAP-tests | 8 |
| CACHE-tests | 8 |
| COV-tests | 4 |
| CLI-tests | 4 |
| LARGE-tests | 1 |
| SPIN-tests | 1 |
| OBJ-tests | 1 |
| ENCODING-tests | 1 |
| DBG-tests | 1 |
| V52A-tests | 1 |
| LANG-VER-tests | 1 |
| DAT-PASM-tests | 1 |
| CON-tests | 1 |
| EXT-tests | 1 |
| EXCEPT-tests | 1 |
| LOADER-tests | 1 |
| INCLUDE-tests | 1 |
| PREPROC-tests | 1 |
| COL-tests | 1 |
| VAR-tests | 1 |
| CLEANUP-tests | 1 |
| DBG-CROP-tests | 1 |
| FLASH-tests | 1 |

<!-- GENERATED:END -->

---

## Feature Coverage Analysis

### Coverage Summary

| Feature Category | Tested | Total | Coverage |
|-----------------|--------|-------|----------|
| **PASM2 Instructions** | 276 | 276 | **100%** |
| **PASM2 Operand Forms** | 31 | 31 | **100%** |
| **Conditional Prefixes (IF_*)** | 65 | 65 | **100%** |
| **Smart Pin Constants (P_*)** | 116 | 116 | **100%** |
| **Streamer Constants (X_*)** | 78 | 78 | **100%** |
| **Event Constants (EVENT_*)** | 16 | 16 | **100%** |
| **MODCZ Constants (_*)** | 16 | 16 | **100%** |
| **Spin2 Control Flow** | 18 | 18 | **100%** |
| **Spin2 Operators** | ~70 | 74 | **~95%** |
| **Spin2 Built-in Methods** | ~80 | 90 | **~89%** |

### PASM2 Instruction Coverage Details

**Fully Tested Categories:**
- All ALT instructions (ALTS, ALTD, ALTR, ALTB, ALTI, etc.)
- All CORDIC instructions (QMUL, QDIV, QFRAC, QSQRT, QROTATE, QVECTOR, etc.)
- All Smart Pin instructions (WRPIN, WXPIN, WYPIN, RDPIN, AKPIN, etc.)
- All pin drive/float/direction instructions (DRVL/H/C/NC/Z/NZ/RND/NOT, etc.)
- All hub memory instructions (RDBYTE, RDWORD, RDLONG, WRBYTE, WRWORD, WRLONG)
- All branch/call instructions (JMP, CALL, CALLA, CALLB, CALLD, RET, etc.)
- All counter instructions (GETCT, ADDCT1/2/3, POLLCT1/2/3, WAITCT1/2/3)
- All event instructions (SETSE1-4, POLLSE1-4, WAITSE1-4)

**Tested Operand Forms:**
- Register-to-register (D, S)
- 9-bit immediate (#n)
- 32-bit immediate (##n with AUGS/AUGD)
- PTRA/PTRB base addressing
- PTRA++/PTRA-- post-increment/decrement
- ++PTRA/--PTRA pre-increment/decrement
- PTRA[n] indexed addressing
- PTRA[reg] register-indexed addressing
- ++PTRA[n]/PTRA[n]++ combined modes
- WC/WZ/WCZ flag effects (comprehensive)
- WC-only instructions (MUL, MULS, SCA, SCAS)
- WCZ-only instructions (40+ BIT*, DIR*, DRV*, FLT*, OUT* instructions)
- Special TESTB/TESTBN effects (ANDC, ANDZ, ORC, ORZ, XORC, XORZ)
- PA/PB special registers (as operands, call targets, return addresses)
- Register expressions (D+n, D-n, S+n, S-n for adjacent register access)
- Hub-relative addressing (#\ syntax with LOC, JMP, CALL)
- REP instruction block forms (immediate count, register count, various block sizes)
- All 16 IF_* conditional execution prefixes

### Spin2 Language Coverage

**Control Flow (100% - 18/18):**
- All loop forms: REPEAT, REPEAT WHILE, REPEAT UNTIL, REPEAT FROM..TO..STEP
- All conditionals: IF, ELSEIF, ELSE, IFNOT
- All case statements: CASE, CASE_FAST, OTHER
- All flow control: NEXT, QUIT, RETURN, ABORT

**Operators Tested:**
- All arithmetic: +, -, *, /, //, +/, -/
- All bitwise: &, |, ^, ~, <<, >>, ~>, SAR, ROL, ROR, REV
- All comparison: <, >, ==, <>, <=, >=, <#, >#
- All logical: AND, OR, XOR, NOT, !, !!
- All floating-point: +., -., *., /., comparisons
- v51 math: POW, LOG2, EXP2, LOG10, EXP10, LOG, EXP

### Built-in Constant Coverage

**100% Coverage Categories:**
- **Smart Pin (P_*)**: All 116 pin mode, drive strength, ADC/DAC, and serial constants
- **Streamer (X_*)**: All 78 LUT mode, DAC output, and color mode constants
- **Event (EVENT_*)**: All 16 event selection constants
- **MODCZ (_*)**: All 16 flag modification operation constants
- **Conditionals (IF_*)**: All 65 conditional execution prefixes and aliases

---

## Test Suite Structure

### Test Categories by Purpose

Per-category fixture counts are in the **Measured Snapshot** table above (it
is machine-counted and this list is not — the two used to duplicate the same
numbers and only one of them was ever refreshed). This table is the
hand-authored *purpose* of each category, which a script has no way to know:

| Category | Purpose |
|----------|---------|
| **LARGE-tests** | Real-world projects validating comprehensive feature interaction |
| **OBJ-tests** | Object inheritance, child objects, and multi-file compilation |
| **ENCODING-tests** | PASM2 instruction and operand encoding validation |
| **DBG-tests** | DEBUG statement processing and display types |
| **COV-tests** | Targeted code path coverage tests |
| **SPIN-tests** | Core Spin2 language features |
| **LANG-VER-tests** | Language version-specific features (v43-v55) |
| **LANG-FEAT-tests** | Cross-version language feature probes |
| **CON-tests** | Built-in constant definitions |
| **DAT-PASM-tests** | Pure PASM assembly programs |
| **MAP-tests** | Memory map generation tests |
| **PREPROC-tests** | Preprocessor directive testing |
| **EXCEPT-tests** | Error detection and error message validation |
| **EXT-tests** | External/system components (interpreter, debugger) |
| **LOADER-tests** | Flash programming and device loading |
| **FLASH-tests** | `.flash` image generation |
| **INCLUDE-tests** | `#include` directive handling |
| **V52A-tests** | v52a-era regression fixtures |
| **WUMMI-tests** | WUMMI group divergence probes (see punch list §21) |
| **VAR-tests** | Variable declaration and alignment |
| **COL-tests** | Column/source location tracking |
| **DBG-CROP-tests** | DEBUG window crop-region handling |
| **CLI-tests** *(no `TEST/` fixture dir — see below)* | Command-line option handling: unknown-option abort, `-D`/`exportdef` symbol precedence, preprocessor `#if`/`#elseif` from the CLI, `-o`/output-name symbol handling |
| **CACHE-tests** *(no `TEST/` fixture dir — see below)* | Object cache correctness: cache-key resolution root, layout/payload format, invalidation, duplicate-source detection, `.map` override interaction, synchronous output-write ordering |
| **CLEANUP-tests** *(no `TEST/` fixture dir — see below)* | A failed build must not leave stale output files behind — sequences two compiles against the same basename in a throwaway temp dir |

**CLI-tests, CACHE-tests and CLEANUP-tests are missing from the Measured
Snapshot's fixture table above** because that table only walks `TEST/*-tests`
directories, and these three suites synthesize their sources into a temp
directory per test (`CLEANUP-tests`) or read from `TEST/CACHE-fixtures`
(`CACHE-tests`) rather than owning a `TEST/<name>-tests/*.spin2` fixture set.
They are real, current suites (see the Jest suite table above) that this
document did not mention at all until 2026-09-17 — this whole document
predated them.

---

## Spin2 Language Feature Coverage

### Block Types

Per-category block-type counts (CON/VAR/DAT/OBJ/PUB/PRI) are in the
**Measured Snapshot** table above. What each block type is exercising:

| Block | Description |
|-------|-------------|
| **CON** | Constant declarations, expressions, floating-point |
| **VAR** | Variable declarations, arrays, alignment |
| **DAT** | Data declarations and inline PASM assembly |
| **OBJ** | Child object instantiation and method calls |
| **PUB** | Public method definitions |
| **PRI** | Private method definitions |

### Spin2 Control Structures

The test suite exercises all Spin2 control flow constructs:

- **REPEAT loops**: `REPEAT`, `REPEAT WHILE`, `REPEAT UNTIL`, `REPEAT FROM..TO`, `REPEAT FROM..TO STEP`
- **Conditionals**: `IF`, `ELSEIF`, `ELSE`, `IFNOT`
- **Case statements**: `CASE`, `CASE_FAST`, `OTHER`
- **Flow control**: `NEXT`, `QUIT`, `RETURN`, `ABORT`

### Spin2 Operators

Tested operator categories include:

- **Arithmetic**: `+`, `-`, `*`, `/`, `//` (modulo), `+/`, `-/` (signed div/mod)
- **Logical**: `AND`, `OR`, `XOR`, `NOT`, `!`, `!!`
- **Comparison**: `<`, `>`, `<=`, `>=`, `==`, `<>`, `<#`, `>#`
- **Bitwise**: `&`, `|`, `^`, `~`, `<<`, `>>`, `~>`, `><`, `->`, `<-`, `SAR`, `ROL`, `ROR`, `REV`
- **Floating-point**: `+.`, `-.`, `*.`, `/.`, floating-point comparisons
- **Special**: `?` (random), `ENCOD`, `DECOD`, `BMASK`, `ONES`, `SQRT`, `QLOG`, `QEXP`

### Spin2 Built-in Methods

The test suite covers built-in methods across categories:

#### Cog Management
- `COGINIT`, `COGSPIN`, `COGSTOP`, `COGID`, `COGCHK`

#### Pin I/O
- `PINW`, `PINWRITE`, `PINR`, `PINREAD`, `PINH`, `PINL`, `PINT`, `PINF`
- `PINSTART`, `PINSTOP`, `PINCLEAR`, `PINNOT`
- `WRPIN`, `WXPIN`, `WYPIN`, `RDPIN`, `AKPIN`

#### Smart Pin
- Smart pin mode configurations via P_* constants
- ADC/DAC modes, PWM, quadrature encoding

#### Hub Memory
- `BYTEMOVE`, `BYTEFILL`, `WORDMOVE`, `WORDFILL`, `LONGMOVE`, `LONGFILL`
- `BYTE[]`, `WORD[]`, `LONG[]` array access
- `@` (address-of), `@@` (hub address), `^@` (cog register)
- `GETREGS`, `SETREGS` (cog register block transfers)

#### Timing
- `WAITMS`, `WAITUS`, `WAITX`, `WAITCT`
- `GETMS`, `GETUS`, `GETCT`
- `POLLCT`, `ADDCT1`, `ADDCT2`, `ADDCT3`

#### Math (CORDIC)
- `ROTXY`, `POLXY`, `XYPOL`
- `QSIN`, `QCOS`
- `QMUL`, `QDIV`, `QFRAC`, `QSQRT`, `QLOG`, `QEXP`

#### String/Memory
- `STRSIZE`, `STRCOMP`, `STRING`, `LSTRING`

#### Method Pointers
- Method pointer creation with `@method`
- Variable method calls: `methodPtr()`
- `SEND`, `RECV` built-in method pointers

---

## PASM2 Instruction Coverage

### Encoding Tests (see ENCODING-tests row in Measured Snapshot for the current count)

The ENCODING-tests directory validates instruction binary encoding across multiple dimensions:

#### Encoding Dimension Tests (13 files)

| Test File | Encoding Dimension |
|-----------|-------------------|
| `pasm_encoding_branch.spin2` | JMP, CALL, CALLA, CALLB, CALLD, CALLPA, CALLPB, RET, RETA, RETB, RETI0-3, DJNZ, DJZ, DJF, DJNF, TJNZ, TJZ, TJNS, TJS, TJF, TJNF, TJV, IJNZ, IJZ, REP, LOC, SKIP, SKIPF, EXECF, MODCZ, POLLCT, WAITCT, JMPREL |
| `pasm_encoding_conditional.spin2` | All 16 IF_* condition prefixes (IF_C, IF_NC, IF_Z, IF_NZ, IF_C_AND_Z, etc.) |
| `pasm_encoding_immediate.spin2` | 9-bit immediates (#), 32-bit immediates (##), AUGS/AUGD prefixes |
| `pasm_encoding_ptr.spin2` | PTRA/PTRB addressing modes (++, --, [n], ++[n]) |
| `pasm_encoding_ptr_indexed.spin2` | Register-indexed PTR addressing (PTRA[reg], PTRB[reg]) |
| `pasm_encoding_relative.spin2` | Hub-relative addressing (#\ syntax), LOC with hub addresses, extended relative jumps |
| `pasm_encoding_regexpr.spin2` | Register expressions (D+n, D-n, S+n, S-n) for adjacent register access |
| `pasm_encoding_pa_pb.spin2` | PA/PB special registers as operands, call targets, and return addresses |
| `pasm_encoding_rep.spin2` | REP instruction block forms (immediate count, register count, various block sizes) |
| `pasm_encoding_wc.spin2` | WC (write carry) effect testing |
| `pasm_encoding_wz.spin2` | WZ (write zero) effect testing |
| `pasm_encoding_wcz.spin2` | WCZ (write both) effect testing |
| `pasm_encoding_special.spin2` | Special encoding forms and edge cases |

#### Instruction Family Tests (14 files)

| Test File | Instruction Family |
|-----------|-------------------|
| `pasm_instr_alt.spin2` | ALT* family (ALTS, ALTD, ALTR, ALTB, ALTI, ALTGN, ALTGW, ALTSN, ALTSW) |
| `pasm_instr_cordic.spin2` | CORDIC operations (QMUL, QDIV, QFRAC, QSQRT, QROTATE, QVECTOR, QLOG, QEXP, GETQX, GETQY) |
| `pasm_instr_counter.spin2` | Counter operations (GETCT, ADDCT1/2/3, POLLCT1/2/3, WAITCT1/2/3) |
| `pasm_instr_event.spin2` | Event operations (SETSE1-4, POLLSE1-4, WAITSE1-4, SETINT1/2/3, NIXINT1/2/3, TRGINT1/2/3) |
| `pasm_instr_lut.spin2` | LUT operations (WRLUT, RDLUT, SETLUTS) |
| `pasm_instr_pin.spin2` | Smart pin operations (WRPIN, WXPIN, WYPIN, RDPIN, RQPIN, AKPIN, FLT*, DRV*, OUT*, DIR*, TESTP, TESTPN) |
| `pasm_instr_pixel.spin2` | Pixel operations (ADDPIX, MULPIX, BLNPIX, MIXPIX, SETPIX, MOVBYTS, MERGEB, SPLITB, MERGEW, SPLITW) |
| `pasm_instr_rotate.spin2` | Rotate and bit manipulation (ROL, ROR, RCL, RCR, SAL, SAR, SHL, SHR, REV, RCZL, RCZR, TESTB, TESTN) |
| `pasm_instr_stack_lock.spin2` | Stack and lock operations (PUSH, POP, PUSHA, POPA, PUSHB, POPB, LOCKNEW, LOCKRET, LOCKSET, LOCKCLR, LOCKTRY, LOCKREL) |
| `pasm_instr_streamer.spin2` | Streamer operations (XINIT, XZERO, XCONT, XSTOP, SETXFRQ, RDFAST, WRFAST, FBLOCK, RF*, WF*, GETPTR, GETBRK, BRK) |
| `pasm_instr_hub_memory.spin2` | Hub memory operations (RDBYTE, RDWORD, RDLONG, WRBYTE, WRWORD, WRLONG, WMLONG) |
| `pasm_instr_fifo.spin2` | FIFO operations (RFBYTE, RFWORD, RFLONG, RFVAR, RFVARS, WFBYTE, WFWORD, WFLONG) |
| `pasm_instr_modcz.spin2` | MODCZ flag operations |
| `pasm_instr_cog_memory.spin2` | Cog memory operations (MOV, MOVBYTS, GETWORD, GETNIB, GETBYTE, SETWORD, SETNIB, SETBYTE) |

### Instruction Category Tests (8 files)

| Test File | Category | Instructions |
|-----------|----------|--------------|
| `pasm_instr_cordic.spin2` | CORDIC Math | QMUL, QDIV, QFRAC, QSQRT, QROTATE, QVECTOR, QLOG, QEXP, GETQX, GETQY |
| `pasm_instr_pin.spin2` | Smart Pins | WRPIN, WXPIN, WYPIN, RDPIN, RQPIN, AKPIN, FLTL/H/C/NC/Z/NZ/RND/NOT, DRVL/H/C/NC/Z/NZ/RND/NOT, OUTL/H/C/NC/Z/NZ/RND/NOT, DIRL/H/C/NC/Z/NZ/RND/NOT, TESTP, TESTPN |
| `pasm_instr_alt.spin2` | ALT Instructions | ALTS, ALTD, ALTR, ALTB, ALTI, ALTA, ALTGN, ALTGW, ALTSN, ALTSW |
| `pasm_instr_cordic.spin2` | CORDIC | QMUL, QDIV, QFRAC, QSQRT, QROTATE, QVECTOR |
| `pasm_instr_counter.spin2` | Counters | GETCT, ADDCT1/2/3, POLLCT1/2/3, WAITCT1/2/3 |
| `pasm_instr_event.spin2` | Events | SETSE1-4, POLLSE1-4, WAITSE1-4, POLLQMT |
| `pasm_instr_lut.spin2` | LUT Operations | RDLUT, WRLUT, SETLUTS |
| `pasm_instr_pixel.spin2` | Pixel/Color | SETPIX, SETPIV, SETCQ, SETCY, MERGEW, MERGES |
| `pasm_instr_streamer.spin2` | Streamer | XINIT, XSTOP, XZERO, XCONT, RDFAST, RFBYTE, RFWORD, RFLONG, WFBYTE, WFWORD, WFLONG |

### PASM2 Instructions Found Across Test Suite

The following 57 unique instructions are exercised:

```
abs, add, addct1, addct2, addct3, akpin, and, augd, augs, call, cmp, cmps,
coginit, cogstop, djnz, drvh, drvl, flth, fltl, getct, getqx, getqy, jmp,
loc, modcz, mov, neg, nop, or, qdiv, qfrac, qmul, qrotate, qsqrt, qvector,
rdbyte, rdlong, rdpin, rdword, ret, rol, ror, setq, setq2, shl, shr, sub,
test, tjnz, waitx, wrbyte, wrlong, wrpin, wrword, wxpin, wypin, xor
```

---

## Built-in Constants Coverage

### CON-tests Constant Categories

The CON-tests directory validates compiler recognition of all built-in constants:

#### Clock Constants (`const_clock.spin2`)
- `_CLKFREQ`, `_CLKMODE`
- `_XINFREQ`, `_RCFAST`, `_RCSLOW`
- `_XOSC`, `_XTAL`, `_XPLL`

#### Event Constants (`const_event.spin2`)
- `EVENT_INT`, `EVENT_CT1`, `EVENT_CT2`, `EVENT_CT3`
- `EVENT_SE1`, `EVENT_SE2`, `EVENT_SE3`, `EVENT_SE4`
- `EVENT_PAT`, `EVENT_FBW`, `EVENT_XMT`, `EVENT_XFI`, `EVENT_XRO`, `EVENT_XRL`
- `EVENT_ATN`, `EVENT_QMT`
- `INT_OFF`, `COGEXEC`, `HUBEXEC`, `COGEXEC_NEW`, `HUBEXEC_NEW`
- `COGEXEC_NEW_PAIR`, `HUBEXEC_NEW_PAIR`, `NEWCOG`

#### MODCZ Constants (`const_modcz.spin2`)
All 16 flag modification operations:
- `_CLR`, `_SET`, `_NC`, `_NZ`, `_C`, `_Z`
- `_NC_AND_NZ`, `_NC_AND_Z`, `_C_AND_NZ`, `_C_AND_Z`
- `_NC_OR_NZ`, `_NC_OR_Z`, `_C_OR_NZ`, `_C_OR_Z`
- `_C_EQ_Z`, `_C_NE_Z`

#### Smart Pin Constants (`const_smartpin.spin2`)
- **Pin Direction**: `P_NORMAL`, `P_TRUE_IN`, `P_INVERT_IN`, `P_TRUE_OUT`, `P_INVERT_OUT`
- **Drive Strength (High)**: `P_HIGH_FAST`, `P_HIGH_1K5`, `P_HIGH_15K`, `P_HIGH_150K`, `P_HIGH_1MA`, `P_HIGH_100UA`, `P_HIGH_10UA`, `P_HIGH_FLOAT`
- **Drive Strength (Low)**: `P_LOW_FAST`, `P_LOW_1K5`, `P_LOW_15K`, `P_LOW_150K`, `P_LOW_1MA`, `P_LOW_100UA`, `P_LOW_10UA`, `P_LOW_FLOAT`
- **Input Selection**: `P_TRUE_A`, `P_INVERT_A`, `P_LOCAL_A`, `P_TRUE_B`, `P_INVERT_B`, `P_LOCAL_B`
- **Logic**: `P_PASS_AB`, `P_AND_AB`, `P_OR_AB`, `P_XOR_AB`
- **Smart Pin Modes**: `P_PULSE`, `P_TRANSITION`, `P_NCO_FREQ`, `P_NCO_DUTY`, `P_PWM_TRIANGLE`, `P_PWM_SAWTOOTH`, `P_QUADRATURE`
- **Counter Modes**: `P_COUNT_RISES`, `P_COUNT_HIGHS`, `P_STATE_TICKS`, `P_HIGH_TICKS`
- **ADC Modes**: `P_ADC`, `P_ADC_EXT`, `P_ADC_SCOPE`, `P_ADC_GIO`, `P_ADC_VIO`, `P_ADC_FLOAT`, `P_ADC_1X`, `P_ADC_3X`, `P_ADC_10X`, `P_ADC_30X`, `P_ADC_100X`
- **DAC Modes**: `P_DAC_990R_3V`, `P_DAC_600R_2V`, `P_DAC_124R_3V`, `P_DAC_75R_2V`, `P_DAC_NOISE`, `P_DAC_DITHER_RND`, `P_DAC_DITHER_PWM`
- **Serial**: `P_USB_PAIR`, `P_SYNC_TX`, `P_SYNC_RX`, `P_ASYNC_TX`, `P_ASYNC_RX`
- **Truth Table**: `P_TT_00`, `P_TT_01`, `P_TT_10`, `P_TT_11`
- **Other**: `P_OE`, `P_CHANNEL`, `P_BITDAC`

#### Streamer Constants (`const_streamer.spin2`)
- **LUT Modes**: `X_IMM_32X1_LUT`, `X_IMM_16X2_LUT`, `X_IMM_8X4_LUT`, `X_IMM_4X8_LUT`
- **Immediate DAC**: `X_IMM_32X1_1DAC1`, `X_IMM_16X2_2DAC1`, `X_IMM_16X2_1DAC2`, etc.
- **RFLONG/RFBYTE**: `X_RFLONG_32X1_LUT`, `X_RFBYTE_1P_1DAC1`, etc.
- **Color Modes**: `X_RFBYTE_LUMA8`, `X_RFBYTE_RGBI8`, `X_RFBYTE_RGB8`, `X_RFWORD_RGB16`, `X_RFLONG_RGB24`
- **DAC Control**: `X_DACS_OFF`, `X_DACS_0_0_0_0`, `X_DACS_X_X_0_0`, etc.
- **DDS/Goertzel**: `X_DDS_GOERTZEL_SINC1`, `X_DDS_GOERTZEL_SINC2`

---

## Preprocessor Coverage

The PREPROC-tests directory validates all preprocessor directives (see Measured Snapshot for the current file count):

| Directive | Test File | Description |
|-----------|-----------|-------------|
| `#define` | `condCode.spin2` | Symbol definition |
| `#undef` | `condCode.spin2` | Symbol undefinition |
| `#ifdef` | `condCode.spin2`, `condCodeElse.spin2` | Conditional compilation |
| `#ifndef` | `condNestCode.spin2` | Negated conditional |
| `#else` | `condCodeElse.spin2` | Else branch |
| `#elseifdef` | `condNestCode.spin2` | Chained conditionals |
| `#endif` | All conditional tests | End conditional block |
| `#include` | `include.spin2` | File inclusion |
| `-D` flag | `condNestCodeCmdLn.spin2` | Command-line defines |

---

## Debug Display Coverage

The DBG-tests directory (see Measured Snapshot for the current file count) validates DEBUG statement compilation:

### Debug Display Types Tested

- **Basic**: `debug()`, `debug("string")`, `debug(expression)`
- **Format specifiers**: `udec`, `sdec`, `uhex`, `shex`, `ubin`, `sbin`
- **Floating-point**: `fdec`, `fdec_`, `fhex`
- **Arrays**: `udec_byte_array`, `uhex_long_array`, `sdec_word_array`
- **Graphics**: `bitmap`, `logic`, `scope`, `fft`, `spectro`, `plot`, `term`
- **Commands**: `trace`, `lutcolors`, `longs_*bit`, `if`, `dly`

---

## Object Inheritance Coverage

The OBJ-tests directory (see Measured Snapshot for the current file count) validates multi-object compilation:

### Tested Object Patterns

1. **Simple child objects**: `spin_test10` - Basic object instantiation
2. **Multiple children**: `spin_test14` - Multiple different child objects
3. **Child arrays**: `spin_test15` - Arrays of child objects
4. **Deep nesting**: `spin_test22` - 3+ levels of object hierarchy
5. **Shared children**: `spin_test23` - Multiple parents sharing child objects
6. **Constant overrides**: Using `|` syntax for compile-time constants
7. **Method pointers across objects**: Cross-object method references

---

## Language Version Features

Version-specific features are tracked mostly in `TEST/LANG-VER-tests` (v43-v51)
and `TEST/V52A-tests` (v52-v54; the directory name is historical — v53 and v54
fixtures live there too). Re-derived 2026-09-17 against
`src/classes/parseUtils.ts` (the `currSpinVersion` gates and the
`automatic_symbols_v*` tables), `src/classes/spinResolver.ts`, and
`CHANGELOG.md`, not just against the test directory listing — the previous
`v44` row cited a `Spin2_v44_*` fixture that does not exist in this tree.

| Version | Test File | Features Added |
|---------|-----------|----------------|
| v43 | Base | Core Spin2 language |
| v44 | `COV-tests/coverage_003_v44.spin2` (not `LANG-VER-tests` — see note below) | `BYTESWAP`/`BYTECOMP`, `WORDSWAP`/`WORDCOMP`, `LONGSWAP`/`LONGCOMP` flexcode methods, `BOOL`/`BOOL_` debug commands. **`{Spin2_v44}` itself cannot be declared** — `parseUtils.ts` throws `{Spin2_v44} is no longer supported due to changes in data structures beginning in v45` for `currSpinVersion == 44` exactly; the v44 symbol table only activates for `currSpinVersion >= 44`, i.e. from a `{Spin2_v45}` header up. `SPIN-tests/spin_builtin_swap.spin2` and `V52A-tests/v46_test_swap_compare.spin2` are the fixtures that actually exercise these functions. |
| v45 | `Spin2_v45_step.spin2` | Step improvements |
| v46 | `Spin2_v46_step.spin2` | Version 46 features |
| v47 | `Spin2_v47_step.spin2` | Version 47 features |
| v49 | `Spin2_v49_step.spin2` | Version 49 features |
| v50 | `Spin2_v50_step.spin2` | Version 50 features |
| v51 | `Spin2_v51_step.spin2` | STRUCT definitions, POW, LOG2, EXP2, LOG10, EXP10, LOG, EXP operators, placeholder returns (`_`, `_[n]`) |
| v52 | `V52A-tests/v52a_test_endian.spin2`, `v52a_test_debug_end_session.spin2` | **Actually version-gated** (`currSpinVersion >= 52` in `parseUtils.ts`): `ENDIANL()`/`ENDIANW()` flexcode methods, `DEBUG_END_SESSION` constant (27). Two more fixtures exist under the same v52a umbrella but are **not** version-gated in this implementation — `MOVBYTS()` (reclassified from a PASM-only instruction to a Spin2 flexcode function, but placed in the unconditional `automatic_symbols` table, not `automatic_symbols_v52`) and the NEXT/QUIT optional level parameter (1-15, unconditional in `spinResolver.ts`) — both are accepted regardless of the declared `{Spin2_vNN}`, consistent with this project's superset-parity principle of not gating PNut-local feature limits (see `DOCs/roadmaps/...project_superset_parity_principle.md`). Fixtures: `v52a_test_movbyts.spin2`, `v52a_test_next_quit_level.spin2`. |
| v53 | `V52A-tests/v53_test_offsetof.spin2` | **Version-gated** (`automatic_symbols_v53`, `currSpinVersion >= 53`): `OFFSETOF(struct.member)` compile-time function. |
| v54 | `V52A-tests/v54_test_struct_bitfields.spin2` | Named bitfields on STRUCT `BYTE`/`WORD`/`LONG` members (`STRUCT s(LONG flags.ready[0].count[15..8])`) and a nameless single `BYTE`/`WORD`/`LONG` STRUCT member. Per `CHANGELOG.md` 1.54.0, `{Spin2_v54}` "is accepted unconditionally rather than gating any syntax" — the struct-bitfield parser and reader (`objectStructures.ts` / `objectStructureRecord.ts`) apply regardless of declared version, matching the v52 pattern above. |
| v55 | *(no dedicated fixture — see note)* | **Gates nothing new.** Per `CHANGELOG.md` 1.55.0: "`{Spin2_v55}` accepted as a version directive. It admits the same source surface as `{Spin2_v54}`; v55 introduces no new level-gated symbols." v55's actual changes (smaller pointer inc/dec and bitfield-access encoding, a rebuilt interpreter image) are code-generation/binary-format changes, not source-level language surface, so there is nothing for a `LANG-VER`-style fixture to gate on. Confirmed no `currSpinVersion >= 55` (or `== 55`) check exists anywhere in `src/classes/`. |

---

## Error Detection Coverage

The EXCEPT-tests directory (see Measured Snapshot for the current file count) validates error detection:

| Test | Error Type |
|------|------------|
| `exception_test_000` | Undefined symbol reference |
| `exception_test_006` | Type mismatch errors |
| `exception_test_008` | Syntax errors |
| `exception_test_009` | Invalid expressions |
| `exception_test_010` | Method signature errors |
| `symbol_length_test_30max` | Symbol length limit (30 chars) |
| `debug_empty_str` | Empty debug string handling |

---

## Real-World Code Validation

### LARGE-tests (see Measured Snapshot for the current file count)

Production-quality code from various sources:
- Motor control drivers (BLDC, servo)
- Communication protocols (I2C, SPI, UART, USB)
- Display drivers (HDMI, VGA, LCD)
- Sensor interfaces (gyroscope, accelerometer, GPS)
- Audio processing
- File system access
- Network protocols

---

## Test Methodology

### Binary Comparison

Each test validates:
1. **Listing output** (`.lst`) - Assembly listing with addresses
2. **Object output** (`.obj`) - Compiled object file
3. **Binary output** (`.bin`) - Final executable

Tests compare against `.GOLD` reference files generated by the original PNut compiler.

### Error Output Validation

Exception tests compare:
- **Error output** (`.errout`) against `.errout.GOLD` reference files
- Validates error message format and line numbers

### 1 ULP Floating-Point Tolerance Filter (v1.51.7)

The test infrastructure includes a **1 ULP (Unit in Last Place) filter** that handles floating-point differences between PNut-TS and the reference PNut compiler:

- **Problem:** IEEE 754 floating-point values can differ by 1 ULP between compilers (e.g., 100.0 = 0x42C80000 vs 99.99999237 = 0x42C7FFFF)
- **Cascade Effect:** 1 ULP byte-level differences affect object file checksums by a predictable amount
- **Solution:** The filter identifies 4-byte aligned groups that differ by exactly 1, calculates the expected checksum delta, and allows both the 1 ULP differences and the corresponding checksum differences

This allows tests with floating-point operations to pass without requiring exact byte-matching, while still catching real bugs (differences > 1 ULP fail).

### Debug/Non-Debug Test Separation

Test runners automatically detect whether each test file requires the `-d` (debug) flag:
- Files containing `debug()` statements are compiled with `-d`
- Files without `debug()` statements are compiled without `-d`

This allows test suites to contain both types of tests with correct compilation flags.

---

## Summary Statistics

Superseded by the **Measured Snapshot** section above — that table is
regenerated from the repo (`npm run coverage-report`) and this section used
to be a hand-copied, independently-stale duplicate of the same numbers.
Language version coverage: v43-v55 (see LANG-VER-tests and LANG-FEAT-tests
in Test Categories by Purpose above).

---

## Appendix: Test Execution

Run tests with:

```bash
# Full test suite
npm test

# Specific categories — see package.json for the full "test-*" script list;
# each runs `jest -c jest-config/jest-<category>-only-config.json` against
# one TEST/*-tests directory.
npm run test-con       # Constants
npm run test-obj       # Objects
npm run test-dbg       # Debug
npm run test-encoding  # PASM2 Encoding
npm run test-spin      # Spin features
npm run test-lang      # Language versions
npm run test-pre       # Preprocessor
npm run test-datpasm   # DAT/PASM
npm run test-exc       # Exceptions
npm run test-lrg       # Large files
npm run test-loader    # Loader tests
npm run test-var       # Variables
npm run test-ext       # External components

# Regenerate the Measured Snapshot section above
npm run coverage-report
```

---

*This report documents the regression test coverage for PNut-TS, ensuring compatibility with the original PNut compiler for Parallax Propeller 2.*
