# ORG Directives Usage Guide for Spin2/PASM2

This document describes the `ORG`, `ORGH`, and `ORGF` directives in the Spin2 and PASM2 languages for the Parallax Propeller 2 (P2) microcontroller as implemented in the PNut-TS compiler.

## Overview

The P2 has two distinct memory spaces where code and data can reside:

1. **COG/LUT RAM** - Fast, local memory within each cog (512 longs COG + 512 longs LUT)
2. **Hub RAM** - Shared memory accessible by all cogs (up to 1MB)

The ORG directives control which memory space you're targeting and where within that space your code/data will be placed.

| Directive | Memory Space | Purpose |
|-----------|-------------|---------|
| `ORG` | COG/LUT RAM | Set origin for cog-executable code |
| `ORGH` | Hub RAM | Set origin for hub-resident code/data |
| `ORGF` | COG/LUT RAM | Fill with zeros to reach target address |

---

## The $ Symbol (Current Origin)

Within DAT blocks, the `$` symbol represents the current origin address:

- **In COG mode** (after `ORG`): `$` returns the current COG address in longs (0-$3FF)
- **In Hub mode** (after `ORGH`): `$` returns the current Hub address in bytes

```spin2
DAT
        ORG     0
        ' $  = 0 (COG address 0)
        NOP
        ' $  = 1 (COG address 1)

        ORGH    $400
        ' $  = $400 (Hub address $400)
        BYTE    0
        ' $  = $401 (Hub address $401)
```

---

## ORG - COG/LUT RAM Origin

### Syntax

```spin2
ORG                         ' Reset to COG address 0, limit $1F8
ORG address                 ' Set COG address, auto-calculate limit
ORG address, limit          ' Set COG address and limit
```

### Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `address` | 0 to $400 | Starting COG/LUT address (in longs) |
| `limit` | 0 to $400 | Maximum address for FIT checking |

### Behavior

1. **Without parameters** (`ORG`):
   - Sets COG address to 0
   - Sets limit to $1F8 (standard COG RAM limit)

2. **With address only** (`ORG address`):
   - Sets COG address to specified value
   - Auto-calculates limit:
     - If address < $200: limit = $200 (COG RAM boundary)
     - If address >= $200: limit = $400 (LUT RAM boundary)

3. **With address and limit** (`ORG address, limit`):
   - Sets COG address to specified value
   - Sets limit to specified value

### Memory Regions

| Address Range | Memory | Notes |
|---------------|--------|-------|
| $000 - $1EF | COG RAM | General purpose registers |
| $1F0 - $1FF | COG RAM | Special purpose registers (PR0-PR7, etc.) |
| $200 - $3FF | LUT RAM | Lookup table / additional code space |

### Examples

```spin2
DAT
        ORG                     ' Start at COG address 0

entry   MOV     PA, #1          ' Address $000
        ADD     PA, #1          ' Address $001
        JMP     #entry          ' Address $002

        FIT     $1F0            ' Verify code fits in user COG space
```

```spin2
DAT
        ORG     $100            ' Start at COG address $100

routine MOV     temp, PA        ' Address $100
        RET                     ' Address $101

temp    RES     1               ' Address $102
```

```spin2
DAT
        ORG     $200            ' Start in LUT RAM

lut_code
        MOV     PA, #0          ' LUT address $200
        RET                     ' LUT address $201

        FIT     $400            ' Verify fits in LUT
```

---

## ORGH - Hub RAM Origin

### Syntax

```spin2
ORGH                        ' Reset to current hub position (or $400)
ORGH address                ' Set hub address
ORGH address, limit         ' Set hub address and limit
```

### Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `address` | $400 to $100000 | Starting hub address (in bytes) |
| `limit` | address to $100000 | Maximum address for checking |

### Behavior

1. **Without parameters** (`ORGH`):
   - In Spin2 objects: Sets hub address to $400 (after interpreter)
   - In PASM-only objects: Sets hub address to current object position
   - Sets limit to $100000 (1MB)

2. **With address only** (`ORGH address`):
   - In Spin2 objects: Address must be >= $400
   - Sets hub address to specified value
   - In PASM-only mode: Pads with zeros to reach the address

3. **With address and limit** (`ORGH address, limit`):
   - Sets hub address to specified value
   - Sets limit to specified value

### Address Constraints

