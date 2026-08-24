# PNut-TS `.map` File Format

## Overview

A `.map` file is the memory map PNut-TS writes alongside a compiled binary. It
describes where every object image landed in hub memory, which declaration in
the source put it there, and where every method, DAT datum, VAR and PASM label
within it resolved to.

This document is a format specification. It describes what the generator emits,
section by section, in enough detail to write a third-party parser against. The
authority throughout is `src/classes/mapGenerator.ts` and, for the instance
model, `src/classes/objInstanceInfo.ts` and
`Compiler.buildObjInstanceInfo()` (`src/classes/compiler.ts:961-1041`).

Described here as of v1.55.4.

## Requesting a map, and what it is called

`-m` / `--map` — "Generate memory map file (.map) from compilation"
(`src/pnut-ts.ts:167`), which sets `compileOptions.writeMapFile`
(`src/pnut-ts.ts:306-308`). Without it, `MapGenerator.generate()` returns
immediately (`src/classes/mapGenerator.ts:43-46`).

The name is derived, in two steps, from the source filename:

1. the listing filespec is the source with `.spin2` replaced by `.lst`
   (`src/pnut-ts.ts:570`);
2. the map filespec is that with `.lst` replaced by `.map`
   (`src/utils/outputFilespecs.ts:51`), assigned to `compileOptions.mapFilename`
   (`src/pnut-ts.ts:599`).

So `sgl_app_top.spin2` produces `sgl_app_top.map`, in the source's directory.
`-o` does **not** rename it: the output override applies only to the binary and
the flash-loader binary (`src/utils/outputFilespecs.ts:48-56`).

The file is assembled entirely in memory and written with a single
`fs.writeFileSync` (`src/classes/mapGenerator.ts:58-69`). A reader that opens
the file after the compile reports `Wrote <name>.map` sees a complete file, not
a partially flushed stream.

## Lexical conventions

- Every emitted line is terminated with a single `\n`
  (`writeLine`, `src/classes/mapGenerator.ts:984-986`). No `\r`.
- Sections after the header begin with a line of the form `=== SECTION NAME ===`
  followed by a blank line.
- Blank lines separate blocks; they are not significant beyond that.
- Addresses print as `$` followed by **five** uppercase hex digits, zero-padded
  (`hexAddr`, `:980-982`). Values wider than five digits are not truncated —
  the padding is a minimum.
- Rows are built with `padEnd`, so **trailing whitespace is normal**. A parser
  must not treat it as significant, and must not assume a row ends at its last
  visible character.
- Column widths are **auto-sized**, never fixed. Each table measures its own
  values and takes the widest, with a per-column minimum
  (`columnWidth`, `:738-740`). A parser must read the widths from the dashed
  rule line beneath the header, or split on runs of two-or-more spaces — never
  from hard-coded offsets.
- Symbol names are cleaned before printing: the name is split on `_$_`, the
  first part kept, and one trailing `_` removed (`cleanSymbolName`, `:896-903`).

## Section order

Seven emitters, in this fixed order (`src/classes/mapGenerator.ts:62-68`):

1. Header
2. `=== PROGRAM SUMMARY ===`
3. `=== OBJECT HIERARCHY ===`
4. `=== MEMORY LAYOUT ===`
5. `=== OBJECT DETAILS ===`
6. `=== ADDRESS INDEX ===`
7. `=== SYMBOL INDEX ===`

---

## The instance model

This is the part most likely to trip a parser author, so it comes before the
sections that depend on it.

**An object may be instantiated more than once.** A `.spin2` file declared twice
in one `OBJ` block, or declared by two different parents, is two — or five —
instances of one object.

**Instance identity is `(parent, position)`, not the object.** Each instance
gets its own id from `ObjInstanceStore.allocateInstanceId()`, and the store is
keyed by that id (`src/classes/objInstanceInfo.ts:156-168`). An
`ObjInstanceInfo` carries its declaring parent's instance id and its own
position in that parent's `OBJ` block
(`src/classes/objInstanceInfo.ts:27-51`). Keying by object instead would make
the second declaration silently overwrite the first.

The tree is recorded **during** compilation, at the moment the compiler descends
into a child — the only moment at which the declaring parent, the child's
position and the child's source file are all known
(`src/classes/compiler.ts:519-532`) — and turned into instances afterwards
(`buildObjInstanceInfo`, `src/classes/compiler.ts:961-1041`).

