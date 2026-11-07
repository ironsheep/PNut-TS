# RES, FIT, and END Directives Usage Guide for Spin2/PASM2

This document describes the `RES`, `FIT`, and `END` directives in the Spin2 and PASM2 languages for the Parallax Propeller 2 (P2) microcontroller as implemented in the PNut-TS compiler.

## Overview

| Directive | Purpose | Context |
|-----------|---------|---------|
| `RES` | Reserve uninitialized COG/LUT space | DAT blocks (COG mode only) |
| `FIT` | Verify code/data fits within a limit | DAT blocks (COG or Hub mode) |
| `END` | Terminate inline assembly block | PUB/PRI methods |

---

## RES - Reserve COG/LUT Space

### Purpose

The `RES` directive reserves uninitialized space in COG or LUT RAM without generating any object code. It's used to allocate working registers for PASM routines.

### Syntax

```spin2
label   RES   count       ' Reserve 'count' longs
label   RES   0           ' Create label at current address without reserving space
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `label` | Symbol name for the reserved space (optional but typical) |
| `count` | Number of longs to reserve (can be 0) |

### Key Characteristics

1. **COG Mode Only** - RES only works after `ORG`, not in ORGH mode
2. **No Object Code** - RES advances the COG address counter but produces no bytes in the object file
3. **Uninitialized** - Reserved space contains whatever was previously in COG RAM
4. **Long-Aligned** - RES advances to the next long boundary before reserving

### Examples

**Basic Register Allocation:**
```spin2
DAT
        ORG     0

entry   MOV     temp, #100
        ADD     temp, value
        RET

temp    RES     1               ' Reserve 1 long for temporary variable
value   RES     1               ' Reserve 1 long for value storage
buffer  RES     16              ' Reserve 16 longs for buffer
```

**Zero-Count Label (Alias):**
```spin2
DAT
        ORG     0

' Create aliases - both point to same register
ma      RES     0               ' ma is alias for x (RES 0 = no space)
x       RES     1               ' x occupies 1 long

' Both refer to the same COG address
```

**Task Pointer Array:**
```spin2
DAT
        ORG     $100

taskptr RES     $20             ' Reserve 32 longs for task pointer list
```

### Restrictions

| Restriction | Error Message |
|-------------|--------------|
| Used in ORGH mode | `RES is not allowed in ORGH mode` |
| Exceeds limit | `Cog address exceeds limit` |
| Count above $400, or negative | `Cog address exceeds limit` |

### RES vs LONG for Data

| Aspect | `RES count` | `LONG 0[count]` |
|--------|-------------|-----------------|
| Initializes memory | No | Yes (to 0) |
| Generates object code | No | Yes |
| Valid in ORGH mode | No | Yes |
| Use case | COG working registers | Initialized data |

---

## FIT - Verify Code Fits

### Purpose

The `FIT` directive verifies at compile time that the current address hasn't exceeded a specified limit. It's a safety check that produces an error if your code is too large.

### Syntax

```spin2
FIT   limit                 ' Verify current address <= limit
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `limit` | Maximum address (in longs for COG mode, bytes for Hub mode) |

### Behavior by Mode

**In COG Mode (after ORG):**
- `limit` is a long address (0 to $400)
- Checks if `cogOrg <= limit * 4` (byte comparison internally)
- Error: `Cog address exceeds FIT limit`

**In Hub Mode (after ORGH):**
- `limit` is a byte address
- Checks if `hubOrg <= limit`
- Error: `Hub address exceeds FIT limit`

### Common Limit Values

| Limit | Meaning |
|-------|---------|
| `$1F0` | User COG RAM (before special registers) |
| `$1F8` | COG RAM (with some special registers) |
| `$200` | Full COG RAM |
| `$400` | COG + LUT RAM |
| `496` | Decimal equivalent of $1F0 |

### Examples

**Standard COG Program:**
```spin2
DAT
        ORG     0

entry   MOV     PA, #1
        ' ... lots of code ...
        JMP     #entry

vars    RES     10

        FIT     $1F0            ' Ensure we don't overwrite special registers
```

