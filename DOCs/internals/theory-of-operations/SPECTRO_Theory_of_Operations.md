# SPECTRO Display Window - Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Directive coverage verified**: 2026-06-01 against `DebugDisplayUnit.pas` (v55)
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window config/display/keyboard/mouse reference

## Table of Contents

1. [Overview](#1-overview)
2. [Display Type and Constants](#2-display-type-and-constants)
3. [Data Structures](#3-data-structures)
4. [Configuration and Initialization](#4-configuration-and-initialization)
5. [Update Processing](#5-update-processing)
6. [FFT Processing Pipeline](#6-fft-processing-pipeline)
7. [Color Mapping System](#7-color-mapping-system)
8. [Rendering Pipeline](#8-rendering-pipeline)
9. [Trace System and Scrolling](#9-trace-system-and-scrolling)
10. [Rate Control System](#10-rate-control-system)
11. [Data Packing System](#11-data-packing-system)
12. [Window Management](#12-window-management)
13. [Command Protocol](#13-command-protocol)
14. [Usage Examples](#14-usage-examples)
15. [Performance Characteristics](#15-performance-characteristics)
16. [Comparison with FFT Display](#16-comparison-with-fft-display)
17. [Implementation Details](#17-implementation-details)
18. [Element Array Protocol Specification](#18-element-array-protocol-specification)
19. [Buffer Management and Timing](#19-buffer-management-and-timing)
20. [Bitmap System and Double-Buffering](#20-bitmap-system-and-double-buffering)
21. [Shared Infrastructure](#21-shared-infrastructure)
22. [Initialization Lifecycle](#22-initialization-lifecycle)
23. [Summary](#23-summary)

---

## 1. Overview

### 1.1 Purpose

The **SPECTRO** (Spectrogram) display window is a real-time frequency spectrum analyzer that visualizes audio or signal frequency content over time. Unlike the FFT display which shows a single frequency snapshot, SPECTRO creates a **waterfall display** where:

- **Horizontal axis**: Represents frequency bins (configurable range)
- **Vertical axis**: Represents time (scrolling history)
- **Color intensity**: Represents signal magnitude at each frequency

This creates a scrolling "heat map" visualization perfect for analyzing time-varying frequency content, identifying harmonics, tracking frequency shifts, and visualizing spectral evolution.

### 1.2 Key Features

- **Real-time FFT processing**: Continuous frequency analysis with configurable FFT sizes (4 to 2048 points)
- **Waterfall visualization**: Time-scrolling color-coded frequency display
- **Flexible color mapping**: Multiple color modes including luminance, HSV, and RGB encodings
- **Logarithmic scaling**: Optional log-scale magnitude display for wide dynamic range
- **Configurable depth**: Time history depth (vertical dimension) independent of FFT size
- **Magnification control**: Adjustable FFT magnitude scaling (bit-shift magnification)
- **Frequency range selection**: Display subset of frequency bins (FFTfirst to FFTlast)
- **Rate throttling**: Control display update rate independent of sample rate
- **Eight trace directions**: Horizontal/vertical scrolling in multiple directions
- **Dot size scaling**: X/Y pixel scaling for enlarged displays
- **Data packing**: Efficient 12-mode packed data transmission

### 1.3 Typical Applications

- **Audio spectrum analysis**: Visualize audio frequency content over time
- **Signal monitoring**: Track frequency shifts and harmonics
- **Vibration analysis**: Analyze mechanical vibration spectra
- **Communications**: Monitor RF signal spectra
- **Musical analysis**: Visualize musical notes and harmonics
- **Echo/reverb visualization**: See acoustic reflections
- **Frequency sweep analysis**: Track sweeping tones

---

## 2. Display Type and Constants

### 2.1 Display Type Identifier

**DebugDisplayUnit.pas:26**
```pascal
const
  dis_spectro = 4;
```

The SPECTRO display is identified by `dis_spectro = 4` in the display type enumeration.

### 2.2 FFT-Related Constants

**DebugDisplayUnit.pas:154-177**
```pascal
const
  DataSetsExp           = 11;
  DataSets              = 1 shl DataSetsExp;  // 2048

  FFTexpMax             = DataSetsExp;        // 11
  FFTmax                = DataSets;           // 2048

  SPECTRO_Samples       = DataSets;           // 2048
  SPECTRO_PtrMask       = SPECTRO_Samples - 1; // 2047

  fft_default           = 512;
```

**Key Constants**:
- **FFTmax**: Maximum FFT size = 2048 samples
- **FFTexpMax**: Maximum FFT exponent = 11 (2^11 = 2048)
- **SPECTRO_Samples**: Circular buffer size = 2048 samples
- **SPECTRO_PtrMask**: Wraparound mask for circular buffer indexing
- **fft_default**: Default FFT size = 512 samples

### 2.3 Color Mode Constants

**DebugDisplayUnit.pas:43-61**
```pascal
const
  key_lut1              = 10;   // 1-bit lookup table
  key_lut2              = 11;   // 2-bit lookup table
  key_lut4              = 12;   // 4-bit lookup table
  key_lut8              = 13;   // 8-bit lookup table
  key_luma8             = 14;   // 8-bit luminance
  key_luma8w            = 15;   // 8-bit luminance, white variant
  key_luma8x            = 16;   // 8-bit luminance, extended range
  key_hsv8              = 17;   // 8-bit HSV
  key_hsv8w             = 18;   // 8-bit HSV, white variant
  key_hsv8x             = 19;   // 8-bit HSV, extended range
  key_rgbi8             = 20;   // 8-bit RGBI
  key_rgbi8w            = 21;   // 8-bit RGBI, white variant
  key_rgbi8x            = 22;   // 8-bit RGBI, extended range
  key_rgb8              = 23;   // 8-bit RGB (3:3:2)
  key_hsv16             = 24;   // 16-bit HSV
  key_hsv16w            = 25;   // 16-bit HSV, white variant
  key_hsv16x            = 26;   // 16-bit HSV, extended range
  key_rgb16             = 27;   // 16-bit RGB (5:6:5)
  key_rgb24             = 28;   // 24-bit RGB
```

SPECTRO defaults to **key_luma8x** (8-bit luminance with extended range).

---

## 3. Data Structures

### 3.1 Sample Buffer

**DebugDisplayUnit.pas:363**
```pascal
var
  SPECTRO_SampleBuff: array [0..SPECTRO_Samples - 1] of integer;
```

**Characteristics**:
- **Size**: 2048 samples (fixed, power-of-2)
- **Type**: Signed 32-bit integers
- **Organization**: Circular buffer with wrap-around
- **Indexing**: Uses `SPECTRO_PtrMask` for modulo arithmetic

**Memory footprint**: 2048 × 4 bytes = **8,192 bytes** (8 KB)

### 3.2 FFT Working Arrays

**DebugDisplayUnit.pas:384-395**
```pascal
var
  FFTexp                : integer;          // FFT exponent (2^exp = size)
  FFTmag                : integer;          // Magnitude bit-shift
  FFTfirst              : integer;          // First bin to display
  FFTlast               : integer;          // Last bin to display
  FFTsin                : array [0..FFTmax - 1] of int64;  // Sine table
  FFTcos                : array [0..FFTmax - 1] of int64;  // Cosine table
  FFTwin                : array [0..FFTmax - 1] of int64;  // Hanning window
  FFTreal               : array [0..FFTmax - 1] of int64;  // Real component
  FFTimag               : array [0..FFTmax - 1] of int64;  // Imaginary component
  FFTsamp               : array [0..FFTmax - 1] of integer; // Input samples
  FFTpower              : array [0..FFTmax div 2 - 1] of integer; // Magnitude
  FFTangle              : array [0..FFTmax div 2 - 1] of integer; // Phase
```

**Array Details**:

| Array | Size | Type | Purpose | Memory |
|-------|------|------|---------|--------|
| FFTsin | 2048 | int64 | Pre-computed sine values | 16 KB |
| FFTcos | 2048 | int64 | Pre-computed cosine values | 16 KB |
| FFTwin | 2048 | int64 | Hanning window coefficients | 16 KB |
| FFTreal | 2048 | int64 | FFT real component (working) | 16 KB |
| FFTimag | 2048 | int64 | FFT imaginary component (working) | 16 KB |
| FFTsamp | 2048 | integer | Input sample staging | 8 KB |
| FFTpower | 1024 | integer | Output magnitude per bin | 4 KB |
| FFTangle | 1024 | integer | Output phase per bin | 4 KB |

**Total FFT memory**: **96 KB**

### 3.3 Color Translation Tables

**DebugDisplayUnit.pas:365**
```pascal
var
  PolarColors: array [0..255] of integer;
```

**Purpose**: Pre-computed HSV-to-RGB color lookup table for polar color modes.

**Memory**: 256 × 4 bytes = **1,024 bytes** (1 KB)

### 3.4 Configuration Variables

**DebugDisplayUnit.pas:284-313**
```pascal
var
  vSamples              : integer;  // FFT size (power-of-2)
  vWidth                : integer;  // Display width (time depth)
  vHeight               : integer;  // Display height (frequency bins)
  vRange                : integer;  // Magnitude range
  vRate                 : integer;  // Update rate divisor
  vRateCount            : integer;  // Rate counter
  vTrace                : integer;  // Trace direction (0-7, +8 for scroll)
  vDotSize              : integer;  // Horizontal pixel scaling
  vDotSizeY             : integer;  // Vertical pixel scaling
  vColorMode            : integer;  // Color encoding mode
  vColorTune            : integer;  // Color hue offset
  vLogScale             : boolean;  // Logarithmic magnitude scaling
  vPixelX               : integer;  // Current trace X position
  vPixelY               : integer;  // Current trace Y position
```

---

## Directive Reference (v55-verified)

> Source authority: `DebugDisplayUnit.pas` (PNut v55). See also §5.5 and §4 of the
> [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md).

### Configuration directives

Accepted in `SPECTRO_Configure` (lines 1719–1790). All are optional; defaults shown.

| Directive | Parameter(s) | Range / notes | Default | Pascal lines |
|---|---|---|---|---|
| `TITLE 'str'` | string | window title | `"SPECTRO"` | 1737-1738 |
| `POS left top` | two integers | window position | auto | 1739-1740 |
| `SAMPLES n {first last}` | n = FFT size; optional first/last bin | n clamped to nearest power-of-2 in 4..2048; first ∈ [0, n/2−2], last ∈ [first+1, n/2−1]. `if not NextNum then Continue` (1743) — a bare `SAMPLES` with no number **skips the directive entirely** (no reset of first/last). The `last` bin is read **only if** the `first` value was consumed (`if KeyValWithin(FFTfirst,…) then KeyValWithin(FFTlast,…)`, 1748-1749). | 512 (bins 0..255) | 1741-1750 |
| `DEPTH n` | integer | 1..2048 (time-history lines) | 256 (writes `vWidth`; fixed default from `SetDefaults`, 2884 — the W/H swap at 1782-1787 is a separate transform) | 1751-1752 |
| `MAG n` | integer | 0..11 (2^n magnitude multiplier) | 0 | 1753-1754 |
| `RANGE n` | integer | 1..$7FFFFFFF | $7FFFFFFF | 1755-1756 |
| `RATE n` | integer | 1..2048 samples per display update | samples÷8 | 1757-1758 |
| `TRACE n` | integer | stored raw (unclamped) via `KeyVal(vTrace)`; effective 0..15 via the `$F` mask (bits 0-2 = direction, bit 3 = scroll) applied in `SetTrace` (`vTrace := Path and $F`, 2979) | 15 ($F) | 1759-1760 |
| `DOTSIZE x {y}` | 1 or 2 integers | each 1..16. If `x` is consumed (`KeyValWithin(vDotSize,1,16)` true, 1762), `vDotSizeY` first **defaults to `vDotSize`** (1764), then an **optional** second value re-clamps it (1765). With no `x`, the directive is a no-op. | 1, 1 | 1761-1765 |
| color-mode | one keyword | **RESTRICTED:** `LUMA8`, `LUMA8W`, `LUMA8X`, `HSV16`, `HSV16W`, `HSV16X` only (line 1767) | `LUMA8X` | 1767-1768 |
| `LOGSCALE` | none | enable log-magnitude display | off | 1769-1770 |
| `HIDEXY` | none | suppress on-screen measurement cursor | off | 1771-1772 |
| packed `LONGS_1BIT..BYTES_4BIT` | none | select data packing mode | none | 1773-1774 |

**Color-mode restriction** (line 1767): SPECTRO accepts only the luminance and
16-bit HSV families — `key_luma8..key_luma8x` and `key_hsv16..key_hsv16x`.
The broader LUT, RGBI, RGB8, HSV8, RGB16, RGB24 families present in other
windows are **not** accepted here.

**Color-mode sub-argument** (`KeyColorMode`, 2785-2804): each color-mode keyword may
take an optional `vColorTune` sub-argument, but the accepted form differs by family:

- **LUMA8 family** (`key_luma8..key_luma8x`): the sub-arg may be either a **color
  keyword** (`key_orange..key_gray`, stored as `val − key_orange`) **or** a **number**
  (`KeyVal(vColorTune)`). A following key that is not a color keyword is pushed back
  (`Dec(ptr)`) and not consumed.
- **HSV16 family** (`key_hsv16..key_hsv16x`): the sub-arg is a **number only**
  (`KeyVal(vColorTune)`); no keyword form.

If no sub-argument is present, `vColorTune` keeps its prior value.

### Display / data directives

Accepted in `SPECTRO_Update` (lines 1792–1834).

| Directive | Notes | Pascal lines |
|---|---|---|
| numeric sample stream | bare `ele_num` values; unpacked through current packing mode; triggers FFT+draw when buffer full and rate cycles | 1818-1831 |
| `CLEAR` | clears bitmap, resets sample-pop counter and rate counter, resets trace position | 1801-1808 |
| `SAVE` | saves current bitmap to file | 1809-1810 |
| `PC_KEY` | polls latched keypress; triggers `SendKeyPress` | 1811-1812 |
| `PC_MOUSE` | polls cursor position + buttons + wheel; triggers `SendMousePos` | 1813-1814 |

Strings and all other directives not listed above are rejected (string causes
immediate loop break; unrecognised keys are silently skipped).

### Keyboard & mouse

SPECTRO uses the **shared input model** — there is no per-window keyboard or
mouse handling logic beyond coordinate mapping.

| Handler | Lines | Behaviour |
|---|---|---|
| `WMGetDlgCode` | 585-589 | Captures Tab key (`DLGC_WANTTAB`); Tab does not change focus. |
| `FormMouseMove` | 647-809 | Draws live measurement cursor showing `x,y` coordinates. For SPECTRO: `x = pixel ÷ vDotSize`, `y = pixel ÷ vDotSizeY` (line 733-734). Suppressed when `HIDEXY` set (line 737). |
| `FormMouseWheel` | 811-823 | Latches wheel direction (+1/−1) into `vMouseWheel` for 100 ms, then auto-clears. |
| `FormKeyPress` | 825-831 | Latches key byte into `vKeyPress` for 100 ms, then auto-clears. |
| `FormKeyDown` | 833-851 | Maps non-printable keys: Left=1, Right=2, Up=3, Down=4, Home=5, End=6, Delete=7, Insert=10, PageUp=11, PageDown=12. |

**`PC_KEY` → `SendKeyPress`** (3579-3583): transmits one LONG = latched `vKeyPress` byte (0 if none), then clears it. Behaviour is identical across all nine windows.

**`PC_MOUSE` → `SendMousePos`** (3537-3577): transmits two LONGs.
- LONG 1: bits 0-12 = x, bits 13-25 = y, bits 26-27 = wheel, bits 28-30 = L/M/R buttons. `$03FFFFFF`/`$FFFFFFFF` sentinel when cursor is outside the window.
- LONG 2: RGB color of pixel under cursor (byte-swapped to `$RRGGBB`).

⚠️ SPECTRO's **on-screen readout** and **`PC_MOUSE` wire value differ in Y origin**:
- **On-screen readout** (`FormMouseMove`, lines 733-734): `x = X ÷ vDotSize`, `y = Y ÷
  vDotSizeY` — top-origin, no direction flip.
- **`PC_MOUSE` wire value** (`SendMousePos`, in the shared `dis_spectro, dis_plot,
  dis_bitmap` branch): applies `if not vDirY then y := ClientHeight − y` *before* dividing.
  Since `vDirY` is always `False` for SPECTRO (only PLOT's `CARTESIAN` sets it), the wire
  value is **Y-inverted** (bottom-origin): `x = X ÷ vDotSize`, `y = (ClientHeight − Y) ÷
  vDotSizeY`. So the P2 receives a bottom-origin Y, opposite the on-screen readout.

`HIDEXY` suppresses the on-screen readout only; `PC_MOUSE` still reports to the P2.

---

## 4. Configuration and Initialization

### 4.1 SPECTRO_Configure Method

**DebugDisplayUnit.pas:1719-1790**
```pascal
procedure TDebugDisplayForm.SPECTRO_Configure;
var
  i: integer;
begin
  // Set unique defaults
  vTrace := $F;                    // Trace mode $F (default scrolling)
  vColorMode := key_luma8x;        // Default to extended luminance
  vSamples := fft_default;         // 512 samples
  FFTexp := Trunc(Log2(fft_default)); // exp = 9
  FFTfirst := 0;
  FFTlast := fft_default div 2 - 1;  // 255 bins
  FFTmag := 0;                     // No magnification
  vDotSize := 1;                   // 1:1 pixel scaling
  vDotSizeY := 1;
  vRange := $7FFFFFFF;             // Maximum range

  // Process any parameters
  while NextKey do
  case val of
    key_title:
      KeyTitle;
    key_pos:
      KeyPos;
    key_samples:
    begin
      if not NextNum then Continue;
      FFTexp := Trunc(Log2(Within(val, 4, FFTmax)));
      vSamples := 1 shl FFTexp;
      FFTfirst := 0;
      FFTlast := vSamples div 2 - 1;
      if KeyValWithin(FFTfirst, 0, vSamples div 2 - 2) then
        KeyValWithin(FFTlast, FFTfirst + 1, vSamples div 2 - 1);
    end;
    key_depth:
      KeyValWithin(vWidth, 1, FFTmax);
    key_mag:
      KeyValWithin(FFTmag, 0, FFTexpMax);
    key_range:
      KeyValWithin(vRange, 1, $7FFFFFFF);
    key_rate:
      KeyValWithin(vRate, 1, FFTmax);
    key_trace:
      KeyVal(vTrace);
    key_dotsize:
      if KeyValWithin(vDotSize, 1, 16) then
      begin
        vDotSizeY := vDotSize;
        KeyValWithin(vDotSizeY, 1, 16);
      end;
    key_luma8..key_luma8x, key_hsv16..key_hsv16x:
      KeyColorMode;
    key_logscale:
      vLogScale := True;
    key_hidexy:
      vHideXY := True;
    key_longs_1bit..key_bytes_4bit:
      KeyPack;
  end;

  // Prepare
  PrepareFFT;
  if vRate = 0 then vRate := vSamples div 8;  // Default rate = samples/8
  vRateCount := vRate - 1;

  // Set form metrics
  vHeight := FFTlast - FFTfirst + 1;  // Height = frequency bin count
  if vTrace and $4 = 0 then           // Swap when bit 2 clear (0-3, 8-11)
  begin
    i := vWidth;
    vWidth := vHeight;                // Swap width/height
    vHeight := i;
  end;
  SetSize(0, 0, 0, 0);
  SetTrace(vTrace, False);
end;
```

### 4.2 Configuration Parameters

| Parameter | Key | Type | Range | Default | Description |
|-----------|-----|------|-------|---------|-------------|
| **title** | key_title | string | - | "SPECTRO" | Window title text |
| **pos** | key_pos | left, top | - | auto | Window position (two integers: left, top — offsets from DebugDisplayLeft/Top). `KeyPos` (2712-2716) reads exactly two values; no width/height. |
| **samples** | key_samples | integer | 4-2048 (power-of-2) | 512 | FFT size (also accepts bin range) |
| **depth** | key_depth | integer | 1-2048 | 256 | Time history depth. Writes `vWidth` (1751-1752); default is the fixed **256** inherited from `SetDefaults` (2884). The width/height swap (`vTrace and $4`, 1782-1787) is a separate post-loop transform, not a default. |
| **mag** | key_mag | integer | 0-11 | 0 | Magnitude bit-shift (2^mag multiplier) |
| **range** | key_range | integer | 1-$7FFFFFFF | $7FFFFFFF | Maximum magnitude for scaling |
| **rate** | key_rate | integer | 1-2048 | samples/8 | Display update rate (samples per update) |
| **trace** | key_trace | integer | stored raw (unclamped); effective 0..15 via `$F` mask | 15 | `KeyVal(vTrace)` (1760) stores the value unclamped; the 0..15 window comes only from `vTrace := Path and $F` in `SetTrace` (2979) |
| **dotsize** | key_dotsize | integer(s) | 1-16 | 1 | Pixel scaling (X, optional Y) |
| **colormode** | key_luma8..key_luma8x, key_hsv16..key_hsv16x | enum | restricted set (line 1767) | key_luma8x | Color encoding mode |
| **logscale** | key_logscale | boolean | - | false | Logarithmic magnitude scaling |
| **hidexy** | key_hidexy | boolean | - | false | Hide axis labels |
| **packing** | key_longs_1bit..key_bytes_4bit | enum | - | none | Data packing mode |

### 4.3 Dimension Calculation

**Key Logic** (lines 1781-1787):
```pascal
vHeight := FFTlast - FFTfirst + 1;  // Frequency bin count
if vTrace and $4 = 0 then           // Swap when bit 2 is clear
begin
  i := vWidth;
  vWidth := vHeight;                // Swap dimensions
  vHeight := i;
end;
```

**Trace Mode and Dimensions**:

The swap predicate is `vTrace and $4 = 0` — it tests **bit 2 only**, so the scroll
bit (bit 3) is irrelevant. Swap occurs for `vTrace` values 0-3 **and** 8-11; no swap
for 4-7 **and** 12-15.

- **Trace 0-3 and 8-11** (bit 2 clear): Width = frequency bins, Height = time depth (swapped)
- **Trace 4-7 and 12-15** (bit 2 set): Width = time depth, Height = frequency bins (no swap)

**Example**: 512-point FFT, depth=300, trace=0
- FFT bins: 0-255 (256 bins)
- vHeight = 256 (before swap)
- vWidth = 300 (before swap)
- **After swap**: vWidth = 256, vHeight = 300
- **Display**: 256 pixels wide (frequency) × 300 pixels tall (time)

---

## 5. Update Processing

### 5.1 SPECTRO_Update Method

**DebugDisplayUnit.pas:1792-1834**
```pascal
procedure TDebugDisplayForm.SPECTRO_Update;
var
  i, v: integer;
begin
  while not NextEnd do
  begin
    if NextStr then Break;   // string not allowed
    if NextKey then
    case val of
      key_clear:
      begin
        ClearBitmap;
        BitmapToCanvas(0);
        SamplePop := 0;
        vRateCount := vRate - 1;
        SetTrace(vTrace, False);
      end;
      key_save:
        KeySave;
      key_pc_key:
        SendKeyPress;
      key_pc_mouse:
        SendMousePos;
    end
    else
    begin
      while NextNum do
      begin
        // Get sample(s)
        v := NewPack;
        for i := 1 to vPackCount do
        begin
          // Enter sample into buffer
          SPECTRO_SampleBuff[SamplePtr] := UnPack(v);
          SamplePtr := (SamplePtr + 1) and SPECTRO_PtrMask;
          if SamplePop < vSamples then Inc(SamplePop);
          if SamplePop <> vSamples then Continue;  // Buffer not full, exit
          if RateCycle then SPECTRO_Draw;
        end;
      end;
    end;
  end;
end;
```

### 5.2 Sample Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Receive packed data value                                │
│    v := NewPack                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Unpack multiple samples (if packed)                      │
│    for i := 1 to vPackCount do                              │
│      sample := UnPack(v)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Store in circular buffer                                 │
│    SPECTRO_SampleBuff[SamplePtr] := sample                  │
│    SamplePtr := (SamplePtr + 1) and SPECTRO_PtrMask         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Track buffer fill count                                  │
│    if SamplePop < vSamples then Inc(SamplePop)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Wait for buffer full                                     │
│    if SamplePop <> vSamples then Continue                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Check rate throttle                                      │
│    if RateCycle then SPECTRO_Draw                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Command Processing

**Supported Commands**:

| Command | Key | Action |
|---------|-----|--------|
| **CLEAR** | key_clear | Clear display, reset sample buffer, reset trace position |
| **SAVE** | key_save | Save current display to image file |
| **PC_KEY** | key_pc_key | Send keyboard input to connected system |
| **PC_MOUSE** | key_pc_mouse | Send mouse position to connected system |

**CLEAR Command Behavior** (lines 1801-1808):
```pascal
ClearBitmap;                    // Fill with background color
BitmapToCanvas(0);              // Copy to display buffer
SamplePop := 0;                 // Reset buffer fill count
vRateCount := vRate - 1;        // Reset rate counter
SetTrace(vTrace, False);        // Reset trace position
```

---

## 6. FFT Processing Pipeline

### 6.1 PrepareFFT Method

**DebugDisplayUnit.pas:4170-4183**
```pascal
procedure TDebugDisplayForm.PrepareFFT;
var
  i: integer;
  Tf, Xf, Yf: extended;
begin
  for i := 0 to 1 shl FFTexp - 1 do
  begin
    Tf := Rev32(i) / $100000000 * Pi;
    SinCos(Tf, Yf, Xf);
    FFTsin[i] := Round(Yf * $1000);
    FFTcos[i] := Round(Xf * $1000);
    FFTwin[i] := Round((1 - Cos((i / (1 shl FFTexp)) * Pi * 2)) * $1000)
  end;
end;
```

**Purpose**: Pre-compute FFT twiddle factors and Hanning window coefficients.

**Hanning Window Formula**:
```
w[n] = 0.5 × (1 - cos(2πn / N))
     = (1 - cos(2πn / N))  (scaled by 2 in implementation)
```

**Fixed-Point Scaling**: All coefficients scaled by $1000 (4096) for integer arithmetic.

### 6.2 PerformFFT Method

**DebugDisplayUnit.pas:4185-4243**
```pascal
procedure TDebugDisplayForm.PerformFFT;
var
  i1, i2, i3, i4, c1, c2, th, ptra, ptrb: integer;
  ax, ay, bx, by, rx, ry: int64;
begin
  // Load samples into (real,imag) with Hanning window applied
  for i1 := 0 to 1 shl FFTexp - 1 do
  begin
    FFTreal[i1] := FFTsamp[i1] * FFTwin[i1];
    FFTimag[i1] := 0
  end;

  // Perform FFT on (real,imag)
  i1 := 1 shl (FFTexp - 1);
  i2 := 1;
  while i1 <> 0 do
  begin
    th := 0;
    i3 := 0;
    i4 := i1;
    c1 := i2;
    while c1 <> 0 do
    begin
      ptra := i3;
      ptrb := ptra + i1;
      c2 := i4 - i3;
      while c2 <> 0 do
      begin
        ax := FFTreal[ptra];
        ay := FFTimag[ptra];
        bx := FFTreal[ptrb];
        by := FFTimag[ptrb];
        rx := (bx * FFTcos[th] - by * FFTsin[th]) div $1000;
        ry := (bx * FFTsin[th] + by * FFTcos[th]) div $1000;
        FFTreal[ptra] := ax + rx;
        FFTimag[ptra] := ay + ry;
        FFTreal[ptrb] := ax - rx;
        FFTimag[ptrb] := ay - ry;
        ptra := ptra + 1;
        ptrb := ptrb + 1;
        c2 := c2 - 1;
      end;
      th := th + 1;
      i3 := i3 + i1 shl 1;
      i4 := i4 + i1 shl 1;
      c1 := c1 - 1;
    end;
    i1 := i1 shr 1;
    i2 := i2 shl 1;
  end;

  // Convert (real,imag) to (power,angle)
  for i1 := 0 to 1 shl (FFTexp - 1) - 1 do
  begin
    i2 := Rev32(i1) shr (32 - FFTexp);
    rx := FFTreal[i2];
    ry := FFTimag[i2];
    FFTpower[i1] := Round(Hypot(rx, ry) / ($800 shl FFTexp shr FFTmag));
    FFTangle[i1] := Round(ArcTan2(rx, ry) / (Pi * 2) * $100000000) and $FFFFFFFF;
  end;
end;
```

### 6.3 FFT Algorithm

**Algorithm**: Radix-2 decimation-in-time FFT (Cooley-Tukey)

**Stages**:
1. **Windowing**: Apply Hanning window to input samples
2. **Bit-reversal**: Implicitly handled by Rev32 indexing
3. **Butterfly operations**: Nested loops with twiddle factor multiplication
4. **Magnitude calculation**: Convert complex to polar (magnitude + phase)

**Butterfly Operation**:
```
For each pair (a, b):
  r = b × exp(-j2πk/N)
  a' = a + r
  b' = a - r
```

**Magnitude Formula** (line 4240):
```pascal
magnitude = √(real² + imag²) / (scaling_factor)
scaling_factor = $800 << FFTexp >> FFTmag
              = 2048 × 2^FFTexp / 2^FFTmag
```

**Magnification**:
- **FFTmag = 0**: No magnification (default)
- **FFTmag = 1**: 2× magnification
- **FFTmag = 2**: 4× magnification
- **FFTmag = n**: 2^n× magnification

### 6.4 Bit-Reversal Function

**DebugDisplayUnit.pas:4245-4252**
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

**Purpose**: Reverse the bit pattern of a 32-bit integer (used for FFT bit-reversal indexing).

**Example**: Rev32(1) = $80000000, Rev32(2) = $40000000

---

## 7. Color Mapping System

### 7.1 TranslateColor Method

**DebugDisplayUnit.pas:3082-3165**

The `TranslateColor` method converts pixel values from various color encodings to 24-bit RGB format for display.

**Supported Color Modes**:

| Mode | Bits | Description | Color Space |
|------|------|-------------|-------------|
| **key_luma8** | 8 | Luminance (black to color) | Grayscale + hue |
| **key_luma8w** | 8 | Luminance (white to color) | Inverted grayscale + hue |
| **key_luma8x** | 8 | Luminance extended range | Enhanced contrast |
| **key_hsv8** | 8 | HSV (hue 4-bit, sat/val 4-bit) | Polar color wheel |
| **key_hsv16** | 16 | HSV (hue 8-bit, sat/val 8-bit) | Full HSV |
| **key_hsv16w** | 16 | HSV white variant | Inverted saturation |
| **key_hsv16x** | 16 | HSV extended range | Enhanced contrast |
| **key_rgb8** | 8 | RGB (3:3:2) | Direct RGB |
| **key_rgb16** | 16 | RGB (5:6:5) | High-color RGB |
| **key_rgb24** | 24 | RGB (8:8:8) | True-color RGB |

### 7.2 Luminance Modes (LUMA8, LUMA8W, LUMA8X)

**DebugDisplayUnit.pas:3097-3134**
```pascal
key_luma8, key_luma8w, key_luma8x:
begin
  v := vColorTune and 7;         // Color selection (0-7)
  p := p and $FF;                // 8-bit luminance value

  // Extended range scaling
  if (mode = key_luma8x) and (v <> 7) then
    if (p >= $80) then p := not p and $7F shl 1
    else p := p shl 1;

  // White variant inversion
  w := (mode = key_luma8w) or
       (mode = key_luma8x) and (v <> 7) and (p >= $80);

  if w then
  begin   // from white to color
    if v = 0 then
      p := (p shl 7 and $007F00 or p) xor $FFFFFF    // orange
    else
    begin
      if v <> 7 then v := v xor 7;
      p := (v shr 2 and 1 * p shl 16 or
            v shr 1 and 1 * p shl 8  or
            v shr 0 and 1 * p shl 0) xor $FFFFFF;
    end;
  end
  else
  begin  // from black to color
    if v = 0 then
      p := p shl 16 or p shl 7 and $007F00    // orange
    else
      p := v shr 2 and 1 * p shl 16 or
           v shr 1 and 1 * p shl 8  or
           v shr 0 and 1 * p shl 0;
  end;
end;
```

**Color Tuning Values** (vColorTune and 7):

| Value | Color | RGB Channels |
|-------|-------|--------------|
| 0 | Orange | R+G (special case) |
| 1 | Blue | B only |
| 2 | Green | G only |
| 3 | Cyan | G+B |
| 4 | Red | R only |
| 5 | Magenta | R+B |
| 6 | Yellow | R+G |
| 7 | White | R+G+B |

### 7.3 HSV Modes (HSV8, HSV16)

**DebugDisplayUnit.pas:3135-3152**
```pascal
key_hsv8, key_hsv8w, key_hsv8x,
key_hsv16, key_hsv16w, key_hsv16x:
begin
  // Expand 8-bit to 16-bit if needed
  if mode in [key_hsv8, key_hsv8w, key_hsv8x] then
    p := p and $F0 * $110 or p and $0F * $11;

  // Look up base color from polar color wheel
  v := PolarColors[(p shr 8 + vColorTune) and $FF];
  p := p and $FF;  // Saturation/value

  // Extended range scaling
  if mode in [key_hsv8x, key_hsv16x] then
    if (p >= $80) then p := p and $7F shl 1 xor $FE
    else p := p shl 1;

  // White variant
  w := (mode in [key_hsv8w, key_hsv16w]) or
       (mode in [key_hsv8x, key_hsv16x]) and (p >= $80);

  if w then v := v xor $FFFFFF;

  // Blend base color with saturation/value
  p := (v shr 16 and $FF * p + $FF) shr 8 shl 16 or
       (v shr  8 and $FF * p + $FF) shr 8 shl  8 or
       (v shr  0 and $FF * p + $FF) shr 8 shl  0;

  if w then p := p xor $FFFFFF;
end;
```

### 7.4 PolarColors Table

**DebugDisplayUnit.pas:3199-3220**
```pascal
procedure TDebugDisplayForm.SetPolarColors;
const
  tuning = -7.2;  // starts colors exactly at red
var
  i, j: integer;
  k: extended;
  v: array [0..2] of integer;
begin
  for i := 0 to 255 do
  begin
    for j := 0 to 2 do
    begin
      k := i + tuning + j * 256 / 3;
      if k >= 256 then k := k - 256;
      if      k < 256 * 2/6 then v[j] := 0
      else if k < 256 * 3/6 then v[j] := Round((k - 256 * 2/6) / (256 * 3/6 - 256 * 2/6) * 255)
      else if k < 256 * 5/6 then v[j] := 255
      else                       v[j] := Round((256 * 6/6 - k) / (256 * 6/6 - 256 * 5/6) * 255);
    end;
    PolarColors[i] := v[2] shl 16 or v[1] shl 8 or v[0];
  end;
end;
```

**Color Wheel Pattern**: Creates 256-entry table mapping hue angle (0-255) to RGB colors following standard color wheel progression (red → yellow → green → cyan → blue → magenta → red).

---

## 8. Rendering Pipeline

### 8.1 SPECTRO_Draw Method

**DebugDisplayUnit.pas:1836-1857**
```pascal
procedure TDebugDisplayForm.SPECTRO_Draw;
var
  x, p: integer;
  v: int64;
  fScale: Extended;
begin
  // Copy samples from circular buffer to FFT input
  for x := 0 to vSamples - 1 do
    FFTsamp[x] := SPECTRO_SampleBuff[(SamplePtr - vSamples + x) and SPECTRO_PtrMask];

  // Perform FFT
  PerformFFT;

  // Calculate scaling factor
  fScale := 255 / vRange;

  // Plot each frequency bin
  for x := FFTfirst to FFTlast do
  begin
    v := FFTpower[x];

    // Apply logarithmic scaling if enabled
    if vLogScale then
      v := Round(Log2(Int64(v) + 1) / Log2(Int64(vRange) + 1) * vRange);

    // Scale to 0-255 range
    p := Round(v * fScale);
    if p > $FF then p := $FF;

    // Add phase information for HSV16 modes
    if vColorMode in [key_hsv16..key_hsv16x] then
      p := p or FFTangle[x] shr 16 and $FF00;

    // Plot pixel and advance trace
    PlotPixel(p);
    if x = FFTlast then BitmapToCanvas(0);  // Capture before scroll
    StepTrace;
  end;
end;
```

### 8.2 Rendering Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Extract sample window from circular buffer               │
│    for x := 0 to vSamples - 1 do                            │
│      FFTsamp[x] := SPECTRO_SampleBuff[...]                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Perform FFT (windowing, transform, magnitude)            │
│    PerformFFT                                                │
│    → FFTpower[0..bins-1] contains magnitudes                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Calculate scaling factor                                 │
│    fScale = 255 / vRange                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. For each frequency bin (FFTfirst to FFTlast):           │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ a. Get magnitude: v = FFTpower[x]                   │ │
│    └──────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│                       ▼                                     │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ b. Apply log scaling if enabled:                    │ │
│    │    v = log2(v+1) / log2(range+1) × range            │ │
│    └──────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│                       ▼                                     │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ c. Scale to 0-255:                                  │ │
│    │    p = round(v × fScale)                            │ │
│    │    clamp to 0-255                                   │ │
│    └──────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│                       ▼                                     │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ d. Add phase for HSV16 modes:                       │ │
│    │    p |= FFTangle[x] >> 16 & $FF00                   │ │
│    └──────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│                       ▼                                     │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ e. Plot pixel at current trace position             │ │
│    │    PlotPixel(p)                                      │ │
│    └──────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│                       ▼                                     │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ f. Advance trace position (scroll if needed)        │ │
│    │    StepTrace                                         │ │
│    └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Copy bitmap to display buffer (after last bin)          │
│    BitmapToCanvas(0)                                        │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Logarithmic Scaling

**Formula** (line 1849):
```pascal
v := Round(Log2(Int64(v) + 1) / Log2(Int64(vRange) + 1) * vRange)
```

**Mathematical Form**:
```
v_scaled = log₂(v + 1) / log₂(range + 1) × range
```

**Purpose**: Compress wide dynamic range into displayable range while preserving detail in low-amplitude regions.

**Example** (vRange = 1000):
- Linear v=1 → p=0.255 (barely visible)
- Log v=1 → p=1.02 (enhanced)
- Linear v=100 → p=25.5 (dim)
- Log v=100 → p=67.1 (brighter)
- Linear v=1000 → p=255 (max)
- Log v=1000 → p=255 (max)

### 8.4 PlotPixel Method

**DebugDisplayUnit.pas:3425-3436**
```pascal
procedure TDebugDisplayForm.PlotPixel(p: integer);
var
  v: integer;
  line: PByteArray;
begin
  p := TranslateColor(p, vColorMode);  // Convert to RGB24
  line := BitmapLine[vPixelY];         // Get scanline pointer
  v := vPixelX * 3;                    // Byte offset (3 bytes/pixel)
  line[v+0] := p shr 0;                // Blue
  line[v+1] := p shr 8;                // Green
  line[v+2] := p shr 16;               // Red
end;
```

**Direct Pixel Writing**: Writes RGB24 directly to bitmap scanline for maximum performance (no GDI overhead).

---

## 9. Trace System and Scrolling

### 9.1 Trace Modes

The **vTrace** parameter controls both trace direction and scrolling behavior:

**Bit Encoding**:
- **Bits 0-2**: Direction (0-7)
- **Bit 3**: Scroll enable (0=wrap, 1=scroll)

**Direction Modes**:

| Mode | Direction | Primary Axis | Secondary Axis | Typical Use |
|------|-----------|--------------|----------------|-------------|
| **0** | Left-to-right, top-to-bottom | X+ | Y+ | Horizontal waterfall (downward) |
| **1** | Right-to-left, top-to-bottom | X- | Y+ | Horizontal waterfall reversed |
| **2** | Left-to-right, bottom-to-top | X+ | Y- | Horizontal waterfall (upward) |
| **3** | Right-to-left, bottom-to-top | X- | Y- | Horizontal waterfall reversed up |
| **4** | Top-to-bottom, left-to-right | Y+ | X+ | Vertical waterfall (rightward) |
| **5** | Bottom-to-top, left-to-right | Y- | X+ | Vertical waterfall reversed |
| **6** | Top-to-bottom, right-to-left | Y+ | X- | Vertical waterfall (leftward) |
| **7** | Bottom-to-top, right-to-left | Y- | X- | Vertical waterfall reversed left |

**Scroll Modes**:
- **vTrace = 0-7**: Wrap-around (no scrolling)
- **vTrace = 8-15**: Bitmap scrolling enabled

**Default**: vTrace = $F (15) = mode 7 with scrolling

### 9.2 SetTrace Method

**DebugDisplayUnit.pas:2965-2972**
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

**Initial Position Logic**:
- **Modes 0, 2, 4, 5**: Start at X=0
- **Modes 1, 3, 6, 7**: Start at X=width-1
- **Modes 0, 1, 4, 6**: Start at Y=0
- **Modes 2, 3, 5, 7**: Start at Y=height-1

### 9.3 StepTrace Method

**DebugDisplayUnit.pas:2974-3034** (excerpt for mode 0)
```pascal
procedure TDebugDisplayForm.StepTrace;
var
  Scroll: boolean;
begin
  Scroll := vTrace and 8 <> 0;
  case vTrace and 7 of
    0:  // Left-to-right, top-to-bottom
    begin
      if vPixelX <> vWidth - 1 then
        Inc(vPixelX)
      else
      begin
        vPixelX := 0;
        if Scroll then
          ScrollBitmap(0, 1)      // Scroll down 1 line
        else if vPixelY <> vHeight - 1 then
          Inc(vPixelY)
        else
          vPixelY := 0;
      end;
    end;
    // ... other modes
  end;
end;
```

**Behavior**:
1. **Advance primary axis** until edge reached
2. **At edge**: Reset primary, advance secondary
3. **If scroll enabled**: Call ScrollBitmap
4. **If wrap mode**: Advance secondary or wrap to start

### 9.4 ScrollBitmap Method

**DebugDisplayUnit.pas:3438-3473**
```pascal
procedure TDebugDisplayForm.ScrollBitmap(x, y: integer);
var
  xm, ym: integer;
  src, dst: TRect;
begin
  // Determine pixel multiplier
  if vSparse = -1 then
  begin
    xm := 1;
    ym := 1;
  end
  else
  begin
    xm := vDotSize;
    ym := vDotSizeY;
  end;

  // Copy bitmap contents shifted by (x, y)
  src := Rect(0, 0, vWidth * xm, vHeight * ym);
  dst := Rect(x * xm, y * ym, (vWidth + x) * xm, (vHeight + y) * ym);
  Bitmap[0].Canvas.CopyRect(dst, Bitmap[0].Canvas, src);

  // Fill exposed area with background
  Bitmap[0].Canvas.Brush.Color := WinRGB(GetBackground);
  if x <> 0 then
  begin
    if x < 0 then
      dst := Rect((vWidth + x) * xm, 0, vWidth * xm, vHeight * ym)
    else
      dst := Rect(0, 0, x * xm, vHeight * ym);
    Bitmap[0].Canvas.FillRect(dst);
  end;
  if y <> 0 then
  begin
    if y < 0 then
      dst := Rect(0, (vHeight + y) * ym, vWidth * xm, vHeight * ym)
    else
      dst := Rect(0, 0, vWidth * xm, y * ym);
    Bitmap[0].Canvas.FillRect(dst);
  end;
end;
```

**Scroll Operation**:
1. **Copy entire bitmap** shifted by (x, y) pixels
2. **Fill exposed area** (edge strip) with background color

**Example** (y=1, downward scroll):
- Copy entire bitmap from (0,0) to (0,1)
- Fill top line (0,0) to (width,1) with background
- Next pixel plots at top edge, pushing history down

---

## 10. Rate Control System

### 10.1 RateCycle Function

**DebugDisplayUnit.pas:3071-3080**
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

**Purpose**: Throttle display updates to reduce processing load and control scrolling speed.

**Behavior**:
- Increments counter on each sample
- Returns `True` every **vRate** samples
- Resets counter to 0

**Default Rate** (line 1778):
```pascal
if vRate = 0 then vRate := vSamples div 8;  // samples/8
```

**Example** (512-point FFT):
- Default vRate = 512 / 8 = 64
- Display updates every 64 samples
- At 8000 Hz sample rate: 8000/64 = 125 updates/sec

### 10.2 Rate Control in Update Loop

**DebugDisplayUnit.pas:1829**
```pascal
if RateCycle then SPECTRO_Draw;
```

**Flow**:
```
Sample arrives → Store in buffer → Buffer full? → Rate cycle? → Draw
                                         ↓              ↓
                                        No            No
                                         ↓              ↓
                                       Wait          Wait
```

### 10.3 Rate Configuration

**Configuration** (line 1757-1758):
```pascal
key_rate:
  KeyValWithin(vRate, 1, FFTmax);
```

**Range**: 1 to 2048 samples per update

**Performance Impact**:
- **vRate = 1**: Update every sample (maximum CPU load)
- **vRate = 8**: Update every 8 samples (fast scrolling)
- **vRate = 64**: Update every 64 samples (moderate, default-ish)
- **vRate = 512**: Update every 512 samples (slow scrolling)

---

## 11. Data Packing System

The SPECTRO display uses the same 12-mode data packing system as other displays for efficient serial transmission.

### 11.1 Packing Modes

**DebugDisplayUnit.pas:139-152**
```pascal
const
  PackTable: array [key_longs_1bit..key_bytes_4bit] of integer =
    (1 shl 16 +  1 shl 8 + 32,   // key_longs_1bit:  sign=1, shift=1,  count=32
     1 shl 16 +  2 shl 8 + 16,   // key_longs_2bit:  sign=1, shift=2,  count=16
     1 shl 16 +  4 shl 8 + 8,    // key_longs_4bit:  sign=1, shift=4,  count=8
     1 shl 16 +  8 shl 8 + 4,    // key_longs_8bit:  sign=1, shift=8,  count=4
     1 shl 16 + 16 shl 8 + 2,    // key_longs_16bit: sign=1, shift=16, count=2
     0 shl 16 +  1 shl 8 + 16,   // key_words_1bit:  sign=0, shift=1,  count=16
     0 shl 16 +  2 shl 8 + 8,    // key_words_2bit:  sign=0, shift=2,  count=8
     0 shl 16 +  4 shl 8 + 4,    // key_words_4bit:  sign=0, shift=4,  count=4
     0 shl 16 +  8 shl 8 + 2,    // key_words_8bit:  sign=0, shift=8,  count=2
     0 shl 16 +  1 shl 8 + 8,    // key_bytes_1bit:  sign=0, shift=1,  count=8
     0 shl 16 +  2 shl 8 + 4,    // key_bytes_2bit:  sign=0, shift=2,  count=4
     0 shl 16 +  4 shl 8 + 2);   // key_bytes_4bit:  sign=0, shift=4,  count=2
```

### 11.2 Packing Table

| Mode | Sign Extend | Bits/Sample | Samples/Long | Bandwidth Multiplier |
|------|-------------|-------------|--------------|----------------------|
| **LONGS_1BIT** | Yes | 1 | 32 | 32× |
| **LONGS_2BIT** | Yes | 2 | 16 | 16× |
| **LONGS_4BIT** | Yes | 4 | 8 | 8× |
| **LONGS_8BIT** | Yes | 8 | 4 | 4× |
| **LONGS_16BIT** | Yes | 16 | 2 | 2× |
| **WORDS_1BIT** | No | 1 | 16 | 16× |
| **WORDS_2BIT** | No | 2 | 8 | 8× |
| **WORDS_4BIT** | No | 4 | 4 | 4× |
| **WORDS_8BIT** | No | 8 | 2 | 2× |
| **BYTES_1BIT** | No | 1 | 8 | 8× |
| **BYTES_2BIT** | No | 2 | 4 | 4× |
| **BYTES_4BIT** | No | 4 | 2 | 2× |

### 11.3 UnPack Method

**DebugDisplayUnit.pas:4158-4163**
```pascal
function TDebugDisplayForm.UnPack(var v: integer): integer;
begin
  Result := v and vPackMask;
  v := v shr vPackShift;
  if vPackSignx and (Result shr (vPackShift - 1) and 1 = 1) then
    Result := Result or ($FFFFFFFF xor vPackMask);
end;
```

**Operation**:
1. Extract lowest bits (mask)
2. Shift packed value right
3. Sign-extend if enabled and MSB=1

**Example** (LONGS_4BIT, signed):
- Packed: $87654321
- Sample 1: $1 → sign-extend → $FFFFFFF1 (-15)
- Sample 2: $2 → $00000002 (+2)
- Sample 3: $3 → $00000003 (+3)
- Sample 4: $4 → $00000004 (+4)
- Sample 5: $5 → $00000005 (+5)
- Sample 6: $6 → $00000006 (+6)
- Sample 7: $7 → $00000007 (+7)
- Sample 8: $8 → sign-extend → $FFFFFFF8 (-8)

---

## 12. Window Management

### 12.1 Bitmap System

SPECTRO uses **double-buffering** for flicker-free display:

**Buffers**:
- **Bitmap[0]**: Render target (drawing buffer)
- **Bitmap[1]**: Display buffer (shown on screen)

**Rendering Flow**:
```
Plot pixels → Bitmap[0] → BitmapToCanvas(0) → Bitmap[1] → Screen
```

### 12.2 BitmapToCanvas Method

Copies Bitmap[0] to Bitmap[1] and triggers screen refresh.

**Timing** (line 1854):
```pascal
if x = FFTlast then BitmapToCanvas(0);  // Capture just before scroll
```

**Important**: Bitmap captured **before** final StepTrace to avoid tearing artifacts during scroll.

### 12.3 Window Size Calculation

**SetSize Call** (line 1788):
```pascal
SetSize(0, 0, 0, 0);
```

**Default window size**: with all defaults (depth `vWidth = 256` from `SetDefaults`,
FFT 512 → bins `vHeight = FFTlast − FFTfirst + 1 = 256`, `vTrace = $F` so bit 2 is set
→ **no** width/height swap, `vDotSize = vDotSizeY = 1`), the client area is **256 × 256
px**. (The §4 example uses `depth=300, trace=0`, which *does* swap — that is an example,
not the default.)

**Font size**: SPECTRO renders **no text labels** — `SPECTRO_Configure` does not set
`vTextSize`, so it stays at `DefaultTextSize = 10` (`SetDefaults`, 2894), and SPECTRO
exposes **no `TEXTSIZE` directive**. The value is effectively unused.

**Actual Size Determined By**:
- **vWidth**: Frequency bins (after swap) or time depth
- **vHeight**: Time depth (after swap) or frequency bins
- **vDotSize**: Horizontal pixel scaling
- **vDotSizeY**: Vertical pixel scaling

**Pixel Dimensions**:
```
PixelWidth = vWidth × vDotSize
PixelHeight = vHeight × vDotSizeY
```

**Example**:
- 512-point FFT, bins 0-255, depth=300, trace=0, dotsize=2×3
- vWidth=256, vHeight=300 (after swap)
- Display: 512×900 pixels

---

## 13. Command Protocol

### 13.1 Configuration Command

**Format** (element array):
```
ele_key, dis_spectro,
ele_key, key_title, ele_str, "title text", ele_end,
ele_key, key_samples, ele_num, fft_size,
ele_key, key_depth, ele_num, time_depth,
ele_key, key_mag, ele_num, magnification,
ele_key, key_range, ele_num, max_magnitude,
ele_key, key_rate, ele_num, update_rate,
ele_key, key_trace, ele_num, trace_mode,
ele_key, key_dotsize, ele_num, x_scale, ele_num, y_scale,
ele_key, key_luma8x,  // or other color mode
ele_key, key_logscale,
ele_end
```

### 13.2 Update Command

**Format**:
```
ele_num, sample1, ele_num, sample2, ..., ele_end
```

**Or with packing**:
```
ele_key, key_longs_4bit,  // select packing mode
ele_num, packed_value1,   // contains 8 samples
ele_num, packed_value2,
..., ele_end
```

### 13.3 Control Commands

**Clear Display**:
```
ele_key, key_clear, ele_end
```

**Save Image**:
```
ele_key, key_save, ele_end
```

---

## 14. Usage Examples

### 14.1 Basic Audio Spectrogram

**Goal**: Display audio frequency spectrum over time.

**Configuration**:
```
SPECTRO
  SAMPLES 1024       ' 1024-point FFT (0-512 bins)
  DEPTH 400          ' 400 pixels of time history
  RATE 128           ' Update every 128 samples
  TRACE 8            ' Left-to-right, scrolling down
  LUMA8X             ' Extended luminance coloring
  DOTSIZE 2 1        ' 2× horizontal scaling
```

**Data Stream** (at 8000 Hz):
```
Sample stream: s0, s1, s2, s3, ...
Updates every 128 samples (62.5 updates/sec)
Display scrolls down showing newest at top
```

**Interpretation**:
- Horizontal: 0-4000 Hz (Nyquist frequency)
- Vertical: Time (newest at top, scrolling down)
- Brightness: Signal magnitude

### 14.2 Wideband vs. Narrowband

**Wideband** (time resolution):
```
SAMPLES 128        ' Small FFT
RATE 16            ' Frequent updates
DEPTH 1000         ' Long history
```
- **Good for**: Transients, rhythm, time-domain events
- **Poor for**: Frequency resolution

**Narrowband** (frequency resolution):
```
SAMPLES 2048       ' Large FFT
RATE 512           ' Infrequent updates
DEPTH 200          ' Shorter history
```
- **Good for**: Pitch tracking, harmonics, frequency detail
- **Poor for**: Time resolution

### 14.3 HSV Phase Display

**Goal**: Show both magnitude and phase using color.

**Configuration**:
```
SPECTRO
  SAMPLES 512
  HSV16X             ' 16-bit HSV with phase
  RANGE $10000       ' Moderate dynamic range
```

**Data Interpretation**:
- **Brightness**: Magnitude (0=black, 255=bright)
- **Hue**: Phase angle (0-255 maps to 0-360°)
- **Use**: Identify phase relationships between harmonics

### 14.4 Vibration Analysis

**Goal**: Monitor mechanical vibration spectrum.

**Configuration**:
```
SPECTRO
  SAMPLES 512
  DEPTH 500
  MAG 4              ' 16× magnification for low-level signals
  LOGSCALE           ' Logarithmic magnitude
  LUMA8 CYAN         ' Cyan coloring
  TRACE 12           ' Vertical scrolling right
```

**Interpretation**:
- Horizontal: Time
- Vertical: 0-Nyquist frequency
- Persistent harmonics visible as vertical lines
- Transients visible as horizontal bursts

### 14.5 Packed Data Transmission

**Goal**: Efficient transmission of 8-bit audio.

**Configuration**:
```
SPECTRO
  SAMPLES 512
  LONGS_8BIT         ' Pack 4 samples per long
```

**Propeller 2 Code**:
```spin2
' Pack 4 8-bit samples into one long
packed := (sample1 << 0) | (sample2 << 8) | (sample3 << 16) | (sample4 << 24)
debug(`SPECTRO `UDEC_(packed))
```

**Bandwidth**: 4× reduction vs. sending individual samples.

---

## 15. Performance Characteristics

### 15.1 Computational Complexity

**FFT Complexity**: O(N log N)

**Operation Counts** (512-point FFT):
- **Butterfly operations**: 512 × log₂(512) = 512 × 9 = 4,608
- **Complex multiplications**: ~2,304
- **Per update**: ~10,000-15,000 operations

**Windowing**: O(N) = 512 operations

**Total per FFT**: ~15,000 operations

### 15.2 Update Rate Analysis

**Frame Rate Calculation**:
```
Sample rate: fs (Hz)
FFT size: N samples
Rate divisor: R samples/update

Update rate = fs / R (updates/sec)
Time between updates = R / fs (seconds)
```

**Example** (8 kHz, 512-point, rate=64):
- Update rate = 8000 / 64 = 125 Hz
- Time between = 64 / 8000 = 8 ms

**Typical Rates**:
- **Audio (real-time)**: 30-120 Hz (smooth scrolling)
- **Instrumentation**: 10-50 Hz (analysis)
- **Slow events**: 1-10 Hz (long-term monitoring)

### 15.3 Memory Bandwidth

**Per Update**:
- **Sample buffer writes**: N × 4 bytes
- **FFT reads**: N × 4 bytes
- **FFT computation**: ~6N × 8 bytes (int64 arrays)
- **Pixel writes**: bins × 3 bytes (RGB)

**Example** (512-point):
- Sample writes: 512 × 4 = 2 KB
- FFT reads: 512 × 4 = 2 KB
- FFT computation: ~24 KB
- Pixel writes: 256 × 3 = 768 bytes
- **Total**: ~29 KB per update

**At 125 Hz**: 29 KB × 125 = 3.6 MB/sec

### 15.4 Display Bandwidth

**Scrolling Overhead**:
- **Bitmap copy**: width × height × 3 bytes per scroll
- **Example** (256×300): 256 × 300 × 3 = 230 KB per scroll

**At 125 Hz with 1-pixel scroll per update**: 230 KB × 125 = 28.75 MB/sec

**Optimization**: Scrolling handled by GPU (CopyRect), not CPU-intensive.

---

## 16. Comparison with FFT Display

### 16.1 Key Differences

| Aspect | FFT Display | SPECTRO Display |
|--------|-------------|-----------------|
| **Visualization** | Single snapshot | Time-scrolling waterfall |
| **Horizontal axis** | Frequency | Frequency (bit 2 clear: trace 0-3, 8-11) or Time (bit 2 set: trace 4-7, 12-15) |
| **Vertical axis** | Magnitude | Time (bit 2 clear: trace 0-3, 8-11) or Frequency (bit 2 set: trace 4-7, 12-15) |
| **Magnitude encoding** | Y-position (line graph) | Color intensity (heat map) |
| **Time history** | None (single frame) | Configurable depth |
| **Scrolling** | No | Yes (8 directions) |
| **Update behavior** | Redraw entire display | Add one line, scroll |
| **Multi-channel** | Yes (8 overlaid traces) | No (single channel) |
| **Phase display** | Optional overlay | HSV16 color encoding |
| **Typical use** | Real-time spectrum analyzer | Time-frequency analysis |

### 16.2 Shared Components

Both displays share:
- **FFT processing** (PrepareFFT, PerformFFT)
- **Data packing system** (SetPack, UnPack)
- **Sample buffer** (SPECTRO_SampleBuff vs. Y_SampleBuff)
- **Color mapping** (TranslateColor)
- **Magnification control** (FFTmag)
- **Frequency range selection** (FFTfirst, FFTlast)
- **Logarithmic scaling** (vLogScale)

### 16.3 When to Use Which

**Use FFT Display When**:
- Real-time spectrum monitoring needed
- Multiple channels compared simultaneously
- Precise magnitude measurement required
- Cursor readout needed
- Static spectrum analysis

**Use SPECTRO Display When**:
- Time evolution important
- Pattern recognition in time-frequency space
- Harmonic tracking over time
- Transient detection
- Recording/playback analysis
- Musical note visualization

---

## 17. Implementation Details

### 17.1 Fixed-Point Arithmetic

**FFT Coefficient Scaling** (line 4179-4181):
```pascal
FFTsin[i] := Round(Yf * $1000);    // Scale by 4096
FFTcos[i] := Round(Xf * $1000);
FFTwin[i] := Round(w * $1000);
```

**Butterfly Computation** (line 4216-4217):
```pascal
rx := (bx * FFTcos[th] - by * FFTsin[th]) div $1000;
ry := (bx * FFTsin[th] + by * FFTcos[th]) div $1000;
```

**Precision**: 12 bits fractional (1/4096 resolution)

**Range**: ±$7FFFFFFF / $1000 ≈ ±524,288

### 17.2 Bit-Reversal Indexing

**Purpose**: FFT algorithm requires bit-reversed input order.

**Implementation**: Rev32 function reverses bits of input index.

**Example** (8-point FFT):
```
Normal:  0 1 2 3 4 5 6 7
Reversed: 0 4 2 6 1 5 3 7
```

**Application** (line 4237):
```pascal
i2 := Rev32(i1) shr (32 - FFTexp);
```

Reverses only the significant bits (FFTexp bits).

### 17.3 Hanning Window

**Formula** (line 4181):
```pascal
FFTwin[i] := Round((1 - Cos((i / (1 shl FFTexp)) * Pi * 2)) * $1000)
```

**Standard Form**:
```
w[n] = 0.5 × (1 - cos(2πn / N))
```

**Implementation Form** (scaled by 2):
```
w[n] = 1 - cos(2πn / N)
```

**Purpose**: Reduce spectral leakage by tapering window edges to zero.

**Effect**: Main lobe widened slightly, sidelobes reduced >30 dB.

### 17.4 Magnitude Calculation

**Hypot Function** (line 4240):
```pascal
FFTpower[i1] := Round(Hypot(rx, ry) / ($800 shl FFTexp shr FFTmag));
```

**Magnitude**:
```
magnitude = √(real² + imag²)
```

**Scaling Factor**:
```
scale = $800 << FFTexp >> FFTmag
      = 2048 × 2^FFTexp / 2^FFTmag
```

**Example** (512-point, mag=0):
- scale = 2048 × 512 / 1 = 1,048,576
- Full-scale input → magnitude ≈ 1,048,576
- Scaled to 0-$7FFFFFFF range

### 17.5 Phase Calculation

**ArcTan2 Function** (line 4241):
```pascal
FFTangle[i1] := Round(ArcTan2(rx, ry) / (Pi * 2) * $100000000) and $FFFFFFFF;
```

**Phase Angle**:
```
angle = atan2(real, imag) / (2π) × 2^32
```

**Output**: 32-bit unsigned (0 to $FFFFFFFF maps to 0 to 2π radians)

**HSV16 Encoding** (line 1852):
```pascal
if vColorMode in [key_hsv16..key_hsv16x] then
  p := p or FFTangle[x] shr 16 and $FF00;
```

**Result**: Lower 8 bits = magnitude, upper 8 bits = phase angle (hue).

### 17.6 Receiving Types & Numeric Parity (TS-port Contract)

This subsection captures the exact Pascal numeric semantics a TypeScript port must
reproduce. Getting any of these wrong produces silently divergent pixels.

**Receiving field types**:

- Every receiving configuration field (`vWidth`, `vHeight`, `vRange`, `vRate`,
  `vTrace`, `vDotSize`, `vDotSizeY`, `FFTexp`, `FFTmag`, `FFTfirst`, `FFTlast`,
  `vColorTune`, …) is a **signed 32-bit `integer`** (`DebugDisplayUnit.pas` 284-313)
  and therefore **wraps** on overflow.
- The shared scan cursor `val` is likewise signed 32-bit `integer` (line 358); all
  `Key*` helpers read from it.
- `vTrace` is stored **raw** by `KeyVal(vTrace)` (1760, unclamped) and only later
  reduced to 0..15 by the `$F` mask in `SetTrace` (2979).
- `SPECTRO_Draw` uses a local **int64** `v` (1839) and deliberate `Int64()`
  widening (1849) so the log-scale intermediates do not overflow 32 bits — the
  receiving fields stay 32-bit, but this one render-loop accumulator is 64-bit by
  design.

**Parity notes** (operation-by-operation):

| Operation | Source | Pascal semantics | TS port must use |
|---|---|---|---|
| RATE default `vRate := vSamples div 8` | 1778 | Pascal `div` = integer divide, **truncate toward zero** | `Math.trunc(vSamples / 8)`, not `>>` blindly (operands are non-negative here, but keep trunc semantics) |
| SAMPLES snap `Trunc(Log2(Within(val,4,FFTmax)))` | 1744 | `Trunc` truncates **toward zero** (down, for positive) | `Math.trunc(Math.log2(...))` |
| Log-scale `Round(Log2(Int64(v)+1)/Log2(Int64(vRange)+1)*vRange)` | 1849 | Delphi `Round` = **banker's rounding** (round-half-to-even) | banker's-round helper, **not** `Math.round` |
| Linear scale `Round(v*fScale)` | 1850 | Delphi `Round` = **banker's rounding** | banker's-round helper, **not** `Math.round` |
| `Within(value, min, max)` | GlobalUnit.pas 222-227 | **saturating** clamp (returns min/max), never wraps or errors | clamp, not modulo/throw |
| `shr` (e.g. phase `FFTangle[x] shr 16`) | 1852 | **logical** right shift (unsigned fill) | `>>>`, not `>>` |
| `UnPack` sign extension | 4166-4170 | **signed** sign-extension when `vPackSignx` and MSB set | replicate sign bit into the high bits |

> Delphi's `Round` is the dominant trap: it rounds halves to the nearest **even**
> value, so e.g. `Round(0.5)=0` and `Round(2.5)=2`, whereas `Math.round(0.5)=1` and
> `Math.round(2.5)=3`. Both `SPECTRO_Draw` scaling steps (1849-1850) depend on this.

---

## 18. Element Array Protocol Specification

### 18.1 Protocol Overview

SPECTRO uses the standard element array protocol for configuration and data transmission.

**Element Storage**:
```pascal
DebugDisplayType:  array[0..DebugDisplayLimit - 1] of integer;
DebugDisplayValue: array[0..DebugDisplayLimit - 1] of integer;
```

### 18.2 SPECTRO Configuration Example

SPECTRO has **no** `SIZE`, `LOGSIZE`, or `LUTCOLORS` directives — those keys are
not handled by `SPECTRO_Configure` (lines 1735-1775). FFT size is set with
`SAMPLES`, time depth with `DEPTH`, and color via the restricted color-mode set.
A representative configuration element array is:

```
Element Array:
[0] type=ele_key   value=key_samples   → SAMPLES
[1] type=ele_num   value=512           → 512-point FFT (FFTexp = 9, bins 0..255)
[2] type=ele_key   value=key_depth     → DEPTH
[3] type=ele_num   value=400           → 400 time-history lines (vWidth)
[4] type=ele_key   value=key_trace     → TRACE
[5] type=ele_num   value=$F            → direction 7 + scroll (KeyVal → vTrace)
[6] type=ele_key   value=key_luma8x    → LUMA8X color mode
[7] type=ele_end   value=0
```

`SAMPLES` passes its first numeric value through `Within(val, 4, FFTmax)` and
`Trunc(Log2(...))` to derive `FFTexp` (line 1744); optional first/last bin values
follow. See `SPECTRO_Configure` lines 1741-1750.

### 18.3 SPECTRO Sample Data Example

```
Element Array:
[0] type=ele_num   value=$12345678       → packed samples
[1] type=ele_num   value=$9ABCDEF0       → packed samples
[2] type=ele_end   value=0
```

---

## 19. Buffer Management and Timing

### 19.1 Sample Buffer

**DebugDisplayUnit.pas:363**
```pascal
SPECTRO_SampleBuff: array [0..SPECTRO_Samples - 1] of integer;  // 2048 samples
```

**Circular Buffer**: Stores time-domain samples before FFT processing. Indexed
by `SamplePtr` advanced with `and SPECTRO_PtrMask` (= 2047). `SamplePop` tracks
fill level up to `vSamples`; the buffer is "full" once `SamplePop = vSamples`
(`SPECTRO_Update` lines 1825-1828).

### 19.2 FFT Processing Flow

```
1. Collect samples in circular buffer (SPECTRO_Update, 1818-1830)
2. Buffer full (SamplePop = vSamples) and RateCycle true → SPECTRO_Draw (1828-1829)
3. Copy newest vSamples into FFTsamp, perform FFT (SPECTRO_Draw 1842-1844)
4. Magnitude/phase produced in FFTpower/FFTangle (PerformFFT)
5. Scale + (optional) log + (HSV16) phase, TranslateColor (SPECTRO_Draw 1846-1852)
6. PlotPixel writes one bin per pixel at vPixelX,vPixelY (3433-3445)
7. StepTrace advances/scrolls the bitmap for the waterfall effect (2982-3061)
```

### 19.3 Scrolling Mechanics

There is **no** `vScroll` variable in v55. Scrolling is driven entirely by the
`vTrace` bit-field via `StepTrace` (lines 2982-3061): `vTrace and 7` selects one
of 8 directions and `vTrace and 8` enables bitmap scrolling. The eight directions
and their scroll vectors (the `ScrollBitmap(x, y)` call each emits) are:

| `vTrace and 7` | Primary advance | Scroll call at edge |
|---|---|---|
| 0 | X+ then Y+ | `ScrollBitmap(0, 1)` (down) |
| 1 | X− then Y+ | `ScrollBitmap(0, 1)` (down) |
| 2 | X+ then Y− | `ScrollBitmap(0, -1)` (up) |
| 3 | X− then Y− | `ScrollBitmap(0, -1)` (up) |
| 4 | Y+ then X+ | `ScrollBitmap(1, 0)` (right) |
| 5 | Y− then X+ | `ScrollBitmap(1, 0)` (right) |
| 6 | Y+ then X− | `ScrollBitmap(-1, 0)` (left) |
| 7 | Y− then X− | `ScrollBitmap(-1, 0)` (left) |

When `vTrace and 8 = 0` (no scroll), the secondary axis wraps instead of
scrolling. `ScrollBitmap` shifts the bitmap by 1 unit and fills the freed edge
strip with background; the next line of bins is then plotted into that strip.

---

## 20. Bitmap System and Double-Buffering

### 20.1 Bitmap Architecture

SPECTRO renders into the shared `Bitmap[0]` (drawing target) and presents via
`BitmapToCanvas(0)` (line 3522). `PlotPixel` writes directly to scanline
pointers cached in `BitmapLine[]` as **RGB24** (3 bytes/pixel: blue, green, red —
`PlotPixel` lines 3438-3442). There is no separate RGBA buffer.

### 20.2 Waterfall Rendering

The real draw loop is `SPECTRO_Draw` (lines 1846-1856): it does **not** call
`ScrollBitmap` directly, and it has no `FFTmag[x]`/`MapToColor` array. Each bin
is read from `FFTpower[x]`, scaled, optionally log-mapped, optionally OR-ed with
phase for HSV16 modes, then `PlotPixel(p)` writes it at the current trace
position. `StepTrace` (called after each pixel) is what advances the position and
issues `ScrollBitmap` at a row/column edge:

```pascal
for x := FFTfirst to FFTlast do
begin
  v := FFTpower[x];
  if vLogScale then v := Round(Log2(Int64(v)+1) / Log2(Int64(vRange)+1) * vRange);
  p := Round(v * fScale);                     // fScale = 255 / vRange
  if p > $FF then p := $FF;
  if vColorMode in [key_hsv16..key_hsv16x] then
    p := p or FFTangle[x] shr 16 and $FF00;   // phase into upper byte
  PlotPixel(p);                                // TranslateColor → RGB24 scanline
  if x = FFTlast then BitmapToCanvas(0);       // capture before final StepTrace
  StepTrace;                                   // advance / ScrollBitmap
end;
```

### 20.3 Color Mapping

SPECTRO does not use a runtime LUT. Color is produced by `TranslateColor(p, vColorMode)`
(called inside `PlotPixel`, line 3437), and `vColorMode` is restricted to the
luminance and 16-bit HSV families only (`key_luma8..key_luma8x`,
`key_hsv16..key_hsv16x`; restriction at `SPECTRO_Configure` line 1767). For the
HSV16 family, `SPECTRO_Draw` packs phase into bits 8-15 of `p` before plotting
(line 1852: `p := p or FFTangle[x] shr 16 and $FF00`), so the byte value carries
both magnitude (low byte) and phase/hue (high byte). The HSV→RGB conversion uses
the precomputed `PolarColors[]` table (built by `SetPolarColors`, lines 3207-3228),
not a magnitude-indexed LUT.

---

## 21. Shared Infrastructure

### 21.1 FFT Engine

SPECTRO shares the same fixed-point FFT engine as FFT display:
- Optimized butterfly operations
- Bit-reversal permutation
- Twiddle factor lookup tables
- Magnitude and phase calculation

### 21.2 Color System

SPECTRO shares the standard color path: `TranslateColor` (3082-3165) plus the
`PolarColors[0..255]` table (declared line 365, built by `SetPolarColors`
lines 3207-3228). There is no `DefaultSpectrumColors` array in v55 —
`PolarColors` is the only precomputed color table, and it serves the HSV color
modes (red→yellow→green→cyan→blue→magenta hue wheel). Luminance modes are
computed arithmetically in `TranslateColor` from `vColorTune` (see §7.2).

Like BITMAP, SPECTRO has **no fixed channel/trace palette** (`DefaultScopeColors`
does not apply). The only fixed color constants are the **background** values
returned by `GetBackground` (`DebugDisplayUnit.pas` 3180–3205), selected by color
mode:

| Color mode | Background | Hex |
|---|---|---|
| LUT1/2/4/8 | `vLut[0]` | (first palette entry) |
| LUMA8/8X, HSV16/16X (and other non-"W" modes) | `clBlack` | `$000000` |
| LUMA8W, HSV16W (white-base "W" modes) | `clWhite` | `$FFFFFF` |

`clBlack`/`clWhite` are literal RGB24 values (`DebugDisplayUnit.pas` 187–188).
(SPECTRO restricts its config color mode to the LUMA8/HSV16 families — see §17.4.)

### 21.3 Data Packing

Uses standard 12 packing modes:
- LONGS_1BIT through BYTES_4BIT
- Sign extension for signed modes
- Efficient unpacking during sample collection

---

## 22. Initialization Lifecycle

### 22.1 Configuration Lifecycle

There is no `vLogSize`, `vScroll`, `vLutSize`, `InitializeFFT`, or
`GenerateSpectrumLUT` in v55. Initialization is performed entirely by
`SPECTRO_Configure` (lines 1719-1790) in this real order:

```pascal
// 1. Set unique defaults (1723-1733)
vTrace := $F; vColorMode := key_luma8x; vSamples := fft_default;  // 512
FFTexp := Trunc(Log2(fft_default));                               // 9
FFTfirst := 0; FFTlast := fft_default div 2 - 1;                  // 0..255
FFTmag := 0; vDotSize := 1; vDotSizeY := 1; vRange := $7FFFFFFF;

// 2. Process element-array directives (1735-1775)
while NextKey do case val of ... end;   // SAMPLES/DEPTH/MAG/RANGE/RATE/TRACE/...

// 3. Build FFT tables for the chosen size (1777)
PrepareFFT;                              // sin/cos/Hanning, sized by FFTexp

// 4. Default rate, prime rate counter (1778-1779)
if vRate = 0 then vRate := vSamples div 8;
vRateCount := vRate - 1;

// 5. Compute metrics; swap W/H for horizontal traces (1781-1787)
vHeight := FFTlast - FFTfirst + 1;
if vTrace and $4 = 0 then begin i := vWidth; vWidth := vHeight; vHeight := i; end;

// 6. Allocate/size bitmap + scanline pointers, then set trace origin (1788-1789)
SetSize(0, 0, 0, 0);
SetTrace(vTrace, False);
```

`SetSize` (not a manual `Bitmap[n].SetSize`) establishes the bitmap and
`BitmapLine[]` scanline pointers; `SetTrace` (2973-2980) seeds `vPixelX`/`vPixelY`
to the correct starting corner for the trace direction.

### 22.2 FFT Configuration

FFT size derives from `vSamples`/`FFTexp` set during step 1-2 above. `FFTexp` is
`Trunc(Log2(...))` of the clamped `SAMPLES` value (line 1744); `FFTmag` is the
0..11 magnitude shift from `MAG` (line 1753). `PrepareFFT` (4170-4183) then
fills `FFTsin`/`FFTcos`/`FFTwin` for `1 shl FFTexp` points. There is no separate
`FFTsize` variable — the size is always `1 shl FFTexp` / `vSamples`.

### 22.3 Runtime State

```
[Acquiring]  → SPECTRO_Update stores samples into SPECTRO_SampleBuff (1818-1830)
     ↓ (SamplePop = vSamples AND RateCycle)
[FFT]        → SPECTRO_Draw copies window, calls PerformFFT (1842-1844)
     ↓
[Rendering]  → per bin: scale/log/HSV-phase → PlotPixel → StepTrace (1846-1856)
     ↓
[Display]    → BitmapToCanvas(0) at last bin, before final StepTrace scroll (1854)
     ↓
Loop back to Acquiring
```

---

## 23. Summary

The **SPECTRO** display window provides powerful time-frequency analysis capabilities for the Propeller 2 debug system. Its waterfall visualization makes it ideal for analyzing signals with time-varying frequency content, from audio analysis to vibration monitoring to communications signals.

**Key Strengths**:
- Real-time FFT processing up to 2048 points
- Flexible scrolling in 8 directions
- Rich color mapping for magnitude and phase
- Efficient data packing (up to 32× compression)
- Logarithmic scaling for wide dynamic range
- Configurable time/frequency resolution trade-off

**Performance**: Capable of sustained 100+ Hz update rates with efficient fixed-point FFT implementation and hardware-accelerated bitmap scrolling.

The SPECTRO display complements the FFT display by adding the critical time dimension, enabling visualization of spectral evolution and pattern recognition tasks that would be impossible with static spectrum analysis alone.
