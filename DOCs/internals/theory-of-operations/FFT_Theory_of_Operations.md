# FFT Window - Complete Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Document Version**: 1.1
**Date**: 2026-06-01
**Source Files**: DebugDisplayUnit.pas, DebugUnit.pas, SerialUnit.pas, GlobalUnit.pas
**Author**: Analysis of P2 PNut Debug Display System
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window directive reference; directive coverage re-verified against `DebugDisplayUnit.pas` (v55) on 2026-06-01

---

## Executive Summary

The FFT (Fast Fourier Transform) window in DebugDisplayUnit.pas is a real-time frequency spectrum analyzer that receives time-domain sample data over a serial connection from a Propeller 2 microcontroller and displays the frequency-domain representation. The window supports multiple channels (up to 8), configurable sample sizes, logarithmic/linear scaling, and sophisticated anti-aliased rendering.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Structures](#2-data-structures)
3. [Window Creation and Initialization](#3-window-creation-and-initialization)
4. [Serial Communication and Data Flow](#4-serial-communication-and-data-flow)
5. [FFT_Update Method - Data Ingestion](#5-fft_update-method---data-ingestion)
6. [FFT_Draw Method - Rendering Pipeline](#6-fft_draw-method---rendering-pipeline)
7. [FFT Algorithm Implementation](#7-fft-algorithm-implementation)
8. [Rendering System](#8-rendering-system)
9. [Display Update Messages and Commands](#9-display-update-messages-and-commands)
10. [Performance Characteristics](#10-performance-characteristics)
11. [Key Behaviors and Edge Cases](#11-key-behaviors-and-edge-cases)
12. [Integration Points](#12-integration-points)
13. [Advanced Features](#13-advanced-features)
14. [Limitations and Constraints](#14-limitations-and-constraints)
15. [Comparison to Related Display Types](#15-comparison-to-related-display-types)

---

## 1. Architecture Overview

### 1.1 Display Type Classification
- **Display Type ID**: `dis_fft = 3` (DebugDisplayUnit.pas:25)
- **Display Name**: "FFT" (DebugDisplayUnit.pas:133)
- Part of a family of 9 debug display types (LOGIC, SCOPE, SCOPE_XY, FFT, SPECTRO, PLOT, TERM, BITMAP, MIDI)

### 1.2 Key Constants
```pascal
FFTexpMax       = DataSetsExp = 11           // Maximum FFT exponent
FFTmax          = DataSets = 2048            // Maximum FFT samples (2^11)
fft_default     = 512                        // Default sample size
Channels        = 8                          // Maximum channels
Y_Sets          = 2048                       // Circular buffer capacity
Y_SetSize       = 8                          // Samples per channel set
```

**Location**: DebugDisplayUnit.pas:154-168, 206

---

## 2. Data Structures

### 2.1 FFT-Specific Arrays (DebugDisplayUnit.pas:384-395)
```pascal
FFTexp      : integer                        // Current FFT exponent (2^exp = samples)
FFTmag      : integer                        // Magnitude adjustment (0-11)
FFTfirst    : integer                        // First bin to display
FFTlast     : integer                        // Last bin to display
FFTsin      : array[0..FFTmax-1] of int64    // Pre-computed sine lookup
FFTcos      : array[0..FFTmax-1] of int64    // Pre-computed cosine lookup
FFTwin      : array[0..FFTmax-1] of int64    // Hanning window coefficients
FFTreal     : array[0..FFTmax-1] of int64    // Real component (working)
FFTimag     : array[0..FFTmax-1] of int64    // Imaginary component (working)
FFTsamp     : array[0..FFTmax-1] of integer  // Sample buffer (input)
FFTpower    : array[0..FFTmax div 2-1] of integer  // Output power spectrum
FFTangle    : array[0..FFTmax div 2-1] of integer  // Output phase spectrum
```

**Purpose**:
- `FFTsin/FFTcos`: Pre-computed twiddle factors for FFT butterfly operations
- `FFTwin`: Hanning window coefficients to reduce spectral leakage
- `FFTreal/FFTimag`: Working arrays for complex FFT computation
- `FFTsamp`: Input time-domain samples
- `FFTpower`: Output magnitude spectrum (what gets displayed)
- `FFTangle`: Output phase spectrum (available but not displayed by default)

### 2.2 Sample Buffer (Circular Buffer)
```pascal
Y_SampleBuff: array[0..Y_Sets * Y_SetSize - 1] of integer  // 2048 sets × 8 channels = 16384 samples
SamplePtr   : integer     // Write pointer (0..2047)
SamplePop   : integer     // Number of samples in buffer (0..vSamples)
Y_PtrMask   = Y_Sets - 1  // Wrap mask for circular buffer (0x7FF)
```

**Location**: DebugDisplayUnit.pas:361, 402-403

**Circular Buffer Behavior**:
- Samples stored as interleaved channel sets
- Write pointer wraps using bitwise AND: `(SamplePtr + 1) and Y_PtrMask`
- Read operation extracts last N samples: `((SamplePtr - vSamples + x) and Y_PtrMask)`
- No reallocation needed; continuous streaming supported

### 2.3 Per-Channel Configuration Arrays
```pascal
vLabel[0..7]  : string     // Channel labels (user-defined)
vAuto[0..7]   : boolean    // Auto-ranging enable (not used in FFT)
vHigh[0..7]   : integer    // Maximum value for scaling (default: $7FFFFFFF)
vLow[0..7]    : integer    // Minimum value (unused in FFT)
vMag[0..7]    : integer    // Magnitude multiplier (0-11, right-shift divisor)
vTall[0..7]   : integer    // Vertical display height in pixels
vBase[0..7]   : integer    // Vertical baseline offset in pixels
vGrid[0..7]   : integer    // Grid display flags (bitwise: 1=baseline, 2=top)
vColor[0..7]  : integer    // Channel color (RGB format: $00RRGGBB)
```

**Location**: DebugDisplayUnit.pas:303-311

### 2.4 Receiving Types & Numeric Parity (TS-port Contract)

This subsection captures the exact numeric semantics a TypeScript port must reproduce for
byte-for-byte parity. Every claim is anchored to a `DebugDisplayUnit.pas` line.

**Receiving field types** — every FFT receiving field is a **signed 32-bit `integer`**
(Delphi `integer`, two's-complement, *wraps* on overflow), not an unsigned long:
- `vHigh[0..7]: integer`, `vMag/vTall/vBase/vGrid/vColor: integer` (303–311); `val: integer`
  (358, the global into which `NextNum` deposits every parsed numeric element).
- ⚠️ The per-channel scale maximum `vHigh[]` default and clamp ceiling `$7FFFFFFF` is
  **signed `INT_MAX`** (1610, 1633), *not* unsigned `0x7FFFFFFF`. A port must store and
  compare it as a signed 32-bit value; treating it as an unsigned `0x7FFFFFFF` would diverge
  on any arithmetic that can carry into bit 31.

**Internal widening** — FFT working math is **64-bit**, deliberately widened from the
32-bit receiving fields:
- `FFTsin/cos/win/real/imag: array of int64` (388–392); `PerformFFT` butterfly locals
  `ax,ay,bx,by,rx,ry: int64` (4196).
- `FFT_Draw`'s per-bin accumulator is `v: int64` (1684), and the log-scale step explicitly
  widens with `Int64(v)` / `Int64(vHigh[j])` before the `Log2` (1699). A port must perform
  these in 64-bit (e.g. `BigInt`) — a 32-bit intermediate would overflow on large
  `vHigh`/power values.

**Packing drives unpacking** — the `Pack` fields set by `SetPack` (`vPackCount`,
`vPackShift`, `vPackMask`, `vPackSignx`, 4146–4156) are exactly the inputs `UnPack`
consumes (4166–4171); the configure-time `Pack` declaration is what later governs every
`UnPack` extraction in `FFT_Update`.

**Parity notes (rounding / shift / sign semantics — the headline hazards):**
- **`Trunc` = toward zero.** SAMPLES power-of-2 snap is
  `FFTexp := Trunc(Log2(Within(val, 4, 2048)))` (1576; default-path mirror at 1558).
  This is *truncation toward zero* of the log2 — equivalently `floor(log2(n))` for the
  in-range positive `n`, i.e. the **largest power of 2 ≤ n**, *not* "nearest power of 2".
  A port uses `Math.trunc`/`Math.floor` of `log2`, never `Math.round`.
- **Delphi `Round` is banker's rounding (round-half-to-even).** This is the headline FFT
  parity hazard. It governs:
  - the FFT power scale `FFTpower[i1] := Round(Hypot(rx, ry) / ($800 shl FFTexp shr FFTmag))`
    (4248),
  - the Y-pixel amplitude `Round(v * fScale)` (1701), and
  - the log-scale remap `Round(Log2(Int64(v)+1) / Log2(Int64(vHigh)+1) * vHigh)` (1699).

  A naïve TypeScript `Math.round` rounds halves *up* (toward +∞) and **diverges** from
  Delphi on exact-half cases; a round-half-to-even helper is required.
- **`shr` is a *logical* (unsigned) shift.** In `$800 shl FFTexp shr FFTmag` (4248) the
  right shift is logical. `UnPack` (4169–4170) likewise uses logical `shr vPackShift`, then
  applies **signed** sign-extension (`Result or ($FFFFFFFF xor vPackMask)`) only when the
  sign bit is set and `vPackSignx` is true. `NewPack`'s ALT mode (4158–4163) is a pure
  logical-shift swizzle (`shr`/`shl` masked nibble/bit swaps). A port must use unsigned
  (`>>>`) shifts here, with explicit two's-complement sign-extension where noted.

---

## Directive Reference (v55-verified)

> Line references are to `DebugDisplayUnit.pas` (PNut v55). Matrix authority: §5.4 and §4 of
> [DEBUG-WINDOW-DIRECTIVE-MATRIX.md](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md).

### Configuration directives

Accepted by `FFT_Configure` (lines 1552–1618) — run once at window creation.

| Directive | Parameters / range · default | Notes |
|---|---|---|
| `TITLE 'str'` | string | Window title (`KeyTitle`) |
| `POS left top` | integers | Window screen position (`KeyPos`, 2712–2716). The **2nd arg (`top`) is read only if the 1st (`left`) is present** — `KeyPos` does `if NextNum then Left:=… else Exit` (2714), so a lone `POS` with no operands leaves both unchanged. |
| `SIZE w h` | int **32..2048** · 256, int **32..2048** · 256 | Plot area in pixels (`KeySize`, clamped to `scope_w/hmin..max`) |
| `SAMPLES n {first last}` | n: int **4..2048** (snapped to power-of-2) · 512; first: int **0..n/2−2** · 0; last: int **first+1..n/2−1** · n/2−1 | Sets `vSamples` AND the displayed bin range `FFTfirst`/`FFTlast`. Without `first last`, full spectrum (0 .. n/2−1) is shown. Lines 1573–1582. |
| `RATE n` | int **1..2048** · *effective* `vSamples` | Update every *n* new samples (`KeyValWithin(vRate,1,FFTmax)`, 1583–1584). **Default mechanism**: `vRate` inherits `0` from `SetDefaults` (2902); because the clamp floor is 1, `0` is *unsettable* via the directive, so a literal 0 never reaches `vRate`. The post-loop fixup `if vRate=0 then vRate:=vSamples` (1603) then substitutes the effective default `vSamples`. |
| `DOTSIZE n` | int **0..32** · 0 | Dot radius (0 = none). If both DOTSIZE and LINESIZE are 0 after configure, DOTSIZE is forced to 1 (line 1606). |
| `LINESIZE n` | int **−32..32** · 3 | Line width. **Positive**: connected polyline mode. **Zero**: no lines. **Negative**: vertical filled-bar mode (absolute value = bar width). Lines 1587–1588. |
| `TEXTSIZE n` | int **6..200** · FontSize | Label text size (`KeyTextSize`, line 1589) |
| `COLOR back grid` | named-color or numeric · black, gray | Background then grid color (1591–1593). The **grid color is read only if the back color parses**: `if KeyColor(vBackColor) then KeyColor(vGridColor)` (1591–1593) — a `COLOR` with an unparseable/absent first operand sets neither, and a `COLOR back` with only one operand leaves `vGridColor` at its default. |
| `LOGSCALE` | *(flag)* | Logarithmic amplitude scaling (line 1594) |
| `HIDEXY` | *(flag)* | Suppress on-screen measurement cursor readout (line 1596) |
| `LONGS_1BIT` … `BYTES_4BIT` | *(packed-data declaration)* | Sample packing format (`KeyPack`, lines 1598–1599) |

Default values set at configure time: `vSamples`=512, `FFTexp`=9, `FFTfirst`=0, `FFTlast`=255,
`vDotSize`=0, `vLineSize`=3, `vTextSize`=FontSize.  
Per-channel defaults (all 8 channels): `vMag`=0, `vHigh`=$7FFFFFFF, `vTall`=vHeight, `vBase`=0, `vGrid`=0.

### Display / data directives

Accepted by `FFT_Update` (lines 1620–1679) — run on every subsequent message.

| Directive / element | Parameters | Notes |
|---|---|---|
| **Numeric sample stream** | integers | The primary data stream. Samples are interleaved by channel: Ch0, Ch1, …, Ch(N−1), Ch0, … One FFT drawn per `vRate` complete sample sets after the circular buffer is full (`vSamples` samples). Lines 1657–1678. |
| **Channel-def string** | `'label' {mag {high {tall {base {grid {color}}}}}}` | A string element defines (or redefines) the next channel in order. All parameters are optional and positional: *mag* int **0..11** (right-shift divisor for FFT magnitude, default 0); *high* int **1..$7FFFFFFF** (Y-axis full-scale, default $7FFFFFFF); *tall* int (height in px, default vHeight); *base* int (baseline offset in px, default 0); *grid* int (bitfield: bit 0=baseline line, bit 1=top line, default 0); *color* named-color or $00RRGGBB. Lines 1628–1638. **Beyond 8 channels: the 9th and later channel-def strings overwrite slot 8** — `vIndex` saturates via `if vIndex <> Channels then Inc(vIndex)` (1630), so once `vIndex = Channels(8)` it stops advancing and every subsequent definition lands in `[vIndex-1] = [7]`. |
| `CLEAR` | — | Erase display, reset `SamplePop` and rate counter (lines 1642–1648) |
| `SAVE` | — | Save bitmap to file (`KeySave`, line 1649) |
| `PC_KEY` | — | Poll latched keypress and transmit to P2 (`SendKeyPress`, line 1651) |
| `PC_MOUSE` | — | Poll mouse position/buttons/wheel and transmit to P2 (`SendMousePos`, line 1653) |

### Keyboard & mouse

FFT uses the **shared form-level input model** — identical to all other display windows.

| Mechanism | Lines | Behavior |
|---|---|---|
| `WMGetDlgCode` | 585–589 | Sets `DLGC_WANTTAB` so the window captures Tab keystrokes. |
| `FormMouseMove` | 647–809 | Draws a live measurement cursor overlay showing `x,y` as **pixel offset from plot origin, Y inverted** (`dis_fft` branch at line 668). Suppressed when `HIDEXY` is set (line 737). |
| `FormMouseWheel` | 811–817 | Latches wheel direction into `vMouseWheel` (+1/−1) for 100 ms, then auto-clears. |
| `FormKeyPress` | 825–831 | Latches pressed key byte into `vKeyPress` for 100 ms, then auto-clears. |
| `FormKeyDown` | 833–851 | Maps non-printable keys to control codes: Left=1, Right=2, Up=3, Down=4, Home=5, End=6, Delete=7, Insert=10, PageUp=11, PageDown=12. |

**`PC_KEY` → `SendKeyPress`** (3579–3583): transmits one LONG = `vKeyPress` byte (0 if none), then clears it.

**`PC_MOUSE` → `SendMousePos`** (3537–3577): transmits two LONGs.
- **LONG 1**: `x` = bits 0–12, `y` = bits 13–25, `wheel` = bits 26–27, L/M/R buttons = bits 28/29/30.
  ⚠️ For FFT, `SendMousePos` has **no transform branch** (it only special-cases SPECTRO/PLOT/BITMAP and TERM), so it transmits the **raw client-pixel** `x,y`. The `x = cursor − vMarginLeft`, `y = vMarginTop + vHeight − 1 − mouseY` inversion (line 668–675) is the **on-screen readout** (`FormMouseMove`) only — it is *not* what the P2 receives via `PC_MOUSE`.
  If cursor is outside the client area: LONG 1 = `$03FFFFFF`.
- **LONG 2**: RGB color of the pixel under the cursor (byte-swapped to `$RRGGBB`).
  If outside: LONG 2 = `$FFFFFFFF`.

The 100 ms latch means a key or wheel event not consumed by a `PC_KEY`/`PC_MOUSE` poll within that window is dropped. `HIDEXY` suppresses the on-screen readout only; `PC_MOUSE` reporting to the P2 is unaffected.

---

## 3. Window Creation and Initialization

### 3.1 Creation Flow (DebugDisplayUnit.pas:591-645)

**Step 1: Constructor** (Create method, line 551-576)
- Called by DebugUnit when serial command `DebugDisplayType[0] = 1` is received
- Sets up form properties:
  - `BorderIcons := [biSystemMenu]`
  - `BorderStyle := bsDialog`
  - Font configuration (MS Sans Serif, 11pt)
- Creates timers:
  - `MouseWheelTimer`: For mouse wheel event handling
  - `KeyTimer`: For keyboard event handling
- Registers event handlers:
  - `OnCreate`, `OnMouseMove`, `OnMouseWheel`, `OnKeyPress`, `OnKeyDown`, `OnPaint`, `OnDestroy`

**Step 2: FormCreate Event** (DebugDisplayUnit.pas:591-645)

Execution sequence:
1. **Bitmap Setup** (lines 596-602)
   ```pascal
   Bitmap[0] := TBitmap.Create;
   Bitmap[0].PixelFormat := pf24bit;
   Bitmap[1] := TBitmap.Create;
   Bitmap[1].PixelFormat := pf24bit;
   ```
   - Creates two 24-bit bitmaps for double-buffering
   - Bitmap[0] = rendering target
   - Bitmap[1] = display buffer (reduces flicker)

2. **Cursor Setup** (lines 604-616)
   - Creates custom cursor bitmaps (CursorMask, CursorColor)
   - Pre-sizes to accommodate maximum coordinate text
   - Font: Same as form font (FontName, FontSize)

3. **Desktop Capture Setup** (lines 618-619)
   ```pascal
   DesktopBitmap := TBitmap.Create;
   DesktopDC := GetWindowDC(GetDesktopWindow);
   ```
   - Enables screen capture functionality (for sprite definitions)

4. **Polar Colors Initialization** (line 621)
   ```pascal
   SetPolarColors;
   ```
   - Generates 256-entry color lookup table for polar plots
   - Uses HSV-to-RGB conversion with tuning offset

5. **Display Type Determination** (line 625)
   ```pascal
   DisplayType := P2.DebugDisplayValue[0];
   ```
   - Retrieves display type from parsed serial command
   - For FFT: `DisplayType = 3` (dis_fft)

6. **Window Positioning** (lines 628-629)
   ```pascal
   Left := P2.DebugDisplayLeft;
   Top := P2.DebugDisplayTop;
   ```
   - Positions window at coordinates specified in serial command
   - Allows user control of window placement

7. **Configuration** (lines 631-643)
   ```pascal
   SetDefaults;
   ptr := 2;
   case DisplayType of
     dis_fft: FFT_Configure;
     // ... other display types
   end;
   ```
   - Calls `SetDefaults()` to initialize all variables
   - Sets `ptr := 2` (skips display type and title in parameter array)
   - Calls type-specific configuration routine

8. **Display** (line 644)
   ```pascal
   Show;
   ```
   - Makes window visible

### 3.2 FFT_Configure Method (DebugDisplayUnit.pas:1552-1618)

**Purpose**: Parse serial-transmitted configuration parameters and prepare FFT for operation.

**Default Values Set** (lines 1557-1563):
```pascal
vSamples        = 512           // Default sample count (fft_default)
FFTexp          = 9             // Log2(512)
FFTfirst        = 0             // First display bin (DC component)
FFTlast         = 255           // Last display bin (512/2 - 1, Nyquist)
vDotSize        = 0             // No dots by default
vLineSize       = 3             // 3-pixel lines
vTextSize       = FontSize      // System font size
```

**Parameter Parsing Loop** (lines 1565-1600):
```pascal
while NextKey do
  case val of
    key_title:       KeyTitle;
    key_pos:         KeyPos;
    key_size:        KeySize(vWidth, vHeight, scope_wmin, scope_wmax, scope_hmin, scope_hmax);
    key_samples:     [parse samples, FFTfirst, FFTlast]
    key_rate:        KeyValWithin(vRate, 1, FFTmax);
    key_dotsize:     KeyValWithin(vDotSize, 0, 32);
    key_linesize:    KeyValWithin(vLineSize, -32, 32);
    key_textsize:    KeyTextSize;
    key_color:       if KeyColor(vBackColor) then KeyColor(vGridColor);
    key_logscale:    vLogScale := True;
    key_hidexy:      vHideXY := True;
    key_longs_1bit..key_bytes_4bit: KeyPack;
  end;
```

**Key Parameter: samples** (lines 1573-1582):
```pascal
key_samples:
begin
  if not NextNum then Continue;
  FFTexp := Trunc(Log2(Within(val, 4, FFTmax)));    // Clamp to 4..2048, convert to power-of-2
  vSamples := 1 shl FFTexp;                         // Set actual sample count
  FFTfirst := 0;                                    // Default: full spectrum
  FFTlast := vSamples div 2 - 1;
  // Optional: specify bin range
  if KeyValWithin(FFTfirst, 0, vSamples div 2 - 2) then
    KeyValWithin(FFTlast, FFTfirst + 1, vSamples div 2 - 1);
end;
```

Example: `samples 1024 100 400`
- Sets vSamples = 1024
- Displays bins 100-400 (zoomed frequency view)

**Preparation Phase** (lines 1602-1606):
```pascal
PrepareFFT;                                   // Generate lookup tables
if vRate = 0 then vRate := vSamples;          // Default: update once per buffer fill
vRateCount := vRate - 1;                      // Initialize rate counter
if (vDotSize = 0) and (vLineSize = 0) then vDotSize := 1;  // Ensure visible rendering
```

**Channel Initialization** (lines 1607-1614):
```pascal
for i := 0 to Channels - 1 do
begin
  vMag[i]  := 0;                // No magnitude adjustment
  vHigh[i] := $7FFFFFFF;        // Maximum scale
  vTall[i] := vHeight;          // Full height
  vBase[i] := 0;                // No vertical offset
  vGrid[i] := 0;                // No grid
end;
```

**Window Sizing** (lines 1616-1617):
```pascal
SetTextMetrics;                               // Calculate character metrics
SetSize(ChrWidth, ChrHeight * 2, ChrWidth, ChrWidth);  // Set margins
```

Margins:
- Left: 1 character width
- Top: 2 character heights
- Right: 1 character width
- Bottom: 1 character width

---

## 4. Serial Communication and Data Flow

### 4.1 Serial Reception (SerialUnit.pas)

**Architecture**:
1. **Serial Thread** (TSerialThread.Execute)
   - Runs continuously in background
   - Reads from COM port via Windows API (ReadFile)
   - Stores bytes in `RxBuff[]` circular buffer (16 MB capacity)
   - Head/tail pointers: `RxHead` (write), `RxTail` (read)

2. **Main Thread Processing** (OperateDebug)
   - Called periodically from main event loop
   - Extracts bytes from `RxBuff[]`
   - Calls `ChrIn(byte)` for each character

**Location**: SerialUnit.pas:1-100

### 4.2 Debug Command Parsing (DebugUnit.pas:200-236)

**Command Detection**:
```pascal
if x = $FF then DisplayStrFlag := True;      // Start of DEBUG command
```

**String Accumulation** (lines 202-215):
```pascal
else if DisplayStrFlag then
begin
  if x <> 13 then
  begin
    P2.DebugDisplayStr[DisplayStrLen] := x;   // Accumulate character
    Inc(DisplayStrLen);
  end
  else
  begin
    P2.DebugDisplayStr[DisplayStrLen] := 0;   // Null-terminate
    P2ParseDebugString;                       // Parse into element arrays
    DisplayStrFlag := False;
  end;
end;
```

**P2ParseDebugString** (GlobalUnit.pas):
- Tokenizes command string
- Identifies keywords, numbers, strings
- Stores in parallel arrays:
  - `P2.DebugDisplayType[]` - Element types (ele_key=3, ele_num=4, ele_str=5, ele_end=0)
  - `P2.DebugDisplayValue[]` - Corresponding values

### 4.3 Display Update Trigger (DebugUnit.pas:224-232)

**Update Command** (when `P2.DebugDisplayType[0] = 2`):
```pascal
if P2.DebugDisplayType[0] = 2 then
begin
  for i := 0 to P2.DebugDisplayTargs - 1 do
  begin
    j := P2.DebugDisplayValue[i];                  // Get display index (0..31)
    DisplayForm[j].UpdateDisplay(P2.DebugDisplayTargs);  // Call update method
    if P2.DebugDisplayEna shr j and 1 = 0 then     // Check if closed
      DisplayForm[j].Close;                        // Free display
  end;
end;
```

**Create Command** (when `P2.DebugDisplayType[0] = 1`):
```pascal
if P2.DebugDisplayType[0] = 1 then
begin
  DisplayForm[P2.DebugDisplayNew] := TDebugDisplayForm.Create(Application);
  SetFocus;
end;
```

### 4.4 Element Parsing Helpers (DebugDisplayUnit.pas:4109-4139)

```pascal
function NextKey: boolean;    // Returns true if next element is a keyword
function NextNum: boolean;    // Returns true if next element is a number
function NextStr: boolean;    // Returns true if next element is a string
function NextEnd: boolean;    // Returns true if at end of command (ele_end)

function TDebugDisplayForm.NextElement(Element: integer): boolean;
begin
  if P2.DebugDisplayType[ptr] = Element then
  begin
    val := P2.DebugDisplayValue[ptr];    // Store value in global 'val'
    Inc(ptr);                            // Advance pointer
    Result := True;
  end else Result := False;
end;
```

**Example Element Array**:
```
Command: "FFT `0 samples 1024 clear 100,200,300"

Element Array:
[0] type=ele_dis,   value=2            (update existing)
[1] type=ele_num,   value=0            (display index)
[2] type=ele_key,   value=key_samples
[3] type=ele_num,   value=1024
[4] type=ele_key,   value=key_clear
[5] type=ele_num,   value=100
[6] type=ele_num,   value=200
[7] type=ele_num,   value=300
[8] type=ele_end,   value=0
```

---

## 5. FFT_Update Method - Data Ingestion

### 5.1 Method Signature (DebugDisplayUnit.pas:1620-1679)
```pascal
procedure TDebugDisplayForm.FFT_Update;
var
  i, ch, v: integer;
  samp: array[0..Y_SetSize - 1] of integer;  // Local channel buffer
```

**Purpose**:
- Process incoming samples from serial stream
- Store in circular buffer
- Trigger FFT_Draw when buffer full and rate cycle complete

### 5.2 Update Loop Structure (lines 1626-1678)
```pascal
while not NextEnd do              // Process all elements until ele_end
begin
  if NextStr then                 // String = channel label definition
    [handle channel configuration]
  else if NextKey then            // Keyword = command
    case val of
      key_clear:   [clear display and reset buffers]
      key_save:    [save bitmap to file]
      key_pc_key:  [send keyboard event to P2]
      key_pc_mouse:[send mouse position to P2]
    end
  else while NextNum do           // Numbers = sample data
    [process numeric samples]
end;
```

### 5.3 Channel Configuration (lines 1628-1637)

**Trigger**: String element encountered

**Process**:
```pascal
if NextStr then
begin
  if vIndex <> Channels then Inc(vIndex);     // Advance to next channel
  vLabel[vIndex - 1] := PChar(val);           // Store channel label

  // Optional parameters (order-dependent):
  if not KeyValWithin(vMag[vIndex - 1], 0, 11) then Continue;             // Magnitude shift (0-11)
  if not KeyValWithin(vHigh[vIndex - 1], 1, $7FFFFFFF) then Continue;     // Scale maximum
  if not KeyVal(vTall[vIndex - 1]) then Continue;                         // Display height
  if not KeyVal(vBase[vIndex - 1]) then Continue;                         // Baseline offset
  if not KeyVal(vGrid[vIndex - 1]) then Continue;                         // Grid flags
  KeyColor(vColor[vIndex - 1]);                                           // Channel color
end;
```

**Example**: `"Channel A" 3 1000000 256 0 3 $00FF00`
- Label: "Channel A"
- Magnitude shift: 3 (divide FFT output by 8)
- Scale max: 1000000
- Height: 256 pixels
- Baseline: 0 (bottom)
- Grid: 3 (bitwise: 1=baseline, 2=top, both lines shown)
- Color: Green ($00FF00)

**Channel Order**:
- First string defines channel 0
- Second string defines channel 1
- etc.
- `vIndex` tracks total channel count, **saturating at `Channels` (8)**: the guard
  `if vIndex <> Channels then Inc(vIndex)` (line 1630) stops advancing once 8 channels are
  defined, so a 9th+ channel-def string redefines slot 8 (`[vIndex-1] = [7]`) rather than
  allocating a new channel.

### 5.4 Command Processing (lines 1640-1655)

**key_clear** (lines 1642-1648):
```pascal
key_clear:
begin
  ClearBitmap;                    // Erase display
  BitmapToCanvas(0);              // Update screen
  SamplePop := 0;                 // Reset buffer fill counter
  vRateCount := vRate - 1;        // Reset rate counter
end;
```

**key_save** (line 1650):
```pascal
key_save:
  KeySave;                        // Save bitmap to BMP file
```

**key_pc_key** (line 1652):
```pascal
key_pc_key:
  SendKeyPress;                   // Send vKeyPress to P2
```

**key_pc_mouse** (line 1654):
```pascal
key_pc_mouse:
  SendMousePos;                   // Send mouse coordinates to P2
```

### 5.5 Sample Processing (lines 1657-1678)

**Per-Sample Operations**:
```pascal
while NextNum do                              // For each numeric element
begin
  v := NewPack;                               // Get packed value (if enabled)
  for i := 1 to vPackCount do                 // Unpack all samples (1-32)
  begin
    samp[ch] := UnPack(v);                    // Extract channel sample
    Inc(ch);                                  // Advance channel counter

    if ch = vIndex then                       // Complete sample set?
    begin
      ch := 0;                                // Reset channel counter

      // Store complete sample set in circular buffer
      Move(samp, Y_SampleBuff[SamplePtr * Y_SetSize], Y_SetSize shl 2);

      SamplePtr := (SamplePtr + 1) and Y_PtrMask;     // Advance write pointer (wrap at 2048)

      if SamplePop < vSamples then Inc(SamplePop);    // Track buffer fill (0..vSamples)

      if SamplePop <> vSamples then Continue;         // Buffer not full? Skip FFT

      if RateCycle then FFT_Draw;                     // Rate limit reached? Draw
    end;
  end;
end;
```

**Key Mechanisms**:

1. **Packed Data Support** (optional):
   - `NewPack()`: Returns next numeric value (unpacked) or packed container
   - `UnPack(v)`: Extracts next sample from packed value
   - `vPackCount`: Number of samples per packed value (1-32)
   - Reduces serial bandwidth for low-resolution data

2. **Multi-Channel Accumulation**:
   - Samples arrive in channel order: Ch0, Ch1, Ch2, ..., Ch(N-1), Ch0, Ch1, ...
   - Local `samp[]` buffer accumulates one complete set
   - Only written to `Y_SampleBuff[]` when all channels received

3. **Circular Buffer Management**:
   - `SamplePtr`: Write pointer (0..2047)
   - Wraps using `and Y_PtrMask` (bitwise AND with 0x7FF)
   - No boundary checks needed; automatic wraparound

4. **Buffer Fill Tracking**:
   - `SamplePop`: Counts samples written (0..vSamples)
   - First FFT only executed after `vSamples` samples collected
   - Ensures valid data for entire FFT window

5. **Rate Limiting**:
   - `RateCycle()`: Returns true every `vRate` calls
   - Prevents excessive CPU usage
   - **Default mechanism**: `vRate` starts at 0 (from `SetDefaults`, line 2902); the
     RATE clamp floor is 1, so 0 is unsettable from the directive. The post-configure fixup
     `if vRate=0 then vRate:=vSamples` (line 1603) yields the *effective* default
     `vRate = vSamples` (one FFT per buffer fill)
   - User-configurable: `vRate = 1` (every sample), `vRate = 100` (every 100 samples)

**Data Layout in Y_SampleBuff**:
```
Index:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 ...
Set:    [--- Set 0 ---][--- Set 1 ---][--- Set 2 ---] ...
Chan:   0  1  2  3  4  5  6  7  0  1  2  3  4  5  6  7  ...
```

For 2 channels (vIndex=2):
```
Index:  0  1  2  3  4  5  6  7  8  9  10 11 ...
Set:    [- Set 0 -][- Set 1 -][- Set 2 -] ...
Chan:   0  1  x  x  0  1  x  x  0  1  x  x  ...
```
(x = unused, but allocated)

---

## 6. FFT_Draw Method - Rendering Pipeline

### 6.1 Method Overview (DebugDisplayUnit.pas:1681-1712)
```pascal
procedure TDebugDisplayForm.FFT_Draw;
var
  j, k, x, y, color: integer;
  v: int64;
  fScale: Extended;
```

**Trigger Conditions**:
- `SamplePop = vSamples` (buffer full)
- `RateCycle()` returns true (rate limit reached)

### 6.2 Rendering Flow

**Step 1: Clear Canvas** (line 1687)
```pascal
ClearBitmap;        // DebugDisplayUnit.pas:3227
```

**ClearBitmap Implementation** (lines 3227-3404):
1. Fill background with `vBackColor`
2. Draw frame rectangle (for FFT: lines 3276-3281)
3. Draw grid lines if `vGrid[channel]` is set (lines 3283-3319)
4. Draw log scale markers if `vLogScale = True` (lines 3350-3393)
5. Draw channel labels (lines 3394-3401)
6. Copy Bitmap[0] → Bitmap[1] (line 3403)

**Frame Drawing** (lines 3278-3281):
```pascal
Bitmap[0].Canvas.Brush.Color := WinRGB(vGridColor);
Bitmap[0].Canvas.FrameRect(Rect(vMarginLeft - 1, vMarginTop - 1,
                                 vMarginLeft + vWidth + 1,
                                 vMarginTop + vHeight + 1));
```

**Grid Line Drawing** (lines 3283-3319):
For each channel where `vGrid[i] <> 0`:
```pascal
color := AlphaBlend(vColor[i], vBackColor, $40);   // 25% channel color + 75% background

if (vGrid[i] and 1) <> 0 then                      // Baseline
begin
  y := vMarginTop + vHeight - vBase[i] - 1;
  Bitmap[0].Canvas.MoveTo(vMarginLeft, y);
  Bitmap[0].Canvas.LineTo(vMarginLeft + vWidth, y);
end;

if (vGrid[i] and 2) <> 0 then                      // Top
begin
  y := vMarginTop + vHeight - vBase[i] - vTall[i];
  Bitmap[0].Canvas.MoveTo(vMarginLeft, y);
  Bitmap[0].Canvas.LineTo(vMarginLeft + vWidth, y);
end;
```

**Log Scale Markers** (lines 3350-3393):
```pascal
if (DisplayType = dis_fft) and vLogScale then
begin
  // Draw power-of-2 markers (1, 2, 4, 8, 16, ...)
  for i := 0 to 31 do
  begin
    y := Log2(1 shl i) / Log2(vHigh[0]) * vTall[0];
    // ... draw text and line
  end;
end;
```

**Step 2: Process Each Channel** (lines 1688-1709)

**Channel Loop** (reverse order for proper layering):
```pascal
for j := vIndex - 1 downto 0 do     // Iterate channels in reverse (back to front)
begin
  // Compute vertical scale factor
  fScale := (vTall[j] - 1) / vHigh[j] * $100;     // Scale to fixed-point (×256)
  color := vColor[j];                              // Get channel color

  // Copy samples from circular buffer to FFT input buffer
  for x := 0 to vSamples - 1 do
    FFTsamp[x] := Y_SampleBuff[((SamplePtr - vSamples + x) and Y_PtrMask) * Y_SetSize + j];

  FFTmag := vMag[j];                               // Set magnitude adjustment

  PerformFFT;                                      // Execute FFT algorithm

  // Draw spectrum bins
  for k := FFTfirst to FFTlast do
  begin
    v := FFTpower[k];                              // Get bin power

    // Optional logarithmic amplitude scaling
    if vLogScale then
      v := Round(Log2(Int64(v) + 1) / Log2(Int64(vHigh[j]) + 1) * vHigh[j]);

    // Compute pixel coordinates (fixed-point math, 8.8 format)
    // X-axis: Linear mapping from bin range to display width
    x := vMarginLeft shl 8 +
         Trunc((k - FFTfirst) / (FFTlast - FFTfirst) * (vWidth - 1) * $100);

    // Y-axis: Scale amplitude to display height
    y := (vMarginTop + vHeight - 1 - vBase[j]) shl 8 - Round(v * fScale);

    // Render based on line/dot mode
    if vLineSize >= 0 then
      DrawLineDot(x, y, color, k = FFTfirst)       // Line + dot mode
    else
    begin
      // Filled bar mode (vLineSize negative) — line 1705
      SmoothLine(x, (vMarginTop + vHeight - 1 - vBase[j]) shl 8, x, y, -vLineSize shl 6, color, $FF);
      if vDotSize > 0 then
        SmoothDot(x, y, vDotSize shl 7, color, $FF);
    end
  end;
end;
```

**Sample Extraction** (line 1693):
```pascal
FFTsamp[x] := Y_SampleBuff[((SamplePtr - vSamples + x) and Y_PtrMask) * Y_SetSize + j];
```

Breakdown:
- `SamplePtr`: Current write position (points to next write location)
- `SamplePtr - vSamples`: Start of window (N samples ago)
- `(... + x)`: Advance through window
- `and Y_PtrMask`: Wrap to buffer bounds
- `* Y_SetSize`: Convert set index to element index
- `+ j`: Add channel offset

**Coordinate Scaling**:

X-axis (horizontal, frequency):
```pascal
x := vMarginLeft shl 8 +
     Trunc((k - FFTfirst) / (FFTlast - FFTfirst) * (vWidth - 1) * $100);
```
- `vMarginLeft shl 8`: Left margin in fixed-point (×256)
- `(k - FFTfirst) / (FFTlast - FFTfirst)`: Normalize bin to 0..1
- `* (vWidth - 1)`: Scale to display width (minus 1 for zero-indexing)
- `* $100`: Convert to fixed-point (×256)

Y-axis (vertical, amplitude):
```pascal
y := (vMarginTop + vHeight - 1 - vBase[j]) shl 8 - Round(v * fScale);
```
- `vMarginTop + vHeight - 1 - vBase[j]`: Baseline position (bottom of channel)
- `shl 8`: Convert to fixed-point
- `Round(v * fScale)`: Amplitude scaled to pixels
- Subtraction: Y-axis inverted (0 at top)

**Step 3: Update Display** (line 1711)
```pascal
BitmapToCanvas(0);     // DebugDisplayUnit.pas:3514
```

**BitmapToCanvas Implementation** (lines 3514-3522):
```pascal
procedure TDebugDisplayForm.BitmapToCanvas(Level: integer);
begin
  if Level = 0 then
    Bitmap[1].Canvas.Draw(0, 0, Bitmap[0]);         // Copy to back buffer
  if DisplayType in [dis_spectro, dis_plot, dis_bitmap] then
    Canvas.StretchDraw(Rect(0, 0, vClientWidth, vClientHeight), Bitmap[1])
  else
    Canvas.Draw(0, 0, Bitmap[1]);                   // Blit to screen
end;
```

**Double-Buffering**:
- Bitmap[0]: Rendering target (modified by drawing operations)
- Bitmap[1]: Display buffer (presented to screen)
- Reduces flicker by separating rendering from display

---

## 7. FFT Algorithm Implementation

### 7.1 PrepareFFT - Lookup Table Generation (DebugDisplayUnit.pas:4178-4191)

**Purpose**: Pre-compute sine/cosine/window functions for FFT

**Called**: Once during FFT_Configure (line 1602)

**Implementation**:
```pascal
procedure TDebugDisplayForm.PrepareFFT;
var
  i: integer;
  Tf, Xf, Yf: extended;
begin
  for i := 0 to (1 shl FFTexp) - 1 do             // For each sample index
  begin
    // Twiddle factor angle (bit-reversed index)
    Tf := Rev32(i) / $100000000 * Pi;

    // Generate sine/cosine (scaled by $1000 = 4096 for fixed-point)
    SinCos(Tf, Yf, Xf);
    FFTsin[i] := Round(Yf * $1000);
    FFTcos[i] := Round(Xf * $1000);

    // Hanning window: 1 - cos(2πi/N)
    FFTwin[i] := Round((1 - Cos((i / (1 shl FFTexp)) * Pi * 2)) * $1000);
  end;
end;
```

**Twiddle Factor Calculation**:
- Standard FFT: `W_N^k = e^(-2πik/N) = cos(2πk/N) - i*sin(2πk/N)`
- This implementation: Uses bit-reversed index for decimation-in-time algorithm
- `Tf = π * bitreverse(i) / 2^32`: Normalized to [0, π)

**Hanning Window**:
- Formula: `w[n] = 0.5 * (1 - cos(2πn/N))`
- Implemented as: `1 - cos(2πn/N)` (factor of 2 absorbed elsewhere)
- Purpose: Reduce spectral leakage (smooths discontinuities at window edges)
- Alternative names: von Hann window, raised cosine window

**Fixed-Point Scaling**:
- All values multiplied by $1000 (4096)
- Provides ~12 bits of fractional precision
- Division by $1000 occurs during butterfly operations

**Rev32 Function** (DebugDisplayUnit.pas:4253-4260):
```pascal
function TDebugDisplayForm.Rev32(i: integer): int64;
const
  Rev4: array [0..15] of integer = ($0,$8,$4,$C,$2,$A,$6,$E,$1,$9,$5,$D,$3,$B,$7,$F);
begin
  Result := (Rev4[i shr 0 and $F] shl 28 or
             Rev4[i shr 4 and $F] shl 24 or
             Rev4[i shr 8 and $F] shl 20) and $FFF00000;
end;
```
- Reverses only the **low 12 bits** of `i` into the top 3 nibbles (bits 20–31), masked to `$FFF00000`
- Sufficient for the FFT sizes supported (max FFTexp=11, so max 11-bit index)
- The subsequent `shr (32 - FFTexp)` in PerformFFT brings the reversed bits into position 0..(FFTexp-1)

### 7.2 PerformFFT - Core Algorithm (DebugDisplayUnit.pas:4193-4251)

**Algorithm Type**: Cooley-Tukey Decimation-in-Time (DIT) FFT with in-place computation

**Complexity**: O(N log₂ N)

**Phase 1: Windowing** (lines 4191-4195)
```pascal
for i1 := 0 to (1 shl FFTexp) - 1 do
begin
  FFTreal[i1] := FFTsamp[i1] * FFTwin[i1];     // Apply Hanning window
  FFTimag[i1] := 0;                            // Clear imaginary
end;
```

**Purpose**:
- Multiply each sample by window coefficient
- Reduces spectral leakage caused by finite observation window
- Initializes imaginary components to zero (input is real-valued)

**Phase 2: Decimation-in-Time FFT** (lines 4197-4233)

**Overview**:
- Iterative algorithm (not recursive)
- Processes in log₂(N) stages
- Each stage performs N/2 butterfly operations
- Butterfly: 2-point DFT with twiddle factor multiplication

**Algorithm Structure**:
```pascal
i1 := 1 shl (FFTexp - 1);      // Stage size (starts at N/2)
i2 := 1;                        // Butterfly span (starts at 1)

while i1 <> 0 do                // For each stage
begin
  th := 0;                      // Twiddle factor index
  i3 := 0;                      // Block start
  i4 := i1;                     // Next block start
  c1 := i2;                     // Block count

  while c1 <> 0 do              // For each block in stage
  begin
    ptra := i3;                 // Butterfly pair A index
    ptrb := ptra + i1;          // Butterfly pair B index
    c2 := i4 - i3;              // Elements per block

    while c2 <> 0 do            // For each butterfly in block
    begin
      // Load butterfly inputs
      ax := FFTreal[ptra];  ay := FFTimag[ptra];
      bx := FFTreal[ptrb];  by := FFTimag[ptrb];

      // Twiddle factor multiplication (complex): (bx + i*by) * (cos - i*sin)
      rx := (bx * FFTcos[th] - by * FFTsin[th]) div $1000;
      ry := (bx * FFTsin[th] + by * FFTcos[th]) div $1000;

      // Butterfly computation: [A', B'] = [A + r, A - r]
      FFTreal[ptra] := ax + rx;
      FFTimag[ptra] := ay + ry;
      FFTreal[ptrb] := ax - rx;
      FFTimag[ptrb] := ay - ry;

      ptra := ptra + 1;
      ptrb := ptrb + 1;
      c2 := c2 - 1;
    end;

    th := th + 1;               // Advance twiddle factor
    i3 := i3 + (i1 shl 1);      // Next block
    i4 := i4 + (i1 shl 1);
    c1 := c1 - 1;
  end;

  i1 := i1 shr 1;               // Halve stage size
  i2 := i2 shl 1;               // Double butterfly span
end;
```

**Butterfly Operation**:
```
Input:  A = ax + i*ay, B = bx + i*by
Twiddle: W = cos(θ) - i*sin(θ)
Compute: r = B * W = (bx + i*by) * (cos(θ) - i*sin(θ))
         rx = bx*cos(θ) - by*sin(θ)
         ry = bx*sin(θ) + by*cos(θ)
Output: A' = A + r
        B' = A - r
```

**Stage Progression** (for N=8, FFTexp=3):
```
Stage 1: i1=4, i2=1, blocks=1×1, butterflies=4×4
Stage 2: i1=2, i2=2, blocks=2×2, butterflies=2×2
Stage 3: i1=1, i2=4, blocks=4×4, butterflies=1×1
```

**Phase 3: Magnitude/Phase Extraction** (lines 4235-4242)
```pascal
for i1 := 0 to (1 shl (FFTexp - 1)) - 1 do      // N/2 bins (Nyquist theorem)
begin
  i2 := Rev32(i1) shr (32 - FFTexp);            // Bit-reverse for output order
  rx := FFTreal[i2];
  ry := FFTimag[i2];

  // Power spectrum: |X[k]|² = real² + imag², scaled by FFTmag
  FFTpower[i1] := Round(Hypot(rx, ry) / ($800 shl FFTexp shr FFTmag));

  // Phase spectrum: atan2(real, imag), normalized to 32-bit unsigned
  FFTangle[i1] := Round(ArcTan2(rx, ry) / (Pi * 2) * $100000000) and $FFFFFFFF;
end;
```

**Power Calculation**:
- `Hypot(rx, ry)` = √(rx² + ry²) = magnitude
- Division: Normalization factor
  - `$800` = 2048 (base scale)
  - `shl FFTexp` = multiply by N (FFT gain)
  - `shr FFTmag` = divide by 2^FFTmag (user magnitude adjustment)
- Result: Power in arbitrary units (not dB or absolute scale)

**Phase Calculation**:
- `ArcTan2(rx, ry)` = angle in radians [-π, π]
- Normalized to [0, 1): `/ (Pi * 2)`
- Scaled to 32-bit unsigned: `* $100000000`
- Not displayed in standard FFT window (used by SPECTRO)

**Bit-Reversal**:
- FFT algorithm produces output in bit-reversed order
- Reversed before extraction: `i2 := Rev32(i1) shr (32 - FFTexp)`
- Example (N=8, FFTexp=3):
  - i1=0 (000b) → i2=0 (000b)
  - i1=1 (001b) → i2=4 (100b)
  - i1=2 (010b) → i2=2 (010b)
  - i1=3 (011b) → i2=6 (110b)

**Output**:
- `FFTpower[]`: N/2 bins (0=DC, N/2-1=Nyquist)
- `FFTangle[]`: N/2 phase values (optional use)

### 7.3 Algorithm Characteristics

**Strengths**:
- In-place computation (minimal memory overhead)
- Iterative (no recursion, stack-friendly)
- Fixed-point math (fast integer operations)
- Pre-computed twiddle factors (no runtime transcendental functions)

**Limitations**:
- Restricted to power-of-2 sizes
- Fixed-point precision (~12 bits fractional)
- No zero-padding (spectral resolution = sampling_rate / N)

**Verification**:
- Implements standard Cooley-Tukey DIT algorithm
- Bit-reversal required for input/output ordering
- Hanning window improves spectral clarity

---

## 8. Rendering System

### 8.1 Coordinate System

**Fixed-Point Format**: 8.8 (8 integer bits, 8 fractional bits)
- Range: 0 to 65535 (representing 0.0 to 255.99609375 pixels)
- Conversion: `pixel_value shl 8` (multiply by 256)
- Example:
  - 100 pixels = 25600 (100 shl 8)
  - 100.5 pixels = 25728 (100 shl 8 + 128)
  - 100.75 pixels = 25792 (100 shl 8 + 192)

**Origin**: Top-left corner (0, 0)

**Axes**:
- X-axis: Left to right (standard)
- Y-axis: Top to bottom (inverted from mathematical convention)

**Display Area**:
- `vMarginLeft`, `vMarginTop`: Top-left corner of plot area
- `vWidth`, `vHeight`: Plot area dimensions
- Total form size: `vClientWidth`, `vClientHeight` (includes margins)

### 8.2 DrawLineDot Method (DebugDisplayUnit.pas:3415-3423)

**Purpose**: Draw line segment and/or dot at specified position

**Signature**:
```pascal
procedure TDebugDisplayForm.DrawLineDot(x, y, color: integer; first: boolean);
```

**Parameters**:
- `x, y`: Coordinates in fixed-point (8.8 format)
- `color`: RGB color value ($00RRGGBB)
- `first`: True if first point in series (suppresses line)

**Implementation**:
```pascal
procedure TDebugDisplayForm.DrawLineDot(x, y, color: integer; first: boolean);
begin
  // Draw line from previous point (if not first)
  if (vLineSize > 0) and not first then
    SmoothLine(vPixelX, vPixelY, x, y, vLineSize shl 6, color, $FF);

  // Draw dot at current point
  if (vDotSize > 0) then
    SmoothDot(x, y, vDotSize shl 7, color, $FF);

  // Store for next line segment
  vPixelX := x;
  vPixelY := y;
end;
```

**State Variables**:
- `vPixelX, vPixelY`: Last drawn position (used for line continuity)
- `vLineSize`: Line width (0=no line, 1-32=width in pixels, negative=filled bars)
- `vDotSize`: Dot radius (0=no dot, 1-32=radius in pixels)

**Line Continuity**:
- Each call stores current position
- Next call draws line from stored position to new position
- Creates connected polyline
- `first=True` starts new polyline

**Radius Scaling**:
- Line: `vLineSize shl 6` (multiply by 64)
- Dot: `vDotSize shl 7` (multiply by 128)
- Different scaling factors compensate for rendering algorithm differences

### 8.3 Anti-Aliased Rendering

#### SmoothLine (DebugDisplayUnit.pas:3754-3864)

**Algorithm**: Modified Bresenham's line drawing with sub-pixel positioning

**Features**:
- Handles arbitrary angles (all octants)
- Variable line width (radius parameter)
- Opacity/alpha blending
- Clipping to display bounds
- Gamma-corrected color blending

**Parameters**:
```pascal
procedure SmoothLine(x1, y1, x2, y2, radius, color: integer; opacity: byte);
```
- `x1, y1, x2, y2`: Endpoints in fixed-point
- `radius`: Line width in fixed-point (64× for historical reasons)
- `color`: RGB color
- `opacity`: Alpha value (0=transparent, 255=opaque)

#### SmoothDot (DebugDisplayUnit.pas:3867-3934)

**Algorithm**: Circular brush with anti-aliased edges

**Features**:
- True circular shape (not square)
- Sub-pixel positioning
- Distance-based alpha for smooth edges
- Opacity control

**Parameters**:
```pascal
procedure SmoothDot(x, y, radius, color: integer; opacity: byte);
```
- `x, y`: Center in fixed-point
- `radius`: Dot radius in fixed-point (128× scaling)
- `color`: RGB color
- `opacity`: Alpha value

**Edge Anti-Aliasing**:
```pascal
for dx := -r to r do
  for dy := -r to r do
    d := sqrt(dx² + dy²);                    // Distance from center
    if d <= r then
      alpha := opacity * (1 - (d - floor(d)));  // Fractional distance
      blend_pixel(x+dx, y+dy, color, alpha);
```

#### AlphaBlend (DebugDisplayUnit.pas:3406-3413)

**Purpose**: Gamma-corrected alpha blending

**Implementation**:
```pascal
function TDebugDisplayForm.AlphaBlend(a, b: integer; x: byte): integer;
begin
  Result :=
    // Red channel
    Round(Power((Power(a shr 16 and $FF, 2.0) * x +
                 Power(b shr 16 and $FF, 2.0) * ($FF - x)) / $100, 0.5)) shl 16 or
    // Green channel
    Round(Power((Power(a shr 08 and $FF, 2.0) * x +
                 Power(b shr 08 and $FF, 2.0) * ($FF - x)) / $100, 0.5)) shl 08 or
    // Blue channel
    Round(Power((Power(a shr 00 and $FF, 2.0) * x +
                 Power(b shr 00 and $FF, 2.0) * ($FF - x)) / $100, 0.5)) shl 00;
end;
```

**Gamma Correction**:
- Standard alpha blending: `result = a*x + b*(1-x)` (linear)
- Gamma-corrected: `result = (a²*x + b²*(1-x))^0.5` (perceptually linear)
- Why: Human vision perceives brightness non-linearly
- Effect: More natural blending, especially for dark colors

**Color Space**:
- Input: sRGB (gamma-encoded)
- Blend: Linear RGB (gamma=2.0 approximation)
- Output: sRGB (re-encoded with gamma=0.5)

### 8.4 Rendering Performance

**Optimization Techniques**:
1. **Fixed-Point Math**: Integer operations (faster than floating-point on older CPUs)
2. **Lookup Tables**: Pre-computed sin/cos/window values
3. **Direct Bitmap Access**: Uses `BitmapLine[]` pointers to avoid canvas overhead
4. **Clipping**: Early exit for off-screen pixels
5. **Double-Buffering**: Eliminates flicker without disabling screen updates

**Pixel Access** (DebugDisplayUnit.pas:3425-3436):
```pascal
procedure TDebugDisplayForm.PlotPixel(p: integer);
var
  v: integer;
  line: PByteArray;
begin
  p := TranslateColor(p, vColorMode);    // Convert color format
  line := BitmapLine[vPixelY];           // Get scanline pointer
  v := vPixelX * 3;                      // 3 bytes per pixel (24-bit)
  line[v+0] := p shr 0;                  // Blue
  line[v+1] := p shr 8;                  // Green
  line[v+2] := p shr 16;                 // Red
end;
```

**Bitmap Line Pointers** (Setup in FormCreate):
```pascal
for i := 0 to vBitmapHeight - 1 do
  BitmapLine[i] := Bitmap[0].ScanLine[i];
```
- `ScanLine[]` returns pointer to raw pixel data
- Avoids overhead of canvas pixel access
- Direct memory writes (significant speedup)

---

## 9. Display Update Messages and Commands

### 9.1 Command Structure

**Protocol**:
- Prefix: `0xFF 0x00` (marks DEBUG command)
- Body: ASCII string
- Terminator: `0x0D` (carriage return)

**Parsed Representation**:
```pascal
P2.DebugDisplayType[]   : array of byte       // Element types
P2.DebugDisplayValue[]  : array of integer    // Element values
```

**Element Types**:
```pascal
ele_end = 0    // End of command
ele_dis = 1    // Display operation (create/update)
ele_nam = 2    // Name (unused)
ele_key = 3    // Keyword
ele_num = 4    // Number
ele_str = 5    // String
```

### 9.2 Command Examples

#### Create FFT Window
```
Serial: 0xFF 0x00 "FFT `My Spectrum samples 1024 logscale" 0x0D

Parsed:
[0] type=ele_dis, value=1                (1 = create new)
[1] type=ele_num, value=0                (display type: dis_fft)
[2] type=ele_str, value="My Spectrum"    (title)
[3] type=ele_key, value=key_samples
[4] type=ele_num, value=1024
[5] type=ele_key, value=key_logscale
[6] type=ele_end
```

#### Update with Configuration
```
Serial: 0xFF 0x00 "FFT `0 samples 512 100 200 rate 10 clear" 0x0D

Parsed:
[0] type=ele_dis, value=2                (2 = update existing)
[1] type=ele_num, value=0                (display index)
[2] type=ele_key, value=key_samples
[3] type=ele_num, value=512
[4] type=ele_num, value=100              (FFTfirst)
[5] type=ele_num, value=200              (FFTlast)
[6] type=ele_key, value=key_rate
[7] type=ele_num, value=10
[8] type=ele_key, value=key_clear
[9] type=ele_end
```

#### Update with Samples
```
Serial: 0xFF 0x00 "FFT `0 100,200,300,400,500" 0x0D

Parsed:
[0] type=ele_dis, value=2
[1] type=ele_num, value=0
[2] type=ele_num, value=100              (sample data)
[3] type=ele_num, value=200
[4] type=ele_num, value=300
[5] type=ele_num, value=400
[6] type=ele_num, value=500
[7] type=ele_end
```

#### Update with Channel Definition
```
Serial: 0xFF 0x00 "FFT `0 "Audio Left" 2 5000000 256 0 1 $00FF00 100,200,300" 0x0D

Parsed:
[0] type=ele_dis, value=2
[1] type=ele_num, value=0
[2] type=ele_str, value="Audio Left"     (channel label)
[3] type=ele_num, value=2                (vMag = 2, divide by 4)
[4] type=ele_num, value=5000000          (vHigh = 5000000)
[5] type=ele_num, value=256              (vTall = 256 pixels)
[6] type=ele_num, value=0                (vBase = 0)
[7] type=ele_num, value=1                (vGrid = 1, show baseline)
[8] type=ele_num, value=$00FF00          (vColor = green)
[9] type=ele_num, value=100              (sample data follows)
[10] type=ele_num, value=200
[11] type=ele_num, value=300
[12] type=ele_end
```

### 9.3 Configuration Keywords

#### Window Setup
```pascal
key_title        // Set window title
key_pos          // Set window position (x, y)
key_size         // Set display dimensions (width, height)
key_color        // Set background color, then grid color
key_hidexy       // Hide mouse coordinate display
```

#### FFT Parameters
```pascal
key_samples      // Set sample count (4-2048, power of 2), optional bin range
key_rate         // Set update rate (1-2048, lower = more frequent)
key_logscale     // Enable logarithmic amplitude scaling
```

#### Rendering
```pascal
key_dotsize      // Set dot radius (0-32, 0=none)
key_linesize     // Set line width (-32..32; positive=polyline, 0=none, negative=vertical filled-bar mode)
key_textsize     // Set text size (points)
```

#### Data Format
```pascal
key_longs_1bit   // Pack 32×1-bit values per long
key_longs_2bit   // Pack 16×2-bit values per long
key_longs_4bit   // Pack 8×4-bit values per long
key_longs_8bit   // Pack 4×8-bit values per long
key_longs_16bit  // Pack 2×16-bit values per long
key_words_1bit   // Pack 16×1-bit values per word
key_words_2bit   // Pack 8×2-bit values per word
key_words_4bit   // Pack 4×4-bit values per word
key_words_8bit   // Pack 2×8-bit values per word
key_bytes_1bit   // Pack 8×1-bit values per byte
key_bytes_2bit   // Pack 4×2-bit values per byte
key_bytes_4bit   // Pack 2×4-bit values per byte
```

#### Runtime Commands
```pascal
key_clear        // Clear display and reset buffers
key_save         // Save bitmap to file
key_pc_key       // Send keyboard event to P2
key_pc_mouse     // Send mouse position to P2
```

### 9.4 Message Processing Flow

```
Serial Port
    ↓
SerialThread (background)
    ↓
RxBuff[] (circular buffer, 16 MB)
    ↓
OperateDebug() (main thread)
    ↓
ChrIn() (DebugUnit)
    ↓
0xFF 0x00 detected → DisplayStrFlag := True
    ↓
Accumulate characters until 0x0D
    ↓
P2ParseDebugString (GlobalUnit)
    ↓
Element arrays populated
    ↓
DebugUnit checks DebugDisplayType[0]:
    1 → Create new display
    2 → Update existing display(s)
    ↓
DisplayForm[i].UpdateDisplay(index)
    ↓
FFT_Update (DebugDisplayUnit)
    ↓
Parse keywords/samples
    ↓
Store in circular buffer
    ↓
When buffer full + rate cycle → FFT_Draw
    ↓
Render to screen
```

---

## 10. Performance Characteristics

### 10.1 Computational Complexity

**FFT Algorithm**: O(N log₂ N)

| Sample Size | Operations | Typical Time |
|-------------|------------|--------------|
| 64          | 384        | < 1 ms       |
| 128         | 896        | < 1 ms       |
| 256         | 2048       | ~1 ms        |
| 512         | 4608       | ~2 ms        |
| 1024        | 10240      | ~4 ms        |
| 2048        | 22528      | ~8 ms        |

(Estimates based on typical Pentium-class CPU)

**Operations per Sample**:
- Windowing: 1 multiply
- FFT: log₂(N) butterfly operations = 2 complex multiplies + 2 complex adds
- Magnitude: 1 square root (Hypot)
- Total: ~3×log₂(N) floating-point operations per sample

**Per-Channel Overhead**:
- Each channel requires full FFT execution
- 8 channels @ 512 samples = ~16 ms per frame
- 60 FPS = 16.67 ms budget → Limited to ~1 channel for real-time

### 10.2 Memory Usage

**FFT Working Memory**:
```pascal
FFTsin[2048]     : 16 KB
FFTcos[2048]     : 16 KB
FFTwin[2048]     : 16 KB
FFTreal[2048]    : 16 KB
FFTimag[2048]    : 16 KB
FFTsamp[2048]    : 8 KB
FFTpower[1024]   : 4 KB
FFTangle[1024]   : 4 KB
Total:             96 KB
```

**Sample Buffer**:
```pascal
Y_SampleBuff[2048 × 8]  : 65,536 bytes = 64 KB
```

**Display Bitmaps** (example: 512×512):
```pascal
Bitmap[0] : 512 × 512 × 3 = 786,432 bytes = 768 KB
Bitmap[1] : 512 × 512 × 3 = 786,432 bytes = 768 KB
Total:                                      1536 KB
```

**Form Variables**: ~10 KB (negligible)

**Total Memory**: ~1.7 MB (typical configuration)

### 10.3 Serial Bandwidth

**Sample Rates**:
- Uncompressed: 4 bytes per sample
- Example: 8 channels × 1000 Hz = 8000 samples/sec = 32 KB/sec
- Compressed: 1-16 bits per sample (via packing)
- Example: 8 channels × 1000 Hz × 1 byte = 8 KB/sec

**Serial Port Overhead**:
- Baud rate: 2,000,000 (default, SerialUnit.pas:49)
- Effective throughput: ~200 KB/sec (with overhead)
- Command overhead: ~20 bytes per update message

**Update Rate Control**:
```pascal
vRate parameter:
  vRate = 1       → FFT every sample (high CPU, smooth)
  vRate = 10      → FFT every 10 samples (moderate CPU)
  vRate = vSamples → FFT every buffer fill (low CPU, may lag)
```

**RateCycle Function**:
```pascal
function TDebugDisplayForm.RateCycle: boolean;
begin
  Inc(vRateCount);
  if vRateCount = vRate then
  begin
    vRateCount := 0;
    Result := True;
  end
  else
    Result := False;
end;
```

**Tuning Recommendations**:
- Real-time audio: vRate = vSamples / 4 (25% overlap)
- Data logging: vRate = vSamples (no overlap)
- Smooth animation: vRate = 1 (continuous update, CPU-intensive)

---

## 11. Key Behaviors and Edge Cases

### 11.1 Buffer Management

**Circular Buffer Implementation**:
```pascal
// Write operation
Move(samp, Y_SampleBuff[SamplePtr * Y_SetSize], Y_SetSize shl 2);
SamplePtr := (SamplePtr + 1) and Y_PtrMask;    // Wraps at 2048

// Read operation (extract last N samples)
for x := 0 to vSamples - 1 do
  FFTsamp[x] := Y_SampleBuff[((SamplePtr - vSamples + x) and Y_PtrMask) * Y_SetSize + j];
```

**Wrap-Around Handling**:
- Bitwise AND with mask: `(index) and Y_PtrMask`
- Y_PtrMask = 2047 ($7FF)
- Automatically wraps: 2048 → 0, 2049 → 1, etc.
- No boundary checks needed (fast)

**Buffer Fill Detection**:
```pascal
if SamplePop < vSamples then Inc(SamplePop);
if SamplePop <> vSamples then Continue;         // Exit if not full
```
- First FFT only after vSamples collected
- Prevents invalid data in FFT window
- `SamplePop` never exceeds `vSamples`

**Overflow Protection**:
- Buffer size (2048) > max samples (2048) → No overflow possible
- Circular wrapping handles continuous streaming
- Old data automatically overwritten

### 11.2 Multi-Channel Rendering

**Rendering Order** (lines 1688-1709):
```pascal
for j := vIndex - 1 downto 0 do     // Reverse order (back to front)
```

**Why Reverse**:
- Channel 0 drawn last → Appears on top
- Channel N drawn first → Appears in back
- Mimics "painter's algorithm" for layering

**Independent Scaling**:
- Each channel has own `vHigh[j]`, `vTall[j]`, `vBase[j]`
- Allows different amplitude ranges
- Example:
  - Channel 0: vHigh=1000, vTall=256, vBase=0 (bottom half)
  - Channel 1: vHigh=10000, vTall=256, vBase=256 (top half)
  - Result: Stacked display, different sensitivities

**Color Blending**:
- Overlapping channels blend via alpha
- Grid lines use 25% opacity (AlphaBlend with $40)
- Spectrum lines use 100% opacity

### 11.3 Logarithmic Scaling

**Trigger**: `key_logscale` in configuration

**Amplitude Transformation** (line 1699):
```pascal
if vLogScale then
  v := Round(Log2(Int64(v) + 1) / Log2(Int64(vHigh[j]) + 1) * vHigh[j]);
```

**Mathematical Form**:
```
v_scaled = log₂(v + 1) / log₂(vHigh + 1) × vHigh
```

**Effect**:
- Compresses large values
- Expands small values
- Dynamic range: 0..vHigh → 0..vHigh (scaled)
- Useful for signals with wide dynamic range (e.g., audio)

**Visual Markers** (lines 3350-3393):
Powers of 2 marked on Y-axis:
```pascal
for i := 0 to 31 do
begin
  y := Log2(1 shl i) / Log2(vHigh[0]) * vTall[0];
  // Draw line and label: "1", "2", "4", "8", ...
end;
```

**Why +1 in Formula**:
- Prevents `log₂(0)` = -∞
- Zero maps to zero: `log₂(0+1) = 0`
- Smooth transition near zero

### 11.4 Magnitude Adjustment

**Parameter**: `FFTmag` (0-11), stored per channel in `vMag[j]`

**Application** (line 4240):
```pascal
FFTpower[i1] := Round(Hypot(rx, ry) / ($800 shl FFTexp shr FFTmag));
```

**Effect**:
- `FFTmag = 0`: No adjustment (standard output)
- `FFTmag = 1`: Multiply by 2 (double sensitivity)
- `FFTmag = 11`: Multiply by 2048 (maximum sensitivity)

**Use Cases**:
- Low-amplitude signals: Increase FFTmag
- Saturated signals: Decrease FFTmag (set to 0)
- Per-channel gain control

**Relation to Scaling**:
- `FFTmag` adjusts FFT output magnitude
- `vHigh[j]` sets Y-axis scale
- Both affect final display amplitude

### 11.5 Bin Windowing

**Parameters**: `FFTfirst`, `FFTlast`

**Default**: 0 to (vSamples div 2 - 1) — Full spectrum

**Configuration**:
```
samples 1024 100 400
```
- vSamples = 1024
- FFTfirst = 100
- FFTlast = 400
- Displays bins 100-400 only (zoomed view)

**X-Axis Scaling** (line 1700):
```pascal
x := vMarginLeft shl 8 +
     Trunc((k - FFTfirst) / (FFTlast - FFTfirst) * (vWidth - 1) * $100);
```
- Normalizes bin range to display width
- Linear mapping: bin FFTfirst → left edge, bin FFTlast → right edge

**Frequency Calculation**:
```
Bin k corresponds to frequency:
f_k = k × (sampling_rate / vSamples)

Example:
  sampling_rate = 10000 Hz
  vSamples = 1024
  k = 100
  f_k = 100 × (10000 / 1024) = 976.56 Hz
```

**Nyquist Limit**:
- Maximum displayable bin: vSamples / 2 - 1
- Corresponds to f_nyquist = sampling_rate / 2
- Higher frequencies alias (folded back)

### 11.6 Sample Packing

**Purpose**: Reduce serial bandwidth for low-resolution data

**Example**: 1-bit logic analyzer
```
Unpacked: 32 samples = 32 × 4 bytes = 128 bytes
Packed:   32 samples = 1 × 4 bytes = 4 bytes (32× reduction)
```

**Configuration**:
```pascal
key_longs_1bit    // 32 samples per long (1 bit each)
```

**Processing** (lines 1660-1666):
```pascal
v := NewPack;                               // Get packed value
for i := 1 to vPackCount do                 // vPackCount = 32
begin
  samp[ch] := UnPack(v);                    // Extract 1 bit
  Inc(ch);
  // ... store when complete set
end;
```

**NewPack/UnPack Functions**:
- `NewPack()`: Returns next numeric value from serial stream
- `UnPack(v)`: Extracts next sample from packed value using mask/shift
- `vPackCount`: Samples per packed value (1-32)
- `vPackMask`: Bit mask for extraction
- `vPackShift`: Right shift for next sample

**Supported Formats**:
```pascal
key_longs_1bit   : 32 samples × 1 bit = 32 bits
key_longs_2bit   : 16 samples × 2 bits = 32 bits
key_longs_4bit   : 8 samples × 4 bits = 32 bits
key_longs_8bit   : 4 samples × 8 bits = 32 bits
key_longs_16bit  : 2 samples × 16 bits = 32 bits
key_words_1bit   : 16 samples × 1 bit = 16 bits
key_words_2bit   : 8 samples × 2 bits = 16 bits
key_words_4bit   : 4 samples × 4 bits = 16 bits
key_words_8bit   : 2 samples × 8 bits = 16 bits
key_bytes_1bit   : 8 samples × 1 bit = 8 bits
key_bytes_2bit   : 4 samples × 2 bits = 8 bits
key_bytes_4bit   : 2 samples × 4 bits = 8 bits
```

---

## 12. Integration Points

### 12.1 Serial Protocol

**Command Structure**:
- Prefix: `0xFF 0x00` (2 bytes)
- Body: ASCII string (variable length)
- Terminator: `0x0D` (carriage return)

**Example**:
```
Hex:  FF 00 46 46 54 20 60 30 20 31 30 30 2C 32 30 30 0D
ASCII:      F  F  T     `  0     1  0  0  ,  2  0  0  CR
```

**Detection** (DebugUnit.pas:200):
```pascal
if x = $FF then DisplayStrFlag := True;
```

**Parsing** (GlobalUnit.pas):
- Tokenizes string into keywords, numbers, strings
- Stores in `P2.DebugDisplayType[]` and `P2.DebugDisplayValue[]`
- Element types: ele_end=0, ele_dis=1, ele_key=3, ele_num=4, ele_str=5

### 12.2 P2 Global Variables

**Display Type/Value Arrays**:
```pascal
P2.DebugDisplayType[]   : array[0..DebugDisplayLimit-1] of byte
P2.DebugDisplayValue[]  : array[0..DebugDisplayLimit-1] of integer
```
- Location: GlobalUnit.pas:126-127
- Size: DebugDisplayLimit (typically 256)

**Display Enable Flags**:
```pascal
P2.DebugDisplayEna      : integer    // 32 bitwise enables (0-31)
```
- Location: GlobalUnit.pas:123
- Bit n = 1: Display n is open
- Bit n = 0: Display n is closed

**Display Positioning**:
```pascal
P2.DebugDisplayLeft     : integer    // Window X position
P2.DebugDisplayTop      : integer    // Window Y position
```

**Display Creation**:
```pascal
P2.DebugDisplayNew      : integer    // Index for new display (0-31)
P2.DebugDisplayTargs    : integer    // Number of target displays
```

### 12.3 Form Lifecycle

**1. Creation** (User sends command):
```
Serial: "FFT `My FFT samples 1024"
```
→ DebugUnit.pas:217-221:
```pascal
if P2.DebugDisplayType[0] = 1 then
begin
  DisplayForm[P2.DebugDisplayNew] := TDebugDisplayForm.Create(Application);
  SetFocus;
end;
```

**2. Configuration**:
- Constructor runs (Create)
- FormCreate event fires
- FFT_Configure called
- Window shown

**3. Operation** (continuous loop):
```
Serial samples arrive
    ↓
DebugUnit.ChrIn processes bytes
    ↓
Debug command detected
    ↓
P2ParseDebugString
    ↓
UpdateDisplay called
    ↓
FFT_Update processes command
    ↓
Samples stored in buffer
    ↓
When full + rate cycle → FFT_Draw
    ↓
Screen updated
```

**4. Destruction**:
- User closes window → FormDestroy
- Or: P2 sends close command → `P2.DebugDisplayEna` bit cleared
- DebugUnit checks: `if P2.DebugDisplayEna shr j and 1 = 0 then DisplayForm[j].Close;`

### 12.4 Related Units

**SerialUnit.pas**:
- Serial port communication
- Background thread for receive
- Transmit/receive buffers

**DebugUnit.pas**:
- Manages all debug displays (0-31)
- Parses serial commands
- Routes updates to appropriate display

**GlobalUnit.pas**:
- Global variables and types
- P2 compiler/interpreter state
- Configuration settings

**DebuggerUnit.pas**:
- COG debugger (separate from display system)
- Breakpoints, single-step, register inspection

---

## 13. Advanced Features

### 13.1 Packed Data Support

**Purpose**: Reduce serial bandwidth for low-resolution data

**Trigger**: Configuration keyword (e.g., `key_longs_8bit`)

**KeyPack Method** (called during FFT_Configure):
```pascal
key_longs_1bit..key_bytes_4bit:
  KeyPack;
```

**PackDef Array** (DebugDisplayUnit.pas:140-152):
```pascal
PackDef[key_longs_1bit]  = 0 shl 16 +  1 shl 8 + 32    // sign=0, shift=1, count=32
PackDef[key_longs_2bit]  = 0 shl 16 +  2 shl 8 + 16    // sign=0, shift=2, count=16
// ... etc
```

**Encoding** (decoded by `SetPack`, lines 4146–4156):
- Bits 0-7: `vPackCount` — sample count per packed value
- Bits 8-15: `vPackShift` — bits per sample (right-shift amount)
- Bit 16: unused placeholder, hard-coded `0` for every `PackDef` entry (lines 140–152) and never read for sign. Sign-extension is conveyed instead via the `signx` boolean parameter to `SetPack` (lines 4146–4156), which `KeyPack` (lines 2825–2831) sets from the `SIGNED` keyword. See §19.1.

**NewPack Function**:
```pascal
function TDebugDisplayForm.NewPack: integer;
begin
  Result := val;
  // ALT mode: reverse nibble/byte/word ordering
  if vPackAlt and (vPackShift <= 1) then Result := Result shr 1 and $55555555 or Result shl 1 and $AAAAAAAA;
  if vPackAlt and (vPackShift <= 2) then Result := Result shr 2 and $33333333 or Result shl 2 and $CCCCCCCC;
  if vPackAlt and (vPackShift <= 4) then Result := Result shr 4 and $0F0F0F0F or Result shl 4 and $F0F0F0F0;
end;
```

**UnPack Function**:
```pascal
function TDebugDisplayForm.UnPack(var v: integer): integer;
begin
  Result := v and vPackMask;                                        // Extract low bits
  v := v shr vPackShift;                                            // Shift for next sample
  if vPackSignx and (Result shr (vPackShift - 1) and 1 = 1) then
    Result := Result or ($FFFFFFFF xor vPackMask);                  // Sign-extend
end;
```

**Example** (8-bit packed in longs):
```
Input: 0x04030201 (one long)
vPackCount = 4
vPackMask = 0xFF
vPackShift = 8

UnPack calls:
  1: Result = 0x01, v = 0x00040302
  2: Result = 0x02, v = 0x00000403
  3: Result = 0x03, v = 0x00000004
  4: Result = 0x04, v = 0x00000000
```

### 13.2 Mouse Feedback

**Coordinate Display** (FormMouseMove, lines 668-674):
```pascal
dis_fft, dis_scope:
begin
  if (X >= vMarginLeft) and (X < vMarginLeft + vWidth)
  and (Y >= vMarginTop) and (Y < vMarginTop + vHeight) then
    Str := IntToStr(X - vMarginLeft) + ',' + IntToStr(vMarginTop + vHeight - 1 - Y)
  else
    Str := '';
end;
```
- Displays pixel coordinates when hovering over plot area
- Format: "X,Y" (origin at bottom-left of plot)
- Rendered as custom cursor bitmap

**Custom Cursor** (FormMouseMove, lines 737-775):
```pascal
CursorMask.Canvas.FillRect(Rect(0, 0, W, H));           // Black background
CursorColor.Canvas.FillRect(Rect(0, 0, W, H));          // Transparent
CursorColor.Canvas.TextOut(8, 8, Str);                   // Draw text
// ... create cursor from bitmaps
```

**Send to P2** (key_pc_mouse command, lines 3537–3577):
Transmits two LONGs. If the cursor is outside the client area, LONG 1 = `$03FFFFFF` and LONG 2 = `$FFFFFFFF`. Otherwise:
- LONG 1: `x` = bits 0–12, `y` = bits 13–25, `vMouseWheel` = bits 26–27, L/M/R buttons = bits 28/29/30 (via `GetAsyncKeyState`). Then clears `vMouseWheel`.
- LONG 2: pixel color under cursor (byte-swapped to `$RRGGBB`).
For FFT (same case as SCOPE): coordinates are raw client-area pixel x,y — **no** margin subtraction or Y-inversion is applied inside `SendMousePos`; the coordinate mapping described in §4.4 applies only to the on-screen measurement-cursor overlay in `FormMouseMove`.

### 13.3 Keyboard Feedback

**Key Capture** (FormKeyPress):
```pascal
procedure TDebugDisplayForm.FormKeyPress(Sender: TObject; var Key: Char);
begin
  vKeyPress := Ord(Key);
end;
```

**Key Timer** (FormKeyTimerTick):
```pascal
procedure TDebugDisplayForm.FormKeyTimerTick(Sender: TObject);
begin
  vKeyPress := 0;                              // Clear after timeout
  KeyTimer.Enabled := False;
end;
```

**Send to P2** (key_pc_key command, lines 3579–3583):
```pascal
procedure TDebugDisplayForm.SendKeyPress;
begin
  TLong(integer(vKeyPress));   // Transmit one LONG = vKeyPress (0 if none)
  vKeyPress := 0;              // Clear after transmit
end;
```
Note: transmits a **LONG** (4 bytes), not a byte.

**Use Cases**:
- Interactive control of P2 program
- User input for embedded GUI
- Keyboard-based navigation

### 13.4 Bitmap Save

**Trigger**: `key_save` command

**KeySave Method** (lines 2839–2866):
```pascal
procedure TDebugDisplayForm.KeySave;
begin
  if NextStr then Bitmap[1].SaveToFile(PChar(val) + '.bmp')
  else
  begin
    // WINDOW or l/t/w/h variant: capture desktop region to DesktopBitmap
    if NextKey then
    begin
      if val <> key_window then Exit;
      // uses window Left/Top/Width/Height
    end else
    begin
      // reads l, t, w, h parameters
    end;
    if NextStr then DesktopBitmap.SaveToFile(PChar(val) + '.bmp');
  end;
end;
```

**Format**: Windows BMP (24-bit)

**Content**: `Bitmap[1]` (the display/front buffer) for the simple `SAVE 'name'` form. For the `SAVE WINDOW 'name'` or `SAVE l t w h 'name'` forms, saves a captured desktop region via `DesktopBitmap` (BitBlt from `DesktopDC`).

**Example**:
```
Command: "FFT `0 save "spectrum_capture""
Result:  spectrum_capture.bmp created in current directory
```

### 13.5 Window Position Feedback

**Mouse Move** (FormMove):
```pascal
procedure TDebugDisplayForm.FormMove(var Msg: TWMMove);
begin
  if CaptionPos then Exit;
  Caption := IntToStr(Left) + ',' + IntToStr(Top);    // Show position
  CaptionPos := True;
end;
```

**Restoration** (UpdateDisplay, lines 914-918):
```pascal
if CaptionPos then
begin
  Caption := CaptionStr;                       // Restore original title
  CaptionPos := False;
end;
```

**Purpose**: User can see coordinates while dragging window, for scripting window layout

---

## 14. Limitations and Constraints

### 14.1 Sample Size

**Requirement**: Must be power of 2

**Enforcement** (line 1576):
```pascal
FFTexp := Trunc(Log2(Within(val, 4, FFTmax)));
vSamples := 1 shl FFTexp;
```
- User input snapped to the **largest power of 2 ≤ n** via `Trunc(Log2(...))` (truncation
  toward zero / floor of log2 — *not* "nearest"; see §2.4 parity notes)
- Minimum: 4 (2²)
- Maximum: 2048 (2¹¹)

**Why**:
- Cooley-Tukey FFT algorithm requirement
- Simplifies bit-reversal
- Efficient computation (all divisions by 2)

**Workaround**: None (algorithm limitation)

### 14.2 Display Resolution

**Default window size**: `vWidth × vHeight = 256 × 256` (from global `SetDefaults`,
2880–2884 — `FFT_Configure` does not override them). Overridable by `SIZE w h`. The
plot bitmap is `256 × 256`; the client window adds margins (`ChrWidth` left/right/bottom,
`ChrHeight × 2` top — `SetSize` at 1617).

**Window Size Constraints** (`SIZE` directive, `KeySize`):
```pascal
scope_wmin = 32     // FFT reuses the SCOPE size limits
scope_wmax = 2048
scope_hmin = 32
scope_hmax = 2048
```

**Bitmap Line Pointers**:
```pascal
BitmapLine: array[0..SmoothFillMax - 1] of Pointer
SmoothFillMax = 2048
```

**Maximum Display**: 2048×2048 pixels

**Why**:
- Array size limitations
- Memory constraints (2048×2048×3 = 12 MB per bitmap)
- Performance (larger bitmaps slow rendering)

**Workaround**: None (hard-coded limit)

### 14.3 Channel Count

**Maximum Channels**: 8

**Defined**:
```pascal
Channels = 8
Y_SetSize = Channels
```

**Arrays**:
```pascal
vLabel[0..7], vColor[0..7], vMag[0..7], etc.
```

**Why**:
- Fixed array sizes
- Reasonable limit for visual clarity
- Buffer size (2048 sets × 8 channels = 64 KB)

**Workaround**: None (requires code modification)

### 14.4 Fixed-Point Precision

**Sin/Cos Lookup**: 12-bit fractional (×4096)
```pascal
FFTsin[i] := Round(Yf * $1000);
```

**Coordinates**: 8-bit fractional (×256)
```pascal
x := vMarginLeft shl 8;
```

**Limitations**:
- Sin/cos accuracy: ±0.00024 (1/4096)
- Position accuracy: ±0.0039 pixels (1/256)
- Accumulated error in long FFT chains: negligible for N≤2048

**Precision Loss Scenarios**:
- Very large input values (>2³¹) may overflow
- Very small FFT magnitudes may round to zero

**Workaround**: Use appropriate `FFTmag` and `vHigh` scaling

### 14.5 Real-Time Performance

**CPU Usage** (estimates):
```
1024-point FFT: ~4 ms (single channel)
8 channels: ~32 ms
60 FPS budget: 16.67 ms
Result: Cannot maintain 60 FPS with 8 channels
```

**Serial Bandwidth** (2 Mbaud):
```
Effective: ~200 KB/sec
Uncompressed (8ch × 1kHz × 4B): 32 KB/sec (OK)
Uncompressed (8ch × 10kHz × 4B): 320 KB/sec (OVERFLOW)
```

**Recommendations**:
- Use rate limiting (`vRate` parameter)
- Enable packing for high sample rates
- Reduce channel count for high update rates

### 14.6 No Frequency Axis Labels

**Current Behavior**: X-axis shows only pixel coordinates, not frequency

**User Calculation Required**:
```
Frequency of bin k = k × (sampling_rate / vSamples)
```

**Why**:
- Sampling rate not communicated to display
- Application-specific (varies by use case)
- User responsible for labeling

**Workaround**: External documentation or overlay

### 14.7 Phase Spectrum Not Displayed

**Computed**: `FFTangle[]` contains phase for each bin

**Not Used**: Standard FFT display shows only magnitude (`FFTpower[]`)

**Available in**: SPECTRO display (optional HSV color mode uses phase for hue)

**Workaround**: Modify FFT_Draw to use `FFTangle[]` for color coding

---

## 15. Comparison to Related Display Types

### 15.1 vs. SCOPE (dis_scope = 1)

**SCOPE**:
- Time-domain waveform
- Raw samples plotted as Y vs. time
- Trigger support (rising/falling edge)
- Holdoff timing

**FFT**:
- Frequency-domain spectrum
- FFT-processed samples as magnitude vs. frequency
- No trigger (continuous display)
- Update rate control (not holdoff)

**Shared**:
- Multi-channel support (up to 8)
- Same buffer structure (`Y_SampleBuff[]`)
- Similar rendering (DrawLineDot, SmoothLine)
- Same configuration keywords (size, color, etc.)

**Code Reuse**:
- SCOPE_Configure (lines 1161-1213) similar to FFT_Configure
- SCOPE_Update (lines 1215-1269) similar to FFT_Update
- SCOPE_Draw (lines 1271-1363) different algorithm (no FFT)

### 15.2 vs. SPECTRO (dis_spectro = 4)

**SPECTRO**:
- Waterfall display (time on Y-axis, frequency on X-axis)
- Continuous scrolling (shows FFT history)
- Color-coded magnitude (luma or HSV)
- Optional phase display (HSV hue = phase)

**FFT**:
- Static snapshot (current spectrum only)
- Line/bar graph rendering
- No history tracking

**Shared**:
- Both use `PerformFFT()` and `FFTpower[]`
- Same FFT configuration (samples, mag, range)
- Pre-computed lookup tables

**SPECTRO Implementation** (lines 1719-1857):
```pascal
procedure TDebugDisplayForm.SPECTRO_Update;
// ... similar to FFT_Update

procedure TDebugDisplayForm.SPECTRO_Draw;
for x := 0 to vSamples - 1 do
  FFTsamp[x] := SPECTRO_SampleBuff[...];       // Different buffer
PerformFFT;                                     // Same FFT
for x := FFTfirst to FFTlast do
begin
  v := FFTpower[x];                             // Use magnitude
  p := Round(v * fScale);                       // Convert to color
  if vColorMode in [key_hsv16..key_hsv16x] then
    p := p or FFTangle[x] shr 16 and $FF00;    // Add phase (optional)
  PlotPixel(p);                                 // Write to bitmap
  StepTrace;                                    // Scroll display
end;
```

**Key Difference**: SPECTRO displays one column per FFT, FFT displays full spectrum

### 15.3 vs. LOGIC (dis_logic = 0)

**LOGIC**:
- Logic analyzer (up to 32 digital channels)
- Binary waveforms (0/1 levels)
- Trigger on bit patterns
- Time-domain only

**FFT**:
- Analog spectrum analyzer (up to 8 channels)
- Continuous amplitude
- Frequency-domain

**No Code Overlap**: Completely different algorithms and data structures

### 15.4 vs. SCOPE_XY (dis_scope_xy = 2)

**SCOPE_XY**:
- X-Y plot (2 channels as X/Y coordinates)
- Scatter plot or Lissajous curve
- Cartesian or polar coordinates
- Time-implicit (path traced by samples)

**FFT**:
- Single-axis plot (frequency on X, magnitude on Y)
- Multi-channel overlay
- Time-to-frequency transform

**Shared**:
- SmoothDot rendering (SCOPE_XY uses opacity blending)
- Fixed-point coordinates

**Different**:
- SCOPE_XY: 2D path plotting
- FFT: 1D function plotting

---

## 16. Element Array Protocol Specification

### 16.1 Protocol Overview

The FFT display (and all debug displays) receives commands and data through an **element array protocol**. This protocol uses ASCII-encoded messages with a simple type-value pair structure.

**Core Concept**: Messages are sequences of **(type, value)** pairs stored in parallel arrays:
- `DebugDisplayType[i]`: Element type (byte)
- `DebugDisplayValue[i]`: Element value (integer or pointer to string)

**GlobalUnit.pas:126-127**:
```pascal
DebugDisplayType:   array[0..DebugDisplayLimit-1] of byte;      // Element types
DebugDisplayValue:  array[0..DebugDisplayLimit-1] of integer;   // Element values
DebugDisplayLimit = 1100;  // Allows 1k data elements + commands
```

### 16.2 Element Type Constants

**DebugDisplayUnit.pas:15-20**:
```pascal
const
  ele_end   = 0;    // End of message marker
  ele_key   = 3;    // Keyword/command
  ele_num   = 4;    // Numeric value
  ele_str   = 5;    // String value (pointer to PChar)
```

**Element Meanings**:
- **ele_key**: Command or keyword (window configuration, control commands)
- **ele_num**: Numeric data (samples, parameters, integers)
- **ele_str**: String data (window title, labels)
- **ele_end**: Message terminator (marks end of current message)

### 16.3 Protocol Parser Functions

**DebugDisplayUnit.pas:4109-4139**:
```pascal
function TDebugDisplayForm.NextKey: boolean;
begin
  Result := NextElement(ele_key);
end;

function TDebugDisplayForm.NextNum: boolean;
begin
  Result := NextElement(ele_num);
end;

function TDebugDisplayForm.NextStr: boolean;
begin
  Result := NextElement(ele_str);
end;

function TDebugDisplayForm.NextEnd: boolean;
begin
  Result := P2.DebugDisplayType[ptr] = ele_end;
end;

function TDebugDisplayForm.NextElement(Element: integer): boolean;
begin
  if P2.DebugDisplayType[ptr] = Element then
  begin
    val := P2.DebugDisplayValue[ptr];   // Extract value into global 'val'
    Inc(ptr);                            // Advance pointer
    Result := True;
  end
  else
    Result := False;
end;
```

**Parsing Pattern**:
```pascal
while not NextEnd do              // Loop until ele_end
begin
  if NextKey then                 // Check for keyword
    case val of
      key_samples: ...;
      key_rate: ...;
    end
  else if NextNum then            // Check for number
    ProcessSample(val);
  else if NextStr then            // Check for string
    ProcessString(PChar(val));
end;
```

### 16.4 Complete Configuration Example

**ASCII Debug Command** (from Propeller 2):
```spin2
debug(`FFT SIZE 256 128 RATE 128 DOTSIZE 2 LOGSCALE TITLE "Audio Spectrum")
```
Note: `LUMA8X` is **not** a valid FFT directive — it belongs to SPECTRO only. FFT does not accept color-mode keywords.

**Resulting Element Array** (conceptual representation):
```
Type:  [ele_key]  [ele_num] [ele_num] [ele_key]  [ele_num] [ele_key]    [ele_num] [ele_key]    [ele_key]   [ele_str]        [ele_end]
Value: [key_size] [256]     [128]     [key_rate]  [128]    [key_dotsize] [2]      [key_logscale] [key_title] ["Audio Spectrum"] [0]
Index: [0]        [1]       [2]       [3]         [4]      [5]           [6]      [7]            [8]         [9]               [10]
```

**Parsing Sequence**:
```pascal
// ptr=0: FFT_Configure starts
while NextKey do                    // ptr=0: ele_key → val=key_size, ptr→1
  case val of
    key_size:
      KeySize(vWidth, vHeight, ...); // consumes two ele_num values (256, 128)
    key_rate:                        // ptr=3: ele_key → val=key_rate, ptr→4
      KeyValWithin(vRate, 1, FFTmax); // ptr=4: ele_num → val=128, ptr→5
    key_dotsize:                     // ptr=5: ele_key → val=key_dotsize, ptr→6
      KeyValWithin(vDotSize, 0, 32); // ptr=6: ele_num → val=2, ptr→7
    key_logscale:                    // ptr=7: ele_key, ptr→8
      vLogScale := True;
    key_title:                       // ptr=8: ele_key, ptr→9
      KeyTitle;                      // ptr=9: ele_str consumed, ptr→10
  end;
// ptr=10: NextKey returns False (ele_end found)
```

### 16.5 Data Update Example

**Propeller 2 Code** (sending 4 samples):
```spin2
' Pack 4 samples using LONGS_8BIT mode
packed := sample1 | (sample2 << 8) | (sample3 << 16) | (sample4 << 24)
debug(`FFT `UDEC_(packed))
```

**Element Array**:
```
Type:  [ele_num] [ele_end]
Value: [packed_samples] [0]
Index: [0]       [1]
```

**Parsing in FFT_Update** (simplified; see §5.5 and §17.2 for the full loop):
```pascal
while not NextEnd do
begin
  while NextNum do                  // ptr=0: ele_num → val=packed_samples
  begin
    v := NewPack;                   // Apply ALT bit-reversal if set; return val
    for i := 1 to vPackCount do     // Loop 4 times (LONGS_8BIT)
    begin
      samp[ch] := UnPack(v);        // Extract one channel sample
      Inc(ch);
      if ch = vIndex then           // Complete set received?
      begin
        ch := 0;
        Move(samp, Y_SampleBuff[SamplePtr * Y_SetSize], Y_SetSize shl 2);
        SamplePtr := (SamplePtr + 1) and Y_PtrMask;
        if SamplePop < vSamples then Inc(SamplePop);
        if SamplePop = vSamples then if RateCycle then FFT_Draw;
      end;
    end;
  end;
end;
```

### 16.6 String Encoding

**String Storage**: Strings stored as null-terminated C-style strings (PChar).

**Element Value**: Contains pointer (integer) to string memory.

**Example**:
```pascal
if NextStr then
  Caption := PChar(val);   // val is pointer, cast to PChar for access
```

---

## 17. Buffer Management and Timing

### 17.1 Circular Buffer Architecture

**Y_SampleBuff Structure**:
```
Capacity: 2048 sets × 8 channels = 16,384 samples total
Organization: Interleaved by channel set
Memory: 16,384 × 4 bytes = 64 KB

[Set 0: Ch0 Ch1 Ch2 Ch3 Ch4 Ch5 Ch6 Ch7] [Set 1: Ch0 Ch1 ...] ... [Set 2047: ...]
 └─────────── Y_SetSize = 8 ────────────┘
```

**Indexing Formula**:
```pascal
index = (set_number and Y_PtrMask) * Y_SetSize + channel_number
      = (set_number and 2047) * 8 + channel
```

### 17.2 Write Operation Timing

**When Samples Are Written** (FFT_Update, DebugDisplayUnit.pas:1657-1678):

```pascal
while NextNum do                    // For each numeric value in message
begin
  v := NewPack;                     // Get packed value (with optional ALT)
  for i := 1 to vPackCount do       // Unpack all sub-samples
  begin
    samp[ch] := UnPack(v);          // Extract one sample into local ch slot
    Inc(ch);
    if ch = vIndex then             // Complete interleaved set received?
    begin
      ch := 0;
      // WRITE HAPPENS HERE: entire set written atomically
      Move(samp, Y_SampleBuff[SamplePtr * Y_SetSize], Y_SetSize shl 2);
      SamplePtr := (SamplePtr + 1) and Y_PtrMask;
      if SamplePop < vSamples then Inc(SamplePop);
      if SamplePop <> vSamples then Continue;    // Buffer not yet full
      if RateCycle then FFT_Draw;
    end;
  end;
end;
```

**Write Characteristics**:
- **Channel interleaving**: samples arrive Ch0, Ch1, …, Ch(vIndex−1), Ch0, … in order; `ch` tracks the current channel slot
- **Atomic set write**: `Move()` copies all 8 channel slots in one operation; only triggered when a complete set is accumulated
- **Pointer Update**: Immediate wraparound using `and Y_PtrMask`
- **Thread Safety**: Single-threaded (no locking needed)
- **Overwrite Policy**: Oldest data overwritten when full

**Example Write Sequence** (3 samples, channel 0, starting at ptr=100):
```
Sample 1: Y_SampleBuff[100*8+0] = value1, SamplePtr → 101
Sample 2: Y_SampleBuff[101*8+0] = value2, SamplePtr → 102
Sample 3: Y_SampleBuff[102*8+0] = value3, SamplePtr → 103
```

### 17.3 Read Operation Timing

**When Samples Are Read** (FFT_Draw, DebugDisplayUnit.pas:1693):

```pascal
// READ HAPPENS HERE - Extract vSamples samples for channel j
for x := 0 to vSamples - 1 do
  FFTsamp[x] := Y_SampleBuff[((SamplePtr - vSamples + x) and Y_PtrMask) * Y_SetSize + j];
```

**Read Characteristics**:
- **Frequency**: On every draw cycle (controlled by `RateCycle`)
- **Non-Destructive**: Read-only, doesn't modify SamplePtr
- **Retroactive**: Reads last N samples from current position backward
- **Atomic**: Entire sample window copied before FFT processing

**Example Read Sequence** (vSamples=4, SamplePtr=103):
```
x=0: index = ((103-4+0) & 2047) * 8 = 99*8 = 792
x=1: index = ((103-4+1) & 2047) * 8 = 100*8 = 800
x=2: index = ((103-4+2) & 2047) * 8 = 101*8 = 808
x=3: index = ((103-4+3) & 2047) * 8 = 102*8 = 816

Result: FFTsamp[] = [Y_SampleBuff[792], Y_SampleBuff[800], Y_SampleBuff[808], Y_SampleBuff[816]]
```

### 17.4 Rate Control and Draw Triggering

**RateCycle Function** (DebugDisplayUnit.pas:3079-3088):
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

**Draw Trigger Logic** (FFT_Update):
```pascal
if SamplePop = vSamples then        // Wait until buffer full
  if RateCycle then                 // Check rate throttle
    FFT_Draw;                       // Execute draw
```

**Timing Diagram** (vRate=4, vSamples=8):
```
Samples received:  S S S S | S S S S | S S S S | S S S S
SamplePop:         4       | 8 (full)| 8       | 8
RateCycle:         F F F T | F F F T | F F F T | F F F T
FFT_Draw:          -       | DRAW    | -       | DRAW

Result: Draw every 4 samples (vRate=4)
```

### 17.5 Buffer Synchronization

**No Locks Required**: Single-threaded event loop in Delphi VCL.

**Event Sequence**:
1. **Serial Data Arrives** → SerialUnit buffers bytes
2. **Timer/Event** → Calls FFT_Update
3. **FFT_Update** → Writes to Y_SampleBuff
4. **RateCycle True** → Calls FFT_Draw
5. **FFT_Draw** → Reads from Y_SampleBuff, renders display

**Guarantees**:
- Writes always complete before reads (single thread)
- No partial sample visibility
- Circular buffer prevents memory exhaustion

---

## 18. Bitmap System and Double-Buffering

### 18.1 Bitmap Architecture

**Two-Bitmap System**:
```pascal
Bitmap[0]: TBitmap;    // Render target (back buffer)
Bitmap[1]: TBitmap;    // Display buffer (front buffer)
```

**Purpose**:
- **Bitmap[0]**: All drawing operations render here
- **Bitmap[1]**: Copied to screen, prevents flicker

**Pixel Format**: 24-bit RGB (3 bytes per pixel), stored as BGR in memory.

**Memory Layout**:
```
Width: vWidth pixels
Height: vHeight pixels
Bytes per pixel: 3 (Blue, Green, Red)
Stride: Width × 3 bytes (may be aligned to 4-byte boundary)
Total memory per bitmap: Width × Height × 3 bytes

Example (512×256):
  512 × 256 × 3 = 393,216 bytes ≈ 384 KB per bitmap
  Total: 768 KB for both bitmaps
```

### 18.2 BitmapToCanvas Method

**DebugDisplayUnit.pas:3514-3522**:
```pascal
procedure BitmapToCanvas(Level: integer);
begin
  // Step 1: Copy back buffer to front buffer
  if Level = 0 then
    Bitmap[1].Canvas.Draw(0, 0, Bitmap[0]);

  // Step 2: Copy front buffer to screen
  if DisplayType in [dis_spectro, dis_plot, dis_bitmap] then
    Canvas.StretchDraw(Rect(0, 0, vClientWidth, vClientHeight), Bitmap[1])
  else
    Canvas.Draw(0, 0, Bitmap[1]);
end;
```

**Operation Modes**:
- **Level = 0**: Full update (Bitmap[0] → Bitmap[1] → Screen)
- **Level ≠ 0**: Partial update (Bitmap[1] → Screen only)

**Scaling**:
- **FFT/LOGIC/SCOPE**: 1:1 copy (`Canvas.Draw`)
- **SPECTRO/PLOT/BITMAP**: Stretched (`Canvas.StretchDraw`) for pixel scaling

### 18.3 Rendering Pipeline

**Typical Rendering Sequence**:
```
1. Clear or update Bitmap[0]:
   Bitmap[0].Canvas.Brush.Color := BackColor;
   Bitmap[0].Canvas.FillRect(...);

2. Draw to Bitmap[0]:
   SmoothLine(x1, y1, x2, y2, color);
   SmoothDot(x, y, color);

3. Copy to display:
   BitmapToCanvas(0);

4. Result:
   Bitmap[0] (rendered) → Bitmap[1] (copy) → Screen (displayed)
```

**Anti-Flicker Guarantee**: User never sees partial render (always sees Bitmap[1], which is fully rendered).

### 18.4 Scanline Access for Direct Pixel Manipulation

**Fast Pixel Writing** (PlotPixel, DebugDisplayUnit.pas:3425-3436):
```pascal
procedure PlotPixel(p: integer);
var
  v: integer;
  line: PByteArray;
begin
  p := TranslateColor(p, vColorMode);    // Convert to RGB24
  line := BitmapLine[vPixelY];           // Get scanline pointer
  v := vPixelX * 3;                      // Calculate byte offset
  line[v+0] := p shr 0;                  // Blue
  line[v+1] := p shr 8;                  // Green
  line[v+2] := p shr 16;                 // Red
end;
```

**BitmapLine Array**: Pre-calculated pointers to each scanline for fast access.

**Performance**: Direct memory write bypasses GDI, ~10-100× faster than Pixels[x,y].

---

## 19. Shared Infrastructure

### 19.1 Data Packing System

**Purpose**: Reduce serial bandwidth by packing multiple samples into single integer.

**SetPack Method** (DebugDisplayUnit.pas:4146-4156):
```pascal
procedure TDebugDisplayForm.SetPack(val: integer; alt, signx: boolean);
var
  i: integer;
begin
  vPackAlt := alt;
  vPackSignx := signx;
  if val = 0 then i := 32 shl 8 + 1 else i := PackDef[val];
  if val = 0 then vPackMask := $FFFFFFFF else vPackMask := 1 shl (i shr 8 and $FF) - 1;
  vPackShift := i shr 8 and $FF;    // Bits per sample
  vPackCount := i and $FF;          // Samples per packed integer
end;
```

**Default packing = unpacked, NOT `LONGS_1BIT`.** `SetDefaults` calls `SetPack(0, …)`
(line 2915). With `val = 0`, `SetPack` takes the special branch `i := 32 shl 8 + 1`
(line 4152) → `vPackShift = 32`, `vPackCount = 1`, `vPackMask = $FFFFFFFF`. The default is
therefore **one 32-bit sample per numeric element** (a single full-width pass-through),
*not* 32 × 1-bit. A packing directive (`LONGS_1BIT … BYTES_4BIT`) is required to enable any
sub-word unpacking.

**NewPack Method** (DebugDisplayUnit.pas:4158-4164):
```pascal
function TDebugDisplayForm.NewPack: integer;
begin
  Result := val;
  // ALT mode: reverse nibble/byte/word ordering
  if vPackAlt and (vPackShift <= 1) then Result := Result shr 1 and $55555555 or Result shl 1 and $AAAAAAAA;
  if vPackAlt and (vPackShift <= 2) then Result := Result shr 2 and $33333333 or Result shl 2 and $CCCCCCCC;
  if vPackAlt and (vPackShift <= 4) then Result := Result shr 4 and $0F0F0F0F or Result shl 4 and $F0F0F0F0;
end;
```
`NewPack` returns `val` (the already-consumed numeric element) with optional ALT bit-reversal applied. It does **not** call `NextNum` — the caller (`FFT_Update`'s `while NextNum do` loop) already advanced `ptr`.

**UnPack Method** (DebugDisplayUnit.pas:4166-4171):
```pascal
function TDebugDisplayForm.UnPack(var v: integer): integer;
begin
  Result := v and vPackMask;                                        // Extract low bits
  v := v shr vPackShift;                                            // Shift for next sample
  if vPackSignx and (Result shr (vPackShift - 1) and 1 = 1) then
    Result := Result or ($FFFFFFFF xor vPackMask);                  // Sign-extend
end;
```

**Example** (LONGS_8BIT: 4 samples × 8 bits):
```
Packed value: $12345678
Unpack 1: $78 (extract bits 0-7,  shift right 8)  → result=$78
Unpack 2: $56 (extract bits 0-7,  shift right 8)  → result=$56
Unpack 3: $34 (extract bits 0-7,  shift right 8)  → result=$34
Unpack 4: $12 (extract bits 0-7,  shift right 8)  → result=$12
```

### 19.2 Color Translation

**TranslateColor Function**: Converts various color formats to RGB24.

**Modes**: LUT (palette), LUMA8, HSV8/16, RGBI8, RGB8/16/24.

**Shared By**: FFT, SPECTRO, BITMAP, PLOT (color-based displays).

FFT itself does **not** call `TranslateColor` for its channel curves — trace colors are
stored pre-resolved as RGB24 in `vColor[]` (set by `KeyColor` at configure, or from the
default palette below).

#### 19.2.1 Default Channel Colors

FFT uses the shared `DefaultScopeColors` palette for its up-to-8 channel curves; the
global `SetDefaults` assigns `vColor[0..7] := DefaultScopeColors` before
`FFT_Configure` runs (`DebugDisplayUnit.pas` 2888).

```pascal
DefaultScopeColors: array[0..7] of integer = (   // DebugDisplayUnit.pas line 241
  clLime,     // $00FF00 — Lime green   (channel 0)
  clRed,      // $FF0000 — Red          (channel 1)
  clCyan,     // $00FFFF — Cyan         (channel 2)
  clYellow,   // $FFFF00 — Yellow       (channel 3)
  clMagenta,  // $FF00FF — Magenta      (channel 4)
  clBlue,     // $7F7FFF — Blue         (channel 5; note: NOT pure $0000FF)
  clOrange,   // $FF7F00 — Orange       (channel 6; note: NOT web $FFA500)
  clOlive);   // $7F7F00 — Olive        (channel 7; note: NOT web $808000)
```

- Background color: `vBackColor` (global default `clBlack` `$000000`).
- Grid color: `vGridColor` (global default `clGray` `$404040`).

The `clXxx` constants are literal RGB24 values defined at `DebugDisplayUnit.pas` 179–191;
they are not VCL palette `TColor`s. `WinRGB` swaps R↔B to BGR only at GDI draw time.

### 19.3 Fixed-Point Arithmetic

**8.8 Format** (8 integer bits, 8 fractional bits):
```pascal
fixed_value := integer_value shl 8;    // Convert to fixed-point
pixel := fixed_value shr 8;            // Convert back to integer
```

**Used For**: Sub-pixel positioning in rendering (SmoothLine, SmoothDot).

**Precision**: 1/256 pixel ≈ 0.004 pixels.

### 19.4 FFT Functions (Shared by FFT and SPECTRO)

**PrepareFFT**: Pre-computes sin/cos/window tables (called once during configuration).

**PerformFFT**: Executes Cooley-Tukey FFT algorithm (called every draw).

**Shared Arrays**: FFTsin, FFTcos, FFTwin, FFTreal, FFTimag, FFTsamp, FFTpower, FFTangle.

---

## 20. Initialization Lifecycle

### 20.1 Window Creation Sequence

**1. Form Creation** (Delphi VCL):
```pascal
Form := TDebugDisplayForm.Create(Owner);
```

**2. Global Variable Initialization** (compile-time):
```pascal
FFTsin, FFTcos, FFTwin: array[0..2047] allocated
Y_SampleBuff: array[0..16383] allocated (64 KB)
```

**3. FormCreate Event Handler**:
```pascal
// Create bitmaps
Bitmap[0] := TBitmap.Create;
Bitmap[1] := TBitmap.Create;

// Set pixel format
Bitmap[0].PixelFormat := pf24bit;
Bitmap[1].PixelFormat := pf24bit;

// Initialize state
SamplePtr := 0;
SamplePop := 0;
ptr := 0;  // Element array pointer
```

**4. FFT_Configure Called** (from DebugUnit):
```pascal
DisplayType := DebugDisplayValue[0];    // Extract display type (dis_fft=3)
ptr := 2;                               // Skip past type and title
case DisplayType of
  dis_fft: FFT_Configure;
end;
```

**5. FFT_Configure Execution**:
```pascal
// Set unique defaults (lines 1557-1563)
vSamples := fft_default;  // 512
FFTexp := 9;              // log2(512)
FFTfirst := 0;
FFTlast := 255;           // vSamples/2 - 1
vDotSize := 0;
vLineSize := 3;
vTextSize := FontSize;

// Parse configuration parameters (lines 1565-1600)
while NextKey do
  case val of
    key_size: ...;
    key_samples: ...;
    key_rate: ...;
  end;

// Prepare (lines 1602-1617)
PrepareFFT;               // Pre-compute sin/cos/window tables
SetSize(...);             // Set bitmap dimensions

// Ready for data
// Note: vIndex is NOT set here; it starts at 0 (from SetDefaults)
// and is incremented to 1..8 only as channel-def strings arrive in FFT_Update.
```

**6. Ready State**:
- Bitmaps allocated and sized
- FFT tables pre-computed
- Circular buffer ready
- Window displayed, waiting for data

### 20.2 Message Processing Loop

**Continuous Operation**:
```
┌─→ 1. Serial bytes arrive → SerialUnit buffers
│   2. Timer/Event triggers → DebugUnit processes
│   3. DebugUnit → FFT_Update called
│   4. FFT_Update writes samples → Y_SampleBuff
│   5. Buffer full + RateCycle → FFT_Draw called
│   6. FFT_Draw renders → Bitmap[0]
│   7. BitmapToCanvas → Screen updated
└─── Loop back to step 1
```

**Termination**:
- User closes window
- Application exits
- No explicit cleanup needed (Delphi handles bitmap destruction)

---

## Conclusion

The FFT window implementation in DebugDisplayUnit.pas represents a sophisticated real-time signal processing visualization tool with the following characteristics:

### Strengths:
1. **Efficient Algorithm**: Cooley-Tukey FFT with O(N log N) complexity
2. **Flexible Configuration**: Extensive parameter control via serial commands
3. **High-Quality Rendering**: Anti-aliased graphics with gamma-corrected blending
4. **Multi-Channel Support**: Up to 8 independent channels with per-channel scaling
5. **Bandwidth Optimization**: Packed data formats reduce serial overhead
6. **Circular Buffering**: Continuous streaming without reallocation
7. **Rate Limiting**: CPU usage control via configurable update rate

### Design Philosophy:
- **Real-Time Focus**: Optimized for continuous data streaming from embedded hardware
- **Visual Quality**: Sub-pixel rendering and smooth anti-aliasing
- **User Control**: Extensive configuration without recompilation
- **Integration**: Seamless communication with Propeller 2 debug system

### Technical Highlights:
- **Fixed-Point Math**: Fast integer operations with acceptable precision
- **Pre-Computed Tables**: Sin/cos/window functions calculated once
- **Double-Buffering**: Flicker-free display updates
- **Hanning Window**: Reduces spectral leakage for cleaner spectrum
- **Logarithmic Scaling**: Wide dynamic range visualization

### Typical Use Cases:
1. **Audio Analysis**: Real-time spectrum analyzer for audio signals
2. **Sensor Data**: Frequency content of accelerometer, gyroscope data
3. **Signal Processing**: Filter response verification
4. **Communication Systems**: Modulation spectrum analysis
5. **Vibration Analysis**: Mechanical frequency identification

The implementation demonstrates careful attention to both computational efficiency (fixed-point arithmetic, lookup tables) and user experience (high-quality graphics, flexible configuration). It serves as a robust tool for embedded systems debugging and signal analysis on the Propeller 2 platform.

---

## References

### Source Files:
- **DebugDisplayUnit.pas**: Main implementation (6000+ lines)
- **DebugUnit.pas**: Display management and command routing
- **SerialUnit.pas**: Serial communication and buffering
- **GlobalUnit.pas**: Global types and variables

### Key Algorithms:
- **Cooley-Tukey FFT**: Fast Fourier Transform algorithm
- **Hanning Window**: Window function for spectral analysis
- **Bresenham's Line**: Anti-aliased line drawing
- **Gamma Correction**: Perceptually-linear color blending

### External Dependencies:
- Delphi VCL: Forms, Graphics, Controls
- Windows API: Serial port, device context, bitmap manipulation
- Delphi RTL: Math functions (Log2, Hypot, ArcTan2, Sin, Cos)

---

**End of Document**
