# Test Suite Punch List

Items deferred from the v1.54.3 cache-fix release that need follow-up. These
were uncovered while auditing `npm run test-full` and `npm run audit-errors`
before release. None block the v1.54.3 fix; all should be addressed before
they accumulate further.

---

## Status index (2026-09-14)

**Compiled output** asks one question: does this item mean the compiler can
produce a wrong program (`.bin` / `.obj` / `.flash`)?

| # | Item | Compiled output | Status |
|---|---|---|---|
| 1 | QLOG/QEXP compile-time precision | **YES** | open — CORDIC port recommended |
| 2 | Stale preprocessor GOLDs | no | open — decision (a)/(b) |
| 4 | Dead flash/RAM download code | no | open |
| 5 | Object-cache hardening | no observed defect | open, deferred by trigger |
| 6 | GOLD-regen workflow cleanup | no | open — triggers passed, outcomes unrecorded |
| 9 | `dumpTables` + `-I` relative path | **YES** (9.1 = item 1) | open |
| 10 | Language-spec extraction pipeline | no | open — Stephen's decision |
| 11 | `#pragma exportdef` value | no wrong code | open — Stephen's decision |
| 13 | Documentation residue (13a, 13d) | no | open |
| 14 | Test-harness items | no | **in sprint: Map-Instance-Correctness** |
| 15 | Preprocessor diagnostics | **15a YES in effect** | open |
| 16 | MAP tests lack STRUCTs | no | **in sprint: Map-Instance-Correctness** |
| 19 | Coverage gate unmeetable | no | open |
| 20 | `.map` VAR bases / OBJ arrays | no (map only) | **in sprint: Map-Instance-Correctness** |
| 21 | WUMMI Group B divergence from PNut | **POSSIBLY** | **deferred — re-verify first** |
| 22 | `.lst`/`.pre` unawaited streams | no | **in sprint: Map-Instance-Correctness** |
| 23 | `RELEASE-PROCESS.md` wrong release-build step | no | open |

---

## 1. `op_qlog` / `op_qexp` saturation precision bug

> **Compiled output: YES** — wrong compile-time constants, silently.

**Surfaced by:** `pnut-ts-resolver.test.ts` against `dumpTables.spin2`. After
filtering header lines, exactly **one** assertion mismatches the GOLD:

```
[039] 0xFFFFFFFF, 0x00000000, op_qlog = 0x00000000   ← PNut-TS
[039] 0xFFFFFFFF, 0x00000000, op_qlog = 0xFFFFFFFF   ← PNut (GOLD)
```

**Root cause:** `spinResolver.ts:11319-11328`. For input `$FFFFFFFF`,
`Math.log2(0xFFFFFFFF) ≈ 32.0`, `× 2^27 = 0x100000000`, BigInt-truncated, then
masked to 32 bits → `0x00000000`. PNut clamps the saturated case to
`0xFFFFFFFF`. The author left a warning comment acknowledging the precision
gap (`+/- 2 bits`) and that it might cause regression failures.

**Symmetric concern:** `op_qexp` at `spinResolver.ts:11332-11339` carries the
same warning (`+/- 3 bits`) but no regression failure has been observed for
it yet — could be that the resolver fixture doesn't exercise the saturation
boundary. Worth reviewing both together.

**User-visible impact:** any compile-time constant expression using
`QLOG($FFFFFFFF)` (or values whose `log2 × 2^27` exceeds `2^32`) silently
produces the wrong constant. Probability: low (most constants don't sit on
the saturation boundary), but the failure mode is silent corruption.

**Suggested fix:** clamp the result to `0xFFFFFFFF` instead of letting it
overflow-then-mask. Verify against the same set of inputs PNut's CORDIC
QLOG/QEXP handles. Add explicit edge-case test entries to the resolver
regression suite (current suite catches it almost by accident).

---

## 2. Stale preprocessor GOLDs

> **Compiled output: no** — us-vs-us preprocessor snapshots (`TEST/PREPROC-tests/*.pre.GOLD`); decision (a)/(b) below still open.

**Surfaced by:** `pnut-ts-preproc.test.ts` — three failures: `condCode`,
`condCodeElse`, `include`. GOLDs date from January 2024.

**Root cause — two intertwined issues:**

1. **Format change.** The preprocessor's output format intentionally changed
   to *retain* preprocessor-directive lines as comments (e.g. `' #define
   CLOCK_200MHZ` shows on the source-line where the directive lived) instead
   of dropping them entirely. This makes downstream error reporting more
   useful. The Jan 2024 GOLDs reflect the old "directive lines stripped"
   format.

2. **CON-only fixture sources fail compile.** `condCode.spin2`,
   `condCodeElse.spin2`, and `include.spin2` are CON-only test files (no
   `PUB` or `DAT`) — legal as imported objects but not as top-level. The
   compiler now correctly errors with `No PUB method or DAT block found`.
   The `.pre` report has already been emitted by the time that error fires,
   so the report itself is fine — but the spurious error in the test output
   muddies diagnosis.

**Suggested fix:** decide whether to (a) regenerate `.pre.GOLD` files from
current output and treat going forward as us-vs-us snapshots that we own
end-to-end, or (b) follow the same logic as the deleted `--regression
tables` apparatus and drop preprocessor-vs-GOLD comparison entirely (the
preprocessor is exercised through every `*.spin2` compile in the regular
regression suite — its correctness is implicitly tested). Option (a) keeps
a focused regression for the preprocessor specifically; option (b) reduces
maintenance burden.

