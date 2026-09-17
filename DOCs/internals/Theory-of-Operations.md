# PNut-TS Compiler Theory of Operations

## Overview

This document describes the complete theory of operations for the PNut-TS SPIN2/PASM2 compiler, detailing how it processes a tree of source files and generates the final binary output. The compiler follows a multi-phase approach to handle object dependencies and create P2-compatible binaries.

## Architecture Overview

The PNut-TS compiler is designed as a recursive, multi-pass compiler that:

1. **Processes Object Trees**: `Compiler.compileRecursively()`, detailed in Phase 3
2. **Two-Pass Compilation**: `SpinResolver.compile1()`/`.compile2()`, detailed in Phase 4
3. **Unified Binary Output**: `Spin2Parser.ComposeRam()`/`writeBinaryFile()`, detailed in Phase 6
4. **Cross-Platform Compatibility**: the parity claim underlying every source-cited claim in
   this document — PNut Pascal/x86 routines in `REF-V52A/` are named alongside their
   PNut-TS counterpart throughout

## Compilation Flow Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Source Files   │───▶│   Preprocessor  │───▶│   Compilation   │
│  (.spin2)       │    │   Integration   │    │     Engine      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             ▼
│  Binary Output  │◀───│  Final Assembly │    ┌─────────────────┐
│  (.bin/.lst)    │    │   & Generation  │◀───│ Object Tree     │
└─────────────────┘    └─────────────────┘    │ Processing      │
                                              └─────────────────┘
```

## Phase 1: Entry Point and Initialization

### Command Line Processing (`src/pnut-ts.ts`)
The compilation begins with command-line argument processing:

1. **File Validation**: `PNutInJS.runCompile()` requires exactly one `.spin2`
   filename; if more than one bare `.spin2` argument is present it errors
   "Compiling more than one .spin2 files at a time, not supported!" and exits
   1 (a `.spin` argument embedded in `this.program.args` is also accepted, to
   tolerate a leading empty argument some shells pass)
2. **Option Processing**: Commander options defined in `runCompile()` set the
   fields on `Context.compileOptions` / `Context.logOptions` /
   `Context.preProcessorOptions` (`src/utils/context.ts`) that later phases
   read — e.g. `-l`/`--list` sets `compileOptions.writeListing`, `-d`/`--debug`
   sets `compileOptions.enableDebug`, `-v`/`--verbose` sets `logOptions`
3. **Context Setup**: Initializes the compilation context (`Context` class,
   `src/utils/context.ts`) with:
   - Output file specifications (.bin, .lst, .obj, .map, .flash) — derived by
     `outputFilespecs()` (`src/utils/outputFilespecs.ts`)
   - Logging and debug options (`Context.logOptions`)
   - Preprocessor symbol definitions (-D flags) and undefines (-U flags) —
     `Context.preProcessorOptions.defSymbols` / `.undefSymbols`, validated by
     `validatedPreprocessorSymbolName()` in `src/pnut-ts.ts`
   - Include folder paths (-I flags) — `Context.preProcessorOptions.includeFolders`
   - Object cache settings (`-C`/`--cache`, `--cache-dir`, `--cache-clear`,
     `--cache-verify`) — see
     [Object-Cache-Theory-of-Operations.md](Object-Cache-Theory-of-Operations.md)

Argument parsing goes through Commander (`PNutInJS.run()` in `src/pnut-ts.ts`).
An in-process caller (one that hands `PNutInJS` its own argument array, as the
test suite does) is parsed on exactly that array — never spliced together with
the host process's own `process.argv`. An earlier version fed `process.argv`
to Commander whenever the caller supplied no arguments of its own, so a host
process's own flags (a Jest `--coverage` flag, for example) reached the parser
alongside the intended arguments. An unrecognized option now aborts the run
(`CommanderError` other than `commander.version` / `commander.help` /
`commander.helpDisplayed` returns exit code 1, and `--help`/`--version` return
0) instead of printing "unknown option" and compiling anyway.

### Compiler Initialization (`src/classes/compiler.ts`)
The `Compiler` class constructor (`src/classes/compiler.ts`) sets up:

1. **Component Initialization**:
   - `Spin2Parser` (`this.spin2Parser = new Spin2Parser(ctx)`): parsing and
     code generation, itself owning a `SpinResolver`
   - `ObjectImage` (`this.objImage`, taken from `ctx.compileData.objImage`):
     binary image accumulator (pascal `P2.Obj`, per the field's own comment)
   - `ChildObjectsImage`: `this.objectData`/`this.datFileData` (also taken
     from `ctx.compileData`) plus a freshly allocated `this.childImages`

2. **Global Data Structures**: fields the constructor takes from
   `ctx.compileData` (so every object compiled in this run shares them):
   - `this.objectData` (`ChildObjectsImage`): child object binaries (pascal
     `P2.ObjData`)
   - `this.datFileData` (`ChildObjectsImage`): DAT-embedded binary includes
     (pascal `P2.DatData`)
   - `this.spinFiles` (`SpinFiles`, `src/classes/spinFiles.ts`): source file
     registry
   - Symbol tables (`SpinResolver.mainSymbols` / `.localSymbols` /
     `.inlineSymbols`, `src/classes/spinResolver.ts`) are owned by
     `SpinResolver`, not `Compiler`, and are reset per-object at the start of
     `compile1()`

## Phase 2: File Loading and Preprocessing

### Document Loading (`src/classes/spinDocument.ts`)
Each SPIN2 file is loaded and preprocessed by `SpinDocument`:

#### 2.1 File Reading and Line-Ending Normalization
- **Encoding Detection** (`loadFileAsString()`, `src/utils/files.ts`): reads
  as UTF-8 first; if the result contains the UTF-8 replacement character
  (`�`) it re-reads as `latin1`; if it still contains a NUL or `0xC0`
  byte it re-reads as `utf16le`
- **Line-Ending Processing** (`SpinDocument` constructor,
  `src/classes/spinDocument.ts`): detects CRLF, LF-only or CR-only from the
  raw file content and splits on whichever was found, recording the result in
  `eolType`
- **Character Validation**: not part of file loading — an unrecognized
  character is caught later, per element, during tokenization
  (`SpinElementizer`, `src/classes/spinElementizer.ts`, "Unrecognized
  character" error), not while the file is first read

#### 2.2 Preprocessor Directives Processing
The integrated preprocessor handles:

**Conditional Compilation**:
```spin2
#ifdef SYMBOL
    ' Code included if SYMBOL is defined