| Context | Minimum | Maximum |
|---------|---------|---------|
| Spin2 objects | $400 | $100000 |
| PASM-only objects | 0 | $100000 |

The $400 minimum for Spin2 objects reserves space for the Spin2 interpreter.

### Examples

```spin2
DAT
        ORGH                    ' Hub mode at default address

' Bytecode or hub data here
stopcog BYTE    bc_cogid & $FF
        BYTE    bc_cogstop & $FF
```

```spin2
DAT
        ORGH    $1000           ' Start at hub address $1000

hubData LONG    $DEADBEEF       ' Hub address $1000
        LONG    $CAFEBABE       ' Hub address $1004
```

```spin2
DAT
        ORGH    $400, $800      ' Hub from $400 to $800 limit

        BYTE    0[1024]         ' 1KB of data
        FIT     $800            ' Verify fits within limit
```

---

## ORGF - Fill to Address (COG Mode Only)

### Syntax

```spin2
ORGF address                ' Fill with zeros to reach address
```

### Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `address` | current to limit | Target COG address to fill to |

### Behavior

- Pads the current position with zero bytes until reaching the target address
- Only works in COG mode (not valid in ORGH mode)
- Target address must be >= current address
- Target address must be <= current limit

### Purpose

ORGF is used to:
1. Ensure specific code/data lands at exact addresses
2. Create gaps in COG RAM for specific purposes
3. Align data structures at known locations

### Examples

```spin2
DAT
        ORG     0

' Code section
entry   MOV     PA, #1
        JMP     #main

        ORGF    $10             ' Fill to address $10

' Data section starts exactly at $10
data    LONG    0[4]            ' Addresses $10-$13
```

```spin2
DAT
        ORG     $120

' Variable operator bytecodes must be at $27A
        ' ... earlier code ...

        ORGF    $27A            ' Pad to exactly $27A

bc_repeat_var   LONG    repvarin    ' At exactly $27A
bc_get_field    LONG    var_ptr     ' At exactly $27B
```

---

## Switching Between Modes

A DAT block can switch between COG and Hub modes multiple times:

```spin2
DAT
        ORGH                    ' Hub mode: bytecode tables

bc_vectors
        WORD    @routine1
        WORD    @routine2

        ALIGNL

        ORG     $100            ' COG mode: register code

routine1
        MOV     PA, #1
        RET

routine2
        MOV     PA, #2
        RET

        ORGH                    ' Back to hub mode

hub_data
        LONG    $12345678
```

### Mode Indicator: hubMode

Internally, the compiler tracks a `hubMode` flag:
- `hubMode = false`: In COG mode (ORG active)
- `hubMode = true`: In Hub mode (ORGH active)

DAT blocks start in Hub mode by default.

---

## Address References with @

The `@` operator returns the hub address of a label:

```spin2
DAT
        ORGH    $400

hubLabel
        LONG    0

        ORG     0

cogCode MOV     PA, ##@hubLabel ' Get hub address of hubLabel
        RDLONG  temp, PA        ' Read from hub
        RET

temp    RES     1
```

---

## Interaction with Other Directives

### FIT - Verify Code Fits

```spin2
DAT
        ORG     0

        ' ... code ...

        FIT     $1F0            ' Error if code exceeds $1F0
```

```spin2
DAT
        ORGH    $400

        ' ... data ...

        FIT     $800            ' Error if data exceeds $800
```

### RES - Reserve COG Space

RES only works in COG mode:

```spin2
DAT
        ORG     0

entry   MOV     temp, #0
        RET

temp    RES     1               ' Reserve 1 long in COG RAM
buffer  RES     16              ' Reserve 16 longs
```

### ALIGNW / ALIGNL

Alignment works in both modes:

```spin2
DAT
        ORGH

        BYTE    $AA
        ALIGNW                  ' Align to word boundary
        WORD    $BBCC
        ALIGNL                  ' Align to long boundary
        LONG    $DDEEFF00
```

---

## Restrictions

### ORG Restrictions

| Restriction | Error Message |
|-------------|--------------|
| Inside inline assembly | `ORG not allowed within inline assembly code` |
| Inside DITTO block | `ORG not allowed within a DITTO block` |
| Address > $400 | `Cog address exceeds $400 limit` |
| Limit > $400 | `Cog address exceeds $400 limit` |
| Address > limit (`ORG start, limit`) | `Cog address exceeds limit` |
| Cannot precede with symbol | `This directive cannot be preceded by a symbol` |

