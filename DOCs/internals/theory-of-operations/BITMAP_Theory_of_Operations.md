# BITMAP Window - Complete Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Document Version**: 1.1
**Date**: 2026-06-01
**Source Files**: DebugDisplayUnit.pas, DebugUnit.pas, SerialUnit.pas, GlobalUnit.pas
**Author**: Analysis of P2 PNut Debug Display System
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window directive reference; directive coverage re-verified against `DebugDisplayUnit.pas` (v55) on 2026-06-01

---

## Executive Summary

The BITMAP window in DebugDisplayUnit.pas is a versatile pixel-based display system that receives pixel data over a serial connection from a Propeller 2 microcontroller and renders it to a scalable bitmap canvas. The window supports 19 different color modes, 8 trace/scan patterns with optional scrolling, packed data formats, sparse pixel rendering, and extensive drawing primitives inherited from the PLOT display. It serves as both a simple bitmap receiver and a sophisticated 2D graphics canvas.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Structures](#2-data-structures)
3. [Window Creation and Initialization](#3-window-creation-and-initialization)
4. [Serial Communication and Data Flow](#4-serial-communication-and-data-flow)
5. [BITMAP_Update Method - Data Processing](#5-bitmap_update-method---data-processing)
6. [Color Modes and Translation](#6-color-modes-and-translation)
7. [Trace Modes and Pixel Positioning](#7-trace-modes-and-pixel-positioning)
8. [Pixel Rendering Modes](#8-pixel-rendering-modes)
9. [Scrolling System](#9-scrolling-system)
10. [Display Update Messages and Commands](#10-display-update-messages-and-commands)
11. [Drawing Primitives (PLOT Integration)](#11-drawing-primitives-plot-integration)
12. [Sprite System](#12-sprite-system)
13. [Performance Characteristics](#13-performance-characteristics)
14. [Key Behaviors and Edge Cases](#14-key-behaviors-and-edge-cases)
15. [Integration Points](#15-integration-points)
16. [Advanced Features](#16-advanced-features)
17. [Limitations and Constraints](#17-limitations-and-constraints)
18. [Comparison to Related Display Types](#18-comparison-to-related-display-types)

---

## 1. Architecture Overview

### 1.1 Display Type Classification
- **Display Type ID**: `dis_bitmap = 7` (DebugDisplayUnit.pas:29)
- **Display Name**: "BITMAP" (DebugDisplayUnit.pas:137)
- Part of a family of 9 debug display types (LOGIC, SCOPE, SCOPE_XY, FFT, SPECTRO, PLOT, TERM, BITMAP, MIDI)

### 1.2 Key Constants
```pascal
bitmap_wmin         = 1                     // Minimum width (DebugDisplayUnit.pas:229)
bitmap_wmax         = SmoothFillMax = 2048  // Maximum width
bitmap_hmin         = 1                     // Minimum height (DebugDisplayUnit.pas:231)
bitmap_hmax         = SmoothFillMax = 2048  // Maximum height (DebugDisplayUnit.pas:232)
SmoothFillMax       = DataSets = 2048       // Maximum dimension
```

### 1.3 Primary Use Cases
1. **Bitmap Receiver**: Display streaming pixel data from P2 ADC, camera, or sensor
2. **2D Graphics Canvas**: Draw shapes, text, sprites with primitives
3. **Image Processing**: Visualize processed image data with various color modes
4. **Oscilloscope Persistence**: Scrolling persistence display with trace modes
5. **Video Display**: Show video frames with color mode conversion

---

## 2. Data Structures

### 2.1 Bitmap-Specific Variables (DebugDisplayUnit.pas:252-412)

```pascal
// Display dimensions
vWidth              : integer               // Logical bitmap width (pixels)
vHeight             : integer               // Logical bitmap height (pixels)
vBitmapWidth        : integer               // Physical bitmap width (may differ if scaled)
vBitmapHeight       : integer               // Physical bitmap height
vClientWidth        : integer               // Window client area width
vClientHeight       : integer               // Window client area height

// Margins (zero for BITMAP/SPECTRO/PLOT)
vMarginLeft         : integer               // Left margin (0 for bitmap)
vMarginRight        : integer               // Right margin (0 for bitmap)
vMarginTop          : integer               // Top margin (0 for bitmap)
vMarginBottom       : integer               // Bottom margin (0 for bitmap)

// Pixel positioning
vPixelX             : integer               // Current X position (0..vWidth-1)
vPixelY             : integer               // Current Y position (0..vHeight-1)
vTrace              : integer               // Trace mode (bits 0-2: pattern, bit 3: scroll enable)
vDotSize            : integer               // Pixel X-size for sparse mode (1-256)
vDotSizeY           : integer               // Pixel Y-size for sparse mode (1-256)
vSparse             : integer               // Sparse pixel border color (-1=normal, other=sparse)

// Color system
vColorMode          : integer               // Active color mode (key_lut1..key_rgb24)
vLut                : array[0..255] of integer  // Lookup table for palette modes
vColorTune          : integer               // Color tuning parameter (hue shift, color select)

// Update control
vRate               : integer               // Update rate (pixels per screen update)
vRateCount          : integer               // Update rate counter
vUpdate             : boolean               // Manual update mode (true=wait for UPDATE command)
```

### 2.2 Bitmap Storage Arrays

```pascal
Bitmap              : array[0..1] of TBitmap    // Double-buffered bitmaps
BitmapLine          : array[0..SmoothFillMax-1] of Pointer  // Scanline pointers for direct access
```

**Bitmap[0]**: Rendering target (all drawing operations)
**Bitmap[1]**: Display buffer (copied to screen)
**BitmapLine[]**: Direct pointers to pixel data for fast PlotPixel operations

### 2.3 Shared PLOT/BITMAP Arrays (for drawing primitives)

```pascal
// Sprite system (shared with PLOT)
SpritePixels        : array[0..SpriteMax * SpriteMaxX * SpriteMaxY - 1] of byte
SpriteColors        : array[0..SpriteMax * 256 - 1] of integer
SpriteSizeX         : array[0..SpriteMax - 1] of byte
SpriteSizeY         : array[0..SpriteMax - 1] of byte

// Constants
SpriteMax           = 256                   // Maximum sprite count
SpriteMaxX          = 32                    // Maximum sprite width
SpriteMaxY          = 32                    // Maximum sprite height
```

### 2.4 Packed Data Support

```pascal
vPackAlt            : boolean               // Alternate packing mode (2 numbers per value)
vPackSignx          : boolean               // Sign-extend packed values
vPackMask           : integer               // Bit mask for extraction
vPackShift          : integer               // Right shift for next sample
vPackCount          : integer               // Samples per packed value (1-32)
```

---

## Directive Reference (v55-verified)

Complete directive coverage for BITMAP from the [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) §5.8, re-verified against `DebugDisplayUnit.pas` v55. Line references point into that file.

### Configuration directives

Parsed in `BITMAP_Configure` (lines 2372–2414) during window creation.

| Directive | Parameters | Range / default / notes | Pascal line |
|---|---|---|---|
| `TITLE` | `'string'` | Free text; sets window caption | `KeyTitle` |
| `POS` | `left top` | int, int; window screen position | `KeyPos` |
| `SIZE` | `w h` | int **1..2048** each; default 256 × 256 (`bitmap_wmin/wmax`, `bitmap_hmin/hmax`) | `2386` |
| `DOTSIZE` | `x {y}` | int **1..256** each; default 1 × 1; if `y` omitted it copies `x` | `2388–2392` |
| `SPARSE` | `color` | named color or RGB24; enables sparse mode (default −1 = off / normal) | `2393–2394` |
| color-mode | `LUT1` `LUT2` `LUT4` `LUT8` `LUMA8` `LUMA8W` `LUMA8X` `HSV8` `HSV8W` `HSV8X` `RGBI8` `RGBI8W` `RGBI8X` `RGB8` `HSV16` `HSV16W` `HSV16X` `RGB16` `RGB24` | 19 modes; default `RGB24`. `KeyColorMode` consumes a tint token **only** for `LUMA8/8W/8X` (a `key_orange..key_gray` color keyword **or** a number) and for `HSV8/8W/8X`, `HSV16/16W/16X` (a **number only**). **`RGBI8/8W/8X`, `LUT1/2/4/8`, `RGB8/16/24` consume NO tint token** — RGBI derives its color selector from the pixel's own upper 3 bits (`p shr 5 and 7`), not a tint. For LUMA, a non-color keyword is pushed back (`Dec(ptr)`, 2794) and re-parsed as the next directive | `KeyColorMode`; `2785–2804`; `2395–2396` |
| `LUTCOLORS` | `rgb24…` | Up to 256 RGB24 palette entries; only meaningful with LUT1/2/4/8 mode | `2397–2398` |
| `TRACE` | `n` | int **0..15** (bits 0–2 = scan pattern 0–7, bit 3 = scroll enable); default 0 | `2399–2400`; see §3.2 |
| `RATE` | `n` | int; pixels per screen update; −1 ⇒ auto-set to `vWidth × vHeight` after configure; 0 ⇒ `SetTrace` sets it to `vWidth` (h-scan) or `vHeight` (v-scan); default 0 | `2401–2402`, `2412–2413` |
| packed | `LONGS_1BIT` … `BYTES_4BIT` | 12 keywords; optional `ALT` and/or `SIGNED` modifiers | `KeyPack`; `2403–2404` |
| `UPDATE` | — | Flag; enables manual-refresh mode; display only updates on explicit `UPDATE` command | `2405–2406` |
| `HIDEXY` | — | Flag; suppresses on-screen measurement-cursor readout; does **not** disable `PC_MOUSE` | `2407–2408` |

> After `BITMAP_Configure` completes: `SetSize(0,0,0,0)` (zero margins), `SetTrace(vTrace, vRate=0)` (initialise pixel position), then `if vRate = -1 then vRate := vWidth * vHeight` (`2411–2413`).

> **Default window size:** `vWidth × vHeight = 256 × 256` (from global `SetDefaults`,
> `2880–2884`; overridable by `SIZE`, range 1..2048 each). With `vDotSize = vDotSizeY = 1`
> the client area is `256 × 256` px; sparse mode multiplies by dot size (`vWidth·vDotSize ×
> vHeight·vDotSizeY`).
>
> **Font size:** BITMAP draws **no text** — `BITMAP_Configure` does not touch `vTextSize`,
> so it remains at `DefaultTextSize = 10` (`SetDefaults`, 2894), and BITMAP exposes **no
> `TEXTSIZE` directive**. The value is effectively unused.

### Display / data directives

Parsed in `BITMAP_Update` (lines 2416–2485) on every subsequent debug message.

| Directive | Parameters | Range / default / behavior | Pascal line |
|---|---|---|---|
| *numeric pixel stream* | integer values | Each number → one pixel (or multiple if packed); color-translated via `vColorMode` and plotted at current trace position; `BitmapToCanvas` called every `vRate` pixels (via `RateCycle`) | `2459–2483` |
| color-mode | (same 19 modes as config) | Change active color mode mid-stream; affects all subsequent pixels | `2425–2426` |
| `LUTCOLORS` | `rgb24…` | Replace LUT palette entries at runtime | `2427–2428` |
| `TRACE` | `n` | int **0..15**; **only acts `if NextNum`** (no-op if no number follows); change scan pattern mid-stream; resets pixel position; `SetTrace(val,True)` — `ModifyRate=True` here, so it also recomputes `vRate` | `2429–2430` |
| `RATE` | `n` | int; change pixels-per-update rate at runtime | `2431–2432` |
| `SET` | `x y` | x: int **0..w−1**; y: int **0..h−1**; jump cursor and **cancel scroll** (clears bit 3 of `vTrace`) | `2433–2438` |
| `SCROLL` | `x y` | x: int **−w..w**; y: int **−h..h**; positive x = right, positive y = down; fills vacated area with background | `2439–2442` |
| `CLEAR` | — | Fill bitmap with background, reset pixel position to trace start, refresh display (unless `UPDATE` mode) | `2443–2448` |
| `UPDATE` | — | Force screen refresh (`BitmapToCanvas(0)`); required when manual-refresh mode active | `2449–2450` |
| `SAVE` | `{filename}` | Write window bitmap to `.bmp` file; `SAVE WINDOW` or `SAVE l t w h` for desktop region | `KeySave`; `2451–2452` |

### Keyboard & mouse

Implemented via the **shared input model** — identical form-level handlers for all nine debug display windows (§4 of the Directive Matrix).

| Handler | Lines | Notes |
|---|---|---|
| `WMGetDlgCode` | 585–589 | Captures Tab key (`DLGC_WANTTAB`); prevents focus change |
| `FormMouseMove` | 647–809 | Draws live measurement cursor; suppressed when `HIDEXY` set (`737`) |
| `FormMouseWheel` | 811–823 | Latches wheel direction into `vMouseWheel` ±1 for 100 ms |
| `FormKeyPress` / `FormKeyDown` | 825–857 | Latches key byte into `vKeyPress` for 100 ms; arrow/nav keys mapped to codes 1–12 |

**`PC_KEY`** → `SendKeyPress` (3579–3583): transmits one LONG = latched `vKeyPress` byte (0 if none), then clears it.

**`PC_MOUSE`** → `SendMousePos` (3537–3577): transmits two LONGs.
- LONG 1: `x` bits 0–12, `y` bits 13–25, `vMouseWheel` bits 26–27, L/M/R buttons bits 28–30. Sentinel `$03FFFFFF` / `$FFFFFFFF` when cursor is outside the client area.
- LONG 2: RGB color of pixel under cursor.

**BITMAP coordinate mapping** — ⚠️ **on-screen readout and `PC_MOUSE` wire value differ in Y origin** (same situation as SPECTRO):
- **On-screen readout** (`FormMouseMove`, 733–734): `x = X ÷ DOTSIZE`, `y = Y ÷ DOTSIZEY` — top-origin, **no** direction flip.
- **`PC_MOUSE` wire value** (`SendMousePos`, 3556–3562, shared `dis_spectro, dis_plot, dis_bitmap` branch): applies `if not vDirY then y := ClientHeight − y` before dividing. `vDirY` is always `False` for BITMAP (only PLOT's `CARTESIAN` sets it), so the wire value is **Y-inverted** (bottom-origin): `y = (ClientHeight − Y) ÷ DOTSIZEY`.

`HIDEXY` suppresses the on-screen readout but does **not** disable `PC_MOUSE` reporting.

---

## 3. Window Creation and Initialization

### 3.1 Creation Flow (DebugDisplayUnit.pas:591-645)

**Step 1: Constructor** (Create method, lines 551-576)
- Called by DebugUnit when serial command `DebugDisplayType[0] = 1` is received
- Sets up form properties, bitmaps, timers, and event handlers
- Creates two 24-bit bitmaps for double-buffering

**Step 2: FormCreate Event** (DebugDisplayUnit.pas:591-645)
1. Creates bitmaps (Bitmap[0], Bitmap[1])
2. Retrieves display type from `P2.DebugDisplayValue[0]` (should be 7 for BITMAP)
3. Sets window caption from `P2.DebugDisplayValue[1]` + " - BITMAP"
4. Positions window at `P2.DebugDisplayLeft`, `P2.DebugDisplayTop`
5. Calls `SetDefaults()` to initialize variables
6. Sets `ptr := 2` (starts parsing parameters at index 2)
7. Calls `BITMAP_Configure()` based on DisplayType

### 3.2 BITMAP_Configure Method (DebugDisplayUnit.pas:2372-2414)

**Default Values Set** (lines 2375-2377):
```pascal
vTrace      = 0             // Top line, left-to-right, no scroll
vDotSize    = 1             // 1:1 pixel mapping
vDotSizeY   = 1             // 1:1 pixel mapping
```

**Parameter Parsing Loop** (lines 2379-2409):
```pascal
while NextKey do
  case val of
    key_title:          KeyTitle;
    key_pos:            KeyPos;
    key_size:           KeySize(vWidth, vHeight, bitmap_wmin, bitmap_wmax, bitmap_hmin, bitmap_hmax);
    key_dotsize:        [Set pixel scale: vDotSize, vDotSizeY]
    key_sparse:         KeyColor(vSparse);
    key_lut1..key_rgb24: KeyColorMode;
    key_lutcolors:      KeyLutColors;
    key_trace:          KeyVal(vTrace);
    key_rate:           KeyVal(vRate);
    key_longs_1bit..key_bytes_4bit: KeyPack;
    key_update:         vUpdate := True;
    key_hidexy:         vHideXY := True;
  end;
```

**Supported Configuration Keywords**:

| Keyword | Parameters | Description |
|---------|------------|-------------|
| `title` | string | Set window title |
| `pos` | x, y | Set window position |
| `size` | width, height | Set bitmap dimensions (1-2048) |
| `dotsize` | x [y] | Set pixel scale (sparse mode) |
| `sparse` | color | Enable sparse mode with border color |
| `lut1..rgb24` | [params] | Set color mode |
| `lutcolors` | colors... | Define LUT palette |
| `trace` | mode | Set trace/scan pattern (0-15) |
| `rate` | count | Set update rate (pixels per refresh) |
| `longs_1bit` etc. | [alt] [signed] | Set packed data format |
| `update` | - | Enable manual update mode |
| `hidexy` | - | Hide mouse coordinate display |

**Trace Mode Encoding** (DebugDisplayUnit.pas:2362-2370):
```
Bits 0-2: Scan pattern (0-7)
Bit 3:    Scroll enable (0=wrap, 1=scroll)

%0000: Top line, left-to-right,    no scroll
%0001: Top line, right-to-left,    no scroll
%0010: Bottom line, left-to-right, no scroll
%0011: Bottom line, right-to-left, no scroll
%0100: Left line, top-to-bottom,   no scroll
%0101: Left line, bottom-to-top,   no scroll
%0110: Right line, top-to-bottom,  no scroll
%0111: Right line, bottom-to-top,  no scroll

%1000: Top line, left-to-right,    scroll down
%1001: Top line, right-to-left,    scroll down
%1010: Bottom line, left-to-right, scroll up
%1011: Bottom line, right-to-left, scroll up
%1100: Left line, top-to-bottom,   scroll right
%1101: Left line, bottom-to-top,   scroll right
%1110: Right line, top-to-bottom,  scroll left
%1111: Right line, bottom-to-top,  scroll left
```

**Preparation Phase** (lines 2411-2413):
```pascal
SetSize(0, 0, 0, 0);                     // Zero margins for bitmap
SetTrace(vTrace, vRate = 0);             // Initialize pixel position
if vRate = -1 then vRate := vWidth * vHeight;  // Default: full bitmap
```

**SetTrace Method** (DebugDisplayUnit.pas:2973-2980):
```pascal
procedure TDebugDisplayForm.SetTrace(Path: integer; ModifyRate: boolean);
begin
  if Path and 7 in [0, 2, 4, 5] then vPixelX := 0 else vPixelX := vWidth - 1;
  if Path and 7 in [0, 1, 4, 6] then vPixelY := 0 else vPixelY := vHeight - 1;
  if ModifyRate then
    if Path and 7 in [0, 1, 2, 3] then vRate := vWidth else vRate := vHeight;
  vTrace := Path and $F;
end;
```

**Window Sizing** (SetSize method, lines 2926-2963):

For BITMAP (and SPECTRO/PLOT):
```pascal
if vDotSize > 1 or vDotSizeY > 1 then
begin
  // Sparse mode: client size = logical size × dot scale
  ClientWidth  := vWidth * vDotSize;
  ClientHeight := vHeight * vDotSizeY;
  vSparse := (sparse color specified);
end
else
begin
  // Normal mode: 1:1 pixel mapping
  vSparse := -1;
  ClientWidth := vWidth;
  ClientHeight := vHeight;
end

Bitmap[0].Width := vWidth;
Bitmap[0].Height := vHeight;
Bitmap[1].Width := vWidth;
Bitmap[1].Height := vHeight;

// Setup scanline pointers for fast pixel access
for i := 0 to vBitmapHeight - 1 do
  BitmapLine[i] := Bitmap[0].ScanLine[i];
```

**Note**: Unlike SCOPE/FFT, BITMAP has zero margins. The entire bitmap is the drawable area.

---

## 4. Serial Communication and Data Flow

### 4.1 Serial Reception (SerialUnit.pas)
[Identical to FFT - see FFT documentation]

### 4.2 Debug Command Parsing (DebugUnit.pas:200-236)
[Identical to FFT - see FFT documentation]

### 4.3 Display Update Trigger (DebugUnit.pas:224-232)
[Identical to FFT - see FFT documentation]

### 4.4 Element Parsing Helpers (DebugDisplayUnit.pas:4101-4131)
[Identical to FFT - see FFT documentation]

---

## 5. BITMAP_Update Method - Data Processing

### 5.1 Method Signature (DebugDisplayUnit.pas:2416-2485)
```pascal
procedure TDebugDisplayForm.BITMAP_Update;
var
  i, v, x, y: integer;
```

**Purpose**:
- Process incoming pixel data or commands from serial stream
- Plot pixels to bitmap using current trace mode
- Handle runtime configuration changes

### 5.2 Update Loop Structure (lines 2420-2484)
```pascal
while not NextEnd do              // Process all elements until ele_end
begin
  if NextStr then Break;          // Strings not allowed in BITMAP

  if NextKey then                 // Keyword = command
    case val of
      key_lut1..key_rgb24:   [change color mode]
      key_lutcolors:         [update palette]
      key_trace:             [change trace pattern]
      key_rate:              [change update rate]
      key_set:               [set pixel position]
      key_scroll:            [scroll bitmap]
      key_clear:             [clear bitmap]
      key_update:            [force display update]
      key_save:              [save bitmap to file]
      key_pc_key:            [send keyboard event]
      key_pc_mouse:          [send mouse event]
    end
  else
    while NextNum do              // Numbers = pixel data
      [process numeric pixels]
end;
```

### 5.3 Command Processing (lines 2423-2456)

**key_lut1..key_rgb24** (lines 2425-2426):
```pascal
key_lut1..key_rgb24:
  KeyColorMode;    // Change active color mode
```
- Changes `vColorMode` to new palette/color format
- Affects all subsequent pixel data interpretation

**key_lutcolors** (lines 2427-2428):
```pascal
key_lutcolors:
  KeyLutColors;    // Update LUT palette entries
```
- Reads up to 256 RGB24 color values
- Stores in `vLut[]` array
- Only affects LUT1/LUT2/LUT4/LUT8 color modes

**key_trace** (lines 2429-2430):
```pascal
key_trace:
  if NextNum then SetTrace(val, True);
```
- Changes scan pattern mid-stream
- Resets pixel position to starting corner
- Optionally adjusts `vRate` for new pattern

**key_set** (lines 2433-2438):
```pascal
key_set:
begin
  vTrace := vTrace and 7;              // Cancel scrolling
  if KeyValWithin(vPixelX, 0, vWidth - 1) then
    KeyValWithin(vPixelY, 0, vHeight - 1);
end;
```
- Manually positions pixel cursor
- Disables scroll mode (keeps scan pattern)
- Useful for random-access pixel writes

**key_scroll** (lines 2439-2442):
```pascal
key_scroll:
  if KeyValWithin(x, -vWidth, vWidth) then
    if KeyValWithin(y, -vHeight, vHeight) then
      ScrollBitmap(x, y);
```
- Manually scrolls bitmap by (x, y) pixels
- Positive x = scroll right, negative = scroll left
- Positive y = scroll down, negative = scroll up
- Fills vacated area with background color

**key_clear** (lines 2443-2448):
```pascal
key_clear:
begin
  ClearBitmap;
  if not vUpdate then BitmapToCanvas(0);
  SetTrace(vTrace, True);
end;
```
- Fills bitmap with background color
- Resets pixel position to starting corner
- Updates display (unless manual update mode)

**key_update** (lines 2449-2450):
```pascal
key_update:
  BitmapToCanvas(0);    // Force screen update
```
- Manually triggers display refresh
- Required when `vUpdate = True` (manual mode)

### 5.4 Pixel Processing (lines 2458-2483)

**Two Rendering Paths**:

**Path 1: Normal Pixels** (vSparse = -1):
```pascal
while NextNum do
begin
  v := NewPack;                          // Get packed value (if enabled)
  for i := 1 to vPackCount do            // Unpack all samples
  begin
    PlotPixel(UnPack(v));                // Plot pixel at current position

    if RateCycle and not vUpdate then    // Update screen if rate reached
      BitmapToCanvas(0);

    StepTrace;                           // Advance to next pixel position
  end;
end;
```

**PlotPixel Method** (DebugDisplayUnit.pas:3433-3444):
```pascal
procedure TDebugDisplayForm.PlotPixel(p: integer);
var
  v: integer;
  line: PByteArray;
begin
  p := TranslateColor(p, vColorMode);    // Convert to RGB24
  line := BitmapLine[vPixelY];           // Get scanline pointer
  v := vPixelX * 3;                      // 3 bytes per pixel (24-bit)
  line[v+0] := p shr 0;                  // Blue
  line[v+1] := p shr 8;                  // Green
  line[v+2] := p shr 16;                 // Red
end;
```

**Path 2: Sparse Pixels** (vSparse ≠ -1):
```pascal
while NextNum do
begin
  v := NewPack;
  for i := 1 to vPackCount do
  begin
    // Calculate center of sparse pixel
    x := vPixelX * vDotSize + vDotSize shr 1;
    y := vPixelY * vDotSizeY + vDotSizeY shr 1;

    // Draw border (sparse color)
    SmoothShape(x, y,
                vDotSize, vDotSizeY,
                0, 0, 0, vSparse, 255);

    // Draw inner pixel (data color, 75% size)
    SmoothShape(x, y,
                vDotSize - vDotSize shr 2, vDotSizeY - vDotSizeY shr 2,
                vDotSize, vDotSizeY,
                0, TranslateColor(UnPack(v), vColorMode), 255);

    if RateCycle and not vUpdate then BitmapToCanvas(0);
    StepTrace;
  end;
end;
```

**Sparse Mode Effect**:
- Each logical pixel rendered as `vDotSize × vDotSizeY` physical pixels
- Outer border in `vSparse` color (grid effect)
- Inner fill in data color at 75% size (prevents grid from covering data)
- Creates magnified pixel display with visible grid

---

## 6. Color Modes and Translation

### 6.1 Supported Color Modes (19 modes)

| Mode | Keyword | Bits/Pixel | Description |
|------|---------|------------|-------------|
| LUT1 | `key_lut1` | 1 | 2-color palette (bit 0 → vLut[0..1]) |
| LUT2 | `key_lut2` | 2 | 4-color palette (bits 0-1 → vLut[0..3]) |
| LUT4 | `key_lut4` | 4 | 16-color palette (bits 0-3 → vLut[0..15]) |
| LUT8 | `key_lut8` | 8 | 256-color palette (byte → vLut[0..255]) |
| LUMA8 | `key_luma8` | 8 | Grayscale to color (black → color) |
| LUMA8W | `key_luma8w` | 8 | Grayscale to color (white → color) |
| LUMA8X | `key_luma8x` | 8 | Grayscale to color (expanded range) |
| RGBI8 | `key_rgbi8` | 8 | 3-bit RGB + intensity (black → color) |
| RGBI8W | `key_rgbi8w` | 8 | 3-bit RGB + intensity (white → color) |
| RGBI8X | `key_rgbi8x` | 8 | 3-bit RGB + intensity (expanded range) |
| RGB8 | `key_rgb8` | 8 | 3:3:2 RGB (R3 G3 B2) |
| HSV8 | `key_hsv8` | 8 | 4-bit hue + 4-bit value (black → hue) |
| HSV8W | `key_hsv8w` | 8 | 4-bit hue + 4-bit value (white → hue) |
| HSV8X | `key_hsv8x` | 8 | 4-bit hue + 4-bit value (expanded range) |
| HSV16 | `key_hsv16` | 16 | 8-bit hue + 8-bit value (black → hue) |
| HSV16W | `key_hsv16w` | 16 | 8-bit hue + 8-bit value (white → hue) |
| HSV16X | `key_hsv16x` | 16 | 8-bit hue + 8-bit value (expanded range) |
| RGB16 | `key_rgb16` | 16 | 5:6:5 RGB (R5 G6 B5) |
| RGB24 | `key_rgb24` | 24 | 8:8:8 RGB (full color) |

### 6.2 TranslateColor Function (DebugDisplayUnit.pas:3090-3173)

**Purpose**: Convert pixel value from any color mode to RGB24

**Signature**:
```pascal
function TDebugDisplayForm.TranslateColor(p, mode: integer): integer;
```

**Implementation Details**:

#### LUT Modes (lines 3097-3104)
```pascal
key_lut1:  p := vLut[p and $01];        // 1 bit → 2 colors
key_lut2:  p := vLut[p and $03];        // 2 bits → 4 colors
key_lut4:  p := vLut[p and $0F];        // 4 bits → 16 colors
key_lut8:  p := vLut[p and $FF];        // 8 bits → 256 colors
```
- Simple lookup table indexing
- `vLut[]` contains 256 RGB24 values
- **Default contents are undefined**: `SetDefaults` (2880–2917) does **not** initialize `vLut[]`, so until a `LUTCOLORS` directive populates it, LUT-mode pixels translate to garbage (see §17.4)

#### LUMA8/RGBI8 Modes (lines 3105-3142)

**Color Selection**:
```pascal
if mode in [key_luma8, key_luma8w, key_luma8x] then
begin
  v := vColorTune and 7;        // User-specified color (0-7)
  p := p and $FF;               // 8-bit brightness
end
else
begin
  v := p shr 5 and 7;           // Upper 3 bits = RGB color
  p := p and $1F shl 3 or p and $1C shr 2;  // Lower 5 bits = intensity
end;
```

**Color Palette** (v = 0-7):
```
0: Orange (special case)
1: Blue    (bit 0 set)
2: Green   (bit 1 set)
3: Cyan    (bits 0,1 set)
4: Red     (bit 2 set)
5: Magenta (bits 0,2 set)
6: Yellow  (bits 1,2 set)
7: White   (bits 0,1,2 set)
```

**White/Expanded Modes**:
```pascal
w := (mode in [key_luma8w, key_rgbi8w]) or
     (mode in [key_luma8x, key_rgbi8x]) and (v <> 7) and (p >= $80);

if (mode in [key_luma8x, key_rgbi8x]) and (v <> 7) then
  if (p >= $80) then p := not p and $7F shl 1 else p := p shl 1;

if w then
  // Invert: white → color (high brightness = more color)
  p := (color_channels * p) xor $FFFFFF
else
  // Normal: black → color (high brightness = more color)
  p := color_channels * p
```

#### HSV Modes (lines 3143-3160)

**8-bit HSV** (key_hsv8, key_hsv8w, key_hsv8x):
```pascal
// Expand 4-bit hue and value to 8-bit
p := p and $F0 * $110 or p and $0F * $11;
```
- Upper 4 bits: Hue (0-15 → 0-255)
- Lower 4 bits: Value (0-15 → 0-255)

**16-bit HSV** (key_hsv16, key_hsv16w, key_hsv16x):
- Upper 8 bits: Hue (0-255)
- Lower 8 bits: Value (0-255)

**Conversion Process**:
```pascal
v := PolarColors[(p shr 8 + vColorTune) and $FF];  // Hue → RGB (from precomputed table)
p := p and $FF;                                     // Extract value

w := (mode in [key_hsv8w, key_hsv16w]) or
     (mode in [key_hsv8x, key_hsv16x]) and (p >= $80);

if mode in [key_hsv8x, key_hsv16x] then
  if (p >= $80) then p := p and $7F shl 1 xor $FE else p := p shl 1;  // Expand range

if w then v := v xor $FFFFFF;    // Invert for white modes

// Apply value to each RGB channel
p := (v shr 16 and $FF * p + $FF) shr 8 shl 16 or
     (v shr  8 and $FF * p + $FF) shr 8 shl  8 or
     (v shr  0 and $FF * p + $FF) shr 8 shl  0;

if w then p := p xor $FFFFFF;    // Invert back
```

#### RGB8 Mode (lines 3161-3164)
```pascal
key_rgb8:
  p := p and $E0 * $1236E and $FF0000 or    // R (3 bits → 8 bits)
       p and $1C *   $91C and $00FF00 or    // G (3 bits → 8 bits)
       p and $03 *    $55 and $0000FF;      // B (2 bits → 8 bits)
```
- 3:3:2 format (RRRGGGBB)
- Multipliers expand to full 8-bit range

#### RGB16 Mode (lines 3165-3168)
```pascal
key_rgb16:
  p := p and $F800 shl 8 or p and $E000 shl 3 or    // R (5 bits → 8 bits)
       p and $07E0 shl 5 or p and $0600 shr 1 or    // G (6 bits → 8 bits)
       p and $001F shl 3 or p and $001C shr 2;      // B (5 bits → 8 bits)
```
- 5:6:5 format (RRRRRGGGGGGBBBBB)
- Bit replication fills lower bits

#### RGB24 Mode (lines 3169-3170)
```pascal
key_rgb24:
  p := p and $00FFFFFF;    // Already 24-bit RGB
```
- No conversion needed
- Mask to 24 bits

### 6.3 PolarColors Table (SetPolarColors, DebugDisplayUnit.pas:3207-3228)

**Purpose**: Pre-computed HSV hue → RGB conversion

**Generation** (lines 3215-3227):
```pascal
for i := 0 to 255 do
begin
  for j := 0 to 2 do    // RGB channels
  begin
    k := i + tuning + j * 256 / 3;    // Hue offset for each channel
    if k >= 256 then k := k - 256;

    if      k < 256 * 2/6 then v[j] := 0
    else if k < 256 * 3/6 then v[j] := Round((k - 256 * 2/6) / (256 * 3/6 - 256 * 2/6) * 255)
    else if k < 256 * 5/6 then v[j] := 255
    else                       v[j] := Round((256 * 6/6 - k) / (256 * 6/6 - 256 * 5/6) * 255);
  end;
  PolarColors[i] := v[2] shl 16 or v[1] shl 8 or v[0];
end;
```

**Hue Wheel** (tuning = -7.2 for red at 0):
```
0:    Red
42:   Yellow
85:   Green
128:  Cyan
170:  Blue
213:  Magenta
255:  Red (wrap)
```

---

## 7. Trace Modes and Pixel Positioning

### 7.1 Trace Mode Encoding (DebugDisplayUnit.pas:2362-2370)

**Bit Layout**:
```
Bits 0-2: Scan pattern (0-7)
Bit 3:    Scroll enable (0=wrap, 1=scroll)
```

**8 Scan Patterns**:

| Mode | Description | Start | X-Advance | Y-Advance | End-of-Line |
|------|-------------|-------|-----------|-----------|-------------|
| 0 | Top line, L→R | (0,0) | X++ | Y++ | Wrap/Scroll down |
| 1 | Top line, R→L | (W-1,0) | X-- | Y++ | Wrap/Scroll down |
| 2 | Bottom line, L→R | (0,H-1) | X++ | Y-- | Wrap/Scroll up |
| 3 | Bottom line, R→L | (W-1,H-1) | X-- | Y-- | Wrap/Scroll up |
| 4 | Left line, T→B | (0,0) | Y++ | X++ | Wrap/Scroll right |
| 5 | Left line, B→T | (0,H-1) | Y-- | X++ | Wrap/Scroll right |
| 6 | Right line, T→B | (W-1,0) | Y++ | X-- | Wrap/Scroll left |
| 7 | Right line, B→T | (W-1,H-1) | Y-- | X-- | Wrap/Scroll left |

### 7.2 StepTrace Method (DebugDisplayUnit.pas:2982-3061)

**Purpose**: Advance pixel position after each pixel write

**Algorithm**:
```pascal
procedure TDebugDisplayForm.StepTrace;
var
  Scroll: boolean;
begin
  Scroll := vTrace and 8 <> 0;    // Bit 3 = scroll enable

  case vTrace and 7 of
    0:  // Top line, left-to-right
    begin
      if vPixelX <> vWidth - 1 then
        Inc(vPixelX)              // Continue current line
      else
      begin
        vPixelX := 0;             // Wrap to left edge
        if Scroll then
          ScrollBitmap(0, 1)      // Scroll down
        else if vPixelY <> vHeight - 1 then
          Inc(vPixelY)            // Next line down
        else
          vPixelY := 0;           // Wrap to top
      end;
    end;

    // ... similar logic for modes 1-7
  end;
end;
```

**Key Behaviors**:

1. **Horizontal Scan (modes 0-3)**:
   - Primary axis: X (advance every pixel)
   - Secondary axis: Y (advance at end of line)
   - Default rate: `vRate = vWidth`

2. **Vertical Scan (modes 4-7)**:
   - Primary axis: Y (advance every pixel)
   - Secondary axis: X (advance at end of column)
   - Default rate: `vRate = vHeight`

3. **Wrap vs. Scroll**:
   - **Wrap** (bit 3 = 0): Position wraps to opposite edge
   - **Scroll** (bit 3 = 1): Bitmap scrolls, new line filled with background

### 7.3 Common Trace Modes

**Mode 0 (top-left, L→R, no scroll)**:
- TV raster scan
- Sequential memory layout
- Use for: Video frames, image data

**Mode 8 (top-left, L→R, scroll down)**:
- Oscilloscope persistence display
- New data at top, old data scrolls down
- Use for: Waveform recording, chart recorder

**Mode 12 (left-top, T→B, scroll right)**:
- Vertical waveform display
- New data at left, old data scrolls right
- Use for: Strip chart, spectrogram

---

## 8. Pixel Rendering Modes

### 8.1 Normal Mode (vSparse = -1)

**Characteristics**:
- 1:1 pixel mapping (logical pixel = physical pixel)
- Direct scanline writes for maximum speed
- Client window size = bitmap size

**PlotPixel Implementation** (DebugDisplayUnit.pas:3433-3444):
```pascal
procedure TDebugDisplayForm.PlotPixel(p: integer);
begin
  p := TranslateColor(p, vColorMode);    // Convert to RGB24
  line := BitmapLine[vPixelY];           // Get scanline pointer (fast!)
  v := vPixelX * 3;                      // 3 bytes per pixel (BGR)
  line[v+0] := p shr 0;                  // Blue
  line[v+1] := p shr 8;                  // Green
  line[v+2] := p shr 16;                 // Red
end;
```

**Performance**: ~10 million pixels/second (direct memory write)

### 8.2 Sparse Mode (vSparse ≠ -1)

**Characteristics**:
- Magnified pixel display (logical pixel = vDotSize × vDotSizeY physical pixels)
- Grid borders between pixels
- Client window size = bitmap size × scale

**Configuration**:
```
size 64 64 dotsize 8 8 sparse $404040
```
- Creates 64×64 logical bitmap
- Each pixel rendered as 8×8 physical pixels
- Client window: 512×512 pixels
- Grid color: dark gray ($404040)

**Rendering** (BITMAP_Update, lines 2469-2479):
```pascal
// Calculate center of sparse pixel
x := vPixelX * vDotSize + vDotSize shr 1;
y := vPixelY * vDotSizeY + vDotSizeY shr 1;

// Draw border (full size, sparse color)
SmoothShape(x, y, vDotSize, vDotSizeY, 0, 0, 0, vSparse, 255);

// Draw inner fill (75% size, data color)
SmoothShape(x, y,
            vDotSize - vDotSize shr 2,
            vDotSizeY - vDotSizeY shr 2,
            vDotSize, vDotSizeY,
            0, TranslateColor(UnPack(v), vColorMode), 255);
```

**Visual Effect**:
```
┌─────┬─────┬─────┐
│█████│     │█████│
│█████│     │█████│
├─────┼─────┼─────┤
│     │█████│     │
│     │█████│     │
├─────┼─────┼─────┤
│█████│     │█████│
│█████│     │█████│
└─────┴─────┴─────┘
```
- Outer box: `vSparse` color (grid)
- Inner fill: data color (75% of cell)

**Use Cases**:
- Retro pixel art (magnified view)
- LED matrix simulation
- Low-resolution sensor displays
- Educational visualization

### 8.3 Display Update Control

**Automatic Update** (default):
```pascal
if RateCycle and not vUpdate then BitmapToCanvas(0);
```
- Display updates every `vRate` pixels
- Trade-off: Frequent updates = slow, Infrequent = choppy

**Manual Update**:
```pascal
// Configuration
update

// In code
if not vUpdate then BitmapToCanvas(0);    // Suppressed
```
- Requires explicit `UPDATE` command to refresh display
- Allows batch pixel writes without flicker
- Example:
  ```
  BITMAP `0 update 1000,2000,3000,4000 update
  ```

**Rate Cycle Timing**:
```pascal
function TDebugDisplayForm.RateCycle: boolean;
begin
  Inc(vRateCount);
  if vRateCount = vRate then
  begin
    vRateCount := 0;
    Result := True;
  end
  else Result := False;
end;
```

---

## 9. Scrolling System

### 9.1 ScrollBitmap Method (DebugDisplayUnit.pas:3446-3481)

**Purpose**: Shift bitmap content and fill vacated area with background

**Signature**:
```pascal
procedure TDebugDisplayForm.ScrollBitmap(x, y: integer);
```

**Parameters**:
- `x`: Horizontal scroll (-vWidth..+vWidth)
  - Positive = scroll right (content moves right)
  - Negative = scroll left (content moves left)
- `y`: Vertical scroll (-vHeight..+vHeight)
  - Positive = scroll down (content moves down)
  - Negative = scroll up (content moves up)

**Implementation**:
```pascal
// Calculate pixel multiplier for sparse mode
if vSparse = -1 then
begin
  xm := 1;        // Normal mode: 1:1
  ym := 1;
end
else
begin
  xm := vDotSize;   // Sparse mode: scale factor
  ym := vDotSizeY;
end;

// Define source and destination rectangles
src := Rect(0, 0, vWidth * xm, vHeight * ym);
dst := Rect(x * xm, y * ym, (vWidth + x) * xm, (vHeight + y) * ym);

// Copy bitmap to shifted position
Bitmap[0].Canvas.CopyRect(dst, Bitmap[0].Canvas, src);

// Fill vacated area with background color
Bitmap[0].Canvas.Brush.Color := WinRGB(GetBackground);

if x <> 0 then
begin
  if x < 0 then
    dst := Rect((vWidth + x) * xm, 0, vWidth * xm, vHeight * ym)     // Left strip
  else
    dst := Rect(0, 0, x * xm, vHeight * ym);                         // Right strip
  Bitmap[0].Canvas.FillRect(dst);
end;

if y <> 0 then
begin
  if y < 0 then
    dst := Rect(0, (vHeight + y) * ym, vWidth * xm, vHeight * ym)    // Bottom strip
  else
    dst := Rect(0, 0, vWidth * xm, y * ym);                          // Top strip
  Bitmap[0].Canvas.FillRect(dst);
end;
```

**Automatic Scrolling** (from StepTrace):
```pascal
if Scroll then ScrollBitmap(dx, dy)    // dx, dy = -1, 0, or 1
```
- Mode 0/1 (top line): ScrollBitmap(0, 1) — scroll down
- Mode 2/3 (bottom line): ScrollBitmap(0, -1) — scroll up
- Mode 4/5 (left line): ScrollBitmap(1, 0) — scroll right
- Mode 6/7 (right line): ScrollBitmap(-1, 0) — scroll left

**Manual Scrolling** (from BITMAP_Update):
```pascal
key_scroll:
  if KeyValWithin(x, -vWidth, vWidth) then
    if KeyValWithin(y, -vHeight, vHeight) then
      ScrollBitmap(x, y);
```

---

## 10. Display Update Messages and Commands

### 10.1 Command Structure
[Identical to FFT - see FFT documentation]

### 10.2 BITMAP Command Examples

#### Create BITMAP Window
```
Serial: 0xFF 0x00 "BITMAP `My Display size 320 240 luma8 orange" 0x0D

Parsed:
[0] type=ele_dis, value=1                (1 = create new)
[1] type=ele_num, value=7                (display type: dis_bitmap)
[2] type=ele_str, value="My Display"     (title)
[3] type=ele_key, value=key_size
[4] type=ele_num, value=320              (width)
[5] type=ele_num, value=240              (height)
[6] type=ele_key, value=key_luma8        (color mode)
[7] type=ele_key, value=key_orange       (color tune)
[8] type=ele_end
```

#### Update with Pixel Data
```
Serial: 0xFF 0x00 "BITMAP `0 100,120,140,160,180,200" 0x0D

Parsed:
[0] type=ele_dis, value=2                (2 = update existing)
[1] type=ele_num, value=0                (display index)
[2] type=ele_num, value=100              (pixel data)
[3] type=ele_num, value=120
[4] type=ele_num, value=140
[5] type=ele_num, value=160
[6] type=ele_num, value=180
[7] type=ele_num, value=200
[8] type=ele_end
```

#### Change Trace Mode Mid-Stream
```
Serial: 0xFF 0x00 "BITMAP `0 trace 8 clear" 0x0D

Effect: Switch to mode 8 (top-left, L→R, scroll down), then clear
```

#### Sparse Pixel Display
```
Serial: 0xFF 0x00 "BITMAP `LED Matrix size 8 8 dotsize 16 sparse $202020 lut4" 0x0D

Creates:
- 8×8 logical display
- 16×16 pixel per logical pixel
- Client window: 128×128 pixels
- Grid color: dark gray
- 4-bit color palette (16 colors)
```

#### Packed Data Example
```
Serial: 0xFF 0x00 "BITMAP `0 longs_8bit rgb8 100,200,300,400" 0x0D

Processing:
- longs_8bit: 4 samples per long
- Each long unpacks to 4 pixels
- Total pixels plotted: 4×4 = 16
```

### 10.3 Configuration Keywords

[See section 3.2 for complete list]

---

## 11. Drawing Primitives (PLOT Integration)

### 11.1 Overview

**Note**: BITMAP display shares most rendering infrastructure with PLOT display, but does **not** directly support PLOT drawing commands in BITMAP_Update. The primitives listed here are available in PLOT display and demonstrate the underlying rendering capabilities.

BITMAP can use these primitives indirectly via:
1. Sparse pixel mode (uses SmoothShape)
2. Shared sprite system
3. Future extensions

### 11.2 Available Primitives (from PLOT_Update)

#### Geometric Shapes (DebugDisplayUnit.pas:1980-2035)

**LINE** (lines 1980-2011):
```pascal
key_line:  // LINE x y {linesize {opacity}}
  SmoothLine(x1, y1, x2, y2, linesize, color, opacity);
```

**DOT** (lines 1965-1979):
```pascal
key_dot:   // DOT {linesize {opacity}}
  SmoothDot(x, y, radius, color, opacity);
```

**CIRCLE** (lines 2012-2035):
```pascal
key_circle:  // CIRCLE radius {linesize {opacity}}
  SmoothShape(x, y, radius*2, radius*2, radius, radius, linesize, color, opacity);
```

**OVAL** (lines 2012-2035):
```pascal
key_oval:  // OVAL width height {linesize {opacity}}
  SmoothShape(x, y, width, height, width/2, height/2, linesize, color, opacity);
```

**BOX** (lines 2012-2035):
```pascal
key_box:   // BOX width height {linesize {opacity}}
  SmoothShape(x, y, width, height, 0, 0, linesize, color, opacity);
```

**OBOX** (rounded box, lines 2012-2035):
```pascal
key_obox:  // OBOX width height xradius yradius {linesize {opacity}}
  SmoothShape(x, y, width, height, xradius, yradius, linesize, color, opacity);
```

#### Text Rendering (DebugDisplayUnit.pas:2043-2055)

**TEXT** (lines 2043-2055):
```pascal
key_text:  // TEXT {size {style {angle}}} 'string'
  AngleTextOut(x, y, string, style, angle);
```

**Styles** (bitwise encoding):
```
Bits 0-3: Font style
  0: Normal
  1: Bold
  2: Italic
  4: Underline
  8: Strikeout

Bits 4-5: Horizontal alignment
  0/1: Center
  2:   Left
  3:   Right

Bits 6-7: Vertical alignment
  0/1: Center
  2:   Top
  3:   Bottom
```

#### Bitmap Layers (DebugDisplayUnit.pas:2056-2089)

**LAYER** (lines 2056-2062):
```pascal
key_layer:  // LAYER layer 'filename.bmp'
  PlotBitmap[layer - 1].LoadFromFile(filename);
```
- Loads BMP file into layer 1-8
- Layers persist across updates

**CROP** (lines 2063-2089):
```pascal
key_crop:   // CROP layer {left top width height {x y}}
            // CROP layer AUTO x y
  Bitmap[0].Canvas.CopyRect(dst, PlotBitmap[layer-1].Canvas, src);
```
- Copies rectangular region from layer to main bitmap
- AUTO mode: copies entire layer

### 11.3 SmoothShape Method (DebugDisplayUnit.pas:3582-3735)

**Purpose**: Draw anti-aliased rectangle/oval with optional frame

**Signature**:
```pascal
procedure TDebugDisplayForm.SmoothShape(xc, yc,           // Center position
                                         xs, ys,           // Size (width, height)
                                         xro, yro,         // Corner radii (0=rectangle)
                                         thick,            // Frame thickness (0=solid)
                                         color: integer;   // RGB color
                                         opacity: byte);   // Alpha (0-255)
```

**Parameters**:
- `xc, yc`: Center coordinates
- `xs, ys`: Outer dimensions
- `xro, yro`: Corner radii (0 = sharp corners)
- `thick`: Frame thickness (0 = filled)
- `color`: RGB24 color
- `opacity`: Alpha blend factor

**Rendering Algorithm**:

1. **Setup** (lines 3597-3606):
   - Validate parameters
   - Call `SmoothFillSetup(xs, color)` to prepare color buffer
   - Determine if solid or frame, rectangle or oval

2. **Rectangle Fast Path** (lines 3611-3628):
   ```pascal
   if rectangle then
   begin
     if solid then
       SmoothRect(x, y, width, height, opacity)    // Single filled rectangle
     else
     begin
       SmoothRect(top);     // Draw 4 frame edges
       SmoothRect(bottom);
       SmoothRect(left);
       SmoothRect(right);
     end;
   end;
   ```

3. **Oval Rendering** (lines 3629-3735):
   - Compute lookup tables for rounded corners (using sin/arccos)
   - Draw flat sections (top/bottom/left/right strips)
   - Draw 4 rounded corners with anti-aliasing
   - Blend pixels based on distance from edge

**Anti-Aliasing**:
```pascal
// For each pixel near edge:
xopa := 255 - Abs(distance_to_edge) * 255;    // Alpha based on distance
SmoothPixel(x, y, color, xopa * opacity / 255);
```

---

## 12. Sprite System

> **Note**: `SPRITEDEF` and `SPRITE` directives are processed only in `PLOT_Update`, not in `BITMAP_Update`. BITMAP shares the sprite data arrays (see §17.3), but the BITMAP window does **not** accept sprite commands. This section documents the shared data structures and the PLOT-side command handling for reference.

### 12.1 Sprite Data Structures (DebugDisplayUnit.pas:397-400)

```pascal
SpritePixels  : array[0..SpriteMax * SpriteMaxX * SpriteMaxY - 1] of byte
SpriteColors  : array[0..SpriteMax * 256 - 1] of integer
SpriteSizeX   : array[0..SpriteMax - 1] of byte
SpriteSizeY   : array[0..SpriteMax - 1] of byte

SpriteMax     = 256      // Maximum sprite count
SpriteMaxX    = 32       // Maximum sprite width
SpriteMaxY    = 32       // Maximum sprite height
```

**Memory Layout**:
```
Sprite 0: SpritePixels[0..1023]      (32×32 = 1024 pixels)
          SpriteColors[0..255]       (256-entry palette)
          SpriteSizeX[0], SpriteSizeY[0]

Sprite 1: SpritePixels[1024..2047]
          SpriteColors[256..511]
          SpriteSizeX[1], SpriteSizeY[1]

... (total 256 sprites)
```

### 12.2 SPRITEDEF Command (DebugDisplayUnit.pas:2090-2101)

**Syntax**:
```
SPRITEDEF id xsize ysize pixels... colors...
```

**Parameters**:
- `id`: Sprite index (0-255)
- `xsize`: Width (1-32)
- `ysize`: Height (1-32)
- `pixels`: xsize×ysize pixel values (0-255)
- `colors`: 256 RGB24 palette entries

**Processing**:
```pascal
key_spritedef:
begin
  if not KeyValWithin(t1, 0, SpriteMax - 1) then Break;     // id
  if not KeyValWithin(t2, 1, SpriteMaxX) then Break;        // xsize
  if not KeyValWithin(t3, 1, SpriteMaxY) then Break;        // ysize

  SpriteSizeX[t1] := t2;
  SpriteSizeY[t1] := t3;

  for i := 0 to t2 * t3 - 1 do
    if not KeyVal(t4) then Break
    else SpritePixels[t1 * SpriteMaxX * SpriteMaxY + i] := t4;

  for i := 0 to 255 do
    if not KeyVal(SpriteColors[t1 * 256 + i]) then Break;
end;
```

**Example**:
```
SPRITEDEF 0 8 8
  0,1,2,3,4,5,6,7,
  8,9,10,11,12,13,14,15,
  ... (64 total pixels)
  $000000,$110000,$220000,... (256 colors)
```

### 12.3 SPRITE Command (DebugDisplayUnit.pas:2102-2134)

**Syntax**:
```
SPRITE id {orientation {scale {opacity}}}
```

**Parameters**:
- `id`: Sprite index (0-255)
- `orientation`: Rotation/flip (0-7, default 0)
- `scale`: Size multiplier (1-64, default 1)
- `opacity`: Alpha (0-255, default 255)

**Orientation Modes**:
```
0: Normal          (no flip)
1: Flip X          (mirror horizontal)
2: Flip Y          (mirror vertical)
3: Flip X+Y        (rotate 180°)
4: Transpose       (swap X/Y, rotate 90° CCW)
5: Transpose + FlipY
6: Transpose + FlipX
7: Transpose + FlipX+Y
```

**Rendering** (lines 2117-2133):
```pascal
for y := 1 to SpriteSizeY[id] do
  for x := 1 to SpriteSizeX[id] do
  begin
    c := SpriteColors[id * 256 + SpritePixels[offset]];    // Lookup color
    opa := ((c shr 24 and $FF) * opacity + $FF) shr 8;     // Alpha from color + parameter

    if opa <> 0 then
      case orientation of
        0: SmoothShape(px + (x-1)*scale, py + (y-1)*scale, scale, scale, 0, 0, 0, c, opa);
        1: SmoothShape(px + (w-x)*scale, py + (y-1)*scale, scale, scale, 0, 0, 0, c, opa);  // FlipX
        2: SmoothShape(px + (x-1)*scale, py + (h-y)*scale, scale, scale, 0, 0, 0, c, opa);  // FlipY
        3: SmoothShape(px + (w-x)*scale, py + (h-y)*scale, scale, scale, 0, 0, 0, c, opa);  // FlipX+Y
        4: SmoothShape(px + (y-1)*scale, py + (x-1)*scale, scale, scale, 0, 0, 0, c, opa);  // Transpose
        5: SmoothShape(px + (y-1)*scale, py + (w-x)*scale, scale, scale, 0, 0, 0, c, opa);
        6: SmoothShape(px + (h-y)*scale, py + (x-1)*scale, scale, scale, 0, 0, 0, c, opa);
        7: SmoothShape(px + (h-y)*scale, py + (w-x)*scale, scale, scale, 0, 0, 0, c, opa);
      end;
  end;
```

**Color Alpha** (bits 24-31 of color):
```pascal
// In SPRITEDEF colors:
color = $80RRGGBB    // Alpha = 0x80 (50% transparent)
color = $FFRRGGBB    // Alpha = 0xFF (opaque)
color = $00RRGGBB    // Alpha = 0x00 (invisible)
```

---

## 13. Performance Characteristics

### 13.1 Pixel Throughput

**Normal Mode (PlotPixel)**:
- **Direct scanline write**: ~10 million pixels/second
- Memory bandwidth limited (3 bytes/pixel write)
- No overhead (no function calls after TranslateColor)

**Sparse Mode (SmoothShape)**:
- **Anti-aliased rendering**: ~100,000 pixels/second
- Each logical pixel → 2 SmoothShape calls + blending
- CPU-intensive (floating-point, alpha blending)

**Comparison**:
```
320×240 bitmap (76,800 pixels):
  Normal mode:  ~7.7 ms per frame  (130 FPS max)
  Sparse mode:  ~768 ms per frame  (1.3 FPS max)
```

### 13.2 Memory Usage

**Bitmap Storage**:
```pascal
Bitmap[0]: vWidth × vHeight × 3 bytes
Bitmap[1]: vWidth × vHeight × 3 bytes

Example (640×480):
  Bitmap[0]: 921,600 bytes (900 KB)
  Bitmap[1]: 921,600 bytes (900 KB)
  Total:     1,843,200 bytes (1.8 MB)
```

**Sprite Storage**:
```pascal
SpritePixels: 256 sprites × 32×32 pixels = 262,144 bytes (256 KB)
SpriteColors: 256 sprites × 256 colors × 4 bytes = 262,144 bytes (256 KB)
SpriteSizeX:  256 bytes
SpriteSizeY:  256 bytes
Total:        ~524 KB
```

**Scanline Pointers**:
```pascal
BitmapLine: 2048 pointers × 4/8 bytes = 8-16 KB
```

**Total Memory** (640×480 + sprites): ~2.4 MB

### 13.3 Serial Bandwidth

**Uncompressed** (RGB24):
```
320×240 × 3 bytes × 30 FPS = 6.9 MB/sec
Serial port (2 Mbaud): ~200 KB/sec
Conclusion: Cannot stream full-color video
```

**Compressed** (LUT4):
```
320×240 × 0.5 bytes × 30 FPS = 1.15 MB/sec
Still exceeds serial bandwidth
```

**Practical Frame Rates**:
```
RGB24 (3 bytes/pixel):
  64×64:   3 KB/frame  → 66 FPS
  128×128: 49 KB/frame → 4 FPS
  320×240: 225 KB/frame → 0.9 FPS

LUT4 (0.5 bytes/pixel):
  64×64:   2 KB/frame  → 100 FPS (achievable)
  128×128: 8 KB/frame  → 25 FPS
  320×240: 38 KB/frame → 5 FPS
```

**Recommendation**: Use LUT/LUMA modes for higher frame rates

---

## 14. Key Behaviors and Edge Cases

### 14.1 Color Mode Switching

**Runtime Change**:
```pascal
key_lut1..key_rgb24:
  KeyColorMode;    // Immediate effect on next pixel
```

**Effect**:
- All subsequent pixels interpreted in new mode
- Existing pixels unchanged (already rendered)
- LUT colors preserved across mode changes

**Example**:
```
BITMAP `0 rgb24 $FF0000,$00FF00,$0000FF lut4 0,1,2,3
```
- First 3 pixels: RGB24 (red, green, blue)
- Next 4 pixels: LUT4 (indices 0,1,2,3 → undefined colors!)

### 14.2 Trace Mode Switching

**Runtime Change**:
```pascal
key_trace:
  if NextNum then SetTrace(val, True);
```

**Effect**:
- Pixel position reset to new starting corner
- Scan direction changed
- `vRate` adjusted for new pattern (if ModifyRate=True)

**Example**:
```
BITMAP `0 trace 0 100,200,300 trace 12 400,500,600
```
- Pixels 100,200,300: Trace 0 (top-left, L→R)
- Position reset to (0,0)
- Pixels 400,500,600: Trace 12 (left-top, T→B, scroll right)

### 14.3 Buffer Wrapping

**Automatic Wrapping** (no scroll):
```pascal
if vPixelY <> vHeight - 1 then
  Inc(vPixelY)
else
  vPixelY := 0;    // Wrap to top
```

**Overflow Protection**:
- Pixel position never exceeds bitmap bounds
- Wrap-around prevents crashes
- Old data overwritten (circular buffer behavior)

### 14.4 Packed Data Alignment

**Issue**: Packed data may not align with display dimensions

**Example**:
```
size 100 100 longs_8bit
```
- Each long = 4 pixels
- 100×100 = 10,000 pixels
- 10,000 ÷ 4 = 2,500 longs (exact)
- No issue

**Misaligned Example**:
```
size 100 100 longs_1bit
```
- Each long = 32 pixels
- 10,000 pixels ÷ 32 = 312.5 longs
- Last long has 16 unused bits
- StepTrace continues to next line mid-long

**Recommendation**: Choose bitmap size divisible by pack count

### 14.5 Sparse Mode Scaling

**Integer Scaling Only**:
```pascal
key_dotsize:
  if KeyValWithin(vDotSize, 1, 256) then ...
```
- Only integer scales supported (1, 2, 3, ..., 256)
- Fractional scales not available

**Client Window Size**:
```pascal
ClientWidth  := vWidth * vDotSize;
ClientHeight := vHeight * vDotSizeY;
```
- Can create very large windows (256×256 × 256 = 65,536 pixels wide!)
- May exceed screen dimensions

**Recommendation**: Keep `vDotSize × max(vWidth, vHeight) < 2048`

---

## 15. Integration Points

### 15.1 Serial Protocol
[Identical to FFT - see FFT documentation]

### 15.2 P2 Global Variables
[Identical to FFT - see FFT documentation]

### 15.3 Form Lifecycle
[Similar to FFT - see FFT documentation]

### 15.4 Shared Infrastructure

**With SPECTRO** (dis_spectro = 4):
- Same scaling system (`vDotSize`, `vDotSizeY`)
- Same color modes
- Different trace behavior (SPECTRO always scrolls)

**With PLOT** (dis_plot = 5):
- Shared sprite system
- Shared drawing primitives (SmoothShape, SmoothLine, etc.)
- PLOT has coordinate system, BITMAP does not

**With TERM** (dis_term = 6):
- Different rendering (text-based vs. pixel-based)
- No shared infrastructure

---

## 16. Advanced Features

### 16.1 Manual Pixel Positioning

**SET Command** (DebugDisplayUnit.pas:2433-2438):
```pascal
key_set:
begin
  vTrace := vTrace and 7;     // Disable scrolling
  if KeyValWithin(vPixelX, 0, vWidth - 1) then
    KeyValWithin(vPixelY, 0, vHeight - 1);
end;
```

**Example**:
```
BITMAP `0 set 50 75 $FF0000 set 100 150 $00FF00
```
- Pixel at (50,75) = red
- Pixel at (100,150) = green
- No trace advancement

**Use Case**: Random-access pixel writes (not streaming)

### 16.2 Bitmap Scrolling

**SCROLL Command** (DebugDisplayUnit.pas:2439-2442):
```pascal
key_scroll:
  if KeyValWithin(x, -vWidth, vWidth) then
    if KeyValWithin(y, -vHeight, vHeight) then
      ScrollBitmap(x, y);
```

**Example**:
```
BITMAP `0 scroll 10 0    // Scroll right 10 pixels
BITMAP `0 scroll 0 -5    // Scroll up 5 pixels
```

**Use Cases**:
- Pan image
- Adjust waveform position
- Implement custom scroll patterns

### 16.3 LUT Animation

**Dynamic Palette**:
```
BITMAP `0 lut8 lutcolors $000000,$110000,...,$FF0000    // Red gradient
... (draw image using LUT8)
BITMAP `0 lutcolors $000000,$001100,...,$00FF00         // Change to green gradient
```

**Effect**:
- Image pixels unchanged
- Colors reinterpreted via new palette
- Instant color shift (no redraw needed)

**Use Cases**:
- Palette cycling effects
- False-color mapping
- Night mode toggle

### 16.4 Multi-Resolution Display

**Approach 1: Sparse scaling**
```
BITMAP `Low Res size 64 64 dotsize 4 sparse $000000
```
- 64×64 logical pixels
- 256×256 physical display
- Grid borders for clarity

**Approach 2: Normal + manual positioning**
```
BITMAP `High Res size 256 256
... draw at 1:1
SET 64 64  // Jump to sub-region
... draw detailed area
```

---

## 17. Limitations and Constraints

### 17.1 Bitmap Size

**Constraint**:
```pascal
bitmap_wmin = 1
bitmap_wmax = SmoothFillMax = 2048
bitmap_hmin = 1
bitmap_hmax = SmoothFillMax = 2048
```

**Maximum**: 2048×2048 = 4,194,304 pixels = 12 MB (×2 for double buffer = 24 MB)

**Practical Limit**: Memory allocation fails above ~1024×1024 on some systems

### 17.2 Sparse Mode Limits

**Constraint**:
```pascal
key_dotsize:
  if KeyValWithin(vDotSize, 1, 256) then ...
```

**Maximum Client Size**: 2048 × 256 = 524,288 pixels (exceeds screen!)

**Rendering Speed**: SmoothShape very slow for large scales

### 17.3 Sprite Limits

**Constraints**:
```pascal
SpriteMax   = 256     // 256 sprites
SpriteMaxX  = 32      // 32 pixels wide
SpriteMaxY  = 32      // 32 pixels tall
```

**Memory**: 512 KB (fixed allocation, even if unused)

**Rendering**: Sprites not available in BITMAP (only PLOT)

### 17.4 Color Mode Restrictions

**LUT Modes**: Require palette definition
```
BITMAP `0 lut4        // LUT undefined! Colors = garbage
BITMAP `0 lut4 lutcolors $000000,$111111,...,$FFFFFF    // Correct
```

**HSV Modes**: Rely on PolarColors[] pre-computed table
- Cannot customize hue wheel
- `vColorTune` only shifts hue, doesn't redefine colors

### 17.5 No Built-In Drawing Commands

**BITMAP vs. PLOT**:
- BITMAP: Pixel data only (no LINE, CIRCLE, TEXT, etc.)
- PLOT: Full drawing primitives

**Workaround**: Use PLOT for graphics, then send result to BITMAP via screen capture or manual pixel copying

### 17.6 No Zooming

**Fixed Scale**:
- Normal mode: 1:1 pixel mapping
- Sparse mode: Integer scaling only
- No fractional zooming

**Workaround**: Pre-scale image data on P2 before sending

### 17.7 Single Color Mode at a Time

**Constraint**: `vColorMode` is global

**Cannot Mix**:
```
BITMAP `0 lut4 0,1,2,3 rgb24 $FF0000,$00FF00,$0000FF
```
- First 4 pixels: LUT4 (indices 0,1,2,3)
- Next 3 pixels: RGB24 (but mode already switched!)

**Workaround**: Send all pixels of one mode, then switch, then send next mode

---

## 18. Comparison to Related Display Types

### 18.1 vs. SPECTRO (dis_spectro = 4)

**SPECTRO**:
- Scrolling waterfall display (FFT over time)
- Automatic trace with scroll
- Color-coded magnitude
- No manual pixel access

**BITMAP**:
- General-purpose pixel canvas
- 8 trace modes (wrap or scroll)
- Manual pixel positioning
- Direct pixel data

**Shared**:
- Same color modes
- Same sparse pixel system
- Same scaling (vDotSize, vDotSizeY)

**Code Overlap**: ~60% (color translation, scaling, trace)

### 18.2 vs. PLOT (dis_plot = 5)

**PLOT**:
- Vector graphics (lines, shapes, text)
- Coordinate system with origin/offset
- Drawing primitives
- Sprite rendering

**BITMAP**:
- Raster graphics (pixels)
- Sequential trace patterns
- No drawing commands
- (Sprites in PLOT only)

**Shared**:
- Same bitmap storage
- Same sprite arrays
- Same rendering (SmoothShape, SmoothLine)

**Code Overlap**: ~40% (rendering primitives)

### 18.3 vs. TERM (dis_term = 6)

**TERM**:
- Text-only display
- Character grid
- ASCII rendering
- ANSI color codes

**BITMAP**:
- Pixel-based display
- Arbitrary resolution
- Raw pixel data
- 19 color modes

**Shared**:
- None (completely different)

### 18.4 vs. SCOPE (dis_scope = 1)

**SCOPE**:
- Time-domain waveform
- Analog samples
- Trigger system
- Channel overlays

**BITMAP**:
- Frequency-domain or arbitrary pixel data
- No trigger
- Trace patterns instead of channels

**Shared**:
- Sample buffer structure (Y_SampleBuff)
- Packed data support

---

## 19. Element Array Protocol Specification

### 19.1 Protocol Overview

The BITMAP display (and all debug displays) receives commands and data through an **element array protocol**. This ASCII-based protocol uses simple type-value pairs.

**Core Concept**: Messages are sequences of **(type, value)** pairs stored in parallel arrays:
- `DebugDisplayType[i]`: Element type (byte)
- `DebugDisplayValue[i]`: Element value (integer or pointer to string)

**GlobalUnit.pas:126-127**:
```pascal
DebugDisplayType:   array[0..DebugDisplayLimit-1] of byte;
DebugDisplayValue:  array[0..DebugDisplayLimit-1] of integer;
DebugDisplayLimit = 1100;  // 1k data elements + commands
```

### 19.2 Element Type Constants

```pascal
const
  ele_end   = 0;    // End of message
  ele_key   = 3;    // Keyword/command
  ele_num   = 4;    // Numeric value
  ele_str   = 5;    // String (PChar pointer)
```

### 19.3 Configuration Example

**Propeller 2 Command**:
```spin2
debug(`BITMAP SIZE 320 240 TRACE 8 LUT8 LONGS_1BIT DOTSIZE 2)
```

**Parsed as**:
```
[ele_key:key_size] [ele_num:320] [ele_num:240]
[ele_key:key_trace] [ele_num:8]
[ele_key:key_lut8]
[ele_key:key_longs_1bit]
[ele_key:key_dotsize] [ele_num:2]
[ele_end]
```

**Parser reads sequentially**: `while NextKey do case val of...`

### 19.4 Pixel Data Example

**Sending pixel values**:
```spin2
' Send 32 1-bit pixels packed into one long
packed := %11110000_10101010_11001100_00001111
debug(`BITMAP `UDEC_(packed))
```

**Parsed as**:
```
[ele_num:packed] [ele_end]
```

**BITMAP_Update unpacks**: 32 pixels from single integer using UnPack().

---

## 20. Buffer Management and Timing

### 20.1 No Sample Buffer

**Key Difference**: Unlike SCOPE/FFT, BITMAP has **no circular sample buffer**.

**Direct Rendering**: Pixels written directly to Bitmap[0] as received.

**Memory**: Only bitmap storage (width × height × 3 bytes for RGB24).

### 20.2 Write Operation Timing

**When Pixels Are Written** (BITMAP_Update):

```pascal
while NextNum do
begin
  v := NewPack;                    // Get packed value
  for i := 1 to vPackCount do      // Unpack samples
  begin
    p := UnPack(v);                // Extract pixel value
    PlotPixel(p);                  // WRITE IMMEDIATELY to Bitmap[0]
    StepTrace;                     // Advance to next position
  end;
end;
```

**Write Characteristics**:
- **Immediate**: No buffering, straight to bitmap
- **Frequency**: On every `ele_num` received
- **Trace position**: Updated after each pixel (vPixelX, vPixelY)
- **Scrolling**: Triggered when edge reached (if scroll bit set)

**Example** (trace mode 0, left-to-right):
```
Pixel 1: PlotPixel at (0,0), StepTrace → (1,0)
Pixel 2: PlotPixel at (1,0), StepTrace → (2,0)
...
Pixel 320: PlotPixel at (319,0), StepTrace → (0,1) + maybe scroll
```

### 20.3 SET Command (Random Access)

**Direct Positioning**:
```pascal
key_set:
begin
  vTrace := vTrace and 7;              // Cancel scrolling (clear bit 3)
  if KeyValWithin(vPixelX, 0, vWidth - 1) then
    KeyValWithin(vPixelY, 0, vHeight - 1);
end;
```

**Allows**: Jump to any (x,y) position without trace pattern; also cancels scroll mode.

**Use Case**: Drawing non-sequential graphics (sprites, text, shapes).

### 20.4 Display Update Timing

**BitmapToCanvas Call** (line 2480):
```pascal
if RateCycle and not vUpdate then BitmapToCanvas(0);
```
- **Automatic (default)**: Display updates every `vRate` pixels via `RateCycle`. Both normal and sparse pixel paths share the same `RateCycle` gate.
- **Manual mode** (`vUpdate = True`): `BitmapToCanvas` is suppressed during pixel writes; explicit `UPDATE` directive forces refresh.
- `RateCycle` increments `vRateCount` and returns `True` when it reaches `vRate`, then resets to 0 (lines 3079–3088).

---

## 21. Bitmap System and Double-Buffering

### 21.1 Bitmap Architecture

**Two-Bitmap System**:
```pascal
Bitmap[0]: TBitmap;    // Render target (back buffer)
Bitmap[1]: TBitmap;    // Display buffer (front buffer)
```

**Pixel Format**: 24-bit RGB (3 bytes/pixel), BGR in memory.

**Memory** (320×240 example):
```
320 × 240 × 3 = 230,400 bytes ≈ 225 KB per bitmap
Total: 450 KB for both bitmaps
```

### 21.2 Canvas Display Scaling

`BitmapToCanvas` always uses `StretchDraw` for BITMAP (and also for SPECTRO and PLOT), regardless of sparse mode. Normal mode: `vClientWidth = vWidth`, `vClientHeight = vHeight`, so the stretch is 1:1. Sparse mode: `vClientWidth = vWidth * vDotSize`, `vClientHeight = vHeight * vDotSizeY`, so the bitmap is scaled up (lines 3522–3530):

```pascal
procedure TDebugDisplayForm.BitmapToCanvas(Level: integer);
begin
  if Level = 0 then
    Bitmap[1].Canvas.Draw(0, 0, Bitmap[0]);   // copy back→front
  if DisplayType in [dis_spectro, dis_plot, dis_bitmap] then
    Canvas.StretchDraw(Rect(0, 0, vClientWidth, vClientHeight), Bitmap[1])
  else
    Canvas.Draw(0, 0, Bitmap[1]);
end;
```

**Effect in sparse mode**: 64×64 logical bitmap stretched to `64*vDotSize × 64*vDotSizeY` physical pixels. The `SmoothShape` grid is drawn directly into `Bitmap[0]` at physical coordinates before the copy, so the grid lines are part of the bitmap data, not overlaid by the stretch.

### 21.3 BitmapToCanvas Operation

```pascal
procedure BitmapToCanvas(Level: integer);
begin
  if Level = 0 then
    Bitmap[1].Canvas.Draw(0, 0, Bitmap[0]);    // Copy back→front

  // BITMAP uses StretchDraw for scaling
  Canvas.StretchDraw(Rect(0, 0, vClientWidth, vClientHeight), Bitmap[1]);
end;
```

### 21.4 PlotPixel Implementation

```pascal
procedure PlotPixel(p: integer);
var
  v: integer;
  line: PByteArray;
begin
  p := TranslateColor(p, vColorMode);    // Convert to RGB24
  line := BitmapLine[vPixelY];           // Scanline pointer
  v := vPixelX * 3;
  line[v+0] := p shr 0;                  // Blue
  line[v+1] := p shr 8;                  // Green
  line[v+2] := p shr 16;                 // Red
end;
```

**Performance**: Direct memory write, no GDI overhead.

---

## 22. Shared Infrastructure

### 22.1 Color Translation System

**TranslateColor Function**: Converts 19 color modes to RGB24.

**BITMAP-Specific Modes** (grouped by whether `KeyColorMode` consumes a tint token, 2785–2804):
- **Consume a tint token:**
  - **LUMA8/8W/8X**: Luminance with color tint — tint is a `key_orange..key_gray` color keyword **or** a number (a non-color keyword is pushed back via `Dec(ptr)` and re-parsed as the next directive).
  - **HSV8/8W/8X, HSV16/16W/16X**: Hue-saturation-value — tint is a **number only** (`vColorTune` hue shift).
- **Consume NO tint token:**
  - **RGBI8/8W/8X**: RGB + intensity — the color selector comes from the pixel's own upper 3 bits (`p shr 5 and 7`), not a tint.
  - **LUT1/2/4/8**: Palette lookup (2–256 colors).
  - **RGB8/16/24**: Direct RGB.

**Example** (LUT8):
```pascal
p := vLut[p and $FF];    // Index into 256-color palette
```

**Color constants**: BITMAP has **no fixed channel/trace palette** (the
`DefaultScopeColors` table does not apply) — every pixel color is produced by
`TranslateColor` from the active color mode/LUT. The only fixed color constants are
the **background** values returned by `GetBackground` (`DebugDisplayUnit.pas`
3180–3205), selected by color mode:

| Color mode | Background | Hex |
|---|---|---|
| LUT1/2/4/8 | `vLut[0]` | (first palette entry) |
| LUMA8/8X, HSV8/8X, RGBI8/8X, RGB8, HSV16/16X, RGB16, RGB24 | `clBlack` | `$000000` |
| LUMA8W, HSV8W, RGBI8W, HSV16W (white-base "W" modes) | `clWhite` | `$FFFFFF` |

`clBlack`/`clWhite` are literal RGB24 values (`DebugDisplayUnit.pas` 187–188).

### 22.2 Data Packing System

**BITMAP uses 12 packing modes**:
```
LONGS_1BIT:  32 pixels/long (1-bit per pixel)
LONGS_2BIT:  16 pixels/long (2-bit per pixel)
...
BYTES_4BIT:  2 pixels/byte (4-bit per pixel)
```

**SetPack/UnPack**: Same as FFT (shared code).

**Bandwidth Savings**: 32× reduction with LONGS_1BIT.

### 22.3 Trace System

**StepTrace Function**: Advances (vPixelX, vPixelY) based on vTrace mode.

**8 Directions**: Left/right-to-right, top/bottom-to-top, with/without scrolling.

**Shared**: Used by BITMAP, SPECTRO, PLOT (not SCOPE/FFT/LOGIC).

### 22.4 ScrollBitmap Function

**Shifts bitmap contents** when edge reached:
```pascal
Canvas.CopyRect(dst, Canvas, src);    // Shift pixels
Canvas.FillRect(exposed_area);        // Clear new area
```

**Shared**: BITMAP, SPECTRO (for waterfall effect).

---

## 23. Initialization Lifecycle

### 23.1 Window Creation

**1. Form Created**: `TDebugDisplayForm.Create(Owner)`

**2. Bitmaps Allocated**:
```pascal
Bitmap[0] := TBitmap.Create;
Bitmap[1] := TBitmap.Create;
Bitmap[0].PixelFormat := pf24bit;
Bitmap[1].PixelFormat := pf24bit;
```

**3. BITMAP_Configure Called**:
```pascal
DisplayType := DebugDisplayValue[0];    // dis_bitmap = 7
ptr := 2;
case DisplayType of
  dis_bitmap: BITMAP_Configure;
end;
```

**4. Configuration Parsing**:
```pascal
// Set defaults
vTrace := 0;
vDotSize := 1;
vColorMode := key_rgb24;   // SetDefaults (line 2889); overridden by color-mode directive in BITMAP_Configure

// Parse parameters
while NextKey do
  case val of
    key_size: ...;
    key_trace: ...;
    key_lut1..key_rgb24: KeyColorMode;
    key_longs_1bit..key_bytes_4bit: KeyPack;
  end;
```

**5. Bitmap Sizing**:
```pascal
Bitmap[0].Width := vWidth;
Bitmap[0].Height := vHeight;
SetSize(0, 0, 0, 0);
SetTrace(vTrace, vRate = 0);    // ModifyRate = (no RATE given); see §3.2
if vRate = -1 then vRate := vWidth * vHeight;
```

> **Note:** in the configure path `ModifyRate` is the boolean `vRate = 0` (line 2412) — true only when no `RATE` directive was supplied — **not** the literal `True`. (The mid-stream `TRACE` handler does pass `True`, line 2430.)

**6. Ready**: Window displayed, trace at initial position, waiting for pixels.

### 23.2 Message Processing Loop

```
┌─→ 1. Serial data arrives
│   2. BITMAP_Update called
│   3. Pixel written → Bitmap[0]
│   4. StepTrace advances position
│   5. BitmapToCanvas → display updated
└─── Loop
```

**Termination**: User closes window, bitmaps auto-freed by Delphi.

---

## 24. Receiving types & numeric parity (TS-port contract)

This section pins the exact numeric semantics a TypeScript port must reproduce. All deviations from "obvious" JS arithmetic are called out.

### 24.1 Receiving field types and bounding

- Every receiving field is a **signed 32-bit Delphi `integer`** (`val`, all `v*` state — see field declarations, e.g. `val` at line 358). Arithmetic **wraps** modulo 2³² with two's-complement sign; a port must mask/sign-extend to 32 bits, not use JS doubles.
- **`vTrace` / `vRate` are stored raw via `KeyVal` (unclamped)** — `KeyVal` (2694–2698) just copies `val`, with no `Within` clamp (contrast `KeyValWithin`, 2706–2710, which applies `Within`). The raw value is bounded only later:
  - `vTrace` is masked at use: `SetTrace` does `vTrace := Path and $F` (2979), so only the low 4 bits matter.
  - `vRate` is special-cased: `−1 ⇒ vWidth × vHeight` after configure (2413); otherwise used as-is by `RateCycle`.
- **`SCROLL` bounds are signed**: `KeyValWithin(x, −vWidth, vWidth)` and `(y, −vHeight, vHeight)` (2440–2441) — negative values are legal and meaningful (scroll left/up).
- **`SET` bounds** are `0..vWidth−1` / `0..vHeight−1` (2436–2437), unsigned.

### 24.2 Parity notes (exact arithmetic to mirror)

- **`shr` is a *logical* shift** in the sparse-center math: `vDotSize shr 1`, `vDotSizeY shr 1` (center), `vDotSize shr 2`, `vDotSizeY shr 2` (inner-fill inset), lines 2470–2476. Port with `>>>`, not `>>`.
- **`UnPack` (4166–4171)**: `v shr vPackShift` is **logical** (`>>>`), but sign-extension is **signed** — when `vPackSignx` and the top extracted bit (bit `vPackShift−1`) is set, it does `Result := Result or ($FFFFFFFF xor vPackMask)` (4170). A port must reproduce the sign-extend-from-`vPackShift−1` behavior, then keep the result as a signed 32-bit value.
- **`NewPack` ALT swizzle (4158–4164)**: the bit-pair/nibble swap uses **logical** shifts (`shr`/`shl` with `$55555555`/`$AAAAAAAA`, etc.). Logical-shift in the port.
- **`PolarColors` table build (3215–3227)** uses Delphi **`Round` (banker's rounding — round-half-to-even)**, not `Math.round` (round-half-up). The two differ on exact `.5` cases; use a banker's-round implementation to match the generated hue→RGB table.
- **`RateCycle` (3079–3088)** uses an exact equality test `vRateCount = vRate`. If `vRate` is negative or zero, the counter (incremented by 1 each pixel) never equals it until the counter **wraps** through 2³¹/2³² — i.e. the auto-refresh effectively never fires for a non-positive rate until 32-bit wrap. Port the comparison as exact `===` on wrapped 32-bit values, not `>=`.

### 24.3 Control-flow / edge facts (silent drops)

- **Stray `STRING` aborts the whole update message.** `BITMAP_Update`'s loop begins `if NextStr then Break;` (2422). `Break` exits the entire `while not NextEnd` loop, so a string mid-stream **silently drops all remaining commands and pixels** in that message — not just the string.
- **`KeyPack` loses a trailing non-modifier key.** `KeyPack` (2817–2832) peeks the next element with `NextKey`; if it is **not** `key_alt`/`key_signed`, that key is **consumed and lost** — there is **no `Dec(ptr)` push-back** (unlike `KeyColorMode`'s LUMA path at 2794 and the `KeyIs`-style handlers). A keyword directly following a pack keyword is silently swallowed.
- **Mid-stream `TRACE` only acts `if NextNum`** (2430): `key_trace: if NextNum then SetTrace(val, True);`. With no following number the directive is a no-op (and `SetTrace` here passes `ModifyRate = True`, so it *does* recompute `vRate`).
- **`SET` cancels scroll via `and 7`** (2435): `vTrace := vTrace and 7` clears **bit 3** (scroll-enable) while keeping the scan pattern — distinct from the configure path's `SetTrace`, which preserves the scroll bit via `vTrace := Path and $F` (2979).

---

## Conclusion

The BITMAP window implementation in DebugDisplayUnit.pas represents a highly versatile pixel-based visualization system with the following characteristics:

### Strengths:
1. **19 Color Modes**: Comprehensive palette/color format support (LUT, LUMA, HSV, RGB)
2. **8 Trace Patterns**: Flexible scan modes with optional scrolling
3. **Sparse Pixel Mode**: Magnified display with grid (ideal for retro graphics)
4. **Packed Data**: Bandwidth optimization for low-resolution displays
5. **Runtime Configuration**: Change modes, palettes, trace patterns mid-stream
6. **Direct Memory Access**: Fast scanline writes for maximum throughput
7. **Double Buffering**: Flicker-free display updates
8. **Integration**: Shares infrastructure with SPECTRO and PLOT

### Design Philosophy:
- **Flexibility**: Supports both streaming (trace modes) and random-access (SET) pixel writes
- **Efficiency**: Direct scanline access for normal mode, anti-aliased rendering for sparse mode
- **Extensibility**: Color mode framework allows easy addition of new formats
- **Compatibility**: Designed for P2 microcontroller debug/visualization workflows

### Technical Highlights:
- **PlotPixel**: ~10M pixels/sec (direct memory write)
- **TranslateColor**: Comprehensive color space conversions
- **StepTrace**: 8 scan patterns with wrap/scroll behavior
- **SmoothShape**: Anti-aliased rounded rectangles for sparse mode
- **ScrollBitmap**: Efficient bitmap shifting

### Typical Use Cases:
1. **Image Display**: Show camera, sensor, or processed image data
2. **Waveform Persistence**: Scrolling oscilloscope-style display
3. **Pixel Art**: Magnified retro graphics with sparse mode
4. **False-Color Mapping**: Sensor data with custom color modes
5. **LED Matrix Simulation**: Sparse pixel display with grid

The implementation demonstrates careful attention to both performance (direct scanline access, packed data) and flexibility (19 color modes, 8 trace patterns, runtime configuration). It serves as a robust tool for embedded systems visualization on the Propeller 2 platform.

---

## References

### Source Files:
- **DebugDisplayUnit.pas**: Main implementation (6000+ lines)
- **DebugUnit.pas**: Display management and command routing
- **SerialUnit.pas**: Serial communication and buffering
- **GlobalUnit.pas**: Global types and variables

### Key Algorithms:
- **TranslateColor**: Multi-mode color space conversion
- **StepTrace**: 8 scan patterns with wrap/scroll
- **SmoothShape**: Anti-aliased rounded rectangle rendering
- **ScrollBitmap**: Efficient bitmap shifting

### Related Displays:
- **SPECTRO**: Scrolling waterfall (shares color modes, scaling)
- **PLOT**: Vector graphics (shares sprites, rendering primitives)
- **SCOPE**: Analog waveforms (shares sample buffer structure)
- **TERM**: Text display (no overlap)

---

**End of Document**
