# Change Log

All notable changes to the "Pnut - A reimplementation in TypeScript" are documented in this file.

Versions are numbered `Major.PNutVersion.Patch`: the middle number is the PNut language version a release tracks (1.55.x tracks PNut v55), and the last number is ours, reset to 0 when PNut advances. New features can arrive in a patch release.

## v1.55.8 (2026-09-17)

The `.map` file is rewritten around images and instances, compile-time math and string literals match PNut exactly, and every text output the compiler writes is complete when it exits.

### Breaking Changes

- **BREAKING**: The `.map` format changed: new section names and columns, and a
  row for each image (`#1`) and each instance path (`A.LEAF`, `D[1]`).
  **Action:** update any script that parses `.map`, using
  [MAP-File-Format.md](https://github.com/ironsheep/PNut-TS/blob/main/DOCs/internals/MAP-File-Format.md).
- **BREAKING**: Upgrading discards any existing object cache; the first `--cache`
  build afterwards recompiles every object.
- **BREAKING**: An unknown or mistyped option such as `--bogus` stops with an
  error and a non-zero exit, writing nothing; it used to warn and compile
  anyway. `--help` and `--version` are unaffected.
- **BREAKING**: `-D` and `-U` reject `SYM=value` and illegal symbol names with an
  error. Such a symbol could never match `#ifdef`, so builds using one were
  already compiling the wrong branches. Both remain presence-only.
- **BREAKING**: `#if` and `#elseif` are errors, reported on their own line and
  naming `#ifdef`/`#ifndef` or `#elseifdef`/`#elseifndef`. Sources using them
  were already misread: `#if` began a `CON` enumeration and `#elseif` acted as
  `#else`.

### Fixes that change compiled output

- **A non-ASCII character in a string literal, such as `°`,** compiled one byte
  short, shifting every later address; every source byte is emitted, as PNut
  does. Pure-ASCII sources were unaffected.
- **Float literals and compile-time float math** match PNut bit for bit. About a
  quarter of literals differed in their last bit, as did many `POW`,
  `LOG`, `EXP` and operator results.
- **`QLOG` and `QEXP` in constant expressions** match PNut bit for bit; many
  inputs were off in the low bits, and `QLOG($FFFFFFFF)` folded to 0.
- **A constant expression comparing a negative number with `>` or `>=`** folds as
  a signed compare, as PNut does; `-1 > 0` folded to true.
- **`-O` without `-l`** reported success but wrote no `.obj`; the `.obj` is now
  written.

### Fixes to errors and warnings

- **A malformed float literal such as `1.5e`** is an error; it compiled silently
  as an integer followed by a stray symbol.
- **A `CON` enumeration whose first name starts with `else` or `endif`**, such as
  `ELSEWHERE`, compiles instead of failing with
  `Must be preceeded by #IFDEF or #IFNDEF`.
- **An exported preprocessor symbol (`#pragma exportdef`) written where a
  filename belongs** gets an error naming the cause, instead of
  `Invalid filename, use "FilenameInQuotes"`.
- **An unwritable output directory** is reported as an error with a non-zero
  exit, not a stack trace, and no "Wrote" line appears for a file that was not
  written.

### Fixes to reports and listings

- **`.map` for a program with an `OBJ` array** gives every element its own row
  and VAR address; an `OBJ` declared after an array no longer inherits the
  array's address.
- **`.map` for identical copies of an object, objects nested in them, and forks
  whose overrides change layout** shows each instance's own VAR base and
  addresses.
- **`.map` from a warm `--cache` build** matches an uncached build's, including
  when an earlier build without `--map` filled the cache.
- **The `.lst` listing, the `-i` preprocessed source and `--regression` reports**
  are complete when the compiler exits; a script reading one immediately could
  see it partial.

## v1.55.7 (2026-09-13)

`#include` in the file you compile builds that file.

### Fixes that change compiled output

- **`#include` in the file you compile** no longer builds the included file
  instead: silently if it has a `PUB`, otherwise as `No PUB method or DAT block
  found`. Child objects were unaffected.

## v1.55.6 (2026-09-13)

Explicit `AUGS` and `AUGD` instructions assemble correctly whatever the operand value.

### Fixes that change compiled output

- **`AUGS #value` and `AUGD #value` with bit 31 of `value` set** assembled as an
  unconditional `AUGD`, silently. Operands below `$8000_0000`, and `##`
  immediates, were unaffected.

## v1.55.5 (2026-08-30)

Cached builds with `-d` now reproduce an uncached build exactly, whichever program filled the cache first.

### Fixes that change compiled output

- **A `--cache -d` build reusing a subtree another program had cached more
  deeply** dropped that subtree's DEBUG data, shrinking the binary. Old cache
  entries are discarded automatically on upgrade.
- **A `--cache -d` hit corrected the parent's own debug references but not a
  child's**, so a nested `debug()` printed another object's message. The binary
  stayed the same size.

### Fixes to reports and listings

- **`--cache-verify` on a size-equal mismatch** printed the same byte count
  twice. It now reports the shared size and the first differing byte, numbered
  from 1 to match `cmp`.

## v1.55.4 (2026-08-24)

Cached builds now detect a change anywhere in the object tree, and `.map` files are correct when an object is used more than once.

### Breaking Changes

- **BREAKING**: Upgrading discards any existing object cache, since its on-disk
  format changed; the first `--cache` build afterwards recompiles everything.
  Some projects will also see fewer cache hits going forward — those hits were
  returning stale objects.
- **BREAKING**: A cached object is now tied to the resolution root (the
  top-level file's directory) and the active `-I` list, so two applications
  using the same library object each build and cache their own copy. This is
  what stops their `FILE` data from being swapped.
- **BREAKING**: Moving or renaming a source tree empties its cache — each
  entry records the resolved path of the files it was built from.
- **BREAKING**: `.map`'s `ADDRESS INDEX` and `SYMBOL INDEX` gain an `Instance`
  column, built per object instance rather than per source file; identical rows
  collapse into one, marked `SHARED+N`. `OBJECT DETAILS` entries change from
  `Entry $XXXXX` to `Entry +$XXXXX ($YYYYY)`. **Action:** update any `.map`
  parser — see
  [MAP-File-Format.md](https://github.com/ironsheep/PNut-TS/blob/main/DOCs/internals/MAP-File-Format.md).

### New Features

- **`--cache-verify`**: compiles twice — with and without the cache, the
  uncached reference run as a separate process — and fails the build if they
  differ. Implies `--cache`.
- **Duplicate-source warning**: names both paths when a build reaches
  byte-identical source through two different resolved paths. Declaring one
  object several times is unaffected.

### Fixes that change compiled output

- **`--cache` builds ignored an edit two or more levels down the object
  tree**, keeping stale code above it. Builds without `--cache` were always
  correct.
- **A `DAT` singleton reached both directly and through another cached
  object** could become two independent copies — separate lock, separate
  state, separate cog handle. Nothing reported it.
- **Editing a file embedded with `DAT ... FILE`, without touching the
  `.spin2` that names it,** produced a binary still carrying the old file
  contents.
- **Two applications sharing a library object that embeds a `DAT ... FILE`**
  could swap each other's embedded data on a cache hit; whichever compiled
  second received the other's binary.
- **`-F` under load** could write a zero-byte `.flash` file, so a rebuild
  appeared to fix a failure that was really intermittent.
- **A script reading `.bin`, `.obj` or `.map` right after a build** could see
  the previous run's contents or a partial file; all three are now complete
  when the compiler exits.

### Fixes to reports and listings

- **`.map` for an object declared more than once** listed only one copy, could
  attach a name to the wrong file, and could print `object_12` or drop a
  nested level entirely.
- **A `.map` `DAT` symbol** could be listed at one address in the symbol index
  and a different one — sometimes outside the object, in VAR space — in the
  object details.
- **`.map` `ADDRESS INDEX`, `SYMBOL INDEX` and `OBJECT DETAILS`** printed a
  method's slot number in the object header, not its bytecode's hub address —
  methods appeared one byte apart.
- **`SYMBOL INDEX` and `ADDRESS INDEX` for an object used more than once**
  each listed only the first copy's address, so other copies appeared nowhere.
  Both now list every instance, naming shared addresses.
- **`.map`'s `MEMORY LAYOUT` `Overrides` column** was always empty; an object
  used three times with three different `| CONST = N` overrides printed three
  identical rows.
- **`--cache --map` for an object below one that was cached** dropped its
  method listings, and a level of the hierarchy could go missing.

## v1.55.3 (2026-08-09)

Preprocessor symbol handling is corrected: `#undef` removes a symbol
completely, a `#define` value is the whole rest of the line, and function-like
defines are rejected rather than silently ignored.

### Breaking Changes

- **BREAKING**: A function-like `#define`, such as `SQ(x) ((x)*(x))`, is now an
  error — `#define does not support arguments`. It previously compiled and
  never expanded, so every use site kept the literal text. A parenthesized
  value like `MASK (1<<3)` is unaffected.
- **BREAKING**: A multi-word `#define` value now substitutes in full — `#define
  MSG hello there world` expands to all three words, matching C and FlexSpin.
  It previously kept only the first word, silently. Output changes only where a
  source relied on that truncation.

### New Features

- **`__VERSION__`** is available to the preprocessor, substituting the bare
  version string (e.g. `1.55.3`) in the top file, includes, and child objects.

### Improvements

- **`#ifdef __PNUT_TS__`** is the correct test for this compiler — note the
  underscore between `PNUT` and `TS`; `__PNUTTS__` is not defined.

### Fixes that change compiled output

- **`#undef` of a symbol defined with text** stopped `#ifdef` from seeing it,
  but left the text substitution active, so a later use still expanded to the
  old value.
- **`#undef __P2__`** and other predefined `__*__` symbols used to succeed
  silently, so every later `#ifdef __P2__` took the wrong branch. They now
  stay defined; `-D` symbols are still removable.

## v1.55.2 (2026-08-08)

Preprocessor problems are now reported instead of silently tolerated, errors are
emitted once as plain text on stderr, and a failed build no longer leaves output
files behind.

### Breaking Changes

- **BREAKING**: Malformed preprocessor directives — a stray `#endif`, an
  unclosed `#ifdef`, a directive missing its symbol, an unknown directive, or an
  unsupported `{Spin2_vNN}` — now stop the build as errors. They were recorded
  and silently discarded before, so the build succeeded on the wrong lines.

### New Features

- **Preprocessor errors and warnings** print to stderr as
  `<filespec>:<line>:error:<message>`, matching compile errors. Every error in a
  file is reported from one build.
- **An unclosed `#ifdef`/`#ifndef`** reports `Expected #ENDIF` against the line
  that opened it, instead of silently ending at EOF.
- **A bare `#define`, `#ifdef`, `#include` or similar directive** with no
  argument is now caught, instead of being read as a `CON` enumeration start.
- **A failed build** removes the `.lst`, `.map`, `.flash`, `.obj` and binary it
  would have produced, instead of leaving the previous run's stale output.
- **`Preprocessor.md` and `CommandLine.md`** now ship in every platform
  package, alongside `README.md`, `LICENSE` and this changelog.

### Improvements

- **Preprocessor diagnostics** use PNut's exact wording — `Expected a
  preprocessor symbol`, `Must be preceeded by #IFDEF or #IFNDEF` — so logs
  match across compilers.
- PNut caps preprocessor conditional nesting at 8 levels; PNut-TS deliberately
  does not adopt that limit. Source nested deeper builds here, not under PNut.

### Fixes to errors and warnings

- **`#error`/`#warn` inside an untaken `#else` branch** fired regardless of
  which branch was selected, so the documented board-selection idiom broke on
  every build.
- **`#warn`/`#error` messages** lost their first character, more with leading
  indentation; surrounding quotes are now stripped as documented.
- **An unsupported `{Spin2_vNN}`** compiled anyway, silently falling back to
  the default language level. It is now an error, citing the source line.
- **A bad `#include` argument** — unsupported filetype, or unreadable due to
  missing quotes — reported a generic `Filename missing from #include
  statement` instead of the specific cause.
- **`#pragma` with a missing symbol** reported an unsupported-pragma error
  instead of naming the missing symbol.
- **`#undef` of a symbol that was never defined** is now a warning, not an
  error — C specifies it as a no-op. The build continues and outputs are
  written.

### Fixes to reports and listings

- **Compile errors** printed twice, once to stdout and once to stderr. Only the
  stderr copy is emitted now.
- **Diagnostics** no longer contain ANSI color codes; colorizing at the source
  prevented editors and `grep` from filtering the output.

## v1.55.1 (2026-07-12)

A debug-output fix: defining both debug pins silenced debug entirely.

### Fixes that change compiled output

- **Defining both `DEBUG_PIN_TX` and `DEBUG_PIN_RX`** made the P2 transmit
  debug output on the `DEBUG_PIN_RX` pin, so the host saw nothing; the RX pin
  was stuck at 63. **Action:** remove any workaround that
  swapped the two pin values.

## v1.55.0 (2026-05-13)

PNut v55 support: existing `.spin2` sources compile unchanged and produce functionally identical output, with smaller binaries from two tighter bytecode patterns.

### Breaking Changes

- **BREAKING**: v55 bytecode is not compatible with v54a/v53/v52 interpreters.
  A binary compiled under v1.55.0 requires the v55 interpreter image shipped in
  this release; mixing v54a and v55 code on one P2 — for example dynamically
  downloaded objects — is not supported.

### New Features

- **`{Spin2_v55}`** is accepted as a version directive, admitting the same
  source surface as `{Spin2_v54}`; v55 introduces no new level-gated symbols.

### Improvements

- **Pointer `++`/`--` with a step in `[2, 33]`** encodes one byte smaller. Step
  1 is unchanged; steps of 34 or more keep the previous encoding.
- **Direct bitfield reads and writes are one byte smaller;** emission is now
  operation-aware. Compound assignments (`+=`, `~~`) are unchanged.
- **The v55 interpreter image** grew by 68 bytes over v54a's, for the expanded
  dispatch table.
- **A struct-member error** now names which field type is missing
  (`BYTE`/`WORD`/`LONG`/`STRUCT`), instead of a generic "does not contain this
  name" message.

## v1.54.7 (2026-05-09)

Cached `-d` builds no longer fail with `Invalid object image found` or lose nested objects' debug records.

### Fixes that change compiled output

- **A `-d` build with `--cache` reusing an object whose children contribute
  `debug()` records** came out 100–200 bytes short of a fresh compile, missing
  those records. Builds without `--cache` were unaffected.

### Fixes to errors and warnings

- **A `-d` build with `--cache` reusing an object that contains `debug()`** could
  fail with `Invalid object image found for file: <name>`. Builds without
  `--cache` were unaffected. **Action:** run `pnut-ts --cache-clear` once after
  upgrading.

## v1.54.6 (2026-05-09)

A `--cache` build could fail with `Invalid object image found` when a cached
object's descendants exported `#pragma exportdef` symbols.

### Fixes to errors and warnings

- **A `--cache` build reusing an object whose descendants export `#pragma
  exportdef`** could fail with `Invalid object image found`. Builds without
  `--cache` were unaffected; cached entries from earlier versions are
  invalidated automatically.

## v1.54.5 (2026-05-08)

A `--cache` build could fail with `Invalid object image found` when two
objects exported different `#pragma exportdef` symbols to a shared child.

### Fixes to errors and warnings

- **Two objects using `--cache` that exported different `#pragma exportdef`
  symbols to a shared child** could fail with `Invalid object image found`.
  Builds without `--cache` were unaffected; cached entries from earlier
  versions are invalidated automatically.

## v1.54.4 (2026-05-08)

A `-d` build with `--cache` reusing a `debug()`-calling child compiled under a
different parent could print the wrong text at runtime.

### Fixes that change compiled output

- **A `-d` build with `--cache` reusing a `debug()`-calling child under a
  different parent** printed the wrong `debug()` text at runtime. Same-parent
  recompiles were unaffected; earlier cache entries are invalidated
  automatically.

## v1.54.3 (2026-05-08)

A `-d` build with `--cache` reusing an object containing `debug()` calls could
print the wrong text at runtime.

### Fixes that change compiled output

- **A `-d` build with `--cache` reusing an object containing `debug()`
  calls** printed the wrong `debug()` text. Builds without `--cache` were
  unaffected; entries from earlier versions are invalidated automatically.

## v1.54.2 (2026-05-06)

A `--cache` build mixing `--debug` and non-debug compiles could return a
binary that would not run, and `--map` showed cached objects without their
symbols.

### Fixes that change compiled output

- **A `--cache` build mixing `--debug` and non-debug compiles** could hand
  back a binary that would not run. Single-mode builds were unaffected;
  entries from earlier versions are invalidated automatically.

### Fixes to reports and listings

- **`--map` on a build with a `--cache` hit** showed a reused object without
  its methods, DAT or VAR layout. A cold build's map was unaffected.

## v1.54.1 (2026-05-05)

`--cache-clear` now works and reports what it cleared when run without a
source file to compile.

### Fixes to reports and listings

- **`pnut-ts --cache-clear` without a source file**, with or without
  `--cache-dir`, cleared nothing and printed nothing. `--cache-clear` given
  alongside a source file was unaffected.
- **`--cache-clear`** no longer clears silently; it prints `Cleared object
  cache: <path>`.

## v1.54.0 (2026-04-23)

PNut v54 language support: STRUCT members can carry named bitfields, a
nameless single bitfield member, and `{Spin2_v54}` as a version directive.

### New Features

- **Named bitfields on STRUCT `BYTE`/`WORD`/`LONG` members**:
  `STRUCT s(LONG flags.ready[0].count[15..8])`, used as `v.flags.ready := 1`,
  as in PNut v54.
- **Nameless single `BYTE`/`WORD`/`LONG` STRUCT member**:
  `STRUCT t(LONG.ready[0])`, allowing direct bitfield access as
  `v.ready := 1`.
- **`{Spin2_v54}`** is accepted as a version directive; like PNut v54, it is
  accepted unconditionally rather than gating any syntax.

## v1.53.4 (2026-04-03)

The object cache can live in a directory of your choosing.

### New Features

- **`--cache-dir <dir>`** places the object cache somewhere other than
  `.pnut-cache` in the current directory; one shared folder maximizes hits when
  you compile from several source directories.

## v1.53.3 (2026-04-03)

A persistent object cache skips recompiling unchanged child objects, and `-d` listings show how much DEBUG capacity a program uses.

### New Features

- **`--cache` and `--cache-clear`**: a persistent object cache skips
  recompiling child objects whose preprocessed source, parameter overrides and
  compiler version are unchanged.
- **DEBUG capacity in `-d` listings**: record count against the 255 maximum
  and data bytes against the 15872 maximum, each as a percentage.

## v1.53.2 (2026-03-20)

A failed compile exits with a non-zero status and leaves no stray `.obj` behind.

### Fixes to errors and warnings

- **A compile error, a missing file or a bad option** could still exit with
  status 0, so build scripts and CI saw success. Every error path now exits
  non-zero.
- **A failed compile without `-O`** wrote a 53-byte `.obj` file anyway.

## v1.53.1 (2026-03-19)

`-I` accepts an absolute include path.

### Fixes to errors and warnings

- **`-I` with an absolute path**, such as `-I /home/user/projects/library`,
  failed to find `.spin2` files there.

## v1.53.0 (2026-03-11)

PNut v53 support, compatible with PNut_v53.exe, adding `OFFSETOF` and extensionless filenames on the command line.

### New Features

- **`OFFSETOF(struct.member)`**: a compile-time function returning a member's
  byte offset within a structure definition, as in PNut v53.
- **`{Spin2_v53}`** is accepted as a version directive.
- **A filename without its `.spin2` extension** resolves to the `.spin2` file
  if one exists in the current directory.

### Fixes to errors and warnings

- **A `{Spin2_v##}` separated from the header comments by a blank line** went
  undetected, so the file defaulted to v41 and `STRUCT`, `SIZEOF` and other
  later keywords were rejected as unrecognized.
- **An inline `{...}` comment directly followed by a value**, as in
  `long {old_value}$FF0000`, lost the value's first character and failed with
  "Undefined symbol".
- **A version-gated keyword used without the required version** reports
  `"STRUCT" requires {Spin2_v45} or later` instead of
  `Expected "=" "[" "," or end of line`.
- **A `CASE` block with something other than a colon after a match value** is
  rejected; any element used to be accepted in the colon's place.

## [1.52.2] 2026-02-26

Compilation is **62.7% faster** than v1.52.1 — a full benchmark suite that took
639 seconds now takes 239.

### Performance

- Logging calls no longer build their message strings when logging is off (-56.5%).
- Preprocessor symbol replacement is single-pass instead of one pass per symbol
  (-0.7%).
- Redundant CON block passes are skipped when every symbol resolves on the first
  one (-4.0%).
- Regular expressions are compiled once rather than per call (-0.8%).

## [1.52.1] 2026-02-14

Language support through `{Spin2_v52}`. Compatible with PNut versions through
PNut_v52a.exe; PNut_v44.exe is not supported.

**Version numbering**: the 1.52.x series aligns with PNut v52 — 1.52.0 is the
base v52 language specification, 1.52.1 corresponds to PNut_v52a.exe.

## [1.51.7] 2025-12-26

### Added

- **`-m` / `--map` writes a memory map file** (`.map`) describing the compiled
  object structure, memory allocation and multi-object relationships.

### Fixed

- **A missing `#include` file silently continued the build** instead of stopping
  it with a standard-format error.
- **`-I` include paths relative to the current working directory did not work** —
  only paths relative to the source file did.
- **`$` (DAT origin) did not work in DAT data declarations** such as
  `long value[$1F0 - $]`. It now works anywhere in a DAT block, not only in PASM
  instruction operands. _(Thank you @kaio for reporting this!)_
- **Symbol names longer than 30 characters now raise an error**, matching the
  original PNut compiler.
- Duplicate compiler error messages now carry unique error codes, so a report can
  be tied to one specific site.

## [1.51.6] 2025-09-30

### Fixed

- **Syntax errors found during initial parsing were all reported as line 1.**
  Empty debug strings, unterminated strings and malformed tokens now report the
  line they actually occur on.
- **Duplicate child objects are detected and reused again.** This optimization
  had been disabled after it caused crashes; with object references now mapped
  correctly it is back on, saving 20–50% memory on projects that use the same
  object repeatedly. Early deduplication and distiller savings are reported
  separately.

## [1.51.5] 2025-07-11

### Fixed

- Code generation for `send(...)` statements.
- Character encoding within strings, which generated bad values.
- Empty `VAR` handling.
- Object size limits raised — the original ceiling is not needed by this compiler.
- Object instance numbers in listing files are shown in hex rather than decimal,
  matching PNut v51a.

## [1.51.4] 2025-05-30

### Fixed

- The old OBJ limit was still in place — the v1.51.3 fix was incomplete
  ([#10](https://github.com/ironsheep/PNut-TS/issues/10)).

## [1.51.3] 2025-05-27

### Added

- **OBJ and DAT files can now be found through `-I` include directories**
  ([#9](https://github.com/ironsheep/PNut-TS/issues/9))
  _Requested by github user @AustinMathuw_

### Fixed

- Raised the old OBJ limit
  ([#10](https://github.com/ironsheep/PNut-TS/issues/10)).
  _(Thank you @wummi for reporting this!)_

## [1.51.2] 2025-05-19

### Fixed

- Whitespace preceding a preprocessor `#` directive is now allowed
  ([#8](https://github.com/ironsheep/PNut-TS/issues/8)).
- Compilation of a negated variable expression
  ([#8](https://github.com/ironsheep/PNut-TS/issues/8)).

_(Thank you @wummi for reporting these!)_

## [1.51.1] 2025-05-05

### Fixed

- Compile failure on post increment/decrement
  ([#7](https://github.com/ironsheep/PNut-TS/issues/7)).
  _(Thank you Macca for reporting this!)_

## [1.51.0] 2025-05-01

Language support through `{Spin2_v51}`. Compatible with PNut versions through
PNut_v51a.exe. `{Spin2_v44}` is no longer supported, following data structure
changes introduced in v45.

### Added

- **`-F` writes the `.flash` file** (equivalent to PNut's `-ci`).
- **`#pragma exportdef SYMBOL`** makes SYMBOL visible as though it had been given
  as `-DSYMBOL` on the command line, for every file compiled after the one
  containing the pragma. _Place it in the top-most file for best results._

### Changed

- Preprocessor intermediate files now end in `__pre.spin2` rather than
  `-pre.spin2`.
- `#define` is no longer affected by command-line `-U` options.

### Fixed

- **Compiling `FILE`s in a DAT section was slow**
  ([#2](https://github.com/ironsheep/PNut-TS/issues/2)).

## [1.43.3] 2024-12-14

Compatible with PNut_v43.exe.

### Added

- **`--altbin` (`-a`)** forces the output binary to use a `.binary` suffix.

### Fixed

- Empty `VAR` is now allowed ([#6](https://github.com/ironsheep/PNut-TS/issues/6)).
- Command-line `-0` option parsing
  ([#4](https://github.com/ironsheep/PNut-TS/issues/4)).

## [1.43.2] 2024-09-22

Compatible with PNut_v43.exe.

### Fixed

- Command-line option parsing on Windows and Linux.
- Elementizer problems introduced by the preprocessor changes.

### Known issues

- The compiler occasionally produces duplicate error messages.

## [1.43.1] 2024-09-17

Compatible with PNut_v43.exe.

### Fixed

- Preprocessor implementation finished (it had shipped incomplete).
- Output is cleaned up under error conditions.

### Known issues

- The compiler occasionally produces duplicate error messages.

## [1.43.0] 2024-09-11

Initial release for testing. Compatible with PNut_v43.exe.

## [0.43.1] 2024-08-30

- Fix linux x86 packaging along with install docs

## [0.43.0] 2024-08-29

- Preparation of initial release for testing

## [0.0.0] 2024-01-02

- Initial repo created
