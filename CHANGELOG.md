# Change Log

All notable changes to the "Pnut - A reimplementation in TypeScript" are documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for reminders on how to structure this file. Also, note that our version numbering adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Known compatibility issues w/PNut

There is one issue which we are unable to address in this implementation:

1. **Floating point constants**: The mantissa (bits 22:0) can be +/- 1 ls-bit different in value (_this is a math library limitation_)

## [FutureVersions]

Work to appear in upcoming releases:

- Work on getting essential coverage completed (all code generation, less exception testing)
- Fix any bugs reported by users
- Add user-requested enhancements
- Keep up with PNut changes soon after they are released.

## [Unreleased]

## [1.55.2] 2026-08-08

Preprocessor problems are now reported instead of silently tolerated, errors are
emitted once as plain text on stderr, and a failed build no longer leaves output
files behind.

### ⚠️ Behavior change — some sources that build today will start failing

Malformed preprocessor directives used to be recorded and then discarded. They
are now errors that stop the build: a stray `#endif`, an `#ifdef` never closed, a
directive missing its symbol, an unknown directive, or a `{Spin2_vNN}` naming a
version this compiler does not support.

This is a newly *visible* restriction, not a new one. A broken conditional nest
never produced an error you would notice — it produced a clean, successful build
of the wrong lines. If a source of yours starts failing here, it very likely was
not compiling what you thought it was.

### Added

- **Preprocessor diagnostics are visible.** Errors and warnings go to stderr as
  `<filespec>:<line>:error:<message>` (or `:warning:`), in source order, matching
  the format compile errors already use. Every preprocessor error in a file is
  reported from a single build.
- **Unterminated conditionals are detected.** An `#ifdef`/`#ifndef` never closed
  by `#endif` reports `Expected #ENDIF` against the line that opened it, instead
  of quietly ending at EOF with the rest of the file's inclusion decided by a
  block the author never finished.
- **Directives written with no argument are caught.** Bare `#define`, `#ifdef`,
  `#include` and friends used to be swallowed by the CON enumeration-start
  syntax, which also begins with `#`. Valid enumeration starts are unaffected.
- **Failed builds delete their output.** A build that fails removes the `.lst`,
  `.map`, `.flash`, `.obj` and binary it would have produced. Previously the
  *previous* run's binary survived with its old timestamp, so a scripted flash
  would load stale code and you would debug a binary that did not match your
  source. The `-i` `*__pre.spin2` dump is kept — it is diagnostic output, and
  most useful right after a failure.
- **The download now includes the preprocessor and command-line references.**
  Every platform package previously carried only `README.md`, `LICENSE` and this
  changelog; `Preprocessor.md` and `CommandLine.md` now ship alongside them, so
  the reference material is in the folder with the binary rather than only on
  GitHub. Both were brought current for this release: `Preprocessor.md` gains a
  Diagnostics section describing the behavior above, and `CommandLine.md`'s help
  transcript was regenerated — it had been missing `-m`/`--map`, `-C`/`--cache`,
  `--cache-dir` and `--cache-clear` entirely.

### Fixed

- **`#error` and `#warn` fired from conditional branches that were not taken.**
  Neither was guarded by the branch test every other content-bearing directive
  uses, so the documented idiom — an `#error` in the fall-through `#else` of a
  board-selection chain — fired on *every* build regardless of which board was
  selected.
- **`#warn` and `#error` messages lost their first character.** `#warn hello`
  reported `ello`, and leading indentation shifted the text further. Surrounding
  quotes are now stripped, as the documentation always implied.
- **An illegal `{Spin2_vNN}` compiled anyway**, silently falling back to the
  default language level — so a source declaring a version this compiler does not
  support was built against a different one. It is now an error, and it cites the
  correct source line.
- **`#include` argument errors were replaced by a vaguer message.** The specific
  complaint — unsupported filetype, or a filename that could not be read because
  the quotes are missing — was overwritten by a generic "Filename missing from
  #include statement".
