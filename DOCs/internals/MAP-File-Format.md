# PNut-TS `.map` File Format

**Status:** specification of the `.map` format written by PNut-TS 1.55.8. The
format changed in 1.55.8; maps from earlier releases use different sections and
columns.

## Overview

A `.map` file describes how the compiler laid out a program in memory. It is
written to teach two ideas, and every section is organized around them:

- An **image** is compiled code plus DAT. When several instances compile to the
  same bytes, the compiler keeps one image and every one of those instances runs
  it — so they also share its DAT.
- An **instance** is the top object, or one `OBJ` declaration or array element
  beneath it. **Each instance has its own VAR**, even when it shares its image
  with other instances.

This document is the format specification: concepts, the exact section and
column grammar, and a complete worked example. It is detailed enough to write a
parser against, and a map produced for the worked example's source must match
the example text byte for byte, apart from the `Generated:` line.

**Authority.** The layout facts come from the compiled image itself: the
compiler walks the object header tables of the final image and builds one
layout model, `ObjectLayout` (`src/classes/objectLayout.ts`); the map is
written from that model by `src/classes/mapGenerator.ts`. The header walk
follows the Spin2 interpreter's object-call rule (`callh` in
`src/ext/Spin2_interpreter.spin2`): a child's code base is its parent's code
base plus the slot's code offset, and its VAR base is its parent's VAR base plus
the slot's VAR offset, at every depth.

## Requesting a map, and what it is called

`-m` / `--map` writes the map. Without it no `.map` is written.

The name is the source filename with its extension replaced by `.map`, in the
source's directory: `map_demo.spin2` produces `map_demo.map`. `-o` does not
rename it; the output override applies only to the binary and the flash-loader
binary.

The file is assembled in memory and written with one synchronous write, so a
tool that reads it after the compiler reports `Wrote <name>.map` sees the
complete file.

---

## Concepts

### Images

Every distinct compiled object occupies one region of the image. Regions are
laid end to end from address `$00000`; each is padded with 0 to 3 bytes to a
long boundary before the next one starts. An image's **size** is its own bytes —
header, DAT and method code — without that padding and without its children,
which are separate images.

Images are numbered `#1`, `#2`, … in ascending address order. `#1` is always the
top object, at `$00000`.

Two instances use the same image exactly when they compiled to the same bytes.
That is decided by the bytes, not by the declaration:

| Situation | Result |
|---|---|
| The same object declared twice with no overrides, or with identical overrides | one image, two instances |
| Elements of one `OBJ` array | one image, one instance per element |
| An override that changes any byte — a DAT layout, a constant pushed by code, a method's size | a **fork**: separate images, each with its own method entries and DAT offsets |
| An override that changes only the VAR size, when no byte of code depends on it | one image; the instances' VAR blocks differ in size |
| Two differently named source files that compile to the same bytes | one image; its `Source` cell lists both files (the compiler also warns `Duplicate source`) |

Because a shared image holds its DAT once, every instance of that image reads
and writes the same DAT bytes. That is the **shared DAT** the legend names.

### Instances

The top object is an instance. Below it, each `OBJ` declaration contributes one
instance per parent instance, and an array declaration `d[3]` contributes one
instance per element. A declaration inside an object that is itself used twice
therefore produces two instances.

Every instance of a Spin program has its own VAR block — its **own VAR**. The
first long of each block is reserved for the interpreter, so the block is at
least 4 bytes and the first VAR symbol sits at offset `+$00004`. VAR symbols
follow in declaration order with no padding between them, and the block is then
padded to a multiple of 4. VAR blocks are laid end to end, starting at the first
long after the last image, in depth-first order: an instance's own block, then
each of its children's blocks in slot order.

### Instance paths

An instance is named by its access path, in upper case, as the compiler holds
the declared names:

| Path | Instance |
|---|---|
| `(top)` | the top object |
| `A` | declaration `a` in the top object |
| `A.LEAF` | declaration `leaf` inside instance `A` |
| `D[1]` | element 1 of array declaration `d[n]` in the top object |
| `A.D[1].LEAF` | declaration `leaf` inside element 1 of array `d` inside `A` |

A path never contains whitespace or a comma. `(top)` is a reserved literal and
never appears as a prefix of another path.

### Addresses

Every address in the map is an **offset from the first byte of the top object's
image** — the same numbering as the hex dump in the `.lst` listing and the image
bytes of the `.obj` file.

The `.bin` written by the same compile holds other bytes before the image, so
the image starts part-way into it. `SUMMARY` states where, as the **hub base**:
the image's offset in the `.bin`, which is also its hub address once the `.bin`
is loaded at hub `$00000`. For any address in the map:

```
hub address = map address + hub base
```

The hub base depends on how the program was built:

| Build | What precedes the image |
|---|---|
| Spin program | the Spin2 interpreter |
| Spin program with `-d` | the interpreter, the debugger and the program's debug data |
| PASM-only program, no clock setting | nothing: the hub base is `$00000` |
| PASM-only program with a clock setting (such as `_clkfreq`) | the clock-setting code |
| PASM-only program with `-d` | the debugger |

