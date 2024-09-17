# PNut Reimplementation in TypeScript (PNut-TS)

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/PNut-TS/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/PNut-TS/issues)

A joint project between Chip Gracey and Stephen M Moraco.
Reimplementation Pnut for Windows in a platform agnostic language.

## Table of Contents

On this Page:

- [PNut-TS Features](#pnut-ts-features)
- [Installing PNut-TS](#installing-pnut-ts) installation notes for the supported platforms

Additional pages:

- [PNut-TS Command-line](CommandLine.md) - command line reference
- [PNut-TS Preprocessor](Preprocessor.md) - conditional compilation support
- [PNut-TS ChangeLog](CHANGELOG.md) - history of releases

## PNut-TS Features

The features of this new implementation are:

- A full P2 Compiler (equivalent to PNut on Windows) for all platforms
- Written in a language which is relatively easy to maintain
- A command line tool with standard option processing
- Has a full featured light-weight [preprocessor](Preprocessor.md)
- Listing, object, and binary compatible with PNut of same version.<BR>(PNut v43, initially (at testing release), upgraded to PNut v45 before formal release.)
- Internal table-size-limits are now easy to adjust if we find a need.

## Installing PNut-TS

Installation is pretty easy for PNut-TS.

- Identify and download the .zip file for your platform and architecture (from the latest release.)
- unzip the file, creates a folder (or .dmg)
- On **Windows**, **Linux** move the folder to the install location.<BR>On **macOS** double-click on the .dmg then from within the window drag the folder to the /Applications folder.
- Setup and enviroment variable (typically PATH) so that the **pnut_ts** executable can be referenceed from anywhere.
- Run VSCode with the **Spin2 v2.3.0 extension** (when it's released) to ensure that the installed **pnut_ts** was found.

See detailed installation instructions for; **macOS**, **Windows**, and **Linux/RPi**. (*These will be links to pages, shortly*)

That's really all there is to it!

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

[Release-shield]: https://img.shields.io/github/release/ironsheep/PNut-TS/all.svg

[Issues-shield]: https://img.shields.io/github/issues/ironsheep/PNut-TS.svg

[node-badge]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
