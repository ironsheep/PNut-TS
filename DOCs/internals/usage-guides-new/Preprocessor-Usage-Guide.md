# Preprocessor Usage Guide

## Overview

The Spin2 preprocessor provides conditional compilation, symbol definition, file inclusion, and diagnostic directives. These directives are processed before compilation begins, allowing code to be configured for different build configurations, platforms, or hardware variants.

Preprocessor directives:
- **Symbol Definition** - `#define`, `#undef`
- **Conditional Compilation** - `#ifdef`, `#ifndef`, `#else`, `#elseifdef`, `#elseifndef`, `#endif`
- **File Inclusion** - `#include`
- **Diagnostics** - `#error`, `#warn`
- **Pragma** - `#pragma exportdef`

All directives begin with `#` at the start of a line (leading whitespace is allowed). Directive names are case-insensitive.

**Important**: The `#` character is also used for constant enumeration in CON sections (e.g., `#0, VALUE1, VALUE2`). This is not a preprocessor directive - it's Spin2 syntax for assigning sequential values to constants.

## Basic Usage

### Defining Symbols

```spin2
' Define a symbol (exists/doesn't exist)
#define DEBUG_MODE

' Define a symbol with a value
#define BUFFER_SIZE 256

' Symbol names are case-insensitive (stored as uppercase internally)
#define MySymbol           ' Same as MYSYMBOL
```

### Conditional Compilation

```spin2
#define USE_SERIAL

CON
#ifdef USE_SERIAL
  TX_PIN = 30
  RX_PIN = 31
  BAUD_RATE = 115200
#endif

PUB main()
#ifdef USE_SERIAL
  serial.start(TX_PIN, RX_PIN, BAUD_RATE)
  serial.str(string("Debug output enabled", 13, 10))
#endif
  ' Main program continues...
```

### Conditional with Else

```spin2
#define CLOCK_200MHZ

CON
#ifdef CLOCK_300MHZ
  CLK_FREQ = 300_000_000
#else
  CLK_FREQ = 200_000_000
#endif

  _clkfreq = CLK_FREQ
```

## Symbol Definition Directives

### #define

Creates a preprocessor symbol. The symbol can optionally have a value.

```spin2
' Symbol without value - used for existence checks
#define FEATURE_ENABLED

' Symbol with numeric value
#define MAX_ITEMS 100

' Symbol with expression value
#define TIMEOUT_MS 5000

' Multi-word value - the value is everything after the symbol name
#define GREETING hello there world
```

The value is the rest of the line, with interior spacing preserved; a trailing
tick or brace comment is not part of it. (Before v1.55.3 only the first word
was kept, silently.)

Function-like defines are not supported and fail the build rather than
silently never expanding:

```
myfile.spin2:1:error:#define does not support arguments — only simple symbol definitions
```

Symbols defined with `#define` can be:
- Checked for existence with `#ifdef` and `#ifndef`
- Removed with `#undef`
- Overridden by command-line `-D` option

### #undef

Removes a previously defined symbol.

```spin2
#define CLOCK_200MHZ
#define CLOCK_300MHZ

' Override the 200MHz setting when 300MHz is defined
#ifdef CLOCK_300MHZ
#undef CLOCK_200MHZ
#endif
```

Removal is complete: after `#undef`, `#ifdef` reports the symbol undefined
*and* the symbol's text no longer substitutes; a later `#define` of the same
name installs the new value. (Before v1.55.3 the old substitution survived the
`#undef` — `#ifdef` said the symbol was gone while its text kept expanding.)

The predefined `__*__` symbols refuse `#undef`: the symbol stays defined, the
build continues, and a warning is reported:

```
myfile.spin2:1:warning:cannot undefine built-in symbol [__P2__]
```

Use `#undef` to:
- Remove a default setting when an override is specified
- Ensure mutual exclusivity between configuration options
- Clean up temporary symbols after use

## Conditional Compilation Directives

### #ifdef / #endif

Includes code only if the symbol is defined.

```spin2
#define VERBOSE_LOGGING

PUB process_data(buffer, length) | i
#ifdef VERBOSE_LOGGING
  debug("Processing ", udec(length), " bytes")
#endif

  repeat i from 0 to length - 1
    ' Process buffer[i]...

#ifdef VERBOSE_LOGGING
  debug("Processing complete")
#endif
```