A `-d` build and a plain build of the same source therefore print different hub
bases, and a `-d` hub base need not be a multiple of 4. The rest of the map is
the same for both unless the source contains `DEBUG` statements, which only a
`-d` build compiles into the image.

### Where each fact lives

Each fact is stated once, in the section that owns it:

| Fact | Owning section |
|---|---|
| counts, byte totals and hub base | `SUMMARY` |
| an instance's image, source file and overrides | `OBJECT TREE` |
| an image's address range and size; which instances use it | `MEMORY LAYOUT`, Images |
| an instance's VAR block range and size | `MEMORY LAYOUT`, VAR blocks |
| methods, DAT, PASM labels, inline PASM, child slots | `OBJECT DETAILS`, in the image's block |
| an instance's VAR symbols | `OBJECT DETAILS`, in its image's block |

The source file name is printed beside an image number in `MEMORY LAYOUT` and
in each `OBJECT DETAILS` heading as a readable label for that number; it is
derived from the instances that use the image, not an independent fact. The two
index sections restate `OBJECT DETAILS` facts sorted for lookup and add nothing
new.

The two join keys between sections are the image number `#n` and the instance
path.

---

## Lexical conventions

### Lines

- Every line ends with a single `\n`. No `\r`.
- **No line ends in whitespace.**
- A section begins with a line `=== NAME ===`, followed by one blank line.
- Every section ends with one blank line, so the file ends with `\n\n`.

### Tables

Most content is in tables of this shape:

```
  <title>                  (only inside MEMORY LAYOUT and OBJECT DETAILS)
  Header1  Header2  Header3
  -------  -------  -------
  cell     cell     cell
```

- Every table line begins with two spaces.
- Cells are separated by exactly two spaces.
- A column's width is the longest of its header and every cell in it. The header
  length is the minimum; there is no other minimum and no maximum.
- The rule line under the header holds, for each column, as many `-` as the
  column is wide.
- Cells are left-aligned and padded with spaces to the column width, except
  `Size` columns, which are right-aligned (header included).
- The last cell of a line is never padded.
- **No cell contains whitespace**, and every row of a table has the same number
  of cells. A parser may split each row on runs of whitespace.
- A cell with nothing to say holds `-`.
- A table with no rows is not printed. Where a whole section would be empty,
  the section holds the single line `  (none)`.

### Tokens

| Token | Form | Example |
|---|---|---|
| address | `$` and 5 uppercase hex digits | `$0007C` |
| range | two addresses joined by `-`, both inclusive | `$00074-$00092` |
| offset | `+$` and 5 uppercase hex digits, relative to an image base or a VAR block base | `+$00008` |
| cog address | `$` and 3 uppercase hex digits | `$000` |
| size | decimal, no separators | `114` |
| image number | `#` and decimal | `#2` |
| path | see Instance paths | `LEFT.LOG` |
| list | items joined by `,` with no spaces | `LEFT,RIGHT` |
| array run | `NAME[first..last]` | `LED[0..2]` |
| empty | `-` | `-` |

An address wider than 5 hex digits is printed in full; P2 hub memory does not
require it.

### Lists and array runs

In a list cell, consecutive items that are elements of **one** array —
identical text up to the final `[index]`, with indices ascending by one — are
written as a run when there are three or more of them: `D[0],D[1],D[2],D[3]`
becomes `D[0..3]`. Two elements stay as `D[0],D[1]`. Runs are never formed
across different parents: `A[0].L[0],A[0].L[1],A[1].L[0],A[1].L[1]` has no run
of three and is printed as written. Array runs appear only in list cells; every
other path cell names exactly one instance.

### Source file names

A source file name is printed with its extension, as found on disk:
`demo_led.spin2`. Inside a table cell, each byte that is a control character,
a space, `%`, `,` or DEL (`$00`–`$20`, `$25`, `$2C`, `$7F`) is written as `%`
followed by two uppercase hex digits, so `my drv.spin2` prints as
`my%20drv.spin2`. The header line prints the top file name unescaped.

### Overrides

An instance's constant overrides are printed as `NAME=VALUE` items in the order
they were written in the declaration, joined by `,` with no spaces:
`SIZE=32`, `RATE=2.5,OFFSET=-1`.

- An integer value is printed in signed decimal: `OFFSET = $FFFF_FFFF` prints as
  `OFFSET=-1`.
- A float value is printed as the shortest decimal (1 to 9 significant digits)
  that converts back to the same single-precision value, always with a decimal
  point: `RATE = 2.5` prints as `RATE=2.5`, `RATE = 3.0` as `RATE=3.0`.

### Ordering

Every row order is fixed:

- **Tree order** of instances: depth-first pre-order from `(top)`, children in
  slot order. This is also ascending VAR block address.
- Images: ascending image number, which is ascending address.
- Names compare by byte value (ordinal), never by locale.

Each table below states its sort keys.

---

## File skeleton

```
<header>
=== SUMMARY ===
=== OBJECT TREE ===
=== MEMORY LAYOUT ===
=== OBJECT DETAILS ===
=== ADDRESS INDEX ===
=== SYMBOL INDEX ===
```

The sections always appear, in this order.