**Split COG/LUT Program:**
```spin2
DAT
        ORG     0

        ' COG code
        MOV     PA, #1
        CALL    #lut_routine
        JMP     #$

        FIT     $200            ' Must fit in COG before LUT

        ORG     $200            ' LUT code

lut_routine
        MOV     PB, #2
        RET

        FIT     $400            ' Must fit in LUT
```

**Hub Data Table:**
```spin2
DAT
        ORGH    $400

sinTable
        LONG    0[256]          ' Sine lookup table

        FIT     $800            ' Table must not exceed $800
```

**Calculated Limits:**
```spin2
CON
  OVERLAY_END = $300

DAT
        ORG     0
        ' ... overlay code ...
        FIT     OVERLAY_END + 1   ' Must fit before overlay area
```

### FIT Without Errors

FIT does nothing if the limit is not exceeded - it's purely a compile-time check:

```spin2
DAT
        ORG     0

        NOP                     ' Address $000
        NOP                     ' Address $001
        NOP                     ' Address $002

        FIT     $100            ' OK: $003 < $100, no error
```

### Restrictions

| Restriction | Error |
|-------------|-------|
| Cannot have a preceding label | `This directive cannot be preceded by a symbol` |
| Address exceeds COG limit | `Cog address exceeds FIT limit` |
| Address exceeds Hub limit | `Hub address exceeds FIT limit` |

---

## END - Terminate Inline Assembly

### Purpose

The `END` directive marks the end of an inline assembly block within a PUB or PRI method. Inline assembly allows you to embed PASM code directly in Spin2 methods.

### Syntax

```spin2
PUB/PRI method() | locals
  ' Spin2 code before inline assembly

  ORG                           ' or ORGH for hub-exec
  ' ... PASM instructions ...
  END                           ' End inline assembly block

  ' Spin2 code after inline assembly
```

### Key Characteristics

1. **Terminates Inline Block** - Required to mark where PASM ends and Spin2 resumes
2. **Inserts RET** - The compiler automatically inserts a `RET` instruction at END
3. **Must Follow ORG/ORGH** - Only valid within an inline assembly context
4. **Single Line** - END must appear alone on its line

### Inline Assembly Basics

Inline assembly allows PASM code within Spin2 methods:

```spin2
PUB FastToggle(pin) | mask

  mask := 1 << pin              ' Spin2 code

  ORG                           ' Begin inline PASM (COG execution)
                DRVNOT  mask    ' Toggle the pin
  END                           ' End inline PASM, implicit RET

  ' Execution returns here
```

### ORG vs ORGH for Inline

| Directive | Execution Location | Speed | Address Space |
|-----------|-------------------|-------|---------------|
| `ORG` | COG RAM | Fastest | $000-$11F (limited) |
| `ORGH` | Hub RAM | Fast | Larger |

```spin2
PUB CogInline()
  ORG                           ' Execute from COG (fastest)
                NOP
  END

PUB HubInline()
  ORGH                          ' Execute from Hub RAM
                NOP
  END
```

### Full Example: I2C Start Sequence

```spin2
PUB start() | scl, sda, tix

  longmove(@scl, @sclpin, 3)    ' Copy pins & timing to locals

  ORG
                DRVH    sda     ' SDA high
                DRVH    scl     ' SCL high
                WAITX   tix     ' Delay

                DRVL    sda     ' SDA low (start condition)
                WAITX   tix     ' Delay
                DRVL    scl     ' SCL low
                WAITX   tix     ' Delay
  END
```

### Full Example: SPI Send

```spin2
PRI flash_send(p_buffer, count) | tx_byte

  ORG
                RDFAST  #0, p_buffer     ' Start fast read from hub

.byte           RFBYTE  tx_byte          ' Read byte to send
                SHL     tx_byte, #24+1  WC  ' MSB-justify, get D7 into C

                REP     @.done, #8       ' Repeat 8 times
                DRVC    #SF_MOSI         ' Output data bit
                DRVNOT  #SF_SCLK         ' Toggle clock
                WAITX   #2               ' Delay
                DRVNOT  #SF_SCLK         ' Toggle clock
                SHL     tx_byte, #1     WC  ' Next bit
.done
                DJNZ    count, #.byte    ' Loop for all bytes

                DRVL    #SF_MOSI         ' MOSI low when done
  END
```

