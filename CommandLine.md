# Pnut-TS - Command Line

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/Pnut-ts-dev/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/Pnut-ts-dev/issues)

## Everyday Use of PNut-TS

Our new PNut-TS compiler will show you the following when you speicfy `-h` or `--help`:


```text 
PNut-TS: Usage: pnut-ts [optons] filename

Propeller Spin2 compiler/downloader - v0.43.0

Options:
  -V, --version               Output the version number
  -d, --debug                 Compile with DEBUG
  -l, --list                  Generate listing files (.lst) from compilation
  -O, --obj                   Generate object files (.obj) from compilation
  -o, --output <name>         Specify output file basename
  -q, --quiet                 Quiet mode (suppress banner and non-error text)
  -D, --Define <symbol...>    Define (add) preprocessor symbol(s)
  -U, --Undefine <symbol...>  Undefine (remove) preprocessor symbol(s)
  -I, --Include <dir...>      Add preprocessor include directories
  -v, --verbose               Output verbose messages
  -h, --help                  display help for command

      Example:
         $ pnut-ts my-top-level.spin2         # compile leaving .bin file
         $ pnut-ts -l my-top-level.spin2      # compile file leaving .bin and .lst files
         

pnut-ts: * Propeller Spin2/PASM2 Compiler 'pnut_ts' (c) 2024 Iron Sheep Productions, LLC.
pnut-ts: * Version 0.43.0, {buildDateHere}
```

These options should already make sense but here's a light-weight recap:

| Option forms | Description |
| --- | --- |
| -O, --obj,<br>-l, --list | control the generation of the additional listing and object files
| -V, -\-version | shows the compiler version information
| <pre>-o {filename}, --output {filename}</pre> | allows you to provide a specific filename for the .bin output file
| -q, --quiet,<br>-v, --verbose | control how little or how much extra messaging is output from the compiler
| -I \<dir...\>, --Include \<dir...\>,<br>-U \<symbol...\>, --Undefine \<symbol...\>,<br>-D \<symbol...\>, --Define \<symbol...\> | Are all proprocessor directives where -I adds search directories contining .spin2 files to be included, -D defines one or more symbols on the command line, and -U un-defines symbols from the command line.

And of course `-h` or `--help` produce the output as shown above.



## For PNut-TS developer use

There are a couple of additional options we use when testing or validating PNut_TS:

```text
  -i, --intermediate          Generate *-pre.spin2 after preprocessing
  --log <objectName...>       objectName (choices: "all", "outline", "compiler", "elementizer", "parser", "preproc", "resolver")
  --regression <testName...>  testName (choices: "element", "tables", "resolver", "preproc")
  --pass <passName...>        Stop after passName (choices: "preprocess", "elementize", "con-block")

```

The `-i, or --intermediate` Option causes the post preprocessed source file to be saved in case you want to inspect what was passed on to the compiler.  This output file has a `-pre` suffix inserted before the .spin2 extension but otherwise has the same name as your compiled file.  E.G., If you compiled `blink.spin2` your intermediate output file would be `blink-pre.spin2`.

The `--log {option(s)}` produce very detailed output from different sections of the compiler.

The `--regression {option(s)}` produce additional reports we use for testing/verifing the compiler.

and 

The `--pass {option(s)}` are how we instruct the compiler to end after a given pass.

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