## Header

```
================================================================================
PNut-TS Memory Map: <top source file name>
Spin2_v<language version>
Generated: <ISO 8601 UTC timestamp>
================================================================================

```

The rules are 80 `=`. The language version is the top file's `{Spin2_vNN}`
version. `Generated:` is the only line two compiles of the same source differ
on; **tools comparing maps, and the conformance test for the worked example,
skip it** (`--cache-verify` does the same).

## `=== SUMMARY ===`

```
=== SUMMARY ===

  <sentence>

  Code/DAT bytes  <n>
  VAR bytes       <n>
  Total bytes     <n>
  Hub base        <address>

  <legend: 7 fixed lines>

```

### The sentence

With `D` = number of `OBJ` declarations, `N` = instances, `I` = images and `S` =
images used by more than one instance. `D` counts declarations as written in
source: each name declared in an `OBJ` block, in each distinct source file of
the program, counts once, however many instances it produces.

For a Spin program with at least one `OBJ` declaration:

```
  The top object and <D> OBJ declaration[s] became <N> instance[s], built from <I> image[s]; <shared>.
```

For a Spin program with none:

```
  The top object became 1 instance, built from 1 image; no image is shared.
```

`[s]` is present when the preceding number is not 1. `<shared>` is:

| `S` | Text |
|---|---|
| 0 | `no image is shared` |
| 1 | `1 image is shared by more than one instance` |
| 2 or more | `<S> images are shared by more than one instance` |

For a PASM-only program (see PASM-only programs):

```
  This PASM-only program is 1 image with no objects, so it has no instances and no VAR.
```

### Totals

`Code/DAT bytes` is the image length: every image plus its padding. `VAR bytes`
is the sum of every instance's VAR block — `0` for a PASM-only program.
`Total bytes` is their sum. `Hub base` is the image's offset in the `.bin`
written by the same compile (see Addresses), as an address token. Labels are
padded to 16 characters; the three byte counts are right-aligned to the width of
the `Total bytes` number, and the hub base address starts in the same column as
the widest count.

### Legend

These seven lines are fixed text, printed exactly:

```
  image       compiled code and DAT, shared by every instance that uses it
  instance    the top object, or one OBJ declaration or array element below it
  shared DAT  an image holds its DAT once; all of its instances use the same bytes
  own VAR     each instance has its own VAR block; the first long of it is reserved
  #n          image number: #1 is the top object, the rest ascend in address order
  path        instance name: (top) A A.LEAF D[1] A.D[1].LEAF; D[0..4] means D[0] to D[4]
  address     offset from the first byte of the top object image; hub address = address + hub base
```

## `=== OBJECT TREE ===`

One row per instance, array elements included, in tree order.

```
  Instance       Image  Source            Overrides
  -------------  -----  ----------------  ---------
  (top)          #1     map_demo.spin2    -
    LED[0]       #2     demo_led.spin2    -
      LEFT.LOG   #4     demo_buf.spin2    SIZE=4
```

| Column | Content |
|---|---|
| `Instance` | two spaces per nesting depth (`(top)` is depth 0), then the full path |
| `Image` | the image this instance runs |
| `Source` | the instance's source file |
| `Overrides` | the declaration's overrides, or `-` |

The indentation is inside the `Instance` cell and counts toward its width; a
whitespace split still yields the path as one token.

For a PASM-only program the section holds `  (none)`.

## `=== MEMORY LAYOUT ===`

One walk through memory in ascending address: the images, then the VAR blocks
that follow them. Two titled tables.

```
  Images
  Range          Size  Image  Source            Instances
  -------------  ----  -----  ----------------  ------------------
  $00074-$00092    31  #2     demo_led.spin2    LED[0..2]

  VAR blocks
  Range          Size  Image  Instance
  -------------  ----  -----  ---------
  $00124-$0012B     8  #2     LED[0]

```

### Images

One row per image, ascending address.

| Column | Content |
|---|---|
| `Range` | first and last byte of the image, padding excluded |
| `Size` | image size in bytes |
| `Image` | image number |
| `Source` | source file of the instances using it; when more than one file compiled to these bytes, the distinct names as a list in ordinal order |
| `Instances` | every instance using the image, as a list in tree order with array runs; `-` for a PASM-only program |

The gap between one image's last byte and the next image's first byte is its
long-alignment padding, 0 to 3 bytes. The images and their padding cover
`$00000` up to `Code/DAT bytes` exactly.

### VAR blocks

One row per instance, in tree order (which is ascending address).

| Column | Content |
|---|---|
| `Range` | first and last byte of the instance's own VAR block, reserved long included |
| `Size` | block size in bytes, a multiple of 4, at least 4 |
| `Image` | the image this instance runs |
| `Instance` | the instance path |

The blocks are contiguous: the first starts at `Code/DAT bytes`, and together
they cover exactly `VAR bytes`. The table is omitted for a PASM-only program.

## `=== OBJECT DETAILS ===`

One block per image, ascending image number:

```
--- #<n> <source> ---

  <sub-table>

  <sub-table>

```

