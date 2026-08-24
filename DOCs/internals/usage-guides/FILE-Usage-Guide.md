# FILE Directive Usage Guide for Spin2/PASM2

This document describes the `FILE` directive in the Spin2 and PASM2 languages for the Parallax Propeller 2 (P2) microcontroller as implemented in the PNut-TS compiler.

## Overview

The `FILE` directive is used within DAT blocks to include the raw binary contents of an external file directly into the compiled object. This is commonly used for embedding:

- Font data
- Firmware blobs
- Image data (BMP files, etc.)
- Lookup tables
- Any binary data that needs to be stored in hub memory

The file contents are copied verbatim into the object file at compile time.

---

## Syntax

```spin2
DAT
  [label]  FILE  "filename"
```

### Components

| Component | Required | Description |
|-----------|----------|-------------|
| `label` | Optional | A symbol name that references the start address of the included data |
| `FILE` | Required | The FILE directive keyword (case-insensitive) |
| `"filename"` | Required | The name of the file to include, enclosed in double quotes |

---

## Basic Examples

### With Label

```spin2
DAT
font        file    "p2font16"           ' Include font data with label
image1      file    "bird_lut1.bmp"      ' Include bitmap with label
firmware    file    "device_fw.dat"      ' Include firmware blob
```

### Without Label

```spin2
DAT
    BYTE                                  ' Optional: establish byte context
    FILE  "vl53l5cx_mm1_1_fw.dat"        ' Include firmware data
```

### Accessing Included Data

```spin2
DAT
myData      file    "lookup_table.bin"
myDataEnd

CON
  DATA_SIZE = @myDataEnd - @myData        ' Calculate size of included file

PUB GetDataPtr() : ^BYTE
  return @myData                          ' Return pointer to file data

PUB GetDataSize() : LONG
  return DATA_SIZE                        ' Return size of file data
```

---

## File Location and Path Resolution

The compiler searches for the specified file in the following order:

1. **Top-Level Directory** - The directory of the **top-level** file being compiled
2. **Library Directory** - The built-in `./lib` directory
3. **Include Directories** - Directories specified with the `-I` command line option

> **Step 1 is the top-level file's directory, not the containing file's.** When
> a `FILE` directive sits inside a child object, the name is still resolved
> against the directory of the file you named on the command line — not against
> the directory the child object lives in, and not against the shell's current
> working directory. Verified by measurement against 1.55.4.
>
> This matters for a library object shared by more than one application: the
> same `FILE "blob.dat"` inside one shared object resolves to a *different*
> blob for each application that uses it, because each application is a
> different top-level file. That is intended — it is how an application supplies
> its own data to a shared object — and as of 1.55.4 the object cache accounts
> for it.

### Path Resolution Examples

Given a project structure:
```
project/
  src/
    main.spin2
    data/
      font.bin
  lib/
    shared_data.bin
```

And compilation with: `pnut-ts -I src/data src/main.spin2`

```spin2
' In main.spin2:
DAT
  font1   file  "font.bin"          ' Found in src/data/ via -I option
  shared  file  "shared_data.bin"   ' Found in lib/ directory
  local   file  "local.bin"         ' Found in src/ (current directory)
```

### Include Directory Option

Use the `-I` or `--Include` command line option to add search directories:

```bash
pnut-ts -I include_folder1 -I include_folder2 myfile.spin2
```

Include directories are searched:
- After checking the current directory
- Before checking the library directory

---

## Filename Requirements

### Valid Characters

Filenames may contain most printable ASCII characters (0x20 to 0x7E) except:

| Character | Description |
|-----------|-------------|
| `/` | Forward slash (path separator) |
| `:` | Colon |
| `*` | Asterisk (wildcard) |
| `?` | Question mark (wildcard) |
| `"` | Double quote |
| `<` | Less than |
| `>` | Greater than |
| `\|` | Pipe |

### Length Limit

- Maximum filename length: **253 characters**
- Exceeding this limit produces the error: `Filename too long`

### Case Sensitivity

- Filename matching is **case-insensitive** on all platforms
- The compiler normalizes filenames to lowercase for comparison

---

## Size and Memory Limits

### File Count Limit

- Maximum of **255** data files can be included across all objects in a compilation
- This limit is shared between DAT file inclusions and OBJ file references

### Size Constraints

The total size of included files is limited by:

1. **Hub Memory** - All included data resides in hub RAM (maximum ~1MB for P2)
2. **Object Size Limit** - Individual object files are limited to 1MB (`obj_size_limit`)
3. **COG/LUT Mode** - If the FILE directive appears in COG or LUT address space, stricter limits apply

When limits are exceeded, the compiler reports errors such as:
- `Hub address exceeds limit`
- `Cog address exceeds limit`

---

## Data Alignment

### Default Alignment

- FILE data is treated as **BYTE-sized** data
- No automatic alignment is applied to the included data
- The data starts at the current DAT block position

### Controlling Alignment

Use alignment directives before FILE if specific alignment is needed:

```spin2
DAT
            ALIGNL                        ' Align to long boundary
fontData    file    "p2font16"

            ALIGNW                        ' Align to word boundary
tableData   file    "lookup.bin"
```

---

## Common Use Cases

### 1. Font Data for Text Display

```spin2
DAT
font        file    "p2font16"            ' 16-pixel font data

PUB DrawChar(ch, x, y) | pFont
  pFont := @font + (ch * 16)              ' Calculate character offset
  ' ... draw font data
```

