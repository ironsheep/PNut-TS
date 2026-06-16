# SCOPE_XY Display Window - Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Directive coverage verified**: 2026-06-01 against `DebugDisplayUnit.pas` (v55)
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window config/display/keyboard/mouse reference

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Display Type and Constants](#3-display-type-and-constants)
4. [Data Structures](#4-data-structures)
5. [Configuration and Initialization](#5-configuration-and-initialization)
6. [Coordinate Systems](#6-coordinate-systems)
7. [Display Modes](#7-display-modes)
8. [Sample Processing](#8-sample-processing)
9. [Rendering Pipeline](#9-rendering-pipeline)
10. [Scaling and Transformations](#10-scaling-and-transformations)
11. [User Commands](#11-user-commands)
12. [Performance Characteristics](#12-performance-characteristics)
13. [Comparison with Other Display Types](#13-comparison-with-other-display-types)
14. [Usage Examples](#14-usage-examples)
15. [Implementation Details](#15-implementation-details)
16. [Summary](#16-summary)

---

## 1. Introduction

The **SCOPE_XY** display window is a specialized XY plotter for the Propeller 2 (P2) microcontroller debug environment. Unlike the time-domain SCOPE display, SCOPE_XY plots one signal against another, enabling visualization of:

- **Phase relationships** between signals
- **Lissajous figures** for frequency/phase analysis
- **Trajectory plots** (position, velocity, acceleration)
- **Polar plots** (magnitude and angle)
- **Parametric curves** and **orbital mechanics**
- **Complex number visualization** (real vs. imaginary)

**Key Features**:
- **Dual coordinate systems**: Cartesian (X/Y) and polar (rho/theta)
- **Logarithmic scaling**: Optional log-scale for wide dynamic range
- **Persistent mode**: Accumulating display (vSamples = 0)
- **Fading mode**: Trails with opacity decay (vSamples > 0)
- **Up to 8 independent traces**
- **Circular sample buffer** (2048 sample pairs per trace)
- **Rate limiting** for display update control
- **Anti-aliased dot rendering**

**File Location**: `DebugDisplayUnit.pas`

**Key Methods**:
- `SCOPE_XY_Configure` (lines 1386-1441): Initialization and setup
- `SCOPE_XY_Update` (lines 1443-1509): Sample ingestion and buffering
- `SCOPE_XY_Plot` (lines 1511-1545): Coordinate transformation and plotting

---

## 2. Architecture Overview

### 2.1 System Context

The SCOPE_XY window operates as part of the P2 debug display system:

```
┌─────────────────────────────────────────────────────────────┐
│                    Propeller 2 Hardware                     │
│           (Paired Signal Sampling: X/Y or Rho/Theta)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Serial Transmission
                         │ (Packed Sample Pairs)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      SerialUnit.pas                          │
│            (Background Thread, 16MB RX Buffer)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Element Array Parsing
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       DebugUnit.pas                          │
│                  (Display Management Layer)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ UpdateDisplay Trigger
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   DebugDisplayUnit.pas                       │
│                   SCOPE_XY_Update Method                     │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │ Data Packing │   │ Sample Pair  │   │Display Mode  │   │
│  │   UnPack()   │──>│  Assembly    │──>│ (Persist/Fade)│   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                              │               │
│                                              │ RateCycle     │
│                                              ▼               │
│                     ┌──────────────────────────────┐        │
│                     │   SCOPE_XY_Plot Method       │        │
│                     │ (Coordinate Transformation)  │        │
│                     │   • Cartesian / Polar        │        │
│                     │   • Linear / Log Scale       │        │
│                     │   • Center + Scale           │        │
│                     └──────────────────────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Double-Buffered Display
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Windows VCL Canvas                         │
│                 (XY/Polar Visualization)                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Configuration Flow**:
```
Serial Command → Parse Channels → SCOPE_XY_Configure → Set Scale → Create Window
```

**Persistent Mode Flow** (vSamples = 0):
```
P2 Samples → Pack Data → Serial TX → UnPack → Sample Pair → SCOPE_XY_Plot → Accumulate on Bitmap
```

**Fading Mode Flow** (vSamples > 0):
```
P2 Samples → Pack Data → Serial TX → UnPack → Sample Pair → Circular Buffer → Clear Bitmap → Redraw All with Opacity Decay
```

---

## 3. Display Type and Constants

### 3.1 Display Type Identifier

```pascal
dis_scope_xy = 2;
```

The SCOPE_XY display is the third display type (index 2) in the debug display system.

**Source Location**: Line 24 in DebugDisplayUnit.pas

### 3.2 Buffer Constants

```pascal
Channels         = 8;                    // Maximum traces
XY_Elements      = 2;                    // Two values per sample (X/Y or rho/theta)
XY_SetSize       = Channels * XY_Elements;  // 16 values per set
XY_Sets          = DataSets;             // 2048 sample pairs
XY_PtrMask       = XY_Sets - 1;          // 2047 (for circular buffer)
```

**Purpose**:
- `Channels`: Maximum number of independent XY traces (8)
- `XY_Elements`: Values per sample (2: first and second coordinate)
- `XY_SetSize`: Total values per complete sample set (16)
- `XY_Sets`: Number of sample pairs in circular buffer (2048)
- `XY_PtrMask`: Bit mask for circular buffer wraparound

**Memory Calculation**:
```
XY_SampleBuff: 2048 sets × 16 integers × 4 bytes/int = 131,072 bytes = 128 KB
```
(Each integer is 32-bit regardless of bitmap pixel format.)

**Source Locations**: Lines 171-174 in DebugDisplayUnit.pas

### 3.3 Size Constraints

```pascal
scope_xy_wmin = 32;                      // Minimum size (width = height)
scope_xy_wmax = SmoothFillMax;           // Maximum size (2048)
```

**Note**: SCOPE_XY enforces square display (width = height).

**Source Locations**: Lines 215-216 in DebugDisplayUnit.pas

### 3.4 Default Values

```pascal
// From SCOPE_XY_Configure (lines 1388-1392) — SCOPE_XY-specific overrides only
vRange       := $7FFFFFFF;       // Default range (max 32-bit signed)
vRate        := 1;               // Default rate divisor
vDotSize     := 6;               // Default dot diameter (larger than SCOPE)
vTextSize    := FontSize;        // Default label font size (global FontSize, default 10)
// NOTE: vSamples is NOT reset here; it inherits 256 from SetDefaults (line 2886).
// Effective default: 256-sample fading trail (NOT persistent/0).
```

---

## 4. Data Structures

### 4.1 Sample Buffer

```pascal
XY_SampleBuff: array[0..XY_Sets * XY_SetSize - 1] of integer;
```

**Characteristics**:
- **Size**: 2048 sets × 16 values = 32,768 samples total
- **Element Type**: 32-bit signed integer
- **Access Pattern**: Circular buffer with wraparound
- **Organization**: Interleaved by trace pair
  - `XY_SampleBuff[set * 16 + trace * 2 + 0]` = X or rho
  - `XY_SampleBuff[set * 16 + trace * 2 + 1]` = Y or theta

**Buffer Layout**:
```
Set 0:  [T0_X][T0_Y][T1_X][T1_Y]...[T7_X][T7_Y]
Set 1:  [T0_X][T0_Y][T1_X][T1_Y]...[T7_X][T7_Y]
...
Set 2047: [T0_X][T0_Y][T1_X][T1_Y]...[T7_X][T7_Y]

Where T0-T7 are traces 0-7
```

**Circular Buffer Management**:
```pascal
// Write sample set
Move(samp, XY_SampleBuff[SamplePtr * XY_SetSize], XY_SetSize shl 2);
SamplePtr := (SamplePtr + 1) and XY_PtrMask;

// Read sample pair (k sets back, trace j)
ptr := ((SamplePtr - k - 1) and XY_PtrMask) * XY_SetSize + j * 2;
x := XY_SampleBuff[ptr + 0];
y := XY_SampleBuff[ptr + 1];
```

**Source Location**: Line 362

### 4.2 Configuration Variables

```pascal
vRange          : integer;       // Value range for scaling (1 to $7FFFFFFF)
vScale          : extended;      // Scale factor: vScale = (width/2) / vRange
vPolar          : boolean;       // True = polar coords, False = Cartesian
vLogScale       : boolean;       // True = logarithmic scale, False = linear
vSamples        : integer;       // Fade buffer depth (0 = persistent, >0 = fading)
vTwoPi          : int64;         // Full circle value for polar mode (line 315 — NOT integer)
vTheta          : integer;       // Angular offset for polar mode
vLabel          : array[0..Channels - 1] of string;
vColor          : array[0..Channels - 1] of integer;
```

**vRange**: Defines the coordinate system extent
- Cartesian: -vRange to +vRange on both X and Y axes
- Polar: 0 to vRange for rho (radius)

**vScale**: Calculated scale factor
```pascal
vScale := vWidth / 2 / vRange;
```
- Converts value units to pixel units
- Example: vWidth=512, vRange=100 → vScale=2.56 (each unit = 2.56 pixels)

**vPolar**: Coordinate interpretation mode
- `False`: (X, Y) Cartesian coordinates
- `True`: (rho, theta) polar coordinates

**vLogScale**: Scaling mode
- `False`: Linear scale (default)
- `True`: Logarithmic scale (useful for wide dynamic range)

**vSamples**: Display persistence mode
- `0`: Persistent (accumulating) display
- `>0`: Fading display with opacity decay

**vTwoPi**: Full-circle value (polar) — **`int64`** (source line 315), not `integer`.
- Default `$100000000` = 4,294,967,296 = 2³² (set by `KeyTwoPi` line 2739 and `SetDefaults` line 2909). This value **cannot fit a signed int32** ($7FFFFFFF max), which is precisely why the source declares it `int64`. The `-1` shorthand maps to `-$100000000` (clockwise), also outside int32 range.
- ⚠️ **TS-port note**: A JavaScript `number`-with-32-bit-op (or any int32 receiver) **corrupts** this default — `2³²` truncates/wraps to `0`, and the divisor `(y + vTheta) / vTwoPi` in the polar transform (line 1537) then divides by zero or yields nonsense. The port must hold `vTwoPi` as a `BigInt` or otherwise precision-safe 64-bit-capable path; the transform divide must preserve 53-bit-safe precision.

#### Receiving types & numeric parity (TS-port contract)

These are the Pascal receiver types each SCOPE_XY directive/parameter writes into — the contract a TypeScript port must honor to stay byte-identical:

| Receiver | Source type | Line | TS-port requirement |
|---|---|---|---|
| `vTwoPi` | **int64** | 315 | BigInt / 64-bit-safe; default `$100000000` overflows int32 |
| `opacity` (param of `SCOPE_XY_Plot`) | **byte** | 1511 | 0..255; passed as `255` (persistent) or decayed `opa` (fading) |
| `vScale` | **extended** (float) | 348 | floating-point, not integer scaling |
| `val` | signed-32 **integer** | 358 | the raw element value every `NextNum`/`KeyVal*` reads |
| all other receivers (`vRange`, `vSamples`, `vRate`, `vDotSize`, `vWidth`, `vHeight`, `vTheta`, `vIndex`, `vColor[]`, …) | signed-32 **integer** | — | standard 32-bit signed |

**Numeric parity notes** (divergences a naïve `number`-based port would introduce):

1. **Polar transform is inlined, not shared.** SCOPE_XY computes its own polar conversion in `SCOPE_XY_Plot` — `Tf := Pi / 2 - (y + vTheta) / vTwoPi * Pi * 2;` (line 1537) — and does **not** call the shared `PolarToCartesian` helper used elsewhere. Port the inline form verbatim.
2. **Coordinate outputs use banker's `Round`.** Lines 1522-1523, 1527-1528, 1539-1540 all use Pascal `Round`, which is **round-half-to-even** (banker's rounding) — *not* `Math.round` (round-half-up). A port using `Math.round` will diverge on exact `.5` boundaries.
3. **`val * 2` in SIZE can overflow int32 and wrap negative** (line 1404, *before* the `Within` clamp). In Pascal the multiply wraps within 32 bits, so a large `val` can produce a negative product that the clamp then pins to the floor (32). A TS `number` does **not** wrap — it would carry the full magnitude into the clamp and pin to the ceiling (2048) instead. Documented divergence; match Pascal's wrap-then-clamp to stay identical.
4. **Asymmetric log widening.** Cartesian-log uses `Log2(Int64(vRange) + 1)` (line 1519 — deliberate int64 widen so `vRange = $7FFFFFFF` plus 1 does not overflow), while polar-log uses `Log2(vRange)` (line 1534 — no widen, no `+1`). Preserve the asymmetry exactly; do not "normalize" the two.
5. **`div` truncates toward zero** (e.g. `k * 255 div vSamples`, line 1499) — match with truncation, not floor, for negative results.
6. **`UnPack` uses a *logical* shift-right** (`v := v shr vPackShift`, line 1891 in §19.1) for field extraction, then performs **signed sign-extension** only when `vPackSignx` is set (the `SIGNED` packing flag). A port must use an unsigned `>>>` for the field shift and apply sign-extension separately.

### 4.3 Display State Variables

```pascal
vWidth          : integer;       // Display width (= height for square display)
vHeight         : integer;       // Display height (= width)
vBitmapWidth    : integer;       // Bitmap width (same as vWidth)
vBitmapHeight   : integer;       // Bitmap height (same as vHeight)
vRate           : integer;       // Rate divisor
vRateCount      : integer;       // Current rate counter
vDotSize        : integer;       // Dot diameter in pixels
vIndex          : integer;       // Number of active traces
```

---

## 4a. Directive Reference (v55-verified)

> Cross-referenced from §5.3 and §4 of [DEBUG-WINDOW-DIRECTIVE-MATRIX.md](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md).
> All line references are to `DebugDisplayUnit.pas` (v55).

### Configuration directives

Accepted during `SCOPE_XY_Configure` (lines 1386–1441).

| Directive | Syntax | Default | Clamped range | Pascal lines | Notes |
|---|---|---|---|---|---|
| `TITLE` | `TITLE 'str'` | *(unverified — see note)* | — | `1398-1399` | Window caption |
| `POS` | `POS left top` | Cascaded | Screen coords | `1400-1401` | |
| `SIZE` | `SIZE val` | `vWidth = 256` (from `SetDefaults` 2884) | stored width = `Within(val*2, 32, 2048)` | `1402-1406` | **One value only (square).** `vWidth = Within(val*2, 32, 2048); vHeight = vWidth`. The clamp pins the **doubled** value to 32..2048 px; there is no 16..1024 clamp on `val` itself. |
| `RANGE` | `RANGE n` | `$7FFFFFFF` | 1..`$7FFFFFFF` | `1407-1408` | Coordinate extent; both axes |
| `SAMPLES` | `SAMPLES n` | `256` (from `SetDefaults` line 2886) | 0..2048 | `1409-1410` | `0` = persistent (no buffer); `>0` = fading trail depth; SCOPE_XY_Configure does NOT reset this |
| `RATE` | `RATE n` | `1` | 1..2048 | `1411-1412` | Display update divisor |
| `DOTSIZE` | `DOTSIZE n` | `6` | 2..20 | `1413-1414` | Dot diameter in pixels |
| `TEXTSIZE` | `TEXTSIZE n` | `FontSize` (default 10) | 6..200 | `1415-1416` | Label font size |
| `COLOR` | `COLOR back grid` | Black / Gray | RGB24 | `1417-1419` | Background then grid color |
| `POLAR` | `POLAR {twopi {theta}}` | Off | — | `1420-1421` | Enables polar (rho, theta) mode; see §6.2 |
| `LOGSCALE` | `LOGSCALE` | Off (linear) | — | `1422-1423` | Logarithmic scale on both axes |
| `HIDEXY` | `HIDEXY` | Off | — | `1424-1425` | Suppresses on-screen measurement cursor; does **not** block `PC_MOUSE` |
| Packing | `LONGS_1BIT`…`BYTES_4BIT` | `LONGS_1BIT` | 12 modes | `1426-1427` | Sub-sample packing density |
| *label string* | `'label' {color}` | — | up to 8 traces | `1429-1434` | One string per trace; optional RGB24 color follows. **9th+ label saturates:** `if vIndex <> Channels then Inc(vIndex)` (line 1431) caps `vIndex` at 8, so any label beyond the 8th **overwrites slot 8** (`vLabel[7]`/`vColor[7]`) rather than extending the array. |

**SIZE specifics**: `SIZE` takes **one** numeric value (the half-width / radius). The stored width is `Within(val * 2, 32, 2048)` — the **doubled** value is clamped to 32..2048 px; there is **no** clamp on `val` to 16..1024. Height mirrors width (`vHeight := vWidth`), enforcing a square display. The default `vWidth` is `256`, set by `SetDefaults` (line 2884) — it is **not** set in `SCOPE_XY_Configure`. So `256` is the default *width*; `512` only results from an explicit `SIZE 256` (`val*2 = 512`). Pascal: `vWidth := Within(val * 2, scope_xy_wmin, scope_xy_wmax); vHeight := vWidth` (lines 1404–1405; `scope_xy_wmin = 32`, `scope_xy_wmax = SmoothFillMax = 2048`). Note: a bare `SIZE` with no following number hits `else Continue` (line 1404), skipping the `vHeight := vWidth` mirror entirely — both dimensions keep their prior values.

**POLAR specifics**: Calling `POLAR` invokes `KeyTwoPi` which sets `vPolar := True`, `vTwoPi := $100000000` (2³²), `vTheta := 0`. An optional first numeric argument overrides `vTwoPi` (pass `0` or `-1` for ±2³² default; any other value sets degrees/custom units). An optional second argument sets `vTheta` (angular offset). Examples:
```
POLAR              → vTwoPi=$100000000, vTheta=0
POLAR 360          → vTwoPi=360 (degrees), vTheta=0
POLAR 360 90       → vTwoPi=360, vTheta=90
POLAR -1           → vTwoPi=-$100000000 (clockwise)
```

**SAMPLES 0 = persistent display**: Points are never cleared; they accumulate on the bitmap until a `CLEAR` command. No circular buffer is used in persistent mode.

### Display / data directives

Accepted during `SCOPE_XY_Update` (lines 1443–1509).

| Directive | Pascal lines | Notes |
|---|---|---|
| *numeric data stream* | 1469–1507 | Packed XY (or rho/theta) pairs; one pair per active trace per sample set |
| `CLEAR` | 1454–1460 | Clears bitmap, resets `SamplePop` and `vRateCount` |
| `SAVE {filename}` | 1461–1462 | Saves current bitmap to `.bmp` |
| `PC_KEY` | 1463–1464 | Returns latched key byte to P2 (`SendKeyPress`, 3579–3583) |
| `PC_MOUSE` | 1465–1466 | Returns cursor position + buttons + color to P2 (`SendMousePos`, 3537–3577) |

*Strings in the update phase break the sample loop (`NextStr` → `Break`, line 1451).*

### Keyboard & mouse

All input handling is **shared across all nine display windows** — SCOPE_XY has no unique keyboard logic.

| Handler | Lines | Behavior |
|---|---|---|
| `WMGetDlgCode` | 585–589 | Captures Tab key (sets `DLGC_WANTTAB`) |
| `FormKeyPress` | 825–831 | Latches pressed key byte into `vKeyPress` for **100 ms**, then auto-clears |
| `FormKeyDown` | 833–851 | Maps non-printable keys: Left=1, Right=2, Up=3, Down=4, Home=5, End=6, Delete=7, Insert=10, PageUp=11, PageDown=12 |
| `FormMouseMove` | 647–809 | Draws live measurement cursor with data-coordinate readout (suppressed by `HIDEXY`, line 737) |
| `FormMouseWheel` | 811–817 | Latches wheel direction (+1/−1) into `vMouseWheel` for **100 ms**, then auto-clears |
| `SendKeyPress` | 3579–3583 | Transmits 1 LONG = `vKeyPress` byte (0 if none), then clears it |
| `SendMousePos` | 3537–3577 | Transmits 2 LONGs: position+buttons+wheel, then pixel color |

**SCOPE_XY cursor coordinate mapping** — ⚠️ the scaled/polar transform below is the
**on-screen readout** (`FormMouseMove` lines 676–718) only. `SendMousePos` (3537–3577)
has **no `dis_scope_xy` branch**, so `PC_MOUSE` transmits the **raw client-pixel** `x,y`
to the P2 — *not* the scaled data value or polar `(rho,theta)` shown on screen.

On-screen readout (`FormMouseMove`):
- **Cartesian mode** (linear): cursor pixel offset from center is divided by `vScale` to recover data units → reported as `x,y`.
  - A centering bias (`Round(vWidth / vRange / 4)`) is applied to center multi-pixel spans (line 691–695).
- **Cartesian mode** (log scale): inverse log transform applied to pixel radius before reporting.
- **Polar mode**: pixel offset from center converted to `(rho, theta)` → reported as `rho,theta*` (trailing `*` indicates polar). Theta is displayed as hex (`$XXXXXXXX*`) when `vTwoPi` is `±$100000000`.
- Off-window: `SendMousePos` returns sentinel `($03FFFFFF, $FFFFFFFF)` (this part *is* shared by both paths).
- `HIDEXY` suppresses the on-screen readout but does **not** prevent `PC_MOUSE` from reporting to the P2.

---

## 5. Configuration and Initialization

### 5.1 SCOPE_XY_Configure Method

```pascal
procedure TDebugDisplayForm.SCOPE_XY_Configure;
begin
  // Set unique defaults
  vRange := $7FFFFFFF;
  vRate := 1;
  vDotSize := 6;
  vTextSize := FontSize;

  // Process any parameters
  while not NextEnd do
  begin
    if NextKey then
    case val of
      key_title:       KeyTitle;
      key_pos:         KeyPos;
      key_size:
      begin
        if NextNum then vWidth := Within(val * 2, scope_xy_wmin, scope_xy_wmax) else Continue;
        vHeight := vWidth;
      end;
      key_range:       KeyValWithin(vRange, 1, $7FFFFFFF);
      key_samples:     KeyValWithin(vSamples, 0, XY_Sets);
      key_rate:        KeyValWithin(vRate, 1, XY_Sets);
      key_dotsize:     KeyValWithin(vDotSize, 2, 20);
      key_textsize:    KeyTextSize;
      key_color:       if KeyColor(vBackColor) then KeyColor(vGridColor);
      key_polar:       KeyTwoPi;
      key_logscale:    vLogScale := True;
      key_hidexy:      vHideXY := True;
      key_longs_1bit..key_bytes_4bit:  KeyPack;
    end
    else if NextStr then
    begin
      if vIndex <> Channels then Inc(vIndex);
      vLabel[vIndex - 1] := PChar(val);
      KeyColor(vColor[vIndex - 1]);
    end;
  end;

  // Set scale factor
  vScale := vWidth / 2 / vRange;

  // Set form metrics
  SetTextMetrics;
  SetSize(ChrHeight * 2, ChrHeight * 2, ChrHeight * 2, ChrHeight * 2);
end;
```

**Source Location**: Lines 1386-1441

### 5.2 Configuration Parameters

| Parameter | Command | Default | Range | Purpose |
|-----------|---------|---------|-------|---------|
| Title | `TITLE 'string'` | *(unverified)* | - | Window title — see §5.2 note below |
| Position | `POS x y` | Cascaded | Screen coords | Window position |
| Size | `SIZE radius` | `vWidth = 256` (SetDefaults) | stored width `Within(val*2, 32, 2048)` | Width = height = `Within(radius × 2, 32, 2048)`; no 16..1024 clamp on radius |
| Range | `RANGE value` | $7FFFFFFF | 1-$7FFFFFFF | Coordinate system extent |
| Samples | `SAMPLES count` | 256 (from `SetDefaults`) | 0-2048 | Fade buffer depth (0=persistent, >0=fading); SCOPE_XY_Configure does not reset this |
| Rate | `RATE divisor` | 1 | 1-2048 | Display update rate divisor |
| Dot Size | `DOTSIZE pixels` | 6 | 2-20 | Dot diameter |
| Text Size | `TEXTSIZE size` | 10 (`FontSize`) | 6-200 | Label font size |
| Colors | `COLOR back grid` | Black/Gray | RGB24 | Background and grid colors |
| Polar | `POLAR {twopi {theta}}` | - | - | Enable polar coordinates |
| Log Scale | `LOGSCALE` | Linear | - | Enable logarithmic scaling |
| Hide XY | `HIDEXY` | Show | - | Hide mouse coordinates |
| Packing | `LONGS_1BIT` etc. | LONGS_1BIT | 12 modes | Data packing format |

> **TITLE default provenance** — ⚠️ *unverified against earlier drafts.* `SCOPE_XY_Configure` does **not** set a title. The window caption is established at **form-create** time (line 626): `SetCaption(PChar(P2.DebugDisplayValue[1]) + ' - ' + TypeName[DisplayType])`, and `TypeName[dis_scope_xy] = 'SCOPE_XY'` (uppercase, line 132). With no `TITLE` directive the supplied caption string is empty, yielding a default caption of `' - SCOPE_XY'`. The literal **`"Scope_XY"`** (mixed-case) appearing in earlier drafts is **not** found in `SCOPE_XY_Configure` and does not match the uppercase `TypeName` constant — treat it as unverified; the verified default derives from `TypeName` at form-create, not from Configure.

### 5.3 Size Parameter Special Handling

**Code** (lines 1403-1406):
```pascal
key_size:
begin
  if NextNum then vWidth := Within(val * 2, scope_xy_wmin, scope_xy_wmax) else Continue;
  vHeight := vWidth;
end;
```

**Behavior**:
- User specifies **radius** (half of display size)
- System calculates **width = height = radius × 2**
- Enforces square display

**Example**:
```
SIZE 256  →  vWidth = 512, vHeight = 512 (512×512 display)
```

### 5.4 Scale Factor Calculation

**Code** (line 1437):
```pascal
vScale := vWidth / 2 / vRange;
```

**Formula**:
```
vScale = (width / 2) / range = radius / range
```

**Purpose**: Convert value units to pixel units.

**Examples**:
```
vWidth = 512, vRange = 100:
  vScale = 256 / 100 = 2.56 pixels per unit

vWidth = 512, vRange = 1000:
  vScale = 256 / 1000 = 0.256 pixels per unit
```

---

## 6. Coordinate Systems

The SCOPE_XY window supports two coordinate systems: **Cartesian** and **Polar**.

### 6.1 Cartesian Coordinates

**Default Mode**: Cartesian (X, Y) coordinates.

**Input**:
- First value: X coordinate (-vRange to +vRange)
- Second value: Y coordinate (-vRange to +vRange)

**Origin**: Center of display

**Axes**:
- X-axis: Horizontal (left = -vRange, right = +vRange)
- Y-axis: Vertical (bottom = -vRange, top = +vRange)

**Transformation** (SCOPE_XY_Plot, lines 1515-1529):
```pascal
if not vPolar then
begin
  if vLogScale then
  begin
    Rf := (Log2(Hypot(x, y) + 1) / Log2(Int64(vRange) + 1)) * (vWidth div 2);
    Tf := ArcTan2(x, y);
    SinCos(Tf, Xf, Yf);
    X := Round(Rf * Xf * $100);
    Y := Round(Rf * Yf * $100);
  end
  else
  begin
    X := Round(x * vScale * $100);
    Y := Round(y * vScale * $100);
  end;
end
```

**Linear Scale** (default):
```pascal
X := Round(x * vScale * $100);
Y := Round(y * vScale * $100);
```

**Log Scale**:
```pascal
Rf := (Log2(Hypot(x, y) + 1) / Log2(vRange + 1)) * (width / 2);
Tf := ArcTan2(x, y);
X := Round(Rf * cos(Tf) * $100);
Y := Round(Rf * sin(Tf) * $100);
```

- Converts (x, y) to polar
- Applies log scale to radius
- Converts back to Cartesian for plotting

### 6.2 Polar Coordinates

**Activation**: `POLAR {twopi {theta}}`

**Input**:
- First value: rho (radius, 0 to vRange)
- Second value: theta (angle in vTwoPi units)

**Configuration** (KeyTwoPi, lines 2728-2742):
```pascal
vPolar := True;
vTwoPi := $100000000;         // Default full circle value (2^32)
vTheta := 0;                  // Default angular offset
if NextNum then
begin
  case val of
    -1: vTwoPi := -$100000000;
     0: vTwoPi := $100000000;
   else vTwoPi := val;
  end;
  KeyVal(vTheta);
end;
```

**Transformation** (SCOPE_XY_Plot, lines 1531-1541):
```pascal
else
begin
  if vLogScale then
    if x <> 0 then Rf := (Log2(x) / Log2(vRange)) * (vWidth div 2) else Rf := 0
  else
    Rf := x * vScale;
  Tf := Pi / 2 - (y + vTheta) / vTwoPi * Pi * 2;
  SinCos(Tf, Xf, Yf);
  x := Round(Rf * Xf * $100);
  y := Round(Rf * Yf * $100);
end;
```

**Linear Scale**:
```pascal
Rf := rho * vScale;
Tf := Pi / 2 - (theta + vTheta) / vTwoPi * Pi * 2;
x := Round(Rf * cos(Tf) * $100);
y := Round(Rf * sin(Tf) * $100);
```

**Log Scale**:
```pascal
Rf := (Log2(rho) / Log2(vRange)) * (width / 2);
Tf := Pi / 2 - (theta + vTheta) / vTwoPi * Pi * 2;
x := Round(Rf * cos(Tf) * $100);
y := Round(Rf * sin(Tf) * $100);
```

**Angle Conversion**:
```
theta_radians = π/2 - (theta + vTheta) / vTwoPi × 2π
```

- `vTheta`: Angular offset (rotation)
- `vTwoPi`: Full circle value
- `π/2 -`: Converts from mathematical angle (0° = right) to display angle (0° = up)

### 6.3 Logarithmic Scaling

**Purpose**: Visualize wide dynamic range (e.g., 1 to 1,000,000).

**Cartesian Log Scale**:
```
radius = log2(sqrt(x² + y²) + 1) / log2(range + 1) × (width / 2)
angle = atan2(x, y)
plot_x = radius × cos(angle)
plot_y = radius × sin(angle)
```

**Effect**: Values near origin are spread out, distant values compressed.

**Polar Log Scale**:
```
radius = log2(rho) / log2(range) × (width / 2)
plot_x = radius × cos(theta)
plot_y = radius × sin(theta)
```

**Effect**: Exponential radius → linear display.

### 6.4 Final Position Calculation

**Code** (lines 1542-1544):
```pascal
x := vBitmapWidth shl 7 + x;
y := vBitmapHeight shl 7 - y;
SmoothDot(x, y, vDotSize shl 6, color, opacity);
```

**Translation to Screen Coordinates**:
```
screen_x = (bitmap_width / 2) × 256 + x
screen_y = (bitmap_height / 2) × 256 - y
```

- Centers coordinate system at display center
- Y-axis inverted (positive Y = up)
- Fixed-point format (8.8, shift by 7 = multiply by 128, then shift by 1 for centering)

---

## 7. Display Modes

SCOPE_XY supports two display modes: **Persistent** and **Fading**.

### 7.1 Persistent Mode

**Activation**: `SAMPLES 0` (explicit — *not* the default; the default is 256 → fading, per SetDefaults line 2886)

**Behavior**:
- Points accumulate on display
- No clearing between updates
- Display persists until CLEAR command

**Code** (SCOPE_XY_Update, lines 1480-1484):
```pascal
if vSamples = 0 then
begin
  // Persistent display
  for j := vIndex - 1 downto 0 do
    SCOPE_XY_Plot(samp[j shl 1 + 0], samp[j shl 1 + 1], vColor[j], 255);
  if RateCycle then BitmapToCanvas(0);
end
```

**Processing**:
1. Plot each trace pair directly to bitmap
2. No buffering (points not stored)
3. Display updates on rate cycle

**Use Cases**:
- Lissajous figures
- Phase diagrams
- Trajectory plots with full history
- Long-term accumulation

### 7.2 Fading Mode

**Activation**: `SAMPLES count` (count > 0)

**Behavior**:
- Stores last `count` sample pairs in circular buffer
- Clears display on each update
- Redraws all buffered points with opacity decay
- Older points fade toward transparent

**Code** (SCOPE_XY_Update, lines 1486-1504):
```pascal
else
begin
  // Fading display
  Move(samp, XY_SampleBuff[SamplePtr * XY_SetSize], XY_SetSize shl 2);
  SamplePtr := (SamplePtr + 1) and XY_PtrMask;
  if SamplePop < vSamples then Inc(SamplePop);
  if RateCycle then
  begin
    ClearBitmap;
    for j := vIndex - 1 downto 0 do
      for k := SamplePop - 1 downto 0 do
      begin
        ptr := ((SamplePtr - k - 1) and XY_PtrMask) * XY_SetSize + j * 2;
        opa := 255 - (k * 255 div vSamples);
        SCOPE_XY_Plot(XY_SampleBuff[ptr + 0], XY_SampleBuff[ptr + 1], vColor[j], opa);
      end;
    BitmapToCanvas(0);
  end;
end;
```

**Opacity Calculation**:
```pascal
opa := 255 - (k * 255 div vSamples);
```

**Formula**:
```
opacity = 255 - (age / max_age) × 255
```

**Examples**:
```
vSamples = 100

k = 0 (newest):   opa = 255 - (0 × 255 / 100) = 255 (fully opaque)
k = 50 (middle):  opa = 255 - (50 × 255 / 100) = 127 (half opaque)
k = 99 (oldest):  opa = 255 - (99 × 255 / 100) = 2 (nearly transparent)
```

**Use Cases**:
- Animated trajectories with trails
- Dynamic system visualization
- Recent-history emphasis

---

## 8. Sample Processing

### 8.1 SCOPE_XY_Update Method Overview

```pascal
procedure TDebugDisplayForm.SCOPE_XY_Update;
var
  i, j, k, v, ch, ptr, opa: integer;
  samp: array[0..XY_SetSize - 1] of integer;
begin
  ch := 0;
  while not NextEnd do
  begin
    // String element: trace labels
    if NextStr then Break;
    // Key element: control commands
    else if NextKey then ...
    // Numeric elements: sample data
    else while NextNum do ...
  end;
end;
```

**Source Location**: Lines 1443-1509

### 8.2 Sample Pair Assembly

**Processing Loop** (lines 1469-1506):
```pascal
while NextNum do
begin
  // Get sample value(s)
  v := NewPack;
  for i := 1 to vPackCount do
  begin
    samp[ch] := UnPack(v);
    Inc(ch);
    if ch = vIndex shl 1 then    // All pairs received?
    begin
      ch := 0;
      if vSamples = 0 then
      begin
        // Persistent mode processing
      end
      else
      begin
        // Fading mode processing
      end;
    end;
  end;
end;
```

**Sample Pair Assembly**:
1. Read packed value: `v = NewPack()`
2. Unpack samples: `samp[ch] = UnPack(v)`
3. Increment value counter
4. When all pairs received (`ch = vIndex × 2`):
   - Process based on display mode
   - Reset counter for next set

**Example** (2 traces, LONGS_16BIT):
```
Each long contains 2 values (16 bits each)

Packed value 1: Trace 0 X, Trace 0 Y
Packed value 2: Trace 1 X, Trace 1 Y

ch sequence: 0 → 1 → 2 → 3 → reset to 0
When ch = 4 (vIndex × 2), complete set received
```

### 8.3 Control Commands

**CLEAR Command** (lines 1454-1460):
```pascal
key_clear:
begin
  ClearBitmap;
  BitmapToCanvas(0);
  SamplePop := 0;
  vRateCount := 0;
end;
```

**Purpose**: Reset display and buffer.

**SAVE, PC_KEY, PC_MOUSE**: Same as other display types.

---

## 9. Rendering Pipeline

### 9.1 SCOPE_XY_Plot Method

```pascal
procedure TDebugDisplayForm.SCOPE_XY_Plot(x, y, color: integer; opacity: byte);
var
  Rf, Tf, Xf, Yf: extended;
begin
  if not vPolar then
  begin
    if vLogScale then
    begin
      Rf := (Log2(Hypot(x, y) + 1) / Log2(Int64(vRange) + 1)) * (vWidth div 2);
      Tf := ArcTan2(x, y);
      SinCos(Tf, Xf, Yf);
      X := Round(Rf * Xf * $100);
      Y := Round(Rf * Yf * $100);
    end
    else
    begin
      X := Round(x * vScale * $100);
      Y := Round(y * vScale * $100);
    end;
  end
  else
  begin
    if vLogScale then
      if x <> 0 then Rf := (Log2(x) / Log2(vRange)) * (vWidth div 2) else Rf := 0
    else
      Rf := x * vScale;
    Tf := Pi / 2 - (y + vTheta) / vTwoPi * Pi * 2;
    SinCos(Tf, Xf, Yf);
    x := Round(Rf * Xf * $100);
    y := Round(Rf * Yf * $100);
  end;
  x := vBitmapWidth shl 7 + x;
  y := vBitmapHeight shl 7 - y;
  SmoothDot(x, y, vDotSize shl 6, color, opacity);
end;
```

**Source Location**: Lines 1511-1545

### 9.2 Rendering Flow

**Path 1: Cartesian Linear** (default):
```
(x, y) → Scale → Fixed-Point → Center → SmoothDot
```

**Path 2: Cartesian Log**:
```
(x, y) → Hypot → Log → Polar → Scale → Cartesian → Fixed-Point → Center → SmoothDot
```

**Path 3: Polar Linear**:
```
(rho, theta) → Scale Rho → Convert Theta → Polar to Cartesian → Fixed-Point → Center → SmoothDot
```

**Path 4: Polar Log**:
```
(rho, theta) → Log Rho → Convert Theta → Polar to Cartesian → Fixed-Point → Center → SmoothDot
```

### 9.3 SmoothDot Rendering

**Call** (line 1544):
```pascal
SmoothDot(x, y, vDotSize shl 6, color, opacity);
```

**Parameters**:
- `x, y`: Fixed-point coordinates (8.8 format)
- `vDotSize shl 6`: Radius in fixed-point (6-bit shift = multiply by 64)
- `color`: RGB24 color
- `opacity`: Alpha value (0-255)

**Rendering**: Anti-aliased circular dot with gamma-corrected alpha blending.

---

## 10. Scaling and Transformations

### 10.1 Cartesian Linear Transformation

**Input Range**: -vRange to +vRange (both X and Y)

**Transformation**:
```pascal
X_pixels := x_value × vScale × 256
Y_pixels := y_value × vScale × 256
```

**Example**:
```
vRange = 100, vScale = 2.56 (for 512×512 display)

x_value = -100:  X_pixels = -100 × 2.56 × 256 = -65,536
x_value = 0:     X_pixels = 0
x_value = +100:  X_pixels = +100 × 2.56 × 256 = +65,536

After centering (vBitmapWidth shl 7 = 32,768):
  -100 → -32,768 (left edge)
  0    → 0 (center)
  +100 → +32,768 (right edge)
```

### 10.2 Cartesian Log Transformation

**Purpose**: Spread out values near origin, compress distant values.

**Algorithm**:
```pascal
radius := sqrt(x² + y²)
log_radius := log2(radius + 1) / log2(range + 1) × (width / 2)
angle := atan2(x, y)
X_pixels := log_radius × cos(angle) × 256
Y_pixels := log_radius × sin(angle) × 256
```

**Example**:
```
vRange = 1000, vWidth = 512

Linear mapping:
  r = 1:    pixels = 1 / 1000 × 256 = 0.26
  r = 10:   pixels = 10 / 1000 × 256 = 2.56
  r = 100:  pixels = 100 / 1000 × 256 = 25.6
  r = 1000: pixels = 1000 / 1000 × 256 = 256

Log mapping:
  r = 1:    log_r = log2(2) / log2(1001) × 256 ≈ 25.6
  r = 10:   log_r = log2(11) / log2(1001) × 256 ≈ 87.6
  r = 100:  log_r = log2(101) / log2(1001) × 256 ≈ 168.3
  r = 1000: log_r = log2(1001) / log2(1001) × 256 = 256
```

### 10.3 Polar Linear Transformation

**Input**:
- rho: 0 to vRange
- theta: 0 to vTwoPi (full circle)

**Transformation**:
```pascal
radius := rho × vScale
angle := π/2 - (theta + vTheta) / vTwoPi × 2π
X_pixels := radius × cos(angle) × 256
Y_pixels := radius × sin(angle) × 256
```

**Angle Conversion**:
```
theta_radians = π/2 - (theta + vTheta) / vTwoPi × 2π
```

- `π/2 -`: Rotate 90° (0° = up instead of right)
- `vTheta`: Additional angular offset
- `/ vTwoPi × 2π`: Normalize to radians

**Example** (vTwoPi = 360, vTheta = 0):
```
theta = 0:   angle = π/2 - 0 = π/2 = 90° (up)
theta = 90:  angle = π/2 - π/2 = 0 (right)
theta = 180: angle = π/2 - π = -π/2 = 270° (down)
theta = 270: angle = π/2 - 3π/2 = -π = 180° (left)
```

### 10.4 Polar Log Transformation

**Purpose**: Exponential radius → linear display.

**Transformation**:
```pascal
log_radius := log2(rho) / log2(range) × (width / 2)
angle := π/2 - (theta + vTheta) / vTwoPi × 2π
X_pixels := log_radius × cos(angle) × 256
Y_pixels := log_radius × sin(angle) × 256
```

**Use Case**: Spirals, exponential growth, frequency domain.

---

## 11. User Commands

### 11.1 Configuration Commands

| Command | Parameters | Purpose |
|---------|------------|---------|
| `TITLE` | 'string' | Set window title |
| `POS` | x y | Set window position |
| `SIZE` | radius | Set display size: width = height = `Within(radius × 2, 32, 2048)` px (default width 256 from SetDefaults) |
| `RANGE` | value | Set coordinate system extent (1-$7FFFFFFF) |
| `SAMPLES` | count | Set fade buffer depth (0=persistent, >0=fading) |
| `RATE` | divisor | Set display update rate (1-2048) |
| `DOTSIZE` | pixels | Set dot diameter (2-20) |
| `TEXTSIZE` | size | Set label font size (6-200) |
| `COLOR` | back grid | Set background and grid colors |
| `POLAR` | {twopi {theta}} | Enable polar coordinates |
| `LOGSCALE` | - | Enable logarithmic scaling |
| `HIDEXY` | - | Hide mouse coordinates |
| Packing modes | - | Set data packing format (12 modes) |

### 11.2 Runtime Commands

| Command | Parameters | Purpose |
|---------|------------|---------|
| `CLEAR` | - | Clear display and reset buffer |
| `SAVE` | {filename} | Save display to BMP file |
| `PC_KEY` | - | Request keyboard state |
| `PC_MOUSE` | - | Request mouse position/color |

### 11.3 Trace Configuration Format

**String Element**:
```
'label' {color}
```

**Parameters**:
- `label`: Trace name
- `color`: Trace color (RGB24, default: cycle through DefaultScopeColors)

---

## 12. Performance Characteristics

### 12.1 Memory Usage

**Sample Buffer** (fading mode only):
```
XY_SampleBuff: 2048 pairs × 8 traces × 2 values × 4 bytes = 128 KB
```

**Persistent mode**: No buffer (0 bytes)

**Display Bitmaps** (pf24bit = 3 bytes/pixel):
```
Typical: 512×512 × 3 bytes × 2 = 1.5 MB
```

**Total**:
- Persistent mode: ~1.5 MB
- Fading mode: ~1.63 MB (+ 128 KB sample buffer)

### 12.2 Rendering Performance

**Persistent Mode**:
```
Cost per update: Traces × SmoothDot
Example: 4 traces = 4 SmoothDot calls (very fast)
```

**Fading Mode**:
```
Cost per update: Traces × Samples × SmoothDot
Example: 4 traces × 100 samples = 400 SmoothDot calls (moderate)
```

**SmoothDot Cost**: Anti-aliased rendering with per-pixel alpha blending (expensive but high quality).

### 12.3 Optimization Strategies

1. **Persistent Mode**: Use for minimal CPU usage
2. **Reduce vSamples**: Lower fade buffer depth
3. **Reduce vDotSize**: Smaller dots render faster
4. **Rate Limiting**: Use RATE parameter to slow updates
5. **Fewer Traces**: Monitor 1-2 traces instead of 8

---

## 13. Comparison with Other Display Types

### 13.1 SCOPE_XY vs. SCOPE

**SCOPE_XY Advantages**:
- XY/polar plotting (phase relationships)
- Lissajous figures
- Trajectory visualization
- Persistent/fading modes

**SCOPE Advantages**:
- Time-domain display
- Multiple independent channels
- Auto-ranging
- Triggering support

**Use Cases**:
- **SCOPE**: Signal vs. time
- **SCOPE_XY**: Signal vs. signal, phase plots

### 13.2 SCOPE_XY vs. PLOT

**SCOPE_XY Advantages**:
- Optimized for XY data pairs
- Fading mode with opacity decay
- Polar/log scale transformations
- Simpler configuration

**PLOT Advantages**:
- Vector drawing primitives (lines, shapes)
- Text rendering with rotation
- Layer compositing
- Sprite system

**Use Cases**:
- **SCOPE_XY**: XY data plotting
- **PLOT**: Custom graphics and diagrams

---

## 14. Usage Examples

### 14.1 Lissajous Figure (Persistent)

**Configuration**:
```
SCOPE_XY SIZE 256 RANGE 100 'XY'
```

**P2 Code**:
```spin2
t := 0
repeat
  x := sin(t) * 100
  y := sin(t * 2) * 100
  debug(`scope_xy `x `y)
  t := (t + 1) // 360
```

**Result**: Classic Lissajous figure (2:1 frequency ratio).

### 14.2 Trajectory with Fading Trail

**Configuration**:
```
SCOPE_XY SIZE 256 RANGE 100 SAMPLES 50 'Position'
```

**P2 Code**:
```spin2
x := 0
y := 0
vx := 5
vy := 3
repeat
  x := (x + vx) // 200 - 100
  y := (y + vy) // 200 - 100
  debug(`scope_xy `x `y)
```

**Result**: Moving point with 50-sample fading trail.

### 14.3 Polar Plot (Spiral)

**Configuration**:
```
SCOPE_XY SIZE 256 RANGE 100 POLAR 360
```

**P2 Code**:
```spin2
repeat angle from 0 to 360
  rho := angle / 2
  debug(`scope_xy `rho `angle)
```

**Result**: Archimedean spiral (rho = k × theta).

### 14.4 Log Scale (Wide Dynamic Range)

**Configuration**:
```
SCOPE_XY SIZE 256 RANGE 1000 LOGSCALE 'Log'
```

**P2 Code**:
```spin2
repeat i from 1 to 1000
  x := i
  y := i
  debug(`scope_xy `x `y)
```

**Result**: Diagonal line with log scale (spreads out low values).

### 14.5 Multi-Trace Phase Diagram

**Configuration**:
```
SCOPE_XY SIZE 256 RANGE 100 SAMPLES 100
      'Trace1' $FF0000
      'Trace2' $00FF00
```

**P2 Code**:
```spin2
repeat t from 0 to 360
  x1 := sin(t) * 100
  y1 := cos(t) * 100
  x2 := sin(t * 2) * 50
  y2 := cos(t * 2) * 50
  debug(`scope_xy `x1 `y1 `x2 `y2)
```

**Result**: Two traces with different frequencies, fading trails.

---

## 15. Implementation Details

### 15.1 Fixed-Point Coordinate System

**8.8 Format**: Coordinates left-shifted by 8 for sub-pixel precision.

**Additional Shift** (line 1542-1543):
```pascal
x := vBitmapWidth shl 7 + x;
y := vBitmapHeight shl 7 - y;
```

**Breakdown**:
- `vBitmapWidth shl 7`: (width / 2) × 128 = center in 7.8 fixed-point
- `+ x`: Add transformed x (already in 8.8 fixed-point)
- Result: 8.8 fixed-point screen coordinate

### 15.2 Trigonometric Functions

**SinCos** (Pascal runtime function):
```pascal
SinCos(angle, sine, cosine);
```

Computes sine and cosine simultaneously (more efficient than separate calls).

**ArcTan2** (Pascal runtime function):
```pascal
angle := ArcTan2(y, x);
```

Computes angle from (x, y) with correct quadrant.

### 15.3 Logarithmic Functions

**Log2** (Pascal runtime function):
```pascal
log_value := Log2(value);
```

Base-2 logarithm.

**Hypot** (Pascal runtime function):
```pascal
distance := Hypot(x, y);
```

Computes sqrt(x² + y²) with overflow protection.

---

## 16. Element Array Protocol Specification

### 16.1 Protocol Overview

The SCOPE_XY display receives configuration and sample data through an **element array protocol** that uses parallel arrays of types and values. This protocol enables flexible data transmission while maintaining ASCII compatibility.

**Element Storage** (GlobalUnit.pas:126-127):
```pascal
DebugDisplayType:  array[0..DebugDisplayLimit - 1] of byte;     // element type tag
DebugDisplayValue: array[0..DebugDisplayLimit - 1] of integer;  // element value
```

**Capacity**: 1100 elements per message (DebugDisplayLimit = 1100)

### 16.2 Element Types

**Type Constants** (DebugDisplayUnit.pas:15-20):
```pascal
ele_end = 0;   // End of element array
ele_key = 3;   // Configuration keyword/command
ele_num = 4;   // Numeric data value
ele_str = 5;   // String data (pointer to PChar)
```

**Type Encoding**:
- Each element has a type (stored in DebugDisplayType array)
- Each element has a value (stored in DebugDisplayValue array)
- Arrays are traversed in parallel using parser functions

### 16.3 Parser Functions

All four parser functions are thin wrappers (lines 4109-4139):

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
    val := P2.DebugDisplayValue[ptr];
    Inc(ptr);
    Result := True;
  end
  else
    Result := False;
end;
```

The element array lives in the `P2` global object (`P2.DebugDisplayType[]` / `P2.DebugDisplayValue[]`); the current position is tracked by the form-local `ptr` field (not `ElementPtr`/`ElementEnd` as earlier drafts suggested). `NextEnd` checks for `ele_end` type at the current position without advancing `ptr`.

### 16.4 SCOPE_XY Configuration Message Example

**Cartesian Mode Configuration**:
```
Element Array:
[0] type=ele_key   value=key_size        → SIZE
[1] type=ele_num   value=256             → radius (creates 512×512 display)
[2] type=ele_key   value=key_range       → RANGE
[3] type=ele_num   value=100             → coordinate extent
[4] type=ele_key   value=key_samples     → SAMPLES
[5] type=ele_num   value=50              → fade buffer depth
[6] type=ele_str   value=<ptr>           → 'Phase'
[7] type=ele_num   value=$FF0000         → red color
[8] type=ele_end   value=0               → end marker
```

**Parsing Flow**:
```pascal
SCOPE_XY_Configure:
  NextKey → key_size → NextNum → 256 → vWidth := 512, vHeight := 512
  NextKey → key_range → NextNum → 100 → vRange := 100
  NextKey → key_samples → NextNum → 50 → vSamples := 50
  NextStr → 'Phase' → vLabel[0] := 'Phase'
  NextNum → $FF0000 → vColor[0] := $FF0000
  NextEnd → done
```

### 16.5 SCOPE_XY Sample Data Message Example

**Persistent Mode** (2 traces, LONGS_16BIT packing):
```
Element Array:
[0] type=ele_num   value=$00640032       → packed: x0=50, y0=100
[1] type=ele_num   value=$FF9CFF38       → packed: x1=-100, y1=-200
[2] type=ele_num   value=$003200C8       → packed: x0=200, y0=50
[3] type=ele_num   value=$FFD6FF9C       → packed: x1=-100, y1=-42
[4] type=ele_end   value=0
```

**Unpacking**:
```pascal
SCOPE_XY_Update:
  NextNum → $00640032
    UnPack → samp[0] = 50 (x0)
    UnPack → samp[1] = 100 (y0)
  NextNum → $FF9CFF38
    UnPack → samp[2] = -100 (x1)
    UnPack → samp[3] = -200 (y1)
  → All pairs received, plot immediately (persistent mode)

  NextNum → $003200C8
    UnPack → samp[0] = 200 (x0)
    UnPack → samp[1] = 50 (y0)
  NextNum → $FFD6FF9C
    UnPack → samp[2] = -100 (x1)
    UnPack → samp[3] = -42 (y1)
  → All pairs received, plot immediately
```

### 16.6 Polar Mode Sample Example

**Configuration**:
```
Element Array:
[0] type=ele_key   value=key_polar       → POLAR
[1] type=ele_num   value=360             → vTwoPi = 360 (degrees)
[2] type=ele_num   value=0               → vTheta = 0 (no offset)
[3] type=ele_end   value=0
```

**Sample Data** (rho/theta pairs):
```
Element Array:
[0] type=ele_num   value=$00190000       → packed: rho=0, theta=25
[1] type=ele_num   value=$00320019       → packed: rho=25, theta=50
[2] type=ele_num   value=$004B0032       → packed: rho=50, theta=75
[3] type=ele_end   value=0
```

### 16.7 Runtime Command Examples

**CLEAR Command**:
```
Element Array:
[0] type=ele_key   value=key_clear
[1] type=ele_end   value=0
```

**SAVE Command**:
```
Element Array:
[0] type=ele_key   value=key_save
[1] type=ele_str   value=<ptr>           → 'phase_plot.bmp'
[2] type=ele_end   value=0
```

---

## 17. Buffer Management and Timing

### 17.1 Dual Buffer Model

SCOPE_XY uses **two different buffer strategies** depending on display mode:

**Persistent Mode** (vSamples = 0):
- **No sample buffering**
- Sample pairs plotted directly to Bitmap[0]
- Points accumulate until CLEAR command
- Minimal memory usage

**Fading Mode** (vSamples > 0):
- **Circular buffer**: XY_SampleBuff
- Stores last N sample pairs (N = vSamples, max 2048)
- Redraw all samples each update with opacity decay
- Higher memory usage, animated trails

### 17.2 XY_SampleBuff Circular Buffer

**Declaration** (DebugDisplayUnit.pas:362):
```pascal
XY_SampleBuff: array[0..XY_Sets * XY_SetSize - 1] of integer;
```

**Dimensions**:
```
XY_Sets = 2048                    // Number of sample pairs
XY_SetSize = 16                   // Values per set (8 traces × 2 values)
Total size = 2048 × 16 = 32,768 samples = 131,072 bytes
```

**Organization** (interleaved by trace pair):
```
Set 0:  [T0_X][T0_Y][T1_X][T1_Y][T2_X][T2_Y]...[T7_X][T7_Y]  (16 values)
Set 1:  [T0_X][T0_Y][T1_X][T1_Y][T2_X][T2_Y]...[T7_X][T7_Y]
...
Set 2047: [T0_X][T0_Y][T1_X][T1_Y][T2_X][T2_Y]...[T7_X][T7_Y]
```

**Circular Buffer Pointers**:
```pascal
SamplePtr:  integer;              // Write position (0-2047)
SamplePop:  integer;              // Number of valid samples (0-vSamples)
XY_PtrMask: integer = $7FF;       // 2047 (for wraparound)
```

### 17.3 Write Operations

**Persistent Mode** (SCOPE_XY_Update, lines 1480-1484):
```pascal
if vSamples = 0 then
begin
  // No buffering, plot directly
  for j := vIndex - 1 downto 0 do
    SCOPE_XY_Plot(samp[j shl 1 + 0], samp[j shl 1 + 1], vColor[j], 255);
  if RateCycle then BitmapToCanvas(0);
end
```

**Behavior**:
- Sample pairs extracted from element array
- Unpacked using data packing mode
- Plotted immediately with full opacity (255)
- No storage in XY_SampleBuff
- Display updated on rate cycle

**Fading Mode** (SCOPE_XY_Update, lines 1486-1504):
```pascal
else
begin
  // Store in circular buffer
  Move(samp, XY_SampleBuff[SamplePtr * XY_SetSize], XY_SetSize shl 2);
  SamplePtr := (SamplePtr + 1) and XY_PtrMask;
  if SamplePop < vSamples then Inc(SamplePop);

  if RateCycle then
  begin
    ClearBitmap;
    // Redraw all buffered samples
    for j := vIndex - 1 downto 0 do
      for k := SamplePop - 1 downto 0 do
      begin
        ptr := ((SamplePtr - k - 1) and XY_PtrMask) * XY_SetSize + j * 2;
        opa := 255 - (k * 255 div vSamples);
        SCOPE_XY_Plot(XY_SampleBuff[ptr + 0], XY_SampleBuff[ptr + 1], vColor[j], opa);
      end;
    BitmapToCanvas(0);
  end;
end;
```

**Write Process**:
1. Copy complete sample set to buffer at SamplePtr
2. Advance SamplePtr with wraparound: `(SamplePtr + 1) and XY_PtrMask`
3. Increment SamplePop until it reaches vSamples
4. On rate cycle: clear bitmap, redraw all samples with fading

### 17.4 Read Operations

**Read Timing**: Only occurs in fading mode, during RateCycle.

**Read Loop** (lines 1494-1500):
```pascal
for j := vIndex - 1 downto 0 do           // For each trace
  for k := SamplePop - 1 downto 0 do      // For each buffered sample (newest to oldest)
  begin
    // Calculate buffer index
    ptr := ((SamplePtr - k - 1) and XY_PtrMask) * XY_SetSize + j * 2;

    // Calculate opacity based on age
    opa := 255 - (k * 255 div vSamples);

    // Plot sample pair
    SCOPE_XY_Plot(XY_SampleBuff[ptr + 0], XY_SampleBuff[ptr + 1], vColor[j], opa);
  end;
```

**Index Calculation**:
```
ptr = ((SamplePtr - k - 1) and XY_PtrMask) * XY_SetSize + trace * 2
```

**Components**:
- `SamplePtr`: Current write position (next slot to write)
- `k`: Age of sample (0 = newest, SamplePop-1 = oldest)
- `SamplePtr - k - 1`: Position of sample k slots back
- `and XY_PtrMask`: Circular wraparound
- `* XY_SetSize`: Convert set index to element index
- `+ trace * 2`: Offset to specific trace pair
- `+ 0`: X or rho value
- `+ 1`: Y or theta value

**Example** (SamplePtr = 100, vSamples = 50, SamplePop = 50, trace = 2):
```
Newest sample (k=0):
  ptr = ((100 - 0 - 1) and 2047) * 16 + 2 * 2 = 99 * 16 + 4 = 1588
  XY_SampleBuff[1588] = x2, XY_SampleBuff[1589] = y2

Oldest sample (k=49):
  ptr = ((100 - 49 - 1) and 2047) * 16 + 2 * 2 = 50 * 16 + 4 = 804
  XY_SampleBuff[804] = x2, XY_SampleBuff[805] = y2
```

### 17.5 Opacity Decay Formula

**Calculation** (line 1498):
```pascal
opa := 255 - (k * 255 div vSamples);
```

**Formula**:
```
opacity = 255 - (age / max_samples) × 255
```

**Examples** (vSamples = 100):
```
k = 0 (newest):   opa = 255 - (0 * 255 / 100) = 255 (fully opaque)
k = 25:           opa = 255 - (25 * 255 / 100) = 191 (75% opaque)
k = 50 (middle):  opa = 255 - (50 * 255 / 100) = 127 (50% opaque)
k = 75:           opa = 255 - (75 * 255 / 100) = 63 (25% opaque)
k = 99 (oldest):  opa = 255 - (99 * 255 / 100) = 2 (nearly transparent)
```

**Effect**: Creates smooth fading trail from newest (bright) to oldest (dim).

### 17.6 Rate Control

**RateCycle Function** (shared with other displays):
```pascal
function RateCycle: boolean;
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

**Purpose**: Throttle display updates to reduce CPU usage.

**Configuration**: `RATE divisor` (default = 1)

**Examples**:
```
RATE 1:   Update every cycle (no throttling)
RATE 10:  Update every 10th cycle (10× slower)
RATE 100: Update every 100th cycle (100× slower)
```

**Timing**:
- Persistent mode: Bitmap updated on rate cycle
- Fading mode: Bitmap cleared and redrawn on rate cycle
- Between cycles: Samples still buffered (fading mode)

### 17.7 Memory Access Patterns

**Persistent Mode**:
```
Element Array → UnPack → SCOPE_XY_Plot → Bitmap[0] → Canvas
     (read)              (immediate)      (write)     (display)
```

**Fading Mode**:
```
Element Array → UnPack → XY_SampleBuff → SCOPE_XY_Plot → Bitmap[0] → Canvas
     (read)              (circular write)  (sequential read)  (write)   (display)
```

**Cache Efficiency**:
- Persistent: Excellent (no buffer access)
- Fading: Good (sequential read pattern during redraw)

---

## 18. Bitmap System and Double-Buffering

### 18.1 Bitmap Architecture

SCOPE_XY uses the same double-buffered bitmap system as other display types.

**Bitmap Array** (DebugDisplayUnit.pas):
```pascal
Bitmap: array[0..1] of TBitmap;
```

**Bitmap Roles**:
- **Bitmap[0]**: Render target (all drawing operations)
- **Bitmap[1]**: Display buffer (copied to Canvas)

**Configuration** (lines 596-599):
```pascal
Bitmap[0].PixelFormat := pf24bit;     // 24-bit BGR (Windows VCL default)
Bitmap[1].PixelFormat := pf24bit;
```

### 18.2 Memory Layout

**Pixel Format**: 24-bit BGR (3 bytes per pixel, `pf24bit`, lines 597-599)

**Memory Organization**:
```
Bitmap[0]:
  Row 0: [B0][G0][R0][B1][G1][R1]...[Bn][Gn][Rn]
  Row 1: [B0][G0][R0][B1][G1][R1]...[Bn][Gn][Rn]
  ...
```

**Byte Order**: BGR (Windows VCL convention; no alpha channel in the bitmap itself — opacity is handled by SmoothLine's blending logic).

**Memory Size** (typical 512×512 display):
```
512 × 512 × 3 bytes × 2 bitmaps = 1,572,864 bytes ≈ 1.5 MB
```

### 18.3 BitmapToCanvas Transfer

**Implementation** (lines 3522-3530):
```pascal
procedure TDebugDisplayForm.BitmapToCanvas(Level: integer);
begin
  if Level = 0 then
    Bitmap[1].Canvas.Draw(0, 0, Bitmap[0]);
  if DisplayType in [dis_spectro, dis_plot, dis_bitmap] then
    Canvas.StretchDraw(Rect(0, 0, vClientWidth, vClientHeight), Bitmap[1])
  else
    Canvas.Draw(0, 0, Bitmap[1]);
end;
```

`Level = 0` copies Bitmap[0] (render target) into Bitmap[1] (display buffer), then blits Bitmap[1] to the form canvas. For SCOPE_XY (`Level` is always passed as `0`), both the copy and the blit happen every call. There is no `BitmapPtr` swap — Bitmap[0] is always the render target and Bitmap[1] is always the display buffer for SCOPE_XY.

**Purpose**: Decouple rendering from display refresh; `Canvas.Draw` triggers the Windows paint mechanism.

**Timing**:
- Persistent mode: Called on rate cycle after plotting new points
- Fading mode: Called on rate cycle after full redraw

### 18.4 Anti-Aliased Dot Rendering

**SmoothDot Call** (SCOPE_XY_Plot, line 1544):
```pascal
SmoothDot(x, y, vDotSize shl 6, color, opacity);
```

**Parameters**:
- `x, y`: Center position in 8.8 fixed-point (256 = 1 pixel)
- `vDotSize shl 6`: Radius in 6.6 fixed-point (64 = 1 pixel)
- `color`: RGB24 color value
- `opacity`: Alpha value (0-255)

**Real implementation** (lines 3839-3842):
```pascal
procedure TDebugDisplayForm.SmoothDot(x, y, radius, color: integer; opacity: byte);
begin
  SmoothLine(x, y, x, y, radius, color, opacity);
end;
```

`SmoothDot` is a one-liner that delegates to `SmoothLine` with both endpoints identical (a degenerate zero-length line), which produces the filled anti-aliased circle. All clipping, sub-pixel coverage, and alpha-blending logic lives in `SmoothLine` (lines 3844 onward). There is no inline loop in `SmoothDot` itself.

### 18.5 Persistent vs. Fading Rendering

**Persistent Mode Rendering Flow**:
```
1. Sample pairs arrive
2. UnPack data
3. SCOPE_XY_Plot → SmoothDot → Bitmap[0] (accumulate)
4. On RateCycle: BitmapToCanvas → Display
5. Next samples → Plot on same Bitmap[0] (accumulation continues)
```

**Fading Mode Rendering Flow**:
```
1. Sample pairs arrive
2. UnPack data
3. Store in XY_SampleBuff circular buffer
4. On RateCycle:
   a. ClearBitmap (erase Bitmap[0])
   b. For each buffered sample:
      SCOPE_XY_Plot → SmoothDot → Bitmap[0] (with opacity decay)
   c. BitmapToCanvas → Display
5. Next samples → Circular buffer (oldest overwritten)
```

**Key Difference**:
- Persistent: Additive rendering (never clears)
- Fading: Regenerative rendering (clear and redraw each cycle)

### 18.6 Coordinate Transformation Integration

**Fixed-Point Pipeline**:
```
Input: x, y (integer coordinates in value units)
  ↓
Transform: Cartesian/Polar, Linear/Log (SCOPE_XY_Plot)
  ↓
Scale: x * vScale * 256, y * vScale * 256 (8.8 fixed-point)
  ↓
Center: x += (width/2) * 256, y += (height/2) * 256
  ↓
Render: SmoothDot(x, y, ...) → Bitmap[0]
```

**Example** (Cartesian linear, vRange=100, vScale=2.56, width=512):
```
Input: x=50, y=50

Transform (line 1529):
  X = Round(50 * 2.56 * 256) = 32,768 (fixed-point)
  Y = Round(50 * 2.56 * 256) = 32,768

Center (line 1542-1543):
  x = (512 shl 7) + 32,768 = 65,536 + 32,768 = 98,304
  y = (512 shl 7) - 32,768 = 65,536 - 32,768 = 32,768

SmoothDot (line 1544):
  SmoothDot(98,304, 32,768, 384, color, opacity)
  → Plots at pixel (384, 128) with anti-aliasing
```

---

## 19. Shared Infrastructure

### 19.1 Data Packing System

SCOPE_XY shares the same data packing system as all other display types. This system enables bandwidth optimization by packing multiple samples into single 32-bit values.

**12 Packing Modes** (DebugDisplayUnit.pas:63-74):
```pascal
key_longs_1bit   = 29;    // 32 values per long (1 bit each)
key_longs_2bit   = 30;    // 16 values per long (2 bits each)
key_longs_4bit   = 31;    // 8 values per long (4 bits each)
key_longs_8bit   = 32;    // 4 values per long (8 bits each)
key_longs_16bit  = 33;    // 2 values per long (16 bits each)
key_words_1bit   = 34;    // 16 values per word (1 bit each)
key_words_2bit   = 35;    // 8 values per word (2 bits each)
key_words_4bit   = 36;    // 4 values per word (4 bits each)
key_words_8bit   = 37;    // 2 values per word (8 bits each)
key_bytes_1bit   = 38;    // 8 values per byte (1 bit each)
key_bytes_2bit   = 39;    // 4 values per byte (2 bits each)
key_bytes_4bit   = 40;    // 2 values per byte (4 bits each)
```

**SetPack Function** (lines 4146-4156):
```pascal
procedure TDebugDisplayForm.SetPack(val: integer; alt, signx: boolean);
var
  i: integer;
begin
  vPackAlt := alt;
  vPackSignx := signx;
  if val = 0 then i := 32 shl 8 + 1 else i := PackDef[val];
  if val = 0 then vPackMask := $FFFFFFFF else vPackMask := 1 shl (i shr 8 and $FF) - 1;
  vPackShift := i shr 8 and $FF;
  vPackCount := i and $FF;
end;
```

`val = 0` is the reset/default form (32-bit width, count=1). Non-zero `val` indexes into the `PackDef` constant array (lines 140–152), which encodes `(shift shl 8 + count)` for each of the 12 packing modes. `alt` enables bit-reversal within each sub-unit; `signx` enables sign-extension on unpack.

The `alt`/`signx` booleans are set by `KeyPack` (lines 2817–2832) from optional trailing `ALT` / `SIGNED` keywords on the packing directive: `KeyPack` reads up to **two** following keys, each of which may be `key_alt` (→ `alt := True`) or `key_signed` (→ `signx := True`), then calls `SetPack(v, alt, signx)`. So a packing directive like `LONGS_8BIT SIGNED ALT` enables both flags; order is irrelevant.

**NewPack Function** (lines 4158-4164):
```pascal
function TDebugDisplayForm.NewPack: integer;
begin
  Result := val;
  if vPackAlt and (vPackShift <= 1) then Result := Result shr 1 and $55555555 or Result shl 1 and $AAAAAAAA;
  if vPackAlt and (vPackShift <= 2) then Result := Result shr 2 and $33333333 or Result shl 2 and $CCCCCCCC;
  if vPackAlt and (vPackShift <= 4) then Result := Result shr 4 and $0F0F0F0F or Result shl 4 and $F0F0F0F0;
end;
```

**UnPack Function** (lines 4166-4171):
```pascal
function TDebugDisplayForm.UnPack(var v: integer): integer;
begin
  Result := v and vPackMask;
  v := v shr vPackShift;
  if vPackSignx and (Result shr (vPackShift - 1) and 1 = 1) then Result := Result or ($FFFFFFFF xor vPackMask);
end;
```

Each call to `UnPack` extracts the next sub-value from `v` using a right-shift of `vPackShift` bits. Sign-extension (when `vPackSignx` is true) tests the MSB of the extracted field and fills the upper bits with `1`s if set.

**SCOPE_XY Typical Usage**: LONGS_16BIT (2 values per long)

**Example** (2 traces, Cartesian coordinates):
```
LONGS_16BIT mode:
  Packed value 1: $00640032 → x0=50, y0=100
  Packed value 2: $FF9CFFD8 → x1=-100, y1=-40
```

### 19.2 Color System

**TranslateColor Function** (shared with all displays, line 3090):
```pascal
function TDebugDisplayForm.TranslateColor(p, mode: integer): integer;
```

This function takes a raw pixel value `p` and a color-mode key (`mode`), then converts `p` to an RGB24 value according to the active color mode (LUT1/2/4/8, luma8, rgbi8, rgb8, rgb16, rgb24, etc.). For SCOPE_XY, trace colors are stored as pre-translated RGB24 values in `vColor[]` (set by `KeyColor` during configure), so `TranslateColor` is not called during plotting. The fabricated single-argument form shown in earlier drafts does not exist in v55.

**Default Scope Colors** (8 colors, line 241):
```pascal
DefaultScopeColors: array[0..7] of integer = (
  clLime,     // $00FF00 — Lime green
  clRed,      // $FF0000 — Red
  clCyan,     // $00FFFF — Cyan
  clYellow,   // $FFFF00 — Yellow
  clMagenta,  // $FF00FF — Magenta
  clBlue,     // $7F7FFF — Blue   (note: NOT pure $0000FF)
  clOrange,   // $FF7F00 — Orange (note: NOT web $FFA500)
  clOlive);   // $7F7F00 — Olive  (note: NOT web $808000)
```

These `clXxx` constants are **locally defined as literal RGB24 values** at
`DebugDisplayUnit.pas` 179–191 — they are *not* VCL palette `TColor`s and do **not**
depend on the Windows palette. The stored `vColor[]` values are these RGB24 integers;
`WinRGB` swaps R↔B to BGR only at GDI draw time. The order (Lime, Red, Cyan, Yellow,
Magenta, Blue, Orange, Olive) cycles through traces 0–7 when no explicit color is given.

**SCOPE_XY Color Usage**:
- Trace colors: `vColor[0..7]` (RGB24 from `DefaultScopeColors`, or per-trace `COLOR`)
- Background color: `vBackColor` (global default `clBlack` `$000000`)
- Grid color: `vGridColor` (global default `clGray` `$404040`)

### 19.3 Fixed-Point Arithmetic

SCOPE_XY uses **8.8 fixed-point** format (8 integer bits, 8 fractional bits).

**Conversion**:
```
Integer to fixed-point: x << 8 (multiply by 256)
Fixed-point to integer: x >> 8 (divide by 256)
```

**Example**:
```
x = 10.5 pixels → fixed-point = 10.5 × 256 = 2688
x = 2688 (fixed-point) → pixels = 2688 / 256 = 10.5
```

**Purpose**: Sub-pixel positioning for anti-aliased rendering.

**SCOPE_XY Scaling** (line 1529):
```pascal
X := Round(x * vScale * $100);  // $100 = 256 (convert to fixed-point)
Y := Round(y * vScale * $100);
```

### 19.4 Trigonometric Functions

**SinCos** (used in coordinate transformations):
```pascal
SinCos(angle, sine_result, cosine_result);
```

**Purpose**: Computes sine and cosine simultaneously (more efficient than separate calls).

**SCOPE_XY Usage** (lines 1526, 1540):
```pascal
// Cartesian log scale
SinCos(Tf, Xf, Yf);
X := Round(Rf * Xf * $100);
Y := Round(Rf * Yf * $100);

// Polar mode
Tf := Pi / 2 - (y + vTheta) / vTwoPi * Pi * 2;
SinCos(Tf, Xf, Yf);
x := Round(Rf * Xf * $100);
y := Round(Rf * Yf * $100);
```

**ArcTan2** (used in Cartesian log scale):
```pascal
angle := ArcTan2(y, x);
```

**Purpose**: Computes angle from (x, y) with correct quadrant.

**Hypot** (used in Cartesian log scale):
```pascal
distance := Hypot(x, y);
```

**Purpose**: Computes sqrt(x² + y²) with overflow protection.

**Log2** (used in log scale modes):
```pascal
log_value := Log2(value);
```

**Purpose**: Base-2 logarithm for log scale transformations.

### 19.5 Text Rendering

**Text Metrics** (SetTextMetrics, lines 2919-2924):
```pascal
procedure TDebugDisplayForm.SetTextMetrics;
begin
  Bitmap[0].Canvas.Font.Size := vTextSize;
  ChrWidth := Bitmap[0].Canvas.TextWidth('X');
  ChrHeight := Bitmap[0].Canvas.TextHeight('X');
end;
```
(No font name is set here; the font inherits whatever was established at form creation — `FontName` constant is set on the canvas at init time, line 600.)

**SCOPE_XY Text Usage**:
- Trace labels (configured via string elements)
- Window title
- Mouse coordinates (unless HIDEXY specified)

### 19.6 Rate Control

**RateCycle Function** (shared):
```pascal
function RateCycle: boolean;
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

**Purpose**: Throttle display updates to configured rate.

**SCOPE_XY Usage**:
- Persistent mode: BitmapToCanvas called on rate cycle
- Fading mode: ClearBitmap + full redraw on rate cycle
- Samples always processed (buffered if fading mode)

### 19.7 File Operations

**Save to BMP** (`KeySave`, lines 2839-2870):
```pascal
procedure TDebugDisplayForm.KeySave;
begin
  if NextStr then Bitmap[1].SaveToFile(PChar(val) + '.bmp')
  else ...  // optional WINDOW / coordinate-rect form
end;
```

When `SAVE` is followed by a string element, it appends `.bmp` to the supplied name and saves `Bitmap[1]` (the display buffer). No auto-counter or format string is used; the filename must be supplied explicitly, or the optional `WINDOW` / rect form captures a screen region instead.

**SCOPE_XY Command**: `SAVE {filename}`

---

## 20. Initialization Lifecycle

### 20.1 Window Creation Sequence

**Trigger**: Host software calls `CreateDebugDisplay(display_type, element_array)`.

**SCOPE_XY Creation** (display_type = dis_scope_xy = 2):

```pascal
// 1. Form instantiation
DebugDisplayForm := TDebugDisplayForm.Create(Application);
DebugDisplayForm.DisplayType := dis_scope_xy;

// 2. Initialize element parser (ptr field, P2.DebugDisplayType/Value arrays)
ptr := 0;  // form-local position; element array is in P2.DebugDisplayType/Value

// 3. SetDefaults is called first (line 631), establishing cross-window defaults
//    including vSamples := 256, SetPack(0, False, False), vPolar := False, etc.
//    Key defaults from SetDefaults (lines 2880-2917):
vWidth       := 256;
vHeight      := 256;
vSamples     := 256;     // 256-sample fading trail (NOT persistent)
vBackColor   := DefaultBackColor;
vGridColor   := DefaultGridColor;
vLogScale    := False;
vPolar       := False;
vTwoPi       := $100000000;
vTheta       := 0;
SetPack(0, False, False); // 32-bit, count=1 (unpacked), no alt/sign

// 4. Call SCOPE_XY_Configure — sets SCOPE_XY-specific overrides only:
//    vRange := $7FFFFFFF; vRate := 1; vDotSize := 6; vTextSize := FontSize;
//    (vSamples is NOT reset here; it retains 256 from SetDefaults)
SCOPE_XY_Configure;

// 5. Scale factor calculated at end of SCOPE_XY_Configure (line 1437)
vScale := vWidth / 2 / vRange;

// 6. Bitmaps already created at form-create time (lines 596-599), pf24bit
//    SetSize called via SetSize() at end of SCOPE_XY_Configure (line 1440)

// 7. Set form size and position
ClientWidth := vWidth + margins;
ClientHeight := vHeight + margins;
SetFormPosition;  // From POS command or cascade

// 8. Clear display
ClearBitmap;
BitmapToCanvas(0);

// 9. Show window
Show;
```

**Source Locations**:
- SCOPE_XY_Configure: Lines 1386-1441
- Form creation: DebugUnit.pas (display manager)

### 20.2 Configuration Parameter Processing

**Parameter Parsing Loop** (lines 1394-1433):
```pascal
while not NextEnd do
begin
  if NextKey then
  case val of
    key_title:       KeyTitle;                    // Window title
    key_pos:         KeyPos;                      // Window position
    key_size:                                     // Display size (radius)
    begin
      if NextNum then vWidth := Within(val * 2, scope_xy_wmin, scope_xy_wmax) else Continue;
      vHeight := vWidth;                          // Force square
    end;
    key_range:       KeyValWithin(vRange, 1, $7FFFFFFF);
    key_samples:     KeyValWithin(vSamples, 0, XY_Sets);
    key_rate:        KeyValWithin(vRate, 1, XY_Sets);
    key_dotsize:     KeyValWithin(vDotSize, 2, 20);
    key_textsize:    KeyTextSize;
    key_color:       if KeyColor(vBackColor) then KeyColor(vGridColor);
    key_polar:       KeyTwoPi;                    // Enable polar mode
    key_logscale:    vLogScale := True;
    key_hidexy:      vHideXY := True;
    key_longs_1bit..key_bytes_4bit:  KeyPack;    // Set packing mode
  end
  else if NextStr then                            // Trace label
  begin
    if vIndex <> Channels then Inc(vIndex);
    vLabel[vIndex - 1] := PChar(val);
    KeyColor(vColor[vIndex - 1]);                // Optional color follows
  end;
end;
```

**Default Overrides**:
- SIZE not specified → vWidth = 256 (from `SetDefaults` line 2884), vHeight = 256
- RANGE not specified → vRange = $7FFFFFFF (set by SCOPE_XY_Configure, line 1389)
- SAMPLES not specified → vSamples = 256 (from `SetDefaults` line 2886; SCOPE_XY_Configure does NOT reset this)
- Packing not specified → `SetPack(0, False, False)` (val=0: 32-bit, count=1, no alt/sign, line 2915)

**Validation**:
- SIZE: the **doubled** value is clamped — `vWidth := Within(val*2, 32, 2048)`; the stored width lands in 32..2048 px (there is no separate clamp on the radius `val`)
- RANGE clamped to 1-$7FFFFFFF
- SAMPLES clamped to 0-2048
- RATE clamped to 1-2048
- DOTSIZE clamped to 2-20

### 20.3 Polar Mode Initialization

**KeyTwoPi Processing** (lines 2728-2742):
```pascal
procedure KeyTwoPi;
begin
  vPolar := True;
  vTwoPi := $100000000;  // Default: 2^32 units per circle
  vTheta := 0;           // Default: no angular offset

  if NextNum then
  begin
    case val of
      -1: vTwoPi := -$100000000;  // Clockwise rotation
       0: vTwoPi := $100000000;   // Keep default
    else
      vTwoPi := val;              // Custom value (e.g., 360 for degrees)
    end;
    KeyVal(vTheta);               // Optional theta offset
  end;
end;
```

**Polar Configuration Examples**:
```
POLAR              → vTwoPi = $100000000 (2^32), vTheta = 0
POLAR 360          → vTwoPi = 360 (degrees), vTheta = 0
POLAR 360 90       → vTwoPi = 360, vTheta = 90 (90° offset)
POLAR -1           → vTwoPi = -$100000000 (clockwise)
```

### 20.4 Buffer Allocation

**Circular Buffer** (allocated statically):
```pascal
XY_SampleBuff: array[0..32767] of integer;  // 128 KB, shared among all SCOPE_XY windows
```

**Per-Window State** (reset by `SetDefaults`, lines 2906-2907, 2886):
```pascal
SamplePtr := 0;    // Write position
SamplePop := 0;    // Number of valid samples
vSamples := 256;   // Default fading trail depth (from SetDefaults line 2886)
```

**Memory Ownership**: Each SCOPE_XY window has independent state variables but shares the global buffer array. In practice, only one SCOPE_XY window is typically active at a time.

### 20.5 Initial Display State

**After Initialization**:
```
Window: Created and visible
Display: Black (cleared)
Buffer: SamplePtr = 0, SamplePop = 0
Mode: Fading (vSamples = 256 unless overridden by SAMPLES directive)
Scale: vScale = (width / 2) / vRange
Coordinates: Cartesian or polar (determined by vPolar)
Packing: val=0 / 32-bit unpacked (SetPack(0,False,False)) unless packing directive given
```

**Ready for Data**: Window now waits for SCOPE_XY_Update calls with sample data.

### 20.6 Runtime State Transitions

**State Diagram**:
```
[Created] → SCOPE_XY_Configure → [Configured]
                                       ↓
                          SCOPE_XY_Update (first call)
                                       ↓
                                [Active]
                                  ↓    ↑
                            Sample data arrives
                                  ↓    ↑
                            Plot/Buffer samples
                                  ↓    ↑
                              RateCycle
                                  ↓    ↑
                            BitmapToCanvas

CLEAR command → Reset SamplePop = 0, vRateCount = 0
Close window → Cleanup → [Destroyed]
```

### 20.7 Cleanup and Destruction

**Window Close**:
```pascal
// 1. Stop processing updates
FormClosing := True;

// 2. Free bitmaps
Bitmap[0].Free;
Bitmap[1].Free;

// 3. Free form
Form.Free;
```

**Buffer Cleanup**: XY_SampleBuff is a static global array, not freed per-window.

---

## 21. Summary

The **SCOPE_XY** display window is a versatile XY plotter for the Propeller 2 debug environment, enabling visualization of relationships between signals, phase diagrams, trajectories, and polar plots.

**Key Capabilities**:
- XY and polar coordinate systems
- Linear and logarithmic scaling
- Persistent (accumulating) and fading (trails) modes
- Up to 8 independent traces
- 2048-sample circular buffer (fading mode)
- Anti-aliased dot rendering
- Flexible data packing (12 modes)

**Performance Profile**:
- Persistent mode: Minimal CPU usage (plot on arrival)
- Fading mode: Moderate CPU usage (redraw all samples per update)
- Memory: ~1.5 MB bitmaps (persistent), ~1.63 MB (fading with full buffer)

**Common Use Cases**:
- Lissajous figures (frequency/phase analysis)
- Trajectory plots (robotics, physics simulations)
- Phase diagrams (control systems)
- Polar plots (antenna patterns, spirals)
- Complex number visualization (real vs. imaginary)
- Parametric curves

The SCOPE_XY window complements the time-domain SCOPE display, enabling analysis of signal relationships and phase information that cannot be visualized on traditional oscilloscope displays.

---

**End of SCOPE_XY Theory of Operations**
