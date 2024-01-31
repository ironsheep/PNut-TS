# Pnut reimplementation in TypeScript (Pnut-TS)

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

A joint project between Chip Gracey and Stephen M Moraco.
We are re-implemting Pnut for Windows in a platform agnostic language.

Pnut source is currently found in a Parallax Repo [P2_PNut_Public](https://github.com/parallaxinc/P2_PNut_Public)

## Table of Contents

On this Page:

- [Simplified project goals](#simplified-project-goals) 
- [Accomplishments of this port effort](#accomplishments-of-this-port-effort) 
- [Possible Futures](#possible-futures) 
- [Typescript References](#typescript-references) 
- [Extensions for viewing X86 code](#extensions-for-viewing-x86-code) 
- [Repository Configuration](#repository-configuration) 

Additional pages:

- [Pnut-TS Preprocessor](Preprocessor.md) - conditional compilation support

## Simplified project goals

**Question**? This will be both P1 and P2 compiler, right?
- Actually, this will be P2 until it is released then we'll contemplate adding P1

- Replace all use of Delphi/Pascal, x86 assembly, and SmallBASIC with pure typescript.
- Produce a command line tool (command line options may be slightly different)
- Omit editor component - this is a command line compiler only
- Provides downloader command line tool
- More -TBA-

### Accomplishments of this port effort

- Remove internal table-size-limits
- Simplify the file handling
- Provide opportunity to generate more reports and/or info about each loadable image build
- Provide opportunity to add light-weight preprocessor

### Possible Futures

Now that we have a compiler, how much more would it take to port:

- The debug display serial port listener that interprets the serial data and presents the debug windows and terms.
- The Debugger itself.
- Port the P1 compiler, auto selecting it from this compiler when asked to process .spin files.


## Typescript References

I'm usually learning as I go. I'm searching the web for best patterns of how to do "such and such". Here are a couple of quick links for getting good answers and for finding reference docs along with a few more that look to be useful:

- This is my go-to for most "remind me how to..." questions: [W3 Typescript Tutorial](https://www.w3schools.com/typescript/)
- Huh? it says this is a free course (**codeacademy.com**): [Master Typescript - Learn by Doing](https://www.codecademy.com/learn/learn-typescript) - could be good.
- The TypeScript Doc site [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- If you looking for a book "**O'Reilly - Learning TypeScript**" seems to be a good one [Book Website](https://www.learningtypescript.com/) - this website provides links to bying the book and provides accompanying exercises

## Extensions for viewing X86 code

I'm using the following extensions which make the viewing of the .asm Pnut .asm file more readable.

- [x86_64 Assembly Pro](https://marketplace.visualstudio.com/items?itemName=EhlKr.x86-64-assembly-pro)
- [ASM Code Lens](https://marketplace.visualstudio.com/items?itemName=maziac.asm-code-lens)
- [Intel x86 Instruction Reference](https://marketplace.visualstudio.com/items?itemName=whiteout2.x86ex)

Download these extensions then close all VSCode instances then open VSCode and they'll be working.


## Repository Configuration

This project is configured to run in a docker instance. Docker is essentially a way to run stuff in a local sandboxed environment. The environment is specified by a docker image, and its main component is a snapshot of all files that are needed to run.

Linting and formatting of TypeScript is setup usong **Prettier** formatter and **ESLint**.
See [How to use Prettier with ESLint and TypeScript in VSCode](https://khalilstemmler.com/blogs/tooling/prettier/)

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