If keeping (a): also add a `PUB main()` stub to each fixture so the spurious
"No PUB method or DAT block" error stops appearing in the test output.

---

## 4. Dead flash/RAM download infrastructure (partial cleanup remaining)

> **Compiled output: no** — dead code. Re-checked 2026-09-14: `P2InsertFlashLoader` and `LoadHardware` still present in `spin2Parser.ts`.

v1.54.3 removed the user-facing `--flash` / `--ram` / `--both` / `--plug` /
`--dvcnodes` CLI options (none ever went live), the dead branches that
referenced them, the `writeFlash` / `writeRAM` fields from `CompileOptions`,
and simplified `Spin2Parser.ComposeRam()` to drop its now-permanently-false
parameters. The following internal helpers became dead code as a result and
should be deleted in a follow-up pass:

- `Spin2Parser.P2InsertFlashLoader()` — only callable from the now-removed
  `programFlash` branch
- `Spin2Parser.LoadHardware()` — only callable from the now-removed
  `ramDownload` branch
- The `flashLoader` external resource it embeds (under `src/ext/`)

The flash *image file* path (`-F, --flashfile`, `P2MakeFlashFile`,
`writeFlashImageFile`) is still active and supported — that produces a
`.flash` image for an external programmer, which is the use case we kept.

**Why deferred:** removing the helpers ripples into `externalFiles.ts` and
the `src/ext/` resource bundling — small but touches surface area beyond the
CLI cleanup that motivated this release.

---

## 5. Object-cache hardening — items deferred from v1.54.6

> **Compiled output: no observed defect.** 5a (SD-suite run) never done; 5d's uncovered case — a sidecar swapped between entries — could in principle serve a wrong binary.

Recorded as a group while shipping v1.54.6 (subtree exportdef replay + the
new comprehensive byte-equivalence regression test). The fix and the
regression test together close every cache-correctness gap currently known
to be hit by the SD FAT32 driver suite. These items would further tighten
the cache against future drift but are not blocking anything observed today.

Background context: `DOCs/roadmaps/Object-Cache-Correctness-Analysis.md`
(the living analysis written during the v1.54.5 → v1.54.6 root-cause work)
catalogs the full shared-state surface and the precise mitigation stack.
Items below are referenced by their analysis-doc identifiers (M1, M2, ...).

### 5a. End-to-end SD test suite verification of v1.54.6

**What:** run the v1.54.6 build against the full SD FAT32 driver suite
(24 harnesses, the scenario that surfaced v1.54.2 → v1.54.5). The local
fixture (`expdef_subtree_*.spin2`) proves the mechanism is fixed; the SD
suite is the production-scale verification.

**Trigger to revisit:** before shelving the cache work as "complete," run
the SD suite under v1.54.6 and confirm zero compile failures. Reference
materials are at `REF-CACHE-BUG/cache-bug-v1.54.{3,4,5}/` for comparison.

### 5c. Typed `CacheContract<T>` registry (M2, deferred)

**What:** define an `interface CacheContract<T>` covering "input goes
into key" + "side effects captured at store" + "side effects replayed
at hit." Refactor the four current contracts (key inputs, defSymbols
replay, DebugData replay, symbol replay) into the typed pattern. Add a
registry test that asserts every mutable container in `Context` is
registered with a contract or explicitly opted out.

**Why deferred:** medium-effort refactor (~400 LOC + test). Adds the
structural protection that "the next compiler-feature PR introducing a
new piece of process-global state can't merge without thinking about
the cache." The byte-equivalence test catches the bug at PR time
either way; the registry catches it at TYPE/TEST time, earlier in the
PR's lifecycle.

**Trigger to revisit:** the next PR that adds shared mutable state to
`Context` or the resolver. Or when we've shipped a fifth cache fix in
six months and want to draw a line.

### 5d. Manifest sidecar (Shape B / M3, partially done — re-scoped)

**What:** add `<key>.json` per cache entry listing every sidecar with
content hashes. Hit path validates manifest before reading sidecars;
missing or hash-mismatched sidecars fail the hit explicitly.

**Why deferred:** today's "binary last + format-version-in-key" pattern
covers the partial-write case. A manifest catches a narrow class of
filesystem corruption (sidecar swap between entries) and forces structural
discipline ("every sidecar must be declared") that's currently informal.

**Trigger to revisit:** when adding the next sidecar (e.g. for an
LRU-eviction policy or for `--map`'s distiller restore — see
`Object-Cache-Future-Enhancements.md`). Shape B is essentially free if
we're already touching the on-disk layout.

Status: **PARTIALLY CLOSED in 1.55.4 — re-scoped, do not read as untouched.** A
per-entry manifest sidecar did land, as `<key>.dep` rather than `<key>.json`, but
it solves a *different* problem than the one described above: it lists
`{resolvedPath, contentHash}` for every **source file in the entry's subtree**,
and is re-validated on every hit to catch stale transitive inputs. It does **not**
declare the sidecar set (`.bin`/`.sym`/`.dbg`/`.meta`), so the
filesystem-corruption case this item was written for — a sidecar swapped between
entries — remains uncovered.

**What is still open:** extend the manifest to declare and hash the entry's own
sidecars, giving the structural discipline ("every sidecar must be declared")
this item asked for. The on-disk layout now has a natural home for it.

### 5g. Eliminate shared mutable state in resolver/preprocessor (M5, far future)

**What:** refactor `defSymbols`, `DebugData`, `objectSymbolStore`,
`objectDistiller` into per-compile parameters that flow explicitly
through call signatures. Compile becomes a pure function of declared
inputs. After this, the cache is correct *by construction* (TypeScript
enforces "this state has a contract") rather than correct *by
construction-via-test* (the registry test enforces it).

