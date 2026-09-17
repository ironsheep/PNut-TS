# GOLD File Regeneration Workflow

This directory contains the tooling for regenerating PNut-TS regression-test
`.GOLD` files using Windows PNut. Use it whenever a new PNut version ships
(e.g., v54 → v55) and the bytecode/listing format changes.

## TL;DR

```bash
# Container — bundle and ship
npm run gen-regold-tarball

# (transfer to Windows, run on Windows, transfer output back — see below)

# Container — apply and review
npm run apply-regold-tarball -- regold-output-v55.tar.gz
git diff --stat
```

## Files

| File | Purpose |
|---|---|
| `rebuild-gold-lib.ps1` | Shared PowerShell engine. All per-suite scripts dot-source this. |
| `rebuild-gold-all.ps1` | Top-level driver — discovers and runs every per-suite script. |
| `bundle.sh` | Container side: package TEST sources + scripts into a Windows-ready tarball. |
| `apply.sh` | Container side: take Windows output tarball, lay GOLDs into TEST/, summarize diffs. |
| `investigate-errout.ps1` | One-off diagnostic: capture Windows PNut Error.txt format for a small set of error tests. Used to determine whether EXCEPT-tests can become a Windows-regen target. |
| `TEST/<suite>/rebuild-gold.ps1` | Per-suite thin wrapper. One per Windows-regen-eligible test directory. |

## End-to-end workflow

### 1. Bundle (container)

```bash
npm run gen-regold-tarball
# → produces regold-bundle-v55.tar.gz (version inferred from package.json)
```

The bundle contains:
- All `.spin2` source files for Windows-regen-eligible suites
- All per-suite `rebuild-gold.ps1` scripts
- The shared engine + driver
- `manifest.json` (version + suite list)
- `README.txt` (Windows-side instructions)

The bundle deliberately excludes:
- Existing `.GOLD` files (regen produces them fresh on Windows)
- Intermediate output (`.lst`, `.obj`, `.bin`, `.flash`, `.elem`, `__pre.spin2`)
- Suites with no Windows GOLDs (PREPROC, EXCEPT, FULL/, SHORT/, INCLUDE, CACHE)
- Legacy `<SUITE>-rebuild-v52/` scaffolding

### 2. Run on Windows

Copy the tarball to your Windows box, then:

```powershell
tar xf regold-bundle-v55.tar.gz
cd regold-bundle-v55
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1
```

The script auto-finds the HEADLESS CLI `PNut_shell.bat` inside the v55
install directory:
`C:\Program Files (x86)\Parallax Inc\PNut_v55\PNut_shell.bat`

The binary itself has no version suffix — version is selected by which
install directory the script invokes it from. It also falls back to bare
`PNut_shell.bat` on PATH if the standard path isn't present. The GUI editor
(`PNut_v55.exe`) is *not* used — it's interactive and doesn't produce
`.lst`/`.obj`/`.bin` from the command line.

After it finishes:

```powershell
tar czf regold-output-v55.tar.gz TEST/
```

### 3. Apply (container)

```bash
npm run apply-regold-tarball -- regold-output-v55.tar.gz
```

This stages the bundle into a temp dir, prints a per-suite diff summary
(unchanged / changed / new / missing), prompts for confirmation, then copies
into `TEST/`. Run `git diff --stat` afterward to review.

## Round-trip sanity check (do this before trusting v55 GOLDs)

Because v55 is an ABI-break release, a lot of GOLDs will legitimately change.
Before trusting that the regen tool is producing what it should, **regenerate
v52 GOLDs first and verify byte-identical output to the existing checked-in
GOLDs**:

```powershell
# On Windows (assuming PNut_v52.exe is also installed)
powershell -ExecutionPolicy Bypass -File scripts\gold\rebuild-gold-all.ps1 -PNutVersion 52

tar czf regold-output-v52.tar.gz TEST/
```

Then on the container:

```bash
npm run apply-regold-tarball -- regold-output-v52.tar.gz --dry-run
# Expect: all GOLDs unchanged, zero diffs.
# If anything diffs, the regen tool itself has a bug — fix before regen'ing v55.
```

The dry-run prints the summary without copying.

## Per-suite rules

Each `TEST/<suite>/rebuild-gold.ps1` declares its own per-suite Windows
compile rules — derived from the corresponding `src/tests/<suite>/pnut-ts-*.test.ts`.
The rules captured are:

- **Default flag**: `-c` (no debug), `-cd` (debug), or `-ci` (flash image)
- **Per-file overrides**: exact filename → flag (e.g., LANG-VER's `noDebugFiles`)
- **Per-pattern overrides**: glob pattern → flag (e.g., COV's `debug_*`)
- **Produces**: which output extensions to capture as `.GOLD` (default lst/obj/bin; FLASH adds `flash`; EXT-tests is lst+obj only)

When a `.test.ts` file changes its debug rules, the corresponding
`rebuild-gold.ps1` should be updated to match.

## Suites NOT in Windows regen scope

| Suite | Why excluded |
|---|---|
| PREPROC-tests, FULL/preprocessTESTs | Test pnut-ts preprocessor — Windows PNut doesn't have the same preprocessor capability |
| EXCEPT-tests | Errout GOLDs are pnut-ts-derived (gcc-style `path:line:error:message`); Windows PNut produces a different format. See `investigate-errout.ps1` for the open format question. |
| INCLUDE-tests | Tests `-I` resolution; no GOLDs to regenerate |
| FULL/pnut-ts-resolver | Tests pnut-ts `--regression resolver`; pnut-ts-only output |
| CACHE-tests | Byte-equivalence (warm-vs-cold cache) self-test; no GOLDs |
| ALLCODE-tests, MAP-tests | No `.GOLD` files / no `rebuild-gold.ps1` |

## Adding a new test suite

When adding a new test directory under `TEST/`:

1. Add the `.test.ts` file (the formal source of truth for debug rules).
2. Create `TEST/<new-suite>/rebuild-gold.ps1` mirroring the rules. Use the
   nearest-match existing per-suite script as a template.
3. Run `npm run gen-regold-tarball` — `bundle.sh` will discover the new script
   automatically via `find TEST -name rebuild-gold.ps1`.

## Investigation script

`investigate-errout.ps1` is a one-shot diagnostic, not part of the regen
workflow. Run it once on Windows to capture exactly what `Error.txt` Windows
PNut produces for the 7 EXCEPT test sources plus the CON `symbol_length_test`.
The output (JSON summary) tells us whether EXCEPT-tests can become a
Windows-regen target or must stay pnut-ts-derived.

```powershell
# On Windows
powershell -ExecutionPolicy Bypass -File scripts\gold\investigate-errout.ps1
```

Paste the JSON output back to settle the EXCEPT format question.

## Legacy scaffolding (to be deleted)

The `TEST/<SUITE>/<SUITE>-rebuild-v52/rebuild-gold.ps1` directories are the
previous-generation scaffolding (one nearly-identical script per suite,
hard-coded to v52). They're gitignored (`.gitignore:293`). Once the new
workflow has been verified end-to-end, delete those directories:

```bash
find TEST -type d -name '*-rebuild-v*' -exec rm -rf {} +
```

The `.gitignore` entries for `*-rebuild-v52` can be removed at the same time.
