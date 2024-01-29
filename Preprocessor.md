# Pnut reimplementation in TypeScript (Pnut-TS)

![Project Maintenance][maintenance-shield]

[![License: MIT][license-shield]](LICENSE)

![NodeJS][node-basge]

[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

## Preprocessor Directives

Pnut-TS has a pre-processor that understands a few primitive directives:

- `#define`
- `#ifdef / #ifndef / #else / #endif`
- `#elseifdef / #elseifndef`
- `#error / #warn`

Here's more detail on each of the supported directives

If you are seeing the similarity to FlexSpin directive set you are correct! This capabilty was patterned after the directives supported by FlexSpin so that there will be less compatibility issues with utilizing spin2 code with either compiler.

### Directives

#### \#define {symbol} {value}

```c++
#define FOO hello
```

Defines a new macro `FOO` with the value `hello`. Whenever the symbol `FOO` appears in the text, the preprocessor will substitute `hello`.

Note that unlike the traditional preprocessors, this preprocessor does not accept arguments. Only simple defines are permitted.

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

#### \#else

Switches the meaning of conditional compilation.

#### \#elseifdef {symbol}

A combination of `#else` and `#ifdef`.

#### \#elseifndef {symbol}

A combination of `#else` and `#ifndef`.

#### \#error {msg}

Prints an error message. Mainly used in conditional compilation to report an unhandled condition. Everything after the `#error` directive is printed. Example:

```c++
#ifndef __P2__
#error This code only works on Propeller 2
#endif
```

#### \#include {filename}

NOTE: this is NOT initially supported in the initial PNUTTS release but will be in a future release.

**-- NOT SUPPORTED at this time --**

Includes a file. The contents of the file are placed in the compilation just as if everything in that file was typed into the original file instead. This is often used

```c++
#include "foo.spin2"
```

Included files are searched for in the same directory as the file that contains the `#include`.

#### \#warn {msg}

`#warn` prints a warning message; otherwise it is similar to `#error`.

#### \#undef {symbol}

Removes the definition of a symbol, e.g. to undefine `FOO` do:

```c++
#undef FOO
```

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
[node-basge]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