**Why deferred:** months-long refactor of the resolver and parser. The
M2 typed registry plus the byte-equivalence regression test together
give correct-by-CI protection ("incorrect code can't merge"), which is
the strongest practical guarantee for a system with mutable globals.
M5 is the right answer for a 5-year-horizon compiler; not justified
for short-term correctness.

**Trigger to revisit:** PNut-TS feature growth shifts the
cost-benefit (e.g. parallel compile becomes desirable, which requires
purity anyway).

---

## 6. GOLD-regen workflow cleanup (deferred from v55 prep, 2026-05-11)

> **Compiled output: no** — GOLD-regen workflow. Re-checked 2026-09-14: 21 legacy `*-rebuild-v*` dirs, 544 `.elem*` files, no `EXCEPT-tests/rebuild-gold.ps1`, TOF GOLDs still gitignored. The v55 regen (2026-05-13) has happened, so the 6.4–6.6 triggers have passed; their outcomes were never recorded here.

**Context:** A unified GOLD-regen workflow was built in `scripts/gold/`
(library + driver + bundle/apply scripts + 26 per-suite `rebuild-gold.ps1`
files + npm scripts `gen-regold-tarball` / `apply-regold-tarball`). It
supersedes the legacy per-suite scaffolding and the manual "tarball-by-hand
to Windows" process. The following cleanup items were deferred so the
workflow could be built and verified end-to-end without touching unrelated
state.

### 6.1 Delete legacy `<SUITE>-rebuild-v52/` scaffolding directories

Twenty-two directories under `TEST/<suite>/<SUITE>-rebuild-v52/` (and
`TEST/LARGE-tests/<sub>/LARGE-<sub>-rebuild-v52/`) contain near-identical
hand-written rebuild-gold scripts, each hard-coded to `PNut_shell_v52`. They
are gitignored (`.gitignore:293+`) but live in working trees and cause
discovery noise. The new `TEST/<suite>/rebuild-gold.ps1` files (committed)
replace them entirely.

```bash
find TEST -type d -name '*-rebuild-v*' -exec rm -rf {} +
```

Remove the corresponding `.gitignore` entries (line 293+, the `# v52 GOLD
file rebuild folders (temporary - for Windows compilation)` block) at the
same time so the gitignore doesn't carry dead entries.

**Trigger:** after the first successful end-to-end v55 regen (sanity-check
round-trip against v52 passes, v55 regen lands without surprises). The
legacy scripts are a fallback if the new workflow has a latent bug; delete
once the new workflow has produced at least one trustworthy GOLD set.

### 6.2 EXCEPT-tests errout-format resolution

`scripts/gold/investigate-errout.ps1` was written to capture Windows PNut's
`Error.txt` format for the 7 EXCEPT test sources + the CON `symbol_length_test`
orphan. Output (JSON, paste-back) settles whether EXCEPT-tests can join the
Windows-regen scope or must remain pnut-ts-derived.

Three possible outcomes drive different follow-ups:

- **Windows produces `path:line:error:message`** (matches pnut-ts gcc-style):
  add `TEST/EXCEPT-tests/rebuild-gold.ps1` (default `-c`, but capture
  `Error.txt → .errout.GOLD` on compile failure). Library needs a small
  extension to the success-path-only behavior. Regenerate all 61 EXCEPT
  GOLDs (incidentally fixing the stale `/workspaces/Pnut-ts-dev/...` paths
  baked into 5 of them).

- **Windows produces a different parseable format**: write a normalizer in
  the library that translates Windows `Error.txt` to canonical
  `path:line:error:message` before saving as GOLD. Otherwise as above.

- **Windows format is irreconcilable**: leave EXCEPT-tests excluded from
  Windows regen. Document the pnut-ts-as-errout-source convention in the
  test file headers. Delete the orphan `TEST/CON-tests/symbol_length_test.errout.GOLD`
  (unreferenced, unproduced by any current code).

**Trigger:** run `investigate-errout.ps1` on Windows whenever next at the
Windows box. The empirical output dictates the path; no design work needed
until then.

### 6.3 Clean up `.elem*` intermediate file noise

`find TEST -name '*.elem*'` shows 541 stale intermediate files:
- 344 `.elem` (pnut-ts `--regression element` output, kept after test runs)
- 196 `.elemORIG` (manual baselines from earlier dev work)
- 1 `.elemGOOD` (one-off)

All gitignored. None used by current tests. They pollute IDE file explorers
and `find`/`ls` output but cause no functional issue.

```bash
find TEST -name '*.elem' -o -name '*.elemORIG' -o -name '*.elemGOOD' -delete
```

Worth turning into `npm run clean-elem` if it becomes a recurring chore.
Probably won't — once cleared, the elementizer-output convention has moved
on.

**Trigger:** when the working tree noise becomes irritating, or as a one-time
hygiene pass after the v55 regen lands.

### 6.4 LARGE-tests/TOF gitignored GOLDs investigation

`.gitignore:232-237` explicitly excludes six TOF GOLDs:
```
TEST/LARGE-tests/TOF/isp_180degrFOV_TOFsensorSmall.{bin,lst,obj}.GOLD
TEST/LARGE-tests/TOF/isp_hdmi_debug.{bin,lst,obj}.GOLD
```

