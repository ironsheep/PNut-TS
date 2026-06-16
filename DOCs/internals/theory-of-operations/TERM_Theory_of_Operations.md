# TERM Display Window - Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Directive coverage verified**: 2026-06-01 against `DebugDisplayUnit.pas` (v55)
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window config/display/keyboard/mouse reference

## Table of Contents

1. [Overview](#1-overview)
2. [Display Type and Constants](#2-display-type-and-constants)
3. [Data Structures](#3-data-structures)
4. [Configuration and Initialization](#4-configuration-and-initialization)
5. [Update Processing](#5-update-processing)
6. [Character Rendering](#6-character-rendering)
7. [Cursor Management](#7-cursor-management)
8. [Scrolling System](#8-scrolling-system)
9. [Control Commands](#9-control-commands)
10. [Color System](#10-color-system)
11. [Text Metrics](#11-text-metrics)
12. [Command Protocol](#12-command-protocol)
13. [Usage Examples](#13-usage-examples)
14. [Performance Characteristics](#14-performance-characteristics)
15. [Terminal Emulation](#15-terminal-emulation)
16. [Implementation Details](#16-implementation-details)
17. [Element Array Protocol Specification](#17-element-array-protocol-specification)
18. [Buffer Management and Timing](#18-buffer-management-and-timing)
19. [Bitmap System and Double-Buffering](#19-bitmap-system-and-double-buffering)
20. [Shared Infrastructure](#20-shared-infrastructure)
21. [Initialization Lifecycle](#21-initialization-lifecycle)
22. [Summary](#22-summary)

---

## 1. Overview

### 1.1 Purpose

The **TERM** (Terminal) display window provides a text-based terminal emulator for the Propeller 2 debug system. It implements a character-mode display similar to classic computer terminals or console windows, supporting:

- **Character-based display**: Grid of text characters (columns × rows)
- **Multiple colors**: Configurable foreground and background colors with 4 predefined color pairs
- **Auto-scrolling**: Automatic vertical scrolling when bottom is reached
- **Cursor positioning**: Explicit row/column positioning
- **Control codes**: Tab, backspace, newline, clear screen, home
- **VT100-style features**: Basic terminal emulation without full ANSI escape sequences
- **Real-time updates**: Immediate or buffered display updates

### 1.2 Key Features

- **Configurable size**: 1-256 columns, 1-256 rows (default: 40×20)
- **Proportional font support**: Uses Windows TrueType fonts with dynamic sizing
- **Color pairs**: 4 predefined text/background color combinations
- **Control characters**: Tab (9), newline (10, 13), backspace (8)
- **String output**: Efficient multi-character string rendering
- **Position commands**: Explicit cursor positioning (row, column)
- **Update modes**: Real-time character-by-character or buffered batch updates
- **Scrolling**: Automatic vertical scrolling with bitmap copying
- **Clear screen**: Instant screen clear with home cursor
- **Save display**: Save terminal contents to image file

### 1.3 Typical Applications

- **Debug output**: Program status, variable dumps, trace messages
- **Data logging**: Timestamped event logs, sensor readings
- **Menu systems**: Text-based user interfaces
- **Serial console**: Terminal emulator for serial communications
- **Status displays**: Real-time system status monitoring
- **Interactive debugging**: Command-response debugging sessions
- **Test output**: Unit test results, pass/fail reports

---

## 2. Display Type and Constants

### 2.1 Display Type Identifier

**DebugDisplayUnit.pas:28**
```pascal
const
  dis_term = 6;
```

The TERM display is identified by `dis_term = 6` in the display type enumeration.

### 2.2 Terminal Size Constants

**DebugDisplayUnit.pas:203-204, 224-227**
```pascal
const
  DefaultCols           = 40;
  DefaultRows           = 20;

  term_colmin           = 1;
  term_colmax           = 256;
  term_rowmin           = 1;
  term_rowmax           = 256;
```

**Constants**:
- **DefaultCols**: Default columns = 40
- **DefaultRows**: Default rows = 20
- **term_colmin**: Minimum columns = 1
- **term_colmax**: Maximum columns = 256
- **term_rowmin**: Minimum rows = 1
- **term_rowmax**: Maximum rows = 256

### 2.3 Default Colors

**DebugDisplayUnit.pas:242**
```pascal
const
  DefaultTermColors: array[0..7] of integer =
    (clOrange, clBlack, clBlack, clOrange, clLime, clBlack, clBlack, clLime);
```

**Color Pairs**:
- **Pair 0**: Orange text on black background (indices 0-1)
- **Pair 1**: Black text on orange background (indices 2-3)
- **Pair 2**: Lime text on black background (indices 4-5)
- **Pair 3**: Black text on lime background (indices 6-7)

**Interpretation**:
```
vColor[0] = clOrange   // Pair 0 foreground
vColor[1] = clBlack    // Pair 0 background
vColor[2] = clBlack    // Pair 1 foreground
vColor[3] = clOrange   // Pair 1 background
vColor[4] = clLime     // Pair 2 foreground
vColor[5] = clBlack    // Pair 2 background
vColor[6] = clBlack    // Pair 3 foreground
vColor[7] = clLime     // Pair 3 background
```

---

## 3. Data Structures

### 3.1 Terminal State Variables

**DebugDisplayUnit.pas:343-346**
```pascal
var
  vCols                 : integer;  // Number of columns
  vRows                 : integer;  // Number of rows
  vCol                  : integer;  // Current cursor column (0-based)
  vRow                  : integer;  // Current cursor row (0-based)
```

**Characteristics**:
- **vCols, vRows**: Terminal grid dimensions
- **vCol, vRow**: Current cursor position (0-based indexing)
- **Valid ranges**: vCol ∈ [0, vCols-1], vRow ∈ [0, vRows-1]

### 3.2 Color Array

**DebugDisplayUnit.pas:311**
```pascal
var
  vColor: array [0..Channels - 1] of integer;  // Channels = 8
```

**Purpose**: Stores 8 color values defining 4 foreground/background pairs.

**Color Selection**:
```pascal
vTextColor := vColor[(pair_index) * 2 + 0];      // Foreground
vTextBackColor := vColor[(pair_index) * 2 + 1];  // Background
```

### 3.3 Text Metrics Variables

**DebugDisplayUnit.pas:254-255**
```pascal
var
  ChrHeight             : integer;  // Character cell height (pixels)
  ChrWidth              : integer;  // Character cell width (pixels)
```

**Purpose**: Stores pixel dimensions of a single character cell, calculated from font size.

### 3.4 Update Control

**DebugDisplayUnit.pas**
```pascal
var
  vUpdate               : boolean;  // Update mode flag
  vUpdateFlag           : boolean;  // Pending update flag
```

**Update Modes**:
- **vUpdate = False** (default): Real-time character-by-character display
- **vUpdate = True**: Buffered mode, manual update required

---

## Directive Reference (v55-verified)

This section is the single authoritative lookup for every directive TERM accepts,
verified against `DebugDisplayUnit.pas` (v55) on 2026-06-01. See the
[Directive Matrix §5.7](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) for the cross-window
view.

### Configuration directives

Processed once by `TERM_Configure` (lines 2181-2221). Applied before the window
opens.

| Directive | Pascal key | Parameters | Range / notes |
|-----------|-----------|------------|---------------|
| `TITLE 'str'` | `key_title` | string | Free string · window title bar text |
| `POS left top` | `key_pos` | 2 integers | left, top · offset from base window position |
| `SIZE cols rows` | `key_size` | 2 integers | **Columns × rows** (not pixels); cols int **1..256** · default 40; rows int **1..256** · default 20. Clamped by `KeySize(…, term_colmin, term_colmax, term_rowmin, term_rowmax)` (`2199-2200`; constants `term_colmin/_rowmin`=1, `term_colmax/_rowmax`=256, lines 224-227) |
| `TEXTSIZE n` | `key_textsize` | integer | Font point size · int **6..200** · default 10 (global `FontSize` user preference); applied via `KeyTextSize` |
| `COLOR c0 c1 … c7` | `key_color` | up to 8 RGB24 values | Fills `vColor[0..7]` — 4 text/background pairs; reads up to 8, stops early if a value is absent (`2203-2204`). Each value is a named color (§7.1, optional 0–15 brightness nibble) or numeric. Default: `ORANGE/BLACK, BLACK/ORANGE, LIME/BLACK, BLACK/LIME` |
| `BACKCOLOR color` | `key_backcolor` | 1 RGB24 value | Window canvas background (used for clear/scroll fill), not character background (`2205-2206`) |
| `UPDATE` | `key_update` | *(flag)* | Enables buffered mode — screen only updates on explicit `UPDATE` directive (`2207-2208`) |
| `HIDEXY` | `key_hidexy` | *(flag)* | Hides the live measurement-cursor coordinate readout; does **not** disable `PC_MOUSE` (`2209-2210`) |

### Display / data directives

Processed on every subsequent message by `TERM_Update` (lines 2223-2315).

**Named-color key directives** (`key_black`..`key_gray`, lines 2232-2237):

| Directive | Action |
|-----------|--------|
| `BLACK` `WHITE` `ORANGE` `BLUE` `GREEN` `CYAN` `RED` `MAGENTA` `YELLOW` `GRAY` `{brightness}` | Sets `vTextColor` (text foreground) to the named color, then reads an optional second color into `vTextBackColor` (text background). Both use `KeyColor` which accepts an optional 0–15 brightness nibble after the color name. |
| `BACKCOLOR color` | Sets `vTextBackColor` only (`key_backcolor`, line 2238-2239) |

**Keyword directives**:

| Directive | Action |
|-----------|--------|
| `CLEAR` | `key_clear` — clear entire bitmap, home cursor to (0,0), set update flag (lines 2240-2246) |
| `UPDATE` | `key_update` — immediately copy `Bitmap[0]` to canvas (`BitmapToCanvas(0)`), line 2247-2248 |
| `SAVE` | `key_save` — save to a `.bmp` file (`KeySave`, 2839-2866). Three arg-forms: **filename** (`'name'`) saves the window bitmap (`Bitmap[1]`); **`WINDOW` `'name'`** captures the full window rectangle (`Left/Top/Width/Height`) from the desktop; **`l t w h` `'name'`** captures an explicit desktop rectangle. `.bmp` is appended automatically (2249-2250) |
| `PC_KEY` | `key_pc_key` — transmit latched keypress LONG to P2 (`SendKeyPress`, line 2251-2252) |
| `PC_MOUSE` | `key_pc_mouse` — transmit mouse position + buttons LONG pair to P2 (`SendMousePos`, line 2253-2254) |

**Numeric control codes** (lines 2258-2305, `ele_num` values). Each is a numeric
element in the **0..13** control range or **32..255** printable range; numbers
14–31 fall through the `case` with no action:

| Value | Parameter range | Action |
|-------|-----------------|--------|
| `0` | — | Clear screen + home cursor (0,0) |
| `1` | — | Home cursor to (0,0), no clear |
| `2 n` | `n` int **0..vCols−1** (clamped, `2273`) | Set column to `n` via `KeyValWithin(vCol, 0, vCols-1)` |
| `3 n` | `n` int **0..vRows−1** (clamped, `2275`) | Set row to `n` via `KeyValWithin(vRow, 0, vRows-1)` |
| `4` | — | Select color pair 0 → `vColor[0]`/`vColor[1]` |
| `5` | — | Select color pair 1 → `vColor[2]`/`vColor[3]` |
| `6` | — | Select color pair 2 → `vColor[4]`/`vColor[5]` |
| `7` | — | Select color pair 3 → `vColor[6]`/`vColor[7]` |
| `8` | — | Backspace — move cursor back one, wrap to previous row; no-op at (0,0) |
| `9` | — | Tab — print spaces until next 8-column boundary (minimum 1 space) |
| `10` | — | Line feed — treated identically to CR (calls `TERM_Chr(Chr(13))`) |
| `13` | — | Carriage return — advance to next row (or scroll), reset column to 0; consumes a following `10` if present |
| `32..255` | — | Printable character — render glyph at current cursor, advance column |

**String** (`ele_str`): Prints each character of the string verbatim via `TERM_Chr`
(lines 2307-2311). `TERM_Chr` special-cases **only** `Chr(13)` (newline); every other
character — including `Chr(9)` (tab) and `Chr(10)` (LF) — renders as a **glyph**. The
tab/LF handling in the numeric `case` does **not** apply on the string path (§16.7).

### Keyboard & mouse

TERM uses the **shared input model** inherited by all nine display windows — there
is no TERM-specific keyboard or mouse handler. See
[Directive Matrix §4](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) for the full shared
model. TERM-specific notes:

| Handler | Lines | TERM behavior |
|---------|-------|---------------|
| `WMGetDlgCode` | 585-589 | Captures Tab key (all windows) |
| `FormKeyPress` | 825-831 | Latches key byte into `vKeyPress` for 100 ms |
| `FormKeyDown` | 833-851 | Maps non-printable keys: Left=1, Right=2, Up=3, Down=4, Home=5, End=6, Delete=7, Insert=10, PageUp=11, PageDown=12 |
| `FormMouseMove` | 725-732 | Displays character **col,row** as live measurement cursor; empty string (no readout) if cursor is outside the text area |
| `FormMouseWheel` | 811-817 | Latches wheel direction (+1/−1) into `vMouseWheel` for 100 ms |
| `PC_KEY` → `SendKeyPress` | 3579-3583 | Sends one LONG = `vKeyPress` byte (0 if none), then clears it |
| `PC_MOUSE` → `SendMousePos` | 3563-3567 | LONG 1: `x` = char column, `y` = char row, wheel bits 26-27, L/M/R buttons bits 28-30; if cursor is **outside the text area** (margin-bounded character grid), LONG 1 = `$03FFFFFF`, LONG 2 = `$FFFFFFFF` (off-window sentinel). LONG 2: RGB color under cursor |

`HIDEXY` suppresses the on-screen readout from `FormMouseMove` but does **not**
prevent `PC_MOUSE` from reporting coordinates back to the P2.

---

## 4. Configuration and Initialization

### 4.1 TERM_Configure Method

**DebugDisplayUnit.pas:2181-2221**
```pascal
procedure TDebugDisplayForm.TERM_Configure;
var
  i: integer;
begin
  // Set unique defaults
  vTextSize := FontSize;
  vCols := DefaultCols;           // 40 columns
  vRows := DefaultRows;           // 20 rows
  vCol := 0;                      // Home cursor
  vRow := 0;
  for i := 0 to 7 do vColor[i] := DefaultTermColors[i];

  // Process any parameters
  while NextKey do
  case val of
    key_title:
      KeyTitle;
    key_pos:
      KeyPos;
    key_size:
      KeySize(vCols, vRows, term_colmin, term_colmax, term_rowmin, term_rowmax);
    key_textsize:
      KeyTextSize;
    key_color:
      for i := 0 to 7 do if not KeyColor(vColor[i]) then Break;
    key_backcolor:
      KeyColor(vBackColor);
    key_update:
      vUpdate := True;
    key_hidexy:
      vHideXY := True;
  end;

  // Set initial colors
  vTextColor := vColor[0];        // First pair foreground
  vTextBackColor := vColor[1];    // First pair background

  // Set form metrics
  SetTextMetrics;
  vWidth := vCols * ChrWidth;     // Pixel width
  vHeight := vRows * ChrHeight;   // Pixel height
  i := ChrWidth div 2;
  SetSize(i, i, i, i);            // Margins = half character width
end;
```

### 4.2 Configuration Parameters

| Parameter | Key | Type | Range | Default | Description |
|-----------|-----|------|-------|---------|-------------|
| **title** | key_title | string | - | "TERM" | Window title text |
| **pos** | key_pos | left, top | - | auto | Window position only (offsets from `DebugDisplayLeft`/`Top`; `KeyPos` 2712-2716 reads exactly two values — no width/height, no `SetSize`) |
| **size** | key_size | columns, rows | 1-256 | 40×20 | Terminal grid size |
| **textsize** | key_textsize | integer | 6-200 | `FontSize` (default 10) | Font size in points (`KeyTextSize` clamp) |
| **color** | key_color | 8 integers | RGB24 | DefaultTermColors | 8 color values (4 pairs) |
| **backcolor** | key_backcolor | integer | RGB24 | clBlack | Window background color. The `clBlack` default is **not** set by `TERM_Configure`; it comes from `SetDefaults` (`vBackColor := DefaultBackColor`, 2880/2891; `DefaultBackColor = clBlack`, 193), which runs at form creation before `TERM_Configure` |
| **update** | key_update | boolean | - | false | Enable buffered update mode |
| **hidexy** | key_hidexy | boolean | - | false | Hide coordinate display |

### 4.3 Size Calculation

**DebugDisplayUnit.pas:2216-2220**
```pascal
SetTextMetrics;                  // Calculate ChrWidth, ChrHeight
vWidth := vCols * ChrWidth;      // Total pixel width
vHeight := vRows * ChrHeight;    // Total pixel height
i := ChrWidth div 2;
SetSize(i, i, i, i);             // Set margins
```

**Example** (40×20 terminal, font size 12):
- ChrWidth ≈ 7 pixels (depends on font)
- ChrHeight ≈ 16 pixels
- vWidth = 40 × 7 = 280 pixels
- vHeight = 20 × 16 = 320 pixels
- Margin = 7 / 2 = 3 pixels

**Total Window**: 286×326 pixels (including margins)

---

## 5. Update Processing

### 5.1 TERM_Update Method

**DebugDisplayUnit.pas:2223-2315**
```pascal
procedure TDebugDisplayForm.TERM_Update;
var
  i, j: integer;
begin
  vUpdateFlag := False;
  while not NextEnd do
  begin
    if NextKey then
    case val of
      key_black..key_gray:      // set text color and maybe text background color
      begin
        Dec(ptr);
        KeyColor(vTextColor);
        KeyColor(vTextBackColor);
      end;
      key_backcolor:            // set text background color
        KeyColor(vTextBackColor);
      key_clear:                // clear screen and home
      begin
        ClearBitmap;
        vUpdateFlag := True;
        vCol := 0;
        vRow := 0;
      end;
      key_update:               // update bitmap
        BitmapToCanvas(0);
      key_save:                 // save bitmap
        KeySave;
      key_pc_key:               // get key
        SendKeyPress;
      key_pc_mouse:             // get mouse
        SendMousePos;
    end
    else
    begin
      if NextNum then
      case val of
        0:                      // clear screen and home
        begin
          ClearBitmap;
          vUpdateFlag := True;
          vCol := 0;
          vRow := 0;
        end;
        1:                      // home
        begin
          vCol := 0;
          vRow := 0;
        end;
        2:                      // set column
          KeyValWithin(vCol, 0, vCols - 1);
        3:                      // set row
          KeyValWithin(vRow, 0, vRows - 1);
        4..7:                   // set colors (select pair 0-3)
        begin
          vTextColor := vColor[(val - 4) * 2 + 0];
          vTextBackColor := vColor[(val - 4) * 2 + 1];
        end;
        8:                      // backspace
          if (vCol <> 0) or (vRow <> 0) then
          begin
            Dec(vCol);
            if vCol < 0 then
            begin
              vCol := vCols - 1;
              Dec(vRow);
            end;
          end;
        9:                      // tab
        begin
          TERM_Chr(' ');
          while vCol and 7 <> 0 do TERM_Chr(' ');
        end;
        10:                     // new line (10)
          TERM_Chr(Chr(13));
        13:                     // new line (13), ignore trailing linefeed (10)
        begin
          TERM_Chr(Chr(13));
          if NextNum then if val <> 10 then Dec(ptr)
        end;
        32..255:                // printable chr
          TERM_Chr(Chr(val));
      end
      else
      if NextStr then
      begin                     // string
        j := Length(PChar(val));
        if j <> 0 then for i := 0 to j - 1 do TERM_Chr(PChar(val)[i]);
      end;
    end;
  end;
  if not vUpdate and vUpdateFlag then BitmapToCanvas(0);
end;
```

### 5.2 Command Processing

**Numeric Commands**:

| Value | Command | Action |
|-------|---------|--------|
| **0** | Clear + Home | Clear screen, move cursor to (0, 0) |
| **1** | Home | Move cursor to (0, 0) |
| **2** | Set Column | Next value = column (0-based) |
| **3** | Set Row | Next value = row (0-based) |
| **4** | Color Pair 0 | Set to pair 0 colors (orange/black) |
| **5** | Color Pair 1 | Set to pair 1 colors (black/orange) |
| **6** | Color Pair 2 | Set to pair 2 colors (lime/black) |
| **7** | Color Pair 3 | Set to pair 3 colors (black/lime) |
| **8** | Backspace | Move cursor back one position |
| **9** | Tab | Space to next 8-column boundary |
| **10** | Line Feed | New line (same as CR) |
| **13** | Carriage Return | New line, ignore following LF |
| **32-255** | Printable | Display ASCII character |

**Key Commands**:

| Key | Action |
|-----|--------|
| **key_black..key_gray** | Set text foreground color (named color + optional brightness); optionally set text background color from next element (lines 2232-2237) |
| **key_backcolor** | Set text background color only (line 2238-2239) |
| **key_clear** | Clear screen and home cursor |
| **key_update** | Force display update (buffered mode) |
| **key_save** | Save display to image file |
| **key_pc_key** | Send keyboard input to host |
| **key_pc_mouse** | Send mouse position to host |

**String Command**:
- **ele_str**: Display entire string at current cursor position

---

## 6. Character Rendering

### 6.1 TERM_Chr Method

**DebugDisplayUnit.pas:2317-2354**
```pascal
procedure TDebugDisplayForm.TERM_Chr(c: Char);
var
  x, y: integer;
  r, r2: TRect;
begin
  if c = Chr(13) then              // Carriage return (newline)
  begin
    if vRow <> vRows - 1 then
      Inc(vRow)                    // Move to next row
    else
    begin
      // Scroll up one line
      r := Rect(vMarginLeft, vMarginTop,
                vMarginLeft + vCols * ChrWidth,
                vMarginTop + (vRows - 1) * ChrHeight);
      r2 := Rect(r.Left, r.Top + ChrHeight, r.Right, r.Bottom + ChrHeight);
      Bitmap[0].Canvas.CopyRect(r, Bitmap[0].Canvas, r2);

      // Clear bottom line
      Bitmap[0].Canvas.Brush.Color := WinRGB(vBackColor);
      r := Rect(r.Left, r.Bottom, r.Right, r2.Bottom);
      Bitmap[0].Canvas.FillRect(r);
      vUpdateFlag := True;
    end;
    vCol := 0;                     // Return to column 0
  end
  else
  begin
    // Auto-wrap to next line if at right edge
    if vCol = vCols then TERM_Chr(Chr(13));

    // Calculate pixel position
    x := vMarginLeft + vCol * ChrWidth;
    y := vMarginTop + vRow * ChrHeight;
    r := Rect(x, y, x + ChrWidth, y + ChrHeight);

    // Render character
    Bitmap[0].Canvas.Font.Color := WinRGB(vTextColor);
    Bitmap[0].Canvas.Brush.Color := WinRGB(vTextBackColor);
    Bitmap[0].Canvas.TextRect(r, x, y, c);
    Inc(vCol);

    // Real-time update (if not in buffered mode)
    if not vUpdate then
    begin
      Bitmap[1].Canvas.CopyRect(r, Bitmap[0].Canvas, r);
      Canvas.CopyRect(r, Bitmap[0].Canvas, r);
    end;
  end;
end;
```

### 6.2 Character Rendering Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Check character type                                     │
│    If CR (13): goto newline handling                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Check for line wrap                                      │
│    If vCol = vCols: call TERM_Chr(Chr(13))                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Calculate pixel position                                 │
│    x = vMarginLeft + vCol × ChrWidth                        │
│    y = vMarginTop + vRow × ChrHeight                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Set text colors                                          │
│    Font.Color = vTextColor                                  │
│    Brush.Color = vTextBackColor                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Render character to Bitmap[0]                            │
│    TextRect(r, x, y, c)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Advance cursor                                           │
│    Inc(vCol)                                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Real-time update (if not buffered)                       │
│    If not vUpdate:                                          │
│      Copy character rect to Bitmap[1] and Canvas            │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Newline Handling

**Normal Case** (not at bottom row):
```pascal
Inc(vRow);     // Move to next row
vCol := 0;     // Return to column 0
```

**Bottom Row Case** (scroll required):
```pascal
// Copy all rows up one line (row 1→0, 2→1, ..., 19→18)
CopyRect(destination, source);

// Clear bottom row
FillRect(bottom_row);

vRow stays at bottom;
vCol := 0;
```

---

## 7. Cursor Management

### 7.1 Cursor Position

**Current Position**:
```pascal
vCol: integer;  // Column (0-based)
vRow: integer;  // Row (0-based)
```

**Valid Ranges**:
```
vCol ∈ [0, vCols - 1]
vRow ∈ [0, vRows - 1]
```

### 7.2 Position Commands

**Home Cursor** (command 1):
```pascal
vCol := 0;
vRow := 0;
```

**Set Column** (command 2 + value):
```pascal
// Example: send 2, then column number
KeyValWithin(vCol, 0, vCols - 1);
```

**Set Row** (command 3 + value):
```pascal
// Example: send 3, then row number
KeyValWithin(vRow, 0, vRows - 1);
```

### 7.3 Cursor Movement

**Forward Movement** (printing character):
```pascal
Inc(vCol);
if vCol = vCols then  // Wrap to next line
begin
  vCol := 0;
  Inc(vRow) or Scroll;
end;
```

**Backward Movement** (backspace, command 8):
```pascal
Dec(vCol);
if vCol < 0 then
begin
  vCol := vCols - 1;
  Dec(vRow);
end;
```

**Tab Movement** (command 9):
```pascal
TERM_Chr(' ');                    // Print space
while vCol and 7 <> 0 do          // Until 8-column boundary
  TERM_Chr(' ');
```

**Tab Positions**: 0, 8, 16, 24, 32, 40, ... (every 8 columns)

---

## 8. Scrolling System

### 8.1 Scroll Trigger

**Condition**: Newline (CR) when cursor is at bottom row (vRow = vRows - 1).

**DebugDisplayUnit.pas:2324-2335**
```pascal
if vRow <> vRows - 1 then
  Inc(vRow)              // Normal case: move to next row
else
begin
  // Scroll up one line
  r := Rect(vMarginLeft, vMarginTop,
            vMarginLeft + vCols * ChrWidth,
            vMarginTop + (vRows - 1) * ChrHeight);
  r2 := Rect(r.Left, r.Top + ChrHeight, r.Right, r.Bottom + ChrHeight);
  Bitmap[0].Canvas.CopyRect(r, Bitmap[0].Canvas, r2);

  // Clear bottom line
  Bitmap[0].Canvas.Brush.Color := WinRGB(vBackColor);
  r := Rect(r.Left, r.Bottom, r.Right, r2.Bottom);
  Bitmap[0].Canvas.FillRect(r);
  vUpdateFlag := True;
end;
```

### 8.2 Scroll Operation

**Step 1: Copy Bitmap** (shift all rows up one line)
```
Source Rectangle:
  Left:   vMarginLeft
  Top:    vMarginTop + ChrHeight     (skip first row)
  Right:  vMarginLeft + vCols × ChrWidth
  Bottom: vMarginTop + vRows × ChrHeight

Destination Rectangle:
  Left:   vMarginLeft
  Top:    vMarginTop                  (overwrite from first row)
  Right:  vMarginLeft + vCols × ChrWidth
  Bottom: vMarginTop + (vRows - 1) × ChrHeight
```

**Effect**: Row 1 → Row 0, Row 2 → Row 1, ..., Row 19 → Row 18

**Step 2: Clear Bottom Line**
```
Rectangle:
  Left:   vMarginLeft
  Top:    vMarginTop + (vRows - 1) × ChrHeight
  Right:  vMarginLeft + vCols × ChrWidth
  Bottom: vMarginTop + vRows × ChrHeight

Fill with: vBackColor
```

**Step 3: Set Update Flag**
```pascal
vUpdateFlag := True;
```

### 8.3 Scroll Performance

**Bitmap Copy**: Hardware-accelerated by Windows GDI (CopyRect).

**Example** (40×20 terminal, 7×16 character):
- Bitmap size: 280×320 pixels
- Scroll area: 280×304 pixels (19 rows)
- Bytes moved: 280 × 304 × 3 = 255,360 bytes (RGB24)

**Performance**: Typically < 1 ms on modern hardware.

---

## 9. Control Commands

### 9.1 Clear Screen

**Command**: 0 or key_clear

**DebugDisplayUnit.pas:2240-2246, 2260-2266**
```pascal
ClearBitmap;
vUpdateFlag := True;
vCol := 0;
vRow := 0;
```

**Actions**:
1. Fill entire bitmap with background color
2. Set update flag
3. Home cursor to (0, 0)

### 9.2 Home Cursor

**Command**: 1

**DebugDisplayUnit.pas:2267-2271**
```pascal
vCol := 0;
vRow := 0;
```

**Action**: Move cursor to top-left without clearing screen.

### 9.3 Color Selection

**Commands**: 4, 5, 6, 7 (select color pairs 0-3)

**DebugDisplayUnit.pas:2276-2280**
```pascal
vTextColor := vColor[(val - 4) * 2 + 0];
vTextBackColor := vColor[(val - 4) * 2 + 1];
```

**Mapping**:
- **Command 4**: Pair 0 → vColor[0], vColor[1]
- **Command 5**: Pair 1 → vColor[2], vColor[3]
- **Command 6**: Pair 2 → vColor[4], vColor[5]
- **Command 7**: Pair 3 → vColor[6], vColor[7]

### 9.4 Backspace

**Command**: 8

**DebugDisplayUnit.pas:2281-2290**
```pascal
if (vCol <> 0) or (vRow <> 0) then
begin
  Dec(vCol);
  if vCol < 0 then
  begin
    vCol := vCols - 1;
    Dec(vRow);
  end;
end;
```

**Behavior**:
- Moves cursor back one position
- Wraps to previous line if at column 0
- Does nothing if at home position (0, 0)
- **Does not erase character** (just moves cursor)

### 9.5 Tab

**Command**: 9

**DebugDisplayUnit.pas:2291-2295**
```pascal
TERM_Chr(' ');
while vCol and 7 <> 0 do TERM_Chr(' ');
```

**Behavior**:
- Prints spaces until reaching next 8-column boundary
- Tab stops at: 8, 16, 24, 32, 40, ...
- Minimum advance: 1 space
- Maximum advance: 8 spaces

**Example**:
```
Column 0: Tab → advance to 8 (8 spaces)
Column 5: Tab → advance to 8 (3 spaces)
Column 8: Tab → advance to 16 (8 spaces)
Column 14: Tab → advance to 16 (2 spaces)
```

### 9.6 Newline

**Commands**: 10 (LF), 13 (CR)

**DebugDisplayUnit.pas:2296-2302**
```pascal
10:                     // new line (10)
  TERM_Chr(Chr(13));

13:                     // new line (13), ignore trailing linefeed (10)
begin
  TERM_Chr(Chr(13));
  if NextNum then if val <> 10 then Dec(ptr)
end;
```

**Behavior**:
- **LF (10)**: Converted to CR
- **CR (13)**: Process newline, consume following LF if present
- **CRLF (13, 10)**: Processed as single newline

---

## 10. Color System

### 10.1 Color Storage

**DebugDisplayUnit.pas:311**
```pascal
var
  vColor: array [0..Channels - 1] of integer;  // Channels = 8
```

**Color Format**: RGB24 (24-bit RGB, $RRGGBB)

### 10.2 Color Pairs

**Pair Structure**:
```
Pair 0: vColor[0] (foreground), vColor[1] (background)
Pair 1: vColor[2] (foreground), vColor[3] (background)
Pair 2: vColor[4] (foreground), vColor[5] (background)
Pair 3: vColor[6] (foreground), vColor[7] (background)
```

**Default Colors** (DebugDisplayUnit.pas:242):
```pascal
DefaultTermColors: array[0..7] of integer =
  (clOrange, clBlack,    // Pair 0: Orange ($FF7F00) on black ($000000)
   clBlack, clOrange,    // Pair 1: Black ($000000) on orange ($FF7F00)
   clLime, clBlack,      // Pair 2: Lime ($00FF00) on black ($000000)
   clBlack, clLime);     // Pair 3: Black ($000000) on lime ($00FF00)
```
The `clXxx` constants are literal RGB24 values (`DebugDisplayUnit.pas` 179–191):
`clOrange = $FF7F00` (note: **NOT** web `$FF8000`/`$FFA500`), `clLime = $00FF00`,
`clBlack = $000000`. `WinRGB` swaps R↔B to BGR only at GDI draw time.

### 10.3 Color Selection

**At Configuration** (key_color):
```pascal
for i := 0 to 7 do if not KeyColor(vColor[i]) then Break;
```

Reads up to 8 color values sequentially.

**At Runtime** (commands 4-7):
```pascal
case val of
  4:  // Pair 0
    vTextColor := vColor[0];
    vTextBackColor := vColor[1];
  5:  // Pair 1
    vTextColor := vColor[2];
    vTextBackColor := vColor[3];
  6:  // Pair 2
    vTextColor := vColor[4];
    vTextBackColor := vColor[5];
  7:  // Pair 3
    vTextColor := vColor[6];
    vTextBackColor := vColor[7];
end;
```

### 10.4 Color Usage

**Character Rendering** (TERM_Chr):
```pascal
Bitmap[0].Canvas.Font.Color := WinRGB(vTextColor);      // Text color
Bitmap[0].Canvas.Brush.Color := WinRGB(vTextBackColor); // Background
```

**Clear Operations**:
```pascal
Bitmap[0].Canvas.Brush.Color := WinRGB(vBackColor);     // Window background
```

---

## 11. Text Metrics

### 11.1 SetTextMetrics Method

**DebugDisplayUnit.pas:2919-2925**
```pascal
procedure TDebugDisplayForm.SetTextMetrics;
begin
  Bitmap[0].Canvas.Font.Size := vTextSize;
  ChrWidth := Bitmap[0].Canvas.TextWidth('X');
  ChrHeight := Bitmap[0].Canvas.TextHeight('X');
end;
```

**Purpose**: Calculate character cell dimensions based on font size.

**Process**:
1. Set font size to vTextSize (points)
2. Measure width of 'X' character → ChrWidth
3. Measure height of 'X' character → ChrHeight

### 11.2 Character Metrics

**Variables**:
```pascal
ChrWidth: integer;   // Pixels per character (horizontal)
ChrHeight: integer;  // Pixels per character (vertical)
```

**Font**: `SetTextMetrics` sets only `Bitmap[0].Canvas.Font.Size := vTextSize` and
does **not** assign a font name — the canvas's inherited font face is used. The cell
size is the measured width/height of the glyph `'X'` at the requested point size
(`2921-2924`); `'X'` is a representative wide glyph, so proportional fonts are
accommodated by sizing every cell to that width.

**Example Measurements** (approximate):

| Font Size | ChrWidth | ChrHeight |
|-----------|----------|-----------|
| 8 pt | 5 | 11 |
| 10 pt | 6 | 13 |
| 12 pt | 7 | 16 |
| 14 pt | 8 | 18 |
| 16 pt | 9 | 21 |
| 20 pt | 11 | 26 |

**Note**: Actual values depend on Windows font settings and DPI.

### 11.3 Display Dimensions

**Pixel Calculations**:
```pascal
vWidth := vCols * ChrWidth;      // Total text area width
vHeight := vRows * ChrHeight;    // Total text area height
```

**Window Size**:
```pascal
ClientWidth := vMarginLeft + vWidth + vMarginRight;
ClientHeight := vMarginTop + vHeight + vMarginBottom;
```

**Example** (40×20, font size 12):
- ChrWidth = 7, ChrHeight = 16
- vWidth = 40 × 7 = 280 pixels
- vHeight = 20 × 16 = 320 pixels
- Margin = 7 / 2 = 3 pixels
- ClientWidth = 3 + 280 + 3 = 286 pixels
- ClientHeight = 3 + 320 + 3 = 326 pixels

---

## 12. Command Protocol

### 12.1 Configuration Command

**Format** (element array):
```
ele_key, dis_term,
ele_key, key_title, ele_str, "Terminal", ele_end,
ele_key, key_pos, ele_num, left, ele_num, top,   // window position only (two operands)
ele_key, key_size, ele_num, cols, ele_num, rows,
ele_key, key_textsize, ele_num, font_size,
ele_key, key_color,
  ele_num, fg0, ele_num, bg0,
  ele_num, fg1, ele_num, bg1,
  ele_num, fg2, ele_num, bg2,
  ele_num, fg3, ele_num, bg3,
ele_key, key_update,
ele_end
```

### 12.2 Update Commands

**Numeric Values**:
```
ele_num, 0,           // Clear screen and home
ele_num, 1,           // Home cursor
ele_num, 2, ele_num, col,  // Set column
ele_num, 3, ele_num, row,  // Set row
ele_num, 4,           // Color pair 0
ele_num, 5,           // Color pair 1
ele_num, 6,           // Color pair 2
ele_num, 7,           // Color pair 3
ele_num, 8,           // Backspace
ele_num, 9,           // Tab
ele_num, 10,          // Line feed
ele_num, 13,          // Carriage return
ele_num, 32,          // Space
ele_num, 65,          // 'A'
..., ele_end
```

**String Output**:
```
ele_str, "Hello, World!", ele_end
```

**Force Update** (buffered mode):
```
ele_key, key_update, ele_end
```

---

## 13. Usage Examples

### 13.1 Basic Text Output

**Goal**: Display simple text messages.

**Configuration**:
```
TERM SIZE 40 20
```

**Propeller 2 Code**:
```spin2
debug(`TERM "Hello, World!")
debug(`TERM 13)  ' Newline
debug(`TERM "Line 2")
```

**Output**:
```
Hello, World!
Line 2
_
```

### 13.2 Cursor Positioning

**Goal**: Position text at specific row/column.

**Propeller 2 Code**:
```spin2
debug(`TERM 1)           ' Home cursor
debug(`TERM 3 `UDEC_(5))  ' Set row to 5
debug(`TERM 2 `UDEC_(10)) ' Set column to 10
debug(`TERM "Positioned text")
```

**Output**:
```
(row 0)
(row 1)
...
(row 5)          Positioned text
```

### 13.3 Color Text

**Goal**: Use different colors for status messages.

**Configuration**:
```
TERM SIZE 40 20 COLOR $FF7F00 $000000 $000000 $FF7F00 $00FF00 $000000 $FF0000 $000000
```
Pairs: Orange/Black, Black/Orange, Green/Black, Red/Black (here Orange = `clOrange` `$FF7F00`)

**Propeller 2 Code**:
```spin2
debug(`TERM 4 "Normal message" 13)    ' Pair 0 (orange)
debug(`TERM 6 "Success!" 13)          ' Pair 2 (green)
debug(`TERM 7 "Error!" 13)            ' Pair 3 (red)
```

**Output** (in color):
```
Normal message  (orange text)
Success!        (green text)
Error!          (red text)
```

### 13.4 Formatted Data Table

**Goal**: Display aligned data columns.

**Propeller 2 Code**:
```spin2
debug(`TERM 0)            ' Clear screen
debug(`TERM "Sensor" 9 "Value" 9 "Status" 13)
debug(`TERM "Temp" 9 `UDEC_(temp) 9 "OK" 13)
debug(`TERM "Press" 9 `UDEC_(press) 9 "OK" 13)
```

**Output**:
```
Sensor  Value   Status
Temp    25      OK
Press   1013    OK
```

### 13.5 Scrolling Log

**Goal**: Continuous logging with auto-scroll.

**Configuration**:
```
TERM SIZE 80 25
```

**Propeller 2 Code**:
```spin2
repeat
  debug(`TERM `UDEC_(milliseconds()) " Event occurred" 13)
  waitms(100)
```

**Output** (scrolls continuously):
```
...
1234 Event occurred
1334 Event occurred
1434 Event occurred
1534 Event occurred
_
```

### 13.6 Buffered Update Mode

**Goal**: Reduce flicker during complex updates.

**Configuration**:
```
TERM SIZE 40 20 UPDATE
```

**Propeller 2 Code**:
```spin2
' Clear and redraw entire screen
debug(`TERM 0)            ' Clear
debug(`TERM "Header")
debug(`TERM 13)
' ... more text ...
debug(`TERM `UPDATE)      ' Force single update
```

**Behavior**: All text buffered, then displayed once with UPDATE command.

---

## 14. Performance Characteristics

### 14.1 Character Rendering Speed

**Single Character**:
- Font rendering: ~0.01-0.05 ms (GDI TextRect)
- Bitmap copy (real-time mode): ~0.005 ms
- **Total**: ~0.02-0.06 ms per character

**String Rendering** (N characters):
- Sequential TERM_Chr calls: N × 0.02-0.06 ms
- **100-character string**: ~2-6 ms

**Example** (40×20 terminal, full screen):
- Total characters: 800
- Render time: ~16-48 ms
- **Frame rate**: 20-60 Hz

### 14.2 Scrolling Performance

**Bitmap Copy** (CopyRect):
- 40×20 terminal, 7×16 chars
- Bitmap size: 280×320 pixels
- Scroll area: 280×304 pixels (19 rows)
- **Copy time**: ~0.5-1.0 ms (hardware-accelerated)

**Clear Bottom Line**:
- 280×16 pixels
- **Clear time**: ~0.1 ms

**Total Scroll**: ~0.6-1.1 ms

### 14.3 Update Modes

**Real-Time Mode** (vUpdate = False, default):
- Each character immediately copied to display
- **Latency**: 0.02-0.06 ms
- **Use**: Interactive console, live logging

**Buffered Mode** (vUpdate = True):
- All changes buffered in Bitmap[0]
- Single BitmapToCanvas(0) call on UPDATE command
- **Latency**: Variable (until UPDATE)
- **Use**: Complex redraws, flicker reduction

### 14.4 Memory Usage

**Bitmap Buffers**:
- Bitmap[0]: Render target
- Bitmap[1]: Display buffer
- Size: (vWidth + margins) × (vHeight + margins) × 3 bytes

**Example** (40×20, 286×326 pixels):
- Bitmap[0]: 286 × 326 × 3 = 279,852 bytes (~273 KB)
- Bitmap[1]: 286 × 326 × 3 = 279,852 bytes (~273 KB)
- **Total**: ~546 KB

**Color Array**:
- 8 integers × 4 bytes = 32 bytes

**Total Memory**: ~546 KB

---

## 15. Terminal Emulation

### 15.1 Terminal Type

**Emulation**: Basic text terminal (similar to TTY, not full VT100/ANSI)

**Supported Features**:
- Character output
- Cursor positioning (row/column)
- Scrolling
- Color selection (limited)
- Tab expansion
- Newline handling

**Not Supported**:
- ANSI escape sequences
- Cursor movement sequences (e.g., ESC[A for up)
- Attributes (bold, underline, blink)
- Alternate screen buffer
- Mouse tracking
- Line drawing characters

### 15.2 Control Code Handling

**Supported Control Codes**:

| Code | ASCII | Name | Action |
|------|-------|------|--------|
| 8 | BS | Backspace | Move cursor back |
| 9 | HT | Horizontal Tab | Space to tab stop |
| 10 | LF | Line Feed | New line |
| 13 | CR | Carriage Return | New line |

**Other numeric codes 0-7, 11, 12**: handled as TERM control commands (clear,
home, set column/row, select color pair) — see §9 — not as classic terminal control
characters. **Codes 14-31** (and negatives, and values > 255) fall through the
numeric `case` with no action (§16.6). Note the string-vs-numeric asymmetry: codes
`9` (tab) and `10` (LF) act as control only via the numeric path; the same byte
inside an `ele_str` renders as a glyph (§16.7).

### 15.3 Newline Behavior

**Standard Terminal** (CRLF):
```
CR (13): Move to column 0
LF (10): Move to next row
CRLF (13, 10): Both actions
```

**TERM Display**:
```
CR (13): Column 0 + next row (combined)
LF (10): Converted to CR
CRLF (13, 10): Processed as single newline
```

**Implication**: LF and CR are equivalent **on the numeric path**; CRLF is the same
as a single LF or CR. This equivalence does **not** hold inside an `ele_str` — there
only `Chr(13)` is a newline, while `Chr(10)` renders as a glyph (§16.7).

### 15.4 Comparison with Standard Terminals

| Feature | TERM Display | VT100 | Basic TTY |
|---------|--------------|-------|-----------|
| **Character output** | ✓ | ✓ | ✓ |
| **Scrolling** | ✓ | ✓ | ✓ |
| **Cursor positioning** | ✓ (commands) | ✓ (ESC sequences) | ✗ |
| **Colors** | ✓ (4 pairs) | ✓ (8/16 colors) | ✗ |
| **ANSI escapes** | ✗ | ✓ | ✗ |
| **Attributes** | ✗ | ✓ | ✗ |
| **Tab stops** | ✓ (fixed 8) | ✓ (programmable) | ✓ |
| **Backspace** | ✓ (cursor only) | ✓ (destructive) | ✓ |

---

## 16. Implementation Details

### 16.1 Bitmap System

**Double-Buffering**:
- **Bitmap[0]**: Render target (always up-to-date)
- **Bitmap[1]**: Display buffer (shown on screen)

**Real-Time Mode**:
```pascal
// After each character:
Bitmap[1].Canvas.CopyRect(r, Bitmap[0].Canvas, r);  // Update display buffer
Canvas.CopyRect(r, Bitmap[0].Canvas, r);            // Update screen
```

**Buffered Mode**:
```pascal
// On UPDATE command:
BitmapToCanvas(0);  // Copy entire Bitmap[0] → Bitmap[1] → Canvas
```

### 16.2 Font Rendering

**Windows GDI TextRect**:
```pascal
Canvas.TextRect(r, x, y, c);
```

**Parameters**:
- **r**: Clipping rectangle (character cell bounds)
- **x, y**: Text baseline position
- **c**: Character to render

**Background**: Filled automatically using Brush.Color.

**Font Metrics**: Character cells are sized to the measured width/height of `'X'`
at the configured point size (`SetTextMetrics`, 2919-2925) — not to the widest
glyph in the font. Glyphs wider than `'X'` may be clipped by the `TextRect`
clipping rectangle.

### 16.3 Coordinate System

**Logical Coordinates** (row/column):
```
vRow ∈ [0, vRows - 1]
vCol ∈ [0, vCols - 1]
```

**Pixel Coordinates**:
```pascal
x := vMarginLeft + vCol * ChrWidth;
y := vMarginTop + vRow * ChrHeight;
```

**Origin**: Top-left corner of terminal grid.

### 16.4 String Processing

**DebugDisplayUnit.pas:2307-2311**
```pascal
if NextStr then
begin
  j := Length(PChar(val));
  if j <> 0 then for i := 0 to j - 1 do TERM_Chr(PChar(val)[i]);
end;
```

**Process**:
1. Get string length
2. Iterate through each character
3. Call TERM_Chr for each character

**Efficiency**: Sequential character rendering (no optimization for string batching).

### 16.5 Margin Calculation

**DebugDisplayUnit.pas:2219-2220**
```pascal
i := ChrWidth div 2;
SetSize(i, i, i, i);  // All margins = ChrWidth / 2
```

**Purpose**: Provide visual spacing around terminal grid.

**Margin**: Half-character width on all sides.

**Example** (ChrWidth = 7):
- Margin = 3 pixels
- Total window = 3 + (40×7) + 3 = 286 pixels wide

### 16.6 Receiving types & numeric parity (TS-port contract)

The numeric control element `val` is a **signed 32-bit `integer`** (`ptr`/`val`
declared at 357-358). The `case val of` dispatch in `TERM_Update` (2259-2305) is
therefore a signed-32 switch, and the operands consumed by codes `2`/`3` (the
trailing column/row number) are likewise signed-32. Two consequences a TS port must
reproduce exactly:

- **Negative values fall through with no action.** Because `val` is signed, any
  negative number reaches none of the `case` labels (`0..13`, `32..255`) and is
  silently dropped — not just the 14-31 gap noted elsewhere.
- **Values > 255 also fall through with no action.** The largest label is `255`;
  anything above it (up to `$7FFFFFFF`) matches no branch and is dropped.

So the true "no-op" set is **negative ∪ 14..31 ∪ 256..$7FFFFFFF**, all silently
ignored. The state these codes manipulate is all signed-32 `integer`:
`vCols`/`vRows`/`vCol`/`vRow` (343-346) and `vColor[]`/`vTextColor`/`vTextBackColor`/
`vBackColor` (311, 321-322, 317). (`vOpacity`/`vPrecise` at 341-342 are `byte`, but
TERM never reads them.)

**Parity notes for the port:**
- **Margin `ChrWidth div 2`** (2219): Pascal `div` truncates **toward zero**. A TS
  port must use truncating integer division (e.g. `Math.trunc(ChrWidth / 2)` or
  `ChrWidth >> 1` for the non-negative `ChrWidth`), not `Math.floor` semantics that
  differ for negatives.
- **Clamps are inclusive.** The codes `2`/`3` column/row clamps go through
  `KeyValWithin` → `Within(val, bottom, top)`, and the SIZE/TEXTSIZE config clamps go
  through the same `Within` (GlobalUnit 222-227). `Within` returns `Minimum` when
  `Value < Minimum` and `Maximum` when `Value > Maximum`, so both endpoints are
  **inclusive** (`[0, vCols-1]`, `[0, vRows-1]`, `[1, 256]`, etc.).
- **Named-color path uses logical `shl`.** `KeyColor` builds the RGBI8x value with
  `h shl 5 or p shl 1` (2774) — Pascal `shl` on the signed-but-small operands is a
  logical left shift; port with `<<` on unsigned/masked values.

### 16.7 Control-flow and edge-case facts

- **String vs numeric control-code asymmetry.** Tab expansion and newline handling
  live **only** in the numeric `case` of `TERM_Update`: code `9` expands a tab to the
  next 8-column stop (2291-2295) and codes `10`/`13` emit a newline (2296-2302).
  Inside an `ele_str`, every character is routed through `TERM_Chr` (2307-2311), and
  `TERM_Chr` special-cases **only** `Chr(13)` (2322). Therefore a `Chr(9)` embedded in
  a string renders as a **glyph (not a tab)** and a `Chr(10)` embedded in a string
  renders as a **glyph (not a newline)** — only `Chr(13)` acts as a newline from
  within a string. The numeric and string paths are not equivalent for codes 9 and
  10.
- **Code 13 (CR) look-ahead (CRLF swallow vs push-back).** After emitting the
  newline, code 13 runs `if NextNum then if val <> 10 then Dec(ptr)` (2298-2302). If
  the next element is the number `10`, it is **consumed** (CRLF collapses to one
  newline). If the next element is any **other** number, the pointer is pushed back
  with `Dec(ptr)` so that number is re-read and processed normally. (If the next
  element is not a number, nothing is consumed.)
- **Backspace (code 8) row wrap.** Code 8 (2281-2290) decrements `vCol`; if `vCol`
  goes below 0 it wraps to the **previous row's last column** (`vCol := vCols - 1;
  Dec(vRow)`). It is a no-op only at home `(0,0)`; it never repaints the cell (cursor
  move only — see §9.4).
- **Column auto-wrap fires on exact equality.** The auto-wrap in `TERM_Chr` triggers
  when `vCol = vCols` **exactly** (2340), and it is **deferred**: a glyph written at
  the last column (`vCol = vCols - 1`) is drawn first and `vCol` is incremented to
  `vCols`; the wrap (via `TERM_Chr(Chr(13))`) only happens on the *next* character,
  before it is drawn.

---

## 17. Element Array Protocol Specification

### 17.1 Protocol Overview

TERM uses element arrays for configuration and character data transmission.

**Element Storage**:
```pascal
DebugDisplayType:  array[0..DebugDisplayLimit - 1] of integer;
DebugDisplayValue: array[0..DebugDisplayLimit - 1] of integer;
```

### 17.2 TERM Configuration Example

```
Element Array:
[0] type=ele_key   value=key_size        → SIZE
[1] type=ele_num   value=40              → columns
[2] type=ele_num   value=25              → rows
[3] type=ele_key   value=key_textsize    → TEXTSIZE
[4] type=ele_num   value=12              → font size
[5] type=ele_end   value=0
```

### 17.3 TERM Character Output Example

```
Element Array:
[0] type=ele_str   value=<ptr>           → "Hello World\n"
[1] type=ele_end   value=0
```

Each character processed sequentially through TERM_Chr.

---

## 18. Buffer Management and Timing

TERM holds **no character-grid model** in v55. There is no `TermBuff`, no
per-cell record, and no glyph/attribute store. The only retained terminal state is
the cursor position (`vCol`, `vRow`) and the active colors (`vTextColor`,
`vTextBackColor`, `vBackColor`); the on-screen text itself lives solely as pixels
in `Bitmap[0]`. All buffer management is therefore bitmap management.

### 18.1 The Bitmap Is the Buffer

`TERM_Chr` (lines 2317-2354) paints each glyph straight into `Bitmap[0]` with
`Canvas.TextRect`. The "buffer" of displayed characters is the bitmap — once a
glyph is drawn there is no record of which character occupies a cell, only the
rendered pixels. Consequently TERM cannot read back a cell's character; operations
that "erase" (e.g. backspace, code 8) only move the cursor and never repaint the
cell (see §9.4).

### 18.2 Write Operations

Writing a printable character runs the `else` branch of `TERM_Chr` (lines
2338-2353). It computes the cell's pixel rectangle from `vCol`/`vRow` and the
metrics `ChrWidth`/`ChrHeight` (lines 2341-2343), sets the fg/bg colors and draws
the glyph with `TextRect` (lines 2344-2346), then `Inc(vCol)` (line 2347).
Auto-wrap is handled first: `if vCol = vCols then TERM_Chr(Chr(13))` (line 2340),
which performs a CR (column reset + row advance or scroll) before drawing. There is
no intermediate cell store to update — the write is the draw.

### 18.3 Scrolling Operations

Scrolling is purely a pixel operation. When a CR arrives with the cursor already on
the last row (`vRow = vRows - 1`), the `else` block (lines 2326-2335) copies the
text area up one line with a single `Bitmap[0].Canvas.CopyRect` (line 2330) and
then `FillRect`s the freed bottom line with `vBackColor` (lines 2331-2333), setting
`vUpdateFlag` (line 2334). No row array is shifted — the rows move because their
pixels are block-copied. See §8 for the exact source rectangles.

### 18.4 Update Timing

In real-time mode (`vUpdate = False`, default) each `TERM_Chr` immediately mirrors
the just-drawn cell rectangle from `Bitmap[0]` to `Bitmap[1]` and to the on-screen
`Canvas` (lines 2349-2353), so output appears character-by-character. In buffered
mode (`vUpdate = True`, set by the `UPDATE` config directive) those per-character
copies are skipped; `Bitmap[0]` accumulates silently until an explicit `UPDATE`
directive runs `BitmapToCanvas(0)` (line 2248). Independently, `vUpdateFlag` is set
whenever a clear or scroll dirties the whole bitmap; at the end of `TERM_Update`,
`if not vUpdate and vUpdateFlag then BitmapToCanvas(0)` (line 2314) flushes those
full-bitmap changes in one copy.

---

## 19. Bitmap System and Double-Buffering

### 19.1 Bitmap Architecture

The v55 TERM window uses the same shared double-buffer present in all display
windows (declared in the form, not TERM-specific):

```pascal
Bitmap: array[0..1] of TBitmap;  // Double-buffered (shared infrastructure)
```

**Roles in TERM:**
- `Bitmap[0]` — render target; all `TERM_Chr` drawing goes here
- `Bitmap[1]` — display buffer; in real-time mode each character rect is also
  copied here and to `Canvas` immediately; in buffered mode only copied on `UPDATE`

### 19.2 Character Rendering

Character rendering in v55 is performed entirely inside `TERM_Chr` (lines
2317-2354); there is no separate `RenderChar` helper and no `TCharCell` cell type.
The procedure sets `Bitmap[0].Canvas.Font.Color := WinRGB(vTextColor)` and
`Bitmap[0].Canvas.Brush.Color := WinRGB(vTextBackColor)`, then calls
`Bitmap[0].Canvas.TextRect(r, x, y, c)` where `r` is the cell rectangle derived
from `vCol`/`vRow` × `ChrWidth`/`ChrHeight` plus the margins (lines 2344-2348). The
`Brush.Color` fills the cell background as part of the `TextRect` call, so each
glyph is opaque over its background pair color. See §6.1 for the full procedure.

### 19.3 Cursor Rendering

There is **no cursor rendering** in TERM. The terminal cursor is purely the implicit
write position `vCol`/`vRow` — the next glyph is drawn there. `DebugDisplayUnit.pas`
contains no caret-draw, no blink timer, and no cursor erase/restore for the TERM
window: nothing in `TERM_Chr` or `TERM_Update` paints a cursor indicator. Cursor
movement directives (home/set-column/set-row/backspace) only update the integer
pair `vCol`/`vRow`; they leave the bitmap untouched.

---

## 20. Shared Infrastructure

### 20.1 Color System

TERM color is controlled entirely by the eight-element `vColor[0..7]` array — four
text/background pairs filled at configuration time from `key_color` (or the
`DefaultTermColors`). There is no separate color-mode/LUT machinery for TERM (the
`LUT1..RGB24` color modes used by PLOT/BITMAP do not apply here), and there is no
`~n` color-escape syntax in the byte stream — color changes arrive only as numeric
codes 4-7 (select pair) or as named-color key directives (`key_black..key_gray`).
See §10 and the Directive Reference above for the runtime mechanics.

**TERM color storage (v55)**:
```pascal
vColor: array [0..7] of integer;     // 4 text/background pairs (config-time)
vTextColor, vTextBackColor: integer; // currently active text fg / bg
vBackColor: integer;                 // window canvas background (clear/scroll fill)
```

`vTextColor`/`vTextBackColor` are the colors applied per glyph by `TERM_Chr` (§19.2);
`vBackColor` is the fill used by `ClearBitmap` and by the scroll's bottom-line
`FillRect` (§8.1).

### 20.2 Text Metrics

The v55 `SetTextMetrics` measures `'X'` and does not assign a font name (see §11.1,
lines 2919-2925):

```pascal
procedure TDebugDisplayForm.SetTextMetrics;
begin
  Bitmap[0].Canvas.Font.Size := vTextSize;
  ChrWidth := Bitmap[0].Canvas.TextWidth('X');
  ChrHeight := Bitmap[0].Canvas.TextHeight('X');
end;
```

### 20.3 Control Character Processing

Control behavior is driven by **numeric elements**, not by in-band escape bytes.
`TERM_Update` (lines 2223-2315) dispatches each `ele_num` value through a `case`:
values 0-13 perform the control actions in §9 (clear, home, set column/row, select
color pair, backspace, tab, newline) and values 32-255 print a glyph via
`TERM_Chr`. There is no `~`-style escape mechanism in TERM — directives reach the
window as discrete protocol elements (`ele_key`, `ele_num`, `ele_str`), so a
control code such as CR is the integer `13`, not an embedded escape sequence.

The one place raw character bytes are interpreted is inside an `ele_str`: each
character of the string is passed to `TERM_Chr` verbatim (lines 2307-2311), so a
`Chr(13)` embedded in a string acts as a newline, but the string path still routes
through `TERM_Chr` rather than the numeric `case`. See §9 and the Directive
Reference above for the authoritative code table.

---

## 21. Initialization Lifecycle

### 21.1 Window Creation

The TERM window is created by the shared form infrastructure and configured by
`TERM_Configure` (lines 2181-2221). The lifecycle at creation:

1. Shared `FormCreate` (`591-643`) runs — selects the display type and creates the
   double-buffer `Bitmap[0]`/`Bitmap[1]` and the form-level timers/handlers common
   to all nine windows.
2. `TERM_Configure` is called — applies TERM's unique defaults: `vTextSize := FontSize`,
   `vCols := DefaultCols` (40), `vRows := DefaultRows` (20), `vCol := 0`, `vRow := 0`,
   and `vColor[0..7] := DefaultTermColors` (lines 2185-2190). It then walks the
   element stream with `NextKey`, applying any `TITLE/POS/SIZE/TEXTSIZE/COLOR/
   BACKCOLOR/UPDATE/HIDEXY` directives (lines 2192-2210).
3. Active colors are seeded from pair 0: `vTextColor := vColor[0]`,
   `vTextBackColor := vColor[1]` (lines 2212-2213).
4. `SetTextMetrics` (2919-2925) runs inside `TERM_Configure` — sets the font size
   and measures `'X'` to get `ChrWidth`/`ChrHeight`; then `vWidth := vCols*ChrWidth`,
   `vHeight := vRows*ChrHeight` (lines 2215-2218).
5. `SetSize(i, i, i, i)` is called with `i := ChrWidth div 2` margin on all sides
   (lines 2219-2220); `SetSize` (2926-2972) sizes both bitmaps to the margined
   client area and calls `ClearBitmap`.

There is no `vCursorVisible`, no `vColorIndex`, and no `TermBuff` — none of these
exist in the v55 source. The only TERM state initialized is the cursor pair, the
colors, and the grid dimensions.

### 21.2 Configuration Processing

The actual v55 configuration parser (from `TERM_Configure` lines 2193-2211):

```pascal
while NextKey do
case val of
  key_title:    KeyTitle;
  key_pos:      KeyPos;
  key_size:     KeySize(vCols, vRows, term_colmin, term_colmax, term_rowmin, term_rowmax);
  key_textsize: KeyTextSize;
  key_color:    for i := 0 to 7 do if not KeyColor(vColor[i]) then Break;
  key_backcolor: KeyColor(vBackColor);
  key_update:   vUpdate := True;
  key_hidexy:   vHideXY := True;
end;
```

### 21.3 Runtime State

```
[Ready] → TERM_Update called with element stream
   ↓
[Dispatch] → ele_key? → named color / CLEAR / UPDATE / SAVE / PC_KEY / PC_MOUSE
             ele_num?  → control codes 0-13 or printable 32-255 → TERM_Chr
             ele_str?  → iterate chars → TERM_Chr each
   ↓ (per printable char in TERM_Chr)
[Render] → TextRect to Bitmap[0] at (vCol,vRow) pixel position
   ↓
[Advance cursor] → Inc(vCol); if vCol=vCols → wrap/scroll via TERM_Chr(Chr(13))
   ↓ (if not vUpdate)
[Copy rect] → Bitmap[1] + Canvas immediately updated
   ↓
Loop back to Ready
```

---

## 22. Summary

The **TERM** display window provides a simple yet effective text-based terminal interface for the Propeller 2 debug system. Its straightforward character-mode display makes it ideal for:

**Key Strengths**:
- Simple text output (no escape sequence complexity)
- Automatic scrolling for continuous logging
- Color-coded messages (4 color pairs)
- Direct cursor positioning
- Efficient real-time rendering
- Familiar terminal-like interface

**Typical Use Cases**:
- Debug messages and status output
- Data logging and monitoring
- Simple text-based UIs
- Serial console emulation
- Test result reporting

**Performance**: Capable of rendering hundreds of characters per second with hardware-accelerated scrolling, making it suitable for real-time debug output while maintaining minimal CPU overhead.

The TERM display complements the graphical displays (SCOPE, PLOT, SPECTRO) by providing a text-oriented interface for diagnostic messages, variable dumps, and interactive debugging sessions.
