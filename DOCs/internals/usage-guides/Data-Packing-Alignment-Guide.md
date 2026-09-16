# Data Packing and Alignment Guide for Spin2/PASM2

This document describes how PNut-TS packs data declared in `VAR` blocks, `DAT`
blocks, and PUB/PRI local variables for the Parallax Propeller 2 (P2)
microcontroller, and how to control alignment with `ALIGNW`/`ALIGNL` where the
default packing is not what you want.

## Overview

Spin2/PASM2 packs `BYTE`, `WORD`, and `LONG` data **sequentially, with no
automatic alignment to natural boundaries**. Unlike C, C++, or Rust, a `WORD`
or `LONG` declaration does not cause the compiler to insert padding before it
— it lands at whatever offset immediately follows the previous item.

There are exactly two exceptions, both automatic and neither optional:

- **VAR block end padding.** After all `VAR` blocks in an object have been
  compiled, the compiler advances to the next long boundary. This is what
  guarantees every object instance's data starts on a long boundary.
- **PASM2 instructions in cog/LUT (`ORG`) code.** Every assembled instruction
  is preceded by padding to the next long boundary — but only outside `ORGH`
  (hub) code, where instructions pack exactly like data, with no alignment at
  all.

Everywhere else — `BYTE`/`WORD`/`LONG` data in `VAR`, data in `DAT` (including
`ORGH` data and instructions), and PUB/PRI local variables — packing is purely
sequential. Use `ALIGNW` (align to the next even offset) or `ALIGNL` (align to
the next multiple of 4) wherever you need control.

| Declaration context | Auto-alignment | ALIGNW/ALIGNL available |
|---|---|---|
| `VAR` block (per item) | No | Yes |
| `VAR` block (end of last block) | Yes — to long | N/A |
| `DAT` block data (BYTE/WORD/LONG) | No | Yes |
| `DAT` block instructions, `ORG` (cog/LUT) | Yes — to long, before each instruction | Yes |
| `DAT` block instructions, `ORGH` (hub) | No | Yes |
| PUB/PRI local variables | No | Yes |

## Basic Usage

```spin2
VAR
  BYTE  v1        ' offset $04 (VAR space starts at 4, after the object pointer)
  BYTE  v2        ' offset $05 - immediately after v1
  WORD  w1        ' offset $06 - NOT word-aligned; it just follows v2
  LONG  l1        ' offset $08 - long-aligned here only by coincidence

PUB main()
  v1 := 0
```

Compiling this and checking the VAR offsets (`-m`, "VAR:" section, or the
`.lst` symbol table) shows exactly those four offsets. Nothing shifts `w1` or
`l1` to a rounder address — they sit wherever the previous item's size put
them. A minimal case makes this concrete: a single `BYTE` followed by a
`LONG` places the `LONG` at offset 1, not 4.

## Syntax / Forms

### VAR block packing

```spin2
VAR
  BYTE  status
  WORD  sensorValue
  LONG  timestamp
  BYTE  flags
```

`status` is at $04, `sensorValue` at $05, `timestamp` at $07, `flags` at $0B —
each item lands immediately after the previous one's declared size, with no
gap. `VAR` space itself always starts at offset $04: the first long ($00-$03)
is reserved for the object's own pointer.

STRUCT-typed members pack the same way: the struct's fields are laid out
according to the struct's own declaration, but the struct as a whole starts
wherever the previous `VAR` item left off — it is not itself pushed to a
boundary. A `BYTE` immediately followed by a two-field struct places the
struct at offset 1, not on a 4- or 8-byte boundary.

Multiple `VAR` blocks in one file behave as if concatenated: the second
block's first item continues immediately after the first block's last item,
with no boundary between them.

### VAR block end padding

After the *last* `VAR` block in the file has been compiled, the compiler pads
to the next long boundary:

```spin2
VAR
  BYTE  b1        ' offset $04
  BYTE  b2        ' offset $05
  ' compiler pads 2 bytes so the next object instance starts long-aligned
  ' total VAR size: 8 bytes ($04..$05 declared, $06-$07 padding, plus the
  ' leading $00-$03 object-pointer slot)
```

This end padding is the *only* implicit alignment inside a `VAR` block, and it
only ever applies once, after every declared item in every `VAR` block.

### DAT block data packing

```spin2
DAT
myByte    BYTE    $AA           ' offset 0
myWord    WORD    $BBCC         ' offset 1 - not word-aligned
myLong    LONG    $DDEEFF00     ' offset 3 - not long-aligned
```

`DAT` block data packs exactly like `VAR` block data: sequential, no automatic
alignment, in both `ORG` and `ORGH` sections.