Reason for the exclusion is unclear from `git log` and `git blame` on the
.gitignore alone. Possibilities: file size, known-flaky on slow machines
(the existing test runner already has a TOF timeout note in CLAUDE.md), or
intentional pnut-ts-only baselines that PNut can't reproduce.

After the v55 regen, the `rebuild-gold.ps1` driver will produce these GOLDs
on Windows (since the source files exist in the suite). The diff against
... nothing-committed will be visible in `apply.sh`'s output. Worth
checking at that point whether the exclusion still makes sense.

**Trigger:** first v55 `apply-regold-tarball` run. If new GOLDs for these
six files are produced and the diff is clean, consider whether to commit
them and drop the gitignore entries.

**Measured 2026-09-16 — five TOF GOLDs missed the v55 regeneration.**
`demo_180degrFOV`, `isp_180degrFOV_TOFsensor`, `isp_vl53l5cx` and `p2textdrv`
(committed 2025-04-25/29) and the untracked `isp_hdmi_debug` still hold pre-v55
PNut output: TOF fixtures that were regenerated on 2026-05-13 (e.g. `isp_i2c`)
match PNut-TS byte for byte, while these differ by consistent single-byte
substitutions (`1d`→`81`, `1b`→`7f`), which is renumbered bytecode values, not a
calculation difference. `demo_180degrFOV` also differs in length (118346 vs
118894). Decoded object trees match in all five. The LARGE suite's TOF exclusion
comment ("math calculation differences") was wrong and now points here; the new
map-oracle GOLD test lists the five as `knownByteDivergence`.
**Action:** regenerate the TOF GOLDs with `TEST/LARGE-tests/TOF` `rebuild-gold.ps1`
on Windows, then remove the five from `knownByteDivergence` in
`src/tests/MAP-tests/mapOracleGold.test.ts` and drop the TOF exclusion in
`pnut-ts-large.test.ts`.

### 6.5 V52A-tests rule drift — verify after first regen

