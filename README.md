# PNut Re-implementation in TypeScript (PNut-TS)

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/PNut-TS/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/PNut-TS/issues)

A joint project between Chip Gracey and Stephen M Moraco.
Reimplementation Pnut for Windows in a platform agnostic language.

## We welcome testing help

While this is no longer our first release, we hope is that our community can help us expand our testing beyond what we've been able to do to help us find any compilation issues we may not have found. Our regression test suite is reasonably large (*currently 180+ individual .spin2 compiles which generate coverage reports that allow us to quickly find regions of code that we haven't tested.*) but there is no such thing as too much testing!

The page [Testing PNut-TS](https://github.com/ironsheep/PNut-TS/blob/main/Testing.md) will help you learn how to test and identify what to report when you find an issue.

## Table of Contents

On this Page:

- [PNut-TS Features](#pnut-ts-features)
- [Installing PNut-TS](#installing-pnut-ts) installation notes for the supported platforms
- [Repository Configuration](#repository-configuration) - more about this Repo.

Additional pages:

- [PNut-TS Command-line](CommandLine.md) - command line reference
- [PNut-TS Preprocessor](Preprocessor.md) - conditional compilation support
- [PNut-TS Repository notes](https://github.com/ironsheep/PNut-TS/blob/main/BUILD-RUN.md) - how to build, run tests, etc.
- [PNut-TS Coverage notes](https://github.com/ironsheep/PNut-TS/blob/main/Coverage.md) - latest coverage status, how to run coverage, etc.
- [PNut-TS Project Goals](https://github.com/ironsheep/PNut-TS/blob/main/Goals.md) - our thoughts as we started this project
- [PNut-TS ChangeLog](CHANGELOG.md) - history of releases (Including what's new in this release!)
- [P2\_PNut_Public](https://github.com/parallaxinc/P2_PNut_Public) - Pnut (for Windows) source is currently found in the Parallax Repo

## PNut-TS Features

The features of this new implementation are:

- A full P2 Compiler (equivalent to PNut on Windows) for all platforms
- Written in a language which is relatively easy to maintain
- A command line tool with standard option processing
- Has a full featured light-weight [preprocessor](Preprocessor.md)
- Listing, object, and binary compatible with PNut of same version.<BR>(PNut v43, initially (at testing release), now at PNut v55 with this release.)
- A persistent object cache that skips recompiling child objects whose inputs have not changed
- Memory map files (`-m`) describing object structure and memory allocation
- Internal table-size-limits are now easy to adjust if we find a need.

## Installing PNut-TS

Install .zip files available for each release:

| Archive Name | Operating System | Architecture | Contents |
| --- | --- | --- | --- |
| pnut-ts-linux-arm64-{MMmmpp}.zip | Linux, RPi | ARM 64 bit | pnut_ts/ folder |
| pnut-ts-linux-x64-{MMmmpp}.zip | Linux | Intel x86-64 bit | pnut_ts/ folder |
| pnut-ts-macos-arm64-{MMmmpp}.zip | macOS | Apple Silicon | DMG installer |
| pnut-ts-macos-x64-{MMmmpp}.zip | macOS | Intel x86-64 bit | DMG installer |
| pnut-ts-win-arm64-{MMmmpp}.zip | Windows | ARM 64 bit | pnut_ts/ folder |
| pnut-ts-win-x64-{MMmmpp}.zip | Windows | Intel x86-64 bit | pnut_ts/ folder |

**NOTE:** *where {MMmmpp} is the packed release version. (E.g., 014303 means v1.43.3, 015107 means v1.51.7)*

Installation is pretty easy for PNut-TS. Here are the general steps: (*more specific instructions links are below.*)

- Identify and download the .zip file for your platform and architecture (from the latest release.)
- Unzip the file:
  - **Windows/Linux**: Creates a `pnut_ts/` folder containing the executable
  - **macOS**: Contains a signed and notarized DMG installer
- On **Windows**, **Linux** move the `pnut_ts/` folder to your preferred install location.<BR>On **macOS** open the DMG and drag the `pnut_ts/` folder to the /Applications folder. *(This is a signed and notarized application so it should run without Gatekeeper warnings.)*
- Setup an environment variable (typically PATH) so that the **pnut_ts** (or **pnut-ts**) executable can be referenced from anywhere.
- Run VSCode with the **Spin2 extension** (v2.3.0 or later) to ensure that the installed compiler was found.

See detailed installation instructions for; **[macOS](https://github.com/ironsheep/P2-vscode-langserv-extension/blob/main/TASKS-User-macOS.md#installing-pnut-ts-on-macos)**, **[Windows](https://github.com/ironsheep/P2-vscode-langserv-extension/blob/main/TASKS-User-win.md#installing-pnut-ts-on-windows)**, and **[Linux/RPi](https://github.com/ironsheep/P2-vscode-langserv-extension/blob/main/TASKS-User-RPi.md#installing-pnut-ts-on-rpilinux)**.

That's really all there is to it!

## Repository Configuration

This project is configured to run in a docker container. Docker is essentially a way to run stuff in a local sandboxed environment. The environment is specified by a docker image, and its main component is a snapshot of all files that are needed to run.

Wanting to clone the PNut_TS repository locally and run regression tests, or even maybe contribute to this compiler? Then start with Installing Docker Desktop to your machine. See [Overview of Docker Desktop](https://docs.docker.com/desktop/) at the Docker website.

In general if you've not used docker before you'll follow these steps to get up and running:

- Install [docker desktop](https://docs.docker.com/desktop/) - see install links on left panel
- [Clone our repository](https://github.com/ironsheep/PNut-TS/blob/main/BUILD-RUN.md)
- Open the repo in VSCode (also shown in above "clone..." page)

VSCode will tell docker what image needs to be downloaded and then it will start the container and then ask you to [Reopen in Container]. Once you do reopen VSCode will then install the NPM packages to get your local copy ready to build and run.

Linting and formatting of TypeScript is setup using **Prettier** formatter and **ESLint**.
See [How to use Prettier with ESLint and TypeScript in VSCode](https://khalilstemmler.com/blogs/tooling/prettier/)

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