The heading's `<source>` is the same cell as the image's `Source` in `MEMORY
LAYOUT`. The heading is followed by a blank line; each sub-table is followed by
a blank line; the last one's blank line is also the section's closing blank line.
Sub-tables appear in this order, each only when it has rows:
`Methods`, `DAT`, `PASM labels`, `Inline PASM`, `Child slots`, `VAR`.

Everything but `VAR` belongs to the image and is printed once, whatever the
number of instances using it. `VAR` holds one group of rows per instance.

Instances sharing an image can know its bytes by different names (see Shared
images with different symbols). `Methods`, `DAT`, `PASM labels` and `Inline
PASM` therefore list every **distinct** row gathered from all instances using
the image: two rows are the same row only when they have the same kind, name and
offset.

### Methods

```
  Methods
  Name    Offset   Address
  ------  -------  -------
  TOGGLE  +$00008  $0007C
```

| Column | Content |
|---|---|
| `Name` | method name (`PUB` and `PRI`) |
| `Offset` | entry point relative to the image base, read from the image's method table |
| `Address` | image base + offset |

Sorted by address, then name. Every Spin image has at least one method, so this
table is always present for a Spin program.

### DAT

```
  DAT
  Type  Name    Offset   Address
  ----  ------  -------  -------
  BYTE  BUFFER  +$00008  $000BC
```

DAT labels assembled in hub mode — every DAT label not under an `ORG`.

| Column | Content |
|---|---|
| `Type` | the label's data type: `BYTE`, `WORD`, `LONG` or `STRUCT` |
| `Name` | label name |
| `Offset` | position of the labelled bytes relative to the image base |
| `Address` | image base + offset |

Sorted by offset, then name. The offsets are this image's own: forks whose DAT
layouts differ show different offsets in their own blocks.

### PASM labels

```
  PASM labels
  Name   Cog   Offset   Address
  -----  ----  -------  -------
  BLINK  $000  +$0003A  $0003A
```

Cog-mode DAT labels (after `ORG`).

| Column | Content |
|---|---|
| `Name` | label name |
| `Cog` | the cog address the label was assembled at |
| `Offset` | where the labelled bytes sit in the image, relative to the image base |
| `Address` | image base + offset |

Sorted by offset, then name.

### Inline PASM

```
  Inline PASM
  Name  Cog   Offset   Address
  ----  ----  -------  -------
  FLIP  $000  +$00016  $0008A
```

Labels inside `ORG` … `END` blocks within methods. Columns and sort as `PASM
labels`; `Offset` locates the labelled instruction inside the method's bytes in
the image. The same name may appear on more than one row when different methods
use it; the offsets tell them apart.

### Child slots

```
  Child slots
  Slot  Name    Image  VAR
  ----  ------  -----  -------
  0     LED[0]  #2     +$00008
```

The image's object table: one row per slot, in slot order. An array declaration
takes one slot per element.

| Column | Content |
|---|---|
| `Slot` | slot index, decimal from 0 |
| `Name` | the declared name, with `[index]` for an array element; when instances using this image were compiled from differently named declarations, the distinct names as a list in ordinal order |
| `Image` | the image the slot's child runs |
| `VAR` | the child's VAR block offset from this instance's VAR base |

These values are bytes of the image, so every instance using the image has the
same slot table. For each instance `P` using this image, the child in slot `k`
has its VAR block at `P`'s VAR base plus slot `k`'s `VAR` offset.

### VAR

```
  VAR
  Instance  Type  Name   Size  Offset   Address
  --------  ----  -----  ----  -------  -------
  LEFT      LONG  SPEED     4  +$00004  $00140
  LEFT      WORD  LIMIT     2  +$00008  $00144
```

One row per VAR symbol of each instance using this image.

| Column | Content |
|---|---|
| `Instance` | the instance that owns this copy |
| `Type` | `BYTE`, `WORD`, `LONG`, `STRUCT`, `^BYTE`, `^WORD`, `^LONG` or `^STRUCT` |
| `Name` | symbol name |
| `Size` | bytes the symbol occupies: element size × element count |
| `Offset` | relative to that instance's VAR base; the first symbol is at `+$00004` |
| `Address` | the instance's VAR base + offset |

Sorted by instance in tree order, then offset, then name. Instances using one
image can have different VAR layouts when an override changes only VAR sizes,
so each instance's rows are that instance's own. Instances with no VAR symbols
contribute no rows; their VAR blocks still appear in `MEMORY LAYOUT`.

## `=== ADDRESS INDEX ===`

Reverse lookup: holding an address, find the row with the greatest address not
above it.

```
  Address  Type    Owner      Name
  -------  ------  ---------  -------
  $00074   IMAGE   #2         (start)
  $0007C   METHOD  #2         TOGGLE
  $00124   VAR     LED[0]     (start)
  $00128   VAR     LED[0]     STATE
```

| Column | Content |
|---|---|
| `Address` | absolute address |
| `Type` | `IMAGE`, `METHOD`, `DAT`, `PASM`, `INLINE` or `VAR` |
| `Owner` | image number for `IMAGE`, `METHOD`, `DAT`, `PASM` and `INLINE` rows; instance path for `VAR` rows |
| `Name` | symbol name, or `(start)` for the first byte of an image or a VAR block |