The legacy `V52A-rebuild-v52/rebuild-gold.ps1` compiled every V52A file
with `-cd`. The `.test.ts` (per user's "this is the formal source of
truth" directive) uses a case-insensitive substring rule: files containing
"debug" get `-d`, others don't. The new `TEST/V52A-tests/rebuild-gold.ps1`
implements the substring rule.

Three of 17 V52A files contain "debug":
- `v46_test_debug_mask.spin2`
- `v50_test_conditional_debug.spin2`
- `v52a_test_debug_end_session.spin2`

The other 14 will compile with `-c` under the new rule. If existing GOLDs
were generated with `-cd` (the legacy behavior), the v52 round-trip sanity
check will surface 14 unexpected diffs. Either:

- the `.test.ts` rule is correct and existing GOLDs were generated under
  wrong rules (regenerate, fix the drift)
- the `.test.ts` rule is wrong (some "non-debug-named" files actually use
  debug() and need `-d` to compile correctly) → fix the rule

**Trigger:** v52 round-trip sanity check output. The diff signature reveals
which side has the bug.

### 6.6 COV-tests `coverage_003_v44.spin2` — version-forced file

The pnut-ts test passes `-44` to force compile-as-v44 for this one file.
Windows PNut (single binary, e.g. `PNut_v55.exe`) cannot produce
v44-bytecode output from a v55 install. The new `COV-tests/rebuild-gold.ps1`
still includes the file but compiles it with the current version's bytecode.

Options for handling:
- Skip the file in Windows regen (leave its existing GOLD untouched — but
  then the GOLD becomes stale relative to other files in the same suite)
- Install `PNut_v44.exe` alongside the current version and call out to it
  for just this one file (manifest-driven per-file version override)
- Drop the `-44` test (cost: lose v44 backward-compat coverage)

**Trigger:** v55 regen apply step. If the v44 GOLD diffs unexpectedly, this
is the cause. Pick the handling option then.

---

## 9. `TEST/FULL` `dumpTables` failure + `-I` relative-path bug (added 2026-08-08)

> **Compiled output: YES for 9.1** — the 2026-09-13 investigation found `dumpTables` fails on the same compile-time QLOG/QEXP constants as item 1, and clears with the CORDIC port. **9.2 is test-harness only.**

**Surfaced by:** CLI-Robustness entry-baseline correction.

`jest-full-config` carries **4** failures (`dumpTables`, `condCode`,
`condCodeElse`, `include`), proven pre-existing at `58180b1`. Three are item 2
above. Two things are *not* covered there:

1. **`dumpTables`** — not a preprocessor GOLD issue; needs its own look.
2. **`TEST/FULL/pnut-ts-preproc.test.ts` runs the CLI with `-I inc` relative to
   cwd rather than to the test directory** — a likely contributing cause for the
   `include` failure independent of GOLD staleness, and a latent trap for any
   future test in that file.

## 10. Language-specification extraction pipeline broken in place (added 2026-08-09)

> **Compiled output: no** — documentation tooling. Re-checked 2026-09-14: both broken imports still present. Needs Stephen's scope decision (repair, retire, or banner).

**Surfaced by:** Preproc-Symbols sprint §8 Phase A — the aged-document gate
selected `DOCs/language-specification/README.md` (2025-09-13, ~v52 era) and
its hardcoded counts; the assessment asked "does the documented pipeline still
run?" The answer is no, and it never has from its current location:

1. **Broken imports since the move.** `extract-pasm2-database.ts:16` and
   `extract-condition-codes.ts:16` import `'../src/classes/types'` — a path
   from the scripts' pre-`d3c11aa` (2025-09-13) home. From
   `extraction-scripts/` it must be `'../../../src/classes/types'`. Neither
   script has ever run from the tree as committed. (In
   `extract-condition-codes.ts` the broken import is also *unused* — the same
   line the external audit flagged as UNUSED_IMPORT.)
2. **Stale output path.** `extract-pasm2-database.ts:490` writes to
   `../DOCs/internals/PASM2-Instruction-Database.json` — the pre-move
   location, deleted in the same commit that moved the scripts.
3. **Superseded-but-undocumented generator.** `extract-pasm2-database-corrected.ts`
   derives operand patterns from `spinResolver.ts` parsing logic (its header
   calls the original's comment-based patterns unreliable) and writes
   `databases/PASM2-Instruction-Database-CORRECTED.json`. The shipped
   `databases/PASM2-Instruction-Database.json` (v3.0.0, generated 2025-12-13)
   appears to be its renamed output, post-processed by the four `scripts/*.js`
   helpers (mode-700, tracked) — none of which the README mentions. The README
   documents only the original, broken script.
4. **Confirmed content drift.** `extract-spin2-language.ts` *does* run; a probe
   regeneration (reverted, not committed) changed every `elementType` ordinal
   by +1 — the v53 enum shift. The committed
   `SPIN2-Language-Specification.json` has embedded raw enum ordinals stale
   since v53. Headline counts (36 keywords / 72 operators) happen to still
   match, but the numeric IDs are all wrong — and raw enum ordinals in a
   persistent artifact is the same fragility class the bc_* names-not-values
   rule exists for.

**Not done in that sprint (deliberate):** no counts were hand-patched, the
Group C audit findings in these files were left as-is (a repair rewrites or
retires them), and `verified` stamps were not advanced. Repairing this is a
scoped effort of its own: fix the two import paths and the output path,
reconcile original vs `-corrected` vs the `scripts/` post-processors into one
documented canonical flow, regenerate all four outputs, decide whether
`databases/` + `ide-integration/` should be class `generated` (not
hand-audited), and consider dropping raw enum ordinals from the emitted JSON.
**Scope decision is Stephen's**: repair sprint, retire the tree, or leave as
historical reference with a staleness banner.

---

## 11. `#pragma exportdef` exports presence, not the value (added 2026-08-09)

> **Compiled output: no wrong code** — a feature gap: the value is never exported, and the documented pattern fails to compile. Needs Stephen's decision.

**Surfaced by:** Preproc-Symbols sprint §6 — reproducing every `Preprocessor.md`
claim against the built compiler before re-stamping it. The doc's flagship
MEMDRIVER example (define a driver filename, export it, child instantiates
`OBJ driver : MEMDRIVER`) **does not compile**: the child errors
`Invalid filename, use "FilenameInQuotes"`.

**Root cause:** `#pragma exportdef SYMBOL` pushes only the symbol *name* into
`preProcessorOptions.defSymbols` (`spinDocument.ts:818`), and
`getPragmaSymbolValue()` hardcodes `value = '1'` (`spinDocument.ts` — the
value on the `#define` line is never read by the pragma path). Child
documents define `defSymbols` entries as presence-only (`SA_NUMBER_NO`,
value 1). Net effect: the child's `#ifndef MEMDRIVER` guard correctly sees
the symbol as defined — so it *skips its own default* — but the exported
symbol never substitutes, leaving the raw name in the child's source. The
worst case of half-working: the export suppresses the fallback and supplies
nothing.

**What works today:** exporting presence flags for `#ifdef`/`#ifndef`
configuration in children. That part is real and `Preprocessor.md` now
documents exactly that (the value-export claim and the MEMDRIVER example were
corrected 2026-08-09).

**Decision needed (Stephen):** implement value export (FlexSpin, which this
preprocessor is patterned on, exports the value — the mechanism would need
`getPragmaSymbolValue()` to look up the symbol's current value and
`defSymbols` to carry name+value pairs into child `SpinDocument`s), or accept
presence-only as the feature's scope and leave the doc as now written. The
doc text was imported from FlexSpin's semantics; the implementation never
carried values.

---

## Cross-cutting note: regression tests against "us-vs-us" GOLDs

Three of the items above (`#1 op_qlog`, `#2 preproc GOLDs`, the deleted
`--regression tables` apparatus, the deleted `pnut-ts-element` test) all
share one structural problem: regression suites that compare PNut-TS output
against PNut-TS-generated snapshots from a prior date. These rot whenever
the format intentionally evolves and there's no mechanism to refresh them.

The deletions in v1.54.3 (`--regression tables`, `pnut-ts-element`) accept
that some of these snapshot comparisons aren't worth maintaining because
the underlying data (bytecode tables, elementizer output format) is
*designed* to evolve. Items that survived (resolver, preprocessor) capture
behaviors that *shouldn't* change — math operations and preprocessor
semantics — so a stable GOLD makes sense provided we own the regenerate
flow.

A general principle worth adopting: any GOLD that PNut (Pascal) cannot
produce must come with a documented "how to refresh this" recipe in the
test file's header, or it doesn't belong in the suite.

## 13. Documentation residue from the 1.55.4 release sweep (added 2026-08-24)

> **Compiled output: no** — documentation. 13b/c/e/f archived 2026-09-14.

Found by a documentation survey run against the v1.55.4 tag. Each item below was
**deliberately not fixed at tag time** — none blocks the release, and each is
recorded here rather than left to be rediscovered.

### 13a. `SPIN2-BIN-Format.md` inline line citations are drifted

The 1.55.4 synchronous-write change added comment blocks to
`src/classes/spin2Parser.ts`, shifting later definitions by two to three lines.
The citations naming a **function definition** were re-verified and corrected at
tag time. The **inline range citations** — patch-point offsets, condition lines —
were not, and spot-checks found several now landing on a closing brace
(`spin2Parser.ts:561`, `:540`, `:966` among them). The document carries a caution
at its head saying which half to trust.

**Fix:** audit all 43 `spin2Parser.ts:NNN` citations against source, and prefer
citing a symbol name over a line number wherever the line adds nothing — a symbol
does not drift. Then remove the caution note and stamp `verified`.

### 13d. `Regression-Test-Coverage-Report.md` is marked generated but has no generator

**Sharpened 2026-08-30.** The original entry said it needs "a tooling
regeneration, not a hand edit." Searched for that tooling: **nothing in
`scripts/` or `package.json` produces this file.** It is classed `generated`
with a do-not-hand-edit note, and no mechanism can refresh it — so it has sat at
v1.51.7 (357 files, 18 categories) while the suite reached 426 tests across 26
suites, 267 of them individual `.spin2` compiles.

That is the defect. The stale numbers are the symptom, and they will recur after
any hand fix.

**Done meanwhile:** a banner at the head of the document says every number in it
is stale, gives the measured current figures, states that no generator exists,
and points at `npx jest --runInBand --verbose -c smm.jestconfig.js` for the real
count. A banner is safe against a future regeneration in a way that editing the
body is not.

**Fix:** either write the generator and wire it to an npm script, or reclassify
the document as hand-maintained and own it. Leaving it `generated` with no
generator is the one option that keeps lying.

## 14. Test-harness items from the 1.55.4 closeout audit (added 2026-08-24)

> **Compiled output: no** — test harness. **Taken into the Map-Instance-Correctness sprint (scope confirmed 2026-09-14).** Re-checked 2026-09-14: `package.json` `test` still lacks `--runInBand` (14b).

### 14a. `verify-map.ts` method-entry check is a coarse lower bound

`src/tests/MAP-tests/verify-map.ts` used to assert that a method's map entry
equalled the listing's VALUE field. That check **encoded the defect**: the
listing's VALUE is a slot index in the object header table, and the map printed
that same index in an address column, so the two agreed only while the bug was
present. It was replaced in 1.55.4 by `mapEntry >= 4 * (methods + 1)` — "entry is
past the header table" — which is sound but coarse: for a two-method object it
passes for any value at or above `$0000C`.

**Fix:** the map now prints both halves of the identity — `Entry +$rel  ($abs)`
— and `MEMORY LAYOUT` gives each object's code base. Assert
`abs == objectCodeBase + rel` instead. That is exact, needs nothing from the
listing, and would have caught the original defect outright.
`TEST/MAP-tests/README.md` documents the current weaker check and points here.

### 14b. `npm test` does not run in band, but the conventions say it does

`.claude/skill-conventions.md` records `TEST_COMMAND` as
`npm run build && jest --runInBand -c smm.jestconfig.js`, with the rationale
that running in one process keeps the suite from spawning CPU-1 parallel
compiles and overwhelming the container. **`package.json`'s `test` script has no
`--runInBand`**, so the documented intent and the actual command diverge.

This has not bitten yet, but there is a live hazard behind it. Every suite added
to `CACHE-tests` in this sprint stages into its own `mkdtemp` tree with a private
`--cache-dir`, so those are parallel-safe. `objectCache.test.ts` is the exception
— it compiles **in place** inside the shared `TEST/CACHE-fixtures/` using the
default `.pnut-cache`. With a jest worker pool, any future suite added to that
directory that also compiles in place would race it, and the failure would look
like a cache defect rather than a harness collision.

**Decide one of:** add `--runInBand` to the `test` script so reality matches the
recorded intent; or convert `objectCache.test.ts` onto the `stageTree` scaffolding
the rest of the directory already uses, and correct the conventions file instead.
The second is the better end state — it removes the hazard rather than
serialising around it.

## 15. Preprocessor diagnostics (added 2026-08-09, merged here 2026-08-30)

> **Compiled output: 15a YES in effect** — the build silently omits the `#ifdef SYM` branches the user meant to enable. **15b no** — misdirected diagnostic, no output produced.

Both are **silent or misdirecting** failures: the compiler accepts the input,
does something other than what the user asked, and either says nothing or points
at the wrong line. Neither is covered by any fixture. Recorded during the
Preproc-Symbols sprint (commit `f628b91`).

> **These rank higher than they read, because of who consumes the diagnostic.**
> Re-ranked 2026-08-30 after Stephen confirmed an `agent-consumer` deliverable
> head. An agent's entire interaction with this compiler is the compile → read
> error → fix loop, and our error format (`path:line:error:text`, non-zero exit,
> gcc-adjacent) makes that loop mechanically drivable — which is exactly why
> these two break it. **15a emits no diagnostic at all**, so there is nothing for
> the loop to react to and it never converges. **15b names the wrong line**, so
> the agent edits the `#endif` — a divergent fix, not a slow one. A person hits
> either and thinks *"that's odd"*; an agent acts on the message. Both also sit
> where a C-trained prior is wrong (`-D` is presence-only; `#if`/`#elseif` do not
> exist), so they are hit by exactly the reader least able to recover.
> These are not diagnostic polish.

### 15a. `-D SYM=value` silently registers a symbol literally named `SYM=VALUE`

`-D` takes presence-only symbols, but the `=value` form is accepted without
complaint: the whole argument is uppercased and registered as a symbol literally
named `SYM=VALUE`. The intended `#ifdef SYM` never matches and the user gets no
clue why.

**Fix:** emit a diagnostic naming the unsupported form.
(`src/pnut-ts.ts`, the `this.options.Define` loop.)

### 15b. `#if` / `#elseif` surface as a stray-`#endif` error

Only `#ifdef` / `#ifndef` / `#elseifdef` / `#elseifndef` are recognized. A
C-style `#if` falls through as an unrecognized line, so the first error the user
sees is the now-unbalanced `#endif` — pointing at the wrong line and describing
the wrong problem.

**Fix:** diagnose at the `#if` / `#elseif` line itself, ideally naming the
supported spelling. (`src/classes/spinDocument.ts`.)

## 16. MAP test cases do not cover structures (added 2026-08-09, merged here 2026-08-30)

> **Compiled output: no** — test coverage. **Taken into the Map-Instance-Correctness sprint (scope confirmed 2026-09-14).**

No MAP fixture exercises a `STRUCT`, so nothing verifies how structures and
their fields display in map output. The 1.55.4 map redesign (instance model,
`Entry +$rel  ($abs)`) went in without a structure case, and item 14a's proposed
exact-address assertion would land on the same uncovered surface.

**Fix:** add structures to the MAP test fixtures and assert their field display.

---

> **Merge note, 2026-08-30.** Sections 15 and 16 arrived from
> `DOCs/internals/PUNCH-LIST.md`, a second punch list that predated this one and
> was invisible to planning: since central `sprint-plan` §1 reads only the
> `PUNCH_LIST_DOC` slot, its items were being silently deferred every sprint.
> Stephen ruled to merge on 2026-08-30 and that file was deleted. Its remaining
> content was three already-completed Build-and-Packaging items — audit the
> packaging and build scripts, transition to GitHub workflows, and the macOS
> drag-to-Applications DMG installer — all shipped and visible in the repo; they
> were not carried into a dated archive because their completion is recorded in
> `DOCs/RELEASE-PROCESS.md` and the release workflow itself.

## 19. `RELEASE-PROCESS.md` coverage gate cannot be met (added 2026-09-13)

> **Compiled output: no** — release-process gate. Its one failure (`coverage_003_v44`) is attributed to a GOLD built with v55 bytecode (6.6); not proven.

§2 of the release checklist requires Statements >= 88%, Branches >= 84%,
Functions >= 86% — a baseline labelled v1.51.x. No 1.55.x release has met it:
the committed report (`jest-coverage/`, last refreshed at v1.55.0) reads
84.08 / 75.55 / 80.87, and the v1.55.6 run measured 83.76 / 76.29 / 80.66 — the
same level. A gate every release passes by being ignored is not a gate.
`RELEASE-PROCESS.md` therefore stays `verified: 1.55.5` in the manifest.

The same run carries one failure, `ALLCODE-tests` `coverage_003_v44.spin2`
(listing, object and binary mismatch) — the version-forced file of §6.6.

**Fix:** re-baseline the table from a current run (or state the rule as "no
worse than the last release's committed report"), and resolve §6.6 so the
coverage run is green.

---

## 20. `.map` VAR bases for shared images, and OBJ arrays (added 2026-09-14)

> **Compiled output: no** — the `.map` misdescribes a correct binary. **Taken into the Map-Instance-Correctness sprint (scope confirmed 2026-09-14)** as one member of a defect class.

**Surfaced by:** re-measuring the P2KB `map_caveat` amendment against 1.55.7.
Ground truth is the parent object's header table — one `(object offset, VAR
offset)` pair per OBJ entry, one entry per array element — read from the `-l`
image dump. The 1.55.4 instance model gets two shapes wrong. Neither affects the
compiled binary; `Objects:` is right in every case.

**(a) VAR bases of copies that share one image.** Identical effective overrides
merge copies into one image; each copy still has its own VAR. `OBJECT DETAILS`
`VAR Base`, and the `VAR` rows of `SYMBOL INDEX`, are wrong for copies after the
first — erratically:

| Program (driver has `VAR long v1, v2`) | Header VAR bases | Map `VAR Base` |
|---|---|---|
| `a`,`b` identical | A `$44`, B `$50` | A `$44`, **B `$44`** |
| `a`,`b`,`c` identical | `$54`, `$60`, `$6C` | `$54`, `$60`, **C `$54`** |
| `a`..`d` identical | `$60`, `$6C`, `$78`, `$84` | `$60`, `$6C`, **C `$70`, D `$60`** |
| `a`,`b`,`c` all different | `$84`, `$90`, `$9C` | all correct |

`SYMBOL INDEX` then collapses the wrong rows (`V1  A+1  $58`) and the real VAR
addresses of the mis-based copies appear nowhere. `MAP-File-Format.md` §5 states
"Two instances of one object share a code region but have **different** VAR
bases" — the doc is right, the output is not.

**(b) OBJ arrays.** `OBJ d[3] : "drv"` produces three header entries; the map
has one instance, `D`, carrying element 0's VAR base — elements 1..n-1 appear in
no section. Worse, an OBJ declared **after** an array in the same parent is
mis-mapped. With `d[3] | BUS_TAG = 5` then `e | BUS_TAG = 6` (header: `d` at
`$3C` ×3, `e` at `$54` VAR `+$2C`):

```
  $0003C  $00050     21  drvv             D+1              BUS_TAG=5   <- e does not share this
  $00054  $00068     21  Object_2         (entry)                      <- this is e
--- E : drvv ---   Location: $0003C-$00050   VAR Base: $00080          <- should be $00054 / $00098
```

E's code and DAT rows are missing from both index sections; the `VAR` rows
labelled `E` are `d[1]`'s. With the array declared last (`e` then `d[2]`) the
layout is correct apart from the missing elements. Likely cause: the instance
store numbers children by OBJ declaration, the header by array element.

**Why no test caught it:** no `TEST/MAP-tests` fixture declares an OBJ array,
and nothing asserts VAR bases of merged copies. `npm run p2kb-verify` asserts
only forked (distinct-image) instances. The 1.55.4 CHANGELOG entry ".map names
objects and instances correctly when one is used more than once" over-claims for
both shapes — left as the historical record; the fix release says what changed.

**Fix:** derive each instance's VAR base and array membership from the parent's
header table entries (one per element), name array elements `D[0]`, `D[1]`, …,
and add MAP fixtures for merged copies with VAR and for an array declared before
another OBJ, asserted against header-derived addresses. Then re-measure and trim
the "Known wrong" block from `DOCs/roadmaps/P2KB-map-caveat-retraction-1.55.4.md`.

---

## 21. WUMMI "Group B" binaries differ from PNut's — DEFERRED; re-verify before any action (added 2026-09-14)

> **Compiled output: POSSIBLY** — the bytes differ from PNut's; whether behavior
> differs is unknown. **Deferred by Stephen 2026-09-14.** Do not diagnose or fix
> from the figures below: they are from 1.55.2. **Re-verify the current status
> first.**

**Surfaced by:** the CLI-Robustness sprint entry baseline (2026-08-08), where it
was agreed to defer as "Group B — dedup parity divergence", and carried
unchanged through that sprint's closeout (3 failed / 46 passed). It was never
filed here, so until now every sprint deferred it without deciding to. Source:
`DOCs/roadmaps/completed/CLI-Robustness-Sprint-Plan.md` (Group B table) and
`2026-08-08-CLI-Robustness-CLOSEOUT.md`.

**As recorded at 1.55.2:** `WUMMI-tests/FG1`, `Main` and `Mustererkennung` fail
listing, object and binary against their Windows GOLDs. A real byte divergence,
not line endings: PNut-TS's early deduplication and distiller produce **smaller**
objects (`OBJ bytes: 68_672` against GOLD `68_780`), print a three-line savings
summary where PNut prints one, and the `.bin` differs accordingly (79,617 against
79,629 bytes).

**What is not known:** whether PNut-TS merges objects PNut keeps separate. Merged
object images share one DAT region, so a wrong merge would change what the
program does, not just its size.

**Before any action:**

1. Build the current compiler and run the WUMMI suite. Record which fixtures
   fail and their byte counts. 1.55.4 replaced the `.map` instance model and
   changed the cache, so the 1.55.2 figures cannot be assumed.
2. Only if the divergence reproduces: compare object-header tables and
   image-region counts per object against PNut's `.obj`, to find which objects
   were merged differently.

The header-derived ground-truth checker planned for the Map-Instance-Correctness
sprint is the natural tool for step 2.

---

## 22. `.lst` and `.pre` are written through streams nobody waits on (added 2026-09-14)

> **Compiled output: no** — output-file integrity; no failure observed.
> **Taken into the Map-Instance-Correctness sprint (Stephen, 2026-09-14).**

1.55.4 made the `.bin`, `.flash` and `.map` writes synchronous after an unawaited
stream produced a zero-byte `.flash` (archived item 12). Its CHANGELOG names the
hazard: a script reading an output right after a build "could see the previous
run's contents or a partial file". Two user-visible outputs still use the old
pattern:

- the listing — `P2List` in `src/classes/spin2Parser.ts` opens
  `fs.createWriteStream` and ends it without waiting;
- the preprocessor report — `src/classes/spinDocument.ts`, same pattern.

Also on the pattern, lower stakes: the `--regression` outputs in
`src/classes/regression.ts`, and `dumpUniqueObjectFile` /
`dumpUniqueChildObjectFile` in `src/utils/files.ts`, whose only callers are
commented out.

**Fix:** build the text in memory and write it with `fs.writeFileSync`, as
`mapGenerator.ts` does; delete the two dead dump helpers.

---

## 23. `RELEASE-PROCESS.md` names the wrong release build (added 2026-09-16)

> **Compiled output: no** — release documentation. Seen while verifying «#53».

`DOCs/RELEASE-PROCESS.md` "Release Build" says to run `npm run bld-dist` after
the checklist and that it "produces" the npm package and the platform binaries.
Release packaging is done only by `.github/workflows/release.yml` on tag push
(Stephen, 2026-09-16); in the container `bld-dist` is used only to build the Linux
binary for local testing. Rewrite the section to say so. `PACKAGING.md` and
`scripts/release-tools/cs_pack.sh` describe a local six-binary packaging and
macOS-signing flow from `pkgs/` — establish whether that flow is still used before
rewriting either. (The local `.tgz` sweeps in gitignored folders because
`.npmignore` exists — harmless, since that `.tgz` is never distributed.)

---

## Closed and archived

Item numbers are never reused, so references elsewhere stay valid.

| Items | Archive |
|---|---|
| 7 | `completed/2026-08-09-Punch-List-Archive.md` |
| 5b, 5e, 5f, and three unnumbered `.map` items (all closed in 1.55.4) | `completed/2026-08-24-Punch-List-Archive.md` |
| 3, 8, 12, 13b, 13c, 13e, 13f, 17, 18 | `completed/2026-09-14-Punch-List-Archive.md` |