### PASM2 instructions: `ORG` (cog/LUT) auto-aligns, `ORGH` does not

```spin2
DAT
            ORG     0                   ' cog (or LUT) code
dataByte    BYTE    $FF                 ' offset 0
            ' compiler pads 3 bytes here, unasked
entry       MOV     PA, #1              ' offset 4 - long-aligned
```

Every instruction assembled in `ORG` code is preceded by padding to the next
long boundary, whether or not you asked for it. Compiling this and inspecting
the raw bytes shows `$FF` at offset 0, three zero-padding bytes at offsets
1-3, and the assembled `MOV` instruction starting at offset 4.

The same source using `ORGH` instead of `ORG` shows no padding at all — the
instruction starts at offset 1, immediately after the single data byte:

```spin2
DAT
            ORGH                        ' hub code
dataByte    BYTE    $FF                 ' offset 0
entry       MOV     PA, #1              ' offset 1 - NOT aligned; ORGH never auto-pads
```

If a hub-executed routine needs its entry point (or any instruction) on a
long boundary, add `ALIGNL` explicitly before it.

### Local variable packing

Local variables in PUB/PRI methods pack the same way as `VAR`/`DAT` data —
sequentially, with no automatic alignment and no end-of-frame padding:

```spin2
PUB Example() | BYTE a, BYTE b, WORD c, LONG d
  ' a at offset 0
  ' b at offset 1
  ' c at offset 2 - NOT word-aligned
  ' d at offset 4 - long-aligned only because 2+2 happens to be a multiple of 4
```

### ALIGNW and ALIGNL

`ALIGNW` pads with zero bytes until the current offset is even
(`offset & 1 == 0`); `ALIGNL` pads until the offset is a multiple of 4
(`offset & 3 == 0`). Both are available in `VAR` blocks, `DAT` blocks (either
`ORG` or `ORGH`), and PUB/PRI local-variable lists:

```spin2
VAR
  ALIGNW              ' pad to the next even offset
  ALIGNL              ' pad to the next multiple-of-4 offset

DAT
  ALIGNW
  ALIGNL

PUB Method() | ALIGNW WORD x, ALIGNL LONG y
  ' ALIGNW pads before x; ALIGNL pads before y
```

Worked example, showing the padding at each step:

```spin2
VAR
  BYTE  v1        ' offset $04
  ALIGNW          ' $05 is odd -> pads 1 byte
  BYTE  v2        ' offset $06
  ALIGNL          ' $07 is not a multiple of 4 -> pads 1 byte
  BYTE  v3        ' offset $08
```

`ALIGNW`/`ALIGNL` is not allowed inside inline PASM (`ORG`/`END` within a
PUB/PRI method); the compiler rejects it with `ALIGNW/ALIGNL not allowed
within inline assembly code`.

## Patterns

### Structure-like VAR layout

Group same-sized fields together, and align explicitly where a boundary
matters to you:

```spin2
VAR
  ' header fields - tightly packed bytes
  BYTE  type
  BYTE  flags
  BYTE  reserved1
  BYTE  reserved2
  ' now at offset $08 - long-aligned here only because four bytes were used

  ' main data - explicitly aligned
  ALIGNL
  LONG  timestamp
  LONG  sequence
  WORD  length
  ALIGNL
  LONG  checksum
```

### Aligning the start of DAT tables

```spin2
DAT
            ALIGNL
sinTable    LONG    0[256]              ' long-aligned table start

            ALIGNW
pixelData   WORD    0[320]              ' word-aligned table start
```

### Word-align a dispatch table, then long-align what follows

A common idiom for a table of `WORD` pointers embedded in PASM code: word-align
before the table (so every entry lands on an even offset), then long-align
after it before resuming ordinary code:

```spin2
DAT
            ORG
            ' ...preceding code...
            ALIGNW
vectors     WORD    target0, target1, target2
            ALIGNL
resume      ' ...code continues here, long-aligned...
```

### Mixing alignment and unaligned locals

`ALIGNW`/`ALIGNL` only affects the one declaration it precedes — later
declarations on the same list are not re-aligned:

```spin2
PUB ExampleAligned() | BYTE a, ALIGNW BYTE b, ALIGNL WORD c, LONG d
  ' a at offset 0
  ' [1 byte padding - ALIGNW]
  ' b at offset 2 (word-aligned)
  ' [1 byte padding - ALIGNL]
  ' c at offset 4 (long-aligned)
  ' d at offset 6 - misaligned; ALIGNL only affected c
```

```spin2
PRI ProcessData() | BYTE status, ALIGNW WORD values[10], ALIGNL LONG result
  ' status at offset 0
  ' [1 byte padding - ALIGNW]
  ' values at offset 2 (word-aligned), occupies 20 bytes (10 words)
  ' [2 bytes padding - ALIGNL, from offset 22 to 24]
  ' result at offset 24 (long-aligned)
```

