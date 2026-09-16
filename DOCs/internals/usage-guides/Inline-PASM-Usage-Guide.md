# Inline PASM Usage Guide for Spin2/PASM2

This document describes how to use inline PASM (Propeller Assembly) code within PUB and PRI methods in the Spin2 language for the Parallax Propeller 2 (P2) microcontroller as implemented in the PNut-TS compiler.

## Overview

Inline PASM lets you embed PASM2 instructions directly inside a PUB or PRI method's
body, bracketed by `ORG`/`ORGH` and `END`. It provides:

- **Speed**: PASM2 instructions execute directly on the P2 core, without going
  through the Spin2 bytecode interpreter.
- **Hardware access**: direct register and pin manipulation.
- **Cycle-level control**: precise instruction sequencing when timing matters.
- **Local integration**: an inline block can read and write the enclosing
  method's LONG local variables and parameters without extra plumbing.

| Block Type | Start | End | Execution Location |
|------------|-------|-----|--------------------|
| COG Inline | `ORG` | `END` | COG RAM |
| Hub Inline | `ORGH` | `END` | Hub RAM |

---

## Basic Usage

```spin2
PUB blinkOnce(pin)

  ORG
                drvnot    pin              ' Toggle pin
                waitx     ##1_000_000      ' Delay roughly a fifth of a second at 5 MHz sysclk
                drvnot    pin              ' Toggle pin back
  END
```

`ORG` opens a COG-mode inline block; `END` closes it. The compiler inserts an
implicit `RET` at `END`, so execution returns to the surrounding Spin2 code
automatically — you do not write your own `RET` unless you want an early exit
from partway through the block.

---

## Syntax / Forms

### COG mode (`ORG` ... `END`)

```spin2
PUB Method() | local1, local2
  ' Spin2 code before inline

  ORG                           ' Begin inline PASM (COG execution)
                instruction1
                instruction2
  END                           ' End inline PASM (implicit RET inserted here)

  ' Spin2 code after inline
```

### Hub mode (`ORGH` ... `END`)

```spin2
PUB Method()
  ' Spin2 code before inline

  ORGH                          ' Begin inline PASM (Hub execution)
                instruction1
                instruction2
  END                           ' End inline PASM

  ' Spin2 code after inline
```

### ORG with optional start address and limit

```spin2
PUB Method()
  ORG                           ' Start at address 0, default limit
  ' ... code ...
  END

  ORG 0, $100                   ' Start at 0, custom limit $100
  ' ... code ...
  END
```

### ORG vs ORGH

| Aspect | ORG (COG Mode) | ORGH (Hub Mode) |
|--------|----------------|------------------|
| Execution location | COG RAM | Hub RAM |
| Default block-size limit | $120 longs (288 longs, including the implicit `RET`) | $FFFF longs (65,535 longs, including the implicit `RET`) |
| `RES` directive | Allowed | Not allowed (`RES is not allowed in ORGH mode`) |
| Use case | Timing-critical, tight loops | Larger routines that do not fit in COG RAM |

The $120 figure is a COG-address ceiling, checked after every instruction and
data item is emitted; the $FFFF figure is a total-block-length ceiling, checked
once at `END`. Both counts include the `RET` the compiler adds automatically —
a block of exactly 287 user instructions plus the implicit `RET` fits the COG
limit exactly; 288 user instructions does not (`Cog address exceeds limit`).

### Local variable access

Inline PASM can read and write the enclosing method's local LONG variables and
parameters, with two restrictions:

1. **Must be LONG type** — BYTE and WORD locals cannot be accessed from inline code.
2. **Within the first 16 longs** — only the first 16 LONG locals/parameters
   (counting from the method's parameter list, then its locals, in declaration
   order) are reachable from inline code.

```spin2
PUB write(i2cbyte) : ackbit | scl, sda, tix, bits

  scl := 18
  sda := 19
  tix := 40

  ORG
                shl       i2cbyte, #24          ' Access method parameter
                mov       bits, #8              ' Access local variable
.loop           shl       i2cbyte, #1       wc  ' Shift and set carry
                drvc      sda                   ' Use local as pin number
                waitx     tix                   ' Use local as timing value
                djnz      bits, #.loop          ' Loop using local counter
  END

  ' ackbit return value is available after END
```