### 2. Firmware Blobs for Peripherals

```spin2
DAT
' VL53L5CX sensor firmware
VL53L5CX_FIRMWARE     BYTE
    FILE  "vl53l5cx_mm1_1_fw.dat"         ' 86,016 bytes of firmware
VL53L5CX_FIRMWARE_END

CON
  FW_SIZE = @VL53L5CX_FIRMWARE_END - @VL53L5CX_FIRMWARE

PUB LoadFirmware(pI2C)
  pI2C.writeBlock(@VL53L5CX_FIRMWARE, FW_SIZE)
```

### 3. Image Data for Graphics

```spin2
DAT
image1      file "bird_lut1.bmp"          ' 1-bit LUT image
image2      file "bird_lut2.bmp"          ' 2-bit LUT image
image3      file "bird_lut4.bmp"          ' 4-bit LUT image
image4      file "bird_lut8.bmp"          ' 8-bit LUT image
image5      file "bird_rgb24.bmp"         ' 24-bit RGB image

PUB ShowImage(imageNum) | pImg
  case imageNum
    1: pImg := @image1
    2: pImg := @image2
    3: pImg := @image3
    4: pImg := @image4
    5: pImg := @image5
  displayBitmap(pImg)
```

### 4. Configuration Data

```spin2
DAT
defaultConfig   file    "defaults.bin"
defaultConfigEnd

PUB LoadDefaults(^BYTE pDest)
  BYTEMOVE(pDest, @defaultConfig, @defaultConfigEnd - @defaultConfig)
```

### 5. Lookup Tables

```spin2
DAT
sinTable    file    "sine_table.bin"      ' Pre-computed sine values

PUB GetSine(angle) : LONG
  return LONG[@sinTable][angle & $FF]
```

---

## Interaction with Other Features

### ORG and ORGH Directives

FILE respects the current addressing mode:

```spin2
DAT
            ORG     0                     ' COG address space
            ' ... COG code ...

            ORGH                          ' Return to HUB address space
tableData   file    "table.bin"           ' Placed in HUB RAM
```

### Symbol References

The label created by FILE is a hub address that can be used with `@`:

```spin2
DAT
myFile      file    "data.bin"

PUB GetAddress() : LONG
  return @myFile                          ' Returns hub address of data
```

### DEBUG Statements

FILE data can be used with DEBUG bitmap displays:

```spin2
DAT
image       file "sprite.bmp"

PUB ShowSprite()
  debug(`bitmap a title 'Sprite' lut8)
  sendBitmapData(@image)
```

---

## Error Messages

| Error | Cause |
|-------|-------|
| `Invalid filename, use "FilenameInQuotes"` | Missing quotes around filename |
| `Invalid filename character` | Filename contains forbidden character |
| `Filename too long` | Filename exceeds 253 characters |
| `DAT file not found [filename]` | File cannot be located in any search path |
| `Hub address exceeds limit` | Included data would overflow hub memory |
| `Cog address exceeds limit` | Included data would overflow COG memory |
| `Limit of 255 unique objects exceeded` | Too many files included across compilation |

---

## Comparison with OBJ

| Feature | FILE | OBJ |
|---------|------|-----|
| Purpose | Include raw binary data | Include compiled Spin2 objects |
| Block | DAT only | OBJ block |
| Content | Any binary file | Compiled .spin2 files |
| Path search | Current, lib, include dirs | Current, lib, include dirs |
| Label type | Hub address | Object reference |
| Max count | 255 (shared with OBJ) | 255 (shared with FILE) |

---

## Best Practices

1. **Use Descriptive Labels**: Name FILE labels to indicate the data purpose.

   ```spin2
   DAT
   sensorFirmware  file  "sensor_fw.bin"   ' Good: descriptive
   f1              file  "sensor_fw.bin"   ' Avoid: cryptic
   ```

2. **Calculate Sizes at Compile Time**: Use end labels to determine file size.

   ```spin2
   DAT
   myData      file    "data.bin"
   myDataEnd

   CON
     DATA_SIZE = @myDataEnd - @myData
   ```

3. **Organize External Files**: Keep data files in a dedicated directory and use `-I`.

   ```bash
   pnut-ts -I data/ main.spin2
   ```

4. **Document File Requirements**: Comment the expected format and size of included files.

   ```spin2
   DAT
   ' Font: 8x16 pixels, 256 characters, 4096 bytes total
   font8x16    file    "font_8x16.bin"
   ```

5. **Verify File Existence**: Ensure all required data files are present before distribution.

6. **Consider Alignment**: Add alignment directives if the data will be accessed as WORDs or LONGs.

   ```spin2
   DAT
               ALIGNL
   longTable   file    "long_values.bin"   ' Accessed as LONGs
   ```

---

## Summary

| Aspect | Details |
|--------|---------|
| Location | DAT block only |
| Syntax | `[label] FILE "filename"` |
| Data type | BYTE (raw binary) |
| Search order | Current dir, lib dir, include dirs |
| Max filename | 253 characters |
| Max file count | 255 (shared with OBJ files) |
| Invalid chars | `/:*?"<>\|` |
| Case sensitivity | Case-insensitive |

---

*This document describes FILE directive usage in Spin2/PASM2 as implemented in the PNut-TS compiler.*