**Instance names are dotted access paths.** `instancePath()`
(`src/classes/mapGenerator.ts:706-720`) walks from the instance up to the top
object, unshifting each `instanceName`, and joins with `.`. So a child `leaf`
declared under a child `a` prints as `A.LEAF`. The top-level object's path is
the literal `(entry)`. The walk is bounded at 64 levels so a malformed parent
link cannot hang map generation.

The names themselves are the declared `OBJ` names, resolved from the parent's
`type_obj` symbol whose declaration position matches the child's
(`src/classes/compiler.ts:1007-1019`); when no such symbol is found the name
falls back to `child_<position>`. They print in the case the symbol table
holds, which is upper case.

That path is the name the reader already holds: it is what they wrote in their
own source (`a.leaf.val()`), so no translation is needed to connect a map row
back to the code.

### Row counts scale with instantiation, then collapse by region

`OBJECT DETAILS` emits **one block per instance**
(`src/classes/mapGenerator.ts:282`). An object used four times gets four blocks,
under four distinct headings.

`ADDRESS INDEX` and `SYMBOL INDEX` are also **built per instance** — the loops
iterate instances and read each one's symbols through its own source-file index
(`:472-502`, `:591-637`) — which is what makes every image's real entry points
reachable. But they then **collapse identical rows**:

- Address index groups on `(address, type, object, name)` (`:508-518`);
- Symbol index groups on `(name, object, type, location)` (`:642-652`).

When several instances share one compiled image — image dedup by content, the
diamond and DAT-singleton cases — they share every address in it, so those rows
would otherwise repeat one address several times and suggest several distinct
things.

So: row counts scale with the number of instantiations that produce **distinct
images**, not with the number of source files, and not with the raw instance
count.

### How a shared region is presented

A collapsed group is named by `summarizeInstances()`
(`src/classes/mapGenerator.ts:754-759`):

```ts
if (paths.length === 1) return paths[0];
const canonical = [...paths].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
return `${canonical}+${paths.length - 1}`;
```

The canonical name is the **shortest** path — the one nearest the top object,
and the one a reader is most likely to recognise — with ties broken
alphabetically. The suffix is the number of *other* instances sharing it. So
`SHARED+3` means "the instance reachable as `SHARED`, plus three more
instances at this same address".

There is deliberately **no space before the `+`**, so every column value remains
a single whitespace-delimited token and a script can still split a row on
whitespace.

`MEMORY LAYOUT` uses the same summary, computed over every instance pointing at
the region's distiller record (`instancePathsForRecord`, `:761-767`), and falls
back to `(entry)` when the summary is empty.

---

## Section 1: Header

`emitHeader`, `src/classes/mapGenerator.ts:81-93`.

```
================================================================================
PNut-TS Memory Map: <top-level source filename>
Spin2_v<language version>
Generated: <ISO 8601 timestamp>
================================================================================
<blank>
```

The rules are 80 `=` characters. The language version is the top file's
`versionNumber`. The timestamp is `new Date().toISOString()`.

`Generated:` is the one line two otherwise identical compiles differ on, which
is why `--cache-verify` filters it out before comparing maps
(`src/utils/cacheVerify.ts:38-45`). A tool diffing two maps should do the same.

## Section 2: `=== PROGRAM SUMMARY ===`

`emitProgramSummary`, `:99-123`.

```
=== PROGRAM SUMMARY ===
<blank>
  Total Size:    <total> bytes (<exec> code/data + <var> var bytes)
  Objects:       <count>
  Methods:       <count>
<blank>
```

- `<exec>` is the resolver's executable size, `<var>` its variable size, and
  `<total>` their sum.
- **`Objects:` counts distinct compiled images, not instances.** It is the
  distiller's record count (`:108`). An object instantiated four times
  contributes one.
- `Methods:` is the sum of `methodCount` over those same records
  (`:111-117`) — again per image, not per instance.

## Section 3: `=== OBJECT HIERARCHY ===`

`emitObjectHierarchy` / `emitHierarchyNode`, `:129-181`.

One line **per instance**, as an ASCII tree rooted at the top-level object.

```
=== OBJECT HIERARCHY ===
<blank>
  <top source base name>  (<info>)
      +-- <NAME> : <source base name>  (<info>)
      |   \-- <NAME> : <source base name>  (<info>)
      \-- <NAME> : <source base name>  (<info>)
<blank>
```

