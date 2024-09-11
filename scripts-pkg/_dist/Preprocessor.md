# Pnut reimplementation in TypeScript (Pnut-TS)<br>The PNut-TS Preprocessor

![Project Maintenance][maintenance-shield]

[![License: MIT][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

## PNut-TS Preprocessor Comamnd line options

A couple of command line options affect the proprocessing:

| Option | Effect |
| --- | --- |
| <PRE>-D \<symbol></PRE> | Defines a symbol that can be tested with the `#ifdef`, `#ifndef`,  `#elseifdef` or `#elseifndef` statements |
| <PRE>-U \<symbol></PRE>  | Prevents a subsequent `#define <symbol>` found in the .spin2 code from having any effect
| <PRE>-I \<directory></PRE>  | set the folder to search within for `#include "filename(.spin2)" statements
| -- **Diagnostic Use** -- | 
| <PRE>-i, --intermediate | Generate *-pre.spin2 after preprocessing - so you can review what preprocessed source was fed to the compiler

**NOTE:** these directives apply to all .spin2 files processed in the compile effort, not just the top-level file.  This means that the compilation of all #included files and all files specified in the OBJ block of each object will be affected by the -D and -U options.

## Preprocessor Directives

Pnut-TS has a pre-processor that understands a few primitive directives:

- `#define`
- `#undef`
- `#ifdef / #ifndef / #else / #endif`
- `#elseifdef / #elseifndef`
- `#error / #warn`
- `#include`

Here's more detail on each of the supported directives

If you are seeing the similarity to FlexSpin directive set you are correct! This capabilty was patterned after the directives supported by FlexSpin so that there will be less compatibility issues with utilizing spin2 code with either compiler.

### Directives

#### \#define {symbol} {value}

```c++
#define FOO hello
```

Defines a new symbol `FOO` with the value `hello`. Whenever the symbol `FOO` appears in the text, the preprocessor will substitute `hello`.

Note that unlike the traditional preprocessors, **this preprocessor** does not accept arguments. Only simple defines are permitted.

Also note that this preprocessor is case insensitive, just like spin.

If no value is given, e.g.:

```c++
#define BAR
```

then the symbol `BAR` is defined as the string `1`. This is generally useful when symbol presence is being used, not the value. That is to say that the symbol is being tested by following preprocessor directives and is not exptected to be replacing text within the containing file.

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

Switches the meaning of conditional compilation. Must be preceeded by a `#ifdef` or a `#ifndef`.

#### \#endif

Ends the conditional compilation `#ifdef` or `#ifndef` clause.

#### \#elseifdef {symbol}

A combination of `#else` and `#ifdef`. Must be preceeded by a `#ifdef` or a `#ifndef`.

#### \#elseifndef {symbol}

A combination of `#else` and `#ifndef`. Must be preceeded by a `#ifdef` or a `#ifndef`.

#### \#error {msg}

Prints an error message. Mainly used in conditional compilation to report an unhandled condition. Everything after the `#error` directive is printed. Example:

```c++
#ifndef __P2__
#error This code only works on Propeller 2
#endif
```

#### \#include "{filename}"

Includes a file. The contents of the file are placed in the compilation just as if everything in that file was typed into the original file instead.

```c++
#include "foo.spin2"
#include "bar"
```

Included files are searched for in the same directory as the file that contains the `#include`. Or, alternatively, in an include directory provided by the compilation `-I <dir>` clause on the command line. If one or more include directories are specified then they will be searched first.

NOTE: if the .spin2 suffix is not present on the filename provide in the include statement it will be appended to the name given before opening the file.  Meaning all included files will only be .spin2 files.  If any suffix is provided that is not .spin2 this will generate an error and stop the compile.

#### \#warn {msg}

`#warn` prints a warning message; otherwise it is similar to `#error`.

#### \#undef {symbol}

Removes the definition of a symbol, e.g. to undefine `FOO` do:

```c++
#undef FOO
```

Removes the user-defined symbol FOO if it was defined.

Note that #undef will do anything if one of our built-in symbols was named.


## Predefined Symbols

There are several predefined symbols:

This is TBD but here's the placeholder / initial thought...

| Symbol             | When Defined                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| `__propeller__`    | always defined to 1 (for P1) or 2 (for P2)                              |
| `__P1__`           | only defined if compiling for Propeller 1`                              |
| `__P2__`           | only defined if compiling for Propeller 2                               |
| `__propeller2__`   | only defined if compiling for Propeller 2                               |
| `__PNUTTS__`       | indicates that the `Pnut-TS` compiler is used                           |
| `__DATE__`         | a string containing the date when compilation was begun                 |
| `__FILE__`         | a string giving the current file being compiled                         ||
| `__TIME__`         | a string containing the time when compilation was begun                 |
| `__VERSION__`      | a string containing the full version of Pnut-TS in use                  |
| `__DEBUG__`        | only if debugging is enabled (-g or -gbrk given)                        |

---

> If you like my work and/or this has helped you in some way then feel free to help me out for a couple of :coffee:'s or :pizza: slices or support my work by contributing at Patreon!
>
> [![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/ironsheep) &nbsp;&nbsp; -OR- &nbsp;&nbsp; [![Patreon](./DOCs/images/patreon.png)](https://www.patreon.com/IronSheep?fan_landing=true)[Patreon.com/IronSheep](https://www.patreon.com/IronSheep?fan_landing=true)

---

## License

Licensed under the MIT License.

Follow these links for more information:

### [Copyright](copyright) | [License](LICENSE)

[maintenance-shield]: https://img.shields.io/badge/maintainer-stephen%40ironsheep%2ebiz-blue.svg?style=for-the-badge

[license-shield]: https://img.shields.io/badge/License-MIT-yellow.svg

[Release-shield]: https://img.shields.io/github/release/ironsheep/Pnut-ts-dev/all.svg

[Issues-shield]: https://img.shields.io/github/issues/ironsheep/Pnut-ts-dev.svg

[node-badge]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white

