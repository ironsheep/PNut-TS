# PNut-TS Compiler Theory of Operations

## Overview

This document describes the complete theory of operations for the PNut-TS SPIN2/PASM2 compiler, detailing how it processes a tree of source files and generates the final binary output. The compiler follows a multi-phase approach to handle object dependencies and create P2-compatible binaries.

## Architecture Overview

The PNut-TS compiler is designed as a recursive, multi-pass compiler that:

1. **Processes Object Trees**: Handles a hierarchy of SPIN2 files where top-level files reference child objects
2. **Two-Pass Compilation**: Performs symbol resolution and code generation in separate passes
3. **Unified Binary Output**: Combines all objects into a single .bin file for P2 microcontroller execution
4. **Cross-Platform Compatibility**: Generates binaries compatible with the original Windows PNut compiler

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

1. **File Validation**: Ensures a single .spin2 file is specified
2. **Option Processing**: Sets compilation flags (listing, debug, verbose, etc.)
3. **Context Setup**: Initializes the compilation context with:
   - Output file specifications (.bin, .lst, .obj, .map, .flash)
   - Logging and debug options
   - Preprocessor symbol definitions (-D flags) and undefines (-U flags)
   - Include folder paths (-I flags)
   - Object cache settings (`-C`/`--cache`, `--cache-dir`, `--cache-clear`,
     `--cache-verify`) — see
     [Object-Cache-Theory-of-Operations.md](Object-Cache-Theory-of-Operations.md)

### Compiler Initialization (`src/classes/compiler.ts`)
The main Compiler class orchestrates the entire process:

1. **Component Initialization**: Creates instances of:
   - `Spin2Parser`: Handles parsing and code generation
   - `SpinResolver`: Manages symbol resolution and bytecode generation
   - `ObjectImage`: Binary image accumulator
   - `ChildObjectsImage`: Multi-object binary management

2. **Global Data Structures**: Establishes shared resources:
   - Object data storage for child objects
   - DAT file data for external binary includes
   - Symbol tables for resolution
   - Source file registry

## Phase 2: File Loading and Preprocessing

### Document Loading (`src/classes/spinDocument.ts`)
Each SPIN2 file undergoes sophisticated preprocessing:

#### 2.1 File Reading and Line-Ending Normalization
- **Encoding Detection**: Handles UTF-8 and legacy encodings
- **Line-Ending Processing**: Normalizes CRLF, LF, and CR line endings
- **Character Validation**: Ensures proper P2 character set compliance

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
- **Command-Line Defines**: Symbols defined with -D flags
- **Nested Conditionals**: Proper IF/IFDEF nesting with state tracking
- **Include Path Resolution**: Searches multiple folders for include files
- **Symbol Export**: `#pragma EXPORTDEF symbol` for cross-file symbols
- **Version Requirements**: Automatic detection of required compiler version

#### 2.5 Comment Processing
- **Documentation Comments**: `{{...}}` blocks preserved for documentation
- **Line Comments**: `'` comments handled appropriately
- **Block Comments**: `{...}` comments removed during preprocessing

## Phase 3: Object Tree Discovery and Recursive Compilation

### 3.1 Initial Parsing (`compileRecursively()`)
The compiler uses a recursive descent approach:

1. **Top-Level File Processing**: Starts with the main .spin2 file
2. **OBJ Section Discovery**: Identifies child object dependencies
3. **Dependency Resolution**: Loads and compiles child objects first
4. **Circular Reference Detection**: Prevents infinite recursion (max 8 levels)

### 3.2 Object Dependency Analysis (`compile_obj_blocks_id()`)
For each source file, the compiler:

1. **Scans OBJ Sections**: Identifies object declarations like:
   ```spin2
   OBJ
       serial : "jm_serial"
       sensor : "temp_sensor"
       display[4] : "seven_segment"
   ```

2. **File Resolution**: Locates .spin2 files for each object reference
3. **Instance Tracking**: Manages multiple instances of the same object
4. **Parameter Passing**: Handles compile-time parameter overrides

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

**Elementization Process**:
1. **Lexical Analysis**: Source text → elements (tokens)
2. **Symbol Table Population**: Discovers all symbols before use
3. **Object Structure Analysis**: Maps object layouts and dependencies
4. **Method Signature Collection**: Records PUB/PRI method interfaces

**Element Types Identified**:
- Constants (CON section integers, floats, structures)
- Variables (VAR section bytes, words, longs, structures)
- Methods (PUB and PRI declarations)
- Object references (OBJ section instances)
- Data declarations (DAT section data and code)

### 4.2 Pass 2: Code Generation and Resolution (`P2Compile2()`)

**Symbol Resolution**:
1. **Forward Reference Resolution**: Links symbols to their definitions
2. **Type Checking**: Validates symbol usage and compatibility
3. **Address Assignment**: Allocates memory addresses for variables
4. **Method Offset Calculation**: Determines call addresses