Rows: one `IMAGE (start)` row per image, one row per `Methods`, `DAT`, `PASM
labels` and `Inline PASM` row in `OBJECT DETAILS`, one `VAR (start)` row per VAR
block, and one row per `VAR` row in `OBJECT DETAILS`.

Sorted by address; then type in the order `IMAGE`, `METHOD`, `DAT`, `PASM`,
`INLINE`, `VAR`; then `(start)` before any name, names ordinal; then owner
(image number ascending, paths in tree order).

## `=== SYMBOL INDEX ===`

Forward lookup: holding a name, find every address it has.

```
  Symbol   Type    Owner      Address
  -------  ------  ---------  -------
  PUT      METHOD  #4         $000C4
  PUT      METHOD  #5         $00104
```

One row per `Methods`, `DAT`, `PASM labels`, `Inline PASM` and `VAR` row in
`OBJECT DETAILS`; columns as in `ADDRESS INDEX` (types `METHOD`, `DAT`, `PASM`,
`INLINE`, `VAR`). Sorted by symbol (ordinal), then address, then owner. A name
held by several images or instances lands on adjacent rows, in address order.

---

## Arrays

An array declaration `d[n]` is `n` slots in its parent's object table and `n`
instances, `D[0]` to `D[n-1]`. All elements share one source file and one set
of overrides, so they always run one image. Each element has its own VAR block,
and elements are laid out in index order.

What prints:

- `OBJECT TREE`: one row per element.
- `MEMORY LAYOUT`: the image's `Instances` cell holds the run, `D[0..n-1]`; the
  VAR blocks table has one row per element.
- `OBJECT DETAILS`: one `Child slots` row per element; one group of `VAR` rows
  per element.
- A declaration inside an array element's object produces one instance per
  element: `M[0].LEAF`, `M[1].LEAF`.

A 255-element array therefore prints 255 tree rows and 255 VAR block rows. Every
element's VAR address is a distinct fact, and the map states each one.

## Shared images and forks

- **Identical copies.** `left : "demo_motor"` and `right : "demo_motor"` produce
  one image used by `LEFT,RIGHT`: one `Methods` table, one method address,
  two VAR blocks, two groups of VAR rows.
- **Forks.** An override that changes the image's bytes produces separate
  images from one source file. Each image's block holds its own method offsets,
  DAT offsets and labels: in the worked example `#4` and `#5` are both
  `demo_buf.spin2`, and `TAIL` is at `+$0000C` in one and `+$00028` in the other.
- **VAR-only differences.** When an override changes only VAR sizes and no
  code depends on the difference, the instances share one image but their VAR
  blocks differ in size, and each instance's `VAR` rows show its own sizes.
- **Nested instances of a shared image.** Children of instances that share an
  image are separate instances too (`LEFT.LOG`, `RIGHT.LOG`), with separate VAR
  blocks, and usually share their own image.

### Shared images with different symbols

The compiler merges objects by their bytes, not by their names. Labels, method
names and VAR names are not stored in the image, so instances whose symbols
differ still share one image when the bytes match. The image's details then
list every distinct name and offset its instances use.

`lab.spin2` places `l2` after `K` bytes; `other.spin2` has the same bytes under
other names:

```spin2
' lab.spin2
CON K = 1
DAT
l1  BYTE  0[K]
l2  BYTE  0[4-K]
PUB get() : r
  r := l1
```

```spin2
' other.spin2
DAT
first   BYTE  0[1]
rest    BYTE  0[3]
PUB get() : r
  r := first
```

Declared as `a : "lab" | K = 1`, `b : "lab" | K = 3` and `c : "other"`, all three
compile to the same 18 bytes:

```
  Images
  Range          Size  Image  Source                 Instances
  -------------  ----  -----  ---------------------  ---------
  $00030-$00041    18  #2     lab.spin2,other.spin2  A,B,C
```

```
  DAT
  Type  Name   Offset   Address
  ----  -----  -------  -------
  BYTE  FIRST  +$00008  $00038
  BYTE  L1     +$00008  $00038
  BYTE  L2     +$00009  $00039
  BYTE  REST   +$00009  $00039
  BYTE  L2     +$0000B  $0003B
```

`L2` appears twice because `A` and `B` put it at different offsets; `FIRST` and
`L1` name the same byte. `GET` is one `Methods` row: every instance has it at the
same offset. Both indexes carry the same distinct rows.

## PASM-only programs

A top file with no `PUB` compiles in PASM mode: the image is its DAT bytes with
no object header, no methods, no child objects and no VAR.

- `SUMMARY` prints the PASM-only sentence, `VAR bytes 0`, and the hub base —
  `$00000` unless a clock setting or `-d` puts code before the image.
- `OBJECT TREE` holds `  (none)`.
- `MEMORY LAYOUT` has one Images row for `#1`, with `Instances` `-`, and no VAR
  blocks table.
- `OBJECT DETAILS` has the `#1` block with `DAT` and `PASM labels` as present.
- The indexes hold the `IMAGE (start)` row and the label rows.

## Cache parity

