# PASM2 Assembly Language Authoring Guide

This comprehensive guide provides essential knowledge for writing PASM2 (Propeller 2 Assembly) code. It covers memory architecture, operand encoding, condition codes, expression evaluation, symbol management, and error conditions as implemented in the PNut-TS compiler.

---

## Table of Contents

1. [Memory Model and Address Spaces](#1-memory-model-and-address-spaces)
2. [Special Registers](#2-special-registers)
3. [Operand Encoding](#3-operand-encoding)
4. [PTRx Addressing Modes](#4-ptrx-addressing-modes)
5. [Condition Codes](#5-condition-codes)
6. [Instruction Effects](#6-instruction-effects)
7. [Expression Evaluation](#7-expression-evaluation)
8. [Symbols and Labels](#8-symbols-and-labels)
9. [Built-in Constants](#9-built-in-constants)
10. [Error Conditions and Constraints](#10-error-conditions-and-constraints)

---

## 1. Memory Model and Address Spaces

### 1.1 P2 Memory Architecture

The Propeller 2 has three distinct memory regions:

| Memory Region | Address Range | Size | Access |
|---------------|---------------|------|--------|
| COG RAM | $000 - $1FF | 512 longs (2KB) | Fastest, local to each cog |
| LUT RAM | $200 - $3FF | 512 longs (2KB) | Fast, local to each cog |
| Hub RAM | $00000 - $FFFFF | 1MB | Shared between all cogs |

### 1.2 COG RAM Layout

```
$000 - $1EF  General Purpose Registers (496 longs)
$1F0 - $1FF  Special Purpose Registers (16 longs)
```

**Special Purpose Register Addresses:**

| Address | Register | Description |
|---------|----------|-------------|
| $1F0 | IJMP3 | Interrupt 3 jump address |
| $1F1 | IRET3 | Interrupt 3 return address |
| $1F2 | IJMP2 | Interrupt 2 jump address |
| $1F3 | IRET2 | Interrupt 2 return address |
| $1F4 | IJMP1 | Interrupt 1 jump address |
| $1F5 | IRET1 | Interrupt 1 return address |
| $1F6 | PA | Pin group A / general purpose |
| $1F7 | PB | Pin group B / general purpose |
| $1F8 | PTRA | Pointer register A |
| $1F9 | PTRB | Pointer register B |
| $1FA | DIRA | Direction register A (pins 0-31) |
| $1FB | DIRB | Direction register B (pins 32-63) |
| $1FC | OUTA | Output register A |
| $1FD | OUTB | Output register B |
| $1FE | INA | Input register A (read-only) |
| $1FF | INB | Input register B (read-only) |

### 1.3 LUT RAM

LUT RAM ($200-$3FF) provides additional local storage:
- Can be used for code or data
- Accessible via RDLUT/WRLUT instructions
- Can be shared between two cogs via SETLUTS

### 1.4 Hub RAM Layout

```
$00000 - $003FF  Reserved (Spin2 interpreter in Spin2 objects)
$00400 - $FFFFF  Available for code/data (1MB - 1KB)
```

**Key Hub Addresses:**

| Address | Purpose |
|---------|---------|
| $00044 | CLKFREQ storage location |
| $00400 | Default ORGH start address (Spin2 mode) |

### 1.5 Address Mode Differences

| Mode | Origin Directive | Address Unit | Limit Constant |
|------|------------------|--------------|----------------|
| COG | `ORG` | Longs | $200 (COG) or $400 (COG+LUT) |
| Hub | `ORGH` | Bytes | $100000 |

### 1.6 Default Limits

| Context | Default Start | Default Limit |
|---------|---------------|---------------|
| ORG (no params) | $000 | $1F8 |
| ORG address (<$200) | address | $200 |
| ORG address (>=$200) | address | $400 |
| ORGH (Spin2) | $400 | $100000 |
| ORGH (PASM-only) | current offset | $100000 |
| Inline ORG | 0 | $120 |

---

## 2. Special Registers

### 2.1 Pointer Registers

**PTRA ($1F8) and PTRB ($1F9)** are 20-bit address registers for Hub memory access:

```spin2
' Basic usage
        MOV     PTRA, ##hubAddress    ' Load hub address
        RDLONG  value, PTRA           ' Read from hub
        WRLONG  value, PTRA           ' Write to hub
```

### 2.2 Pin Group Registers

**PA ($1F6) and PB ($1F7)** serve dual purposes:
1. Pin group selection for smart pin instructions
2. General-purpose 32-bit registers

```spin2
' Pin group usage
        MOV     PA, #0                ' Select pin 0
        WXPIN   mode, PA              ' Configure pin 0

' General purpose
        MOV     PA, value             ' Use as scratch register
```

### 2.3 Direction and Output Registers

| Register | Address | Pins | Notes |
|----------|---------|------|-------|
| DIRA | $1FA | 0-31 | 1=output, 0=input |
| DIRB | $1FB | 32-63 | 1=output, 0=input |
| OUTA | $1FC | 0-31 | Output state |
| OUTB | $1FD | 32-63 | Output state |
| INA | $1FE | 0-31 | Read-only input state |
| INB | $1FF | 32-63 | Read-only input state |

### 2.4 Interrupt Registers

Three interrupt levels with jump and return addresses:

| Level | Jump Register | Return Register |
|-------|---------------|-----------------|
| INT1 | IJMP1 ($1F4) | IRET1 ($1F5) |
| INT2 | IJMP2 ($1F2) | IRET2 ($1F3) |
| INT3 | IJMP3 ($1F0) | IRET3 ($1F1) |

---

## 3. Operand Encoding

### 3.1 Immediate Value Prefixes

| Prefix | Name | Range | Encoding |
|--------|------|-------|----------|
| `#` | Immediate | 0-511 | 9-bit value in S field |
| `##` | Extended Immediate | 0-$FFFFF | 23-bit AUGS + 9-bit S |

### 3.2 Automatic Augmentation (AUGS/AUGD)

When immediate values exceed 9 bits, the compiler automatically inserts augmentation instructions:

**AUGS (Source Augmentation):**
- Opcode: `0x0F000000`
- Extends S-field values to 32 bits
- Inserted before instruction using `##value`

**AUGD (Destination Augmentation):**
- Opcode: `0x0F800000`
- Extends D-field values to 32 bits
- Used with `##` in destination position

```spin2
' 9-bit immediate (no augmentation needed)
        MOV     reg, #255             ' Fits in 9 bits

' Extended immediate (AUGS automatically inserted)
        MOV     reg, ##$12345         ' Compiler inserts: AUGS $12345>>9
                                      '                   MOV reg, #$12345 & $1FF
```

### 3.3 Address Operators

| Operator | Description | Context | Example |
|----------|-------------|---------|---------|
| `#` | Immediate value | S operand | `MOV x, #100` |
| `##` | Extended immediate | S operand | `MOV x, ##$12345` |
| `@` | Hub address of symbol | DAT/Spin2 | `MOV ptr, ##@label` |
| `\` | Absolute (forces PBASE add) | PASM | `LONG \value` |
| `@@` | Object-relative address | Spin2 | `@@symbol` |

### 3.4 Operand Types

The compiler defines specific operand types for different instruction formats:

| Type | Description | Usage |
|------|-------------|-------|
| operand_ds | D and S fields | Most ALU instructions |
| operand_d | D field only | Single-operand instructions |
| operand_du | D unsigned immediate | Special cases |
| operand_l | Long (20-bit) address | Branch/call instructions |
| operand_ls | Long source | Hub memory instructions |
| operand_dsp | D/S with PTRx support | Memory operations |
| operand_lsp | Long with PTRx support | Hub operations |
| operand_cz | C/Z modification | MODCZ instruction |

### 3.5 S-Operand Encoding

S-operand field (bits 8:0) encoding:

```
Bits [8:0] = S value (0-511)
Bit [18] = I flag (1 = immediate mode)
```

When I=1 (immediate):
- S field contains literal value (0-511)
- For larger values, AUGS prefix extends to 32 bits

When I=0 (register):
- S field contains register address (0-$1FF)

---

## 4. PTRx Addressing Modes

### 4.1 Overview

PTRA and PTRB support various addressing modes for hub memory access:

### 4.2 Simple Addressing

```spin2
        RDLONG  value, PTRA           ' Read from address in PTRA
        WRLONG  value, PTRB           ' Write to address in PTRB
```

### 4.3 Indexed Addressing

**Pre-indexed (offset applied before access):**

```spin2
        RDLONG  value, PTRA[5]        ' Read from PTRA + 5*4 (5 longs offset)
        RDLONG  value, PTRA[-3]       ' Read from PTRA - 3*4 (negative offset)
```

Index range: -32 to +31 (6-bit signed)

**Extended index:**

```spin2
        RDLONG  value, PTRA[##offset] ' Read with extended offset (20-bit)
```

### 4.4 Post-Modification

**Post-increment:**

```spin2
        RDLONG  value, PTRA++         ' Read, then PTRA += 4
        RDLONG  value, PTRA++[4]      ' Read, then PTRA += 4*4 (16 bytes)
```

**Post-decrement:**

```spin2
        RDLONG  value, PTRA--         ' Read, then PTRA -= 4
        RDLONG  value, PTRA--[2]      ' Read, then PTRA -= 2*4 (8 bytes)
```

Post-modification range: 1 to 16 longs

### 4.5 Pre-Modification

**Pre-increment:**

```spin2
        RDLONG  value, ++PTRA         ' PTRA += 4, then read
        RDLONG  value, ++PTRA[4]      ' PTRA += 4*4, then read
```

**Pre-decrement:**

```spin2
        RDLONG  value, --PTRA         ' PTRA -= 4, then read
        RDLONG  value, --PTRA[2]      ' PTRA -= 2*4, then read
```

### 4.6 PTRx Encoding Summary

| Mode | Syntax | Index Range | Modification |
|------|--------|-------------|--------------|
| Simple | `PTRA` | N/A | None |
| Indexed | `PTRA[n]` | -32 to +31 | None |
| Extended | `PTRA[##n]` | 20-bit | None |
| Post-inc | `PTRA++[n]` | 1 to 16 | After access |
| Post-dec | `PTRA--[n]` | 1 to 16 | After access |
| Pre-inc | `++PTRA[n]` | 1 to 16 | Before access |
| Pre-dec | `--PTRA[n]` | 1 to 16 | Before access |

---

## 5. Condition Codes

### 5.1 Complete Condition Code Table

| Value | Base Name | Primary | Aliases | Condition |
|-------|-----------|---------|---------|-----------|
| $0 | if_ret | _RET_ | - | Never (return) |
| $1 | if_nc_and_nz | IF_NC_AND_NZ | IF_NZ_AND_NC, IF_GT, IF_A | NC AND NZ |
| $2 | if_nc_and_z | IF_NC_AND_Z | IF_Z_AND_NC | NC AND Z |
| $3 | if_nc | IF_NC | IF_GE, IF_AE | NOT Carry |
| $4 | if_c_and_nz | IF_C_AND_NZ | IF_NZ_AND_C | C AND NZ |
| $5 | if_nz | IF_NZ | IF_NE | NOT Zero |
| $6 | if_c_ne_z | IF_C_NE_Z | IF_Z_NE_C, IF_DIFF | C XOR Z |
| $7 | if_nc_or_nz | IF_NC_OR_NZ | IF_NZ_OR_NC | NC OR NZ |
| $8 | if_c_and_z | IF_C_AND_Z | IF_Z_AND_C, IF_SAME | C AND Z |
| $9 | if_c_eq_z | IF_C_EQ_Z | IF_Z_EQ_C | C XNOR Z |
| $A | if_z | IF_Z | IF_E | Zero |
| $B | if_nc_or_z | IF_NC_OR_Z | IF_Z_OR_NC, IF_LE, IF_BE | NC OR Z |
| $C | if_c | IF_C | IF_LT, IF_B | Carry |
| $D | if_c_or_nz | IF_C_OR_NZ | IF_NZ_OR_C | C OR NZ |
| $E | if_c_or_z | IF_C_OR_Z | IF_Z_OR_C | C OR Z |
| $F | if_always | IF_ALWAYS | - | Always |

### 5.2 Binary Pattern Aliases

Alternative names based on C/Z bit patterns:

| Alias | C | Z | Equivalent |
|-------|---|---|------------|
| IF_00 | 0 | 0 | IF_NC_AND_NZ |
| IF_01 | 0 | 1 | IF_NC_AND_Z |
| IF_10 | 1 | 0 | IF_C_AND_NZ |
| IF_11 | 1 | 1 | IF_C_AND_Z |
| IF_X0 | X | 0 | IF_NZ |
| IF_X1 | X | 1 | IF_Z |
| IF_0X | 0 | X | IF_NC |
| IF_1X | 1 | X | IF_C |
| IF_NOT_00 | - | - | IF_C_OR_Z |
| IF_NOT_01 | - | - | IF_C_OR_NZ |
| IF_NOT_10 | - | - | IF_NC_OR_Z |
| IF_NOT_11 | - | - | IF_NC_OR_NZ |

### 5.3 Comparison Aliases

For arithmetic comparisons (unsigned):

| Condition | Alias | Meaning |
|-----------|-------|---------|
| IF_C | IF_B, IF_LT | Below / Less Than |
| IF_NC | IF_AE, IF_GE | Above or Equal / Greater or Equal |
| IF_NC_AND_NZ | IF_A, IF_GT | Above / Greater Than |
| IF_NC_OR_Z | IF_BE, IF_LE | Below or Equal / Less or Equal |
| IF_Z | IF_E | Equal |
| IF_NZ | IF_NE | Not Equal |

### 5.4 MODCZ Constants

For the MODCZ instruction (underscore prefix):

```spin2
' Set C and Z to specific values
        MODCZ   _CLR, _SET            ' C=0, Z=1
        MODCZ   _C, _Z                ' C=C, Z=Z (no change)
        MODCZ   _NC, _NZ              ' C=!C, Z=!Z (invert)
```

### 5.5 Instruction Encoding

Condition codes occupy bits [31:28] of the instruction word:

```
Bits [31:28] = Condition (0-15)
```

---

## 6. Instruction Effects

### 6.1 Basic Effects

Effects control whether instructions update the C and Z flags:

| Effect | Bits | Description |
|--------|------|-------------|
| (none) | 00 | No flag update |
| WZ | 01 | Update Z flag |
| WC | 10 | Update C flag |
| WCZ | 11 | Update both flags |

**Encoding:** Bits [20:19] of instruction word

### 6.2 Extended Effects

Extended effects combine logic operations with flag updates:

| Effect | Encoding | Operation |
|--------|----------|-----------|
| ANDC | 0110 | C = C AND result_C |
| ANDZ | 0101 | Z = Z AND result_Z |
| ORC | 1010 | C = C OR result_C |
| ORZ | 1001 | Z = Z OR result_Z |
| XORC | 1110 | C = C XOR result_C |
| XORZ | 1101 | Z = Z XOR result_Z |

**Encoding:** Bits [21:18] contain logic operation and effect target

### 6.3 Effect Syntax

```spin2
' Basic effects
        ADD     x, y    WC            ' Update carry
        ADD     x, y    WZ            ' Update zero
        ADD     x, y    WCZ           ' Update both

' Extended effects (for specific instructions)
        TESTP   #pin    ANDC          ' AND pin state with C
        TESTP   #pin    ORC           ' OR pin state with C
        TESTP   #pin    XORC          ' XOR pin state with C
```

### 6.4 Effect Restrictions

Not all instructions support all effects. Invalid combinations produce:
- `"This effect is not allowed for this instruction"`

NOP has special restrictions:
- `"NOP cannot have a condition or _RET_"`

---

## 7. Expression Evaluation

### 7.1 Operator Precedence

Operators listed from highest precedence (0) to lowest (14):

**Precedence 0 (Highest) - Unary:**
```
-  !  ABS  FABS  ENCOD  DECOD  BMASK  ONES
SQRT  FSQRT  QLOG  QEXP  LOG2  LOG10  LOG  EXP2  EXP10  EXP
```

**Precedence 1 - Shift/Rotate:**
```
>>  <<  SAR  ROR  ROL  REV  ZEROX  SIGNX
```

**Precedence 2-4 - Bitwise:**
```
&     (precedence 2)
^     (precedence 3)
|     (precedence 4)
```

**Precedence 5 - Multiplicative:**
```
*  *.  /  /.  +/  //  +//  SCA  SCAS  FRAC
```

**Precedence 6 - Additive:**
```
+  +.  -  -.  POW
```

**Precedence 7-8 - Special:**
```
#>  <#              (precedence 7 - min/max)
ADDBITS  ADDPINS    (precedence 8)
```

**Precedence 9 - Comparison:**
```
<  <.  +<  <=  <=.  +<=  ==  ==.  <>  <>.
>=  >=.  +>=  >  >.  +>  <=>
```

**Precedence 10-13 - Logical:**
```
!!  NOT             (precedence 10)
&&  AND             (precedence 11)
^^  XOR             (precedence 12)
||  OR              (precedence 13)
```

**Precedence 14 (Lowest) - Ternary:**
```
? :
```

### 7.2 Numeric Constants

| Format | Prefix | Example | Description |
|--------|--------|---------|-------------|
| Decimal | (none) | `123` | Base 10 |
| Hexadecimal | `$` | `$DEAD` | Base 16 |
| Binary | `%` | `%1010` | Base 2 |
| Quaternary | `%%` | `%%0213` | Base 4 |
| Packed ASCII | `%"` | `%"ABCD"` | 1-4 chars to long |
| Character | `"` | `"A"` | Single ASCII value |

**Separators:** Underscores allowed for readability: `$DEAD_BEEF`, `%1010_0011`

### 7.3 Floating-Point Constants

```spin2
        LONG    3.14159               ' Decimal float
        LONG    1.23e-4               ' Scientific notation
        LONG    $40490FDB             ' Hex representation of PI
```

**Conversion Functions:**
- `FLOAT(integer)` - Convert to float
- `ROUND(float)` - Round to nearest integer
- `TRUNC(float)` - Truncate to integer

### 7.4 Special Address Symbols

| Symbol | Context | Description |
|--------|---------|-------------|
| `$` | DAT block | Current COG/Hub origin address |
| `$$` | DITTO block | Current iteration index (0 to count-1) |

```spin2
DAT     ORG
        JMP     #$                    ' Jump to self (infinite loop)
        JMP     #$-1                  ' Jump back 1 instruction

        DITTO   4
        LONG    $$ * 100              ' Generates 0, 100, 200, 300
        DITTO   END
```

---

## 8. Symbols and Labels

### 8.1 Symbol Naming Rules

**Valid Characters:**
- First character: A-Z, a-z, or underscore (_)
- Subsequent: A-Z, a-z, 0-9, or underscore (_)

**Case Sensitivity:** Symbols are case-insensitive (internally converted to uppercase)

**Maximum Length:** 30 characters (`Symbol exceeds 30 characters` beyond that; PNut-TS enforces the same limit as PNut)

**Examples:**
```spin2
' Valid symbols
myLabel
MY_LABEL
_private
loop1
_1st

' Invalid symbols
1start        ' Cannot start with digit
my-label      ' Hyphen not allowed
my.label      ' Dot not allowed (except for local labels)
```

### 8.2 Global Labels

Global labels are defined at the start of a line without prefix:

```spin2
DAT     ORG

init_routine
        MOV     x, #0
        RET

main_loop
        CALL    #init_routine
        JMP     #main_loop
```

**Characteristics:**
- Visible throughout entire DAT block
- Can be referenced from Spin2 via `@labelname`
- Defining a global label starts a new local scope

### 8.3 Local Labels

Local labels use dot (`.`) or colon (`:`) prefix:

```spin2
DAT     ORG

send_byte
        MOV     bits, #8
.loop   SHL     data, #1      WC      ' Local to send_byte
        DRVC    #tx_pin
        DJNZ    bits, #.loop
        RET

recv_byte
        MOV     bits, #8
.loop   TESTP   #rx_pin       WC      ' Different .loop (new scope)
        RCL     data, #1
        DJNZ    bits, #.loop
        RET
```

**Characteristics:**
- Visible only until next global label
- Same local name can be reused in different scopes
- Prefer `.` notation (`:` is legacy)

### 8.4 Internal Label Storage

Local labels are internally mangled as `name'NNNN`:
- `NNNN` is a 4-digit scope counter (0001-9999)
- Counter increments with each global label
- Maximum 10,000 DAT symbols per file

### 8.5 Label Reference Operators

| Syntax | Description | Example |
|--------|-------------|---------|
| `#label` | Immediate (COG address) | `JMP #label` |
| `#.local` | Immediate local label | `CALL #.helper` |
| `#\label` | Absolute COG-relative | `JMP #\label` |
| `@label` | Hub address of label | `MOV ptr, ##@data` |

---

## 9. Built-in Constants

### 9.1 Boolean Constants

| Constant | Value | Description |
|----------|-------|-------------|
| FALSE | $00000000 | Boolean false |
| TRUE | $FFFFFFFF | Boolean true (all bits set) |

### 9.2 Numeric Limits

| Constant | Value | Description |
|----------|-------|-------------|
| NEGX | $80000000 | Most negative 32-bit signed |
| POSX | $7FFFFFFF | Most positive 32-bit signed |
| PI | $40490FDB | Floating-point pi |

### 9.3 Execution Mode Constants

| Constant | Value | Description |
|----------|-------|-------------|
| COGEXEC | %000000 | Execute from COG RAM |
| HUBEXEC | %001000 | Execute from Hub RAM |
| NEWCOG | %010000 | Start new cog |
| COGEXEC_NEW | %010000 | New cog, COG execution |
| HUBEXEC_NEW | %011000 | New cog, Hub execution |
| COGEXEC_NEW_PAIR | %110000 | New cog pair, COG execution |
| HUBEXEC_NEW_PAIR | %111000 | New cog pair, Hub execution |

### 9.4 Smart Pin Constants (P_*)

Configuration constants for smart pin modes:

```spin2
' Smart pin mode examples
P_ADC             ' ADC mode
P_ADC_1X          ' ADC 1x gain
P_ADC_10X         ' ADC 10x gain
P_DAC             ' DAC mode
P_PULSE           ' Pulse mode
P_PWM_TRIANGLE    ' Triangle PWM
P_PWM_SAWTOOTH    ' Sawtooth PWM
P_SYNC_TX         ' Synchronous transmit
P_SYNC_RX         ' Synchronous receive
P_ASYNC_TX        ' Asynchronous transmit
P_ASYNC_RX        ' Asynchronous receive
' ... many more
```

### 9.5 Streamer Constants (X_*)

Configuration constants for the streamer:

```spin2
X_IMM_8X1_1DAC1     ' Immediate mode, 8 bits, 1 DAC
X_IMM_16X2_1DAC1    ' Immediate mode, 16 bits
X_IMM_16X2_2DAC1    ' Immediate mode, 16 bits, 2 DACs
X_IMM_32X1_2DAC1    ' Immediate mode, 32 bits
X_PINS_ON           ' Pins on
X_PINS_OFF          ' Pins off
X_WRITE_OFF         ' Write off
X_ALT_ON            ' Alternate on
' ... many more
```

### 9.6 Event Constants (EVENT_*)

```spin2
EVENT_INT       ' Interrupt event
EVENT_CT1       ' Counter 1 event
EVENT_CT2       ' Counter 2 event
EVENT_CT3       ' Counter 3 event
EVENT_SE1       ' Smart enable 1
EVENT_SE2       ' Smart enable 2
EVENT_SE3       ' Smart enable 3
EVENT_SE4       ' Smart enable 4
EVENT_PAT       ' Pattern match
EVENT_FBW       ' FIFO buffer written
EVENT_XMT       ' Transmit done
EVENT_XFI       ' Execute FIFO input
EVENT_XRO       ' Execute ROM
EVENT_XRL       ' Execute RAM long
```

---

## 10. Error Conditions and Constraints

### 10.1 Address Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cog address exceeds $400 limit` | ORG address or limit > $400 | Keep COG addresses in [0..$400] |
| `Cog address exceeds limit` | Code, RES, or ORGF exceeds COG limit; `ORG start, limit` with start > limit; RES count > $400 or negative | Reduce code or increase limit |
| `Hub address exceeds $100000 ceiling` | ORGH address or limit > $100000 | Keep Hub addresses in [$400..$100000] |
| `Hub address below $400 limit` | ORGH < $400 (Spin2 mode) | Use ORGH >= $400 |
| `Hub address cannot decrease` | ORGH address < current | Use monotonically increasing addresses |
| `Inline cog address exceeds $11F limit` | Inline ORG address or limit > $120 | Keep inline code < $120 longs |

### 10.2 FIT Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cog address exceeds FIT limit` | Code exceeds FIT address | Reduce code or increase FIT |
| `Hub address exceeds FIT limit` | Data exceeds FIT address | Reduce data or increase FIT |

### 10.3 Register Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Register cannot exceed $1FF` | Register > 511 | Use registers 0-$1FF |
| `D register must be PA/PB/PTRA/PTRB` | CALLD with invalid D | Use PA, PB, PTRA, or PTRB |
| `Register is not allowed here` | Register in constant context | Use immediate value (#) |

### 10.4 Operand Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Constant must be from 0 to 511` | Immediate > 9 bits | Use ## for extended immediate |
| `PTRA/PTRB index constant must range from -32 to 31` | Index out of range | Use valid index or ##extended |
| `PTRA/PTRB index constant must range from 1 to 16` | Pre/post-mod index invalid | Use 1-16 for pre/post-modification |

### 10.5 Symbol Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Symbol is already defined` | Duplicate symbol | Use unique names |
| `Undefined symbol` | Symbol not defined | Define before use |
| `Limit of 10k DAT symbols exceeded` | Too many symbols | Reduce symbol count |
| `Expected a local symbol` | Invalid local label syntax | Use .name or :name |

### 10.6 Directive Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ORG not allowed within inline assembly code` | Nested ORG | Use single ORG level |
| `ORG not allowed within a DITTO block` | ORG inside DITTO | Place ORG outside DITTO |
| `ORGH not allowed within a DITTO block` | ORGH inside DITTO | Place ORGH outside DITTO |
| `RES is not allowed in ORGH mode` | RES in Hub mode | Use RES in COG mode only |
| `ORGF is not allowed in ORGH mode` | ORGF in Hub mode | Use ORGF in COG mode only |

### 10.7 DITTO Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `DITTO count must be a positive integer or zero` | Negative count | Use non-negative integer |
| `Expected DITTO END` | Missing END | Add DITTO END |
| `"$$" (DITTO index) is only allowed within a DITTO block, inside a DAT block` | $$ outside DITTO | Use $$ only inside DITTO |

### 10.8 Instruction-Specific Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `NOP cannot have a condition or _RET_` | Conditional NOP | Remove condition |
| `This effect is not allowed for this instruction` | Invalid effect | Check instruction format |
| `REP block end is out of range` | REP count > 511 | Reduce instruction count |
| `Relative address is out of range` | Branch too far | Use absolute addressing |

### 10.9 Data Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `BYTEFIT values must range from -$80 to $FF` | Value exceeds byte | Use byte-sized values |
| `WORDFIT values must range from -$8000 to $FFFF` | Value exceeds word | Use word-sized values |
| `STRING characters must range from 1 to 255` | Invalid string char | Avoid null in strings |
| `@"string"/STRING/LSTRING data cannot exceed 254 bytes` | String too long | Split into multiple strings |

### 10.10 Critical Constraints Summary

| Constraint | Limit |
|------------|-------|
| COG addresses | $000 - $3FF |
| Hub addresses | $400 - $FFFFF |
| Inline COG code | < $120 longs |
| Register numbers | $000 - $1FF |
| 9-bit immediates | 0 - 511 |
| 20-bit addresses | 0 - $FFFFF |
| PTRx index | -32 to +31 |
| PTRx post-mod | 1 to 16 |
| Symbol length | 30 characters (PNut) |
| DAT symbols | 10,000 max |
| String length | 254 bytes |
| Clock frequency | 3.33MHz - 500MHz |

---

## Appendix A: Instruction Encoding Summary

### A.1 Basic Instruction Format

```
Bits [31:28] = Condition code (0-15)
Bits [27:19] = Opcode
Bit  [18]    = I flag (immediate S)
Bits [17:9]  = D field (destination register)
Bits [8:0]   = S field (source register/immediate)
```

### A.2 Effect Encoding

```
Bits [20:19] = Basic effect (WC/WZ/WCZ)
Bits [21:18] = Extended effect (ANDC/ANDZ/ORC/ORZ/XORC/XORZ)
```

### A.3 Augmentation Format

```
AUGS: $0F000000 | (condition << 28) | (value >> 9)
AUGD: $0F800000 | (condition << 28) | (value >> 9)
```

---

## Appendix B: Quick Reference

### B.1 Memory Regions

```
COG:    $000-$1FF (512 longs, fastest)
LUT:    $200-$3FF (512 longs, fast)
HUB:    $400-$FFFFF (1MB - 1KB)
```

### B.2 Special Registers

```
PA=$1F6  PB=$1F7  PTRA=$1F8  PTRB=$1F9
DIRA=$1FA  DIRB=$1FB  OUTA=$1FC  OUTB=$1FD
INA=$1FE  INB=$1FF
IJMP3=$1F0  IRET3=$1F1  IJMP2=$1F2  IRET2=$1F3
IJMP1=$1F4  IRET1=$1F5
```

### B.3 Common Condition Codes

```
IF_ALWAYS  IF_NEVER  IF_C  IF_NC  IF_Z  IF_NZ
IF_C_AND_Z  IF_C_OR_Z  IF_NC_AND_NZ  IF_NC_OR_NZ
```

### B.4 Effects

```
WC  WZ  WCZ  ANDC  ANDZ  ORC  ORZ  XORC  XORZ
```

---

*This document describes PASM2 authoring as implemented in the PNut-TS compiler. For the complete instruction reference, see the PASM2 Instruction Reference Manual.*