**Bytecode Generation**:
1. **SPIN2 Bytecode**: Generates interpreter bytecode for SPIN2 code
2. **PASM2 Assembly**: Handles inline assembly and DAT sections
3. **Object Method Calls**: Generates inter-object method invocations
4. **Data Structure Access**: Handles structure member access

**Memory Layout Planning**:
1. **Variable Space Allocation**: Calculates VAR section memory requirements
2. **Object Instance Spacing**: Allocates space for child object instances
3. **Hub Memory Organization**: Plans RAM usage for variables and objects
4. **COG Memory Planning**: Organizes COG memory for PASM2 code

## Phase 5: Object File Processing and Integration

### 5.1 Child Object Binary Generation
Each object in the tree generates its own binary:

1. **Object Header Creation**: varsize, pgmsize values
2. **Object Table Generation**: Method and child object references
3. **Code/Data Assembly**: Compiled bytecode and data sections
4. **Symbol Table Creation**: PUB/CON symbols for export
5. **Checksum Calculation**: Integrity validation checksum

### 5.2 Object Binary Integration (`compile_obj_symbols()`)
The parent object integrates child binaries:

1. **Child Binary Loading**: Reads .obj files into memory
2. **Symbol Import**: Imports PUB/CON symbols from children
3. **Address Resolution**: Resolves cross-object references
4. **Binary Concatenation**: Combines child binaries into parent
5. **Reference Table Update**: Updates parent's object table

### 5.3 Object Table Structure
The final binary contains a structured object table:
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

**Location**: `src/classes/spin2Parser.ts:448`

#### 6.1.1 Component Integration Sequence
The binary assembly follows this precise order:

1. **Core Application Ready**: User object code compilation completed
2. **SPIN2 Interpreter Insertion** (SPIN2 mode only):
   - Load `Spin2_interpreter.obj` from external files
   - Move application upward to make space at beginning
   - Patch interpreter parameters (memory layout, clock settings)
   - Size: Variable (1-2KB typical)

3. **Hub Memory Validation**: Check total size against P2 limits (512KB)

4. **Debugger Integration** (debug mode only):
   - Load `Spin2_debugger.obj` (16KB fixed size)
   - Move existing content upward (interpreter + application)
   - Append debug data after debugger
   - Patch debugger parameters (app size, clock, debug symbols)
   - Requires: Crystal/external clocking ≥10MHz

5. **Clock Setter Integration** (PASM2 mode, conditional):
   - Load `clock_setter.obj` for non-zero clock modes
   - Insert at beginning when `_AUTOCLK` not disabled
   - Patch clock mode/frequency parameters
   - NOP unused instructions based on clock configuration

6. **Non-Flash Binary Preservation**: Save current state for comparison

7. **Flash Loader Integration** (flash mode only):
   - Insert `flash_loader.obj` subset (0x1F0 bytes)
   - Move entire application to offset 0x0400
   - Create fixed 1KB loader section
   - Implement dual checksum system

#### 6.1.2 Memory Layout Priority
When multiple components are present:

**Standard .bin Layout**:
```
[Debugger] → [Clock Setter] → [Interpreter] → [Application]
```

**Flash .binf Layout**:
```
[Flash Loader (1KB)] → [Debugger] → [Clock Setter] → [Interpreter] → [Application]
```

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
   - `_debugnop_` (0xF2C): NOP if not debug mode

#### 6.2.2 Clock Setter Integration (`P2InsertClockSetter()`)
**Conditions**:
- PASM2 mode AND clockMode != 0b00
- Not in debug mode
- `_AUTOCLK` not defined or != 0

**Process**:
1. **Instruction Optimization**: NOP unused clock instructions
2. **Parameter Patching**:
   - `_clkmode1_` (0x20): Clock mode & 0xFFFFFFFC
   - `_clkmode2_` (0x24): Full clock mode
   - `_appblocks_` (0x3C): Application blocks count

#### 6.2.3 Debugger Integration (`P2InsertDebugger()`)
**Requirements Validation**:
- Clock mode bit 1 set (crystal/external)
- Clock frequency ≥ 10MHz

**Process**:
1. **Space Management**: Move content by debugger + debug data size
2. **Component Installation**: Debugger at 0x0000, debug data after
3. **Parameter Patching**:
   - `_appsize_` (0xD0): Application size
   - Clock parameters (frequency/mode)
   - Debug symbol addresses

#### 6.2.4 Flash Loader Integration (`P2InsertFlashLoader()`)
**Special Characteristics**:
- Fixed 1KB section (0x400 bytes)
- Only 0x1F0 bytes of loader used
- Application offset to 0x0400
- Dual checksum system

**Process**:
1. **Application Repositioning**: Move to 0x0400 offset
2. **Loader Installation**: Copy subset to beginning
3. **Checksum Generation**: Separate loader and application validation

### 6.3 Binary File Generation (`writeBinaryFile()`)
Creates the final output files:

