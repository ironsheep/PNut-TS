# PNut-TS - Command Line

![Project Maintenance][maintenance-shield]

[![License][license-shield]](LICENSE)

![NodeJS][node-badge]

[![Release][Release-shield]](https://github.com/ironsheep/PNut-TS/releases)

[![GitHub issues][Issues-shield]](https://github.com/ironsheep/PNut-TS/issues)

## Everyday Use of PNut-TS

Our new PNut-TS compiler will show you the following when you specify `-h` or `--help`:

```text
PNut-TS: Usage: pnut-ts [options] filename

Propeller Spin2 compiler - v1.55.4

Options:
  -V, --version               Output the version number
  -d, --debug                 Compile with DEBUG
  -l, --list                  Generate listing files (.lst) from compilation
  -m, --map                   Generate memory map file (.map) from compilation
  -v, --verbose               Output verbose messages
  -a, --altbin                Use alternate .binary name vs. .bin
  -o, --output <name>         Specify output file basename
  -i, --intermediate          Generate *__pre.spin2 after preprocessing
  -q, --quiet                 Quiet mode (suppress banner and non-error text)
  -F, --flashfile             Generate FLASH image file (.flash) suitable for
                              writing to flash chip
  -O, --obj                   Generate object files (.obj) from compilation
  -D, --Define <symbol...>    Define (add) preprocessor symbol(s)
  -U, --Undefine <symbol...>  Undefine (remove) preprocessor symbol(s)
  -I, --Include <dir...>      Add preprocessor include directories
  -C, --cache                 Enable object compilation cache
  --cache-dir <dir>           Set object cache directory (default: .pnut-cache
                              in current directory)
  --cache-clear               Clear object cache before compiling
  --cache-verify              Prove the cache is honest: also compile without
                              it and fail if the results differ (implies
                              --cache)
  --log <objectName...>       objectName (choices: "all", "outline",
                              "compiler", "elementizer", "parser", "distiller",
                              "preproc", "resolver")
  --regression <testName...>  testName (choices: "element", "resolver",
                              "preproc")
  --pass <passName...>        Stop after passName (choices: "preprocess",
                              "elementize", "con-block")
  -h, --help                  display help for command

      Example:
         $ pnut-ts my-top-level.spin2         # compile leaving .bin file
         $ pnut-ts -l my-top-level.spin2      # compile file leaving .bin and .lst files
         

pnut-ts: * Propeller Spin2/PASM2 Compiler 'pnut_ts' (c) 2024-2026 Iron Sheep Productions, LLC., Parallax Inc.
pnut-ts: * Version 1.55.4, {buildDateHere}
```

These options should already make sense but here's a light-weight recap:

| Option forms | Description |
| --- | --- |
| <pre>-d, --debug</pre> | enables generation of code for debug() statements  |
| <pre>-O, --obj,<br>-l, --list</pre> | control the generation of the additional (.lst) listing and (.obj) object files |
| <pre>-V, --version</pre> | shows the compiler version information |
| <pre>-o {filename}, --output {filename}</pre> | allows you to provide a specific filename for the .bin output file |
| <pre>-i, --intermediate</pre> | Generate `*__pre.spin2` file after preprocessing your source file
| <pre>-F, --flashfile</pre> | control the generation of the additional (.flash) flash-image file |
| <pre>-a, --altbin</pre> | use alternate `.binary` suffix vs. `.bin` |
| <pre>-m, --map</pre> | generate a memory map file (.map) describing the compiled object structure, memory allocation and multi-object relationships |
| <pre>-C, --cache,<br>--cache-dir \<dir\>,<br>--cache-clear</pre> | control the persistent object cache, which skips recompiling child objects whose inputs have not changed. As of v1.55.4 "inputs" covers the whole subtree — an object used by an object you use, and any file embedded with `DAT ... FILE` — so editing a file several levels down invalidates everything above it. Before v1.55.4 only a direct dependency was tracked. `--cache-dir` places the cache somewhere other than `.pnut-cache` in the current directory. `--cache-clear` empties it first, and works even when no source file is given. A cached object is also tied to the directory of the top-level file it was built for and the `-I` list in force, so two applications in one project each build their own copy of a shared library object. |
| <pre>--cache-verify</pre> | compile the project twice — once using the cache and once ignoring it — and fail the build if the two results differ. Implies `-C`. The uncached reference compile runs first, as a separate process, so nothing about the cached build can influence it. On success the compiler reports `Object cache verified: output matches an uncached build`; on failure it names the artifact that disagreed and exits non-zero. Use it when you suspect a cached build, or in CI on a project layout your own tests do not cover. |
| <pre>-q, --quiet,<br>-v, --verbose</pre> | control how little or how much extra messaging is output from the compiler |
| <pre>-I \<dir...\>, --Include \<dir...\>,<br>-U \<symbol...\>, --Undefine \<symbol...\>,<br>-D \<symbol...\>, --Define \<symbol...\> | Are all **preprocessor directives** where:<br> -I adds search directories containing files to be included (using `#include "filename(.spin2)"` statements, or as `files mentioned in the OBJ or DAT sections of your code`)<br> -D defines one or more symbols on the command line (*Equivalent to #define SYMBOL but affects all files in the compilation effort.*)<br> -U prevents a `#pragma exportdef` of the named symbol from taking effect, keeping that symbol private to the file that defined it.<BR>&nbsp;&nbsp;(**NOTE:** *The -U option does not remove a symbol defined with -D or #define — it only blocks the export.*) |

### Notes on the object cache

**Moving or renaming a source tree empties its cache.** A cache entry records the
resolved path of every file it was built from, so after a move those paths no
longer match and the affected objects recompile. This costs one rebuild and is
deliberate — the alternative is accepting an entry we can no longer prove is
right.

**Sharing one `--cache-dir` across different source trees is at your
discretion.** It maximizes reuse when the trees are genuinely the same code. As
of v1.55.4 a cached object is identified partly by the directory of the top-level
file it was built for and the `-I` list in force, so two applications no longer
collide on one entry for a library object they share — which matters because a
`DAT ... FILE` name resolves against the top-level file's directory, and the same
library object therefore embeds different data for each application that uses it.
What a shared cache directory still cannot distinguish is two unrelated projects
holding *different* files under the same name in the same relative position. If
your trees are unrelated, give each its own cache directory.

**The compiler warns when one build reaches the same source twice.** If two
different resolved paths hold byte-identical source — two `-I` directories each
carrying a copy of the same object, say — the compiler reports it and names both
files:

```
Duplicate source: [libA/utila.spin2] is byte-identical to [libB/utilb.spin2].
Both were compiled as separate objects. Consider referencing one copy, via -I,
so edits cannot drift between them.
```

The build still succeeds and its output is still correct. This is a structural
warning, not an error: two copies compile to two objects, and an edit to one of
them silently diverges from the other. Declaring the *same* object several times
is ordinary Spin2 and does not warn — only two distinct paths holding identical
bytes do.

**Upgrading to v1.55.4 discards any existing cache.** The on-disk format changed,
so the first compile after upgrading recompiles everything. This is intended:
entries written by earlier versions could be stale in ways those versions could
not detect.

And of course `-h` or `--help` produces the output as shown above.

**NOTE:** The `-i, or --intermediate` Option causes the post-preprocessed source file to be saved in case you want to inspect what was passed on to the compiler.  This output file has a `__pre` suffix inserted before the .spin2 extension but otherwise has the same name as your compiled file.  E.G., If you compiled `blink.spin2` your intermediate output file would be `blink__pre.spin2`.

## For PNut-TS - Developer use

There are a couple of additional options we use when testing or validating PNut_TS:

```text
  --log <objectName...>       objectName (choices: "all", "outline", "compiler", "elementizer", "parser", "distiller", "preproc", "resolver")
  --regression <testName...>  testName (choices: "element", "resolver", "preproc")
  --pass <passName...>        Stop after passName (choices: "preprocess", "elementize", "con-block")

```


The `--log {option(s)}` produce very detailed output from different sections of the compiler.

The `--regression {option(s)}` produce additional reports we use for testing/verifying the compiler.

and

The `--pass {option(s)}` are how we instruct the compiler to end after a given pass.

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