- The root line carries only the source base name (the file name with `.spin2`
  removed); every other line is `<instanceName> : <sourceBaseName>`
  (`:151-152`).
- Branch prefixes are `+-- ` for a non-final child and `\-- ` for the last
  (`:150`). The root has no prefix.
- The root is emitted at indent `"  "` (two spaces); its children at six; each
  further level adds four characters — `"    "` under a last child, `"|   "`
  otherwise (`:175`).
- `<info>` is a parenthesised, comma-separated list: the method count as
  `N methods`, followed by the instance's overrides when it has any
  (`:155-169`). It is omitted entirely, parentheses and all, when neither is
  available.
- The method count is **not** pluralised — a single-method object prints
  `(1 methods)`.
- Note the **two** spaces before the opening parenthesis.

## Section 4: `=== MEMORY LAYOUT ===`

`emitMemoryLayout`, `:187-269`.

One row **per memory region** — that is, per distiller record — in record
order, which is ascending address.

```
=== MEMORY LAYOUT ===
<blank>
  Start   End      Size  Object<pad>  Instance<pad>  Overrides
  ------  ------  -----  <dashes>  <dashes>  ---------
  $XXXXX  $XXXXX  <size>  <object><pad>  <instance><pad>  <overrides>
  ...
<blank>
    CODE/DATA TOTAL:  <exec> bytes
<blank>
  $XXXXX  $XXXXX  <size>  VAR SPACE<pad>  (runtime)<pad>
<blank>
    PROGRAM TOTAL:    <total> bytes
<blank>
```

Columns:

| Column | Meaning |
|---|---|
| `Start` | Hub address of the region's first byte — the record's object offset |
| `End` | Hub address of its last byte — start + size − 1 |
| `Size` | Region size in bytes, decimal, right-aligned in 5 |
| `Object` | Source base name of an instance occupying the region, or `Object_<recordIndex>` when no instance claims it |
| `Instance` | Every instance occupying the region, summarized (see above); `(entry)` when empty |
| `Overrides` | Constant overrides carried by that instance; empty for most rows |

Widths: `Object` and `Instance` are auto-sized with a minimum of 15
(`:207-216`). The measurement includes the literal `VAR SPACE` and `(runtime)`
of the VAR row, so those never overflow. `Start` and `End` are always six
characters (`$` + five hex digits); `Size` is `padStart(5)`.

The fallback object name is deliberately `Object_<n>` and not a guessed source
file: a record no instance claims genuinely has no known source file, and
saying so is better than looking one up in a different index space
(`getObjectNameByIndex`, `:860-862`).

Instances sharing a region always carry the same overrides — a difference in
overrides produces different bytes, which is precisely what stops two images
being merged into one region (`:230-234`).

The two total lines are indented four spaces and their numbers are
`padStart(6)`. The `VAR SPACE` row runs from the end of the executable image
for `varSize` bytes, and — unlike every other row — has **no Overrides field at
all**; the line ends after the padded `(runtime)` (`:262`). The whole VAR block,
including `PROGRAM TOTAL`, is omitted when the program has no VAR space
(`:256`).

## Section 5: `=== OBJECT DETAILS ===`

`emitObjectDetails`, `:275-432`.

One block **per instance**, in instance-id order — which is declaration order,
depth-first. An instance whose distiller record cannot be found is skipped
(`:283-284`).

```
--- <display name> ---
    Location: $XXXXX-$XXXXX (<N> bytes)
    VAR Base: $XXXXX
    Source:   <source file name>
    Overrides: <overrides>            (only when the instance has any)

    Methods:
      <NAME>                Entry +$XXXXX  ($XXXXX)

    DAT:
      <TYPE>    <NAME>                +$XXXXX  ($XXXXX)

    PASM Labels:
      <NAME>                COG $XXX  HUB $XXXXX

    VAR:
      <TYPE>    <NAME>                +$XXXX  ($XXXXX)

    Inline PASM:
      <NAME>                +$XXX  ($XXXXX)

    Child Objects:
      <NAME> : <source base name> (<N> bytes) | <overrides>
<blank>
```

The display name is the source base name for the top-level object, and
`<instance path> : <source base name>` for everything else (`:289-290`). This is
what makes two children both named `leaf` distinguishable here — before access
paths, they produced two blocks under one identical heading.