- **`#pragma` with a missing symbol** reported an unsupported pragma rather than
  naming the missing symbol.
- **Compile errors were printed twice**, once to stdout and once to stderr. Only
  the stderr copy is emitted now.
- **Diagnostics no longer contain ANSI color codes.** Colorizing at the source
  prevented editors, build wrappers and `grep` from filtering or recoloring the
  output; that decision belongs to whatever displays the text.

### Changed

- Diagnostics for directives the original PNut also has now use PNut's exact
  wording — `Expected a preprocessor symbol`, `Must be preceeded by #IFDEF or
  #IFNDEF`, `Expected #ENDIF` — so build logs from either compiler match the same
  search. (The misspelling in the second is PNut's, reproduced deliberately.)
  `#error`, `#warn`, `#include` and `#pragma` are PNut-TS extensions and keep
  wording of their own.
- `#undef` of a symbol that was never defined is now a **warning**, not an error
  — C specifies it as a no-op. The build continues and artifacts are written.
- PNut caps conditional nesting at 8 levels; PNut-TS deliberately does not adopt
  that limit. Source nested deeper builds here and will not build under PNut —
  see the portability note in the Preprocessor Usage Guide.

## [1.55.1] 2026-07-12

A debug-output fix: defining both debug pins silenced debug entirely.

### Fixed

- **`DEBUG_PIN_RX` overwrote the debug transmit pin.** Because `DEBUG_PIN_RX` is
  evaluated after `DEBUG_PIN_TX`, defining both — as production debug builds do —
  left the compiler emitting `_txpin_ = 63` with the documented defaults
  (`DEBUG_PIN_TX = 62`, `DEBUG_PIN_RX = 63`). The P2 transmitted on the wrong pin
  and the host saw nothing; the known workaround was to swap the two pin values.
  That workaround is no longer needed and should be removed. This also restores
  the ability to set the debug RX pin at all — it was previously stuck at 63. The
  v55 documentation was correct throughout; this was a porting error on our side.

## [1.55.0] 2026-05-13

PNut v55 support. Optimization-only at the source level — every `.spin2` file
that compiled under v54a compiles unchanged under v55 and produces functionally
identical output. The gain is smaller binaries: the compiler emits tighter
bytecode for two common patterns, multi-step `++`/`--` on pointer types and
read/write of a bitfield.

### ⚠️ Breaking — interpreter ABI

v55 bytecodes are **not compatible** with v54a/v53/v52 interpreters. Binaries
compiled under v1.55.0 require the v55 interpreter image that ships in this
release. Mixed-version code on the same P2 — for example dynamically downloaded
objects — is not supported across the v54a/v55 boundary.

### Added

- `{Spin2_v55}` accepted as a version directive. It admits the same source
  surface as `{Spin2_v54}`; v55 introduces no new level-gated symbols.

### Changed

- **Pointer inc/dec is one byte smaller** for step values in `[2, 33]`. Step 1 is
  unchanged, and steps of 34 or more use the previous encoding.
- **Bitfield reads and writes are one byte smaller.** Emission is now
  operation-aware, so a bitfield access no longer needs a trailing read/write
  byte. Compound assignments (`+=`, `~~`, and friends) are unchanged from v54a.
- **The interpreter image was rebuilt for v55** and grew by 68 bytes to make room
  for the expanded dispatch table.
- **A structure-member error message got more specific:** "Structure does not
  contain this BYTE/WORD/LONG/STRUCT name", replacing the generic "Structure does
  not contain this name". This follows the v54 addition of struct-typed struct
  members.

## [1.54.7] 2026-05-09

The real fix for the object-cache failures seen in the SD FAT32 driver suite —
the one v1.54.5 and v1.54.6 did not deliver. If you have seen `Invalid object
image found for file: <name>`, run `--cache-clear` once after upgrading.

### Fixed

- **A cached object could be patched with stale debug references, corrupting the
  binary.** When the compiler recompiles a Spin block to settle its length, the
  debug-reference bookkeeping from the discarded attempts was never dropped. On a
  later cache hit those obsolete references rewrote the wrong bytes in the cached
  binary, and the parent's compile rejected the result as `Invalid object image
  found for file: <child>`.
- **A cached object could lose its grandchildren's debug records.** Only records
  the child itself referenced were saved. Records contributed by objects *it*
  pulled in were not, so a cache hit produced a top-level binary 100–200 bytes
  shorter than a fresh compile — the compile succeeded, but the debug data was
  incomplete.

Both fixes affect what is stored in cache entries, not the on-disk format.
Entries written by v1.54.6 remain readable and are upgraded the first time they
are rewritten, but a one-time `--cache-clear` is the fastest way past an existing
`Invalid object image` failure.

### A note on v1.54.5 and v1.54.6

Those two releases fixed real defects, but neither was the cause of the SD FAT32
failures — that suite does not use the `#pragma exportdef` propagation they
addressed. If you upgraded twice chasing this bug and it persisted, that is why.
The v1.54.5 and v1.54.6 fixes are kept: the problems they solve are genuine for
projects that do lean on propagated `#pragma exportdef`.

## [1.54.6] 2026-05-09

Third fix in the object-cache series: symbols exported by a cached object's own
dependencies stopped reaching the objects compiled after it.

### Fixed

- **A cache hit could drop `#pragma exportdef` symbols contributed deeper in the
  tree.** When a cached object is reused, the objects beneath it are never
  preprocessed, so any symbol they would have exported never lands. The next
  object compiled then preprocesses against an incomplete symbol set and comes
  out structurally different from a cold build. In the SD FAT32 driver suite this
  surfaced as `Invalid object image found for file: isp_rt_utilities.spin2` on 9
  of 24 harnesses — specifically the ones that ran *after* the cache was
  populated. Cache entries now carry the symbols their subtree exported and
  replay them on a hit. Entries from earlier versions are invalidated
  automatically.

## [1.54.5] 2026-05-08

Second fix in the object-cache series: two parents exporting different symbols
could share one cache entry.

### Fixed

- **The cache did not distinguish builds that differed only by propagated
  `#pragma exportdef` symbols.** If the immediate child's own source did not test
  those symbols, its cache key was identical in both contexts — but objects
  *below* that child did test them, and compiled to different bytes. The cache
  handed one parent's object into the other parent's build, with silently wrong
  code embedded inside it. In the SD FAT32 driver suite this appeared as `Invalid
  object image found for file: isp_stack_check.spin2`. Symbols reaching a build
  from `-D` flags *and* from an ancestor's `#pragma exportdef` are now part of the
  cache key. Entries from earlier versions are invalidated automatically.

## [1.54.4] 2026-05-08

Second attempt at the garbled-`debug()`-from-cache problem: v1.54.3's fix held
only while the same parent rebuilt the object.

### Fixed

- **`debug()` output from a cached object was still garbled when a different
  parent compiled it.** Restored debug records landed at new positions, but the
  references baked into the cached binary still pointed at the old ones, so
  `debug()` calls printed whichever format string happened to occupy the slot.
  This showed up once several test harnesses shared a warm cache. Debug
  references inside a cached binary are now rewritten to match wherever the
  records actually land, and the object's checksum is recomputed so the loader
  still accepts the image. Entries from earlier versions are invalidated
  automatically.

## [1.54.3] 2026-05-08

First attempt at garbled `debug()` output from cached objects.

### Fixed

- **`debug()` output from a cached object printed the wrong text.** Every
  `debug()` call compiles to a reference into a table the compiler rebuilds from
  scratch each run. v1.54.2 stopped debug and non-debug binaries from aliasing,
  but the table contents themselves were never saved, so a reused object's
  references pointed at unrelated entries — format strings printing the wrong
  values, loop counters appearing under the wrong label. Cache entries now carry
  the records the object contributed, and a cache hit reproduces a binary
  identical to a fresh compile. A cache entry missing that data during a
  `--debug` build is now a clear error rather than a silently broken binary.
  Entries from earlier versions are invalidated automatically.

## [1.54.2] 2026-05-06

### Fixed

- **Mixing `--debug` and non-debug builds against one cache could produce a
  binary that would not run.** The cache did not distinguish the two, so a
  stripped object could be returned into a debug build or vice versa. Entries
  from earlier versions are invalidated automatically.

### Added

- **`--map` now describes cached objects properly.** Cache entries carry the
  object's symbols, so a reused object appears in the map with its methods, DAT
  and VAR layout intact instead of coming up bare. Builds that do not request a
  map pay nothing for this.

## [1.54.1] 2026-05-05

### Fixed

- `--cache-clear` now works when no source file is given — `pnut-ts --cache-clear`
  and `pnut-ts --cache-clear --cache-dir <dir>` previously did nothing at all,
  because the clear was skipped whenever compilation did not start.
- `--cache-clear` now reports what it cleared: `Cleared object cache: <abs-path>`.

## [1.54.0] 2026-04-23

PNut v54 language support: STRUCT members can now carry named bitfields.

### Added

- **Named bitfields on STRUCT `BYTE`/`WORD`/`LONG` members** —
  `STRUCT s(LONG flags.ready[0].count[15..8])`, used as `v.flags.ready := 1`
  (PNut v54 parity).
- **Nameless single `BYTE`/`WORD`/`LONG` STRUCT member** — `STRUCT t(LONG.ready[0])`,
  allowing direct bitfield access as `v.ready := 1`.
- `{Spin2_v54}` accepted as a version directive. Like PNut v54, it is accepted
  unconditionally rather than gating any syntax.

## [1.53.4] 2026-04-03

### Added

- **`--cache-dir <dir>`** places the object cache somewhere other than
  `.pnut-cache` in the current directory. Pointing every build at one shared
  cache folder maximizes hits when you compile from several source directories —
  most noticeable across a multi-suite test run.

## [1.53.3] 2026-04-03

### Added

- **Persistent object cache** (`--cache`, `--cache-clear`) skips recompiling
  child objects whose inputs have not changed. Entries are keyed on the
  preprocessed source, parameter overrides and compiler version, so a stale
  result is never reused. The payoff is largest on big projects and test suites
  where many parents share the same children.
- **Listing files now show DEBUG capacity usage** when compiling with `-d`:
  record count against the 255 maximum and data bytes against the 15872 maximum,
  each with a percentage — so you can see how close you are to the limit before
  you hit it.

## [1.53.2] 2026-03-20

### Fixed

- **The compiler could exit with status 0 after failing.** Compilation errors,
  missing files and bad options all had paths that reported success, which
  quietly broke CI pipelines and build scripts. Every error path now exits
  non-zero.
- A 53-byte `.obj` file was written when compilation failed, even without `-O`.

## [1.53.1] 2026-03-19

### Fixed

- **`-I` with an absolute path** (for example `-I /home/user/projects/library`)
  failed to find `.spin2` files there.

## [1.53.0] 2026-03-11

PNut v53 support. Compatible with PNut_v53.exe.

### Added

- **`OFFSETOF(struct.member)`** — compile-time function returning a member's byte
  offset within a structure definition (PNut v53 parity).
- `{Spin2_v53}` accepted as a version directive.
- **A filename may be given without its `.spin2` extension**, resolving to the
  `.spin2` file if one exists in the current directory.

### Fixed

- **`{Spin2_v##}` went undetected when a blank line separated it from the header
  comments**, silently defaulting the file to v41 — so `STRUCT`, `SIZEOF` and
  other later keywords came back as unrecognized in a file that plainly declared
  its version.
- **An inline `{...}` comment ate the first character after its closing brace**,
  so `long {old_value}$FF0000` produced a cryptic "Undefined symbol" error.
- **A version-gated keyword used without the required version** now reports
  `"STRUCT" requires {Spin2_v45} or later` instead of the misleading
  `Expected "=" "[" "," or end of line`.
- CASE block parsing now validates the colon token rather than accepting any
  element in its place.

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