### ORGH Restrictions

| Restriction | Error Message |
|-------------|--------------|
| Inside inline assembly | `ORGH not allowed within inline assembly code` |
| Inside DITTO block | `ORGH not allowed within a DITTO block` |
| Address < $400 (Spin2) | `Hub address below $400 limit` |
| Address > $100000 | `Hub address exceeds $100000 ceiling` |
| Address decrease (PASM) | `Hub address cannot decrease` |
| Limit < address | `Hub address exceeds limit` |
| Cannot precede with symbol | `This directive cannot be preceded by a symbol` |

### ORGF Restrictions

| Restriction | Error Message |
|-------------|--------------|
| In ORGH mode | `ORGF is not allowed in ORGH mode` |
| Target < current | `Origin already exceeds target` |
| Target > limit | `Cog address exceeds limit` |
| Cannot precede with symbol | `This directive cannot be preceded by a symbol` |

---

## Common Patterns

### 1. Standard COG Program

```spin2
DAT
        ORG     0

entry   ASMCLK                  ' Set clock
        ' ... main code ...
        JMP     #entry

        FIT     $1F0            ' Ensure user area only
```

### 2. COG + LUT Code

```spin2
DAT
        ORG     0               ' COG RAM

main    SETQ2   #lut_code_len-1
        RDLONG  $200, ##@lut_code   ' Load LUT code from hub
        CALL    #$200           ' Call LUT routine
        JMP     #main

        FIT     $1F0

        ORG     $200            ' LUT RAM

lut_routine
        MOV     PA, #42
        RET     WCZ

lut_code_len = $ - $200

        ORGH                    ' Hub: LUT code image

lut_code
        ORG     $200
        MOV     PA, #42
        RET     WCZ
```

### 3. Hub Data Tables

```spin2
DAT
        ORGH    $400

sinTable
        LONG    0, 100, 199, 296    ' Sine lookup values
        LONG    389, 479, 565, 644
        ' ... more values ...

cosTable
        LONG    1000, 995, 980, 956
        ' ... more values ...
```

### 4. Spin2 Object with PASM

```spin2
PUB Start()
  coginit(NEWCOG, @entry, 0)

DAT
        ORG     0

entry   ASMCLK
        DRVH    #56             ' Drive pin 56 high
.loop   JMP     #.loop
```

### 5. PASM-Only Program

```spin2
DAT
        ORG     0

        ASMCLK
        COGINIT #$10, #main     ' Start main cog
        COGID   PA
        COGSTOP PA              ' Stop loader cog

main    DRVH    #56
.loop   JMP     #.loop
```

---

## Memory Layout Reference

### P2 Memory Map

```
$00000 - $003FF     Reserved for Spin2 interpreter (in Spin2 objects)
$00400 - $FFFFF     Hub RAM (available for code/data)

COG Internal:
$000 - $1EF         General purpose registers
$1F0 - $1FF         Special registers (PR0-PR7, IJMP3, IRET3, etc.)
$200 - $3FF         LUT RAM
```

### Default Limits

| Mode | Default Start | Default Limit |
|------|---------------|---------------|
| ORG (no params) | $000 | $1F8 |
| ORG address (< $200) | address | $200 |
| ORG address (>= $200) | address | $400 |
| ORGH (Spin2) | $400 | $100000 |
| ORGH (PASM-only) | current offset | $100000 |

---

## Summary

| Directive | Mode | Address Type | Usage |
|-----------|------|--------------|-------|
| `ORG` | COG/LUT | Long addresses | Execute code from COG RAM |
| `ORGH` | Hub | Byte addresses | Store code/data in Hub RAM |
| `ORGF` | COG only | Long addresses | Pad to specific address |
| `$` | Both | Mode-dependent | Current origin address |

### Quick Reference

```spin2
DAT
        ORG                     ' COG mode, address 0
        ORG     $100            ' COG mode, address $100
        ORG     $200, $400      ' LUT mode, limit $400

        ORGH                    ' Hub mode, default address
        ORGH    $1000           ' Hub mode, address $1000
        ORGH    $1000, $2000    ' Hub mode, limit $2000

        ORGF    $100            ' Pad to COG address $100
```

---

*This document describes ORG, ORGH, and ORGF directive usage in Spin2/PASM2 as implemented in the PNut-TS compiler.*