### #ifndef / #endif

Includes code only if the symbol is NOT defined.

```spin2
' Provide default if not specified elsewhere
#ifndef STACK_SIZE
#define STACK_SIZE 256
#endif

VAR
  long stack[STACK_SIZE]
```

### #else

Provides an alternative branch when the condition is false.

```spin2
#ifdef USE_I2C
  i2c.setup(SDA_PIN, SCL_PIN)
#else
  spi.setup(CLK_PIN, MOSI_PIN, MISO_PIN, CS_PIN)
#endif
```

### #elseifdef / #elseifndef

Tests additional conditions after an initial `#ifdef` or `#ifndef`.

```spin2
#define CLOCK_200MHZ

CON
#ifdef CLOCK_300MHZ
  CLK_FREQ = 300_000_000
  CLK_MODE = %1_0000_01_00
#elseifdef CLOCK_250MHZ
  CLK_FREQ = 250_000_000
  CLK_MODE = %1_0000_01_00
#elseifdef CLOCK_200MHZ
  CLK_FREQ = 200_000_000
  CLK_MODE = %1_0000_01_00
#else
  CLK_FREQ = 160_000_000
  CLK_MODE = %1_0000_01_00
#endif
```

### Nested Conditionals

Conditionals can be nested to any depth.

```spin2
#define USE_PSRAM16
#define USE_PSRAM_SLOW

#ifdef USE_PSRAM16
  MA_CHAR_ASHIFT = 1
  MA_CHAR_CYCLES = 4

  #ifdef USE_PSRAM_SLOW
    MA_CLKDIV = 3
    MA_CYMUL = 1
  #else
    MA_CLKDIV = 2
    MA_CYMUL = 2
  #endif

#elseifdef USE_PSRAM8
  MA_CHAR_ASHIFT = 2
  MA_CHAR_CYCLES = 8
#endif
```

## File Inclusion

### #include

Inserts the contents of another file at the directive location.

```spin2
PUB main()

#include "driver_methods"

CON
  ' Constants continue after included content...
```

The included file (`driver_methods.spin2` or `driver_methods`):

```spin2
' -- Included content --

PUB driver_init()
  ' Initialization code...

PUB driver_read() : value
  ' Read operation...

' -- End of included content --
```

**Include file rules:**
- Filename is enclosed in double quotes
- The `.spin2` extension is optional (added automatically if missing)
- Only `.spin2` files can be included
- The file is searched in:
  1. Directories specified by `-I` command-line option
  2. The directory containing the source file

**Include with subdirectory:**

```spin2
#include "inc/utility_methods"
```

## Diagnostic Directives

### #error

Generates a compile-time error with a custom message.

```spin2
#ifndef USE_PSRAM16
#ifndef USE_PSRAM8
#ifndef USE_PSRAM4
#error "Must define exactly one of USE_PSRAM16, USE_PSRAM8, or USE_PSRAM4"
#endif
#endif
#endif
```

Use `#error` to:
- Enforce required configuration
- Detect incompatible option combinations
- Provide clear guidance when configuration is incomplete

### #warn

Generates a compile-time warning without stopping compilation.

```spin2
#ifdef USE_DEPRECATED_API
#warn "USE_DEPRECATED_API is deprecated, migrate to new API"
#endif
```

Use `#warn` to:
- Flag deprecated configurations
- Alert about non-optimal settings
- Provide informational messages during compilation

