# Pnut reimplementation in TypeScript (Pnut-TS)

![Project Maintenance][maintenance-shield]
[![License][license-shield]](LICENSE)
[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)
[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

A joint project between Chip Gracey and Stephen M Moraco.
We are re-implemting Pnut for Windows in a platform agnostic language.

## Project Built-in Commands

We have a number of built-in commands we use to build code, lint our code, format our code, run tests, etc.

 These commands are run with `npm {command}`.

Lifecycle Scripts:

| Command | Description
| --- | --- |
| start | compile and run pnut-ts.js
| test | run all the tests



 These commands are run with `npm run {command}`.

| Command | Description
| --- | --- |
| compile | compile all the typescript source in project
| watch | watch for typescript files and recompile when any change
| prettier-format | reformat all the typescript source in project
We will keep this list up-to-date as more commands are added.

### Internal Commands

These are used by other commands:

| Internal Commands | Description
| --- | --- |
| lint | run lint against all the typescript source in project
| pretest | runs compile and lint before the tests start

## Reminder getting latest from repository

Assuming you don't havve any uncommitted changes in your workspace then the following steps will make sure you have the latest and greatest contents.

1. Ensure you have VSCode shut down (all instances)
2. from the top of the local repository run `git pull`
3. from the top run `code .`
4. one VSCode opens, wait for the [Reload in Container] button to appear. Press it when it does. Wait for the environment to settle down again...
5. run `npm test` to ensure the latest code is building and all the tests are running
6. You are ready to resume work with the newest repo content

### Steps if yu have local changes

This section TBA (to be added)

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
[license-shield]: https://camo.githubusercontent.com/bc04f96d911ea5f6e3b00e44fc0731ea74c8e1e9/68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f6c6963656e73652f69616e74726963682f746578742d646976696465722d726f772e7376673f7374796c653d666f722d7468652d6261646765
[Release-shield]: https://img.shields.io/github/release/ironsheep/Pnut-ts-dev/all.svg
[Issues-shield]: https://img.shields.io/github/issues/ironsheep/Pnut-ts-dev.svg
