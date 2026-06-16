# PLOT Display Window - Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Directive coverage verified**: 2026-06-01 against `DebugDisplayUnit.pas` (v55)
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window config/display/keyboard/mouse reference

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Display Type and Constants](#3-display-type-and-constants)
4. [Data Structures](#4-data-structures)
5. [Configuration and Initialization](#5-configuration-and-initialization)
6. [Coordinate System](#6-coordinate-system)
7. [Drawing Primitives](#7-drawing-primitives)
8. [Text Rendering System](#8-text-rendering-system)
9. [Layer System](#9-layer-system)
10. [Sprite Rendering](#10-sprite-rendering)
11. [Update Processing](#11-update-processing)
12. [Rendering Pipeline](#12-rendering-pipeline)
13. [User Input Feedback](#13-user-input-feedback)
14. [Performance Characteristics](#14-performance-characteristics)
15. [Comparison with Other Display Types](#15-comparison-with-other-display-types)
16. [Usage Examples](#16-usage-examples)
17. [Implementation Details](#17-implementation-details)
18. [Element Array Protocol Specification](#18-element-array-protocol-specification)
19. [Buffer Management and Timing](#19-buffer-management-and-timing)
20. [Bitmap System and Double-Buffering](#20-bitmap-system-and-double-buffering)
21. [Shared Infrastructure](#21-shared-infrastructure)
22. [Initialization Lifecycle](#22-initialization-lifecycle)
23. [Summary](#23-summary)

---

## 1. Introduction

The **PLOT** display window is a versatile vector graphics display system for the Propeller 2 (P2) microcontroller debug environment. It provides a comprehensive 2D drawing canvas with support for:

- **Primitive shapes** (dots, lines, circles, ovals, rectangles, rounded rectangles)
- **Text rendering** with arbitrary rotation angles and styles
- **Dual coordinate systems** (Cartesian and polar)
- **Multi-layer compositing** (up to 8 bitmap layers)
- **Sprite rendering** with transformations
- **Sub-pixel precision** with anti-aliased rendering
- **User input feedback** (mouse and keyboard)

The PLOT window is implemented in `DebugDisplayUnit.pas` and is one of 9 specialized debug display types. It is particularly suited for creating custom visualizations, graphs, plots, and user interfaces.

**File Location**: `DebugDisplayUnit.pas`

**Key Methods**:
- `PLOT_Configure` (lines 1864-1916): Initialization and configuration
- `PLOT_Update` (lines 1918-2155): Command processing and drawing
- `PLOT_GetXY` (lines 2157-2167): Coordinate transformation helper
- `PLOT_Close` (lines 2169-2174): Resource cleanup

---

## 2. Architecture Overview

### 2.1 System Context

The PLOT window operates within the P2 debug display system:

```
┌─────────────────────────────────────────────────────────────┐
│                    Propeller 2 Hardware                     │
│                    (Serial Transmission)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Serial Protocol
                         │ (Element Arrays)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      SerialUnit.pas                          │
│                  (Background Thread Receiver)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Command Routing
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
│                     PLOT_Update Method                       │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   Drawing    │   │    Layer     │   │   Sprite     │   │
│  │  Primitives  │   │ Compositing  │   │  Rendering   │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │     Text     │   │ Coordinate   │   │Anti-Aliased  │   │
│  │  Rendering   │   │Transformation│   │   Graphics   │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Double-Buffered Display
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Windows VCL Canvas                         │
│                    (Visual Output)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Configuration Flow** (Window Creation):
```
Serial Command → Parse Elements → PLOT_Configure → Initialize Layers → Create Window
```

**Update Flow** (Drawing Commands):
```
Serial Command → Parse Elements → PLOT_Update → Process Command → Render to Bitmap[0] → Display
```

**Coordinate Flow** (Positioning):
```
User Coordinates → Polar Conversion (if enabled) → Origin Offset → Direction Flip → Screen Coordinates → Fixed-Point (8.8)
```

---

## 3. Display Type and Constants

### 3.1 Display Type Identifier

```pascal
dis_plot = 5;
```

The PLOT display is identified by type code `5` in the debug display system.

**Source Location**: Line 38 in DebugDisplayUnit.pas

### 3.2 Size Constraints

```pascal
plot_wmin    = 32;      // Minimum width in pixels
plot_wmax    = 2048;    // Maximum width in pixels
plot_hmin    = 32;      // Minimum height in pixels
plot_hmax    = 2048;    // Maximum height in pixels
```

**Purpose**:
- `plot_wmin/plot_hmin`: Minimum display dimensions ensure sufficient space for meaningful visualization
- `plot_wmax/plot_hmax`: Maximum dimensions prevent excessive memory usage and maintain performance

**Memory Calculation**:
- Maximum bitmap size: 2048 × 2048 × 4 bytes (RGBA) = 16 MB per bitmap
- With 8 layer bitmaps: up to 128 MB additional memory

**Source Location**: Lines 60-63 in DebugDisplayUnit.pas

### 3.3 Layer System

```pascal
plot_layermax = 8;      // Maximum number of layer bitmaps
```

The PLOT window supports up to 8 independent bitmap layers that can be loaded from external BMP files and composited onto the main display canvas.

**Source Location**: Line 64 in DebugDisplayUnit.pas

### 3.4 Command Key Constants

The PLOT window responds to the following command keys:

| Key Constant | Value | Command | Purpose |
|--------------|-------|---------|---------|
| `key_dot` | 53 | `DOT` | Draw a dot at current position |
| `key_line` | 58 | `LINE` | Draw a line to new position |
| `key_circle` | 47 | `CIRCLE` | Draw a circle |
| `key_oval` | 66 | `OVAL` | Draw an oval |
| `key_box` | 44 | `BOX` | Draw a rectangle |
| `key_obox` | 63 | `OBOX` | Draw a rounded rectangle |
| `key_text` | 84 | `TEXT` | Render text string |
| `key_layer` | 57 | `LAYER` | Load layer bitmap |
| `key_crop` | 51 | `CROP` | Composite layer to canvas |
| `key_sprite` | 82 | `SPRITE` | Render sprite |
| `key_spritedef` | 83 | `SPRITEDEF` | Define sprite data |
| `key_polar` | 69 | `POLAR` | Enable polar coordinates |
| `key_cartesian` | 45 | `CARTESIAN` | Enable Cartesian coordinates |
| `key_origin` | 65 | `ORIGIN` | Set coordinate origin |
| `key_set` | 77 | `SET` | Set current position |
| `key_precise` | 71 | `PRECISE` | Toggle precision mode |

**Source Locations**: Lines 44-122 in DebugDisplayUnit.pas

---

## 4. Data Structures

### 4.1 Coordinate System Variables

```pascal
// Coordinate mode flags
vPolar       : boolean;     // True = polar mode, False = Cartesian mode
vDirX        : boolean;     // True = flip X direction
vDirY        : boolean;     // True = flip Y direction

// Origin and position
vOffsetX     : integer;     // X origin offset in pixels
vOffsetY     : integer;     // Y origin offset in pixels
vPixelX      : integer;     // Current X position (relative to origin)
vPixelY      : integer;     // Current Y position (relative to origin)

// Precision control
vPrecise     : byte;        // Precision mode: 8 = sub-pixel, 0 = pixel (decl 342)

// Polar coordinate parameters
vTwoPi       : int64;       // Full circle value (default: $100000000 = 2^32; decl 315 — must be int64, the default does not fit int32)
vTheta       : integer;     // Theta offset for polar coordinates
```

**Purpose**:
- **vPolar**: Determines whether coordinates are interpreted as (rho, theta) or (x, y)
- **vDirX/vDirY**: Allow coordinate system flipping for different orientations
- **vOffsetX/vOffsetY**: Define the origin point for drawing operations
- **vPixelX/vPixelY**: Track the current drawing position
- **vPrecise**: Controls sub-pixel precision (8 = 1/256th pixel, 0 = whole pixel)
- **vTwoPi**: Defines the value representing a full circle in polar mode
- **vTheta**: Adds an angular offset to all polar coordinates

**Default Values** (from PLOT_Configure v55, lines 1869–1880):
```pascal
vDirX := False;           // No X flipping
vDirY := False;           // No Y flipping
vOffsetX := 0;            // Origin at (0, 0)
vOffsetY := 0;
vPixelX := 0;
vPixelY := 0;
vDotSize := 1;
vDotSizeY := 1;
vPlotColor := DefaultPlotColor;   // clCyan  = $00FFFF (consts 184/195)
vTextColor := DefaultTextColor;   // clWhite = $FFFFFF (consts 187/196)
vOpacity := $FF;
vPrecise := 8;            // Sub-pixel precision enabled
```

> **v55 note:** `vPolar` is **not** reset in `PLOT_Configure`. It retains whatever value it had at window creation (typically False from `FormCreate`). `vPolar` is only written by `POLAR`/`CARTESIAN` directives in the update phase.

### 4.2 Drawing State Variables

```pascal
vPlotColor   : integer;     // Current drawing color (RGB24)
vTextColor   : integer;     // Text color (RGB24)
vBackColor   : integer;     // Background color (RGB24)
vOpacity     : byte;        // Transparency (0-255, 255 = opaque; decl 341 — byte, so writes are `& $FF` truncated)
vLineSize    : integer;     // Line/dot size in pixels
```

**Purpose**:
- **vPlotColor**: Color used for drawing primitives (dots, lines, shapes)
- **vTextColor**: Color used for text rendering
- **vBackColor**: Background fill color
- **vOpacity**: Alpha channel value for transparency effects
- **vLineSize**: Thickness of lines and diameter of dots

### 4.3 Text Rendering Variables

```pascal
vTextSize    : integer;     // Font size in points — default DefaultTextSize = 10
                            //   (PLOT_Configure does not set it; changed at runtime
                            //   via TEXTSIZE or the inline size of TEXT, clamp 6..200)
vTextStyle   : integer;     // Style encoding (decl 340 — full signed integer; only the low bits
                            //   weight/italic/underline/halign/valign are consumed downstream)
vTextAngle   : integer;     // Text rotation angle (tenths of degrees; stored 0-3590, MakeTextAngle = (val mod 360)*10)
```

**Style Encoding** (vTextStyle bit fields):

| Bits | Mask | Values | Meaning |
|------|------|--------|---------|
| 0-1 | $03 | 0-3 | Font weight: 0=100, 1=400, 2=700, 3=900 |
| 2 | $04 | 0-1 | Italic: 0=normal, 1=italic |
| 3 | $08 | 0-1 | Underline: 0=none, 1=underline |
| 4-5 | $30 | 0-3 | Horizontal alignment: 0/1=center, 2=left, 3=right |
| 6-7 | $C0 | 0-3 | Vertical alignment: 0/1=center, 2=top, 3=bottom |

**Text Angle Units**:
- Stored in tenths of degrees (0-3590; one full turn = 3600 maps to 0)
- Windows expects angle in tenths of degrees
- Polar mode converts vTwoPi units to degrees

### 4.4 Layer Bitmaps

```pascal
PlotBitmap   : array[0..plot_layermax - 1] of TBitmap;  // 8 layer bitmaps
```

**Purpose**: Holds external bitmap layers that can be loaded and composited onto the main canvas.

**Characteristics**:
- Each layer is an independent TBitmap object
- Layers can have different dimensions
- Layers are loaded from external BMP files
- Layers are composited using CROP command

**Initialization** (PLOT_Configure, line 1908):
```pascal
for i := 0 to plot_layermax - 1 do PlotBitmap[i] := TBitmap.Create;
```

> **v55 note:** `PixelFormat := pf32bit` is not set in v55 — it was present in an earlier revision.

**Cleanup** (PLOT_Close, lines 2169-2174):
```pascal
procedure TDebugDisplayForm.PLOT_Close;
var i: integer;
begin
  for i := 0 to plot_layermax - 1 do PlotBitmap[i].Free;
end;
```

### 4.5 Sprite System (Shared)

The PLOT window shares the sprite system with the BITMAP display:

```pascal
const
  SpriteMax    = 256;     // Maximum number of sprite definitions
  SpriteMaxX   = 32;      // Maximum sprite width in pixels
  SpriteMaxY   = 32;      // Maximum sprite height in pixels

var
  SpriteSizeX  : array[0..SpriteMax - 1] of integer;          // Sprite widths
  SpriteSizeY  : array[0..SpriteMax - 1] of integer;          // Sprite heights
  SpritePixels : array[0..SpriteMax * SpriteMaxX * SpriteMaxY - 1] of byte;    // Pixel indices
  SpriteColors : array[0..SpriteMax * 256 - 1] of integer;    // Color palettes (RGBA)
```

**Total Memory**:
- SpriteSizeX: 256 × 4 bytes = 1 KB
- SpriteSizeY: 256 × 4 bytes = 1 KB
- SpritePixels: 256 × 32 × 32 = 256 KB
- SpriteColors: 256 × 256 × 4 bytes = 256 KB
- **Total: ~514 KB**

---

## Directive Reference (v55-verified)

> Source: `DebugDisplayUnit.pas` v55. Line references are into that file.
> All directives verified against `PLOT_Configure` (1864–1916) and `PLOT_Update` (1918–2155).

### Configuration directives

Accepted by `PLOT_Configure` only (window-creation phase). Line refs: 1882–1906.

| Directive | Parameters | Range / Default | Notes |
|---|---|---|---|
| `TITLE` | `'string'` | — | Window title |
| `POS` | `left top` | Screen coords | Window screen position |
| `SIZE` | `width height` | 32–2048 each; **default 256 × 256** (from global `SetDefaults` 2880–2884; `PLOT_Configure` does not override) | Canvas dimensions (client = `vWidth·vDotSize × vHeight·vDotSizeY`; with default dotsize 1×1 → 256 × 256 px, zero margins) |
| `DOTSIZE` | `x {y}` | **1–256** each; default **1×1** | Pixel-scaling factor; if only x given, y copies x (`1891-1894`) |
| color-mode | `LUT1`…`RGB24` | Keyword token | Initial color mode (`KeyColorMode`; `1896-1897`) |
| `LUTCOLORS` | `rgb24…` | 256 color longs | 256-entry LUT palette (`1898-1899`) |
| `BACKCOLOR` | `color` | Default: Black (`$000000`) | Background fill color (`1900-1901`) |
| `UPDATE` | _(flag)_ | Default: off (auto-update) | Enable manual-update (buffered) mode (`1902-1903`) |
| `HIDEXY` | _(flag)_ | Default: show | Suppress on-screen cursor coordinate readout (`1904-1905`) |

> **v55 note:** `POLAR`, `CARTESIAN`, `TEXTSIZE`, `SAMPLES`, and `RATE` are **not** accepted in `PLOT_Configure` — they are update-phase-only directives. The v51a-era documentation of those as config parameters was incorrect.

### Display / data directives (drawing command set)

Accepted by `PLOT_Update` (1918–2155). PLOT is the only window whose update phase is a full vector/raster drawing command set.

| Directive | Parameter shape | Range / Default | Source lines | Notes |
|---|---|---|---|---|
| color-mode | `LUT1`…`RGB24` | Keyword token | 1928–1929 | Change active color mode |
| `LUTCOLORS` | `rgb24…` | 256 color longs | 1930–1931 | Redefine LUT palette |
| `BACKCOLOR` | `color` | Any color | 1932–1933 | Set background color |
| `COLOR` | `color` | Any color | 1934–1943 | Set `vPlotColor`; if next key is `TEXT`, also sets `vTextColor` |
| `BLACK`…`GRAY` | `{brightness}` | Brightness 0–15 | 1934–1943 | Named-color shorthand; optional brightness nibble |
| `OPACITY` | `byte` | **0–255** by byte truncation; default `$FF` | 1944–1945 | `if NextNum then vOpacity := val` — no `Within` clamp; `vOpacity` is a `byte`, so the 0–255 bound is byte truncation (`& $FF`) on store, not a parse-time clamp |
| `PRECISE` | _(toggle)_ | Starts at 8 (on) | 1946–1947 | XOR `vPrecise` 8↔0; enables/disables sub-pixel fixed-point |
| `LINESIZE` | `size` | — | 1948–1949 | Set `vLineSize` default for DOT/LINE |
| `ORIGIN` | `{x y}` | — | 1950–1956 | Set coordinate origin; no args = use current `vPixelX,vPixelY` |
| `SET` | `x_rho y_theta` | — | 1957–1964 | Set current position; applies polar conversion if `vPolar` |
| `DOT` | `{linesize {opacity}}` | linesize default `vLineSize`; opacity default `vOpacity` | 1965–1979 | Draw dot at current position; does **not** advance position |
| `LINE` | `x_rho y_theta {linesize {opacity}}` | linesize default `vLineSize`; opacity default `vOpacity` | 1980–2011 | Draw line; advances `vPixelX/Y` to destination |
| `CIRCLE` | `width {linesize {opacity}}` | linesize default 0 (filled); opacity default `vOpacity` | 2012–2036 | Filled/outlined circle; center = current pos via `PLOT_GetXY` |
| `OVAL` | `width height {linesize {opacity}}` | linesize default 0 (filled); opacity default `vOpacity` | 2012–2036 | Filled/outlined ellipse; center = current pos |
| `BOX` | `width height {linesize {opacity}}` | linesize default 0 (filled); opacity default `vOpacity` | 2012–2036 | Filled/outlined rectangle; center = current pos |
| `OBOX` | `width height xradius yradius {linesize {opacity}}` | linesize default 0 (filled); opacity default `vOpacity` | 2012–2036 | Rounded rectangle; center = current pos |
| `TEXTSIZE` | `size` | — | 2037–2038 | Set default text point size (`KeyTextSize`) |
| `TEXTSTYLE` | `style` | signed int (only low byte used) | 2039–2040 | `KeyVal(vTextStyle)` — stores full signed int; only low bits (weight/italic/underline/halign/valign) consumed downstream |
| `TEXTANGLE` | `angle` | degrees 0–359 (Cartesian) or 0–vTwoPi (polar) | 2041–2042 | Set `vTextAngle`; calls `MakeTextAngle` for unit conversion |
| `TEXT` | `{size {style {angle}}} 'string'` | up to 3 optional numeric overrides | 2043–2055 | Render string |
| `LAYER` | `layer 'filename.bmp'` | layer **1–8** | 2056–2062 | Load BMP file into layer; file must exist with `.bmp` extension |
| `CROP` | `layer {left top width height {x y}}` or `layer AUTO x y` | layer **1–8** | 2063–2089 | Composite layer onto canvas; no args = full layer at (0,0) |
| `SPRITEDEF` | `id xsize ysize pixels… colors…` | id **0–255**; xsize,ysize **1–32** each; 256 RGBA color longs | 2090–2101 | Define sprite: xsize×ysize palette-index bytes then 256 RGBA color longs |
| `SPRITE` | `id {orientation {scale {opacity}}}` | id **0–255**; orientation **0–7** default 0; scale **1–64** default 1; opacity **0–255** default `vOpacity` | 2102–2134 | Render sprite at current pos |
| `POLAR` | `{twopi {theta}}` | twopi default `$100000000`; theta default 0 | 2135–2136 | Enable polar mode (`KeyTwoPi`); sets `vPolar`, `vTwoPi`, `vTheta` |
| `CARTESIAN` | `{flipy {flipx}}` | flipy/flipx 0 or 1 | 2137–2142 | Disable polar mode; optionally set `vDirY`, `vDirX` flip flags |
| `CLEAR` | _(none)_ | — | 2143–2144 | Clear canvas to `vBackColor` (`ClearBitmap`) |
| `UPDATE` | _(none)_ | — | 2145–2146 | Flush `Bitmap[0]` to screen (`BitmapToCanvas(0)`) |
| `SAVE` | _(see KeySave)_ | — | 2147–2148 | Write canvas to `<name>.bmp` or desktop region |
| `PC_KEY` | _(none)_ | — | 2149–2150 | Poll keyboard latch → transmit 1 LONG to P2 (`SendKeyPress`) |
| `PC_MOUSE` | _(none)_ | — | 2151–2152 | Transmit 2 LONGs to P2: packed x/y/buttons/wheel + pixel color (`SendMousePos`) |

### Keyboard & mouse

PLOT uses the **shared input model** (see Matrix §4). All nine debug-display windows share identical form-level handlers — there is no PLOT-specific keyboard or mouse logic beyond coordinate mapping.

| Handler | Lines | Behavior |
|---|---|---|
| `WMGetDlgCode` | 585–589 | Captures Tab key (`DLGC_WANTTAB`) |
| `FormMouseMove` | 647–809 (PLOT: 719–724) | Draws live measurement cursor; reports `pixel ÷ DOTSIZE`, honoring `vDirX`/`vDirY` flip flags |
| `FormMouseWheel` | 811–823 | Latches wheel direction ±1 into `vMouseWheel` for 100 ms |
| `FormKeyPress` | 825–831 | Latches key byte into `vKeyPress` for 100 ms |
| `FormKeyDown` | 833–851 | Maps non-printable keys: Left=1, Right=2, Up=3, Down=4, Home=5, End=6, Delete=7, Insert=10, PgUp=11, PgDn=12 |

**`PC_KEY`** (`SendKeyPress`, 3579–3583): transmits 1 LONG = `vKeyPress` byte (0 if none), then clears it.

**`PC_MOUSE`** (`SendMousePos`, 3537–3577): transmits 2 LONGs:
- LONG 1: bits 0–12 = x, bits 13–25 = y, bits 26–27 = wheel, bits 28/29/30 = L/M/R buttons. Sentinel `$03FFFFFF`/`$FFFFFFFF` when cursor is off-window.
- LONG 2: RGB color of pixel under cursor (byte-swapped to `$RRGGBB`).

**PLOT coordinate mapping** (lines 719–724, 3558–3561): reported x = `(ClientWidth − X) ÷ vDotSize` when `vDirX`, else `X ÷ vDotSize`; reported y = `Y ÷ vDotSizeY` when `vDirY`, else `(ClientHeight − Y) ÷ vDotSizeY`.

`HIDEXY` suppresses the on-screen readout; it does **not** disable `PC_MOUSE` reporting.

---

## Receiving types & numeric parity / writer-level bounding (TS-port contract)

> Source: `DebugDisplayUnit.pas` v55. This subsection is the authoritative contract for a faithful TypeScript port: it states the *storage type* of each receiving variable, where geometry is range-checked (at the **writer**, not the parser), and the Delphi-specific numeric behaviors that a port must reproduce.

### Receiving types

| Receiver | Type | Port representation | Source decl |
|---|---|---|---|
| `vOpacity` | `byte` | `& $FF` on store | 341 |
| `vPrecise` | `byte` | `& $FF` on store | 342 |
| `SpritePixels[]` | `byte` (array) | `& $FF` on store | 334 |
| `vTwoPi` | `int64` | **BigInt** in a port (default `$100000000` = 2³² overflows int32) | 315 |
| all other receivers (`vPlotColor`, `vTextColor`, `vBackColor`, `vLineSize`, `vTextStyle`, `vTextAngle`, `vOffsetX/Y`, `vPixelX/Y`, `vTheta`, `vDotSize/Y`, …) | `integer` | signed-32 | 313–353 |
| `val` (the shared parse scratch) | `integer` | signed-32 | 358 |

A directive that stores into a `byte` receiver (`OPACITY`, `PRECISE`, sprite pixels) is **truncated by the store**, not clamped by a `Within` check. A port must mask with `& $FF`, not range-validate.

### Writer-level bounding

Geometry is **not** range-checked when parsed; it is bounded inside the drawing routines:

- **Thickness clamp — 128 px.** `SmoothLine` clamps the (8.8-fixed) radius via `radius1 := Min(radius, maxr shl 8)` with `maxr = 128` (3872). Line, dot, and shape outline thickness therefore saturate at 128 px regardless of the requested `linesize`.
- **Shape dimension rejection.** `SmoothShape` `Exit`s (draws nothing) unless `xs/ys ∈ [1, SmoothFillMax]`, `xro/yro ∈ [0, SmoothFillMax shr 1]`, and `thick ≥ 0` (`SmoothFillMax` = 2048 → `xs/ys ∈ [1,2048]`, `xro/yro ∈ [0,1024]`); see guards 3606–3612. Out-of-range width/height/radius silently produces no shape.
- **Coordinate clipping.** `SmoothFill` clips `y` to `[0, vBitmapHeight)` and trims the run to `[0, vBitmapWidth)` (3783–3792); `SmoothPlot` rejects any pixel outside the bitmap (3815). Coordinates are clipped at draw time, not rejected at parse time.
- **OBOX corner auto-clamp.** A corner radius larger than half the side is reduced to half: `if xro shl 1 > xs then xro := xs shr 1` (and likewise `yro`), 3638.
- **`TEXTANGLE` = `val mod 360`** in Cartesian mode (`a := val mod 360 * 10`, 3076); polar mode uses `val mod vTwoPi`.

### Numeric-parity notes (Delphi → TS)

- **Banker's rounding.** Delphi `Round` uses round-half-to-even. It appears in `PolarToCartesian` (`Round(Yf * rho_x)` / `Round(Xf * rho_x)`, 3069–3070) and in the gamma-corrected alpha blend in `SmoothFill` (3803) and `SmoothPlot` (3827–3829). A port must use banker's rounding here, **not** `Math.round` (round-half-up).
- **Signed `mod`.** Pascal `mod` keeps the sign of the dividend, so a negative `TEXTANGLE` stays negative through `val mod 360`. JS `%` matches this; do not normalize to a positive residue.
- **`shr` is logical** (unsigned) shift — use `>>>` in a port for the `shr` operations, not `>>`.

### Control flow: `Break` vs `Continue` on a missing argument

`PLOT_Update` is a `while NextKey do case val of` loop over the whole directive burst. Many directives `Break` on a missing required argument, which exits the **entire** `case`/`while` and **aborts every remaining directive in the update batch** — not just the current directive. Directives that `Break`-abort the batch include: `SET`, `LINE`, the shape group (`CIRCLE`/`OVAL`/`BOX`/`OBOX`), `TEXT` (missing string), `LAYER`, `CROP`, and `SPRITEDEF`. By contrast `CARTESIAN` and `SPRITE` use `Continue`, which skips only the current directive and keeps processing the rest of the burst.

### COLOR-then-TEXT binding (peek + push-back)

`COLOR` (and the `BLACK..GRAY` named-color shorthand) sets `vPlotColor`, then **peeks** the next key and pushes the pointer back: `if NextKey then begin Dec(ptr); if val = key_text then vTextColor := vPlotColor end` (1938–1941). So a `COLOR` immediately followed by `TEXT` binds the color to the **text** color as well; the `Dec(ptr)` leaves the `TEXT` directive intact for the next loop iteration.

---

## 5. Configuration and Initialization

### 5.1 PLOT_Configure Method

```pascal
procedure TDebugDisplayForm.PLOT_Configure;
var
  i: integer;
begin
  // Set unique defaults
  vDirX := False;
  vDirY := False;
  vOffsetX := 0;
  vOffsetY := 0;
  vPixelX := 0;
  vPixelY := 0;
  vDotSize := 1;
  vDotSizeY := 1;
  vPlotColor := DefaultPlotColor;
  vTextColor := DefaultTextColor;
  vOpacity := $FF;
  vPrecise := 8;
  // Process any parameters
  while NextKey do
  case val of
    key_title:                                        // TITLE 'string'
      KeyTitle;
    key_pos:                                          // POS left top
      KeyPos;
    key_size:                                         // SIZE width height
      KeySize(vWidth, vHeight, plot_wmin, plot_wmax, plot_hmin, plot_hmax);
    key_dotsize:                                      // DOTSIZE x_y y
      if KeyValWithin(vDotSize, 1, 256) then
      begin
        vDotSizeY := vDotSize;
        KeyValWithin(vDotSizeY, 1, 256);
      end;
    key_lut1..key_rgb24:                              // lut1..rgb24
      KeyColorMode;
    key_lutcolors:                                    // LUTCOLORS
      KeyLutColors;
    key_backcolor:                                    // BACKCOLOR color
      KeyColor(vBackColor);
    key_update:                                       // UPDATE
      vUpdate := True;
    key_hidexy:                                       // HIDEXY
      vHideXY := True;
  end;
  // Set up layer bitmaps
  for i := 0 to plot_layermax - 1 do PlotBitmap[i] := TBitmap.Create;
  // Clear sprite data
  FillChar(SpritePixels, SizeOf(SpritePixels), 0);
  FillChar(SpriteColors, SizeOf(SpriteColors), 0);
  FillChar(SpriteSizeX, SizeOf(SpriteSizeX), 0);
  FillChar(SpriteSizeY, SizeOf(SpriteSizeY), 0);
  // Set initial form size
  SetSize(0, 0, 0, 0);
end;
```

**Source Location**: Lines 1864–1916

### 5.2 Configuration Parameters

> **v55:** Only the directives below are parsed in `PLOT_Configure`. `POLAR`, `CARTESIAN`, `TEXTSIZE`, `SAMPLES`, and `RATE` are **not** config-phase directives — they are update-phase only.

| Parameter | Command | Default | Range | Purpose |
|-----------|---------|---------|-------|---------|
| Title | `TITLE 'string'` | "Plot" | - | Window title |
| Position | `POS x y` | Cascaded | Screen coords | Window position |
| Size | `SIZE width height` | **256 × 256** | 32–2048 | Canvas dimensions (default from global `SetDefaults` 2884–2885; `PLOT_Configure` does not override) |
| Dot Size | `DOTSIZE x {y}` | 1 × 1 | **1–256** | Pixel scaling (v55: `1891-1894`) |
| Color mode | `LUT1`…`RGB24` | - | - | Initial color mode |
| LUT Colors | `LUTCOLORS rgb24...` | - | 256 colors | Palette for LUT modes |
| Back Color | `BACKCOLOR color` | Black | RGB24 | Background color |
| Update Mode | `UPDATE` | Auto | - | Manual update mode |
| Hide XY | `HIDEXY` | Show | - | Hide mouse coordinates |

### 5.3 Initialization Sequence

**Step 1**: Set default values
```pascal
vDirX := False;               // No X direction flip
vDirY := False;               // No Y direction flip
vOffsetX := 0;                // Origin at (0, 0)
vOffsetY := 0;
vPixelX := 0;                 // Current position
vPixelY := 0;
vDotSize := 1;                // No scaling
vDotSizeY := 1;
vPlotColor := DefaultPlotColor;
vTextColor := DefaultTextColor;
vOpacity := $FF;              // Fully opaque
vPrecise := 8;                // Sub-pixel precision
```

**Step 2**: Process configuration commands
- Parse element array for configuration parameters
- Override defaults with user-specified values

**Step 3**: Create layer bitmaps and clear sprite data
```pascal
for i := 0 to plot_layermax - 1 do PlotBitmap[i] := TBitmap.Create;
FillChar(SpritePixels, SizeOf(SpritePixels), 0);
FillChar(SpriteColors, SizeOf(SpriteColors), 0);
FillChar(SpriteSizeX, SizeOf(SpriteSizeX), 0);
FillChar(SpriteSizeY, SizeOf(SpriteSizeY), 0);
```

**Step 4**: Initialize display canvas
```pascal
SetSize(0, 0, 0, 0);          // Create window with canvas size
```

> **v55 note:** `PixelFormat := pf32bit` is **not** set on layer bitmaps in v55, and `ClearBitmap` is **not** called during configure. The initial canvas is cleared by `SetSize`.


---

## 6. Coordinate System

The PLOT window features a sophisticated dual-mode coordinate system with origin control, direction flipping, and precision modes.

### 6.1 Cartesian Mode

**Default Mode**: Cartesian coordinates with origin at (0, 0) in top-left corner.

**Standard Configuration**:
```pascal
vPolar := False;
vDirX := False;               // X increases rightward
vDirY := False;               // Y increases downward
vOffsetX := 0;                // Origin at top-left
vOffsetY := 0;
```

**Coordinate Transformation**:

```pascal
// From PLOT_GetXY (lines 2157-2167)
if vDirX then
  screen_x := vWidth - 1 - vOffsetX - vPixelX
else
  screen_x := vOffsetX + vPixelX;

if vDirY then
  screen_y := vOffsetY + vPixelY
else
  screen_y := vHeight - 1 - vOffsetY - vPixelY;
```

**Transformation Formula**:
```
No flip:    screen_x = vOffsetX + vPixelX
            screen_y = (vHeight - 1 - vOffsetY) - vPixelY

X flip:     screen_x = (vWidth - 1 - vOffsetX) - vPixelX
            screen_y = (vHeight - 1 - vOffsetY) - vPixelY

Y flip:     screen_x = vOffsetX + vPixelX
            screen_y = vOffsetY + vPixelY

Both flip:  screen_x = (vWidth - 1 - vOffsetX) - vPixelX
            screen_y = vOffsetY + vPixelY
```

**Cartesian Command**:
```
CARTESIAN {flipy {flipx}}
```

- `flipy`: 0 = Y increases downward (default), 1 = Y increases upward
- `flipx`: 0 = X increases rightward (default), 1 = X increases leftward

**Example**:
```
CARTESIAN 1 0         // Mathematical convention: Y up, X right
ORIGIN 256 256        // Center origin
SET 100 100           // Point at (100, 100) relative to center
```

### 6.2 Polar Mode

**Activation**: `POLAR {twopi {theta}}`

**Configuration**:
```pascal
vPolar := True;
vTwoPi := $100000000;         // Default full circle value
vTheta := 0;                  // Default angular offset
```

**TwoPi Parameter**:
- Defines the numeric value representing a full circle (360°)
- Default: `$100000000` (4,294,967,296)
- Special values:
  - `-1`: Sets vTwoPi to `-$100000000` (clockwise rotation)
  - `0`: Sets vTwoPi to `$100000000` (counter-clockwise)
  - Other: Custom full-circle value

**Theta Parameter**:
- Angular offset added to all theta coordinates
- Allows rotation of the entire coordinate system

**Polar to Cartesian Conversion**:

```pascal
// From PolarToCartesian (lines 3063-3071)
procedure TDebugDisplayForm.PolarToCartesian(var rho_x, theta_y: integer);
var
  Tf, Xf, Yf: extended;
begin
  Tf := (Int64(theta_y) + Int64(vTheta)) / vTwoPi * Pi * 2;
  SinCos(Tf, Yf, Xf);
  theta_y := Round(Yf * rho_x);
  rho_x := Round(Xf * rho_x);
end;
```

**Conversion Formula**:
```
angle_radians = ((theta + vTheta) / vTwoPi) × 2π
x = rho × cos(angle_radians)
y = rho × sin(angle_radians)
```

**Usage Example**:
```
POLAR $100 0          // Full circle = 256, no offset
SET 100 64            // Rho = 100, Theta = 64 (90° if twopi=256)
```

**Polar Coordinates with Default TwoPi**:
```
Theta Value    Angle (degrees)
-----------    ---------------
0              0°
$40000000      90°
$80000000      180°
$C0000000      270°
$100000000     360° (wraps to 0°)
```

### 6.3 Origin Control

**ORIGIN Command**: Sets the coordinate origin point.

**Syntax**:
```
ORIGIN {x y}
```

**Behavior** (lines 1950-1956):
```pascal
key_origin:
  if KeyVal(vOffsetX) then KeyVal(vOffsetY)
  else
  begin
    vOffsetX := vPixelX;
    vOffsetY := vPixelY;
  end;
```

**Two Modes**:

1. **Explicit Origin**: `ORIGIN x y`
   - Sets origin to specific coordinates
   - Example: `ORIGIN 128 128` (center of the default 256×256 canvas)

2. **Current Position Origin**: `ORIGIN`
   - Sets origin to current drawing position (vPixelX, vPixelY)
   - Example:
     ```
     SET 100 100
     ORIGIN          // Origin now at (100, 100)
     ```

> **Partial `ORIGIN x` (no y):** `if KeyVal(vOffsetX) then KeyVal(vOffsetY)` (1950–1956). If `x` parses but `y` is absent, `vOffsetX` is updated while `vOffsetY` **retains its prior value** (the inner `KeyVal` simply fails and leaves it unchanged). It does **not** fall into the no-args branch and does **not** copy `vPixelY`.

**Effect on Subsequent Commands**:
- All drawing commands use coordinates relative to the origin
- Allows easy creation of coordinate-system-centered graphics
- Origin can be repositioned dynamically

### 6.4 Position Control

**SET Command**: Sets the current drawing position.

**Syntax**:
```
SET x_rho y_theta
```

**Behavior** (lines 1957-1964):
```pascal
key_set:
begin
  if not KeyVal(t1) then Break;
  if not KeyVal(t2) then Break;
  if vPolar then PolarToCartesian(t1, t2);
  vPixelX := t1;
  vPixelY := t2;
end;
```

**Processing**:
1. Read x/rho coordinate
2. Read y/theta coordinate
3. If in polar mode, convert (rho, theta) to (x, y)
4. Update current position

**Position Persistence**:
- Current position is maintained across commands
- Some commands (LINE, shapes) update the position
- DOT uses position but doesn't change it

### 6.5 Precision Mode

**PRECISE Command**: Toggles sub-pixel precision mode.

**Syntax**:
```
PRECISE
```

**Behavior** (lines 1946-1947):
```pascal
key_precise:
  vPrecise := vPrecise xor 8;
```

**States**:
- `vPrecise = 8`: Sub-pixel precision **enabled** (default)
  - Coordinates use 8.8 fixed-point format
  - Position stored with 1/256th pixel resolution
  - Anti-aliasing fully effective

- `vPrecise = 0`: Sub-pixel precision **disabled**
  - Coordinates use whole pixels
  - Faster rendering for pixel-aligned graphics
  - Anti-aliasing still applies but with pixel-aligned positioning

**Fixed-Point Coordinate Calculation** (example from DOT, lines 1970-1978):
```pascal
if vDirX then
  t3 := (vWidth - 1 - vOffsetX) shl 8 - vPixelX shl vPrecise
else
  t3 := vOffsetX shl 8 + vPixelX shl vPrecise;

if vDirY then
  t4 := vOffsetY shl 8 + vPixelY shl vPrecise
else
  t4 := (vHeight - 1 - vOffsetY) shl 8 - vPixelY shl vPrecise;
```

**Precision Effect**:
```
When vPrecise = 8:
  coord_fixed = (offset shl 8) + (pixel shl 8)
  Result: 8.8 fixed-point (256 subpixels per pixel)

When vPrecise = 0:
  coord_fixed = (offset shl 8) + (pixel shl 0)
  Result: whole pixels (pixel is not shifted)
```

**Usage**:
```
PRECISE           // Toggle precision
DOT               // Draw with current precision
PRECISE           // Toggle back
```

---

## 7. Drawing Primitives

The PLOT window provides six fundamental drawing primitives, all with anti-aliased rendering support.

### 7.1 DOT Command

**Purpose**: Draw a circular dot at the current position.

**Syntax**:
```
DOT {linesize {opacity}}
```

**Parameters**:
- `linesize`: Diameter in pixels (default: vLineSize)
- `opacity`: Alpha value 0-255 (default: vOpacity)

**Implementation** (lines 1965-1979):
```pascal
key_dot:
begin
  t1 := vLineSize;
  t2 := vOpacity;
  if KeyVal(t1) then KeyVal(t2);
  if vDirX then
    t3 := (vWidth - 1 - vOffsetX) shl 8 - vPixelX shl vPrecise
  else
    t3 := vOffsetX shl 8 + vPixelX shl vPrecise;
  if vDirY then
    t4 := vOffsetY shl 8 + vPixelY shl vPrecise
  else
    t4 := (vHeight - 1 - vOffsetY) shl 8 - vPixelY shl vPrecise;
  SmoothDot(t3, t4, t1 shl vPrecise shr 1, vPlotColor, t2);
end;
```

**Coordinate Transformation**:
1. Convert user coordinates (vPixelX, vPixelY) to screen coordinates
2. Apply origin offset (vOffsetX, vOffsetY)
3. Apply direction flipping (vDirX, vDirY)
4. Shift to 8.8 fixed-point format (multiply by 256)
5. Apply precision mode (shift by vPrecise)

**Radius Calculation**:
```pascal
radius = (linesize shl vPrecise) shr 1
```
- Converts diameter to radius
- Applies precision scaling

**Current Position**:
- DOT does **not** modify vPixelX or vPixelY
- Position remains unchanged after drawing

**Example**:
```
COLOR BLUE
SET 100 100
DOT 10 128            // Semi-transparent blue dot, diameter 10
```

### 7.2 LINE Command

**Purpose**: Draw a line from the current position to a new position.

**Syntax**:
```
LINE x_rho y_theta {linesize {opacity}}
```

**Parameters**:
- `x_rho`: Destination X coordinate (or rho in polar mode)
- `y_theta`: Destination Y coordinate (or theta in polar mode)
- `linesize`: Line thickness in pixels (default: vLineSize)
- `opacity`: Alpha value 0-255 (default: vOpacity)

**Implementation** (lines 1980-2011):
```pascal
key_line:
begin
  if not KeyVal(t1) then Break;
  if not KeyVal(t2) then Break;
  t3 := vLineSize;
  t4 := vOpacity;
  if KeyVal(t3) then KeyVal(t4);
  if vPolar then PolarToCartesian(t1, t2);
  if vDirX then
  begin
    t5 := (vWidth - 1 - vOffsetX) shl 8 - vPixelX shl vPrecise;
    t7 := (vWidth - 1 - vOffsetX) shl 8 -      t1 shl vPrecise;
  end
  else
  begin
    t5 := vOffsetX shl 8 + vPixelX shl vPrecise;
    t7 := vOffsetX shl 8 +      t1 shl vPrecise;
  end;
  if vDirY then
  begin
    t6 := vOffsetY shl 8 + vPixelY shl vPrecise;
    t8 := vOffsetY shl 8 +      t2 shl vPrecise;
  end
  else
  begin
    t6 := (vHeight - 1 - vOffsetY) shl 8 - vPixelY shl vPrecise;
    t8 := (vHeight - 1 - vOffsetY) shl 8 -      t2 shl vPrecise;
  end;
  SmoothLine(t5, t6, t7, t8, t3 shl vPrecise shr 1, vPlotColor, t4);
  vPixelX := t1;
  vPixelY := t2;
end;
```

**Processing Steps**:
1. Read destination coordinates (t1, t2)
2. Read optional linesize and opacity
3. If polar mode: convert (rho, theta) to (x, y)
4. Transform start point (vPixelX, vPixelY) to screen coordinates (t5, t6)
5. Transform end point (t1, t2) to screen coordinates (t7, t8)
6. Call SmoothLine with fixed-point coordinates
7. **Update current position** to destination (t1, t2)

**Current Position Update**:
- LINE **modifies** vPixelX and vPixelY to the destination
- Enables chained line drawing without redundant SET commands

**Example**:
```
SET 0 0
LINE 100 0            // Horizontal line from (0,0) to (100,0)
LINE 100 100          // Vertical line from (100,0) to (100,100)
LINE 0 100            // Horizontal line from (100,100) to (0,100)
LINE 0 0              // Vertical line from (0,100) to (0,0) - completes square
```

### 7.3 CIRCLE Command

**Purpose**: Draw a circle centered at the current position.

**Syntax**:
```
CIRCLE width {linesize {opacity}}
```

**Parameters**:
- `width`: Circle diameter in pixels
- `linesize`: Outline thickness (0 = filled, >0 = outline) (default: 0)
- `opacity`: Alpha value 0-255 (default: vOpacity)

**Implementation** (lines 2012-2036):
```pascal
key_circle,
key_oval,
key_box,
key_obox:
begin
  t := val;
  PLOT_GetXY(t1, t2);
  if not KeyVal(t3) then Break;
  if t <> key_circle then
    if not KeyVal(t4) then Break;
  if t = key_obox then
  begin
    if not KeyVal(t5) then Break;
    if not KeyVal(t6) then Break;
  end;
  t7 := 0;
  t8 := vOpacity;
  if KeyVal(t7) then KeyVal(t8);
  case t of
    key_circle: SmoothShape(t1, t2, t3, t3, t3 shr 1, t3 shr 1, t7, vPlotColor, t8);
    key_oval:   SmoothShape(t1, t2, t3, t4, t3 shr 1, t4 shr 1, t7, vPlotColor, t8);
    key_box:    SmoothShape(t1, t2, t3, t4, 0, 0, t7, vPlotColor, t8);
    key_obox:   SmoothShape(t1, t2, t3, t4, t5, t6, t7, vPlotColor, t8);
  end;
end;
```

**SmoothShape Call for CIRCLE**:
```pascal
SmoothShape(x, y, width, height, xradius, yradius, linesize, color, opacity)
SmoothShape(t1, t2, t3,   t3,    t3>>1,   t3>>1,   t7,       vPlotColor, t8)
```

**Parameters to SmoothShape**:
- `x, y`: Center position (from PLOT_GetXY)
- `width = height = t3`: Circle diameter
- `xradius = yradius = t3 >> 1`: Full rounding (half of diameter = radius)
- `linesize = t7`: Outline thickness (0 = filled)
- `color`: vPlotColor
- `opacity = t8`: Alpha value

**Example**:
```
COLOR RED
SET 256 256
CIRCLE 100 0 255      // Filled red circle, diameter 100, fully opaque
CIRCLE 120 5 255      // Red circle outline, diameter 120, thickness 5
```

### 7.4 OVAL Command

**Purpose**: Draw an oval (ellipse) centered at the current position.

**Syntax**:
```
OVAL width height {linesize {opacity}}
```

**Parameters**:
- `width`: Oval width (horizontal diameter)
- `height`: Oval height (vertical diameter)
- `linesize`: Outline thickness (0 = filled)
- `opacity`: Alpha value 0-255

**SmoothShape Call for OVAL**:
```pascal
SmoothShape(t1, t2, t3, t4, t3>>1, t4>>1, t7, vPlotColor, t8)
```

**Parameters**:
- `width = t3`, `height = t4`: Oval dimensions
- `xradius = t3 >> 1`: Horizontal radius (full rounding)
- `yradius = t4 >> 1`: Vertical radius (full rounding)

**Example**:
```
COLOR GREEN
SET 256 256
OVAL 200 100 0 255    // Filled green ellipse, 200×100
```

### 7.5 BOX Command

**Purpose**: Draw a rectangle centered at the current position.

**Syntax**:
```
BOX width height {linesize {opacity}}
```

**Parameters**:
- `width`: Rectangle width
- `height`: Rectangle height
- `linesize`: Outline thickness (0 = filled)
- `opacity`: Alpha value 0-255

**SmoothShape Call for BOX**:
```pascal
SmoothShape(t1, t2, t3, t4, 0, 0, t7, vPlotColor, t8)
```

**Parameters**:
- `width = t3`, `height = t4`: Rectangle dimensions
- `xradius = 0`, `yradius = 0`: No corner rounding (sharp corners)

**Example**:
```
COLOR BLUE
SET 100 100
BOX 80 60 0 255       // Filled blue rectangle, 80×60
BOX 90 70 3 128       // Semi-transparent blue outline, thickness 3
```

### 7.6 OBOX Command

**Purpose**: Draw a rounded rectangle (box with rounded corners) centered at the current position.

**Syntax**:
```
OBOX width height xradius yradius {linesize {opacity}}
```

**Parameters**:
- `width`: Rectangle width
- `height`: Rectangle height
- `xradius`: Horizontal corner radius
- `yradius`: Vertical corner radius
- `linesize`: Outline thickness (0 = filled)
- `opacity`: Alpha value 0-255

**SmoothShape Call for OBOX**:
```pascal
SmoothShape(t1, t2, t3, t4, t5, t6, t7, vPlotColor, t8)
```

**Parameters**:
- `width = t3`, `height = t4`: Rectangle dimensions
- `xradius = t5`, `yradius = t6`: Corner rounding radii

**Example**:
```
COLOR YELLOW
SET 256 256
OBOX 100 80 10 10 0 255    // Filled rounded rectangle, 10-pixel corner radius
OBOX 120 100 15 15 4 200   // Rounded outline, thickness 4, corner radius 15
```

### 7.7 SmoothShape Method

All shape primitives ultimately call the `SmoothShape` method for anti-aliased rendering.

**Signature**:
```pascal
procedure SmoothShape(x, y, w, h, rx, ry, t: integer; c: integer; opa: integer);
```

**Parameters**:
- `x, y`: Center position (pixel coordinates, not fixed-point)
- `w`: Width
- `h`: Height
- `rx`: X-axis corner radius (0 = sharp corners)
- `ry`: Y-axis corner radius (0 = sharp corners)
- `t`: Outline thickness (0 = filled shape)
- `c`: Color (RGB24 format)
- `opa`: Opacity (0-255)

**Rendering Algorithm** (lines 3590–3743):

The SmoothShape method implements a sophisticated anti-aliased rendering algorithm:

1. **Bounding Box Calculation**:
   - Determine pixel bounds based on shape dimensions
   - Expand bounds for anti-aliasing coverage

2. **Distance Field Calculation**:
   - For each pixel, compute distance to shape boundary
   - Handle corner rounding using distance from corner centers

3. **Outline vs. Fill**:
   - If `t = 0`: Filled shape (distance < 0 = inside)
   - If `t > 0`: Outline (abs(distance) < t/2 = on stroke)

4. **Anti-Aliasing**:
   - Sub-pixel coverage calculation using distance
   - Gamma-corrected alpha blending

5. **Pixel Compositing**:
   - Blend shape color with existing pixel color based on coverage

**Performance**:
- Per-pixel distance calculations
- More expensive than simple filled rectangles
- Optimized with bounding box culling

---

## 8. Text Rendering System

The PLOT window features a sophisticated text rendering system with support for arbitrary rotation angles, font styles, and precise alignment control.

### 8.1 TEXT Command

**Purpose**: Render a text string at the current position.

**Syntax**:
```
TEXT {size {style {angle}}} 'string'
```

**Parameters**:
- `size`: Font size in points (default: vTextSize)
- `style`: Style encoding byte (default: vTextStyle)
- `angle`: Rotation angle (default: vTextAngle)
- `string`: Text to render

**Implementation** (lines 2043-2055):
```pascal
key_text:
begin
  a[0] := vTextSize;
  a[1] := vTextStyle;
  a[2] := vTextAngle;
  for i := 0 to 2 do if not KeyVal(a[i]) then Break else if i=2 then MakeTextAngle(a[2]);
  if NextStr then s := PChar(val) else Break;
  Bitmap[0].Canvas.Font.Size := a[0];
  Bitmap[0].Canvas.Brush.Style := bsClear;
  Bitmap[0].Canvas.Font.Color := WinRGB(vTextColor);
  PLOT_GetXY(t1, t2);
  AngleTextOut(t1, t2, s, a[1], a[2]);
end;
```

**Processing Steps**:
1. Load default values for size, style, angle
2. Read optional parameters (each parameter is optional)
3. If angle provided, convert to Windows angle format
4. Read text string
5. Set canvas font properties
6. Get screen coordinates for current position
7. Call AngleTextOut to render rotated text

**Example**:
```
COLOR WHITE
SET 256 256
TEXT 'Hello World'                    // Default size, style, angle
TEXT 16 'Large Text'                  // Size 16, default style and angle
TEXT 12 $87 90 'Rotated'              // Size 12, bold+italic+underlined, 90° rotation
```

### 8.2 Text Style Encoding

The `vTextStyle` variable is a full signed `integer` (decl 340); the style attributes are packed into its low byte (higher bits are stored but unused):

| Bits | Mask | Field | Values | Meaning |
|------|------|-------|--------|---------|
| 0-1 | $03 | Weight | 0-3 | Font weight |
| 2 | $04 | Italic | 0-1 | Italic style |
| 3 | $08 | Underline | 0-1 | Underline |
| 4-5 | $30 | H-Align | 0-3 | Horizontal alignment |
| 6-7 | $C0 | V-Align | 0-3 | Vertical alignment |

**Weight Values** (bits 0-1):
```pascal
const weight: array [0..3] of integer = (100, 400, 700, 900);
```

| Value | Weight | Appearance |
|-------|--------|------------|
| 0 | 100 | Thin |
| 1 | 400 | Normal |
| 2 | 700 | Bold |
| 3 | 900 | Heavy |

**Italic** (bit 2):
- 0 = Normal (upright)
- 1 = Italic (slanted)

**Underline** (bit 3):
- 0 = No underline
- 1 = Underlined

**Horizontal Alignment** (bits 4-5):
```pascal
case style and $30 shr 4 of
  0, 1: tx := -w / 2;        // Center (default)
  2:    tx := 0;             // Left-aligned
  3:    tx := -w;            // Right-aligned
end;
```

| Value | Alignment | Offset |
|-------|-----------|--------|
| 0, 1 | Center | -width/2 |
| 2 | Left | 0 |
| 3 | Right | -width |

**Vertical Alignment** (bits 6-7):
```pascal
case style and $C0 shr 6 of
  0, 1: ty := h / 2;         // Center (default)
  2:    ty := h;             // Top-aligned
  3:    ty := 0;             // Bottom-aligned
end;
```

| Value | Alignment | Offset |
|-------|-----------|--------|
| 0, 1 | Center | +height/2 |
| 2 | Top | +height |
| 3 | Bottom | 0 |

**Style Examples**:
```
$00 = Thin, normal, no underline, centered
$02 = Thin, normal, no underline, centered (same as 0)
$04 = Thin, italic, no underline, centered
$0A = Normal weight, bold, underlined, centered
$20 = Thin, normal, no underline, left-aligned, centered vertically
$C0 = Thin, normal, no underline, centered horizontally, bottom-aligned
$87 = Heavy, bold, italic, underlined, centered
```

### 8.3 Text Angle Conversion

**MakeTextAngle Method** (lines 3073–3077):

```pascal
procedure TDebugDisplayForm.MakeTextAngle(var a: integer);
begin
  if vPolar then a := Round(val mod vTwoPi / vTwoPi * 3600)
  else a := val mod 360 * 10;
end;
```

**Two Modes**:

**Cartesian Mode** (vPolar = False):
- Input: Angle in degrees (0-359)
- Output: Angle in tenths of degrees (0-3590)
- Formula: `output = (input mod 360) × 10`
- Example: `90` → `900` (90.0°)

**Polar Mode** (vPolar = True):
- Input: Angle in vTwoPi units
- Output: Angle in tenths of degrees (0-3590)
- Formula: `output = ((input mod vTwoPi) / vTwoPi) × 3600`
- Example (vTwoPi = $100): `$40` → `900` (90.0°)

**Windows Angle Format**:
- Windows expects angles in tenths of degrees
- 0 = horizontal, left-to-right
- 900 = vertical, bottom-to-top
- 1800 = horizontal, right-to-left
- 2700 = vertical, top-to-bottom

### 8.4 AngleTextOut Method

**Signature**:
```pascal
procedure AngleTextOut(x, y: integer; s: string; style, angle: integer);
```

**Implementation** (lines 3483–3520):

```pascal
procedure TDebugDisplayForm.AngleTextOut(x, y: integer; s: string; style, angle: integer);
const
  weight: array [0..3] of integer = (100, 400, 700, 900);
var
  w, h, rx, ry: integer;
  tx, ty, ta: extended;
begin
  // Make new logical font
  GetObject(Bitmap[0].Canvas.Font.Handle, SizeOf(NewLogFont), Addr(NewLogFont));
  NewLogFont.lfEscapement := angle;
  NewLogFont.lfOrientation := angle;
  NewLogFont.lfWeight := weight[style and 3];
  NewLogFont.lfItalic := style and $04 shr 2;
  NewLogFont.lfUnderline := style and $08 shr 3;
  NewFontHandle := CreateFontIndirect(NewLogFont);
  OldFontHandle := SelectObject(Bitmap[0].Canvas.Handle, NewFontHandle);

  // Compute metrics
  w := Bitmap[0].Canvas.TextWidth(s);
  h := Bitmap[0].Canvas.TextHeight(s);
  case style and $30 shr 4 of
    0, 1: tx := -w / 2;
    2:    tx := 0;
    3:    tx := -w;
  end;
  case style and $C0 shr 6 of
    0, 1: ty := h / 2;
    2:    ty := h;
    3:    ty := 0;
  end;
  ta := angle / 3600 * 2 * Pi;
  rx := Round(tx * cos(ta) - ty * sin(ta));
  ry := Round(tx * sin(ta) + ty * cos(ta));

  // Output text
  Bitmap[0].Canvas.TextOut(x + rx, y - ry, s);

  // Delete logical font
  NewFontHandle := SelectObject(Bitmap[0].Canvas.Handle, OldFontHandle);
  DeleteObject(NewFontHandle);
end;
```

**Processing Steps**:

**Step 1: Create Rotated Font**
```pascal
GetObject(Bitmap[0].Canvas.Font.Handle, SizeOf(NewLogFont), Addr(NewLogFont));
NewLogFont.lfEscapement := angle;
NewLogFont.lfOrientation := angle;
NewLogFont.lfWeight := weight[style and 3];
NewLogFont.lfItalic := style and $04 shr 2;
NewLogFont.lfUnderline := style and $08 shr 3;
NewFontHandle := CreateFontIndirect(NewLogFont);
```

- Copy current font properties
- Set escapement and orientation to rotation angle
- Extract weight, italic, underline from style byte
- Create new logical font

**Step 2: Compute Text Metrics**
```pascal
w := Bitmap[0].Canvas.TextWidth(s);
h := Bitmap[0].Canvas.TextHeight(s);
```

- Measure text width and height (unrotated)

**Step 3: Calculate Alignment Offset**
```pascal
case style and $30 shr 4 of
  0, 1: tx := -w / 2;       // Center
  2:    tx := 0;            // Left
  3:    tx := -w;           // Right
end;
case style and $C0 shr 6 of
  0, 1: ty := h / 2;        // Center
  2:    ty := h;            // Top
  3:    ty := 0;            // Bottom
end;
```

- Calculate offset for horizontal and vertical alignment
- Offset is relative to text bounding box

**Step 4: Rotate Alignment Offset**
```pascal
ta := angle / 3600 * 2 * Pi;
rx := Round(tx * cos(ta) - ty * sin(ta));
ry := Round(tx * sin(ta) + ty * cos(ta));
```

- Convert angle to radians
- Apply 2D rotation matrix to alignment offset
- Rotation formula:
  ```
  rx = tx × cos(θ) - ty × sin(θ)
  ry = tx × sin(θ) + ty × cos(θ)
  ```

**Step 5: Render Text**
```pascal
Bitmap[0].Canvas.TextOut(x + rx, y - ry, s);
```

- Output text at position adjusted by rotated offset
- Note: Y offset is negated (screen Y increases downward)

**Step 6: Cleanup**
```pascal
NewFontHandle := SelectObject(Bitmap[0].Canvas.Handle, OldFontHandle);
DeleteObject(NewFontHandle);
```

- Restore original font
- Delete temporary logical font

**Alignment Visualization**:

```
Center-aligned text at (x, y):

  Before rotation:         After 45° rotation:

       w                        ╱
  ┌─────────┐                  ╱ w
  │  TEXT   │   h             ╱    ╲
  └─────────┘                ╱      ╲ h

  Offset: (-w/2, h/2)       Offset rotated by 45°
```

### 8.5 Text Command Variants

**TEXTSIZE Command**: Set default text size.
```
TEXTSIZE size
```

**TEXTSTYLE Command**: Set default text style.
```
TEXTSTYLE style
```

**TEXTANGLE Command**: Set default text angle.
```
TEXTANGLE angle
```

**Example Usage**:
```
TEXTSIZE 14
TEXTSTYLE $06            // Bold italic
TEXTANGLE 45             // 45° rotation
COLOR RED
SET 100 100
TEXT 'Hello'             // Uses defaults: 14pt, bold italic, 45°
TEXT 12 'World'          // Override size: 12pt, bold italic, 45°
```

---

## 9. Layer System

The PLOT window supports up to 8 independent bitmap layers that can be loaded from external files and composited onto the main canvas.

### 9.1 Layer Architecture

**Layer Bitmaps**:
```pascal
PlotBitmap: array[0..plot_layermax - 1] of TBitmap;  // 8 layers (0-7)
```

**Initialization** (PLOT_Configure, line 1908):
```pascal
for i := 0 to plot_layermax - 1 do PlotBitmap[i] := TBitmap.Create;
```

> **v55 note:** `PixelFormat := pf32bit` is not set in v55.

**Characteristics**:
- Each layer is an independent TBitmap object
- Layers can have arbitrary dimensions
- Layers persist until replaced or window closed

### 9.2 LAYER Command

**Purpose**: Load a bitmap file into a layer.

**Syntax**:
```
LAYER layer 'filename.bmp'
```

**Parameters**:
- `layer`: Layer index (1-8)
- `filename`: Path to BMP file (must have .bmp extension)

**Implementation** (lines 2056-2062):
```pascal
key_layer:
begin
  if not KeyValWithin(t1, 1, plot_layermax) then Break;
  if not NextStr then Break;
  if not (FileExists(pChar(val)) and (ExtractFileExt(pChar(val)) = '.bmp')) then Break;
  PlotBitmap[t1 - 1].LoadFromFile(PChar(val));
end;
```

**Processing**:
1. Read layer index (1-8)
2. Read filename string
3. Validate file exists and has .bmp extension
4. Load BMP file into layer bitmap (index = layer - 1)

**File Requirements**:
- Must be Windows BMP format
- File must exist on disk
- Extension must be `.bmp` (case-sensitive)

**Example**:
```
LAYER 1 'background.bmp'
LAYER 2 'overlay.bmp'
```

### 9.3 CROP Command

**Purpose**: Composite a layer bitmap onto the main canvas.

**Syntax**:
```
CROP layer {left top width height {x y}}
CROP layer AUTO x y
```

**Two Modes**:

**Mode 1: Full Layer Copy**
```
CROP layer
```
- Copies entire layer to canvas at position (0, 0)

**Mode 2: Manual Crop**
```
CROP layer left top width height {x y}
```
- Copies a rectangular region from the layer
- `left, top`: Source coordinates in layer bitmap
- `width, height`: Region dimensions
- `x, y`: Destination coordinates in canvas (default: left, top)

**Mode 3: Auto Crop**
```
CROP layer AUTO x y
```
- Copies entire layer to canvas at position (x, y)

**Implementation** (lines 2063-2089):
```pascal
key_crop:
begin
  if not KeyValWithin(t1, 1, plot_layermax) then Break;
  t2 := 0;              // layer-bitmap source coordinates
  t3 := 0;
  t4 := PlotBitmap[t1 - 1].Width;
  t5 := PlotBitmap[t1 - 1].Height;
  t6 := 0;              // plot-bitmap destination coordinates
  t7 := 0;
  if KeyIs(key_auto) then
  begin
    if not KeyValWithin(t6, 0, vBitMapWidth) then Break;
    if not KeyValWithin(t7, 0, vBitmapHeight) then Break;
  end
  else
  if KeyValWithin(t2, 0, PlotBitmap[t1 - 1].Width) then
  begin
    if not KeyValWithin(t3, 0, PlotBitmap[t1 - 1].Height) then Break;
    if not KeyValWithin(t4, 0, PlotBitmap[t1 - 1].Width) then Break;
    if not KeyValWithin(t5, 0, PlotBitmap[t1 - 1].Height) then Break;
    t6 := t2;
    t7 := t3;
    if KeyValWithin(t6, 0, vBitMapWidth) then
      if not KeyValWithin(t7, 0, vBitMapHeight) then Break;
  end;
  Bitmap[0].Canvas.CopyRect(Rect(t6, t7, t6 + t4, t7 + t5),
                            PlotBitmap[t1 - 1].Canvas,
                            Rect(t2, t3, t2 + t4, t3 + t5));
end;
```

**Variable Mapping**:
- `t1`: Layer index (1-8)
- `t2`: Source left
- `t3`: Source top
- `t4`: Width
- `t5`: Height
- `t6`: Destination x
- `t7`: Destination y

> **Bounding (writer-level):** every CROP coordinate is read with `KeyValWithin`, so the source rect is clamped to the **layer bitmap** size (`PlotBitmap[t1-1].Width/.Height`, 2078–2082) and the destination is clamped to the **canvas** size (`vBitMapWidth`/`vBitmapHeight`). An out-of-range value past the first that already parsed causes a `Break`, which aborts the whole update batch (see "Receiving types & writer-level bounding" subsection).

**Default Behavior**:
```
CROP layer
```
Translates to:
```pascal
t2 := 0;  t3 := 0;                        // Source: top-left
t4 := PlotBitmap[layer].Width;            // Full width
t5 := PlotBitmap[layer].Height;           // Full height
t6 := 0;  t7 := 0;                        // Destination: top-left
```

**Auto Mode**:
```
CROP layer AUTO x y
```
Translates to:
```pascal
t2 := 0;  t3 := 0;                        // Source: top-left
t4 := PlotBitmap[layer].Width;            // Full width
t5 := PlotBitmap[layer].Height;           // Full height
t6 := x;  t7 := y;                        // Destination: (x, y)
```

**Manual Crop**:
```
CROP layer left top width height x y
```
Translates to:
```pascal
t2 := left;  t3 := top;                   // Source region
t4 := width; t5 := height;
t6 := x;     t7 := y;                     // Destination
```

**Compositing Method**:
```pascal
Bitmap[0].Canvas.CopyRect(DstRect, SrcCanvas, SrcRect);
```

- Windows `CopyRect` performs pixel-perfect copy
- No scaling (source and destination rectangles must match dimensions)
- Alpha blending depends on bitmap pixel format

**Example Usage**:
```
// Load background and foreground layers
LAYER 1 'background.bmp'
LAYER 2 'icon.bmp'

// Composite full background
CROP 1

// Composite icon at position (100, 100)
CROP 2 AUTO 100 100

// Composite cropped region of background
CROP 1 200 200 100 100 50 50    // Copy 100×100 region from (200,200) to (50,50)
```

### 9.4 Layer Workflow Example

**Multi-Layer Composition**:
```
// Initialize canvas
SIZE 512 512
BACKCOLOR BLACK
CLEAR

// Load three layers
LAYER 1 'sky.bmp'              // Background sky
LAYER 2 'mountains.bmp'        // Mid-ground
LAYER 3 'trees.bmp'            // Foreground

// Composite layers back-to-front
CROP 1                          // Full sky
CROP 2 AUTO 0 256              // Mountains at bottom half
CROP 3 AUTO 100 300            // Trees at foreground position

// Add vector graphics on top
COLOR WHITE
SET 256 100
CIRCLE 40 0 255                 // Draw sun
```

---

## 10. Sprite Rendering

The PLOT window shares the sprite system with the BITMAP display, supporting up to 256 sprite definitions with 8 orientations, scaling, and opacity control.

### 10.1 Sprite System Architecture

**Data Structures**:
```pascal
const
  SpriteMax    = 256;     // Maximum sprite definitions
  SpriteMaxX   = 32;      // Maximum sprite width
  SpriteMaxY   = 32;      // Maximum sprite height

var
  SpriteSizeX  : array[0..SpriteMax - 1] of integer;
  SpriteSizeY  : array[0..SpriteMax - 1] of integer;
  SpritePixels : array[0..SpriteMax * SpriteMaxX * SpriteMaxY - 1] of byte;
  SpriteColors : array[0..SpriteMax * 256 - 1] of integer;
```

**Storage Layout**:

**Sprite Sizes**:
- `SpriteSizeX[id]`: Width of sprite `id` (1-32)
- `SpriteSizeY[id]`: Height of sprite `id` (1-32)

**Sprite Pixels**:
- Indexed array: `SpritePixels[id * SpriteMaxX * SpriteMaxY + pixel_index]`
- Each pixel is a palette index (0-255)
- Pixels stored row-major: row 0, row 1, ..., row (height-1)

**Sprite Colors**:
- Indexed array: `SpriteColors[id * 256 + palette_index]`
- Each color is RGBA format (32-bit integer)
- 256 colors per sprite (even if fewer are used)

### 10.2 SPRITEDEF Command

**Purpose**: Define a sprite's pixel data and color palette.

**Syntax**:
```
SPRITEDEF id xsize ysize pixels... colors...
```

**Parameters**:
- `id`: Sprite identifier (0-255)
- `xsize`: Sprite width in pixels (1-32)
- `ysize`: Sprite height in pixels (1-32)
- `pixels`: xsize × ysize pixel values (palette indices, 0-255)
- `colors`: 256 color values (RGB24 or RGBA format)

**Implementation** (lines 2090-2101):
```pascal
key_spritedef:
begin
  if not KeyValWithin(t1, 0, SpriteMax - 1) then Break;
  if not KeyValWithin(t2, 1, SpriteMaxX) then Break;
  if not KeyValWithin(t3, 1, SpriteMaxY) then Break;
  SpriteSizeX[t1] := t2;
  SpriteSizeY[t1] := t3;
  for i := 0 to t2 * t3 - 1 do
    if not KeyVal(t4) then Break else SpritePixels[t1 * SpriteMaxX * SpriteMaxY + i] := t4;
  for i := 0 to 255 do
    if not KeyVal(SpriteColors[t1 * 256 + i]) then Break;
end;
```

**Processing**:
1. Read sprite ID (0-255)
2. Read sprite dimensions (xsize, ysize)
3. Store dimensions in SpriteSizeX/Y arrays
4. Read xsize × ysize pixel values (palette indices)
5. Store pixels in SpritePixels array
6. Read 256 color palette entries
7. Store colors in SpriteColors array

**Example**:
```
// Define a simple 4×4 sprite with 2 colors
SPRITEDEF 0 4 4
  0 0 1 1    // Row 0: two transparent, two opaque
  0 1 1 1    // Row 1
  1 1 1 1    // Row 2
  1 1 1 0    // Row 3
  $00000000  // Color 0: Transparent
  $FFFF0000  // Color 1: Opaque red
  // ... 254 more color entries (typically unused)
```

**Color Format**:
- RGBA: `$AARRGGBB`
  - AA: Alpha (00 = transparent, FF = opaque)
  - RR: Red (00-FF)
  - GG: Green (00-FF)
  - BB: Blue (00-FF)

### 10.3 SPRITE Command

**Purpose**: Render a sprite at the current position.

**Syntax**:
```
SPRITE id {orientation {scale {opacity}}}
```

**Parameters**:
- `id`: Sprite identifier (0-255)
- `orientation`: Orientation code (0-7) (default: 0)
- `scale`: Scale factor in pixels (1-64) (default: 1)
- `opacity`: Opacity multiplier (0-255) (default: vOpacity)

**Implementation** (lines 2102-2134):
```pascal
key_sprite:
begin
  PLOT_GetXY(t1, t2);
  if not KeyValWithin(t3, 0, SpriteMax - 1) then Break;
  t4 := 0;          // orientation
  t5 := 1;          // scale
  t6 := vOpacity;   // opacity
  if KeyValWithin(t4, 0, 7) then if KeyValWithin(t5, 1, 64) then KeyValWithin(t6, 0, 255);
  t7 := SpriteSizeX[t3];
  t8 := SpriteSizeY[t3];
  if (t7 = 0) or (t8 = 0) then Continue;
  ppixel := PByte(@SpritePixels[t3 * SpriteMaxX * SpriteMaxY]);
  pcolor := PIntegerArray(@SpriteColors[t3 * 256]);
  Inc(t1, t5 shr 1);
  Inc(t2, t5 shr 1);
  for y := 1 to t8 do
    for x := 1 to t7 do
    begin
      c := pcolor[ppixel^]; Inc(ppixel);
      opa := ((c shr 24 and $FF) * t6 + $FF) shr 8;
      if opa <> 0 then
        case t4 of
          0: SmoothShape(t1 +  (x - 1) * t5, t2 +  (y - 1) * t5, t5, t5, 0, 0, 0, c, opa);
          1: SmoothShape(t1 + (t7 - x) * t5, t2 +  (y - 1) * t5, t5, t5, 0, 0, 0, c, opa);
          2: SmoothShape(t1 +  (x - 1) * t5, t2 + (t8 - y) * t5, t5, t5, 0, 0, 0, c, opa);
          3: SmoothShape(t1 + (t7 - x) * t5, t2 + (t8 - y) * t5, t5, t5, 0, 0, 0, c, opa);
          4: SmoothShape(t1 +  (y - 1) * t5, t2 +  (x - 1) * t5, t5, t5, 0, 0, 0, c, opa);
          5: SmoothShape(t1 +  (y - 1) * t5, t2 + (t7 - x) * t5, t5, t5, 0, 0, 0, c, opa);
          6: SmoothShape(t1 + (t8 - y) * t5, t2 +  (x - 1) * t5, t5, t5, 0, 0, 0, c, opa);
          7: SmoothShape(t1 + (t8 - y) * t5, t2 + (t7 - x) * t5, t5, t5, 0, 0, 0, c, opa);
        end;
    end;
end;
```

**Processing Steps**:

1. **Get Position**: `PLOT_GetXY(t1, t2)` - Current position in screen coordinates
2. **Read Parameters**: ID, orientation, scale, opacity
3. **Load Sprite Data**: Dimensions, pixel array, color palette
4. **Adjust Position**: Offset by half-scale for centering
5. **Render Pixels**: For each pixel in sprite:
   - Fetch color from palette using pixel index
   - Calculate combined opacity (sprite alpha × opacity parameter)
   - If non-transparent, render using SmoothShape
   - Apply orientation transformation

**Variable Mapping**:
- `t1, t2`: Screen position (adjusted for centering)
- `t3`: Sprite ID
- `t4`: Orientation (0-7)
- `t5`: Scale factor
- `t6`: Opacity multiplier
- `t7, t8`: Sprite dimensions
- `ppixel`: Pointer to pixel data
- `pcolor`: Pointer to color palette

### 10.4 Sprite Orientations

The sprite system supports 8 orientations combining flips and rotations:

| Orientation | Transformation | X Formula | Y Formula |
|-------------|----------------|-----------|-----------|
| 0 | Normal | `x - 1` | `y - 1` |
| 1 | Flip X | `(width - x)` | `y - 1` |
| 2 | Flip Y | `x - 1` | `(height - y)` |
| 3 | Flip X+Y (180°) | `(width - x)` | `(height - y)` |
| 4 | Rotate 90° CCW | `y - 1` | `x - 1` |
| 5 | Rotate 90° CCW + Flip X | `y - 1` | `(width - x)` |
| 6 | Rotate 90° CW | `(height - y)` | `x - 1` |
| 7 | Rotate 90° CW + Flip X | `(height - y)` | `(width - x)` |

**Visualization** (4×4 sprite):

```
Original (0):     Flip X (1):      Flip Y (2):      Flip X+Y (3):
A B C D           D C B A           M N O P           P O N M
E F G H           H G F E           I J K L           L K J I
I J K L           L K J I           E F G H           H G F E
M N O P           P O N M           A B C D           D C B A

Rot 90° CCW (4):  90CCW+FlipX (5): Rot 90° CW (6):   90CW+FlipX (7):
D H L P           A E I M           M I E A           P L H D
C G K O           B F J N           N J F B           O K G C
B F J N           C G K O           O K G C           N J F B
A E I M           D H L P           P L H D           M I E A
```

**Rendering Code**:
```pascal
case orientation of
  0: SmoothShape(x + (col - 1) * scale, y + (row - 1) * scale, ...)     // Normal
  1: SmoothShape(x + (w - col) * scale, y + (row - 1) * scale, ...)     // Flip X
  // ... other orientations
end;
```

### 10.5 Sprite Scaling

**Scale Factor**:
- Range: 1-64 pixels
- Each sprite pixel is rendered as a `scale × scale` block
- Example: scale=4 means 4×4 pixels per sprite pixel

**Centering Adjustment**:
```pascal
Inc(t1, t5 shr 1);        // Offset by scale/2
Inc(t2, t5 shr 1);
```

- Centers the sprite on the specified position
- Without adjustment, top-left corner would be at position

**Example**:
```
SET 100 100
SPRITE 0 0 1 255          // 1× scale (original size)
SPRITE 0 0 4 255          // 4× scale (4 times larger)
SPRITE 0 0 8 128          // 8× scale, 50% opacity
```

### 10.6 Opacity Blending

**Combined Opacity Calculation**:
```pascal
opa := ((c shr 24 and $FF) * t6 + $FF) shr 8;
```

**Formula**:
```
combined_opacity = (sprite_alpha × opacity_param + 255) / 256
```

**Components**:
- `sprite_alpha`: Alpha channel from sprite color (bits 24-31)
- `opacity_param`: Opacity parameter from SPRITE command (0-255)

**Behavior**:
- Both sprite alpha and opacity parameter are multiplied
- Allows global opacity control while respecting per-pixel transparency
- Adding 255 before division provides proper rounding

**Examples**:
```
Sprite alpha = 255, opacity = 255:
  opa = (255 × 255 + 255) / 256 = 255 (fully opaque)

Sprite alpha = 255, opacity = 128:
  opa = (255 × 128 + 255) / 256 = 128 (50% opacity)

Sprite alpha = 128, opacity = 255:
  opa = (128 × 255 + 255) / 256 = 128 (50% opacity)

Sprite alpha = 128, opacity = 128:
  opa = (128 × 128 + 255) / 256 = 64 (25% opacity)
```

### 10.7 Sprite Rendering Performance

**Per-Sprite Cost**:
- Loops through all sprite pixels: `width × height` iterations
- Each pixel: color fetch, opacity calculation, SmoothShape call
- SmoothShape is expensive (anti-aliased rendering)

**Optimization**:
- Transparent pixels (opa = 0) are skipped
- Small sprites are faster (fewer pixels)
- Large scale factors increase cost (more SmoothShape calls)

**Example Performance**:
```
4×4 sprite, scale=1:   16 SmoothShape calls (best case)
8×8 sprite, scale=2:   64 SmoothShape calls
32×32 sprite, scale=1: 1024 SmoothShape calls (worst case)
```

---

## 11. Update Processing

### 11.1 PLOT_Update Method Overview

The `PLOT_Update` method is the central command processor for the PLOT window, handling all drawing and configuration commands sent from the P2 hardware.

**Signature**:
```pascal
procedure TDebugDisplayForm.PLOT_Update;
```

**Source Location**: Lines 1918-2155

**Processing Loop**:
```pascal
while NextKey do
  case val of
    // Command processing
  end;
```

### 11.2 Command Categories

**Color and Appearance**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `LUT1`-`RGB24` | - | Set color mode |
| `LUTCOLORS` | rgb24... | Define palette colors |
| `COLOR` | color | Set drawing color |
| `BLACK`-`GRAY` | brightness | Set color by name |
| `BACKCOLOR` | color | Set background color |
| `OPACITY` | byte | Set transparency (0-255) |

**Positioning and Coordinates**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `SET` | x y | Set current position |
| `ORIGIN` | {x y} | Set coordinate origin |
| `POLAR` | {twopi theta} | Enable polar mode |
| `CARTESIAN` | {flipy flipx} | Enable Cartesian mode |
| `PRECISE` | - | Toggle precision mode |

**Drawing Primitives**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `DOT` | {size {opacity}} | Draw dot at position |
| `LINE` | x y {size {opacity}} | Draw line to position |
| `CIRCLE` | width {size {opacity}} | Draw circle |
| `OVAL` | width height {size {opacity}} | Draw oval |
| `BOX` | width height {size {opacity}} | Draw rectangle |
| `OBOX` | w h rx ry {size {opa}} | Draw rounded rectangle |
| `LINESIZE` | size | Set line thickness |

**Text Rendering**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `TEXT` | {size {style {angle}}} 'str' | Render text |
| `TEXTSIZE` | size | Set font size |
| `TEXTSTYLE` | style | Set font style |
| `TEXTANGLE` | angle | Set text rotation |

**Layer and Sprite System**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `LAYER` | layer 'file' | Load bitmap layer |
| `CROP` | layer {params} | Composite layer |
| `SPRITEDEF` | id x y pixels... colors... | Define sprite |
| `SPRITE` | id {orient {scale {opacity}}} | Render sprite |

**Display Control**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `CLEAR` | - | Clear canvas |
| `UPDATE` | - | Force display update |
| `SAVE` | - | Save canvas to file |

**User Input Feedback**:
| Command | Parameters | Purpose |
|---------|------------|---------|
| `PC_KEY` | - | Request keyboard input |
| `PC_MOUSE` | - | Request mouse position |

### 11.3 Update Modes

**Auto Update Mode** (default):
```pascal
if not vUpdate then BitmapToCanvas(0);
```

- After processing commands, canvas is automatically updated
- Changes are immediately visible

**Manual Update Mode**:
```
PLOT SIZE 512 512 UPDATE
```

- `vUpdate := True` (set during configuration)
- Commands render to Bitmap[0] but don't display
- Must send `UPDATE` command to make changes visible
- Allows batch rendering without flicker

### 11.4 Command Processing Example

**Example Command Sequence**:
```
COLOR RED
SET 100 100
CIRCLE 50 0 255
LINE 200 100 3 255
TEXT 14 'Hello'
```

**Processing Flow**:

1. **COLOR RED**:
   ```pascal
   key_color:
     KeyColor(vPlotColor);        // vPlotColor := $FF0000
   ```

2. **SET 100 100**:
   ```pascal
   key_set:
     KeyVal(t1);                  // t1 := 100
     KeyVal(t2);                  // t2 := 100
     vPixelX := t1;               // vPixelX := 100
     vPixelY := t2;               // vPixelY := 100
   ```

3. **CIRCLE 50 0 255**:
   ```pascal
   key_circle:
     PLOT_GetXY(t1, t2);          // Convert position to screen coords
     KeyVal(t3);                  // t3 := 50 (diameter)
     KeyVal(t7);                  // t7 := 0 (filled)
     KeyVal(t8);                  // t8 := 255 (opacity)
     SmoothShape(t1, t2, 50, 50, 25, 25, 0, vPlotColor, 255);
   ```

4. **LINE 200 100 3 255**:
   ```pascal
   key_line:
     KeyVal(t1);                  // t1 := 200
     KeyVal(t2);                  // t2 := 100
     KeyVal(t3);                  // t3 := 3 (thickness)
     KeyVal(t4);                  // t4 := 255 (opacity)
     // Transform start (100, 100) and end (200, 100)
     SmoothLine(x1, y1, x2, y2, 3, vPlotColor, 255);
     vPixelX := 200;              // Update position
     vPixelY := 100;
   ```

5. **TEXT 14 'Hello'**:
   ```pascal
   key_text:
     a[0] := vTextSize;           // Default size
     KeyVal(a[0]);                // a[0] := 14
     NextStr;                     // s := 'Hello'
     PLOT_GetXY(t1, t2);          // Get screen position (200, 100)
     AngleTextOut(t1, t2, 'Hello', vTextStyle, vTextAngle);
   ```

6. **Auto Update**:
   ```pascal
   if not vUpdate then BitmapToCanvas(0);
   ```

---

## 12. Rendering Pipeline

### 12.1 Double-Buffer Architecture

**Bitmap Array**:
```pascal
Bitmap: array[0..1] of TBitmap;
```

**Buffer Roles**:
- **Bitmap[0]**: Render target (all drawing operations)
- **Bitmap[1]**: Display buffer (shown on canvas)

**Rendering Flow**:
```
Drawing Command → Render to Bitmap[0] → BitmapToCanvas(0) → Copy to Bitmap[1] → Display on Canvas
```

### 12.2 BitmapToCanvas Method

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

**Source Location**: Lines 3522–3530

**Processing**:
1. If `Level = 0`: Copy Bitmap[0] to Bitmap[1]
2. If PLOT display: Stretch-draw Bitmap[1] to canvas
3. Stretch allows zooming/scaling if window resized

### 12.3 Rendering Coordinate System

**User Coordinates** → **Fixed-Point** → **Screen Pixels**

**Transformation Steps**:

1. **User Input**: Cartesian (x, y) or Polar (rho, theta)

2. **Polar Conversion** (if enabled):
   ```pascal
   PolarToCartesian(rho, theta);
   // Output: (x, y) in Cartesian
   ```

3. **Origin Offset**:
   ```pascal
   x_relative = x + vOffsetX
   y_relative = y + vOffsetY
   ```

4. **Direction Flipping**:
   ```pascal
   if vDirX then x_screen = (vWidth - 1) - x_relative
   else          x_screen = x_relative

   if vDirY then y_screen = y_relative
   else          y_screen = (vHeight - 1) - y_relative
   ```

5. **Fixed-Point Conversion**:
   ```pascal
   x_fixed = x_screen shl 8 + x_pixel shl vPrecise
   y_fixed = y_screen shl 8 + y_pixel shl vPrecise
   ```

6. **Rendering**: SmoothDot, SmoothLine, SmoothShape use fixed-point coordinates

### 12.4 Anti-Aliased Rendering

All primitives use anti-aliased rendering for smooth edges.

**SmoothDot** (circular dots):
- Distance-based coverage calculation
- Gamma-corrected alpha blending

**SmoothLine** (thick lines):
- Perpendicular distance to line segment
- Rounded end caps

**SmoothShape** (shapes with rounded corners):
- Distance field for rounded rectangles
- Outline vs. fill modes
- Per-pixel coverage sampling

**Performance Impact**:
- Higher quality than simple pixel filling
- Slower than non-anti-aliased rendering
- Most noticeable for small shapes and thin lines

### 12.5 Text Rendering Pipeline

**Text Rendering Flow**:
```
TEXT Command → Parse Parameters → Create Logical Font → Measure Text → Calculate Alignment → Rotate Offset → Render → Cleanup
```

**Steps**:
1. Parse size, style, angle, string
2. Create Windows logical font with rotation
3. Measure unrotated text dimensions
4. Calculate alignment offset (based on style)
5. Rotate offset vector by angle
6. Render text at adjusted position
7. Delete temporary font

**Font Caching**:
- No font caching (new logical font created per TEXT command)
- Could be optimized for repeated same-style text

---

## 13. User Input Feedback

The PLOT window supports bidirectional communication with the P2, allowing the hardware to query keyboard and mouse state.

### 13.1 PC_KEY Command

**Purpose**: Request keyboard state from the PC.

**Syntax**:
```
PC_KEY
```

**Implementation**:
```pascal
key_pc_key:
  SendKeyPress;
```

**SendKeyPress Method** (in DebugDisplayUnit.pas):
- Captures current keyboard state
- Sends key code back to P2 via serial
- Allows P2 programs to respond to user input

### 13.2 PC_MOUSE Command

**Purpose**: Request mouse position and color under cursor.

**Syntax**:
```
PC_MOUSE
```

**Implementation**:
```pascal
key_pc_mouse:
  SendMousePos;
```

**SendMousePos Method** (lines 3537–3577):

```pascal
procedure TDebugDisplayForm.SendMousePos;
var
  p: tPoint;
  v, c: cardinal;
begin
  p := ScreenToClient(Mouse.CursorPos);
  if (p.x < 0) or (p.x >= ClientWidth) or (p.y < 0) or (p.y >= ClientHeight) then
  begin
    v := $03FFFFFF;
    c := $FFFFFFFF;
  end
  else
  begin
    c := Canvas.Pixels[p.x, p.y];
    c := c and $0000FF shl 16 or c and $00FF00 or c and $FF0000 shr 16;
    case DisplayType of
      dis_spectro, dis_plot, dis_bitmap:
      begin
        if vDirX then p.x := ClientWidth - p.x;
        if not vDirY then p.y := ClientHeight - p.y;
        p.x := p.x div vDotSize;
        p.y := p.y div vDotSizeY;
      end;
      dis_term:
      begin
        p.x := (p.x - vMarginLeft) div ChrWidth;
        p.y := (p.y - vMarginTop) div ChrHeight;
      end;
    end;
    v := vMouseWheel and 3 shl 26 or p.y and $1FFF shl 13 or p.x and $1FFF;
    if GetAsyncKeyState(VK_LBUTTON) and $8000 <> 0 then v := v or $10000000;
    if GetAsyncKeyState(VK_MBUTTON) and $8000 <> 0 then v := v or $20000000;
    if GetAsyncKeyState(VK_RBUTTON) and $8000 <> 0 then v := v or $40000000;
  end;
  TLong(v);
  TLong(c);
  vMouseWheel := 0;
end;
```

**Return Values** (LONG 1 = `v`):
- bits 12–0: X coordinate (13 bits, `p.x and $1FFF`)
- bits 25–13: Y coordinate (13 bits, `p.y and $1FFF`)
- bits 27–26: Mouse wheel direction ±1 (`vMouseWheel and 3`)
- bit 28: Left button
- bit 29: Middle button
- bit 30: Right button
- Sentinel when cursor is off-window: `v = $03FFFFFF`, `c = $FFFFFFFF`

**Return Values** (LONG 2 = `c`):
- RGB color of pixel under cursor (byte-swapped from Windows BGR to `$RRGGBB`)
- `$FFFFFFFF` when cursor is off-window

**Coordinate Transformation** (lines 3558–3561):
- Screen position converted to canvas coordinates
- `vDirX`: `p.x = ClientWidth - p.x`
- `vDirY` (not set): `p.y = ClientHeight - p.y`
- Scaled by `vDotSize` / `vDotSizeY`

---

## 14. Performance Characteristics

### 14.1 Memory Usage

**Base Display**:
- Bitmap[0]: vWidth × vHeight × 4 bytes (render target)
- Bitmap[1]: vWidth × vHeight × 4 bytes (display buffer)

**Example (512×512)**:
- Bitmap[0]: 512 × 512 × 4 = 1 MB
- Bitmap[1]: 512 × 512 × 4 = 1 MB
- **Total: 2 MB**

**Layer System**:
- PlotBitmap[0..7]: 8 independent bitmaps
- Each layer can be different size
- Maximum per layer: 2048 × 2048 × 4 = 16 MB
- **Maximum all layers: 128 MB**

**Sprite System**:
- SpriteSizeX/Y: 256 × 4 × 2 = 2 KB
- SpritePixels: 256 × 32 × 32 = 256 KB
- SpriteColors: 256 × 256 × 4 = 256 KB
- **Total: ~514 KB**

**Typical Memory**:
- 512×512 canvas + 4 moderate-size layers + sprites: ~10-20 MB

### 14.2 Rendering Performance

**Primitive Costs** (relative):
| Primitive | Cost | Notes |
|-----------|------|-------|
| DOT | Low | Single SmoothDot call |
| LINE | Medium | SmoothLine with per-pixel distance calc |
| CIRCLE | High | SmoothShape with many pixels |
| OVAL | High | SmoothShape with ellipse math |
| BOX | Medium-High | SmoothShape, simpler than circles |
| OBOX | High | SmoothShape with corner radius math |
| TEXT | Variable | Windows GDI rendering, depends on string length |

**Anti-Aliasing Impact**:
- All primitives use anti-aliasing
- Increases quality at cost of performance
- Per-pixel coverage calculations

**Batch Rendering**:
- Use `UPDATE` mode for batch operations
- Render multiple primitives before display update
- Reduces flicker and improves perceived performance

### 14.3 Serial Communication Overhead

**Command Parsing**:
- Each command requires parsing element array
- `NextKey`, `NextNum`, `NextStr` calls
- Minimal overhead per command

**Large Data Transfer**:
- SPRITEDEF: 256 colors + pixels = significant data
- LAYER: Filename only (bitmap loaded from disk)
- Prefer external files over serial transmission for large bitmaps

### 14.4 Optimization Strategies

**Reduce Drawing Calls**:
```
// Inefficient: Many small dots
for i := 0 to 1000 do
  SET x[i] y[i]
  DOT

// Better: Fewer larger primitives
LINE x0 y0
for i := 1 to 1000 do
  LINE x[i] y[i]
```

**Use Manual Update Mode**:
```
PLOT SIZE 512 512 UPDATE    // Enable manual update
COLOR RED
SET 0 0
LINE 100 0
LINE 100 100
LINE 0 100
LINE 0 0
UPDATE                       // Single display update
```

**Optimize Sprite Usage**:
```
// Avoid large sprites with high scale
SPRITE 0 0 1 255            // Fast: 8×8 sprite, 1× scale = 64 pixels

// Slower: same sprite, 8× scale = 4096 pixels
SPRITE 0 0 8 255
```

**Layer Compositing**:
```
// Composite layers once during initialization
LAYER 1 'background.bmp'
CROP 1

// Then draw dynamic content on top
COLOR YELLOW
SET 100 100
CIRCLE 20
```

---

## 15. Comparison with Other Display Types

### 15.1 PLOT vs. BITMAP

**PLOT Advantages**:
- Vector graphics primitives (circles, lines, text)
- Coordinate system with origin control
- Polar coordinate mode
- Sub-pixel precision with anti-aliasing
- Easier for programmatic drawing

**BITMAP Advantages**:
- Pixel-by-pixel control
- 19 color modes (vs. PLOT's RGB24)
- Trace/scan patterns for oscilloscope-style displays
- More efficient for pixel-exact rendering

**Common Features**:
- Sprite rendering system (shared)
- Layer compositing (PLOT has layers, BITMAP doesn't)
- User input feedback (PC_KEY, PC_MOUSE)

**Use Cases**:
- **PLOT**: Graphs, charts, UI elements, geometric drawings
- **BITMAP**: Pixel art, color-mode demonstrations, raster images

### 15.2 PLOT vs. SCOPE/SCOPE_XY

**PLOT Advantages**:
- No automatic trace advancement
- Full control over drawing position
- Text rendering
- Layer and sprite systems
- Arbitrary shapes beyond simple traces

**SCOPE Advantages**:
- Automatic trace/pixel advancement
- Optimized for continuous data streams
- Rate limiting (sample decimation)
- Simpler command set for oscilloscope-style displays

**Use Cases**:
- **PLOT**: Custom visualizations, interactive graphics, static images
- **SCOPE**: Real-time signal monitoring, data logging, oscilloscope displays

### 15.3 PLOT vs. SPECTRO/FFT

**PLOT Advantages**:
- General-purpose drawing
- No automatic data processing
- Full pixel-level control

**SPECTRO/FFT Advantages**:
- Built-in signal processing (FFT)
- Optimized for frequency domain visualization
- Automatic color mapping for amplitude
- Vertical trace advancement

**Use Cases**:
- **PLOT**: General graphics and visualization
- **SPECTRO/FFT**: Audio analysis, spectrum monitoring, frequency domain plots

---

## 16. Usage Examples

### 16.1 Basic Drawing

**Simple Shapes**:
```
PLOT SIZE 512 512
BACKCOLOR BLACK
CLEAR

COLOR RED
SET 100 100
CIRCLE 50 0 255

COLOR GREEN
SET 300 100
BOX 80 60 0 255

COLOR BLUE
SET 200 300
OVAL 100 50 3 255
```

**Connected Lines**:
```
PLOT SIZE 400 400
BACKCOLOR WHITE
CLEAR

COLOR BLACK
SET 50 50
LINE 350 50
LINE 350 350
LINE 50 350
LINE 50 50
```

### 16.2 Polar Plotting

**Circular Pattern**:
```
PLOT SIZE 512 512 POLAR $100
BACKCOLOR BLACK
CLEAR
ORIGIN 256 256

COLOR CYAN
for theta := 0 to 255 do
  SET 100 theta
  DOT 5 255
```

**Spiral**:
```
PLOT SIZE 512 512 POLAR $100
BACKCOLOR BLACK
CLEAR
ORIGIN 256 256

COLOR MAGENTA
SET 0 0
for theta := 0 to 255 do
  rho := theta
  LINE rho theta 2 255
```

### 16.3 Text Annotations

**Rotated Labels**:
```
PLOT SIZE 600 400
BACKCOLOR WHITE
CLEAR

COLOR BLACK
SET 300 200
TEXT 20 'Center'

SET 100 100
TEXTANGLE 45
TEXT 16 'Rotated 45°'

SET 500 100
TEXTANGLE 315
TEXT 16 'Rotated -45°'
```

**Styled Text**:
```
PLOT SIZE 512 512
BACKCOLOR GRAY
CLEAR

COLOR BLUE
SET 256 100
TEXT 18 $02 'Normal'

SET 256 200
TEXT 18 $06 'Bold Italic'

SET 256 300
TEXT 18 $0A 'Bold Underline'
```

### 16.4 Layer Composition

**Multi-Layer Scene**:
```
PLOT SIZE 800 600
BACKCOLOR BLACK
CLEAR

LAYER 1 'sky.bmp'
LAYER 2 'mountains.bmp'
LAYER 3 'trees.bmp'

CROP 1
CROP 2 AUTO 0 200
CROP 3 AUTO 0 400

COLOR YELLOW
SET 400 100
CIRCLE 60 0 255

COLOR WHITE
SET 400 500
TEXT 24 'Mountain Scene'
```

### 16.5 Sprite Animation

**Define and Render Sprites**:
```
PLOT SIZE 512 512
BACKCOLOR BLUE
CLEAR

// Define 8×8 crosshair sprite
SPRITEDEF 0 8 8
  0 0 0 1 1 0 0 0
  0 0 0 1 1 0 0 0
  0 0 0 1 1 0 0 0
  1 1 1 1 1 1 1 1
  1 1 1 1 1 1 1 1
  0 0 0 1 1 0 0 0
  0 0 0 1 1 0 0 0
  0 0 0 1 1 0 0 0
  $00000000          // Color 0: Transparent
  $FFFFFFFF          // Color 1: White
  // ... 254 more colors

// Render sprite at various positions
SET 100 100
SPRITE 0 0 2 255

SET 200 200
SPRITE 0 0 4 128

SET 300 300
SPRITE 0 1 3 255      // Flipped X, 3× scale
```

### 16.6 Interactive Graphics

**Mouse-Responsive Drawing**:
```
PLOT SIZE 640 480
BACKCOLOR BLACK
CLEAR

COLOR GREEN
SET 320 240
TEXT 16 'Click to draw dots'

// P2 loop:
loop:
  PC_MOUSE
  pos := receive_long()
  color := receive_long()
  if pos <> $03FFFFFF then
    x := pos & $FFF
    y := pos >> 12 & $FFF
    SET x y
    DOT 10 255
  goto loop
```

### 16.7 Mathematical Function Plotting

**Sine Wave**:
```
PLOT SIZE 512 256 CARTESIAN 1
BACKCOLOR WHITE
CLEAR
ORIGIN 0 128

COLOR RED
SET 0 0
for x := 1 to 511 do
  y := round(sin(x / 512 * 2 * pi) * 100)
  LINE x y 2 255
```

**Parametric Curve**:
```
PLOT SIZE 512 512
BACKCOLOR BLACK
CLEAR
ORIGIN 256 256

COLOR CYAN
t := 0
rho := 50
theta := 0
SET rho theta (polar mode)
for t := 1 to 360 do
  rho := 100 + 50 * sin(t * 3)
  theta := t
  LINE rho theta 2 255
```

---

## 17. Implementation Details

### 17.1 Element Array Protocol

All commands are sent from P2 as element arrays:

**Element Types**:
- `ele_key`: Command key (e.g., key_dot, key_line)
- `ele_num`: Numeric parameter
- `ele_str`: String parameter
- `ele_end`: End of command sequence

**Parsing Methods**:
```pascal
function NextKey: boolean;        // Read next key element
function NextNum: boolean;        // Read next numeric element
function NextStr: boolean;        // Read next string element
function NextEnd: boolean;        // Check for end element
```

**Example Protocol**:
```
Command: DOT 10 255

Element Array:
  ele_key: key_dot
  ele_num: 10
  ele_num: 255
  ele_end
```

### 17.2 Fixed-Point Arithmetic

**8.8 Format**:
- 8 integer bits, 8 fractional bits
- Range: 0 to 255.996 (for positive values)
- Resolution: 1/256 pixel

**Conversion**:
```pascal
// Integer to fixed-point
fixed := integer shl 8;

// Fixed-point to integer (rounding)
integer := (fixed + 128) shr 8;
```

**Precision Mode**:
```pascal
// Sub-pixel precision (vPrecise = 8)
coord_fixed := pixel shl 8;

// Pixel precision (vPrecise = 0)
coord_fixed := pixel shl 0;  // No shift
```

### 17.3 Color Handling

**RGB24 Format**:
```
Bits 23-16: Red (0-255)
Bits 15-8:  Green (0-255)
Bits 7-0:   Blue (0-255)
```

**RGBA Format** (sprites):
```
Bits 31-24: Alpha (0-255)
Bits 23-16: Red (0-255)
Bits 15-8:  Green (0-255)
Bits 7-0:   Blue (0-255)
```

**Windows RGB Conversion**:
```pascal
function WinRGB(c: integer): integer;
begin
  Result := c and $0000FF shl 16 or c and $00FF00 or c and $FF0000 shr 16;
end;
```

- Swaps red and blue channels for Windows GDI

### 17.4 Canvas Coordinate System

**Screen Coordinates**:
- Origin: Top-left corner (0, 0)
- X-axis: Increases rightward
- Y-axis: Increases downward

**User Coordinates** (default Cartesian, no flipping):
- Origin: Top-left corner (0, 0)
- X-axis: Increases rightward
- Y-axis: Increases downward (mathematical convention requires CARTESIAN 1 to flip Y)

**Mathematical Convention**:
```
CARTESIAN 1 0         // Y increases upward
ORIGIN 256 256        // Center origin
```

Now coordinates match mathematical convention:
- Origin: Center (256, 256)
- X-axis: Increases rightward
- Y-axis: Increases upward

---

## 18. Element Array Protocol Specification

### 18.1 Protocol Overview

The PLOT display receives configuration and drawing commands through an **element array protocol**. The host software parses DEBUG directives from P2 output, building typed element arrays that are then consumed by `PLOT_Configure` and `PLOT_Update`.

The parser helpers (`NextKey`, `NextNum`, `NextStr`, `KeyVal`, `KeyValWithin`, `KeyIs`, `KeyBool`) are defined in `DebugDisplayUnit.pas`. They advance an internal pointer through the element sequence and set the shared `val` variable.

### 18.2 PLOT_Configure Parsing Flow

`PLOT_Configure` (lines 1882–1906) uses a `while NextKey do case val of` loop. Only the directives listed in the Configuration table above are recognized; any unrecognized key breaks the loop. After the loop, layer bitmaps are created and sprite arrays zeroed (lines 1908–1913).

**Example command stream** → `PLOT SIZE 256 256 DOTSIZE 2 UPDATE`:
```
NextKey → key_size    → KeySize(vWidth, vHeight, 32, 2048, 32, 2048)  → vWidth=256, vHeight=256
NextKey → key_dotsize → KeyValWithin(vDotSize,1,256)                   → vDotSize=2
                      → vDotSizeY := vDotSize                          → vDotSizeY=2
                      → KeyValWithin(vDotSizeY,1,256)                  (no second num: unchanged)
NextKey → key_update  → vUpdate := True
(no more keys) → exit loop
```

### 18.3 PLOT_Update Parsing Flow

`PLOT_Update` (lines 1918–2155) also uses a `while NextKey do case val of` loop. Drawing commands read their numeric parameters with `KeyVal` / `KeyValWithin`; optional parameters are read conditionally. After the loop, if `vUpdate = False`, `BitmapToCanvas(0)` is called automatically.

**Example command stream** → `DOT 10 200`:
```
NextKey → key_dot
  t1 := vLineSize   (default)
  t2 := vOpacity    (default)
  KeyVal(t1) → t1=10
  KeyVal(t2) → t2=200
  compute fixed-point coords from vPixelX, vPixelY
  SmoothDot(t3, t4, t1 shl vPrecise shr 1, vPlotColor, t2)
```

**Example command stream** → `SPRITE 0 1 4 128`:
```
NextKey → key_sprite
  PLOT_GetXY(t1, t2)            (screen position from current vPixelX/Y)
  KeyValWithin(t3, 0, 255) → t3=0   (sprite id)
  t4=0; t5=1; t6=vOpacity
  KeyValWithin(t4, 0, 7)  → t4=1   (orientation)
  KeyValWithin(t5, 1, 64) → t5=4   (scale)
  KeyValWithin(t6, 0, 255)→ t6=128 (opacity)
  … render loop …
```

### 18.4 Key Parsing Helpers

The helpers are shared across all display types. Their exact behavior is relevant to understanding optional-parameter chains:

- **`KeyVal(var x)`**: reads next element if it is a number; returns True and sets x; otherwise returns False and leaves x unchanged.
- **`KeyValWithin(var x, lo, hi)`**: same, but clamps to [lo, hi].
- **`KeyBool(var b)`**: reads next number element; sets boolean b to `val <> 0`.
- **`KeyIs(key)`**: peeks at the next element; if it is the given key, consumes it and returns True.
- **`NextStr`**: reads the next element if it is a string pointer; sets `val` to the PChar pointer.

These helpers are what make all PLOT parameters truly optional — each helper returns False if the element is absent or not the expected type, leaving the variable at its default.

---

## 19. Buffer Management and Timing

### 19.1 Update Mode Model

PLOT supports two update modes that control when the display is refreshed (line 2154):

```pascal
if not vUpdate then BitmapToCanvas(0);
```

**Automatic Update Mode** (default, `vUpdate = False`):
- `BitmapToCanvas(0)` is called at the end of every `PLOT_Update` invocation.
- Each serial command batch results in an immediate screen update.

**Manual Update Mode** (`vUpdate = True`, set by `UPDATE` in configure phase, line 1903):
- `BitmapToCanvas(0)` is **not** called automatically.
- The P2 program must send the `UPDATE` drawing command (line 2145–2146) to flush `Bitmap[0]` to the screen.
- Allows rendering an entire frame into `Bitmap[0]` before it becomes visible, eliminating flicker.

### 19.2 Drawing Command Flow

**Automatic Mode**:
```
PLOT_Update called → process all commands in element array → BitmapToCanvas(0)
```

**Manual Mode**:
```
PLOT_Update called → process all commands in element array → (no flush)
...
key_update in element array → BitmapToCanvas(0) → visible update
```

### 19.3 PLOT_GetXY (lines 2157–2167)

`PLOT_GetXY` converts the current drawing position (`vPixelX`, `vPixelY`) to screen-space integer pixel coordinates for use by text and shape helpers. It is **not** the fixed-point coordinate path used by DOT and LINE — those commands compute their own fixed-point coords inline (lines 1970–1978, 1990–2007).

```pascal
procedure TDebugDisplayForm.PLOT_GetXY(var x, y: integer);
begin
  if vDirX then
    x := vWidth - 1 - vOffsetX - vPixelX
  else
    x := vOffsetX + vPixelX;
  if vDirY then
    y := vOffsetY + vPixelY
  else
    y := vHeight - 1 - vOffsetY - vPixelY;
end;
```

`PLOT_GetXY` is called by `CIRCLE`, `OVAL`, `BOX`, `OBOX` (line 2018), `TEXT` (line 2053), and `SPRITE` (line 2104). It does not perform any polar conversion or floating-point scaling — those are handled separately by `PolarToCartesian` at the `SET` / `LINE` level.

### 19.4 Layer System

Layers are stored as `PlotBitmap: array[0..plot_layermax - 1] of TBitmap` (8 elements, indices 0–7 internally, 1–8 in directives).

- **`LAYER`** (lines 2056–2062): validates the file exists and has `.bmp` extension, then calls `PlotBitmap[t1-1].LoadFromFile(...)`.
- **`CROP`** (lines 2063–2089): composites a rectangular region of a layer onto `Bitmap[0]` using `Canvas.CopyRect`. No scaling is performed — source and destination rectangles have the same dimensions.
- Neither command triggers `BitmapToCanvas`; the update model (§19.1) governs when the result becomes visible.

### 19.5 Sprite System Timing

- `SPRITEDEF` stores pixel indices and palette colors into the global flat arrays (`SpritePixels`, `SpriteColors`). No display update occurs.
- `SPRITE` iterates over all sprite pixels, calls `SmoothShape` per non-transparent pixel, and the result sits in `Bitmap[0]`; the update model controls when it becomes visible.
- There is no pre-rendering of orientations — all 8 orientation transforms are computed at render time via the coordinate arithmetic in the `case t4 of` block (lines 2123–2132).

---

## 20. Bitmap System and Double-Buffering

### 20.1 Bitmap Architecture

PLOT uses the shared two-bitmap system defined by the base `TDebugDisplayForm`. All nine display types share the same infrastructure.

**Bitmap Array** (`DebugDisplayUnit.pas`):
```pascal
Bitmap: array[0..1] of TBitmap;
```

**Bitmap Roles**:
- **Bitmap[0]**: Render target — all drawing operations go here.
- **Bitmap[1]**: Display buffer — copied to the form `Canvas` for display.

> **v55 note:** `PixelFormat := pf32bit` is **not** explicitly set in `PLOT_Configure`. The bitmaps are created inside `SetSize` (called at line 1915). The exact pixel format depends on the shared `SetSize` implementation, not on PLOT-specific code.

### 20.2 BitmapToCanvas Transfer (lines 3522–3530)

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

There is **no buffer swap** — the roles of Bitmap[0] and Bitmap[1] are fixed. `Level = 0` copies Bitmap[0] (render target) into Bitmap[1] (display buffer), then Bitmap[1] is stretch-drawn to the form canvas. For PLOT (and BITMAP/SPECTRO), `StretchDraw` is used, which scales the bitmap if the window has been resized.

### 20.3 Anti-Aliased Primitive Rendering

The actual signatures used in `PLOT_Update` are:

```pascal
// DOT path (line 1978):
SmoothDot(t3, t4, t1 shl vPrecise shr 1, vPlotColor, t2);
// SmoothDot(x_fixed8, y_fixed8, radius_fixed8, color: integer; opacity: byte)

// LINE path (line 2008):
SmoothLine(t5, t6, t7, t8, t3 shl vPrecise shr 1, vPlotColor, t4);
// SmoothLine(x1, y1, x2, y2, halfwidth_fixed8, color: integer; opacity: byte)

// Shapes path (lines 2031–2034):
SmoothShape(xc, yc, xs, ys, xro, yro, thick, color: integer; opacity: byte);
// (lines 3590+) — center in integer pixels, size/radii/thickness in integer pixels
```

The `t3/t4` (DOT) and `t5–t8` (LINE) coordinates are 8.8 fixed-point values computed inline; `PLOT_GetXY` returns plain integer screen coordinates used by shapes and text.

### 20.4 Layer and Sprite Storage (v55 names)

**Layers**:
```pascal
PlotBitmap: array[0..plot_layermax - 1] of TBitmap;  // plot_layermax = 8
```

**Sprites** (flat global arrays, shared with BITMAP display):
```pascal
SpritePixels : array[0..SpriteMax * SpriteMaxX * SpriteMaxY - 1] of byte;
SpriteColors : array[0..SpriteMax * 256 - 1] of integer;
SpriteSizeX  : array[0..SpriteMax - 1] of integer;
SpriteSizeY  : array[0..SpriteMax - 1] of integer;
```

There is no `Sprite[0..255, 0..7] of TBitmap` structure. Sprite orientations are computed at render time using the coordinate arithmetic in the `case t4 of` block (lines 2123–2132). No pre-rendering or bilinear scaling is performed.

### 20.5 Update Model Summary

| Condition | When `BitmapToCanvas(0)` is called |
|---|---|
| `vUpdate = False` (default) | End of every `PLOT_Update` call (line 2154) |
| `vUpdate = True` (manual mode) | Only when `key_update` is encountered in `PLOT_Update` (lines 2145–2146) |
| Always | When `key_clear` runs (`ClearBitmap` is called, then update-mode rule applies) |

---

## 21. Shared Infrastructure

### 21.1 Color System

Drawing colors (`vPlotColor`, `vTextColor`, `vBackColor`) are stored internally in the P2 RGB24 format (`$RRGGBB`). Before writing to a Windows GDI `TCanvas`, the shared helper `WinRGB` (used at line 2052 for text, and implicitly by the Smooth* helpers) byte-swaps R↔B because Windows GDI uses BGR order.

```pascal
// Used at line 2052 for TEXT:
Bitmap[0].Canvas.Font.Color := WinRGB(vTextColor);
```

**Default color constants** (assigned in `PLOT_Configure`, 1877–1878, and global
`SetDefaults`, 2891) — `clXxx` are literal RGB24 values from `DebugDisplayUnit.pas`
179–196:

| Variable | Default constant | Hex | Source |
|---|---|---|---|
| `vPlotColor` | `DefaultPlotColor` = `clCyan` | `$00FFFF` | 1877 |
| `vTextColor` | `DefaultTextColor` = `clWhite` | `$FFFFFF` | 1878 |
| `vBackColor` | `DefaultBackColor` = `clBlack` | `$000000` | 2891 (global) |

There is no `TranslateColor` function in PLOT and no `vGridColor` variable (PLOT draws
no grid), and no default scope-color table relevant to PLOT. Named colors
(`BLACK`…`GRAY`) are resolved by the shared `KeyColor` helper; per-element colors and
sprite palettes are taken as literal RGB24/RGBA values.

### 21.2 Fixed-Point Arithmetic

DOT and LINE use an **8.8 fixed-point** scheme (not `PLOT_GetXY`). The conversion is:

```pascal
// Cartesian, no flip:
t3 := vOffsetX shl 8 + vPixelX shl vPrecise;   // X fixed-point
t4 := (vHeight - 1 - vOffsetY) shl 8 - vPixelY shl vPrecise;  // Y fixed-point
```

- When `vPrecise = 8` (default on): `pixel shl 8` → full 8.8 precision, 1/256-pixel resolution.
- When `vPrecise = 0` (toggled off): `pixel shl 0` → whole-pixel addressing.

The DOT radius is `t1 shl vPrecise shr 1`, making radius half the linesize, in matching precision units.

### 21.3 Polar Coordinate Conversion

Polar-to-Cartesian conversion is performed by `PolarToCartesian` (called from `SET` at line 1961 and `LINE` at line 1987):

```pascal
procedure TDebugDisplayForm.PolarToCartesian(var rho_x, theta_y: integer);
var
  Tf, Xf, Yf: extended;
begin
  Tf := (Int64(theta_y) + Int64(vTheta)) / vTwoPi * Pi * 2;
  SinCos(Tf, Yf, Xf);
  theta_y := Round(Yf * rho_x);
  rho_x := Round(Xf * rho_x);
end;
```

`PLOT_GetXY` does **not** perform polar conversion — it only applies the `vDirX/vDirY/vOffsetX/vOffsetY` transform on whatever `vPixelX/vPixelY` already contain. By the time `PLOT_GetXY` is called (for shapes/text/sprites), those variables already hold Cartesian values.

### 21.4 Precision Mode (`vPrecise`)

`vPrecise` is an `integer` (not a boolean). It holds either `8` (sub-pixel on, default) or `0` (sub-pixel off). The `PRECISE` directive XORs it: `vPrecise := vPrecise xor 8` (line 1947).

There is no `PRECISE_OFF` command — a single `PRECISE` directive toggles the state.

### 21.5 Text Rendering Infrastructure

Text rendering uses the Windows GDI `TCanvas.TextOut` with a custom `LOGFONT`. The complete implementation is `AngleTextOut` (lines 3483–3520; see §8.4). Font properties (weight, italic, underline) are encoded in `vTextStyle`; font size is in `vTextSize`. There is no separate `vFont`/`vFontName` variable in PLOT — the font face is whatever is set on `Bitmap[0].Canvas.Font` by the size assignment at line 2050.

### 21.6 Origin and Flip Control

The actual v55 variables are:

```pascal
vOffsetX : integer;   // origin X (set by ORIGIN)
vOffsetY : integer;   // origin Y (set by ORIGIN)
vDirX    : boolean;   // X flip (set by CARTESIAN {flipy {flipx}})
vDirY    : boolean;   // Y flip (set by CARTESIAN {flipy {flipx}})
```

There are no `vFlipX`/`vFlipY` integer variables (those would be ±1 multipliers), no `FLIPX`/`FLIPY` commands, and no `vScale`/`vRange` variables. Direction is controlled as boolean flags through the `CARTESIAN` directive.

### 21.7 Sprite System

Sprite data is shared globally between PLOT and BITMAP windows via the flat arrays described in §4.5. Sprites are **not** pre-rendered into orientation bitmaps; all 8 orientations are rendered on-the-fly during `SPRITE` execution using the pixel-position formulas in lines 2123–2132 (see §10.4).

Sprite scale range is **1–64** (integer pixel size per sprite pixel, enforced by `KeyValWithin(t5, 1, 64)` at line 2109). There is no fractional scale or `scale=256` convention.

### 21.8 File Operations

The `SAVE` command invokes `KeySave` (line 2148), a shared helper that writes the current canvas contents to a `.bmp` file. The `LAYER` command uses `PlotBitmap[t1-1].LoadFromFile(PChar(val))` directly (line 2061). There is no `LOAD` command distinct from `LAYER`; `LAYER` is the only file-load directive.

---

## 22. Initialization Lifecycle

### 22.1 Window Creation Sequence

The display manager (in `DebugUnit.pas`) creates the `TDebugDisplayForm`, sets `DisplayType := dis_plot`, and then calls `PLOT_Configure` with the element array from the serial command. The relevant PLOT-specific portion is `PLOT_Configure` (lines 1864–1916).

### 22.2 PLOT_Configure: What It Actually Does (v55)

**Step 1 — Set defaults** (lines 1869–1880):
```pascal
vDirX := False;
vDirY := False;
vOffsetX := 0;
vOffsetY := 0;
vPixelX := 0;
vPixelY := 0;
vDotSize := 1;
vDotSizeY := 1;
vPlotColor := DefaultPlotColor;
vTextColor := DefaultTextColor;
vOpacity := $FF;
vPrecise := 8;
```

**Step 2 — Parse configuration directives** (lines 1882–1906):
```pascal
while NextKey do
case val of
  key_title:           KeyTitle;
  key_pos:             KeyPos;
  key_size:            KeySize(vWidth, vHeight, plot_wmin, plot_wmax, plot_hmin, plot_hmax);
  key_dotsize:         if KeyValWithin(vDotSize, 1, 256) then
                       begin
                         vDotSizeY := vDotSize;
                         KeyValWithin(vDotSizeY, 1, 256);
                       end;
  key_lut1..key_rgb24: KeyColorMode;
  key_lutcolors:       KeyLutColors;
  key_backcolor:       KeyColor(vBackColor);
  key_update:          vUpdate := True;
  key_hidexy:          vHideXY := True;
end;
```

The accepted config directives are exactly these nine cases — no `POLAR`, `CARTESIAN`, `RANGE`, `FONT`, `FLIPX`, `FLIPY`, `LWIDTH`, `OPACITY`, or `PRECISE` in the configure phase.

**Step 3 — Create layer bitmaps and zero sprite arrays** (lines 1908–1913):
```pascal
for i := 0 to plot_layermax - 1 do PlotBitmap[i] := TBitmap.Create;
FillChar(SpritePixels, SizeOf(SpritePixels), 0);
FillChar(SpriteColors, SizeOf(SpriteColors), 0);
FillChar(SpriteSizeX,  SizeOf(SpriteSizeX),  0);
FillChar(SpriteSizeY,  SizeOf(SpriteSizeY),  0);
```

**Step 4 — Set initial window size** (line 1915):
```pascal
SetSize(0, 0, 0, 0);
```

`SetSize` is the shared helper that creates the bitmaps and sizes the form.

### 22.3 Polar Mode Initialization

`POLAR` is not accepted in `PLOT_Configure`. Polar mode is enabled only via the `POLAR` drawing directive in `PLOT_Update` (line 2135–2136: `key_polar: KeyTwoPi`). `KeyTwoPi` sets `vPolar := True`, `vTwoPi`, and `vTheta`.

### 22.4 Initial Display State (after PLOT_Configure)

```
vDirX = False, vDirY = False
vOffsetX = 0, vOffsetY = 0
vPixelX = 0, vPixelY = 0
vDotSize = 1, vDotSizeY = 1
vPlotColor = DefaultPlotColor
vTextColor = DefaultTextColor
vOpacity = $FF (255)
vPrecise = 8 (sub-pixel on)
vPolar = False (not reset here; retains FormCreate value, which is False)
vUpdate = False (automatic) unless UPDATE specified
vHideXY = False unless HIDEXY specified
PlotBitmap[0..7] = freshly created empty TBitmap objects
SpritePixels/Colors/SizeX/SizeY = zeroed
```

### 22.5 Runtime State Transitions

```
[Created] → PLOT_Configure → [Configured]
                                   ↓
                      PLOT_Update (drawing commands)
                                   ↓
                              [Active]
                              ↓         ↑
                        Drawing commands
                              ↓         ↑
                     BitmapToCanvas (if auto-update, line 2154)

key_clear → ClearBitmap; (then auto-update rule applies)
key_update in update phase → BitmapToCanvas(0) explicitly (line 2145-2146)
Close window → PLOT_Close → free PlotBitmap[0..7] → [Destroyed]
```

### 22.6 Cleanup: PLOT_Close (lines 2169–2174)

```pascal
procedure TDebugDisplayForm.PLOT_Close;
var i: integer;
begin
  for i := 0 to plot_layermax - 1 do PlotBitmap[i].Free;
end;
```

Only the layer bitmaps are freed here. The shared sprite arrays (`SpritePixels`, `SpriteColors`, `SpriteSizeX`, `SpriteSizeY`) are global and not freed per-window. The main `Bitmap[0]`/`Bitmap[1]` are freed by the shared form destruction logic.

---

## 23. Summary

The **PLOT** display window is a comprehensive vector graphics system for the Propeller 2 debug environment. It combines traditional 2D drawing primitives with advanced features like polar coordinates, rotated text, multi-layer compositing, and sprite rendering.

### 23.1 Key Capabilities

**Drawing Primitives**:
- DOT, LINE, CIRCLE, OVAL, BOX, OBOX
- Anti-aliased rendering with sub-pixel precision
- Configurable line thickness and opacity

**Coordinate Systems**:
- Cartesian and polar modes
- Origin control and direction flipping
- Precision mode toggle (sub-pixel vs. pixel)

**Text Rendering**:
- Arbitrary rotation angles
- Comprehensive style encoding (weight, italic, underline, alignment)
- Supports standard Windows fonts

**Layer System**:
- Up to 8 bitmap layers
- Load from external BMP files
- Flexible cropping and compositing

**Sprite Rendering**:
- 256 sprite definitions
- 8 orientations (flips and rotations)
- Scaling and opacity control
- Shared with BITMAP display

**Interactive Features**:
- Keyboard input feedback (PC_KEY)
- Mouse position and color feedback (PC_MOUSE)
- Bidirectional communication with P2

### 23.2 Performance Profile

**Strengths**:
- Efficient for vector graphics
- Sub-pixel anti-aliasing for smooth edges
- Double-buffering eliminates flicker

**Limitations**:
- Anti-aliasing increases rendering cost
- Large sprites can be expensive (many SmoothShape calls)
- No hardware acceleration (CPU rendering)

**Optimization**:
- Use manual update mode for batch rendering
- Minimize sprite scale factors
- Composite static layers once, then draw dynamic content

### 23.3 Common Use Cases

**Data Visualization**:
- Real-time graphs and charts
- Mathematical function plotting
- Polar plots and circular diagrams

**User Interfaces**:
- Custom controls and widgets
- Interactive dashboards
- Annotated displays

**Game Graphics**:
- Sprite-based 2D games
- Geometric game objects
- Text overlays and HUDs

**Educational Tools**:
- Coordinate system demonstrations
- Geometry and trigonometry visualization
- Physics simulations

### 23.4 Integration with P2 Workflow

The PLOT window seamlessly integrates into the P2 debug ecosystem:

1. **Hardware Execution**: P2 runs user program with DEBUG statements
2. **Serial Transmission**: Commands sent via USB serial at 2 Mbaud
3. **Command Processing**: PLOT_Update parses and executes commands
4. **Real-Time Display**: Graphics appear on PC screen
5. **User Feedback**: Mouse/keyboard state returned to P2
6. **Interactive Loop**: P2 responds to user input

### 23.5 Design Philosophy

The PLOT window embodies a "programmable canvas" design philosophy:

- **Flexibility**: Wide range of primitives and configurations
- **Simplicity**: Intuitive command structure
- **Power**: Advanced features (polar coords, layers, sprites) when needed
- **Integration**: Shares infrastructure with other display types
- **Extensibility**: Easy to add new commands or features

This balance makes PLOT suitable for both simple quick visualizations and complex interactive graphics applications.

---

**End of PLOT Theory of Operations**