`Location` is the region the instance occupies, from its distiller record.
`VAR Base` is that instance's own VAR base — direct children of the top read it
from the top object's header, deeper instances are computed by accumulating
preceding VAR sizes (`getVarBaseForInstance`, `:769-836`). Two instances of one
object share a code region but have **different** VAR bases.

`Source` is the full source file name, with extension — the only place in the
map that prints it.

Each of the six sub-blocks is preceded by a blank line and is emitted only when
it has at least one entry. They always appear in the order listed above.

### Method entries

```
      MAIN                  Entry +$00028  ($00028)
```

The name is `padEnd(20)`, followed by two spaces, `Entry `, the offset within
the object, two spaces, and the absolute hub address in parentheses
(`:318-329`).

**Both numbers are real bytecode addresses, not header slot indices.** A
`PUB`/`PRI` symbol does not carry an address at all: its low bits hold the
method's **slot index** in the object's header table, and a child object
occupies two slots there while a method occupies one — which is why a top
object with three children numbers its first method 6, not 3. `methodAddress()`
(`:966-978`) reads the slot itself:

```ts
const slotAddr = objectBase + IMAGE_HEADER_BYTES + slotIndex * 4;
const entry = this.resolver.objectImage.readLong(slotAddr);
if ((entry & 0x80000000) === 0) return undefined;
return objectBase + (entry & 0xfffff);
```

`IMAGE_HEADER_BYTES` is 8 (`:28`). Bit 31 set is what marks a slot as a method
entry; a child-object entry and the end marker both leave it clear. When it is
clear, no address is printed and the line reads:

```
      <NAME>                Entry (unresolved)
```

The offset shown after `+$` is the absolute address minus the object's start,
so it is genuinely an offset within this object image and is identical across
every instance of that object.

### DAT, PASM, VAR and Inline PASM entries

DAT symbols are those of a DAT type whose value has `0xFFF` in bits 31:20 — hub
mode (`:334-339`). The same types with any other high bits are cog-mode PASM
labels (`:357-362`), split further by `isInline`.

| Sub-block | Line shape |
|---|---|
| `DAT:` | `<type padEnd(8)>  <name padEnd(20)>  +$XXXXX  ($XXXXX)` — offset within the object (value bits 19:0), then absolute hub address |
| `PASM Labels:` | `<name padEnd(20)>  COG $XXX  HUB $XXXXX` — cog register address (3 hex digits) and its hub address, `objectStart + cogAddr * 4` |
| `VAR:` | `<type padEnd(8)>  <name padEnd(20)>  +$XXXX  ($XXXXX)` — note **four** hex digits for the offset; the absolute address is `varBase + offset` |
| `Inline PASM:` | `<name padEnd(20)>  +$XXX  ($XXXXX)` — cog address, then hub address |

DAT type strings are `BYTE`, `WORD`, `LONG`, `STRUCT`, `LONG_RES`, `UNKNOWN`
(`:879-894`). VAR type strings are `BYTE`, `WORD`, `LONG`, `STRUCT`,
`BYTE_PTR`, `WORD_PTR`, `LONG_PTR`, `STRUCT_PTR`, `UNKNOWN` (`:923-944`).

### Child objects

```
      SHARED : sgl_shared_state (85 bytes)
      CHILD2 : param_child (25 bytes) | DEFAULT_VALUE=20
```

One line per child instance of this instance, in declaration order: the child's
declared name, its source base name, its size in bytes from its own distiller
record, and — only when it has overrides — ` | ` followed by them (`:422-427`).
The size is omitted when the child's record cannot be found.

## Overrides: source form and printed form

An `OBJ` declaration can override the child's constants:

```spin2
  child2 : "param_child" | DEFAULT_VALUE = 20
  child3 : "param_child" | DEFAULT_VALUE = 30, MULTIPLIER = 5
```

`formatOverrides()` (`src/classes/objInstanceInfo.ts:135-145`) renders each as
`NAME=VALUE` — **no spaces around the `=`**, regardless of how the source was
spaced — and joins several with `, `. So the declarations above print as
`DEFAULT_VALUE=20` and `DEFAULT_VALUE=30, MULTIPLIER=5`.

They appear in four places, each with its own framing:

