# PNut Reimplementation in TypeScript (PNut-TS)

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/PNut-TS/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/PNut-TS/issues)

A joint project between Chip Gracey and Stephen M Moraco.
Reimplementation Pnut for Windows in a platform agnostic language.

## We are inviting testing help

v1.43.0 is an early release inviting testing of the v43 compaitbility. The hope is that our community can help us expand our initial testing beyond what we've been able to do to help us
find any compilation issues we may not have found.

The page [Testing PNut-TS v1.43.0](Testing.md) will help you learn how to test and identify what to report when you find an issue. 


## Table of Contents

On this Page:

- [PNut-TS Features](#pnut-ts-features)
- [Installing PNut-TS](#installing-pnut-ts) installation notes for the supported platforms
- [Repository Configuration](#repository-configuration) - more about this Repo.

Additional pages:

- [PNut-TS Command-line](CommandLine.md) - command line reference
- [PNut-TS Preprocessor](Preprocessor.md) - conditional compilation support
- [PNut-TS Repository notes](BUILD-RUN.md) - how to build, run tests, etc.
- [PNut-TS Coverage notes](Coverage.md) - latest coverage status, how to run coverage, etc.
- [PNut-TS Project Goals](Goals.md) - our thoughts as we started this project
- [PNut-TS ChangeLog](CHANGELOG.md) - history of releases
- [P2\_PNut_Public](https://github.com/parallaxinc/P2_PNut_Public) - Pnut (for Windows) source is currently found in the Parallax Repo

## PNut-TS Features

The features of this new implementation are:

- A full P2 Compiler (equivalent to PNut on Windows) for all platforms
- Written in a language which is relatively easy to maintain 
- A command line tool with standard option processing
- Has a full featured light-weight [preprocessor](Preprocessor.md)
- Listing, object, and binary compatible with PNut of same version.<BR>(PNut v43, initially (at testing release), upgraded to PNut v45 before formal release.)
- Internal table-size-limits are now easy to adjust if we find a need.

## Installing PNut-TS

Install .zip files available for each release:

| Archive Name | Operating System | Architecture | Unpack Leaves
| --- | --- | --- | --- |
| linux-arm64.zip | Linux, RPi | Arm 64 bit | pnut_ts/
| linux-x64.zip| Linux | Intel x86-64 bit | pnut_ts/
| macos-arm64.zip| MacOS | Arm 64 bit | macos-arm64.dmg
| macos-x64.zip| MacOS | Intel x86-64 bit | macos-x64.dmg
| win-arm64.zip| Windows | Arm 64 bit | pnut_ts/
| win-x64.zip| Windows | Intel x86-64 bit | pnut_ts/

Installation is pretty easy for PNut-TS.

- Identify and download the .zip file for your platform and architecture (from the latest release.)
- unzip the file, creates a folder (or .dmg)
- On **Windows**, **Linux** move the folder to the install location.<BR>On **macOS** double-click on the .dmg then from within the window drag the folder to the /Applications folder.
- Setup and enviroment variable (typically PATH) so that the **pnut_ts** executable can be referenceed from anywhere.
- Run VSCode with the **Spin2 v2.3.0 extension** (when it's released) to ensure that the installed **pnut_ts** was found.

See detailed installation instructions for; **[macOS](https://github.com/ironsheep/P2-vscode-langserv-extension/blob/main/TASKS-User-macOS.md#installing-pnut-ts-on-macos)**, **[Windows](https://github.com/ironsheep/P2-vscode-langserv-extension/blob/main/TASKS-User-win.md#installing-pnut-ts-on-windows)**, and **[Linux/RPi](https://github.com/ironsheep/P2-vscode-langserv-extension/blob/main/TASKS-User-RPi.md#installing-pnut-ts-on-rpilinux)**. 

That's really all there is to it!

## Repository Configuration

This project is configured to run in a docker container. Docker is essentially a way to run stuff in a local sandboxed environment. The environment is specified by a docker image, and its main component is a snapshot of all files that are needed to run.

Wanting to clone the PNut_TS repository locally and run regression tests, or even maybe contribute to this compiler? Then start with Installing Docker Desktop to your machine. See [Overview of Docker Desktop](https://docs.docker.com/desktop/) at the Docker website.

In general if you've not used docker before you'll follow these steps to get up and running:

- Install [docker desktop](https://docs.docker.com/desktop/) - see install links on left panel
- [Clone our repository](BUILD-RUN.md)
- Open the repo in VSCode (also shown in above "clone..." page)

VSCode will tell docker what image needs to be downloaded and then it will start the container and then ask you to [Reopen in Container]. Once you do reopen VSCode will then install the NPM packages to get your local copy ready to build and run.

Linting and formatting of TypeScript is setup using **Prettier** formatter and **ESLint**.
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

[Release-shield]: https://img.shields.io/github/release/ironsheep/PNut-TS/all.svg

[Issues-shield]: https://img.shields.io/github/issues/ironsheep/PNut-TS.svg

[node-badge]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