A build with the object cache (`-C`), cold or warm, writes the same map as a
build without it, byte for byte apart from `Generated:`. The layout is read from
the final image, which is identical either way. `--cache-verify` compiles both
ways and fails when the maps differ.

---

## Worked example

Four source files in one directory; the same files are kept in the repository
under `TEST/MAP-tests/spec-example/`, where a test compiles them and compares the
map with the text below. The program has an `OBJ` array of three
elements, two identical copies of an object that declares a child of its own,
and a fork whose override changes a DAT layout; it has hub DAT, a cog-mode PASM
label and an inline PASM label.

`map_demo.spin2`:

```spin2
{Spin2_v55}
' map_demo: an OBJ array, two identical copies, and a DAT-layout fork

VAR long ticks

OBJ
  led[3] : "demo_led"
  left   : "demo_motor"
  right  : "demo_motor"
  trace  : "demo_buf" | SIZE = 32

PUB main() | i
  coginit(NEWCOG, @blink, 0)
  repeat
    repeat i from 0 to 2
      led[i].toggle()
    left.go(1)
    right.go(-1)
    trace.put(ticks++)

DAT
version BYTE    1, 0
        org     0
blink   drvnot  #56
        waitx   ##10_000_000
        jmp     #blink
```

`demo_led.spin2`:

```spin2
' demo_led: every element of an OBJ array shares this image
CON PIN = 56

VAR byte state

PUB toggle()
  state := !state
  org
flip    drvnot  #PIN
  end
```

`demo_motor.spin2`:

```spin2
' demo_motor: declared twice with no overrides, so both copies share one image
CON GAIN = 1

VAR long speed
    word limit

OBJ log : "demo_buf" | SIZE = 4

PUB go(delta)
  speed += delta * GAIN
  log.put(speed)
```

`demo_buf.spin2`:

```spin2
' demo_buf: SIZE sets the DAT layout, so a different SIZE forks the image
CON SIZE = 8

VAR long count

DAT
buffer  BYTE    0[SIZE]
tail    LONG    0

PUB put(value)
  tail := value
  buffer[count] := value
  count := (count + 1) // SIZE
```

Compiled with:

```
pnut-ts -m map_demo.spin2
```

`map_demo.map` (the `Generated:` value varies; the hub base is that of a build
without `-d`):