| Section | Framing |
|---|---|
| `OBJECT HIERARCHY` | inside the info parenthesis, after the method count: `  (2 methods, DEFAULT_VALUE=20)` |
| `MEMORY LAYOUT` | bare, in the `Overrides` column |
| `OBJECT DETAILS`, on the instance itself | `    Overrides: DEFAULT_VALUE=20` |
| `OBJECT DETAILS`, in the parent's `Child Objects` list | appended as ` \| DEFAULT_VALUE=20` |

The last of these is the one that echoes the source syntax most closely, and it
is the only place a `|` appears in the format.

Values are printed as recorded. Float-typed overrides are flagged internally
(`isFloat`) but that flag does not change how the value prints.

## Section 6: `=== ADDRESS INDEX ===`

`emitAddressIndex`, `:456-552`.

Reverse lookup: the reader arrives holding a hub address — from a crash, a
debugger, a disassembly — and asks what is there.

```
=== ADDRESS INDEX ===
<blank>
  Address  Type      Instance<pad>  Object<pad>  Name
  -------  --------  <dashes>  <dashes>  ---------------
   $XXXXX  <TYPE>    <instance><pad>  <object><pad>  <name>
  ...
<blank>
  Entries: <N>
<blank>
```

| Column | Meaning |
|---|---|
| `Address` | Absolute hub address, `('$' + 5 hex).padStart(7)` |
| `Type` | `CODE` or `METHOD`, `padEnd(8)` |
| `Instance` | Instance access path, or a summarized group |
| `Object` | Source base name of the object |
| `Name` | `(entry)` for the top object's CODE row, `(object)` for any other CODE row, otherwise the method name |

**Every number in this section is an absolute hub address.** Method rows carry
the resolved bytecode address from `methodAddress()`, never the entry index; a
method whose slot does not resolve contributes no row at all (`:490-499`).

Rows are generated per instance — one `CODE` row at the instance's region base,
then one `METHOD` row per method symbol — then collapsed on
`(address, type, object, name)` with the surviving row's `Instance` summarized.

Sort order is address ascending, ties broken by type, then instance, then name
(`:528-530`), so two runs over the same source produce the same file.

`Instance` and `Object` widths are auto-sized with a minimum of 15
(`:532-539`). The `Entries:` count is the number of rows **after** collapsing.

When there is nothing to list, the whole table is replaced by the single line
`  No addressable symbols.` (`:520-524`).

## Section 7: `=== SYMBOL INDEX ===`

`emitSymbolIndex`, `:573-689`.

Forward lookup: the reader holds a name and asks where it is.

```
=== SYMBOL INDEX ===
<blank>
  Symbol<pad>  Object<pad>  Instance<pad>  Type      Location
  <dashes>  <dashes>  <dashes>  --------  ----------
  <name><pad>  <object><pad>  <instance><pad>  <TYPE>    <location>
  ...
<blank>
  Symbols: <N>
<blank>
```

| Column | Meaning |
|---|---|
| `Symbol` | Cleaned symbol name; width auto-sized, minimum 20 |
| `Object` | Source base name; minimum 15 |
| `Instance` | Instance access path or summarized group; minimum 15 |
| `Type` | One of `METHOD`, `VAR`, `DAT`, `PASM`, `INLINE`, `padEnd(8)` |
| `Location` | Type-dependent, see below |

Location forms (`:604-630`):

| Type | Location |
|---|---|
| `METHOD` | `$XXXXX`, the resolved bytecode address; `(unresolved)` when the slot is not a method entry |
| `VAR` | `$XXXXX`, `varBase + offset` |
| `DAT` | `$XXXXX`, `codeBase + offset` |
| `PASM` | `COG $XXX  HUB $XXXXX` — two spaces between the halves |
| `INLINE` | `+$XXX  ($XXXXX)` |

Symbols of no recognised type contribute no row (`:633`).

Like the address index, entries are built per instance and then collapsed — here
on `(name, object, type, location)`. Where one object is used more than once and
the images did **not** merge, a name legitimately has several addresses, and each
survives as its own row labelled with its own instance.

Sort order is name, then address, then instance (`:662`). A name that exists at
several addresses therefore lands on adjacent rows, in memory order. Because
the primary key is the name and not the address, two different symbols with the
same name — one per object — appear next to each other, distinguished by their
`Object` and `Instance` columns.

The `Symbols:` count is the number of rows after collapsing. An empty index is
replaced by `  No symbols.` (`:654-658`).