1. **Header Generation**: varsize and pgmsize values
2. **Object Table Output**: Complete method and object references
3. **Code/Data Output**: All compiled bytecode and data
4. **Child Object Integration**: Embedded child object binaries
5. **Symbol Table Append**: PUB/CON symbols (file format only)
6. **Checksum Append**: Final integrity checksum

**Files reach disk through a single synchronous write.** The `.bin`, `.obj`,
`.map` and `.flash` outputs are each written with one `fs.writeFileSync` call
(`src/classes/spin2Parser.ts`), not through a write stream. This is deliberate
and worth knowing when adding a new output: an earlier implementation closed its
streams without awaiting them, so the process could exit before the bytes were
flushed. A script reading an output immediately after the compiler returned could
then see the *previous* run's contents, or a partially written file, and under
load the `.flash` output could be left zero-length. Because the failure depended
on timing it looked intermittent, and a rebuild appeared to fix it. Any new
output file should follow the same synchronous pattern.

### 6.4 Hub Memory Management
The compiler enforces P2 memory constraints:

```typescript
objSize = executableSize +
          (debugMode ? 0x4000 : 0) +
          (spin2Mode ? interpreterSize + variableSize + 0x400 : 0)
```

**Limits**:
- Hub RAM: 512KB maximum
- Debug overhead: +16KB
- Stack space: +1KB (0x400)
- Flash loader: +1KB (flash mode)

### 6.5 Checksum Systems

#### Single Checksum (.bin files)
- **Algorithm**: Negative sum of all bytes
- **Scope**: Entire file content
- **Location**: End of file after symbol table

#### Dual Checksum (.binf files)
- **Flash Loader**: Negative sum of first 1KB
- **Application**: Negative sum of application section
- **Independence**: Both validated separately

## Phase 7: Listing and Map File Generation

### 7.1 Listing Generation Process (`P2List()`)
When `-l` flag is specified, generates comprehensive listing:

**Symbol Table Output**:
```
TYPE: CON_INT        VALUE: 20000000     NAME: CLK_FREQ
TYPE: LOC_LONG       VALUE: 00000000     NAME: counter
TYPE: PUB            VALUE: 00000008     NAME: start
```

**Source Code Listing**:
- Original source lines with line numbers
- Generated bytecode with addresses
- Symbol cross-references
- Memory usage statistics
- Object dependency tree

**Memory Map Information**:
- Variable allocation addresses
- Method entry points
- Object instance locations
- Hub memory usage summary

### 7.2 Listing File Format
The .lst file contains:
1. **Header Information**: Compilation timestamp, options used
2. **Symbol Tables**: All user-defined symbols with types and values
3. **Source Listing**: Source code with generated addresses
4. **Cross-Reference**: Symbol usage locations
5. **Memory Summary**: Variable and code memory usage
6. **Object Tree**: Hierarchy of compiled objects

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
1. **Context Object**: Shared state across all compilation phases
2. **Symbol Tables**: Global symbol visibility and resolution
3. **Binary Images**: Accumulation of generated code and data
4. **Error Handling**: Unified error reporting with source location

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
The compiler provides comprehensive error reporting:

1. **Source Location Tracking**: Links errors to specific files and line numbers
2. **Phase-Specific Errors**: Different error types for each compilation phase
3. **Dependency Errors**: Clear messages for missing or circular dependencies
4. **Symbol Resolution Errors**: Detailed information about undefined symbols
5. **Memory Overflow Detection**: Warnings for memory limit violations

## Performance Characteristics

### Memory Usage
- **Dynamic Growth**: Binary images grow as needed during compilation
- **Memory Limits**: 2MB object size limit enforced
- **Garbage Collection**: Automatic cleanup of temporary data structures

### Compilation Speed
- **Incremental Processing**: With the object cache enabled (`-C`), child
  objects whose inputs are unchanged are replayed from disk rather than
  recompiled. The cache is **opt-in**, not automatic, and "unchanged" means the
  object's whole transitive subtree — every source file it was built from, and
  any file embedded with `DAT ... FILE` — as recorded in the entry's dependency
  manifest. See
  [Object-Cache-Theory-of-Operations.md](Object-Cache-Theory-of-Operations.md).
- **Parallel Opportunities**: Independent object compilation could be parallelized
- **Symbol Table Optimization**: Efficient symbol lookup and resolution

## Conclusion

The PNut-TS compiler implements a sophisticated multi-phase compilation system that handles the complexity of object-oriented SPIN2 development while maintaining compatibility with the original PNut compiler. The recursive compilation approach efficiently manages object dependencies, while the two-pass system ensures proper symbol resolution and code generation.

The integration of preprocessing, object dependency resolution, and final binary assembly creates a robust development environment for Parallax Propeller 2 applications. The comprehensive listing generation and error reporting provide developers with the diagnostic information needed for effective debugging and optimization.

This theory of operations provides the foundation for understanding, maintaining, and extending the PNut-TS compiler codebase.