# MIDI Display Window - Theory of Operations

**Current as of**: PNut v55 for Propeller 2
**Directive coverage verified**: 2026-06-01 against `DebugDisplayUnit.pas` (v55)
**Companion**: [Debug Window Directive Matrix](../DEBUG-WINDOW-DIRECTIVE-MATRIX.md) — cross-window config/display/keyboard/mouse reference

## Table of Contents

1. [Overview](#1-overview)
2. [Display Type and Constants](#2-display-type-and-constants)
3. [Data Structures](#3-data-structures)
4. [Configuration and Initialization](#4-configuration-and-initialization)
5. [MIDI Protocol Processing](#5-midi-protocol-processing)
6. [Piano Keyboard Rendering](#6-piano-keyboard-rendering)
7. [Note Velocity Visualization](#7-note-velocity-visualization)
8. [Keyboard Geometry](#8-keyboard-geometry)
9. [Update and Command Processing](#9-update-and-command-processing)
10. [Color System](#10-color-system)
11. [Key Numbering and Layout](#11-key-numbering-and-layout)
12. [Command Protocol](#12-command-protocol)
13. [Usage Examples](#13-usage-examples)
14. [Performance Characteristics](#14-performance-characteristics)
15. [MIDI Standard Compliance](#15-midi-standard-compliance)
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

The **MIDI** display window provides a real-time visual representation of MIDI (Musical Instrument Digital Interface) note events. It displays an on-screen piano keyboard that visually responds to MIDI note-on and note-off messages, showing:

- **Piano keyboard**: Visual representation of 88 keys (or configurable range)
- **Note activity**: Illuminated keys for active notes
- **Velocity visualization**: Key color intensity proportional to note velocity
- **Channel filtering**: Display notes from a specific MIDI channel (0-15)
- **Customizable range**: Display any subset of 128 MIDI notes (0-127)
- **Scalable display**: Adjustable key size for different screen resolutions

This window is perfect for visualizing musical performances, debugging MIDI implementations, monitoring synthesizer activity, and creating interactive music visualizations.

### 1.2 Key Features

- **128-note support**: Full MIDI note range (0-127)
- **Configurable key range**: Display any subset (e.g., 21-108 for standard piano)
- **Realistic keyboard**: White and black keys with proper geometry and positioning
- **Velocity-sensitive**: Visual feedback proportional to note velocity (0-127)
- **Channel selection**: Filter to single MIDI channel (0-15)
- **Dual color modes**: Separate colors for white and black key illumination
- **Scalable sizing**: Key size adjustable from 1× to 50× base size
- **Note labels**: Key numbers displayed on each key (rotated 90°)
- **Standard MIDI protocol**: Processes standard note-on ($9n) and note-off ($8n) messages
- **Running status**: Supports MIDI running status for efficient transmission

### 1.3 Typical Applications

- **MIDI monitoring**: Visualize MIDI traffic from keyboards, controllers
- **Synthesizer debugging**: Verify note-on/off events and velocities
- **Music visualization**: Real-time display of musical performances
- **MIDI implementation testing**: Validate MIDI protocol compliance
- **Educational tools**: Demonstrate musical concepts and note relationships
- **Live performance displays**: Audience-facing visualization
- **Recording/playback monitoring**: Visualize MIDI file playback
- **Multi-instrument tracking**: Monitor polyphonic note activity

---

## 2. Display Type and Constants

### 2.1 Display Type Identifier

**DebugDisplayUnit.pas:30**
```pascal
const
  dis_midi = 8;
```

The MIDI display is identified by `dis_midi = 8` in the display type enumeration.

### 2.2 MIDI Constants

**DebugDisplayUnit.pas:234-235**
```pascal
const
  MidiSizeBase          = 8;
  MidiSizeFactor        = 4;
```

**Size Calculation**:
```
MidiKeySize = MidiSizeBase + MidiSize × MidiSizeFactor
            = 8 + MidiSize × 4
```

**MidiSize Range**: 1-50

**Key Sizes**:

| MidiSize | MidiKeySize (pixels) | Typical Use |
|----------|----------------------|-------------|
| 1 | 12 | Minimum, compact display |
| 2 | 16 | Small display |
| 3 | 20 | Compact |
| 4 | 24 | Default, balanced |
| 5 | 28 | Medium |
| 10 | 48 | Large |
| 25 | 108 | Extra large |
| 50 | 208 | Maximum, full screen |

### 2.3 MIDI Note Range

**Standard MIDI Notes**: 0-127 (128 notes)

**Standard Piano Range**: 21-108 (88 keys, A0 to C8)

**Note to Frequency**:
```
frequency = 440 × 2^((note - 69) / 12) Hz
```

**Example Notes**:
- **21**: A0 (27.5 Hz)
- **60**: Middle C (C4, 261.6 Hz)
- **69**: A4 (440 Hz, concert pitch)
- **108**: C8 (4186 Hz)

---

## 3. Data Structures

### 3.1 MIDI State Variables

**DebugDisplayUnit.pas:369-376, 382**
```pascal
var
  MidiSize              : integer;  // User size parameter (1-50)
  MidiKeySize           : integer;  // Calculated key size (pixels)
  MidiKeyFirst          : integer;  // First note to display (0-127)
  MidiKeyLast           : integer;  // Last note to display (0-127)
  MidiOffset            : integer;  // Horizontal offset for display
  MidiChannel           : integer;  // MIDI channel filter (0-15)
  MidiState             : integer;  // Protocol parser state (0-4)
  MidiNote              : integer;  // Current note being processed
  MidiVelocity          : array [0..127] of integer;  // Velocity per note
```

**State Variables**:
- **MidiSize**: User-specified size multiplier
- **MidiKeySize**: Calculated pixel width of white keys
- **MidiKeyFirst, MidiKeyLast**: Display range (inclusive)
- **MidiChannel**: MIDI channel to monitor (0-15)
- **MidiState**: Protocol state machine (0=idle, 1=note-on note, 2=note-on vel, 3=note-off note, 4=note-off vel)
- **MidiVelocity**: Array storing current velocity for each of 128 notes

### 3.2 Key Geometry Arrays

**DebugDisplayUnit.pas:377-381**
```pascal
var
  MidiBlack             : array [0..127] of boolean;   // True if black key
  MidiLeft              : array [0..127] of integer;   // Left edge (pixels)
  MidiRight             : array [0..127] of integer;   // Right edge (pixels)
  MidiBottom            : array [0..127] of integer;   // Bottom edge (pixels)
  MidiNumX              : array [0..127] of integer;   // Note label X position
```

**Purpose**: Pre-calculated geometry for all 128 MIDI notes.

**Arrays**:
- **MidiBlack**: Key color (true = black, false = white)
- **MidiLeft, MidiRight**: Horizontal key boundaries
- **MidiBottom**: Key height (black keys shorter than white)
- **MidiNumX**: Horizontal position for note number label

**Memory**: 128 × (1 + 4×4) bytes = 2,176 bytes (~2 KB)

### 3.3 Color Variables

**DebugDisplayUnit.pas:311**
```pascal
var
  vColor: array [0..Channels - 1] of integer;  // Channels = 8
```

**MIDI Color Usage**:
- **vColor[0]**: Active white key color (default: cyan)
- **vColor[1]**: Active black key color (default: magenta)
- **vColor[2..7]**: Unused

---

## Directive Reference (v55-verified)

Verified against `DebugDisplayUnit.pas` (v55): `MIDI_Configure` (2492–2588), `MIDI_Update` (2590–2643), shared input handlers (585–857, 3537–3583).

### Configuration directives

Accepted in `MIDI_Configure` (run once at window creation).

Each row: directive → parameter(s) with **type · legal range · default** (matrix §7.3 MIDI; ranges resolved from `KeyValWithin`/`KeyColor` calls in `MIDI_Configure`, §7.1).

| Directive | Parameter(s) — type · range · default | Pascal lines |
|---|---|---|
| `TITLE 'str'` | `'text'` · free string · "MIDI" | 2508–2509 |
| `POS left top` | left, top · int (offset from base window pos) | 2510–2511 |
| `SIZE n` | n · int **1..50** · **4** — key-size scalar (NOT pixels); `MidiKeySize = 8 + n×4` | 2512–2513 |
| `RANGE firstKey lastKey` | firstKey · int **0..127** · **21**; lastKey · int **firstKey..127** · **108** (lastKey clamped ≥ firstKey, 2517–2518) | 2514–2519 |
| `CHANNEL n` | n · int **0..15** · **0** — exact MIDI channel filter (no "all" sentinel) | 2520–2521 |
| `COLOR onWhite onBlack` | onWhite, onBlack · color, color · **CYAN, MAGENTA** — velocity colors for white keys then black keys (`vColor[0]`, `vColor[1]`) | 2522–2524 |

Color parameters accept a named color (§7.1: `BLACK WHITE ORANGE BLUE GREEN CYAN RED MAGENTA YELLOW GRAY`, optional brightness nibble) or a numeric value through the current color mode (`KeyColor`, 2752–2783).

**Not accepted by MIDI_Configure**: `HIDEXY` (matrix §2, §6). MIDI is the only window that does **not** accept `HIDEXY` — there is no `key_hidexy` arm in the `MIDI_Configure` case statement (2506–2525).

### Display / data directives

Accepted in `MIDI_Update` (run on every subsequent message).

| Directive / data | Description | Pascal lines |
|---|---|---|
| Numeric byte stream (`ele_num` values) | Raw MIDI bytes; decoded by 5-state note-on/off velocity machine | 2606–2641 |
| `CLEAR` | Reset all 128 note velocities to 0 and redraw | 2597–2598 |
| `SAVE` | Save window bitmap to file (`KeySave`) | 2599–2600 |

**Not accepted in Update phase**: `UPDATE`, `TRACE`, `SET`, `SCROLL`, color-mode directives, `HIDEXY` — none present in `MIDI_Update`.

### Keyboard & mouse

MIDI uses the **identical shared input model** as all nine windows (`TDebugDisplayForm` form-level handlers). There is **no per-MIDI coordinate mapping** — `FormMouseMove` draws no measurement cursor, and `SendMousePos` reports raw pixel coordinates (off-window sentinel `$03FFFFFF` / `$FFFFFFFF` applies normally).

| Handler / directive | Lines | Behavior |
|---|---|---|
| `WMGetDlgCode` | 585–589 | Captures Tab (`DLGC_WANTTAB`) |
| `FormMouseMove` | 647–809 | Live measurement cursor suppressed when `HIDEXY` set (737) — but MIDI never sets `HIDEXY` |
| `FormMouseWheel` | 811–823 | Latches wheel direction (`vMouseWheel` ±1) for 100 ms |
| `FormKeyPress` / `FormKeyDown` | 825–857 | Latches key byte for 100 ms; non-printable mapped: Left=1 Right=2 Up=3 Down=4 Home=5 End=6 Del=7 Ins=10 PgUp=11 PgDn=12 |
| `PC_KEY` (Update) | `SendKeyPress` 3579–3583 | Sends latched `vKeyPress` byte (0 if none) |
| `PC_MOUSE` (Update) | `SendMousePos` 3537–3577 | Sends 2 LONGs: packed x/y/buttons/wheel + RGB pixel under cursor |

**MIDI-specific note**: The matrix (§4.4) confirms MIDI has no coordinate readout and no special mouse coordinate mapping. `HIDEXY` is irrelevant to MIDI since MIDI does not accept it in Configure.

---

## 4. Configuration and Initialization

### 4.1 MIDI_Configure Method

**DebugDisplayUnit.pas:2492-2588**
```pascal
procedure TDebugDisplayForm.MIDI_Configure;
var
  border, i, x, note, whitekeys, tweak, left, right, bottom: integer;
  black: boolean;
begin
  // Set unique defaults
  MidiSize := 4;                  // Default size
  MidiKeyFirst := 21;             // A0
  MidiKeyLast := 108;             // C8 (88 keys)
  MidiChannel := 0;               // Channel 1 (0-based)
  vColor[0] := clCyan;            // White key active color
  vColor[1] := clMagenta;         // Black key active color
  MidiState := 0;                 // Idle state

  // Process any parameters
  while NextKey do
  case val of
    key_title:
      KeyTitle;
    key_pos:
      KeyPos;
    key_size:
      KeyValWithin(MidiSize, 1, 50);
    key_range:
      if KeyValWithin(MidiKeyFirst, 0, 127) then
      begin
        MidiKeyLast := MidiKeyFirst;
        KeyValWithin(MidiKeyLast, MidiKeyFirst, 127);
      end;
    key_channel:
      KeyValWithin(MidiChannel, 0, 15);
    key_color:
      if KeyColor(vColor[0]) then
        KeyColor(vColor[1]);
  end;

  // Set piano keyboard metrics
  MidiKeySize := MidiSizeBase + MidiSize * MidiSizeFactor;
  vTextSize := MidiKeySize div 3;
  SetTextMetrics;
  border := MidiKeySize div ((MidiSizeBase + MidiSizeFactor) div 2);

  // Calculate key geometry for all 128 notes
  x := border;
  note := 0;
  whitekeys := 0;
  for i := 0 to 127 do
  begin
    case note of
      0:   tweak := 10;    // C  white
      1:   tweak := -2;    // C# black
      2:   tweak := 16;    // D  white
      3:   tweak :=  2;    // D# black
      4:   tweak := 22;    // E  white
      5:   tweak :=  9;    // F  white
      6:   tweak := -4;    // F# black
      7:   tweak := 14;    // G  white
      8:   tweak :=  0;    // G# black
      9:   tweak := 18;    // A  white
      10:  tweak :=  4;    // A# black
      11:  tweak := 23;    // B  white
    end;

    black := note in [1, 3, 6, 8, 10];
    if black then
    begin
      left := x - (MidiKeySize * (10 - tweak) + 16) div 32;
      right := left + MidiKeySize * 20 div 32;
      bottom := MidiKeySize * 4;
      MidiNumX[i] := (left + right + 1) div 2;
    end
    else
    begin
      left := x;
      right := left + MidiKeySize;
      bottom := MidiKeySize * 6;
      MidiNumX[i] := x + (MidiKeySize * tweak + 16) div 32;
      Inc(x, MidiKeySize);
    end;

    MidiBlack[i] := black;
    MidiLeft[i] := left;
    MidiRight[i] := right;
    MidiBottom[i] := bottom;
    if note = 11 then note := 0 else Inc(note);
    if not black and (i in [MidiKeyFirst..MidiKeyLast]) then Inc(whitekeys);
  end;

  // Adjust offset for first/last black keys
  if MidiBlack[MidiKeyFirst] then
  begin
    MidiOffset := MidiLeft[MidiKeyFirst - 1] - border;
    Inc(whitekeys);
  end
  else
    MidiOffset := MidiLeft[MidiKeyFirst] - border;

  if MidiBlack[MidiKeyLast] then Inc(whitekeys);

  // Set form metrics
  vWidth := MidiKeySize * whitekeys + border * 2;
  vHeight := MidiKeySize * 6 + border;
  SetSize(0, 0, 0, 0);
  MIDI_Draw(True);
end;
```

### 4.2 Configuration Parameters

| Parameter | Key | Type | Range | Default | Description |
|-----------|-----|------|-------|---------|-------------|
| **title** | key_title | string | - | "MIDI" | Window title text |
| **pos** | key_pos | left, top | - | auto | Window position only. `KeyPos` (2712-2716) reads exactly two operands — left and top — as offsets from `DebugDisplayLeft`/`DebugDisplayTop`. Window SIZE is NOT from POS; it derives from `MidiKeySize × whitekeys` (2584-2586). |
| **size** | key_size | integer | 1-50 | 4 | Key size multiplier |
| **range** | key_range | first, last | first 0-127; last firstKey..127 | 21-108 | Note range to display. `lastKey` is read only if `firstKey` was supplied, and is clamped to a dynamic lower bound `firstKey..127` (default 108) — see 2515-2519. |
| **channel** | key_channel | integer | 0-15 | 0 | MIDI channel to monitor |
| **color** | key_color | 2 integers | RGB24 | cyan, magenta | Active key colors (white, black) |

### 4.3 Key Geometry Calculation

**Octave Pattern**: The piano keyboard repeats every 12 notes (octave):
```
C, C#, D, D#, E, F, F#, G, G#, A, A#, B
W  B   W  B   W  W  B   W  B   W  B   W
```

**White Keys**: C, D, E, F, G, A, B (7 per octave)

**Black Keys**: C#, D#, F#, G#, A# (5 per octave)

**Tweak Values** (note label positioning within key):

| Note | Name | Color | Tweak | Purpose |
|------|------|-------|-------|---------|
| 0 | C | White | 10 | Center-left |
| 1 | C# | Black | -2 | Offset left |
| 2 | D | White | 16 | Center |
| 3 | D# | Black | 2 | Offset right |
| 4 | E | White | 22 | Center-right |
| 5 | F | White | 9 | Center-left |
| 6 | F# | Black | -4 | Offset left |
| 7 | G | White | 14 | Center-left |
| 8 | G# | Black | 0 | Center |
| 9 | A | White | 18 | Center-right |
| 10 | A# | Black | 4 | Offset right |
| 11 | B | White | 23 | Center-right |

**Black Key Geometry**:
```pascal
left := x - (MidiKeySize * (10 - tweak) + 16) div 32;
right := left + MidiKeySize * 20 div 32;
bottom := MidiKeySize * 4;
```

**Black key width**: `MidiKeySize × 20 / 32 ≈ 0.625 × white key width`

**Black key height**: `MidiKeySize × 4 = 4/6 × white key height`

**White Key Geometry**:
```pascal
left := x;
right := left + MidiKeySize;
bottom := MidiKeySize * 6;
x := x + MidiKeySize;  // Advance to next white key
```

**White key width**: `MidiKeySize`

**White key height**: `MidiKeySize × 6`

### 4.4 Display Size Calculation

**Number of White Keys**:
```pascal
whitekeys := count of white keys in [MidiKeyFirst..MidiKeyLast]
+ 1 if MidiKeyFirst is black (add left padding)
+ 1 if MidiKeyLast is black (add right padding)
```

**Display Dimensions**:
```pascal
vWidth := MidiKeySize * whitekeys + border * 2;
vHeight := MidiKeySize * 6 + border;
```

**Example** (88-key piano, MidiSize=4):
- MidiKeySize = 8 + 4×4 = 24 pixels
- White keys = 52
- Border = 24 / ((8+4)/2) = 24/6 = 4 pixels
- vWidth = 24 × 52 + 4×2 = 1256 pixels
- vHeight = 24 × 6 + 4 = 148 pixels

---

## 5. MIDI Protocol Processing

### 5.1 MIDI_Update Method

**DebugDisplayUnit.pas:2590-2643**
```pascal
procedure TDebugDisplayForm.MIDI_Update;
begin
  while not NextEnd do
  begin
    if NextStr then Break;      // string not allowed
    if NextKey then
    case val of
      key_clear:
        MIDI_Draw(True);
      key_save:
        KeySave;
      key_pc_key:
        SendKeyPress;
      key_pc_mouse:
        SendMousePos;
    end
    else
    while NextNum do
    begin
      // Process byte, msb forces command state
      val := val and $FF;
      if val and $80 <> 0 then MidiState := 0;

      case MidiState of
        0:   // wait for note-on or note-off event
        begin
          if (val and $F0 = $90) and (val and $0F = MidiChannel) then
            MidiState := 1;    // note-on event
          if (val and $F0 = $80) and (val and $0F = MidiChannel) then
            MidiState := 3;    // note-off event
        end;
        1:   // note-on, get note
        begin
          MidiNote := val;
          MidiState := 2;
        end;
        2:   // note-on, get velocity
        begin
          MidiVelocity[MidiNote] := val;
          MidiState := 1;
          MIDI_Draw(False);
        end;
        3:   // note-off, get note
        begin
          MidiNote := val;
          MidiState := 4;
        end;
        4:   // note-off, get velocity
        begin
          MidiVelocity[MidiNote] := -val;
          MidiState := 3;
          MIDI_Draw(False);
        end;
      end;
    end;
  end;
end;
```

### 5.2 MIDI Protocol State Machine

**State Diagram**:
```
State 0 (Idle):
  Wait for status byte ($80 or $90)
  ↓
  If $9n (note-on, channel n):  → State 1
  If $8n (note-off, channel n): → State 3

State 1 (Note-On, Wait for Note):
  Read note number (0-127)
  Store in MidiNote
  → State 2

State 2 (Note-On, Wait for Velocity):
  Read velocity (0-127)
  MidiVelocity[MidiNote] = velocity
  Redraw keyboard
  → State 1 (running status)

State 3 (Note-Off, Wait for Note):
  Read note number (0-127)
  Store in MidiNote
  → State 4

State 4 (Note-Off, Wait for Velocity):
  Read velocity (0-127)
  MidiVelocity[MidiNote] = -velocity (negative)
  Redraw keyboard
  → State 3 (running status)
```

**Running Status**: After first status byte, subsequent notes use same status (states 1→2→1→2... or 3→4→3→4...).

### 5.3 MIDI Message Format

**Note-On Message**:
```
Byte 1: $9n (status, n = channel 0-15)
Byte 2: note (0-127)
Byte 3: velocity (1-127, 0 = note-off)
```

**Note-Off Message**:
```
Byte 1: $8n (status, n = channel 0-15)
Byte 2: note (0-127)
Byte 3: velocity (0-127, usually ignored)
```

**Example** (Middle C note-on, channel 0, velocity 64):
```
$90, $3C, $40
```

**Example** (Middle C note-off, channel 0):
```
$80, $3C, $00
```

### 5.4 Status Byte Handling

**DebugDisplayUnit.pas:2610-2611**
```pascal
val := val and $FF;                    // Ensure 8-bit
if val and $80 <> 0 then MidiState := 0;  // Reset on status byte
```

**MSB = 1**: Status byte (command)

**MSB = 0**: Data byte (note, velocity)

**Automatic Reset**: Any status byte ($80-$FF) resets state machine to state 0.

### 5.5 Channel Filtering

**DebugDisplayUnit.pas:2615-2616**
```pascal
if (val and $F0 = $90) and (val and $0F = MidiChannel) then ...
if (val and $F0 = $80) and (val and $0F = MidiChannel) then ...
```

**Channel Extraction**: `val and $0F` extracts channel (0-15) from status byte.

**Filter Logic**: Only process messages matching configured MidiChannel.

**Channel Numbering**:
- **MIDI standard**: Channels 1-16
- **Internal representation**: 0-15
- **Configuration**: Uses 0-15 (channel 1 = 0, channel 16 = 15)

### 5.6 Velocity Storage

**Note-On**:
```pascal
MidiVelocity[MidiNote] := val;  // Positive velocity (1-127)
```

**Note-Off**:
```pascal
MidiVelocity[MidiNote] := -val;  // Negative velocity (release)
```

**Interpretation**:
- **Velocity > 0**: Note active, display proportional to velocity
- **Velocity ≤ 0**: Note inactive (off or release)

### 5.7 Receiving Types & Numeric Parity (TS-Port Contract)

This subsection pins the receiving-side numeric semantics a TypeScript port must
reproduce byte-for-byte.

**Receiving field types** — every MIDI state/geometry field is a **signed 32-bit
`integer`** (`MidiSize`, `MidiKeyFirst`, `MidiKeyLast`, `MidiChannel`, `MidiState`,
`MidiNote`, and the geometry arrays). In particular:
- `MidiVelocity[0..127]` is a **signed** `integer` array (369-376). Note-off stores
  `-velocity` (2636), so a port MUST use a signed cell, not an unsigned byte.
- The MIDI byte-stream value is `val and $FF` (2610) — the low 8 bits of the incoming
  number. `val` itself is the shared signed-32 receive register (`val : integer`, 358).
- `vOpacity` / `vPrecise` are `byte`-typed, but the MIDI path does **not** read them.

**Integer-truncation parity** — all `div` in the MIDI path are Pascal `div`, which
**truncates toward zero** (not floor, not round):
- `vTextSize := MidiKeySize div 3` (2528).
- Key geometry: `(MidiKeySize * (10 - tweak) + 16) div 32`, `MidiKeySize * 20 div 32`,
  `(left + right + 1) div 2`, `(MidiKeySize * tweak + 16) div 32`, `MidiKeySize div 4`,
  and the border `MidiKeySize div ((MidiSizeBase + MidiSizeFactor) div 2)` — all `div`.
- Velocity fill height: `(MidiBottom[i] - r) * MidiVelocity[i] div 127` (2677) — also
  `div`, truncating toward zero. (Inputs here are ≥ 0, so floor and truncate coincide,
  but the port should still use truncation for fidelity.)

There is **no** `Round` and **no** `shr` anywhere in the MIDI path of concern — do not
substitute either for `div`.

**Clamp & bit-filter parity**:
- `Within(val, bottom, top)` clamps are **inclusive** on both ends (used by `KeyValWithin`
  for `MidiSize`, `MidiKeyFirst`, `MidiKeyLast`, `MidiChannel`).
- Channel/status filtering is purely bitwise: status reset is `val and $80 <> 0` (2611),
  message-type test is `val and $F0` (2615-2616), and the channel filter is the exact
  match `val and $0F = MidiChannel` (2615-2616). No range arithmetic, no masking shortcuts.

---

## 6. Piano Keyboard Rendering

### 6.1 MIDI_Draw Method

**DebugDisplayUnit.pas:2645-2665**
```pascal
procedure TDebugDisplayForm.MIDI_Draw(Clear: boolean);
var
  i, r: integer;
begin
  // Clear velocity array if requested
  if Clear then for i := 0 to 127 do MidiVelocity[i] := 0;

  // Setup canvas
  Bitmap[0].Canvas.Pen.Width := 1;
  Bitmap[0].Canvas.Pen.Color := clGray2;
  Bitmap[0].Canvas.Brush.Color := clInactiveCaption;
  Bitmap[0].Canvas.FillRect(Rect(0, 0, vWidth, vHeight));

  r := MidiKeySize div 4;  // Corner radius

  // Draw white keys first
  Bitmap[0].Canvas.Font.Color := clGray3;
  for i := MidiKeyFirst to MidiKeyLast do
    if not MidiBlack[i] then MIDI_DrawKey(i, clWhite, vColor[0], r);

  // Draw black keys last (overlap white keys)
  Bitmap[0].Canvas.Font.Color := clGray2;
  for i := MidiKeyFirst to MidiKeyLast do
    if MidiBlack[i] then MIDI_DrawKey(i, clBlack, vColor[1], r);

  // Update display
  BitmapToCanvas(0);
end;
```

### 6.2 Rendering Order

**Two-Pass Rendering**:
1. **Pass 1**: Draw all white keys
2. **Pass 2**: Draw all black keys (on top)

**Reason**: Black keys physically overlap white keys on piano keyboard.

**Z-Order**:
```
Bottom layer: Background (clInactiveCaption)
Middle layer: White keys
Top layer: Black keys
```

### 6.3 Background and Border

**Background Fill**:
```pascal
Bitmap[0].Canvas.Brush.Color := clInactiveCaption;  // Light gray
Bitmap[0].Canvas.FillRect(Rect(0, 0, vWidth, vHeight));
```

**Key Border**:
```pascal
Bitmap[0].Canvas.Pen.Width := 1;
Bitmap[0].Canvas.Pen.Color := clGray2;  // Medium gray
```

**Corner Radius**:
```pascal
r := MidiKeySize div 4;  // Rounded corners
```

**Example** (MidiKeySize = 24):
- Corner radius = 6 pixels
- Creates smooth, rounded key edges

---

## 7. Note Velocity Visualization

### 7.1 MIDI_DrawKey Method

**DebugDisplayUnit.pas:2667-2682**
```pascal
procedure TDebugDisplayForm.MIDI_DrawKey(i, OffColor, OnColor, r: integer);
begin
  // Draw plain key (inactive state)
  Bitmap[0].Canvas.Brush.Color := WinRGB(OffColor);
  Bitmap[0].Canvas.RoundRect(MidiLeft[i] - MidiOffset, -r,
                              MidiRight[i] - MidiOffset, MidiBottom[i], r, r);

  // Colorize key to show velocity (if active)
  if MidiVelocity[i] > 0 then
  begin
    Bitmap[0].Canvas.Brush.Color := WinRGB(OnColor);
    Bitmap[0].Canvas.RoundRect(MidiLeft[i] - MidiOffset,
      MidiBottom[i] - r - (MidiBottom[i] - r) * MidiVelocity[i] div 127,
      MidiRight[i] - MidiOffset, MidiBottom[i], r, r);
  end;

  // Draw note number label
  Bitmap[0].Canvas.Brush.Style := bsClear;
  AngleTextOut(MidiNumX[i] - MidiOffset, ChrWidth, IntToStr(i), $20, -900);
end;
```

### 7.2 Velocity-Proportional Fill

**Inactive Key**:
```pascal
// Full key drawn in OffColor (white or black)
RoundRect(left, top, right, bottom);
```

**Active Key**:
```pascal
// Step 1: Draw full key in OffColor
RoundRect(left, -r, right, bottom);

// Step 2: Overdraw bottom portion in OnColor
height_filled = (bottom - r) × velocity / 127;
top_of_fill = bottom - r - height_filled;
RoundRect(left, top_of_fill, right, bottom);
```

**Visual Effect**:
- **Velocity 0**: No fill (key off)
- **Velocity 1**: Minimal fill (1/127 of key height)
- **Velocity 64**: Half fill (middle C, medium velocity)
- **Velocity 127**: Full fill (maximum velocity, fortissimo)

**Example** (white key, MidiBottom = 144, velocity = 64):
```
bottom = 144
r = 6
fillable_height = 144 - 6 = 138
fill_amount = 138 × 64 / 127 ≈ 69 pixels
top_of_fill = 144 - 6 - 69 = 69
```

Key filled from pixel 69 to pixel 144 (bottom 69 pixels in cyan).

### 7.3 Color Interpretation

**White Keys**:
- **Inactive**: clWhite (white)
- **Active**: vColor[0] (default: clCyan)
- **Fill direction**: Bottom-up

**Black Keys**:
- **Inactive**: clBlack (black)
- **Active**: vColor[1] (default: clMagenta)
- **Fill direction**: Bottom-up

**Visual Feedback**:
- Soft notes (low velocity): Small colored region at bottom
- Loud notes (high velocity): Large colored region, nearly full key
- Forte (velocity 100-127): Key almost entirely colored

---

## 8. Keyboard Geometry

### 8.1 Key Dimensions

**White Key**:
```
Width:  MidiKeySize
Height: MidiKeySize × 6
```

**Black Key**:
```
Width:  MidiKeySize × 20 / 32 ≈ 0.625 × MidiKeySize
Height: MidiKeySize × 4 = 2/3 × white key height
```

**Aspect Ratios**:
- White key: 1:6 (width:height)
- Black key: 0.625:4 = ~1:6.4

**Example** (MidiSize = 4, MidiKeySize = 24):
- White key: 24 × 144 pixels
- Black key: 15 × 96 pixels

### 8.2 Key Positioning

**White Keys**: Positioned sequentially left-to-right.
```pascal
x := border;
for each white key:
  left := x;
  right := x + MidiKeySize;
  x := x + MidiKeySize;  // Next white key
```

**Black Keys**: Positioned overlapping adjacent white keys.
```pascal
// Black key between two white keys
// Tweak value controls exact horizontal position
left := x - (MidiKeySize * (10 - tweak) + 16) div 32;
right := left + MidiKeySize * 20 div 32;
```

**Overlap Pattern**:
```
White:  [  C  ][  D  ][  E  ][  F  ][  G  ][  A  ][  B  ]
Black:      [C#]  [D#]      [F#]  [G#]  [A#]
```

**Tweak Adjustment**: Positions black keys to match real piano geometry.

### 8.3 Note Number Labels

**Label Position** (rotated 90° clockwise):
```pascal
AngleTextOut(MidiNumX[i] - MidiOffset, ChrWidth, IntToStr(i), $20, -900);
```

**Parameters**:
- **X**: MidiNumX[i] - MidiOffset (horizontal position within key)
- **Y**: ChrWidth (offset from top)
- **Text**: Note number (0-127)
- **Style**: $20 (style encoding)
- **Angle**: -900 (90° clockwise rotation, in tenths of degrees)

**Label Color**:
- White keys: clGray3 (light gray)
- Black keys: clGray2 (medium gray)

**Purpose**: Identify MIDI note numbers on keyboard.

### 8.4 Offset Adjustment

**MidiOffset Calculation**:
```pascal
if MidiBlack[MidiKeyFirst] then
  MidiOffset := MidiLeft[MidiKeyFirst - 1] - border;
else
  MidiOffset := MidiLeft[MidiKeyFirst] - border;
```

**Purpose**: Shift keyboard horizontally to align first displayed key with left edge.

**Effect**: All key positions calculated for full 128-note range, then shifted left by MidiOffset.

**Example** (display notes 60-72):
- Note 60 (middle C) calculated at pixel 720
- MidiOffset = 720 - border
- Display position = 720 - 720 + border = border (left edge)

---

## 9. Update and Command Processing

### 9.1 Redraw Triggers

**Clear Command**:
```pascal
key_clear:
  MIDI_Draw(True);  // Clear velocities and redraw
```

**Note Events**:
```pascal
// After note-on or note-off:
MIDI_Draw(False);  // Redraw without clearing velocities
```

**Clear vs. Redraw**:
- **Clear = True**: Reset all velocities to 0, then draw
- **Clear = False**: Preserve velocities, just redraw

### 9.2 Incremental vs. Full Redraw

**Current Implementation**: Full redraw on every note event.

**Alternative** (not implemented): Incremental redraw of single key.

**Performance Trade-off**:
- **Full redraw**: Simple code, more CPU (redraw 88 keys)
- **Incremental**: Complex code, less CPU (redraw 1 key)

**Optimization**: Full redraw acceptable due to:
- Small number of keys (typically 88)
- Simple rendering (RoundRect primitives)
- Hardware-accelerated GDI
- Typical note rates (< 100 notes/sec)

### 9.3 Velocity Update Behavior

**Note-On** (velocity > 0):
```pascal
MidiVelocity[note] := velocity;  // Set to positive value
```

**Note-Off** (velocity stored as negative):
```pascal
MidiVelocity[note] := -velocity;  // Set to negative value
```

**Render Check**:
```pascal
if MidiVelocity[i] > 0 then
  // Draw active key with velocity-proportional fill
```

**Effect**: Note-off causes velocity to become ≤ 0, key renders as inactive.

---

## 10. Color System

### 10.1 Color Configuration

**DebugDisplayUnit.pas:2502-2503, 2522-2524**
```pascal
vColor[0] := clCyan;      // Default white key active color
vColor[1] := clMagenta;   // Default black key active color

// During configuration:
key_color:
  if KeyColor(vColor[0]) then
    KeyColor(vColor[1]);
```

**Configuration**: Accepts two color values sequentially.

**Color Format**: RGB24 ($RRGGBB)

### 10.2 Default Colors

**Pre-defined Constants** (all from `DebugDisplayUnit.pas` 179–191) — every fixed
color MIDI uses:
```pascal
clCyan    = $00FFFF;  // vColor[0] default — active white-key tint (2502)
clMagenta = $FF00FF;  // vColor[1] default — active black-key tint (2503)
clWhite   = $FFFFFF;  // white-key fill (2658)
clBlack   = $000000;  // black-key fill (2662)
clGray2   = $808080;  // keyboard outline pen + black-key labels (2651, 2660)
clGray3   = $D0D0D0;  // white-key labels (2656)
```
The keyboard background is the Windows system color `clInactiveCaption` (2650) — a
GDI palette color, **not** a fixed RGB24 literal. All other colors above are literal
RGB24 values; `WinRGB` swaps R↔B to BGR only at GDI draw time.

**Default Scheme**:
- White keys: White → Cyan (inactive → active)
- Black keys: Black → Magenta (inactive → active)

**Visual Appeal**: High contrast, easily distinguishable, visually striking.

### 10.3 Color Usage

**MIDI_Draw**:
```pascal
// White keys:
MIDI_DrawKey(i, clWhite, vColor[0], r);

// Black keys:
MIDI_DrawKey(i, clBlack, vColor[1], r);
```

**MIDI_DrawKey**:
```pascal
// Inactive portion:
Brush.Color := WinRGB(OffColor);

// Active portion (if velocity > 0):
Brush.Color := WinRGB(OnColor);
```

### 10.4 Custom Color Schemes

**Example 1** (warm colors):
```
COLOR $FF7F00 $FFFF00  // Orange (clOrange), Yellow (clYellow)
```

**Example 2** (cool colors):
```
COLOR $0080FF $00FF80  // Blue, Teal
```

**Example 3** (monochrome):
```
COLOR $FFFFFF $FFFFFF  // White, White (same for both)
```

**Contrast Recommendation**: Choose active colors that contrast well with white and black.

---

## 11. Key Numbering and Layout

### 11.1 MIDI Note Numbering

**MIDI Standard**: 0-127 (128 notes)

**Octave Calculation**:
```
octave = note / 12
note_in_octave = note % 12
```

**Example**:
```
Note 60: 60/12 = 5, 60%12 = 0 → C4 (Middle C)
Note 69: 69/12 = 5, 69%12 = 9 → A4 (440 Hz)
Note 21: 21/12 = 1, 21%12 = 9 → A0
```

**Note Naming Convention**:
- **Scientific pitch (C4 = middle C, note 60)**: this document's convention; consistent with A0 = note 21 and A4 = 440 Hz (note 69)
- **This implementation**: The source labels keys with the raw MIDI note number only (`IntToStr(i)`); pitch names are documentation convention

### 11.2 Octave Pattern

**12-Note Pattern** (repeats every octave):
```
0  1   2  3   4   5  6   7  8   9  10  11
C  C#  D  D#  E   F  F#  G  G#  A  A#  B
W  B   W  B   W   W  B   W  B   W  B   W
```

**Color Encoding**:
```pascal
note := i mod 12;
black := note in [1, 3, 6, 8, 10];
```

**Layout** (octave label = note/12 - 1, so note 0 = C-1 and note 60 = C4):
```
Octave -1: C-1, C#-1, D-1, D#-1, E-1, F-1, F#-1, G-1, G#-1, A-1, A#-1, B-1   (notes 0-11)
Octave  0: C0,  C#0,  D0,  D#0,  E0,  F0,  F#0,  G0,  G#0,  A0,  A#0,  B0     (notes 12-23, A0 = note 21)
...
Octave  4: C4,  C#4,  D4,  D#4,  E4,  F4,  F#4,  G4,  G#4,  A4,  A#4,  B4     (notes 60-71, C4 = note 60)
...
Octave  9: C9,  C#9,  D9,  D#9,  E9,  F9,  F#9,  G9                            (notes 120-127)
```

### 11.3 Standard Piano Range

**88-Key Piano**: Notes 21-108

**Range Breakdown**:
```
Note 21:  A0   (lowest note)
Note 60:  C4   (middle C)
Note 108: C8   (highest note)
```

**White Keys**: 52 (7.43 octaves × 7 white keys/octave)

**Black Keys**: 36 (5 per octave × 7+ octaves)

### 11.4 Extended Ranges

**Full MIDI Range**: 0-127 (10.67 octaves)

**Sub-bass Extension**: 0-20 (notes below standard piano)

**Super-treble Extension**: 109-127 (notes above standard piano)

**Practical Limits**:
- Human hearing: ~20 Hz to 20 kHz
- Note 0 (C-1): 8.18 Hz (below hearing)
- Note 127 (G9): 12543 Hz (very high)

---

## 12. Command Protocol

### 12.1 Configuration Command

**Format** (element array):
```
ele_key, dis_midi,
ele_key, key_title, ele_str, "MIDI", ele_end,
ele_key, key_pos, ele_num, left, ele_num, top,  // position only (two operands)
ele_key, key_size, ele_num, size,
ele_key, key_range, ele_num, first, ele_num, last,
ele_key, key_channel, ele_num, channel,
ele_key, key_color, ele_num, white_color, ele_num, black_color,
ele_end
```

### 12.2 MIDI Data Stream

**Note-On Event**:
```
ele_num, $90 | channel,  // Status byte (note-on, channel)
ele_num, note,           // Note number (0-127)
ele_num, velocity,       // Velocity (1-127)
..., ele_end
```

**Note-Off Event**:
```
ele_num, $80 | channel,  // Status byte (note-off, channel)
ele_num, note,           // Note number (0-127)
ele_num, velocity,       // Release velocity (0-127)
..., ele_end
```

**Running Status** (multiple notes with same status):
```
ele_num, $90 | channel,  // Status byte once
ele_num, note1, ele_num, velocity1,
ele_num, note2, ele_num, velocity2,
ele_num, note3, ele_num, velocity3,
..., ele_end
```

### 12.3 Control Commands

**Clear Display**:
```
ele_key, key_clear, ele_end
```

**Save Image**:
```
ele_key, key_save, ele_end
```

---

## 13. Usage Examples

### 13.1 Simple Note Playback

**Goal**: Visualize middle C note-on/off.

**Configuration**:
```
MIDI SIZE 4 RANGE 21 108 CHANNEL 0
```

**Propeller 2 Code**:
```spin2
' Middle C (note 60), channel 0, velocity 64
debug(`MIDI $90 60 64)  ' Note-on
waitms(500)
debug(`MIDI $80 60 0)   ' Note-off
```

**Effect**: Middle C key lights up cyan for 500 ms, then turns off.

### 13.2 C Major Chord

**Goal**: Display C major triad (C-E-G).

**Propeller 2 Code**:
```spin2
' C major chord (notes 60, 64, 67), channel 0
debug(`MIDI $90 60 80)  ' C, forte
debug(`MIDI 64 80)      ' E, forte (running status)
debug(`MIDI 67 80)      ' G, forte
waitms(1000)
' Release all
debug(`MIDI $80 60 0)   ' C off
debug(`MIDI 64 0)       ' E off
debug(`MIDI 67 0)       ' G off
```

**Effect**: Three keys light up simultaneously, then turn off.

### 13.3 Chromatic Scale

**Goal**: Play all 12 notes in an octave.

**Propeller 2 Code**:
```spin2
' Chromatic scale from C4 to C5
note := 60
repeat 13
  debug(`MIDI $90 `UBYTE_(note) 100)  ' Note-on
  waitms(100)
  debug(`MIDI $80 `UBYTE_(note) 0)    ' Note-off
  waitms(50)
  note++
```

**Effect**: Sequential illumination from middle C to C one octave higher.

### 13.4 Velocity Demonstration

**Goal**: Show velocity sensitivity.

**Propeller 2 Code**:
```spin2
' Middle C at different velocities
vel := 32
repeat 4
  debug(`MIDI $90 60 `UBYTE_(vel))
  waitms(500)
  debug(`MIDI $80 60 0)
  waitms(200)
  vel += 32  ' Increase velocity
```

**Effect**: Key lights up progressively brighter (32, 64, 96, 127).

### 13.5 Multi-Channel Setup

**Goal**: Monitor multiple instruments on different channels.

**Configuration** (multiple windows):
```
MIDI SIZE 3 RANGE 48 72 CHANNEL 0  ' Piano on channel 1
MIDI SIZE 3 RANGE 48 72 CHANNEL 1  ' Bass on channel 2
MIDI SIZE 3 RANGE 60 84 CHANNEL 9  ' Drums on channel 10
```

**Effect**: Three separate MIDI displays, each showing different channel.

### 13.6 Large Display

**Goal**: Full-screen piano keyboard.

**Configuration**:
```
MIDI SIZE 20 RANGE 21 108  ' Large keys
```

**Result**:
- MidiKeySize = 8 + 20×4 = 88 pixels
- White key: 88 × 528 pixels
- Display: ~4576 × 532 pixels (fits 4K display)

---

## 14. Performance Characteristics

### 14.1 Rendering Performance

**Full Redraw Time**:
- **88 keys**: ~88 RoundRect calls
- **Per RoundRect**: ~0.1-0.2 ms (GDI)
- **Total**: ~9-18 ms
- **Frame rate**: 55-110 Hz

**Velocity Updates**:
- **Active keys only**: 2× RoundRect per key
- **10 simultaneous notes**: ~2-4 ms
- **Frame rate**: 250-500 Hz

**Optimization**: No optimization for incremental updates (full redraw always).

### 14.2 MIDI Processing Speed

**State Machine**: O(1) per byte

**Typical Message**: 3 bytes (status + note + velocity)

**Processing Time**: ~0.001 ms per message

**Maximum Throughput**: ~1,000,000 messages/sec (theoretical, limited by serial bandwidth)

**Practical Limit**: ~10,000 notes/sec (limited by rendering, not parsing)

### 14.3 Memory Usage

**Bitmap Buffers** (88-key display, MidiSize=4):
- Bitmap[0], Bitmap[1]: 1256 × 148 pixels × 3 bytes = 557,376 bytes (~545 KB)
- **Total**: ~1.09 MB

**Geometry Arrays**:
- MidiBlack, MidiLeft, MidiRight, MidiBottom, MidiNumX, MidiVelocity
- 128 × (1 + 4×4 + 4) bytes = 2,688 bytes (~2.6 KB)

**Total Memory**: ~1.09 MB

### 14.4 Latency

**MIDI-to-Display Latency**:
```
Serial transmission → State machine → Velocity update → Redraw → Display
    ~1 ms               <0.01 ms        <0.01 ms      ~10 ms    ~0 ms
```

**Total**: ~11 ms (typical)

**Factors**:
- Serial baudrate (default: 31250 baud for MIDI, or 2 Mbaud for debug)
- Rendering complexity (key count)
- Display refresh rate (60 Hz = 16.67 ms)

**Perceived Latency**: ~10-20 ms (excellent for musical applications)

---

## 15. MIDI Standard Compliance

### 15.1 Supported MIDI Messages

**Fully Supported**:
- **Note-On** ($9n): With velocity (1-127)
- **Note-Off** ($8n): With release velocity
- **Running Status**: Consecutive messages without status byte

**Partially Supported**:
- **Note-On with velocity 0**: Not treated as note-off (standard practice)

**Not Supported**:
- Program Change ($Cn)
- Control Change ($Bn)
- Pitch Bend ($En)
- Aftertouch ($An, $Dn)
- System Exclusive ($F0...$F7)
- System Real-Time ($F8-$FF)

### 15.2 MIDI Specifications

**MIDI 1.0 Specification**:
- **Baud rate**: 31,250 baud (standard MIDI)
- **Data format**: 1 start bit, 8 data bits, 1 stop bit, no parity
- **Byte values**: 0-127 (data), 128-255 (status/command)

**Implementation Notes**:
- Uses debug protocol, not direct MIDI serial
- Baudrate determined by debug system (default: 2 Mbaud)
- MIDI bytes transmitted as ele_num values

### 15.3 Channel Voice Messages

**Status Byte Format**:
```
Bits: 7 6 5 4 3 2 1 0
      1 x x x n n n n
      │ └─┬─┘ └──┬──┘
      │   │      └─── Channel (0-15)
      │   └────────── Message type
      └────────────── Status bit (always 1)
```

**Message Types**:
- **$8n**: Note-Off (1000 nnnn)
- **$9n**: Note-On (1001 nnnn)
- **$An**: Polyphonic Aftertouch
- **$Bn**: Control Change
- **$Cn**: Program Change
- **$Dn**: Channel Aftertouch
- **$En**: Pitch Bend

**Supported**: Only $8n (Note-Off) and $9n (Note-On)

### 15.4 Note-On Velocity Zero

**MIDI Standard**: Note-On with velocity 0 should be treated as Note-Off.

**This Implementation**: Not implemented (velocity 0 would display as inactive, but state machine doesn't recognize it).

**Implication**: Devices using velocity-0 note-off may not render correctly.

**Workaround**: Use proper Note-Off messages ($8n).

---

## 16. Implementation Details

### 16.1 State Machine Design

**States**:
```
0: Idle (wait for status)
1: Note-On note
2: Note-On velocity
3: Note-Off note
4: Note-Off velocity
```

**Transitions**:
- Any status byte ($80+) → State 0
- State 0 + $9n → State 1
- State 0 + $8n → State 3
- State 1 + data → State 2 (store note)
- State 2 + data → State 1 (store velocity, render)
- State 3 + data → State 4 (store note)
- State 4 + data → State 3 (store velocity, render)

**Running Status**: States 1-2-1-2... or 3-4-3-4... continue without returning to state 0.

### 16.2 Rounded Rectangle Rendering

**GDI RoundRect**:
```pascal
Canvas.RoundRect(left, top, right, bottom, rX, rY);
```

**Corner Rounding**:
- **rX, rY**: X and Y radii of corner ellipse
- **r = MidiKeySize / 4**: Proportional to key size

**Example** (MidiKeySize = 24):
- Corner radius = 6 pixels
- Creates quarter-circle corners with 6-pixel radius

**Visual Effect**: Smooth, rounded piano key edges (realistic appearance).

### 16.3 Coordinate Offset System

**Global Coordinates** (MidiLeft, MidiRight):
- Calculated for all 128 notes from left edge (0)
- Independent of display range

**Display Coordinates**:
```pascal
display_x = global_x - MidiOffset;
```

**MidiOffset Calculation**:
```pascal
MidiOffset := MidiLeft[MidiKeyFirst] - border;  // For white first key

MidiOffset := MidiLeft[MidiKeyFirst - 1] - border;  // For black first key
```

**Effect**: Shifts displayed range to start at left edge with border spacing.

### 16.4 Velocity Scaling

**Linear Scaling**:
```pascal
fill_height = (MidiBottom[i] - r) * velocity / 127;
```

**Velocity Range**: 1-127

**Fill Range**: 0% to 100% of key height (minus corner radius)

**Example** (white key, bottom=144, r=6):
```
Velocity 1:   fill = 138 × 1/127 ≈ 1 pixel
Velocity 64:  fill = 138 × 64/127 ≈ 69 pixels (50%)
Velocity 127: fill = 138 × 127/127 = 138 pixels (100%)
```

**Visual Dynamic Range**: ~1:138 (easily perceivable from pianissimo to fortissimo)

### 16.5 Text Rotation

**AngleTextOut** (rotated note labels):
```pascal
AngleTextOut(x, y, text, style, angle);
```

**Angle**: -900 (90° clockwise, in tenths of degrees)

**Text Direction**: Vertical, reading upward from bottom

**Font Size**: `vTextSize := MidiKeySize div 3` (2528 — Pascal `div`, truncating toward zero)

**Example** (MidiKeySize = 24):
- Font size = 8 points
- Character height ≈ 11 pixels
- Fits comfortably within key width

---

## 17. Element Array Protocol Specification

The **MIDI** display window receives its parameters and data through the same element-stream parser as every other window. The parser is the family of `Next*` helpers (`NextKey`, `NextNum`, `NextStr`, `NextEnd`) that walk the decoded element list; the value of the current element is exposed in the global `val`. There are **no** MIDI-specific element-type constants such as `TYPE_CHANNEL` or `TYPE_MIDI_BYTE` — the same `key_*` keyword ids and numeric elements used by all windows apply.

### 17.1 Configuration Elements

Configuration is consumed once by `MIDI_Configure` (2492–2588). Its parameter loop (2506–2525) is a `while NextKey do case val of …` over keyword ids:

```pascal
while NextKey do
case val of
  key_title:   KeyTitle;                          // TITLE 'str'
  key_pos:     KeyPos;                             // POS left top
  key_size:    KeyValWithin(MidiSize, 1, 50);     // SIZE n   (1..50, default 4)
  key_range:   if KeyValWithin(MidiKeyFirst, 0, 127) then
               begin
                 MidiKeyLast := MidiKeyFirst;
                 KeyValWithin(MidiKeyLast, MidiKeyFirst, 127);
               end;                                // RANGE firstKey lastKey
  key_channel: KeyValWithin(MidiChannel, 0, 15);  // CHANNEL n (0..15, default 0)
  key_color:   if KeyColor(vColor[0]) then
                 KeyColor(vColor[1]);             // COLOR onWhite onBlack
end;
```

**Real configuration state** (2497–2503, defaults set before the loop):
- **MidiSize** — key-size scalar 1..50, default 4.
- **MidiKeyFirst / MidiKeyLast** — display range 0..127, default 21..108.
- **MidiChannel** — exact channel filter 0..15, default 0. There is **no "all channels" value**; channel 0 means literally channel 0.
- **vColor[0] / vColor[1]** — white-key and black-key velocity colors, defaults `clCyan` / `clMagenta`.

`UPDATE`, `KEYLUT`, and a custom-layout pointer do **not** exist in MIDI; there is no update-mode flag and no per-key lookup table.

### 17.2 MIDI Data Elements

Data is consumed by `MIDI_Update` (2590–2643). Inside the per-message loop, `MIDI_Update` first tries `NextKey` (handling `key_clear`, `key_save`, `key_pc_key`, `key_pc_mouse`); when the next element is numeric it falls into `while NextNum do` (2607) and feeds each value to the inline state machine. Every MIDI byte is just an ordinary numeric element — there is no dedicated `TYPE_MIDI_BYTE`.

Each numeric value is masked to 8 bits, and **any** byte with bit 7 set (a status byte, $80–$FF) resets `MidiState` to 0 (2610–2611):

```pascal
val := val and $FF;
if val and $80 <> 0 then MidiState := 0;
```

**Message types actually recognized** — only note-on and note-off, and only on the configured channel (2615–2616):
- **$9n** (`val and $F0 = $90`) with `val and $0F = MidiChannel` → note-on (MidiState := 1).
- **$8n** (`val and $F0 = $80`) with `val and $0F = MidiChannel` → note-off (MidiState := 3).

All other status bytes ($An–$Fn: aftertouch, control change, program change, pitch bend, system) match neither test, so they simply leave the machine in state 0 and are ignored. They are **not** parsed or stored.

### 17.3 Multi-Note Transmission (Running Status)

There is no buffered "bulk" element format — multiple notes are sent simply as consecutive numeric elements consumed by the same `while NextNum` loop. After a `$9n` status byte the machine stays in the note-on pair-cycle (state 1→2→1→2…), so additional `note, velocity` pairs need no repeated status byte (2618–2628). The same applies to `$8n` note-off (states 3↔4, 2629–2639). A redraw (`MIDI_Draw(False)`) fires once per completed pair (2627, 2638).

---

## 18. Buffer Management and Timing

The **MIDI** window keeps note state in a single flat array, not a record buffer. There is no `TNoteState` record, no per-note channel or timestamp, and no `NoteStates[]`.

### 18.1 Note State Array

**Real data structure** (declared with the other Midi vars, ~369–382):
```pascal
var
  MidiVelocity: array [0..127] of integer;  // signed velocity per note
```

One signed integer per MIDI note encodes both activity and velocity:
- **MidiVelocity[note] > 0** — note is on; the value is the note-on velocity (1..127).
- **MidiVelocity[note] ≤ 0** — note is off; note-off stores the negated release velocity (2636), so the value is 0 or negative.

`MIDI_DrawKey` keys its colored fill solely on `MidiVelocity[i] > 0` (2673). No `Active`/`Channel`/`Timestamp` fields exist; channel was already enforced at parse time (see §18.3), so it is not re-stored per note.

**State write, note-on** (2623–2628):
```pascal
MidiVelocity[MidiNote] := val;   // positive velocity
MidiState := 1;
MIDI_Draw(False);
```

**State write, note-off** (2634–2639):
```pascal
MidiVelocity[MidiNote] := -val;  // negated release velocity
MidiState := 3;
MIDI_Draw(False);
```

`CLEAR` (and the initial draw) zero the whole array via `MIDI_Draw(True)` (2649).

### 18.2 The Inline MidiState Machine

There is **no** `TMidiParserState` enum and no control-change handling. The parser is the integer `MidiState` (0..4) advanced inside `MIDI_Update`'s `while NextNum` loop (2607–2640):

| State | Meaning | On next byte | → |
|---|---|---|---|
| 0 | idle — waiting for note-on/off status | `$9x` & chan match → 1; `$8x` & chan match → 3 (2615–2616) | 1 or 3 |
| 1 | note-on: expecting note number | `MidiNote := val` (2620) | 2 |
| 2 | note-on: expecting velocity | `MidiVelocity[MidiNote] := val`; draw (2625–2627) | 1 (running status) |
| 3 | note-off: expecting note number | `MidiNote := val` (2631) | 4 |
| 4 | note-off: expecting velocity | `MidiVelocity[MidiNote] := -val`; draw (2636–2638) | 3 (running status) |

Before the case, every byte with bit 7 set forces `MidiState := 0` (2611), so any new status byte (including an unsupported one) re-synchronizes the machine. After a completed pair the machine returns to its on/off state (1 or 3), not to 0 — this is the running-status behavior.

### 18.3 Channel Filtering — Exact Match Only

The window processes a note **only** when the status byte's low nibble equals the configured `MidiChannel`; there is no "all channels" mode (2615–2616):

```pascal
if (val and $F0 = $90) and (val and $0F = MidiChannel) then MidiState := 1;
if (val and $F0 = $80) and (val and $0F = MidiChannel) then MidiState := 3;
```

- `MidiChannel = 0` shows **only channel 0** (MIDI channel 1), not all channels.
- `MidiChannel = 9` shows only channel 9 (MIDI channel 10, typically percussion).
- A `$9n`/`$8n` on a non-matching channel fails the test, leaving the machine in state 0; that message's data bytes are then ignored as well.

### 18.4 Redraw Cadence

A full redraw (`MIDI_Draw(False)`) fires once per completed note-on or note-off pair (2627, 2638), and a clearing redraw (`MIDI_Draw(True)`) fires on `CLEAR` (2598) and at configuration end (2587). Each redraw repaints every displayed key (2657–2662); there is no incremental single-key update path.

---

## 19. Bitmap System and Double-Buffering

The **MIDI** window renders into a single off-screen bitmap, `Bitmap[0]`, then blits it to the visible canvas with `BitmapToCanvas(0)` (2664). There is **no** front/back buffer pair, no `SwapBuffers`, and no `vUpdate` mode — MIDI does not accept `UPDATE`, so every note event paints immediately.

### 19.1 Draw Pass (MIDI_Draw)

`MIDI_Draw(Clear)` (2645–2665) does the whole frame in one call:
1. If `Clear`, zero all 128 `MidiVelocity[]` entries (2649).
2. Fill the bitmap with `clInactiveCaption`, pen `clGray2` width 1 (2650–2653).
3. Compute corner radius `r := MidiKeySize div 4` (2654).
4. **Pass 1** — draw white keys (`not MidiBlack[i]`) with font color `clGray3` (2656–2658).
5. **Pass 2** — draw black keys (`MidiBlack[i]`) with font color `clGray2`, on top (2660–2662).
6. `BitmapToCanvas(0)` (2664).

The two-pass order is the painter's algorithm so black keys overlap white ones; there is no per-key invalidation list.

### 19.2 Key Rendering (MIDI_DrawKey)

Both passes call the one helper `MIDI_DrawKey(i, OffColor, OnColor, r)` (2667–2682): white keys with `(clWhite, vColor[0])`, black keys with `(clBlack, vColor[1])` (2658, 2662). Keys are drawn with **`RoundRect`**, not `Rectangle`, using the pre-computed geometry arrays `MidiLeft/MidiRight/MidiBottom` (shifted by `MidiOffset`) — they are **not** recomputed from note number at draw time:

```pascal
// plain (off) key — full key in OffColor
Bitmap[0].Canvas.Brush.Color := WinRGB(OffColor);
Bitmap[0].Canvas.RoundRect(MidiLeft[i] - MidiOffset, -r,
                           MidiRight[i] - MidiOffset, MidiBottom[i], r, r);
```

### 19.3 Velocity-Proportional Fill

There is **no** velocity-to-color gradient function. The on-color is the flat configured color (`vColor[0]`/`vColor[1]`); velocity controls the **height** of a second `RoundRect` overdrawn from the bottom of the key (2673–2679):

```pascal
if MidiVelocity[i] > 0 then
begin
  Bitmap[0].Canvas.Brush.Color := WinRGB(OnColor);
  Bitmap[0].Canvas.RoundRect(MidiLeft[i] - MidiOffset,
    MidiBottom[i] - r - (MidiBottom[i] - r) * MidiVelocity[i] div 127,
    MidiRight[i] - MidiOffset, MidiBottom[i], r, r);
end;
```

So `velocity = 127` fills the full key height (minus the corner radius) and `velocity = 1` fills a sliver; the hue is constant. A key is colored only while `MidiVelocity[i] > 0`, i.e. note-off (negative velocity) leaves it in its OffColor.

After the fill, the note number label is drawn rotated −90° via `AngleTextOut` (2680–2681).

---

## 20. Shared Infrastructure

The **MIDI** window uses the same shared canvas helpers as the other windows, but its keyboard geometry and labels are MIDI-specific and are computed in `MIDI_Configure`, not via the helper functions invented in earlier drafts (no `NoteToPixelX`, `WhiteKeyIndex`, `GetBlackKeyOffset`, `NoteToString`, `IsBlackKey` bitmask, or `TranslateColor` exist).

### 20.1 Color System

MIDI stores its two velocity colors in the shared `vColor[]` array — `vColor[0]` (white-key on, default `clCyan`) and `vColor[1]` (black-key on, default `clMagenta`), set at 2502–2503 and overridable by `COLOR` (2522–2524). At draw time the brush color is resolved through the shared `WinRGB(...)` helper (2670, 2675); fixed colors used directly are `clInactiveCaption` (background), `clGray2`/`clGray3` (pen and label colors), `clWhite`, and `clBlack`. There is no `TranslateColor`/`GetSysColor` indirection in this path.

### 20.2 Rotated Number Labels

Each key is labeled with its **MIDI note number** (`IntToStr(i)`), not a pitch name like `'C4'`. The label is drawn through the shared `AngleTextOut` helper at angle −900 (−90°, tenths of a degree) (2680–2681):

```pascal
Bitmap[0].Canvas.Brush.Style := bsClear;
AngleTextOut(MidiNumX[i] - MidiOffset, ChrWidth, IntToStr(i), $20, -900);
```

Label font size derives from `vTextSize := MidiKeySize div 3`, applied via `SetTextMetrics` during configuration (2528–2529). The horizontal label position `MidiNumX[i]` is precomputed per note in Configure (2556 for black keys, 2563 for white keys).

### 20.3 Keyboard Geometry (precomputed in Configure)

Key positions are **not** derived at draw time from `note mod 12`. `MIDI_Configure` walks all 128 notes once (2534–2572), filling four arrays — `MidiLeft[i]`, `MidiRight[i]`, `MidiBottom[i]`, `MidiNumX[i]` — plus `MidiBlack[i]`. White keys advance the running `x` by `MidiKeySize`; black keys are placed relative to that `x` using the per-pitch `tweak` table (2536–2549):

```pascal
black := note in [1, 3, 6, 8, 10];     // exact black-key test
if black then
begin
  left   := x - (MidiKeySize * (10 - tweak) + 16) div 32;
  right  := left + MidiKeySize * 20 div 32;   // ~0.625 × white width
  bottom := MidiKeySize * 4;                   // shorter than white
end
else
begin
  left   := x;
  right  := left + MidiKeySize;
  bottom := MidiKeySize * 6;
  Inc(x, MidiKeySize);
end;
```

The whole keyboard is then shifted left by `MidiOffset` at draw time (`MidiLeft[i] - MidiOffset`, etc.) so the first displayed key sits at the border (2574–2580).

### 20.4 Black-Key Detection

Black keys are identified by the set membership test **`note in [1, 3, 6, 8, 10]`** (2550), where `note` is the 0..11 octave position maintained by the `Inc/reset` counter (2570) — *not* by a `$054A` bitmask or any `IsBlackKey` function. The five black pitch-classes are C#(1), D#(3), F#(6), G#(8), A#(10); the seven others are white.

---

## 21. Initialization Lifecycle

All MIDI initialization happens inside the single procedure `MIDI_Configure` (2492–2588), run once when the window is created. There is no separate `CreateMidiWindow`, no `ParseConfigurationElements` over `TYPE_*` constants, no `vUpdate`, no custom `KeyLUT`, and no lazy "first MIDI byte triggers init" path. The bitmap/window objects are created by the shared form machinery; `MIDI_Configure` only sets MIDI state and geometry.

### 21.1 Configure Sequence

**Step order as written** (2496–2587):
1. **Set defaults** (2497–2503): `MidiSize := 4`, `MidiKeyFirst := 21`, `MidiKeyLast := 108`, `MidiChannel := 0`, `vColor[0] := clCyan`, `vColor[1] := clMagenta`, `MidiState := 0`.
2. **Parse parameters** (2506–2525): the `while NextKey do case val of …` loop (§17.1) applies `TITLE`, `POS`, `SIZE`, `RANGE`, `CHANNEL`, `COLOR`.
3. **Derive metrics** (2527–2530): `MidiKeySize := MidiSizeBase + MidiSize * MidiSizeFactor` (= 8 + size×4), `vTextSize := MidiKeySize div 3`, `SetTextMetrics`, `border := MidiKeySize div ((MidiSizeBase + MidiSizeFactor) div 2)`.
4. **Build geometry** (2531–2572): loop over all 128 notes filling `MidiBlack/MidiLeft/MidiRight/MidiBottom/MidiNumX` and counting `whitekeys` within the display range (§20.3).
5. **Resolve offset & edge padding** (2573–2582): set `MidiOffset`; if first or last displayed key is black, add a white-key slot.
6. **Set form size** (2583–2586): `vWidth := MidiKeySize * whitekeys + border * 2`, `vHeight := MidiKeySize * 6 + border`, then `SetSize(0, 0, 0, 0)`.
7. **Initial draw** (2587): `MIDI_Draw(True)` — clears all velocities and paints the empty keyboard.

### 21.2 Window Sizing

Window dimensions are computed from `MidiKeySize` and the **actual** white-key count in `[MidiKeyFirst..MidiKeyLast]` (plus up to two edge-padding slots), not a fixed 88-key assumption:

```pascal
vWidth  := MidiKeySize * whitekeys + border * 2;   // 2584
vHeight := MidiKeySize * 6 + border;               // 2585
SetSize(0, 0, 0, 0);                               // 2586
```

`SIZE` is the 1..50 scalar feeding `MidiKeySize` (default 4 ⇒ key width 24); it is clamped by `KeyValWithin(MidiSize, 1, 50)` (2512–2513). There is no separate runtime `ResizeWindow` — changing size means reconfiguring the window.

### 21.3 No Custom Layout / No Lazy Init

The window always renders the full configured `[MidiKeyFirst..MidiKeyLast]` range with note-number labels. There is no per-key visibility table, custom-color table, or alternate-label (solfège) support — `TKeyLUT`/`LoadCustomKeyLUT` do not exist. The keyboard is fully drawn at the end of `MIDI_Configure` (2587) before any MIDI data arrives; subsequent bytes only update `MidiVelocity[]` and redraw.

---

## 22. Conclusion

The **MIDI** display window provides an intuitive, real-time visualization of MIDI note activity through an on-screen piano keyboard. Its velocity-sensitive rendering and realistic key geometry make it ideal for:

**Key Strengths**:
- Immediate visual feedback for note events
- Velocity-proportional display (dynamic range visualization)
- Standard MIDI protocol support (Note-On/Off)
- Channel filtering for multi-instrument setups
- Scalable display (1× to 50× sizing)
- Realistic piano keyboard layout
- Efficient state machine processing

**Typical Use Cases**:
- MIDI device testing and debugging
- Musical performance visualization
- Synthesizer monitoring
- Educational demonstrations
- Live performance displays
- MIDI file playback visualization
- Polyphonic note tracking

**Performance**: Capable of processing thousands of MIDI events per second with sub-20ms latency, making it suitable for real-time musical applications and interactive performances.

The MIDI display complements the terminal (TERM) and graphical analysis displays (SCOPE, FFT, SPECTRO) by providing domain-specific visualization for musical applications, bridging the gap between abstract MIDI data and intuitive visual feedback.
