# PNut TS - Packaging Study


![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]


## Table of Contents

On this Page:

- ...

Additional pages:

- [PNut TS](README.md) - Top repository page
- [Pnut-TS Preprocessor](Preprocessor.md) - conditional compilation support
- [P2\_PNut_Public](https://github.com/parallaxinc/P2_PNut_Public) - Pnut (for Windows) source is currently found in the Parallax Repo

## Distributions Goals

- As NPM package so we can include on servers, esp8266 wifi module (has command line tool too)
- As Standalone executable so Node JS environment need not be setup for use.
- Inital distribution will be under Iron Sheep Productions, LLC (ISP) accounts. Will be transferred to Parallax when in stable condition or at some point to be determined jointly by Parallax and ISP.

## Findings

- use [pkg](https://www.npmjs.com/package/pkg) for building standalone distributions for each platform (likely way we get a build for Windows on macOS M2.)
- use [esbuild](https://esbuild.github.io/) to reduce package content size in preparation for distribution.
- More to study: 
  - [Best practices for creating a modern npm package with security in mind](https://snyk.io/blog/best-practices-create-modern-npm-package/)   



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