```
================================================================================
PNut-TS Memory Map: map_demo.spin2
Spin2_v55
Generated: 2026-09-16T20:00:00.000Z
================================================================================

=== SUMMARY ===

  The top object and 5 OBJ declarations became 9 instances, built from 5 images; 3 images are shared by more than one instance.

  Code/DAT bytes  284
  VAR bytes        80
  Total bytes     364
  Hub base        $01888

  image       compiled code and DAT, shared by every instance that uses it
  instance    the top object, or one OBJ declaration or array element below it
  shared DAT  an image holds its DAT once; all of its instances use the same bytes
  own VAR     each instance has its own VAR block; the first long of it is reserved
  #n          image number: #1 is the top object, the rest ascend in address order
  path        instance name: (top) A A.LEAF D[1] A.D[1].LEAF; D[0..4] means D[0] to D[4]
  address     offset from the first byte of the top object image; hub address = address + hub base

=== OBJECT TREE ===

  Instance       Image  Source            Overrides
  -------------  -----  ----------------  ---------
  (top)          #1     map_demo.spin2    -
    LED[0]       #2     demo_led.spin2    -
    LED[1]       #2     demo_led.spin2    -
    LED[2]       #2     demo_led.spin2    -
    LEFT         #3     demo_motor.spin2  -
      LEFT.LOG   #4     demo_buf.spin2    SIZE=4
    RIGHT        #3     demo_motor.spin2  -
      RIGHT.LOG  #4     demo_buf.spin2    SIZE=4
    TRACE        #5     demo_buf.spin2    SIZE=32

=== MEMORY LAYOUT ===

  Images
  Range          Size  Image  Source            Instances
  -------------  ----  -----  ----------------  ------------------
  $00000-$00071   114  #1     map_demo.spin2    (top)
  $00074-$00092    31  #2     demo_led.spin2    LED[0..2]
  $00094-$000B0    29  #3     demo_motor.spin2  LEFT,RIGHT
  $000B4-$000D7    36  #4     demo_buf.spin2    LEFT.LOG,RIGHT.LOG
  $000D8-$00118    65  #5     demo_buf.spin2    TRACE

  VAR blocks
  Range          Size  Image  Instance
  -------------  ----  -----  ---------
  $0011C-$00123     8  #1     (top)
  $00124-$0012B     8  #2     LED[0]
  $0012C-$00133     8  #2     LED[1]
  $00134-$0013B     8  #2     LED[2]
  $0013C-$00147    12  #3     LEFT
  $00148-$0014F     8  #4     LEFT.LOG
  $00150-$0015B    12  #3     RIGHT
  $0015C-$00163     8  #4     RIGHT.LOG
  $00164-$0016B     8  #5     TRACE

=== OBJECT DETAILS ===

--- #1 map_demo.spin2 ---

  Methods
  Name  Offset   Address
  ----  -------  -------
  MAIN  +$0004A  $0004A

  DAT
  Type  Name     Offset   Address
  ----  -------  -------  -------
  BYTE  VERSION  +$00038  $00038

  PASM labels
  Name   Cog   Offset   Address
  -----  ----  -------  -------
  BLINK  $000  +$0003A  $0003A

  Child slots
  Slot  Name    Image  VAR
  ----  ------  -----  -------
  0     LED[0]  #2     +$00008
  1     LED[1]  #2     +$00010
  2     LED[2]  #2     +$00018
  3     LEFT    #3     +$00020
  4     RIGHT   #3     +$00034
  5     TRACE   #5     +$00048

  VAR
  Instance  Type  Name   Size  Offset   Address
  --------  ----  -----  ----  -------  -------
  (top)     LONG  TICKS     4  +$00004  $00120

--- #2 demo_led.spin2 ---

  Methods
  Name    Offset   Address
  ------  -------  -------
  TOGGLE  +$00008  $0007C

  Inline PASM
  Name  Cog   Offset   Address
  ----  ----  -------  -------
  FLIP  $000  +$00016  $0008A

  VAR
  Instance  Type  Name   Size  Offset   Address
  --------  ----  -----  ----  -------  -------
  LED[0]    BYTE  STATE     1  +$00004  $00128
  LED[1]    BYTE  STATE     1  +$00004  $00130
  LED[2]    BYTE  STATE     1  +$00004  $00138

--- #3 demo_motor.spin2 ---

  Methods
  Name  Offset   Address
  ----  -------  -------
  GO    +$00010  $000A4

  Child slots
  Slot  Name  Image  VAR
  ----  ----  -----  -------
  0     LOG   #4     +$0000C

  VAR
  Instance  Type  Name   Size  Offset   Address
  --------  ----  -----  ----  -------  -------
  LEFT      LONG  SPEED     4  +$00004  $00140
  LEFT      WORD  LIMIT     2  +$00008  $00144
  RIGHT     LONG  SPEED     4  +$00004  $00154
  RIGHT     WORD  LIMIT     2  +$00008  $00158

--- #4 demo_buf.spin2 ---

  Methods
  Name  Offset   Address
  ----  -------  -------
  PUT   +$00010  $000C4

  DAT
  Type  Name    Offset   Address
  ----  ------  -------  -------
  BYTE  BUFFER  +$00008  $000BC
  LONG  TAIL    +$0000C  $000C0

  VAR
  Instance   Type  Name   Size  Offset   Address
  ---------  ----  -----  ----  -------  -------
  LEFT.LOG   LONG  COUNT     4  +$00004  $0014C
  RIGHT.LOG  LONG  COUNT     4  +$00004  $00160

--- #5 demo_buf.spin2 ---

  Methods
  Name  Offset   Address
  ----  -------  -------
  PUT   +$0002C  $00104

  DAT
  Type  Name    Offset   Address
  ----  ------  -------  -------
  BYTE  BUFFER  +$00008  $000E0
  LONG  TAIL    +$00028  $00100

  VAR
  Instance  Type  Name   Size  Offset   Address
  --------  ----  -----  ----  -------  -------
  TRACE     LONG  COUNT     4  +$00004  $00168

=== ADDRESS INDEX ===

  Address  Type    Owner      Name
  -------  ------  ---------  -------
  $00000   IMAGE   #1         (start)
  $00038   DAT     #1         VERSION
  $0003A   PASM    #1         BLINK
  $0004A   METHOD  #1         MAIN
  $00074   IMAGE   #2         (start)
  $0007C   METHOD  #2         TOGGLE
  $0008A   INLINE  #2         FLIP
  $00094   IMAGE   #3         (start)
  $000A4   METHOD  #3         GO
  $000B4   IMAGE   #4         (start)
  $000BC   DAT     #4         BUFFER
  $000C0   DAT     #4         TAIL
  $000C4   METHOD  #4         PUT
  $000D8   IMAGE   #5         (start)
  $000E0   DAT     #5         BUFFER
  $00100   DAT     #5         TAIL
  $00104   METHOD  #5         PUT
  $0011C   VAR     (top)      (start)
  $00120   VAR     (top)      TICKS
  $00124   VAR     LED[0]     (start)
  $00128   VAR     LED[0]     STATE
  $0012C   VAR     LED[1]     (start)
  $00130   VAR     LED[1]     STATE
  $00134   VAR     LED[2]     (start)
  $00138   VAR     LED[2]     STATE
  $0013C   VAR     LEFT       (start)
  $00140   VAR     LEFT       SPEED
  $00144   VAR     LEFT       LIMIT
  $00148   VAR     LEFT.LOG   (start)
  $0014C   VAR     LEFT.LOG   COUNT
  $00150   VAR     RIGHT      (start)
  $00154   VAR     RIGHT      SPEED
  $00158   VAR     RIGHT      LIMIT
  $0015C   VAR     RIGHT.LOG  (start)
  $00160   VAR     RIGHT.LOG  COUNT
  $00164   VAR     TRACE      (start)
  $00168   VAR     TRACE      COUNT

=== SYMBOL INDEX ===

  Symbol   Type    Owner      Address
  -------  ------  ---------  -------
  BLINK    PASM    #1         $0003A
  BUFFER   DAT     #4         $000BC
  BUFFER   DAT     #5         $000E0
  COUNT    VAR     LEFT.LOG   $0014C
  COUNT    VAR     RIGHT.LOG  $00160
  COUNT    VAR     TRACE      $00168
  FLIP     INLINE  #2         $0008A
  GO       METHOD  #3         $000A4
  LIMIT    VAR     LEFT       $00144
  LIMIT    VAR     RIGHT      $00158
  MAIN     METHOD  #1         $0004A
  PUT      METHOD  #4         $000C4
  PUT      METHOD  #5         $00104
  SPEED    VAR     LEFT       $00140
  SPEED    VAR     RIGHT      $00154
  STATE    VAR     LED[0]     $00128
  STATE    VAR     LED[1]     $00130
  STATE    VAR     LED[2]     $00138
  TAIL     DAT     #4         $000C0
  TAIL     DAT     #5         $00100
  TICKS    VAR     (top)      $00120
  TOGGLE   METHOD  #2         $0007C
  VERSION  DAT     #1         $00038

```