---

## Worked example

Compiled from the cache fixture family, copied into a scratch directory:

```
node /workspaces/PNut-TS/dist/pnut-ts.js -m sgl_app_top.spin2
```

`sgl_app_top.spin2` declares four children — `shared`, `log`, `log2`, `cfg` —
where `log` and `log2` are two instances of the same object, and where
`sgl_shared_state` is reached four ways: directly from the top, and again
beneath each of `log`, `log2` and `cfg`. Six source files; thirteen instances.

### Summary and hierarchy

```
=== PROGRAM SUMMARY ===

  Total Size:    412 bytes (356 code/data + 56 var bytes)
  Objects:       6
  Methods:       13

=== OBJECT HIERARCHY ===

  sgl_app_top  (1 methods)
      +-- SHARED : sgl_shared_state  (3 methods)
      |   \-- TICK : sgl_tick_leaf  (1 methods)
      +-- LOG : sgl_svc_logger  (3 methods)
      |   +-- SHARED : sgl_shared_state  (3 methods)
      |   |   \-- TICK : sgl_tick_leaf  (1 methods)
      |   \-- FMT : sgl_fmt_util  (2 methods)
      +-- LOG2 : sgl_svc_logger  (3 methods)
      |   +-- SHARED : sgl_shared_state  (3 methods)
      |   |   \-- TICK : sgl_tick_leaf  (1 methods)
      |   \-- FMT : sgl_fmt_util  (2 methods)
      \-- CFG : sgl_svc_config  (3 methods)
          \-- SHARED : sgl_shared_state  (3 methods)
              \-- TICK : sgl_tick_leaf  (1 methods)
```

Thirteen lines, one per instance. `Objects: 6` counts images, not those lines.

### Memory layout

```
  Start   End      Size  Object            Instance         Overrides
  ------  ------  -----  ----------------  ---------------  ---------
  $00000  $0005C     93  sgl_app_top       (entry)          
  $00060  $00098     57  sgl_svc_logger    LOG+1            
  $0009C  $000BF     36  sgl_fmt_util      LOG.FMT+1        
  $000C0  $000FB     60  sgl_svc_config    CFG              
  $000FC  $00150     85  sgl_shared_state  SHARED+3         
  $00154  $00161     14  sgl_tick_leaf     SHARED.TICK+3    
```

Six regions for thirteen instances. `LOG+1` is the region shared by `LOG` and
one other (`LOG2`); `SHARED+3` is shared by `SHARED` and three others
(`LOG.SHARED`, `LOG2.SHARED`, `CFG.SHARED`). The `Object` column is 16 wide
here — `sgl_shared_state` is longer than the 15-character minimum — which is
exactly why widths must be read rather than assumed.

### Object details

Three of the thirteen blocks, showing repeated instantiation and dotted paths:

```
--- SHARED : sgl_shared_state ---
    Location: $000FC-$00150 (85 bytes)
    VAR Base: $00168
    Source:   sgl_shared_state.spin2

    Methods:
      INIT                  Entry +$00020  ($0011C)
      BUMP                  Entry +$00033  ($0012F)
      COUNT                 Entry +$0004F  ($0014B)

    DAT:
      LONG      STATE_LOCK            +$00018  ($00114)
      LONG      STATE_COUNTER         +$0001C  ($00118)

    Child Objects:
      TICK : sgl_tick_leaf (14 bytes)
```

```
--- LOG2 : sgl_svc_logger ---
    Location: $00060-$00098 (57 bytes)
    VAR Base: $00180
    Source:   sgl_svc_logger.spin2

    Methods:
      START                 Entry +$00020  ($00080)
      LOG_TICK              Entry +$00027  ($00087)
      TRACE                 Entry +$00032  ($00092)

    Child Objects:
      SHARED : sgl_shared_state (85 bytes)
      FMT : sgl_fmt_util (36 bytes)
```

```
--- LOG2.SHARED.TICK : sgl_tick_leaf ---
    Location: $00154-$00161 (14 bytes)
    VAR Base: $00188
    Source:   sgl_tick_leaf.spin2

    Methods:
      ADVANCE               Entry +$00008  ($0015C)
```

`LOG` and `LOG2` share one code region — both report
`Location: $00060-$00098` — while holding different VAR bases, `$00170` and
`$00180`. The three-level path `LOG2.SHARED.TICK` names the leaf reached
through `LOG2`, distinct from `SHARED.TICK` and `CFG.SHARED.TICK` even though
all three are the same fourteen bytes.

