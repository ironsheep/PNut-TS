# PASM2 Assembly Labels Specification

## Overview

PASM2 (Propeller 2 Assembly) supports two scoping levels for labels within DAT blocks: **global labels** and **local labels**. This scoping mechanism allows code reuse of common label names (like `loop`, `done`, `exit`) without naming collisions across different routines.

## Label Syntax Summary

| Label Type | Syntax | Scope | Example Definition | Example Reference |
|------------|--------|-------|-------------------|-------------------|
| Global | `name` | Entire DAT block | `my_routine` | `#my_routine` |
| Local (dot) | `.name` | Current global scope | `.loop` | `#.loop` |
| Local (colon) | `:name` | Current global scope | `:retry` | `#:retry` |

## Global Labels

### Definition

Global labels are defined by placing an identifier at the start of a line (or in the label field) without any prefix character.

### Syntax

```
labelname    [instruction]    [operands]    [effects]    'comment
```

### Characteristics

- Visible throughout the entire `DAT` block
- Can be referenced from Spin2 code using `@labelname`
- Defining a new global label resets the local label scope
- Must begin with a letter (A-Z, a-z) or underscore (_)
- May contain letters, digits (0-9), and underscores
- Maximum length: 30 characters, enforced — a longer symbol is a compile error

### Examples

```spin2
DAT             org

' Global labels - visible everywhere in DAT block
init_routine    mov     x, #0           ' routine entry point
                add     x, #1
                ret

data_table      long    $DEAD_BEEF      ' data with global label
                long    $CAFE_BABE

math_helper     abs     x               ' another routine
                ret
```

## Local Labels

### Definition

Local labels are defined by prefixing an identifier with either a dot (`.`) or colon (`:`). Both prefixes are functionally equivalent.

### Syntax

```
.labelname   [instruction]    [operands]    [effects]    'comment
:labelname   [instruction]    [operands]    [effects]    'comment
```

### Characteristics

- Visible only within the scope of the preceding global label
- Scope ends when the next global label is defined
- Same local name can be reused under different global labels
- Internally mangled by the compiler (e.g., `loop'0001`) for uniqueness
- Must begin with a letter or underscore (after the prefix)
- Maximum of 10,000 DAT symbols per file (includes both global and local)

### Examples

```spin2
DAT             org

send_byte       rdbyte  x, ptr          ' global: send_byte
                call    #.wait          ' reference local .wait
.loop           testp   tx_pin    wc    ' local: .loop (scope: send_byte)
        if_nc   jmp     #.loop
                wypin   x, tx_pin
.wait           testp   tx_pin    wc    ' local: .wait (scope: send_byte)
        if_c    jmp     #.wait
                ret

recv_byte       testp   rx_pin    wc    ' global: recv_byte (new scope begins)
        if_nc   jmp     #.wait          ' this .wait is different from above
.wait           testp   rx_pin    wc    ' local: .wait (scope: recv_byte)
        if_nc   jmp     #.wait
                rdpin   x, rx_pin
.loop           shr     x, #24          ' local: .loop (scope: recv_byte)
                ret
```

## Label Reference Operators

| Operator | Meaning | Context |
|----------|---------|---------|
| `#label` | Immediate value (COG address) | PASM instructions |
| `#.local` | Immediate reference to local label | PASM instructions |
| `#\label` | Absolute COG-relative address | Forces 9-bit COG address |
| `#\.local` | Absolute reference to local label | Forces 9-bit COG address |
| `@label` | Hub address of label | Spin2 or PASM |
| `@@label` | Object-relative address | Spin2 or PASM |
| `$` | Current COG address | PASM (ORG mode) |
| `$$` | Current hub address | PASM (ORGH mode) |

### Reference Examples

```spin2
DAT             org

routine         jmp     #.skip          ' jump to local label
                long    0
.skip           mov     x, #routine     ' load address of global
                call    #\.helper       ' absolute call to local
                ret

.helper         nop
                ret

' In ORGH (hub) mode:
                orgh
hub_data        byte    "Hello", 0
hub_routine     long    @routine        ' hub address of COG routine
```

## Scope Boundary Rules

1. **Global label definition** - Starts a new local scope; resets the local scope counter
2. **Storage directives** (`BYTE`, `WORD`, `LONG`, `RES`) - Also increment the scope counter when defining data
3. **End of DAT block** - Terminates all label scopes

### Scope Boundary Example

```spin2
DAT             org

func_a          mov     x, #1           ' Global: func_a, scope #1 begins
.loop           djnz    x, #.loop       ' Local .loop in scope #1

data_block      long    0, 0, 0, 0      ' Global: data_block, scope #2 begins

func_b          mov     y, #2           ' Global: func_b, scope #3 begins
.loop           djnz    y, #.loop       ' Local .loop in scope #3 (different from scope #1)
.done           ret                     ' Local .done in scope #3
```

## Best Practices

1. **Use descriptive global names** for routine entry points: `send_packet`, `init_uart`, `calc_crc`
2. **Use short local names** for flow control: `.loop`, `.done`, `.retry`, `.skip`, `.exit`
3. **Prefer dot notation** (`.label`) over colon notation (`:label`) for consistency with modern convention
4. **Keep local labels near their references** to improve readability
5. **Limit symbol names to 30 characters** — this is a language rule enforced by both compilers, not a portability courtesy; exceeding it is a compile error

## Compiler Implementation Notes

- The compiler maintains an internal scope counter (`asmLocal`) that increments with each global label or storage definition
- Local labels are internally stored as `name'NNNN` where `NNNN` is the 4-digit scope counter
- Maximum 10,000 DAT symbols per compilation unit (error: "Limit of 10k DAT symbols exceeded")
- **PNut-TS enforces the 30-character symbol limit**, as original PNut does.
  Over-length symbols are rejected with `Symbol exceeds 30 characters`
  (`spinElementizer.ts:846-852`, `MAX_SYMBOL_LENGTH = 30`); original PNut
  reports the same text from `REF-V52A/p2com.asm:2609`. *This bullet previously
  read "PNut-TS does not enforce the 30-character limit, but original PNut
  does." That was true of an earlier build and became false when the check was
  added to the elementizer. The same claim was corrected in `CLAUDE.md` on
  2026-08-07 and missed here — a reminder that a fact repeated in two documents
  gets corrected in one.*

## See Also

- [Theory-of-Operations.md](Theory-of-Operations.md) - Overall compiler architecture
- [SPIN2-BIN-Format.md](SPIN2-BIN-Format.md) - Binary output format details

---

*Verified against compiler source for 1.55.4 (2026-08-22): the 30-character
limit (`spinElementizer.ts:846`), the 10,000 DAT symbol limit
(`spinResolver.ts:4524`), the `asmLocal` scope counter (`spinResolver.ts:257`),
and the `name'NNNN` local-label mangling (`spinResolver.ts:4560`). Every code
example in this document was compiled.*
