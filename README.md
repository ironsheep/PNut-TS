# PNut reimplementation in TypeScript (PNut-TS)

![Project Maintenance][maintenance-shield]
[![License][license-shield]](LICENSE)
[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)
[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

A joint project between Chip Gracey and Stephen M Moraco.
We are re-implemting Pnut for Windows in a platform agnostic language.

**Simplified project goals**:

- Replace all use of Delphi/Pascal, x86 assembly, and SmallBASIC with pure typescript.
- Still is a command line tool (command line options may be slightly different)
- Omit editor component - is compiler only
- Also Provides downloader command line tool
- More -TBA-

**Question**? This will be both P1 and P2 compiler, right?

PNut source is current found in a Parallax Repo [P2_PNut_Public](https://github.com/parallaxinc/P2_PNut_Public)

### Repository Configuration

This project is configured to run in a docker instance. Docker is essentially a way to run stuff in a local sandboxed environment. The environment is specified by a docker image, and its main component is a snapshot of all files that are needed to run.

Linting and formatting of TypeScript is setup usong **Prettier** formatter and **ESLint**.
See [How to use Prettier with ESLint and TypeScript in VSCode](https://khalilstemmler.com/blogs/tooling/prettier/)

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