Referencing a local outside the first 16, or a BYTE/WORD local, fails with
`Local variable must be LONG and within first 16 longs`:

```spin2
PUB badExample() | byte myByte, word myWord, longVar

  ORG
                mov     longVar, #0           ' OK - LONG local, within first 16
                mov     myByte, #0            ' ERROR: Local variable must be LONG and within first 16 longs
  END
```

Local LONG variables map to fixed COG addresses, first-declared to
sixteenth-declared:

| Local Position | COG Address |
|----------------|-------------|
| 1st LONG | $1E0 |
| 2nd LONG | $1E1 |
| ... | ... |
| 16th LONG | $1EF |

### Labels

Local labels, prefixed with `.`, are the normal choice inside an inline block:

```spin2
PUB i2cWrite(i2cbyte) : ackbit | scl, sda, tix, bits

  ORG
                shl       i2cbyte, #24

.wr_byte        mov       bits, #8              ' Local label
.wb0            shl       i2cbyte, #1       wc  ' Another local label
                drvc      sda
                waitx     tix
                drvh      scl
                waitx     tix
                waitx     tix
                drvl      scl
                waitx     tix
                djnz      bits, #.wb0           ' Branch to local label

.get_ack        drvh      sda                   ' Another local label
                waitx     tix
                drvh      scl
                waitx     tix
                testp     sda                wc
                muxc      ackbit, #1
                waitx     tix
                drvl      scl
  END
```

Global labels (without the `.` prefix) are also accepted inside an inline
block, but they live in a symbol table that is cleared at the end of each
`ORG`/`ORGH` block — a global label can be reused, unchanged, in a later inline
block in the same method, but it cannot be referenced from a different inline
block than the one that defines it (that reference fails with `Undefined
symbol`). Prefer local labels for anything that does not need to be visible
elsewhere.

Use `#` to reference a label as an immediate branch target:

```spin2
  ORG
.loop           nop
                djnz      count, #.loop         ' Branch to label
                jmp       #.done                ' Jump to label
.done           nop
  END
```

### Conditional execution

Every PASM2 condition code works inside inline blocks, with one caveat: `NOP`
cannot carry a condition (`NOP cannot have a condition or _RET_` — this is a
P2 instruction-set rule, not specific to inline code). Use a real instruction,
such as a harmless `mov`, when you need a placeholder under a condition:

```spin2
PUB checkPin(pin, value) | result

  ORG
                testp     pin               wc  ' Set C flag
    if_c        jmp       #.high                ' Jump if pin high
    if_nc       jmp       #.low                 ' Jump if pin low

                cmp       value, #10        wz  ' Set Z flag
    if_z        mov       result, #1            ' If equal
    if_nz       mov       result, #0            ' If not equal

    if_c_and_z  mov       result, #2            ' If C and Z
    if_c_or_z   mov       result, #3            ' If C or Z
.high
.low
  END
```

### REP

```spin2
PUB repDemo() | sda, scl, tix
  ORG
                rep       #8, #9                ' Repeat next 8 instructions, 9 times
                 testp    sda               wc
    if_c         jmp      #.done
                 drvl     scl
                 waitx    tix
                 waitx    tix
                 drvh     scl
                 waitx    tix
                 waitx    tix
.done
  END
```

### Current address (`$`)

```spin2
PUB dollarDemo(pin)
  ORG
                jmp       #$                    ' Infinite loop (jump to self)
                testp     pin               wc
    if_nc       jmp       #$-2                  ' Jump back 2 instructions
  END
```

### Flag effects (WC, WZ, WCZ)

Flag modifiers follow the same rules as top-level PASM2 — see the
[WC/WZ/WCZ Effects Guide](WC-WZ-WCZ-Effects-Guide.md) for which instructions
accept which effects:

```spin2
PUB effectsDemo(pin) | value
  ORG
                testp     pin               wc  ' Set C to pin state
                add       value, #1         wz  ' Set Z if result is zero
                shl       value, #1        wcz  ' Set both C and Z
  END
```

### Data declarations