#ifndef OTHERSYMBOL
    ' Code included if OTHERSYMBOL is NOT defined
#elseifdef NEWSYMBOL
    ' Alternative condition
#else
    ' Default case
#endif
```

**Symbol Definition**:
```spin2
#define SYMBOL value        ' Define preprocessor symbol
#undef SYMBOL              ' Remove symbol definition
```

**File Inclusion**:
```spin2
#include "otherfile.spin2"  ' Include another SPIN2 file
```

**Error and Warning Generation**:
```spin2
#warn "This is a warning message"
#error "This causes compilation to fail"
```

#### 2.3 Preprocessor Diagnostics

Diagnostics are **emitted at the point of detection**, straight to stderr, in
source order:

```
<filespec>:<line>:error:<message>
<filespec>:<line>:warning:<message>
```

A fatal diagnostic does not abandon the pass. It sets a per-document flag and
preprocessing continues, so every preprocessor error in a file is reported from
a single build rather than one per attempt. At the end of the pass, a document
that recorded a fatal throws `PreprocessorError` — before any output file is
written, and before the compiler proper is reached.

`PreprocessorError` is a distinct type rather than a plain `Error` because its
diagnostics have **already been reported** by the time it propagates. The
top-level handler in `pnut-ts.ts` therefore stays silent for it, and
`compiler.ts` re-throws it ahead of the code that dresses an exception up as a
compiler error — without that, a fatal inside a child object would be printed
twice, the second time naming the wrong file.

`#error` is the one directive that throws immediately instead of deferring to
the end of the pass, since an author-placed `#error` means "stop here."

An earlier design accumulated diagnostics in a per-document array and printed
them only when a debug logging flag was set. The array had no other reader, so
in normal operation preprocessor diagnostics were invisible and affected neither
the exit code nor artifact production — a source with a broken conditional nest
did not fail to build, it built successfully from the wrong lines. That model
has been removed.

#### 2.4 Preprocessor Integration Features
- **Command-Line Defines**: `-D`/`-U` populate
  `Context.preProcessorOptions.defSymbols`/`.undefSymbols`, which
  `SpinDocument` reads when preloading its symbol table
- **Nested Conditionals**: `SpinDocument.preProcNestingState` (a stack pushed
  in and popped from as each `#ifdef`/`#ifndef`/`#elseifdef`/`#elseifndef`
  level opens and closes) tracks nesting depth and each level's
  currently-emitting state
