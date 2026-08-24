# Test Suite Punch List

Items deferred from the v1.54.3 cache-fix release that need follow-up. These
were uncovered while auditing `npm run test-full` and `npm run audit-errors`
before release. None block the v1.54.3 fix; all should be addressed before
they accumulate further.

---

## 1. `op_qlog` / `op_qexp` saturation precision bug

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

## 3. Pre-existing `audit-errors` duplicates (8)

`npm run audit-errors` reports 8 duplicate-message issues that pre-date
v1.54.3 (confirmed by stashing changes and re-running on `main`). All cluster
around STRUCT support added in v1.54.0:

- `"Expected an existing STRUCT name"` — needs 2 unique codes
- `"Expected a structure member name"` — needs 2 unique codes
- `"Structure does not contain this name"` — needs 3 unique codes
- `"Indexed structures cannot exceed $FFFF bytes in size"` — inconsistent codes
- `"Structure index must be from 0 to $FFFF"` — needs 2 unique codes
- `"Structure exceeds hub range of $FFFFF"` — inconsistent codes
- `"Bit number exceeds BYTE/WORD/LONG boundary"` — needs 2 unique codes
- `"OBJ data exceeds ${this.obj_limit / 1024}k limit"` — needs 2 unique codes
  (this one is in `compiler.ts`, not STRUCT-related)

**Convention** (per `DOCs/RELEASE-PROCESS.md`): error codes are `(mGGI)`
where `GG` is a group ID and `I` is the instance within the group. Multiple
locations sharing one message text get one group with sequential instance
suffixes. Suggested next step: assign group codes per the convention and
re-run `npm run audit-errors` until clean.

**Why deferred:** mechanical fix that's tangential to the cache work.
Ideally addressed as a single dedicated commit so the changelog entry reads
cleanly.

---

## 4. Dead flash/RAM download infrastructure (partial cleanup remaining)

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

## 7. — closed 2026-08-09, archived

Swept to `completed/2026-08-09-Punch-List-Archive.md` (copyright reconciled
and shipped, Preproc-Symbols §9, v1.55.3).

## 8. `#include` of a constants-only file fails (added 2026-08-08)

**Surfaced by:** CLI-Robustness sprint; pre-existing, reproduced on the
pre-sprint build `58180b1`.

`#include` of a file containing only CON declarations fails with
`<inc>:N:error:No PUB method or DAT block found`, blamed on the *included* file —
even though the including file has a `PUB` and the preprocessed output is
correct. Including a file that itself contains a `PUB` works.

Uncovered because `TEST/PREPROC-tests/inc/included.spin2` has `PUB` methods, and
that suite runs `--pass preprocess`, stopping before compilation. **Nothing
covers full compilation of an `#include`.**

Related to item 2's second root cause (CON-only sources are legal as imported
objects but not as top-level) but distinct: here the CON-only file is *included*,
not compiled top-level, so the top-level check is being applied to the wrong
file.

Sharing constants is arguably the main reason to use `#include`, so this likely
deserves its own defect sprint rather than a punch-list line.

## 9. `TEST/FULL` `dumpTables` failure + `-I` relative-path bug (added 2026-08-08)

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

## 12. `isp_dummy_flash` intermittently compares an empty `.flash` (added 2026-08-09)

**Surfaced by:** Preproc-Symbols sprint full-suite runs — failed in 2 of 6
runs with `Flash Files Don't match!`, and on inspection the compiler-written
`.flash` file was **0 bytes** at comparison time. Passes standalone and on
every rerun; the file regenerates at its normal 6,436 bytes. Never observed
before this sprint at this frequency.

**Shape:** a test-harness write race, not a compiler defect — the FLASH
runner's `waitForFiles()` sees the file exist before its content is flushed
(or a same-process stream is still open when the comparator reads). The
preprocessor changes this sprint do not touch flash generation, and the
failure did not correlate with any code change (first sighting was on a
diff that only removed logging guards).

**Suggested fix:** make the flash comparator (and possibly `waitForFiles` in
`src/tests/testUtils.ts`) wait for non-zero size / stable size across two
polls rather than bare existence, or ensure the write path is synchronous
before the test asserts. Check whether other binary comparisons share the
same latent race.

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

### 13b. `Testing.md` never mentions the object cache or `--cache-verify`

`Testing.md` walks a user through validating a release against `.GOLD` files. It
does not mention the cache at all, and `--cache-verify` is now the most direct
instrument a user has for the exact failure class 1.55.4 fixed. It belongs in the
release-validation walkthrough.

### 13c. `DOCs/README.md` has three broken roadmap links and a thin internals index

`Performance-Analysis-and-Optimization-Roadmap.md`,
`Distiller-Extraction-Roadmap.md` and `Early-Deduplication-Fix-Plan.md` all moved
to `DOCs/roadmaps/completed/` and the links were not updated. The `/roadmaps/`
list also omits every cache document, and the `/internals/` index lists three
documents out of 25 — including neither of the two added in 1.55.4.

### 13d. `Regression-Test-Coverage-Report.md` is a generated file behind its source

Its suite table has no `CACHE-tests` or `CACHE-SWEEP-tests` row and still reports
13 `MAP-tests`. This is `generated` class — it needs a tooling regeneration, not
a hand edit, or the next regeneration silently reverts the hand edit.

### 13e. `doc-coverage.json`: the `packaging` area has no documents

`PACKAGING.md` and `DOCs/RELEASE-PROCESS.md` both exist and are both classed
`process`, which `docs-check` never evaluates for staleness. So a change to
`.github/workflows/release.yml` or `package.json` can never stale any document —
which is how `RELEASE-PROCESS.md`'s Release History table fell two releases
behind without anything noticing. Either govern one of them against `packaging`,
or accept the gap explicitly.

### 13f. `LICENSE` and `copyright` say 2024 — Stephen's call

Both read `Copyright (c) 2024` while the compiler banner says 2025 and the
current year is 2026. Both files ship in every release archive. **Not changed at
tag time:** a copyright notice is a legal statement, not a currency field, and
updating one is not an agent's unilateral call.

---

## 14. Test-harness items from the 1.55.4 closeout audit (added 2026-08-24)

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