## Anti-patterns

### Assuming ORGH auto-aligns instructions like ORG does

```spin2
DAT
            ORGH
dataByte    BYTE    $FF
entry       MOV     PA, #1              ' WRONG assumption: this is NOT long-aligned
```

`ORGH` never inserts padding before an instruction — `entry` lands at offset 1,
immediately after `dataByte`. If your hub-exec routine (or anything jumping to
`entry` by a long-aligned assumption) needs it aligned, say so explicitly:

```spin2
DAT
            ORGH
dataByte    BYTE    $FF
            ALIGNL
entry       MOV     PA, #1              ' now genuinely long-aligned, at offset 4
```

### Assuming ALIGNL fixes damage that already happened

```spin2
VAR
  LONG  a
  BYTE  b
  ALIGNL       ' pads to the next multiple of 4 - but b itself is already placed
  LONG  c      ' c is long-aligned; b was NEVER re-aligned, and can't be
```

`ALIGNL`/`ALIGNW` only pad the offset *before* the next declaration — they
cannot move something already declared. If `b` itself needed to start on a
particular boundary, the `ALIGNL` had to come before `b`, not after it.

### Mis-adding declared size and end padding to predict total VAR size

It is tempting to compute a `VAR` block's total size as "sum of declared
sizes, plus a guessed end-padding amount." That guess is easy to get wrong,
because the actual end padding depends on where the last declared item
happened to land — and the total also includes the leading 4-byte
object-pointer slot that every `VAR` block reserves before its first
declaration:

```spin2
VAR
  BYTE  status          ' $04
  WORD  sensorValue      ' $05
  LONG  timestamp        ' $07
  BYTE  flags            ' $0B
```

Declared sizes total 8 bytes (1+2+4+1). The last item ends at offset $0C,
which is *already* long-aligned, so end padding is 0 — total VAR size is 12
bytes ($04 leading + 8 declared + 0 padding), not "8 declared + a fixed 4-byte
pad." Insert `ALIGNW`/`ALIGNL` and the arithmetic changes again:

```spin2
VAR
  BYTE  status          ' $04
  ALIGNW
  WORD  sensorValue      ' $06 - 1 byte of ALIGNW padding
  ALIGNL
  LONG  timestamp        ' $08 - 0 bytes of ALIGNL padding (already aligned)
  BYTE  flags            ' $0C
```

Here the last item ends at offset $0D, which needs 3 bytes to reach the next
long boundary — total VAR size is 16 bytes (4 leading + 8 declared + 1 ALIGNW
padding + 0 ALIGNL padding + 3 end padding). There is no shortcut formula;
work the offsets forward one declaration at a time, the same way the compiler
does.

## Summary Table

| Directive | Effect | Pads until |
|---|---|---|
| `ALIGNW` | Word-align the next item | `offset & 1 == 0` |
| `ALIGNL` | Long-align the next item | `offset & 3 == 0` |

| Context | Starting offset | Per-item alignment | End-of-block alignment |
|---|---|---|---|
| `VAR` block | $04 (after the object pointer) | None | Long, after the last `VAR` block |
| `DAT` block data | Continues object's running offset | None | None |
| `DAT` block instructions, `ORG` (cog/LUT) | Continues object's running offset | Long, before every instruction | N/A |
| `DAT` block instructions, `ORGH` (hub) | Continues object's running offset | None | None |
| PUB/PRI local variables | 0 | None | None |

`ALIGNW`/`ALIGNL` work in every one of these contexts except inside inline PASM
(`ORG`/`END` within a method), where they are rejected with `ALIGNW/ALIGNL not
allowed within inline assembly code`.

## Related Documentation

- [ORG-Directives-Usage-Guide.md](ORG-Directives-Usage-Guide.md) - `ORG`/`ORGH`/`ORGF` and the cog/LUT/hub addressing they select
- [RES-FIT-END-Usage-Guide.md](RES-FIT-END-Usage-Guide.md) - `RES`, `FIT`, and `END`, the other PASM2 directives that interact with cog addressing
- [STRUCT-Usage-Guide.md](STRUCT-Usage-Guide.md) - declaring STRUCT types and their own internal field layout
- [BYTE-WORD-LONG-Usage-Guide.md](BYTE-WORD-LONG-Usage-Guide.md) - `BYTE`/`WORD`/`LONG` as type specifiers, including comma-list "sticky type" rules
- [Addressing-Usage-Guide.md](Addressing-Usage-Guide.md) - what `@`/`@@` return for VAR, DAT, and local-variable symbols