- **Include Path Resolution**: `#include "name"` is resolved by
  `locateIncludeFile()` (called from `SpinDocument`'s `#include` handling)
  against the folders in `SpinDocument.incFolders`, which are seeded from
  `-I` via `setIncludePath()`
- **Symbol Export**: `#pragma EXPORTDEF symbol` (`SpinDocument`, the `command
  == 'EXPORTDEF'` branch) pushes the symbol into
  `Context.preProcessorOptions.defSymbols` so a later file in the same
  compile sees it as if `-D`'d
- **Version Requirements**: a `{Spin2_v43}`-style header comment is parsed by
  `SpinDocument.getVersionFromHeader()` against `legalVersions`; an
  unrecognized or unsupported version is a fatal diagnostic

#### 2.5 Comment Processing
All three forms are recognized by `SpinElementizer`
(`src/classes/spinElementizer.ts`), not by `SpinDocument` — comment removal
happens during elementization (Phase 4), not the preprocessing pass this
section otherwise describes:
- **Documentation Comments**: a line starting with `{{` opens a doc comment,
  skipped through to its closing `}}` (`SpinElementizer`, the `{{` handling in
  its line-continuation/comment logic)
- **Line Comments**: a `'` (tic) starts a line comment that consumes the rest
  of the line (`SpinElementizer`, its tic-comment handling)
- **Block Comments**: a line starting with a single `{` opens a non-doc
  comment; `SpinElementizer` tracks brace nesting depth so an embedded `{`
  inside the comment does not close it early, and throws `"}" must be
  preceeded by "{" to form a comment` on a stray closer

## Phase 3: Object Tree Discovery and Recursive Compilation

### 3.1 Initial Parsing (`compileRecursively()`)
The compiler uses a recursive descent approach:

1. **Top-Level File Processing**: `compileRecursively(0, topSrcFile)` is the
   initial call, made with `depth == 0`
2. **OBJ Section Discovery**: `compile_obj_blocks_id()`, detailed in 3.2 below
3. **Dependency Resolution**: `compileRecursively(depth + 1, childSrcFile, ...)`
   recurses into each child before the parent's own Pass 2 runs (detailed in 3.3)
4. **Circular Reference Detection**: Prevents infinite recursion (`OBJ_STACK_LIMIT` in `src/classes/compiler.ts` is currently 16; exceeding it throws "Object nesting exceeds 16 levels - illegal circular reference may exist")

### 3.2 Object Dependency Analysis (`compile_obj_blocks_id()`)
For each source file, the compiler:

1. **Scans OBJ Sections**: Identifies object declarations like:
   ```spin2
   OBJ
       serial : "jm_serial"
       sensor : "temp_sensor"
       display[4] : "seven_segment"
   ```

2. **File Resolution**: `SpinFiles.addObjFile()` (`src/classes/spinFiles.ts`)
   registers each `OBJ` filename the first time it is seen and returns its
   `ObjFile` record
3. **Instance Tracking**: an `OBJ name[N] : "file"` array declaration is
   parsed and range-checked (1-255, "Object count must be from 1 to 255")
   right here in `compile_obj_blocks_id()`, which also enforces
   `objs_limit` ("Limit of N OBJ instances exceeded") across all instances of
   all objects
4. **Parameter Passing**: compile-time CON overrides written after an OBJ
   declaration are collected as a `SymbolTable` and passed down through
   `Compiler.compileRecursively()`'s `overrideParameters` parameter to the
   child's `compile1()`/`compile2()`

### 3.3 Recursive Compilation Process
```
For each source file:
├── Load and preprocess source
├── Parse OBJ sections → Identify dependencies
├── For each child object:
│   ├── If the object cache is enabled (-C):
│   │   ├── Compute the child's cache key
│   │   ├── Re-validate the .dep dependency manifest
│   │   │   (re-read and re-hash every source in the child's
│   │   │    whole subtree; any mismatch is treated as a MISS)
│   │   └── On HIT: replay the cached sidecars and DO NOT recurse
│   ├── On MISS: recursively compile child (depth + 1)
│   ├── Generate child's .obj file
│   └── Record child object metadata
├── Perform Pass 1: Symbol discovery
├── Load child .obj files into memory
├── Perform Pass 2: Code generation
└── Generate final object binary
```

**A cache hit prunes the recursion.** That is the point of the cache and it is
also its central hazard: a child served from the cache is never visited, so its
own children are never reached and their keys are never computed. This is why
each entry carries a manifest covering its *entire subtree* and why that manifest
is re-validated at the moment of the hit — validating there is what makes a
pruned subtree safe to skip. The mechanism is described in full in
[Object-Cache-Theory-of-Operations.md](Object-Cache-Theory-of-Operations.md).

## Phase 4: Two-Pass Compilation System

### 4.1 Pass 1: Symbol Discovery and Element Generation (`P2Compile1()`)

`P2Compile1()` calls `SpinResolver.compile1()`, which runs only
`compile_con_blocks_1st()`, `compile_obj_blocks_id()` and
`compile_dat_blocks_fn()` — CON constants, OBJ identifiers and `DAT ... FILE`
embedded-binary registration. PUB/PRI method signature collection
(`compile_sub_blocks_id()`) and VAR-block sizing (`compile_var_blocks()`) do
not run until Pass 2 (`compile2()`, see 4.2) — despite this section's title,
they are not part of `P2Compile1()`.

**Elementization Process**:
1. **Lexical Analysis**: `SpinElementizer` (`src/classes/spinElementizer.ts`)
   turns source text into `SpinElement` tokens; both passes read from the
   same element stream, produced once
2. **Symbol Table Population**: `compile_con_blocks_1st()` records CON symbols
   into `SpinResolver.mainSymbols` before anything else runs
3. **Object Structure Analysis**: `compile_obj_blocks_id()` records each OBJ
   declaration's filename, instance count and array-ness (see 3.2)
4. **DAT File Registration**: `compile_dat_blocks_fn()` scans every `DAT`
   block for `FILE "name"` statements and registers each embedded binary
   with `SpinFiles.addDataFile()`

**Element Types Identified** (block keywords recognized by
`SpinResolver.nextBlock()`/the per-block `compile_*` methods):
- Constants (CON section integers, floats, structures) — `compile_con_blocks()`
- Variables (VAR section bytes, words, longs, structures) — `compile_var_blocks()`
  (Pass 2 only)
- Methods (PUB and PRI declarations) — `compile_sub_blocks_id()` (signatures,
  Pass 2) / `compile_sub_blocks()` (bodies, Pass 2)
- Object references (OBJ section instances) — `compile_obj_blocks_id()` (Pass
  1, IDs only) / `compile_obj_blocks()` (Pass 2, full compile/integration)
- Data declarations (DAT section data and code) — `compile_dat_blocks()`
  (Pass 2; `compile_dat_blocks_fn()` in Pass 1 only finds `FILE` statements)

### 4.2 Pass 2: Code Generation and Resolution (`P2Compile2()`)

**Symbol Resolution**:
1. **Forward Reference Resolution**: CON and OBJ symbols are already in
   `SpinResolver.mainSymbols` from Pass 1 (`compile1()`, see 4.1) by the time
   Pass 2 compiles method bodies, so a method may reference a CON or OBJ
   declared later in the same file
2. **Type Checking**: CON values carry `eElementType.type_con_int` or
   `.type_con_float`; re-declaring a symbol with a different value or type is
   caught by `verifySameValue()` (`src/classes/spinResolver.ts`)
3. **Address Assignment**: `compile_var_blocks()` assigns each VAR symbol its
   byte offset via a running `this.varPtr`, sized by BYTE/WORD/LONG and any
   array count
4. **Method Offset Calculation**: `compile_sub_blocks_id()` records each
   PUB/PRI's object-table slot at the current `this.objImage.offset`
   (`subStartIndex`), before any method body is compiled

**Bytecode Generation**:
1. **SPIN2 Bytecode**: `compile_sub_blocks()` compiles each PUB/PRI method
   body into interpreter bytecode
2. **PASM2 Assembly**: `compile_dat_blocks()` (`src/classes/spinResolver.ts`)
   handles both `DAT` sections and, via its `inLineMode` parameter, inline
   PASM embedded in a PUB/PRI body
3. **Object Method Calls**: a call through a child object emits
   `eByteCode.bc_call_obj_sub` (or `bc_call_obji_sub` for an indexed/array
   instance)
4. **Data Structure Access**: member layout and access come from
   `ObjectStructures`/`ObjectStructureSet` (`src/classes/objectStructures.ts`)

**Compile-Time Float and CORDIC Folding** (`SpinResolver.resolveOperation()`):
Constant expressions that mix integers and floats, or use `FLOAT`/`ROUND`/`TRUNC`,
`SQRT`, `LOG2`/`LOG10`/`LOG`, `EXP2`/`EXP10`/`EXP`, or `QLOG`/`QEXP`, are folded
at compile time to the exact bit pattern PNut's own x86 float package and integer
CORDIC would produce — not IEEE-754 double-precision arithmetic. The float
routines (`src/utils/pnutFloat.ts`) are a direct port of PNut's `fp_add`,
`fp_sub`, `fp_mul`, `fp_div`, `fp_cmp`, `fp_sqrt`, `fp_pow`, the `fp_log*` /
`fp_exp*` family, and `fp_float`/`fp_round`/`fp_trunc`, each named after the
`REF-V52A/p2com.asm` routine it reproduces. `QLOG`/`QEXP` instead call the
integer CORDIC in `src/utils/cordicQ.ts` (`cordic_qlog`/`cordic_qexp`, ported
from PNut's `cordic_qlog`/`cordic_qexp`/`cordic_q`). Both modules model x86
register widths and signs explicitly (unsigned 32-bit mantissas re-normalized
with `>>> 0`, signed 32-bit exponents with `| 0`, 64-bit CORDIC state as a
`BigInt` masked to `BigInt.asUintN(64, ...)`) because a bare TypeScript `number`
does not wrap the way the ported x86 arithmetic requires; the goal is bit-exact
parity with PNut, not mathematical accuracy.

**Memory Layout Planning**:
1. **Variable Space Allocation**: `compile_var_blocks()`'s `this.varPtr`
   running total (see 4.2 above) is this object's own VAR size,
   `this.ownVarSize`
2. **Object Instance Spacing**: each child OBJ instance's VAR offset is the
   placeholder long `compile_obj_blocks_id()` appends per instance,
   backpatched once the child's own VAR size is known
   (`compile_obj_blocks()`)
3. **Hub Memory Organization**: `hubOrgLimit` (default `obj_size_limit`) is
   the ceiling `compile_var_blocks()` and hub-mode DAT/inline-PASM checks
   compare against
4. **COG Memory Planning**: `cogOrgLimit` (`0x1f8 << 2` byte-address limit,
   `src/classes/spinResolver.ts`) bounds `ORG`'d/inline-PASM code compiled
   for COG execution

## Phase 5: Object File Processing and Integration

### 5.1 Child Object Binary Generation
Each object's `compile_final()` (`src/classes/spinResolver.ts`) produces this
layout (the comment block above `compile_obj_symbols()`, quoted in full at
5.3 below):

1. **Object Header Creation**: two prepended LONGs, `varsize` (`this.varPtr`)
   and `psize` (`checksumOffset`, the core binary length)
2. **Object Table Generation**: written earlier, by `compile_sub_blocks_id()`
   / `compile_obj_blocks_id()` (see 4.1-4.2), not by `compile_final()` itself
3. **Code/Data Assembly**: the code/data bytes already in `this.objImage`
   before `compile_final()` runs
4. **Symbol Table Creation**: the PUB/CON export records `compile_final()`
   copies from `this.pubConList`
5. **Checksum Calculation**: `ObjectImage.calculateChecksum()`, written
   *before* the symbol table (see 6.5) — not after it, despite the ordering
   implied by "and" in this list

### 5.2 Object Binary Integration (`compile_obj_symbols()`)
The parent object integrates child binaries:

1. **Child Binary Loading**: `ChildObjectsImage.getOffsetAndLengthForFile()`
   locates each child's bytes inside `this.objectData` (already populated by
   `compile_obj_blocks()`, see 4.2's Object Instance Spacing)
2. **Symbol Import**: `compile_obj_symbols()` walks the child's PUB/CON
   symbol-table records (offset `objOffset + 8 + psize + 1`) into the
   parent's `mainSymbols`
3. **Address Resolution**: cross-object calls are already emitted as
   `bc_call_obj_sub`/`bc_call_obji_sub` (see 4.2); this step validates the
   child object identity via checksum, not addresses
4. **Binary Concatenation**: `compile_obj_blocks()` (see 4.2), not
   `compile_obj_symbols()`, copies the child's bytes into the parent's image
5. **Reference Table Update**: `compile_obj_blocks()`'s 2nd pass, which
   patches each object-table slot's file offset and VAR offset (see 4.2)

### 5.3 Object Table Structure
Verified against the `OBJ structure` comment block directly above
`SpinResolver.compile_obj_symbols()`:
```
Object Table Entry Format:
├── Child Objects: LONG ($7FFF_FFFF & offset), var_offset
├── PUB Methods:   LONG ($8000_0000 | params<<24 | results<<20 | offset)
├── PRI Methods:   LONG ($8000_0000 | params<<24 | results<<20 | offset)
└── End Marker:    LONG ($7FFF_FFFF & objsize)
```

## Phase 6: Binary Assembly and Output Generation

### 6.1 Final Binary Composition (`ComposeRam()`)
The final phase assembles the complete binary with optional runtime components. The assembly process follows a specific order to ensure proper memory layout and component integration.

#### 6.1.1 Component Integration Sequence
`ComposeRam()` follows this order:

1. **Core Application Ready**: User object code compilation completed
2. **SPIN2 Interpreter Insertion** (SPIN2 mode only, `P2InsertInterpreter()`):
   - Load `Spin2_interpreter.obj` from external files
   - Move application upward to make space at beginning
   - Patch interpreter parameters (memory layout, clock settings)
   - Size: whatever ships in `Spin2_interpreter.obj` (currently 6280 bytes;
     `ExternalFiles.spinInterpreterLength` reads the file, it is not a fixed
     constant)

3. **Hub Memory Validation**: total size checked against `HubLimit` (512KB,
   `0x80000` in `src/classes/spin2Parser.ts`)

4. **Debugger Integration** (debug mode only, `P2InsertDebugger()`):
   - Load `Spin2_debugger.obj` (currently 2932 bytes; also read from the file,
     not a fixed 16KB — the separate `+0x4000` (16KB) added to the Phase
     6.1's hub-size check is a fixed *budget* for the debugger plus its debug
     data table, not the debugger binary's own length)
   - Move existing content upward (interpreter + application)
   - Append debug data after debugger
   - Patch debugger parameters (app size, clock, debug symbols)
   - Requires: Crystal/external clocking ≥10MHz

5. **Clock Setter Integration** (PASM2 mode, conditional, `P2InsertClockSetter()`):
   - Load `clock_setter.obj` for non-zero clock modes
   - Insert at beginning when `_AUTOCLK` not disabled
   - Patch clock mode/frequency parameters
   - NOP unused instructions based on clock configuration

6. **Non-Flash Binary Preservation**: `ComposeRam()` copies the assembled
   image (`ObjectImage.copyFrom()`) before writing the `.bin`, so a
   `--flashfile` build can derive the `.flash` image from that snapshot
   without disturbing the `.bin` that is about to be written.

`ComposeRam()` does **not** call `P2InsertFlashLoader()` — that method exists
in `spin2Parser.ts` but nothing in the compile path invokes it; the
`--flash`/`--ram` hardware-download options it would have served were never
wired up. The `-F`/`--flashfile` output is built separately: after the `.bin`
write, if `writeFlashImageFile` is set, `P2MakeFlashFile()` calls
`P2MakeFlashFileImage()` on the pre-write snapshot and writes the result to
the `.flash` file with its own synchronous write. See 6.2.4 for that image's
actual layout.

#### 6.1.2 Memory Layout Priority
The interpreter and the clock setter are **mutually exclusive** —
`P2InsertInterpreter()` only runs when `isPasmMode == false`, and
`P2InsertClockSetter()` only runs when `isPasmMode` is true (and not in debug
mode) — so a `.bin` never contains both. The debugger, when present, is
always inserted last (moved to the very front), because `P2InsertDebugger()`
runs after whichever of the other two ran. The possible `.bin` layouts are:

- SPIN2 mode, no debug: `[Interpreter] → [Application]`
- SPIN2 mode + debug: `[Debugger] → [Debug Data] → [Interpreter] → [Application]`
- PASM2 mode, clock setter needed, no debug: `[Clock Setter] → [Application]`
- PASM2 mode + debug (no clock setter — debug mode suppresses it): `[Debugger] → [Debug Data] → [Application]`
- PASM2 mode, no clock setter needed, no debug: `[Application]` alone

**`.flash` image** (built by `P2MakeFlashFileImage()`, from a copy of the
fully-assembled image — interpreter/debugger/clock-setter insertion above have
already happened by this point — taken just before the `.bin` write; see 6.1.1
and 6.2.4):
```
[Loader subset (0x90 bytes)] → [Application (interpreter/debugger/clock-setter already inserted, if applicable)]
```
The loader subset and application together are padded to at least 0x400 (1KB)
total if shorter.

#### 6.1.3 External File Dependencies
The compiler relies on pre-compiled binary components:

- `Spin2_interpreter.obj` - SPIN2 bytecode interpreter
- `Spin2_debugger.obj` - Debug support system
- `clock_setter.obj` - Clock configuration code
- `flash_loader.obj` - Flash programming support

**File Management**: `ExternalFiles` class (`src/classes/externalFiles.ts`)

### 6.2 Component-Specific Integration Details

#### 6.2.1 SPIN2 Interpreter Integration (`P2InsertInterpreter()`)
**Process**:
1. **Space Allocation**: Move object upward by interpreter size
2. **Binary Placement**: Install interpreter at offset 0x0000
3. **Parameter Patching**:
   - `pbase_init` (0x30): Interpreter length
   - `vbase_init` (0x34): Interpreter + object length
   - `var_longs` (0x3C): Variable space + stack (0x400)
   - `clkmode_hub` (0x40): Clock mode setting
   - `clkfreq_hub` (0x44): Clock frequency
   - `_debugnop_`: NOP if not debug mode, else the debug receive pin is
     patched into three interpreter instructions. This offset shifts with
     interpreter revisions (the source itself tracks that history: v52a
     0xf2c → v52 0xf34 → v55 0xf78, currently 0xf78) — always read it from
     `P2InsertInterpreter()` rather than citing a fixed value.

#### 6.2.2 Clock Setter Integration (`P2InsertClockSetter()`)
**Conditions**:
- PASM2 mode AND clockMode != 0b00
- Not in debug mode
- `_AUTOCLK` not defined or != 0

**Process**:
1. **Instruction Optimization**: NOP unused clock instructions
2. **Parameter Patching**:
   - `_clkmode1_` (0x034): Clock mode & 0xFFFFFFFC
   - `_clkmode2_` (0x038): Full clock mode
   - `_appblocks_` (0x03C): `(imageLength >> 11) + 1`

#### 6.2.3 Debugger Integration (`P2InsertDebugger()`)
**Requirements Validation**:
- Clock mode bit 1 set (crystal/external)
- Clock frequency ≥ 10MHz

**Process**:
1. **Space Management**: Move content by debugger + debug data size
2. **Component Installation**: Debugger at 0x0000, debug data after
3. **Parameter Patching**:
   - `_appsize_` (0xe4): Application size
   - `_clkfreq_` (0xd4), `_clkmode2_` (0xdc), `_clkmode1_` (0xd8): clock frequency/mode
   - `_hubset_` (0xe8), `_brkcond_` (0x11c), `_txpin_` (0x140), `_rxpin_` (0x144),
     `_baud_` (0x148): debug cog/break/pin/baud configuration, driven by the
     optional `DEBUG_COGS`, `DEBUG_COGINIT`, `DEBUG_MAIN`, `DEBUG_DELAY` and
     `DEBUG_TIMESTAMP` compile-time symbols

#### 6.2.4 Flash Image Generation (`P2MakeFlashFileImage()`)
This is a separate code path from the component-insertion sequence above; it
is never reached through `ComposeRam()`'s own flow (see 6.1.1) and does not
share `P2InsertFlashLoader()`, which the codebase keeps but no longer calls.

**Layout**:
- A 0x90-byte subset of `flash_loader.obj` (bytes 0x160-0x1F0 of the file,
  `_loader_offset_`/`_loader_size_` in `P2MakeFlashFileImage()`) is placed at
  the front; the application is moved up by that amount to make room
- The result is padded to at least 0x400 (1KB) total if shorter

**Checksums** (both negative sums of longs, `checkSum -= readLong(offset)`):
- One checksum covers the application region only (from the end of the
  loader subset to the end of the image) and is stored 8 bytes before the end
  of the loader region
- A second checksum covers bytes 0 through 0x400 (the loader plus however
  much of the application falls in that first 1KB) and is stored 4 bytes
  before the end of the loader region
- These are independent of, and never combine with, the object-file checksum
  described in 6.5

### 6.3 Binary File Generation (`writeBinaryFile()`)
`writeBinaryFile()` itself just copies a byte range out of the assembled
`ObjectImage` and writes it; the structure below is what `SpinResolver`
already built into that image before `ComposeRam()` ran:

1. **Header Generation**: varsize and pgmsize values (see 5.1)
2. **Object Table Output**: method and object-table entries (see 5.3)
3. **Code/Data Output**: bytecode/PASM2 already compiled (see 4.2)
4. **Child Object Integration**: child binaries already concatenated in by
   `compile_obj_blocks()` (see 4.2, 5.2)

**The `.bin` stops there.** The checksum byte and the PUB/CON symbol table
that `SpinResolver.compile_final()` appends after the code/data section exist
only in the `.obj` file format and in the in-memory image passed between
compiler stages — never in the `.bin`. In SPIN2 mode
`P2InsertInterpreter()` truncates the image back down to interpreter length
plus executable size before the `.bin` write, discarding that tail; in PASM
mode the whole checksum-and-symbols block is never appended in the first
place (`compile_final()` gates it on `pasmMode == false`). See
[SPIN2-BIN-Format.md](SPIN2-BIN-Format.md) for the full object-format layout.

**Files reach disk through a single synchronous write.** The `.bin`, `.obj`,
`.map` and `.flash` outputs are each written with one `fs.writeFileSync` call
(`src/classes/spin2Parser.ts`), not through a write stream. This is deliberate
and worth knowing when adding a new output: an earlier implementation closed its
streams without awaiting them, so the process could exit before the bytes were
flushed. A script reading an output immediately after the compiler returned could
then see the *previous* run's contents, or a partially written file, and under
load the `.flash` output could be left zero-length. Because the failure depended
on timing it looked intermittent, and a rebuild appeared to fix it.

As of v1.55.8 the `.lst` listing, the `-i` preprocessed-source dump and the
`--regression` element/preprocessor/resolver reports join this pattern too:
each is built in memory and written once with `fs.writeFileSync`, replacing an
unawaited `fs.createWriteStream().end()`. A write failure — an unwritable
output directory, for example — is now a normal error with a non-zero exit
instead of an uncaught stack trace, and "Wrote `<file>`.lst" is no longer
printed for a listing that failed to write. Any new output file should follow
the same synchronous pattern.

### 6.4 Hub Memory Management
The compiler enforces P2 memory constraints:

```typescript
objSize = executableSize +
          (debugMode ? 0x4000 : 0) +
          (spin2Mode ? interpreterSize + variableSize + 0x400 : 0)
```

**Limits** (this check, in `ComposeRam()`, runs before the flash image is
ever built, so it says nothing about `.flash` sizing):
- Hub RAM: 512KB maximum (`HubLimit`)
- Debug overhead: +16KB fixed budget, regardless of the debugger binary's
  actual size (see 6.1.1)
- Stack space: +1KB (0x400)

A second, independent limit (`obj_limit`, `OBJ_LIMIT` in
`src/classes/spinResolver.ts`) caps the compiled object image itself at 24MB
(`0x1800000`) before any runtime component is added; it is checked inside
`P2InsertInterpreter()` and `moveObjectUp()`.

### 6.5 Checksum Systems

#### Object-Format Checksum (.obj files only — never reaches the .bin)
- **Algorithm**: negative sum of all bytes in the object image, taken mod 256
  (`ObjectImage.calculateChecksum()`)
- **Scope**: the whole object — code/data, the checksum byte itself, and the
  PUB/CON symbol table — such that summing the whole object's bytes yields
  zero
- **Location**: written by `SpinResolver.compile_final()` immediately after
  the code/data section and *before* the symbol table, not after it
- **Consumer**: `SpinResolver.compile_obj_symbols()` re-derives this checksum
  when a parent absorbs a child `.obj`, and rejects a non-zero result
- This checksum, and the symbol table that follows it, are stripped back out
  of SPIN2-mode `.bin` output by `P2InsertInterpreter()`'s truncation, and are
  never appended at all in PASM mode (see 6.3). No checksum of this kind is
  present in a `.bin` file.

#### Dual Checksum (.flash images only, `P2MakeFlashFileImage()`)
- **Application checksum**: negative sum of the longs from the end of the
  0x90-byte loader subset to the end of the image
- **Loader-region checksum**: negative sum of the longs from offset 0 to
  0x400 — this covers the loader subset *and* whatever application bytes
  fall within that first 1KB, not the loader alone
- **Independence**: both are computed and stored separately; neither is the
  object-format checksum above

## Phase 7: Listing and Map File Generation

### 7.1 Listing Generation Process (`P2List()`)
When `-l` is specified, `P2List()` (`src/classes/spin2Parser.ts`) writes the
`.lst` file. **It is not an annotated source listing** — there is no
per-source-line bytecode/address dump, no cross-reference, and no object
dependency tree in this file; those would need to be built against the
element/symbol stream and are not. What it actually contains, in order:

**Symbol Table Output** (one line per user symbol, from `userSymbols =
this.spinResolver.userSymbolTable`):
```
TYPE: CON_INT        VALUE: 20000000     NAME: CLK_FREQ
TYPE: LOC_LONG       VALUE: 00000000     NAME: counter
TYPE: PUB            VALUE: 00000008     NAME: start
```
(`symbolType` is one of the 30-odd `eElementType` cases `P2List()` switches
on, e.g. `CON_INT`/`CON_FLOAT`/`VAR_BYTE`/`OBJ_PUB`/`METHOD`)

**Clock and Size Summary**: `Spin2_v<N>` version line, then `CLKMODE:`/
`CLKFREQ:`/`XINFREQ:` if those symbols exist, then either `Hub bytes:` (PASM
mode) or `OBJ bytes:`/`VAR bytes:` plus, if `-d` was given, `DEBUG records:`/
`DEBUG data:` counts against `DebugData.MAX_ENTRIES`/`DebugData.DEBUG_SIZE_IN_BYTES`

**Object/Debug Hex Dump**: a 16-bytes-per-line hex+ASCII dump (offset,
hex bytes, printable-ASCII column) of the compiled object image, followed by
the same dump format for the debug data table if one exists

### 7.2 Listing File Format
Corrected to match `P2List()` (see 7.1) — the `.lst` file actually contains,
in order:
1. **Symbol Table**: every user-defined symbol, its `eElementType`-derived
   type tag, and its value
2. **Clock/Version/Size Summary**: source language version, clock settings if
   present, and OBJ/VAR/debug byte counts
3. **Object Image Hex Dump**: the compiled binary, as hex+ASCII
4. **Debug Data Hex Dump**: the debug data table, as hex+ASCII, if `-d` was used

There is no header/timestamp section, no per-source-line listing, no
cross-reference section, and no object-tree section — the `.map` file (7.3)
is where hierarchy, addresses and per-symbol resolution live.

### 7.3 Map File Generation (`src/classes/mapGenerator.ts`)
When the `-m` flag is specified, the compiler writes a `.map` file describing the
compiled program's structure: where each object landed in hub memory, what each
object contains, and where every symbol and method entry point resolves to.

Five sections are emitted, in order: `OBJECT HIERARCHY`, `MEMORY LAYOUT`,
`OBJECT DETAILS`, `ADDRESS INDEX` and `SYMBOL INDEX`.

The concept that governs the whole file is the **instance**. An object may be
declared more than once, and each declaration is a separate instance with its own
memory, its own overrides and its own dotted-path name (a child `leaf` declared
under `a` is `A.LEAF`). The index sections are built from *instances* rather
than from source files, so extra copies are no longer hidden — but rows with
identical content then collapse into one, whose `Instance` cell names the
shortest instance path followed by a count of the others sharing it (`SHARED+3`
covers four instances). Row counts therefore rise relative to the old
one-row-per-source-file form without scaling linearly with instantiation. Instance identity is the pair (parent, position within that parent) —
not the object — which is what allows two declarations of the same object to
coexist without one overwriting the other.

The complete field-by-field specification, including column meanings and the
`Entry +$XXXXX  ($YYYYY)` method-entry form, is in
[MAP-File-Format.md](MAP-File-Format.md).

## Integration Points and Data Flow

### Inter-Phase Communication
1. **Context Object**: `Context` (`src/utils/context.ts`) is constructed once
   per run and threaded into `Compiler`, `Spin2Parser`, `SpinResolver` and
   `SpinDocument`
2. **Symbol Tables**: `SpinResolver.mainSymbols`/`.localSymbols`
   (`src/classes/symbolTable.ts` `SymbolTable` instances), reset per object at
   the start of `compile1()` (see Phase 1 Compiler Initialization)
3. **Binary Images**: `ObjectImage` (`src/classes/objectImage.ts`) accumulates
   the object under compilation; `ChildObjectsImage` holds already-compiled
   children (see Phase 5)
4. **Error Handling**: a plain `Error` thrown anywhere in `SpinResolver` is
   caught once in `Compiler.compileRecursively()`'s catch block, which
   attaches the failing file (`Spin2Parser.failingFileID`) and source line
   (`Spin2Parser.sourceLineNumber`) before printing
   `<filespec>:<line>:error:<message>` via `Logger.compilerErrorMsg()`

### File Dependencies
```
Input Files:
├── main.spin2 (top-level)
├── child1.spin2 (OBJ reference)
├── child2.spin2 (OBJ reference)
├── data.dat (binary include)
└── include.spin2 (#include file)

Output Files:
├── main.bin (primary binary)
├── main.lst (listing - if requested, -l)
├── main.obj (object file - if requested, -O)
├── main.map (memory map - if requested, -m)
└── main.flash (flash binary - if requested, -F)
```

### Error Handling and Diagnostics
1. **Source Location Tracking**: see "Inter-Phase Communication" above
   (`Compiler.compileRecursively()`'s catch block)
2. **Error Types**: there are exactly two — `PreprocessorError`
   (`src/classes/spinDocument.ts`, see Phase 2.3; its diagnostics are already
   reported when it is thrown) and a plain `Error` for everything from
   `SpinResolver`/`Spin2Parser`. There is no per-phase error type hierarchy.
3. **Dependency Errors**: `SpinFiles.addObjFile()` throws `Cannot find
   <filename>` for a missing OBJ file; `Compiler.compileRecursively()`'s
   `OBJ_STACK_LIMIT` check (see Phase 3.1) throws for circular/too-deep
   nesting
4. **Symbol Resolution Errors**: the actual message is the bare string
   `Undefined symbol` (`SpinResolver.checkUndefined()`) — it does
   **not** name the undefined symbol; only the file:line the catch handler
   attaches identifies where it occurred
5. **Memory/Size Limit Enforcement**: these are fatal errors, not warnings —
   `Program requirement exceeds NKB hub RAM by N bytes` (`ComposeRam()`, see
   6.4), `Program exceeds NKB (m492)`/`(m493)` (`P2InsertInterpreter()`/
   `moveObjectUp()`), `Too much variable space is declared (m603)`
   (`compile_obj_blocks()`, see 4.2)

## Performance Characteristics

### Memory Usage
- **Dynamic Growth**: `ObjectImage.ensureCapacity()` (`src/classes/objectImage.ts`)
  grows the backing buffer on demand as bytes/longs are appended
- **Memory Limits**: 24MB object size limit enforced (`OBJ_LIMIT` in `src/classes/spinResolver.ts`; separate from the 512KB hub RAM limit checked in `ComposeRam()`, see 6.4)

### Compilation Speed
- **Incremental Processing**: With the object cache enabled (`-C`), child
  objects whose inputs are unchanged are replayed from disk rather than
  recompiled. The cache is **opt-in**, not automatic, and "unchanged" means the
  object's whole transitive subtree — every source file it was built from, and
  any file embedded with `DAT ... FILE` — as recorded in the entry's dependency
  manifest. See
  [Object-Cache-Theory-of-Operations.md](Object-Cache-Theory-of-Operations.md).
- **Symbol Lookup**: `SymbolTable` (`src/classes/symbolTable.ts`) backs its
  `add()`/`exists()`/lookup operations with a JavaScript `Map<string,
  SymbolEntry>`, not a linear scan

## Conclusion

Per-object compilation is two-pass (`compile1()`/`compile2()`, Phase 4);
object trees are handled by recursion with an object-cache short-circuit
(`compileRecursively()`, Phase 3); final assembly composes the interpreter,
debugger, clock setter and application into one `.bin` per the mutually
exclusive layouts in 6.1.2; `.lst` is a symbol table plus a raw hex dump, not
an annotated source listing (7.1-7.2); the `.map` file, not the `.lst`, is
where object hierarchy and address resolution are documented (7.3,
[MAP-File-Format.md](MAP-File-Format.md)).