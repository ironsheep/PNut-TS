# PNut reimplementation in TypeScript (PNut-TS)

![Project Maintenance][maintenance-shield]
[![License][license-shield]](LICENSE)
[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)
[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)


## Preprocessor Directives

PNut-TS has a pre-processor that understands a few primitive directives:

- `#define`
- `#ifdef / #ifndef / #else / #endif`
- `#elseifdef / #elseifndef`
- `#error / #warn`

Here's more detail on each of the supported directives

If you are seeing the similarity to FlexSpin directive set you are correct! This capabilty was patterned after the directives supported by FlexSpin so that there will be less compatibility issues with utilizing spin2 code with either compiler.

### Directives

#### \#define {symbol} {value}

```
#define FOO hello
```

Defines a new macro `FOO` with the value `hello`. Whenever the symbol `FOO` appears in the text, the preprocessor will substitute `hello`.

Note that unlike the traditional preprocessors, this preprocessor does not accept arguments. Only simple defines are permitted.

Also note that this preprocessor is case insensitive, just like spin.

If no value is given, e.g.:

```
#define BAR
```

then the symbol `BAR` is defined as the string `1`.  This is generally useful when symbol presence is being used, not the value.  That is to say that the symbol is being tested by following preprocessor directives and is not exptected to be replacing text within the containing file.

#### \#ifdef {symbol}

Introduces a conditional compilation section, which is only compiled if the symbol after the `#ifdef` is in fact defined. For example:

```
#ifdef __P2__
'' propeller 2 code goes here
#else
'' propeller 1 code goes here
#endif
```

#### \#ifndef {symbol}

Introduces a conditional compilation section, which is only compiled if the symbol after the `#ifndef` is *not* defined.

#### \#else

Switches the meaning of conditional compilation.

#### \#elseifdef {symbol}

A combination of `#else` and `#ifdef`.

#### \#elseifndef {symbol}

A combination of `#else` and `#ifndef`.

#### \#error {msg}

Prints an error message. Mainly used in conditional compilation to report an unhandled condition. Everything after the `#error` directive is printed. Example:

```
#ifndef __P2__
#error This code only works on Propeller 2
#endif
```

#### \#include {filename}

NOTE: this is NOT initially supported in the initial PNUTTS release but will be in a future release.

**-- NOT SUPPORTED at this time --**

Includes a file. The contents of the file are placed in the compilation just as if everything in that file was typed into the original file instead. This is often used

```
#include "foo.spin2"
```
Included files are searched for in the same directory as the file that contains the `#include`.


#### \#warn {msg}

`#warn` prints a warning message; otherwise it is similar to `#error`.

#### \#undef {symbol}

Removes the definition of a symbol, e.g. to undefine `FOO` do:

```
#undef FOO
```

## Predefined Symbols

There are several predefined symbols:

This is TBD but here's the placeholder / initial thought...

Symbol           | When Defined
-----------------|-------------
`__propeller__`  | always defined to 1 (for P1) or 2 (for P2)
`__P1__`         | only defined if compiling for Propeller 1`
`__P2__`         | only defined if compiling for Propeller 2
`__propeller2__` | only defined if compiling for Propeller 2
`__PNUTTS__`     | indicates that the `PNut-TS` compiler is used
`__PNUTTS_MAJOR__`         | always defined to the PNut-TS major version number (e.g. "5" in 5.9.26)
`__PNUTTS_MINOR__`         | always defined to the PNut-TS minor version number (e.g. "9" in 5.9.26)
`__PNUTTS_REV__`           | always defined to the PNut-TS revision number      (e.g. "26" in 5.9.26)
`__DATE__`       | a string containing the date when compilation was begun
`__FILE__`       | a string giving the current file being compiled
`__LINE__`       | the current source line number
`__TIME__`       | a string containing the time when compilation was begun
`__VERSION__`    | a string containing the full version of PNut-TS in use
`__DEBUG__`              | only if debugging is enabled (-g or -gbrk given)


---

> If you like my work and/or this has helped you in some way then feel free to help me out for a couple of :coffee:'s or :pizza: slices or support my work by contributing at Patreon!
>
> [![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/ironsheep) &nbsp;&nbsp; -OR- &nbsp;&nbsp; [![Patreon](./DOCs/images/patreon.png)](https://www.patreon.com/IronSheep?fan_landing=true)[Patreon.com/IronSheep](https://www.patreon.com/IronSheep?fan_landing=true)

---

## License

Licensed under the MIT License. <br>
<br>
Follow these links for more information:

### [Copyright](copyright) | [License](LICENSE)

[maintenance-shield]: https://img.shields.io/badge/maintainer-stephen%40ironsheep%2ebiz-blue.svg?style=for-the-badge
[marketplace-version]: https://vsmarketplacebadge.apphb.com/version-short/ironsheepproductionsllc.spin2.svg
[marketplace-installs]: https://vsmarketplacebadge.apphb.com/installs-short/ironsheepproductionsllc.spin2.svg
[marketplace-rating]: https://vsmarketplacebadge.apphb.com/rating-short/ironsheepproductionsllc.spin2.svg
[license-shield]: https://camo.githubusercontent.com/bc04f96d911ea5f6e3b00e44fc0731ea74c8e1e9/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f69616e74726963682f746578742d646976696465722d726f772e7376673f7374796c653d666f722d7468652d6261646765
[Release-shield]: https://img.shields.io/github/release/ironsheep/Pnut-ts-dev/all.svg
[Issues-shield]: https://img.shields.io/github/issues/ironsheep/Pnut-ts-dev.svg