### Local Variable Access

Inline PASM can access local variables by name:

```spin2
PUB Example() | value, result

  value := 100

  ORG
                MOV     result, value    ' Read local variable
                ADD     result, #50      ' Modify
  END

  ' result now contains 150
```

### Restrictions on Inline Assembly

| Restriction | Error Message |
|-------------|--------------|
| Missing END | `Expected END` |
| ORG inside inline (nested) | `ORG not allowed within inline assembly code` |
| ORGH inside inline | `ORGH not allowed within inline assembly code` |
| ALIGNW/ALIGNL inside | `ALIGNW/ALIGNL not allowed within inline assembly code` |
| DITTO inside inline | Produces unexpected behavior |

### END vs RET

| Aspect | END | RET instruction |
|--------|-----|-----------------|
| Purpose | End inline block | Return from subroutine |
| Automatic RET | Yes, compiler adds it | Manual |
| Returns to | Spin2 code | PASM caller |
| Context | Inline only | Any PASM |

---

## Complete PASM Directive Reference

Now that we've covered all directives, here's the complete list:

| Directive | Guide | Purpose |
|-----------|-------|---------|
| ORG | ORG-Directives-Usage-Guide.md | Set COG/LUT origin |
| ORGH | ORG-Directives-Usage-Guide.md | Set Hub origin |
| ORGF | ORG-Directives-Usage-Guide.md | Fill to COG address |
| RES | This guide | Reserve COG space |
| FIT | This guide | Verify code fits |
| END | This guide | End inline assembly |
| ALIGNW | Data-Packing-Alignment-Guide.md | Word alignment |
| ALIGNL | Data-Packing-Alignment-Guide.md | Long alignment |
| DITTO | DITTO-Usage-Guide.md | Code/data replication |
| FILE | FILE-Usage-Guide.md | Include binary file |

---

## Summary

### RES Quick Reference

```spin2
DAT
        ORG     0
temp    RES     1               ' Reserve 1 long
alias   RES     0               ' Create alias (no space)
buffer  RES     16              ' Reserve 16 longs
        FIT     $1F0            ' Verify fit
```

### FIT Quick Reference

```spin2
DAT
        ORG     0
        ' ... code ...
        FIT     $1F0            ' COG mode: long address limit

        ORGH    $400
        ' ... data ...
        FIT     $800            ' Hub mode: byte address limit
```

### END Quick Reference

```spin2
PUB Method() | local
  ' Spin2 code

  ORG                           ' Begin inline PASM
                MOV     local, #100
  END                           ' End inline PASM (implicit RET)

  ' More Spin2 code
```

---

## Best Practices

1. **Always Use FIT** - Add FIT after COG code to catch overflow early
   ```spin2
   DAT
           ORG
           ' ... code ...
           FIT     $1F0
   ```

2. **Document RES Allocations** - Comment the purpose of reserved registers
   ```spin2
   temp    RES     1               ' Temporary calculation register
   count   RES     1               ' Loop counter
   buffer  RES     8               ' 8-long data buffer
   ```

3. **Use RES 0 for Aliases** - Create meaningful names for overlapping uses
   ```spin2
   float_a RES     0               ' Alias for x during float ops
   x       RES     1               ' General purpose / float operand
   ```

4. **Keep Inline Assembly Short** - Complex PASM should go in DAT blocks
   ```spin2
   ' Good: Simple, focused inline
   ORG
           DRVNOT  pin
   END

   ' Better for complex code: Call DAT routine
   COGINIT(NEWCOG, @complex_routine, 0)
   ```

5. **Test FIT Limits** - Use realistic limits based on your needs
   ```spin2
   FIT     $1F0            ' Standard user area
   FIT     $1F8            ' Include some special regs
   FIT     $200            ' Full COG
   FIT     $400            ' COG + LUT
   ```

---

*This document describes RES, FIT, and END directive usage in Spin2/PASM2 as implemented in the PNut-TS compiler.*
