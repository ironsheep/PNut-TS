# Pnut reimplementation in TypeScript (Pnut-TS)<br>The Compiler

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

A joint project between Chip Gracey and Stephen M Moraco.
We are re-implemting Pnut for Windows in a platform agnostic language.



## Table of Contents

On this Page:

- [Command Line Options](#command-line-options) 

Additional pages:

- [Project Readme](README.md))
- [Pnut-TS Preprocessor](Preprocessor.md) - conditional compilation support
- [P2\_PNut_Public](https://github.com/parallaxinc/P2_PNut_Public) - Pnut (for Windows) source is currently found in the Parallax Repo

## Pnut_TS Command Line

There are many command line options with which you can control the compilation:

```
Usage: Pnut-TS [optons] filename

Propeller2 spin compiler/downloader

Options:
  -V, --version               output the version number
  -b, --both                  compile with DEBUG, download to FLASH and run
  -c, --compile               compile file
  -d, --debug                 compile with DEBUG
  -f, --flash                 download to FLASH and run
  -r, --ram                   download to RAM and run
  -l, --list                  emit listing files (.lst) from compilation
  -o, --output <name>         set output filename
  -i, --interface             emit interface document files (.txt) during compilation
  -I, --Include <dir...>      add preprocessor include directories
  -U, --Undefine <symbol...>  undefine (remove) preprocessor symbol(s)
  -D, --Define <symbol...>    define (add) preprocessor symbol(s)
  --log <object...>           object (choices: "all", "elements", "parser", "resolver", "preproc")
  --regression <testName...>  testName (choices: "element", "tables", "resolver", "preproc")
  -v, --verbose               output verbose messages
  -h, --help                  display help for command
```


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