Both directives only fire from a branch that is actually being compiled. An
`#error` sitting in the `#else` of a configuration chain — the pattern under
[Hardware Configuration Selection](#hardware-configuration-selection) — stays
silent whenever any earlier branch matched.

## Diagnostics

### Message Format

Every preprocessor diagnostic is written to **stderr**, one per line, in the
order it occurs in the source:

```
<filespec>:<line>:error:<message>
<filespec>:<line>:warning:<message>
```

Line numbers are 1-based and refer to the file named on that line, which is not
necessarily the file you compiled — a diagnostic inside an included file or a
child object names that file and its own line number.

The text is plain: no ANSI color codes, and nothing is duplicated onto stdout.
Colorizing is left to whatever displays the output, so editors, build wrappers
and `grep` all see the same bytes.

Compilation errors from the compiler proper use the same shape, so a single
pattern matches everything PNut-TS reports.

### Fatal vs Warning

| Condition | Severity |
|-----------|----------|
| `#error` in a live branch | fatal |
| `#warn` in a live branch | warning |
| `#define`, `#undef`, `#ifdef`, `#ifndef`, `#elseifdef`, `#elseifndef` with no symbol | fatal |
| `#error`, `#warn`, `#include`, `#pragma` with no argument | fatal |
| `#else`, `#elseifdef`, `#elseifndef`, `#endif` with no conditional open | fatal |
| `#ifdef`/`#ifndef` never closed by `#endif` | fatal |
| `#include` of an unsupported filetype, without quotes, or not found | fatal |
| Unsupported `#pragma` command, or an unrecognized directive | fatal |
| Illegal `{Spin2_vNN}` language version | fatal |
| Function-like `#define NAME(args)` | fatal |
| `#undef` of a symbol that was never defined | warning |
| `#undef` of a predefined `__*__` symbol | warning; the symbol stays defined |

`#undef` of an undefined symbol is deliberately not an error: C specifies it as
a no-op, and so does PNut-TS.

### Exit Codes and Output Files

| Outcome | Exit code | Output files |
|---------|-----------|--------------|
| Success, no diagnostics | 0 | written |
| Warnings only | 0 | written |
| Any fatal diagnostic | 1 | **none** |

A failed build leaves **no output files behind**. Any `.lst`, `.map`, `.flash`,
`.obj` or binary from a previous successful build of the same source is removed
rather than left looking current, so a scripted consumer cannot pick up a stale
binary that no longer matches the source. Nothing is deleted for a failure that
happens before the source file is resolved — a typo in the filename on the
command line leaves an earlier build's output alone.

The `*__pre.spin2` dump requested with `-i` is **kept** on failure. It is
diagnostic output, not a build product, and it is most useful precisely when the
build has just failed.

### Seeing Every Error at Once

A fatal diagnostic does not stop the preprocessing pass. All of a file's
preprocessor errors are reported, in source order, and the build then aborts —
so a file with three broken conditionals takes one build to diagnose rather than
three.

`#error` is the exception: it stops immediately. "Abort here" is what an
author-placed `#error` means, and nothing after it is expected to be meaningful.

## Command-Line Options

### -D (Define Symbol)

Defines a preprocessor symbol from the command line, as if `#define` appeared at the start of the file.

```bash
# Define a single symbol
pnut-ts -D DEBUG_MODE source.spin2

# Define multiple symbols
pnut-ts -D DEBUG_MODE -D CLOCK_300MHZ source.spin2
```

Command-line defines:
- Take effect before any source code is processed
- Override `#define` directives in source code
- Are visible in all files (including `#include` files)

### -U (Block Symbol Export)

Prevents a `#pragma exportdef` of the named symbol from taking effect: the
symbol stays private to the file that defined it instead of propagating to
the rest of the compile.

```bash
# The top file's "#pragma exportdef DEBUG_MODE" is ignored;
# child objects do not see DEBUG_MODE
pnut-ts -U DEBUG_MODE source.spin2
```

`-U` does **not** remove a symbol defined with `-D` or `#define` — it only
blocks the export. Within the defining file the symbol remains defined and
behaves normally.

### -I (Include Directory)

Adds directories to the search path for `#include` files.

```bash
# Add single include directory
pnut-ts -I /path/to/includes source.spin2

# Add multiple include directories
pnut-ts -I ./common -I ./drivers source.spin2
```

Include directories are searched in order:
1. Directories from `-I` options (in order specified)
2. Directory containing the source file

## Predefined Symbols

Two kinds. **Presence-only** symbols are tested with `#ifdef` / `#ifndef` and
never substitute (there is no `#if` expression evaluation, so their numeric
values are not observable). **Substituting** symbols replace their name with a
string wherever it appears — including inside quoted strings, which is the
normal way to use them.

| Symbol | Kind | Meaning |
|---|---|---|
| `__propeller__`, `__P2__`, `__propeller2__` | presence-only | compiling for Propeller 2 |
| `__PNUT_TS__` | presence-only | the PNut-TS compiler is in use |
| `__DEBUG__` | presence-only | defined only under `-d` |
| `__DATE__` | substituting | compile date, `YYYY-MM-DD` |
| `__TIME__` | substituting | compile time, `HH:MM` |
| `__FILE__` | substituting | name of the file being preprocessed (inside an include: the included file's name) |
| `__VERSION__` | substituting | the PNut-TS version, bare (e.g. `1.55.3`) |

```spin2
DAT
  banner  byte  "built ", "__DATE__", " ", "__TIME__", " by PNut-TS ", "__VERSION__", 0
```

`__VERSION__` substitutes a bare dotted string that is not a legal Spin2
expression — use it inside a quoted string or with `#ifdef`, never as
`CON V = __VERSION__`. All predefined symbols refuse `#undef` (see above).

## Pragma Directive

### #pragma exportdef

Exports the **presence** of a symbol to child objects and subsequent
compilations.

```spin2
#define HARDWARE_REV2
#pragma exportdef HARDWARE_REV2

' Child objects see HARDWARE_REV2 as defined
OBJ
  sensor : "sensor_driver"
```

The exported symbol acts like a `-D` option for child objects: it tests true
with `#ifdef` / `#ifndef` everywhere, letting a top-level object select
configuration branches in all dependencies. The symbol's **value does not
propagate** — an exported symbol does not text-substitute in other files, so
export flag-style symbols, not value-carrying ones.

**Interaction with command line:**
- `-U` on command line prevents `#pragma exportdef` from taking effect
- `-D` on command line takes precedence over `#pragma exportdef`

## Patterns

### Debug vs Release Builds

Leave the symbol out of the source and supply it from the command line — the
build script, not the source file, decides which build this is:

```spin2
' Source file: no #define here
PUB process(data) | result
#ifdef DEBUG_BUILD
  debug("Input: ", uhex(data))
#endif

  result := transform(data)

#ifdef DEBUG_BUILD
  debug("Output: ", uhex(result))
#endif
  return result
```

Build commands:
```bash
# Debug build
pnut-ts -D DEBUG_BUILD source.spin2

# Release build (debug code excluded)
pnut-ts source.spin2
```

(`-U` cannot produce the release build from an in-source `#define` — it does
not remove symbols; its only effect is to block `#pragma exportdef`.)

### Hardware Configuration Selection

```spin2
' Default to P2 Edge board
#ifndef BOARD_TYPE
#define BOARD_P2EDGE
#endif

CON
#ifdef BOARD_P2EDGE
  LED_PIN = 56
  BUTTON_PIN = 57
#elseifdef BOARD_P2EVAL
  LED_PIN = 0
  BUTTON_PIN = 1
#elseifdef BOARD_CUSTOM
  LED_PIN = 16
  BUTTON_PIN = 17
#else
#error "Unknown BOARD_TYPE - define BOARD_P2EDGE, BOARD_P2EVAL, or BOARD_CUSTOM"
#endif
```

### Feature Flags

```spin2
#define FEATURE_LOGGING
#define FEATURE_NETWORKING
' #define FEATURE_BLUETOOTH  ' Disabled

OBJ
#ifdef FEATURE_LOGGING
  log : "logger"
#endif
#ifdef FEATURE_NETWORKING
  net : "network_driver"
#endif
#ifdef FEATURE_BLUETOOTH
  bt : "bluetooth_driver"
#endif
```

### Memory Configuration Variants

```spin2
#define USE_PSRAM16

CON
#ifdef USE_PSRAM16
  MEM_SHIFT = 1
  MEM_CYCLES = 4
  PAGE_SIZE = 512
#elseifdef USE_PSRAM8
  MEM_SHIFT = 2
  MEM_CYCLES = 8
  PAGE_SIZE = 256
#elseifdef USE_PSRAM4
  MEM_SHIFT = 3
  MEM_CYCLES = 16
  PAGE_SIZE = 128
#else
#error "Must define USE_PSRAM16, USE_PSRAM8, or USE_PSRAM4"
#endif
```

### Shared Include Files

Create common definitions in a shared file:

**config.spin2:**
```spin2
' Common configuration
#define SYSTEM_VERSION 1

#ifndef CLOCK_SPEED
#define CLOCK_200MHZ
#endif

#ifdef CLOCK_300MHZ
  CLK_FREQ = 300_000_000
#elseifdef CLOCK_200MHZ
  CLK_FREQ = 200_000_000
#endif
```

**main.spin2:**
```spin2
CON
#include "config"

  _clkfreq = CLK_FREQ

PUB main()
  ' Uses CLK_FREQ from config
```

### Mutual Exclusivity

An `#elseifdef` chain is mutually exclusive by construction — the first match
wins and the rest are skipped, so no defensive `#undef` of the other options
is needed (and a defensive `#undef` of a never-defined symbol warns on every
build):

```spin2
#define USE_UART

#ifdef USE_UART
  ' UART configuration
#elseifdef USE_USB
  ' USB configuration
#elseifdef USE_BLUETOOTH
  ' Bluetooth configuration
#else
#error "Must define USE_UART, USE_USB, or USE_BLUETOOTH"
#endif
```

## Anti-Patterns

### Deeply Nested Conditionals

```spin2
' WRONG: Hard to read and maintain
#ifdef FEATURE_A
  #ifdef OPTION_1
    #ifdef VARIANT_X
      #ifdef DEBUG
        VALUE = 1
      #else
        VALUE = 2
      #endif
    #else
      VALUE = 3
    #endif
  #else
    VALUE = 4
  #endif
#else
  VALUE = 5
#endif

' CORRECT: Flatten with compound conditions or separate files
#ifdef FEATURE_A
#define HAS_FEATURE_A
#endif
#ifdef OPTION_1
#define HAS_OPTION_1
#endif

' Use simpler structure
#ifdef HAS_FEATURE_A
  #ifdef HAS_OPTION_1
    VALUE = 1
  #else
    VALUE = 4
  #endif
#else
  VALUE = 5
#endif
```

### Unbalanced Conditionals

```spin2
' WRONG: Missing #endif
#ifdef DEBUG_MODE
  debug_init()

PUB main()      ' Error: #endif never found
  process()

' CORRECT: Properly balanced
#ifdef DEBUG_MODE
  debug_init()
#endif

PUB main()
  process()
```

### Contradictory Conditions

```spin2
' WRONG: Conditions can never be true
#ifdef USE_MODE_A
#ifdef USE_MODE_B        ' If USE_MODE_A is true, this is confusing
  ' This code suggests both modes active simultaneously
#endif
#endif

' CORRECT: Let the #elseifdef chain enforce exclusivity
#ifdef USE_MODE_A
  ' Mode A code
#elseifdef USE_MODE_B
  ' Mode B code
#endif
' The first match wins; no #undef needed (an #undef of a never-defined
' symbol warns on every build)
```

### Overusing Preprocessor for Logic

```spin2
' WRONG: Using preprocessor where runtime logic is better
#ifdef SENSOR_TYPE_1
PUB read_sensor() : value
  value := sensor1_read()
#elseifdef SENSOR_TYPE_2
PUB read_sensor() : value
  value := sensor2_read()
#endif

' CORRECT: Use runtime polymorphism for flexibility
VAR
  long sensor_type

PUB init(type)
  sensor_type := type

PUB read_sensor() : value
  case sensor_type
    SENSOR_TYPE_1: value := sensor1_read()
    SENSOR_TYPE_2: value := sensor2_read()
```

### Missing Default Case

```spin2
' WRONG: No fallback if none match
#ifdef OPTION_A
  VALUE = 1
#elseifdef OPTION_B
  VALUE = 2
#endif
' VALUE undefined if neither defined!

' CORRECT: Always provide default or error
#ifdef OPTION_A
  VALUE = 1
#elseifdef OPTION_B
  VALUE = 2
#else
  VALUE = 0              ' Default value
  ' Or use: #error "Must define OPTION_A or OPTION_B"
#endif
```

### Including Code Multiple Times

```spin2
' WRONG: No include guard
' utils.spin2
PUB helper_func()
  ' ...

' main.spin2
#include "utils"
#include "other"         ' If other.spin2 also includes utils.spin2,
                          ' helper_func is defined twice

' CORRECT: Use include guards
' utils.spin2
#ifndef UTILS_INCLUDED
#define UTILS_INCLUDED

PUB helper_func()
  ' ...

#endif
```

## Preprocessor Output

The `-i` (`--intermediate`) option writes the preprocessed source to a
`*__pre.spin2` file. In it, directives are converted to comments:

**Source:**
```spin2
#define DEBUG_MODE

#ifdef DEBUG_MODE
  DEBUG_FLAG = TRUE
#else
  DEBUG_FLAG = FALSE
#endif
```

**After preprocessing:**
```spin2
' #define DEBUG_MODE

' #ifdef DEBUG_MODE
  DEBUG_FLAG = TRUE
' #else
' #endif
```

The commented-out directives preserve line numbers for error reporting while showing which code paths were selected.

## Summary Tables

### Preprocessor Directives

| Directive | Purpose | Example |
|-----------|---------|---------|
| `#define` | Define symbol | `#define DEBUG_MODE` |
| `#define` | Define with value | `#define SIZE 100` |
| `#undef` | Remove symbol | `#undef DEBUG_MODE` |
| `#ifdef` | If defined | `#ifdef DEBUG_MODE` |
| `#ifndef` | If not defined | `#ifndef RELEASE` |
| `#else` | Else clause | `#else` |
| `#elseifdef` | Else if defined | `#elseifdef OTHER` |
| `#elseifndef` | Else if not defined | `#elseifndef OTHER` |
| `#endif` | End conditional | `#endif` |
| `#include` | Include file | `#include "utils"` |
| `#error` | Emit error | `#error "msg"` |
| `#warn` | Emit warning | `#warn "msg"` |
| `#pragma` | Compiler directive | `#pragma exportdef SYM` |

### Command-Line Options

| Option | Purpose | Example |
|--------|---------|---------|
| `-D` | Define symbol | `-D DEBUG_MODE` |
| `-U` | Block `#pragma exportdef` of symbol | `-U DEBUG_MODE` |
| `-I` | Add include path | `-I ./includes` |

### Conditional Compilation Logic

| Source Directive | `-D SYMBOL` | Result |
|------------------|-------------|--------|
| `#ifdef SYMBOL` | Yes | Code included |
| `#ifdef SYMBOL` | No | Code excluded |
| `#ifndef SYMBOL` | Yes | Code excluded |
| `#ifndef SYMBOL` | No | Code included |

## Compatibility with PNut

PNut-TS is a superset of the original Windows PNut compiler. Source that only
uses the directives PNut has will build under both; source that uses the rest
builds under PNut-TS only. If portability matters, this is the line to stay on
the right side of.

### Directives PNut Also Has

`#define` · `#undef` · `#ifdef` · `#ifndef` · `#elseifdef` · `#elseifndef` ·
`#else` · `#endif`

These eight are portable. Where PNut has wording for a diagnostic, PNut-TS uses
PNut's wording verbatim, so build logs from either compiler match the same
search:

| Condition | Message |
|-----------|---------|
| Directive missing its symbol | `Expected a preprocessor symbol` |
| Conditional directive with nothing open | `Must be preceeded by #IFDEF or #IFNDEF` |
| `#ifdef`/`#ifndef` never closed | `Expected #ENDIF` |

The misspelling in the second message is PNut's own and is reproduced exactly
rather than corrected — the point is that the two compilers say the same thing.

### PNut-TS Extensions

`#error` · `#warn` · `#include` · `#pragma exportdef`

These do not exist in PNut. Source using them will not build under the original
compiler.

### Nesting Depth

PNut caps conditional nesting at 8 levels and rejects anything deeper. PNut-TS
has **no limit** — the preprocessor is a property of the compiler rather than of
the Spin2 language, so PNut's implementation limit is not one PNut-TS adopts.

Nesting deeper than 8 levels therefore builds here and fails under PNut. That is
not a reason to reject it, but it is worth knowing before shipping such source to
someone on Windows. (Deep nesting is hard to read regardless — see
[Deeply Nested Conditionals](#deeply-nested-conditionals).)

### A Note on Unrecognized Directives

`#` followed by a word is also valid Spin2 syntax: it starts a CON enumeration.
PNut-TS resolves the ambiguity in favor of Spin2, so a misspelled directive that
still looks like an enumeration start — `#ifdefx SYMBOL`, say — is treated as an
enumeration rather than reported as a bad directive. It will still fail the
build, but as a Spin2 syntax error rather than a preprocessor one. A directive
written with no argument at all is caught and reported properly.

## Related Documentation

- [Control-Flow-Usage-Guide.md](Control-Flow-Usage-Guide.md) - Runtime conditionals (IF, CASE)
- [Spin2-Object-Patterns-Guide.md](Spin2-Object-Patterns-Guide.md) - Configurable object patterns
