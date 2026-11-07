# GOLD File Regeneration Workflow

This directory contains the tooling for regenerating PNut-TS regression-test
`.GOLD` files using Windows PNut. Use it whenever a new PNut version ships
(e.g., v54 → v55) and the bytecode/listing format changes, and whenever new
fixtures need GOLDs.

## TL;DR

```bash
# Container — build the Windows folder (also regenerates every rebuild-gold.ps1)
npm run gen-regold-tarball            # writes WINDOWS-RUN/

# Windows — copy WINDOWS-RUN/ over whole, then in it:
#   powershell -ExecutionPolicy Bypass -File .\run.ps1
# and copy the whole folder back.

# Container — apply and review
npm run apply-regold-tarball -- WINDOWS-RUN
git diff --stat
```

## Files

| File | Purpose |
|---|---|
| `suites.json` | The suite table: per Windows-regen directory, the default PNut flag, the outputs captured, per-pattern and per-file flag overrides, hand skips, header notes. The one owner of each suite's default PNut flag (`scripts/fixtures/generate.js` reads it). |
| `gen-rebuild-scripts.js` | Writes every `TEST/<suite>/rebuild-gold.ps1` from `suites.json`, `scripts/fixtures/fixtures.json` and the suite's `.spin2` listing. `--check` reports a script that differs from what it would write. `npm run gen-rebuild-scripts`. |
| `rebuild-gold-lib.ps1` | Shared PowerShell engine. All per-suite scripts dot-source this. |
| `rebuild-gold-all.ps1` | Top-level driver — discovers and runs every per-suite script, writes `TEST\gold-run-summary.txt`. |
| `bundle.sh` | Container side: regenerate the per-suite scripts, then build the Windows folder (`WINDOWS-RUN/` by default). |
| `apply.sh` | Container side: take the returned folder (or a tarball of it) and copy the new or changed GOLDs and the run summary into `TEST/`. |
| `investigate-errout.ps1` | One-off diagnostic, kept for reference: compiles a few error sources and prints `Error.txt` verbatim. The question it was written for is settled: `Error.txt` has the same `path:line:error:message` format as `.errout.GOLD` (Stephen, 2026-11-04; the FVARS visit's `fvars_too_big.errout.GOLD` is one). |
| `TEST/<suite>/rebuild-gold.ps1` | Per-suite thin wrapper, **generated — do not edit**. One per Windows-regen directory. |

## End-to-end workflow

### 1. Bundle (container)

```bash
npm run gen-regold-tarball
# → regenerates TEST/*/rebuild-gold.ps1, then writes WINDOWS-RUN/
#   (--out-dir DIR for another folder; -o FILE.tar.gz to also pack it)
```

`WINDOWS-RUN/` is local (`.git/info/exclude`) and holds:
- `TEST/<suite>/` for every suite with a `rebuild-gold.ps1`: the `.spin2`
  sources, the files their `FILE "..."` directives pull in, any `gen_*.d/` aux
  folders, and the generated `rebuild-gold.ps1`
- `scripts/gold/rebuild-gold-lib.ps1` and `rebuild-gold-all.ps1`
- `run.ps1`: step 1, a three-fixture EXCEPT-tests dry run; step 2, only if
  step 1 ends `VERDICT: PASS`, the full run
- `README.txt` (three lines)

It deliberately excludes existing `.GOLD` files (the run makes them fresh),
intermediate output, `__pre.spin2`, legacy `<SUITE>-rebuild-v52/` scaffolding,
and directories without a `rebuild-gold.ps1` (see below).

An existing non-empty output folder is only rebuilt with `--replace`, and even
then not while it holds a `.GOLD` that differs from `TEST/` (a returned GOLD
not yet applied).

### 2. Run on Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

The script auto-finds the HEADLESS CLI `PNut_shell.bat` inside the v55
install directory:
`C:\Program Files (x86)\Parallax Inc\PNut_v55\PNut_shell.bat`

The binary itself has no version suffix — version is selected by which
install directory the script invokes it from. It also falls back to bare
`PNut_shell.bat` on PATH if the standard path isn't present. The GUI editor
(`PNut_v55.exe`) is *not* used — it's interactive and doesn't produce
`.lst`/`.obj`/`.bin` from the command line.

Each compile runs through `cmd /c` under a timeout (`-CompileTimeoutSeconds`,
default 60); one that overruns has its whole process tree killed
(`taskkill /T /F`) and is recorded `TIMED-OUT`, and the run continues.

Per fixture:
- **expected to compile**: the outputs (`lst`, `obj`, `bin`, and `flash` in
  FLASH-tests) are renamed to `.GOLD`;
- **expected to fail** (`-ExpectFail` in the generated script): after the
  300 ms settle, PNut's `Error.txt` is renamed to `<base>.errout.GOLD`;
- **skipped** (`-Skip`): not compiled, and its GOLDs are left in place.

Only the GOLDs of the fixtures being compiled are removed beforehand.

The run ends with a summary, written to `TEST\gold-run-summary.txt`
(gitignored): one line per fixture with its outcome — `CAPTURED`, `SKIPPED`,
`COMPILED-BUT-EXPECTED-TO-FAIL`, `FAILED-BUT-EXPECTED-TO-COMPILE`,
`NO-ERROR-TXT`, `TIMED-OUT`, `RENAME-FAILED`, `NO-OUTPUT` — the counts per
suite, and a last line `VERDICT: PASS` only when every fixture is `CAPTURED`
or `SKIPPED`.

Other ways to run, from inside the folder:

```powershell
# every suite, no dry run
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1
# a subset of suites, or of files
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1 -Suites OBJ-tests,DBG-tests
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1 -Suites EXCEPT-tests -Files fvars_too_big.spin2
# the timeout path, with a stub that never returns
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1 -Suites EXCEPT-tests -Files fvars_too_big.spin2 -PNutBinary C:\stub\hang.bat -CompileTimeoutSeconds 5
```

### 3. Apply (container)

```bash
npm run apply-regold-tarball -- WINDOWS-RUN            # or a .tar.gz of it
npm run apply-regold-tarball -- WINDOWS-RUN --dry-run  # report only
```

Before copying anything, every returned GOLD is checked: the `.spin2` beside
it in the returned folder must be byte-identical to the tree's. If any is not,
nothing is copied. Otherwise only the new or changed GOLDs, and
`gold-run-summary.txt`, are copied into `TEST/`; nothing in `TEST/` is deleted.
The report separates errout GOLDs that differ only in the machine path or line
endings (the EXCEPT harness reads them as equal) from real changes, and lists
GOLDs the tree has for a fixture the run compiled but did not return.

## Round-trip sanity check (do this before trusting v55 GOLDs)

Because v55 is an ABI-break release, a lot of GOLDs will legitimately change.
Before trusting that the regen tool is producing what it should, **regenerate
v52 GOLDs first and verify byte-identical output to the existing checked-in
GOLDs**:

```powershell
# On Windows (assuming PNut v52 is also installed)
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1 -PNutVersion 52
```

Then on the container:

```bash
npm run apply-regold-tarball -- WINDOWS-RUN --dry-run
# Expect: all GOLDs unchanged, zero diffs.
# If anything diffs, the regen tool itself has a bug — fix before regen'ing v55.
```

## Per-suite rules

The rules live in `suites.json`, derived from the corresponding
`src/tests/<suite>/pnut-ts-*.test.ts`:

- **defaultFlag**: `-c` (no debug), `-cd` (debug), or `-ci` (flash image)
- **perFileFlag**: exact filename → flag (e.g., LANG-VER's `noDebugFiles`)
- **perFilePatternFlag**: `-like` pattern → flag (e.g., COV's `debug_*`)
- **produces**: which output extensions to capture as `.GOLD` (default lst/obj/bin; FLASH adds `flash`; EXT-tests is lst+obj only)
- **skip**: files never compiled on Windows, each with a reason

Per file, whether it is expected to fail and whether its GOLD comes from PNut
come from its `scripts/fixtures/fixtures.json` row (`kind: reject`,
`goldSource: pnut-ts`) when one owns it. For hand-written EXCEPT-tests
fixtures, an existing `.errout.GOLD` means "expected to fail", and a fixture
using a preprocessor directive PNut does not have (`#include`, `#error`,
`#warn`, `#pragma`; PNut's eight are listed in `suites.json` from
`REF-V52A/p2com.asm:20094-20101`) is `pnut-ts` and skipped.

When a `.test.ts` changes its debug rules, change `suites.json` to match and
run `npm run gen-rebuild-scripts`.

## Suites NOT in Windows regen scope

| Suite | Why excluded |
|---|---|
| PREPROC-tests, FULL/preprocessTESTs | Every PREPROC fixture's `.pre.GOLD` is PNut-TS `-i` output, which PNut cannot make; its test passes `-D`/`-U`/`-I`; its errout GOLDs come from `#warn` (`suites.json` "excluded") |
| INCLUDE-tests (top level) | Tests `#include` / `-I` resolution, which PNut does not have; its `flattened/` twins are in scope |
| FULL/pnut-ts-resolver | Tests pnut-ts `--regression resolver`; pnut-ts-only output |
| CACHE-tests | Byte-equivalence (warm-vs-cold cache) self-test; no GOLDs |
| MAP-tests | No `.GOLD` files / no `rebuild-gold.ps1` |

## Adding a new test suite

1. Add the `.test.ts` file (the formal source of truth for debug rules).
2. Add the directory to `suites.json` with its rules and notes.
3. Run `npm run gen-rebuild-scripts`; `bundle.sh` then picks the suite up
   automatically via `find TEST -name rebuild-gold.ps1`.

## Legacy scaffolding (to be deleted)

The `TEST/<SUITE>/<SUITE>-rebuild-v52/rebuild-gold.ps1` directories are the
previous-generation scaffolding (one nearly-identical script per suite,
hard-coded to v52). They're gitignored (`.gitignore:293`). Once the new
workflow has been verified end-to-end, delete those directories:

```bash
find TEST -type d -name '*-rebuild-v*' -exec rm -rf {} +
```

The `.gitignore` entries for `*-rebuild-v52` can be removed at the same time.
