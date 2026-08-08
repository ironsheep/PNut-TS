# Pnut reimplementation in TypeScript (Pnut-TS)<br>The PNut-TS Preprocessor

![Project Maintenance][maintenance-shield]

[![License: MIT][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/PNut-TS/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/PNut-TS/issues)

## PNut-TS Preprocessor Command line options

A couple of command line options affect the preprocessing:

| Option | Effect |
| --- | --- |
| <PRE>-D \<symbolName></PRE> | Defines a symbol that can be tested with the `#ifdef`, `#ifndef`,  `#elseifdef` or `#elseifndef` statements. Equivalent to `#define SYMBOL` but affects all files in the compilation effort. |
| <PRE>-U \<symbolName></PRE>  | The -U option can undefine a symbol that was previously defined by using the -D option. <Br>**NOTE:** *The -U option can not undefine a symbol created by a #define directive.*
| <PRE>-I \<directory></PRE>  | Specify the folder to search within for files specified using `#include "filename(.spin2)"` statements, or as `files mentioned in the OBJ or DAT sections of your code`
| -- **Diagnostic Use** -- |
| <PRE>-i, --intermediate | Generate `*__pre.spin2` file after preprocessing - so you can review what preprocessed source was fed to the compiler

**NOTE:** The above directives apply to all .spin2 files processed in the compile effort, not just the top-level file.  This means that the compilation of all #included files and all files specified in the OBJ block of each object will be affected by these -D and -U options.

## Preprocessor Directives

PNut-TS has a pre-processor that understands a few primitive directives:

- `#define`
- `#undef`
- `#ifdef / #ifndef / #else / #endif`
- `#elseifdef / #elseifndef`
- `#error / #warn`
- `#include`
- `#pragma`

Here's more detail on each of the supported directives

If you see the similarity to the FlexSpin directive set, you are correct! This capability was patterned after the directives supported by FlexSpin so that there will be fewer compatibility issues when utilizing spin2 code with either compiler.

### Directives

#### \#define {symbol} {value}

```c++
#define FOO hello
```

Defines a new symbol `FOO` with the value `hello`. Whenever the symbol `FOO` appears in the text, the preprocessor will substitute `hello`.

Note that, unlike the traditional preprocessors, **this preprocessor** does not accept arguments. Only simple defines are permitted.

Also note that this preprocessor is case insensitive, just like spin.

If no value is given, e.g.:

```c++
#define BAR
```

then the symbol `BAR` is defined as the string `1`. This is generally useful when symbol presence is being used, not the value. That is to say that the symbol is being tested by following preprocessor directives and is not expected to be replacing text within the containing file.

#### \#ifdef {symbol}

Introduces a conditional compilation section, which is only compiled if the symbol after the `#ifdef` is in fact defined. For example:

```c++
#ifdef __P2__
'' propeller 2 code goes here
#else
'' propeller 1 code goes here
#endif
```

#### \#ifndef {symbol}

Introduces a conditional compilation section, which is only compiled if the symbol after the `#ifndef` is _not_ defined.

```c++
#ifndef __P2__
'' propeller 1 code goes here
#else
'' propeller 2 code goes here
#endif
```

*Pardon this non-traditional example, but you get the point, right?*

#### \#else

Switches the meaning of conditional compilation. Must be preceded by a `#ifdef` or a `#ifndef`.

#### \#endif

Ends the conditional compilation `#ifdef` or `#ifndef` clause.

#### \#elseifdef {symbol}

A combination of `#else` and `#ifdef`. Must be preceded by a `#ifdef` or a `#ifndef`.

#### \#elseifndef {symbol}

A combination of `#else` and `#ifndef`. Must be preceded by a `#ifdef` or a `#ifndef`.

#### \#error {msg}

Reports an error and stops the compile. Mainly used in conditional compilation to report an unhandled condition. Everything after the `#error` directive is the message; if you surround it with a matching pair of quotes, the quotes are stripped. Example:

```c++
#ifndef __P2__
#error This code only works on Propeller 2
#endif
```

`#error` and `#warn` are subject to conditional compilation like any other directive: one inside a branch that is **not** taken does not fire. That is what makes the fall-through idiom safe — an `#error` in the final `#else` of a configuration chain fires only when nothing matched:

```c++
#ifdef BOARD_A
  ' Board A settings
#elseifdef BOARD_B
  ' Board B settings
#else
#error Define exactly one of BOARD_A or BOARD_B
#endif
```

*As of v1.55.2.* Earlier versions fired `#error` and `#warn` from branches that were not taken, so the pattern above reported an error on every build regardless of which board was selected.

#### \#include "{filename}"

Includes a file. The contents of the file are placed in the compilation just as if everything in that file was typed into the original file instead.

```c++
#include "foo.spin2"
#include "bar"
```

Included files are searched in the following order:

1. **Include directories** specified via `-I <dir>` on the command line (searched first if provided)
2. **The source file's directory** (the directory containing the file with the `#include`)

The `-I` option accepts both absolute and relative paths:
- **Absolute paths**: `/home/user/libs/spin2` - used as-is
- **Relative paths**: `libs/includes` - resolved relative to the current working directory first, then relative to the source file's directory if not found

If the included file cannot be found in any of the search locations, compilation stops with an error.

NOTE: if the .spin2 suffix is not present on the filename provide in the include statement it will be appended to the name given before opening the file.  Meaning all included files will only be .spin2 files.  If any suffix is provided that is not .spin2 this will generate an error and stop the compile.

#### \#warn {msg}

`#warn` reports a warning and the compile continues; otherwise it is similar to `#error`, including the quote stripping and the branch behavior described above.

#### \#undef {symbol}

Removes a prior definition of a symbol, e.g., to undefine `FOO` do:

```c++
#undef FOO
```

Removes the user-defined symbol FOO if it was defined.

`#undef` of a symbol that was never defined is a **warning**, not an error — C specifies it as a no-op, so the compile continues and your output files are still written:

```
myfile.spin2:3:warning:#undef symbol [FOO] not found
```

*As of v1.55.2.* This means a defensive `#undef` — one written to guarantee a symbol is clear without knowing whether it was ever set — will warn on every build. An `#elseifdef` chain is already mutually exclusive and needs no such guard.

Note that #undef will not do anything if one of our built-in symbols was named.

### \#pragma statements

**Background: \#pragma** is a preprocessor directive that provides a way to give additional instructions to the compiler. It's used for compiler-specific or operating-system-specific actions, allowing control over compilation behavior beyond what's available in the standard language. Pragmas are implementation-defined, meaning their effects can vary between compilers.

The following \#pragma(s) are supported in PNut_TS:

#### \#pragma exportdef {SYMNAME}

The `exportdef` \#pragma exports the definition of the macro `SYMNAME` to other files. Normally a preprocessor macro only takes effect in the single source file in which it was defined. `#pragma exportdef` applied to the macro causes it to be exported to the global namespace, so that it will be in effect in all subsequent files, including objects.

Note that macros exported to other files by `#pragma exportdef` have lower priority than macros defined on the command line, that is, `#pragma exportdef SYMNAME ` has lower priority than `-DSYMNAME`. 

Example of `#pragma exportdef ...` use:

Top level file main.spin2:

```
#define MEMDRIVER "driver2.spin2"
#pragma exportdef MEMDRIVER

' instantiate flash.spin2 with the
' default memory driver overridden by
' MEMDRIVER

OBJ flash : "flash.spin2"
```

Subobject obj.spin2:

```
#ifndef MEMDRIVER
#define MEMDRIVER "default_driver"
#endif

OBJ driver : MEMDRIVER
```

**Note** that if there are multiple uses of `#pragma exportdef` for the same symbol, only the first one will actually be used -- that is, a macro may be exported from a file only once. 

Similarly if SYMBOL was defined on the command line (`-DSYMBOL`), then a `#pragma exportdef SYMBOL` will not have any effect.

## Diagnostics

*This section describes behavior as of v1.55.2.* Earlier versions recorded most preprocessor problems and then discarded them — a malformed directive produced no message and the build succeeded, compiling whichever lines the broken conditional happened to select.

### Message format

Preprocessor errors and warnings are written to **stderr**, one per line, in source order:

```
<filespec>:<line>:error:<message>
<filespec>:<line>:warning:<message>
```

This is the same format compilation errors use. There are no ANSI color codes, so the output can be filtered, matched or recolored by your editor or build wrapper. Every preprocessor error in a file is reported from a single build — you do not have to fix one, rebuild, and discover the next.

An error stops the compile and **the output files are deleted**, so a failed build never leaves a stale `.bin`, `.lst`, `.obj`, `.map` or `.flash` behind from an earlier run. A warning leaves the build running and the files are written normally.

### What is now caught

| Situation | Result |
| --- | --- |
| `#ifdef`/`#ifndef` never closed by `#endif` | error `Expected #ENDIF`, reported against the line that **opened** the block |
| `#else`, `#endif`, `#elseifdef` or `#elseifndef` with no open conditional | error `Must be preceeded by #IFDEF or #IFNDEF` |
| A directive that needs a symbol, written without one | error `Expected a preprocessor symbol` |
| A directive that is not recognized | error naming the directive |
| `{Spin2_vNN}` naming a version this compiler does not support | error, citing the line the directive is on |
| `#include` with an unsupported filetype, or a filename whose quotes are missing | error describing the actual problem |
| `#undef` of a symbol that was never defined | **warning**; build continues |

Bare directives — `#define`, `#ifdef`, `#include` and friends written with no argument — used to be swallowed silently, because a CON enumeration start also begins with `#`. They are now caught. Valid CON enumeration starts are unaffected.

### Wording shared with PNut

Where the original PNut has the same directive, PNut-TS uses PNut's exact message text, so a build log from either compiler matches the same search:

`Expected a preprocessor symbol` · `Must be preceeded by #IFDEF or #IFNDEF` · `Expected #ENDIF`

(The misspelling in the second is PNut's, and is reproduced deliberately.)

`#error`, `#warn`, `#include` and `#pragma` are PNut-TS extensions and use wording of their own.

### If a file that used to build now fails

That is expected for a small class of sources, and it is the reason this release exists. A stray `#endif`, an unclosed `#ifdef`, a directive missing its symbol, an unknown directive, or an unsupported `{Spin2_vNN}` all used to compile "successfully". They did not produce the program you thought they did — a broken conditional nest silently selects the wrong lines. If a source of yours starts failing here, it was very likely not compiling what you intended.

### Nesting depth

The original PNut limits conditional nesting to 8 levels. PNut-TS does not impose that limit — source nested deeper compiles here. If your source needs to build under both compilers, stay within 8 levels.

## Predefined Symbols

There are several predefined symbols:


| Symbol             | When Defined                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| `__propeller__`    | defined as 2 (for Propeller 2)
| `__P2__`           | defined as 1 (compiling for Propeller 2)
| `__propeller2__`   | defined as 1 (compiling for Propeller 2)
| `__PNUTTS__`       | defined as 1, indicating that the `PNut-TS` compiler is used
| `__DATE__`         | a string containing the date when compilation was begun
| `__FILE__`         | a string giving the current file being compiled
| `__TIME__`         | a string containing the time when compilation was begun
| `__VERSION__`      | a string containing the full version of PNut-TS in use (e.g., 'v1.43.0')
| `__DEBUG__`        | defined as 1 only if compiling debug() statements is enabled (-d given)

---

> If you like my work and/or this has helped you in some way then feel free to help me out for a couple of :coffee:'s or :pizza: slices or support my work by contributing at Patreon!
>
> [![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/ironsheep) &nbsp;&nbsp; -OR- &nbsp;&nbsp; [![Patreon](https://raw.githubusercontent.com/ironsheep/PNut-TS/main/DOCs/images/patreon.png)](https://www.patreon.com/IronSheep?fan_landing=true)[Patreon.com/IronSheep](https://www.patreon.com/IronSheep?fan_landing=true)

---

## License

Licensed under the MIT License.

Follow these links for more information:

### [Copyright](copyright) | [License](LICENSE)

[maintenance-shield]: https://img.shields.io/badge/maintainer-stephen%40ironsheep%2ebiz-blue.svg?style=for-the-badge

[license-shield]: https://img.shields.io/badge/License-MIT-yellow.svg

[Release-shield]: https://img.shields.io/github/release/ironsheep/PNut-TS/all.svg

[Issues-shield]: https://img.shields.io/github/issues/ironsheep/PNut-TS.svg

[node-badge]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
