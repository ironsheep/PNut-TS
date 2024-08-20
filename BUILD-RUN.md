# Pnut-TS Repository Build and test Notes

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

A joint project between Chip Gracey and Stephen M Moraco.
We are re-implemting Pnut for Windows in a platform agnostic language.

## Starting with this Repository

## Prerequisites

This repositor uses docker container as the work environment. Make sure you have docker desktop installed and running.

### Step 1
- Clone this repository.  
- Open root directory in VSCode. 
- When prompted by VSCode, press [Reopen in container]

I use:

```bash
$ cd {workingFolder} # folder in which to place new cloneFolder
$ git clone git@github.com:ironsheep/Pnut-ts-dev.git
$ cd {workingFolder}/{cloneFolder}
$ code .  # to open cloneFolder
```

### Step 2
Install necessary modules

```bash
$ npm install
```

### Step 3
Do a test lint & build on the project. 

```bash
$ npm run build
```
You can see available scripts in the package.json by entering:

```bash
$ npm run
```

## Container Built-in Commands

We have a number of built-in commands we use to build code, lint our code, format our code, run tests, etc.

 These commands are run with `npm {command}`.

Lifecycle Scripts:

| Command | Description
| --- | --- |
| start | compile and run pnut-ts.js
| build | lighter-weight build
| test | run the regression tests to ensure all the files still build and the results are correct as compared against the golden files


 These commands are run with `npm run {command}`.

| Command | Description
| --- | --- |
| build | compile all the typescript source in project
| watch | watch for typescript files and recompile when any change
| prettier-format | reformat all the typescript source in project<br>We will keep this list up-to-date as more commands are added.
| build-dist | build the distribution packages


### Internal Commands

These are used by other commands:

| Internal Commands | Description
| --- | --- |
| lint | run lint against all the typescript source in project
| pretest | runs compile and lint before the tests start

### Coverage Testing

The coverage environment must be setup for running the coverage tests. 

| Coverage Commands | Description
| --- | --- |
| npm run cov-setup | prepare scripts and folders in order to run coverage
| npm run coveage | run the coverage tests and generate HTML reports
| npm run cov-teardown | restore scripts and folder to their non-coverage state




## Reminder getting latest from repository

Assuming you don't havve any uncommitted changes in your workspace then the following steps will make sure you have the latest and greatest contents.

1. Ensure you have VSCode shut down (all instances)
2. From the top of the local repository run `git pull`
3. From the same top run `code .`
4. Once VSCode opens, wait for the [Reload in Container] button to appear. Press it when it does. Wait for the environment to settle down again...
5. In the VSCode terminal window, run `npm test` to ensure the latest code is building and all the tests are running
6. You are ready to resume work with the newest repo content

### Steps if you have local changes

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

[license-shield]: https://img.shields.io/badge/License-MIT-yellow.svg

[Release-shield]: https://img.shields.io/github/release/ironsheep/Pnut-ts-dev/all.svg

[Issues-shield]: https://img.shields.io/github/issues/ironsheep/Pnut-ts-dev.svg