### Reading the example

- **Declarations to instances.** `map_demo.spin2` declares four objects and
  `demo_motor.spin2` one: 5 declarations. `led[3]` gives three instances, and
  `log` gives one under each of `LEFT` and `RIGHT`; with the top, 9 instances.
- **The array.** `LED[0..2]` run image `#2`, 31 bytes at `$00074`. Each element
  has its own 8-byte VAR block — the reserved long, then `STATE` at `+$00004` —
  at `$00124`, `$0012C` and `$00134`.
- **Identical copies.** `LEFT` and `RIGHT` share `#3`: `GO` has one address,
  `$000A4`. Their VAR blocks are 12 bytes: `SPEED` at `+$00004`, `LIMIT` at
  `+$00008`, 10 bytes padded to 12.
- **Nested VAR.** `#3`'s slot 0 holds `LOG` with VAR offset `+$0000C`, so
  `LEFT.LOG` starts at `$0013C` + `$C` = `$00148` and `RIGHT.LOG` at `$00150` +
  `$C` = `$0015C`. Both run `#4`.
- **The fork.** `TRACE` declares `SIZE = 32`; `LOG` declares `SIZE = 4`. The
  32-byte buffer moves `TAIL` and the method entry, so `demo_buf.spin2` is two
  images: `#4` (36 bytes, `TAIL` at `+$0000C`) and `#5` (65 bytes, `TAIL` at
  `+$00028`).
- **Shared DAT.** `BUFFER` and `TAIL` of `#4` exist once, at `$000BC` and
  `$000C0`: `LEFT.LOG` and `RIGHT.LOG` write the same buffer. `TRACE` has its
  own, in `#5`.
- **Labels.** `BLINK` was assembled at cog address `$000` and its bytes sit at
  `$0003A`, after the two `VERSION` bytes. `FLIP` is at cog `$000` in its inline
  block, and its instruction sits at `$0008A`, inside `TOGGLE`'s code.
- **Padding.** Image `#2` ends at `$00092` and `#3` starts at `$00094`: one
  byte of padding. The images and padding end at `$0011B`, so the first VAR
  block starts at `$0011C` — `Code/DAT bytes` 284.
- **Hub base.** The image starts `$01888` bytes into `map_demo.bin`, after the
  interpreter, so `MAIN` runs at hub `$0004A` + `$01888` = `$018D2`. A `-d`
  build of the same source prints a different hub base.

---

## Notes for parser authors

- Split table rows on runs of whitespace. Every row of a table has the same
  number of cells.
- Recognize a table by the section header or title line above it, not by
  column position.
- Skip the `Generated:` line when comparing maps.
- Add `Hub base` to a map address to get a hub address. Two maps of the same
  source built with and without `-d` differ in that line, and elsewhere too when
  the source contains `DEBUG` statements.
- Within one image's `OBJECT DETAILS`, a name can have several offsets and an
  offset several names; treat (kind, name, offset) as the row's identity.
- `(top)`, `(start)`, `(none)` and `-` are reserved literals. Instance names
  come from `OBJ` declarations and cannot collide with them.
- Expand `NAME[a..b]` in list cells to `NAME[a]` … `NAME[b]`. A run never
  appears outside a list cell.
- Decode `%XX` in `Source` cells and `OBJECT DETAILS` headings.
- `OBJECT TREE` and the VAR blocks table list the same instances in the same
  order.
- Checks a parser can make on any map:
  - every `Offset` plus its base equals its `Address` (image base for image
    rows, the instance's VAR block start for `VAR` rows);
  - images cover `$00000` to `Code/DAT bytes` with 0 to 3 bytes of padding
    after each;
  - VAR blocks are contiguous from `Code/DAT bytes` and total `VAR bytes`;
  - for every instance `P` and child slot `k`, the child's VAR block starts at
    `P`'s VAR block start plus slot `k`'s `VAR` offset;
  - an image's `Instances` list is exactly the tree rows naming that image.