### Address index

```
  Address  Type      Instance         Object            Name
  -------  --------  ---------------  ----------------  ---------------
   $00000  CODE      (entry)          sgl_app_top       (entry)
   $00028  METHOD    (entry)          sgl_app_top       MAIN
   $00060  CODE      LOG+1            sgl_svc_logger    (object)
   $00080  METHOD    LOG+1            sgl_svc_logger    START
   $00087  METHOD    LOG+1            sgl_svc_logger    LOG_TICK
   $00092  METHOD    LOG+1            sgl_svc_logger    TRACE
   $0009C  CODE      LOG.FMT+1        sgl_fmt_util      (object)
   $000A8  METHOD    LOG.FMT+1        sgl_fmt_util      WIDTH
   $000B8  METHOD    LOG.FMT+1        sgl_fmt_util      TRACE_TAG
   $000C0  CODE      CFG              sgl_svc_config    (object)
   ...
   $00154  CODE      SHARED.TICK+3    sgl_tick_leaf     (object)
   $0015C  METHOD    SHARED.TICK+3    sgl_tick_leaf     ADVANCE

  Entries: 19
```

Nineteen rows for thirteen instances: the per-instance rows collapsed wherever
instances share an image.

### Symbol index

```
  Symbol                Object            Instance         Type      Location
  --------------------  ----------------  ---------------  --------  ----------
  ADVANCE               sgl_tick_leaf     SHARED.TICK+3    METHOD    $0015C
  BUMP                  sgl_shared_state  SHARED+3         METHOD    $0012F
  CFGBLOB               sgl_svc_config    CFG              DAT       $000D8
  COUNT                 sgl_shared_state  SHARED+3         METHOD    $0014B
  ...
  START                 sgl_svc_logger    LOG+1            METHOD    $00080
  START                 sgl_svc_config    CFG              METHOD    $000E8
  STATE_COUNTER         sgl_shared_state  SHARED+3         DAT       $00118
  STATE_LOCK            sgl_shared_state  SHARED+3         DAT       $00114

  Symbols: 16
```

`START` appears twice — two different objects, two different addresses,
adjacent because the primary sort key is the name. `STATE_LOCK` and
`STATE_COUNTER` each appear **once** despite four instances declaring the
object: the four instances share one image, so the DAT singleton is one datum
at one address, and the `+3` suffix on the instance says so.

### A layout row with overrides

From a separate fixture whose top level declares one object three times with
different constants (`TEST/MAP-tests/test4-override/override_top.spin2`),
compiled the same way:

```
  Start   End      Size  Object           Instance         Overrides
  ------  ------  -----  ---------------  ---------------  ---------
  $00000  $0003A     59  override_top     (entry)          
  $0003C  $00054     25  param_child      CHILD1           
  $00058  $00070     25  param_child      CHILD2           DEFAULT_VALUE=20
  $00074  $0008C     25  param_child      CHILD3           DEFAULT_VALUE=30, MULTIPLIER=5
```

Three regions for three instances of one object: the overrides produce different
bytes, so the images do not merge and nothing collapses. The corresponding
`Child Objects` lines in the top object's detail block carry the same values
after a pipe:

```
    Child Objects:
      CHILD1 : param_child (25 bytes)
      CHILD2 : param_child (25 bytes) | DEFAULT_VALUE=20
      CHILD3 : param_child (25 bytes) | DEFAULT_VALUE=30, MULTIPLIER=5
```

---

## Notes for parser authors

- Split rows on runs of two or more spaces, or derive fixed offsets from the
  dashed rule line. Do not hard-code column positions.
- Strip trailing whitespace from every field and from the row.
- Treat `(entry)`, `(object)`, `(runtime)`, `(unresolved)` and `Object_<n>` as
  reserved literals, not as names.
- An instance label ending in `+<digits>` is a collapsed group, not an instance
  named with a `+`. Instance names come from `OBJ` declarations and cannot
  contain `+`.
- `Objects:` in the summary will not match the number of hierarchy lines, the
  number of `--- ... ---` blocks, or the number of memory-layout rows whenever
  any object is instantiated more than once. All four counts are correct; they
  count different things.
- Ignore the `Generated:` line when comparing two maps.