```spin2
PUB Example()
  ORG 0, 3
                byte      1, 2, 3, 4            ' Inline data
  END
```

---

## Patterns

### All standard PASM2 instructions

```spin2
DAT
hubAddr long 0

PUB example() | pin, value, count

  ORG
                ' I/O instructions
                drvh      pin                   ' Drive pin high
                drvl      pin                   ' Drive pin low
                drvc      pin                   ' Drive pin to C flag
                drvnot    pin                   ' Toggle pin
                testp     pin               wc  ' Test pin state

                ' ALU instructions
                mov       value, #100
                add       value, #1
                sub       value, #1
                shl       value, #8
                shr       value, #8

                ' Control flow
.loop           djnz      count, #.loop         ' Decrement and jump if not zero
                jmp       #.done                ' Unconditional jump

                ' Timing
                waitx     #100                  ' Wait for clock cycles (9-bit immediate: 0-511)

                ' Memory access
                rdlong    value, ##hubAddr      ' Read from hub
                wrlong    value, ##hubAddr      ' Write to hub
.done
  END
```

### I2C start sequence

```spin2
DAT
sclpin  long 18
sdapin  long 19
tixval  long 40

PUB start() | scl, sda, tix

  longmove(@scl, @sclpin, 3)              ' Copy pins & timing to locals

  ORG
                drvh      sda              ' SDA high
                drvh      scl              ' SCL high
                waitx     tix              ' Delay

                drvl      sda              ' SDA low (start condition)
                waitx     tix              ' Delay
                drvl      scl              ' SCL low
                waitx     tix              ' Delay
  END
```

### Pin toggle with count

```spin2
PUB togglePin(pin, count)

  ORG
.loop           drvnot    pin              ' Toggle pin
                waitx     ##1000           ' Delay (##  since 1000 exceeds the 9-bit #imm range)
                djnz      count, #.loop    ' Repeat count times
  END
```

### Reading from hub memory

```spin2
PUB readBlock(p_buffer, count) | value

  ORG
.loop           rdbyte    value, p_buffer  ' Read byte from hub
                add       p_buffer, #1     ' Increment pointer
                ' ... process value ...
                djnz      count, #.loop    ' Loop for all bytes
  END
```

### SPI byte transfer

A `PRI` helper using inline PASM, called from a `PUB` method in the same object:

```spin2
CON
  SF_MOSI = 0
  SF_SCLK = 1

PUB main()
  flashSend(0, 0)

PRI flashSend(p_buffer, count) | tx_byte, bits

  ORG
.byte           rdbyte    tx_byte, p_buffer
                add       p_buffer, #1
                shl       tx_byte, #24+1  wc  ' MSB-justify, get D7 into C

                rep       @.done, #8          ' Repeat 8 times
                drvc      #SF_MOSI            ' Output data bit
                drvnot    #SF_SCLK            ' Toggle clock
                waitx     #2                  ' Delay
                drvnot    #SF_SCLK            ' Toggle clock
                shl       tx_byte, #1     wc  ' Next bit
.done
                djnz      count, #.byte       ' Loop for all bytes

                drvl      #SF_MOSI            ' MOSI low when done
  END
```

### Clock-stretch handling

```spin2
PUB write(i2cbyte) : ackbit | scl, sda, tix, bits

  ORG
                shl       i2cbyte, #24

.wr_byte        mov       bits, #8
.wb0            shl       i2cbyte, #1     wc
                drvc      sda
                waitx     tix
                drvh      scl
                testp     scl             wc  ' Check for clock stretch
    if_nc       jmp       #$-2                ' Wait if clock held low
                waitx     tix
                waitx     tix
                drvl      scl
                waitx     tix
                djnz      bits, #.wb0

.get_ack        drvh      sda
                waitx     tix
                drvh      scl
                testp     scl             wc  ' Check for clock stretch
    if_nc       jmp       #$-2
                waitx     tix
                testp     sda             wc  ' Sample ack bit
                muxc      ackbit, #1
                waitx     tix
                drvl      scl
                waitx     tix
  END
```

---

## Anti-patterns

### Nesting ORG, ORGH, ALIGNW, or ALIGNL inside inline code

None of these directives can appear between an `ORG`/`ORGH` and its matching
`END` — an inline block is a single flat instruction stream:

```spin2
PUB badExample()
  ORG
                nop
                ORG     $100              ' ERROR: ORG not allowed within inline assembly code
                ORGH                      ' ERROR: ORGH not allowed within inline assembly code
                ALIGNL                    ' ERROR: ALIGNW/ALIGNL not allowed within inline assembly code
  END
```

If you need a second inline region, close the current block with `END` and
open a new `ORG`/`ORGH` afterward — that is legal and common (see "ORG with
optional start address and limit" above).

### Accessing a BYTE, WORD, or 17th-and-later local

```spin2
PUB badExample() | byte myByte, word myWord, longVar

  ORG
                mov     myByte, #0            ' ERROR: Local variable must be LONG and within first 16 longs
  END
```

Copy the value into one of the first 16 LONG locals before the inline block
(with `longmove`, a plain assignment, or a method parameter) if you need it
inside PASM.

### Giving `NOP` a condition

```spin2
PUB badExample()
  ORG
    if_c        nop                           ' ERROR: NOP cannot have a condition or _RET_
  END
```

`NOP` is a fixed all-zero instruction word on the P2 and cannot carry a
condition field. Use a genuinely conditional instruction — even a harmless one
like `mov result, result` — where a placeholder is needed under a condition.

### Immediate values wider than an instruction's `#` field

```spin2
PUB badExample()
  ORG
                waitx     #1000                ' ERROR: Constant must be from 0 to 511
  END
```

Most instructions' `D,S/#` and `S/#` forms take a 9-bit immediate (0-511) via
the single `#`. Use `##` for a full 32-bit immediate (as in the "Pin Toggle
with Count" pattern above), or load the value into a register first.

### Exceeding the block-size limit

```spin2
PUB badExample() | count
  ORG
    ' more than 287 instructions here, plus the implicit RET, exceeds $120
  END
```

Exceeding the limit produces `Cog address exceeds limit` for `ORG` (COG mode,
$120-long ceiling including the implicit `RET`), or `ORGH inline block
exceeds $FFFF longs (including the added RET instruction)` for `ORGH` (hub
mode, 65,535-long ceiling). For routines too large for an inline block, place
the code in a `DAT` block and launch it with `COGINIT` instead.

---

## Summary Table

| Feature | Supported | Notes |
|---------|-----------|-------|
| Local labels (`.name`) | Yes | Preferred |
| Global labels | Yes | Cleared at the end of each inline block |
| LONG local variables/parameters | Yes | First 16 only |
| BYTE/WORD locals | No | `Local variable must be LONG and within first 16 longs` |
| All PASM2 instructions | Yes | Subject to the instruction's own operand/effect rules |
| Conditional execution | Yes | All condition codes, except `NOP` cannot carry one |
| REP instruction | Yes | |
| Data declarations (BYTE/WORD/LONG) | Yes | |
| `$` current address | Yes | |
| `ORG`/`ORGH`/`ALIGNW`/`ALIGNL` nested inside inline | No | Each errors by name |
| Empty `ORG`/`END` (no instructions between them) | Yes | The implicit `RET` fills the block; it compiles |
| ORG (COG) block-size limit | $120 longs (288, including implicit `RET`) | |
| ORGH (Hub) block-size limit | $FFFF longs (65,535, including implicit `RET`) | |

---

## Related Documentation

- [ORG Directives Usage Guide](ORG-Directives-Usage-Guide.md) — `ORG`/`ORGH` outside inline code, in top-level `DAT` blocks
- [WC/WZ/WCZ Effects Guide](WC-WZ-WCZ-Effects-Guide.md) — which instructions accept which flag effects
- [REP Instruction Usage Guide](REP-Instruction-Usage-Guide.md) — `REP` in full, including its non-inline forms
- [RES/FIT/END Usage Guide](RES-FIT-END-Usage-Guide.md) — `RES`, `FIT`, and block termination in top-level `DAT` code
- [PASM2 Authoring Guide](PASM2-Authoring-Guide.md) — writing PASM2 outside of inline blocks

---

*This document describes inline PASM usage in Spin2 methods as implemented in the PNut-TS compiler.*
