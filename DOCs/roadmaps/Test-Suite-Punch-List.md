# Test Suite Punch List

Items deferred from the v1.54.3 cache-fix release that need follow-up. These
were uncovered while auditing `npm run test-full` and `npm run audit-errors`
before release. None block the v1.54.3 fix; all should be addressed before
they accumulate further.

---

## Status index (2026-09-17)

**Compiled output** asks one question: does this item mean the compiler can
produce a wrong program (`.bin` / `.obj` / `.flash`)?

| # | Item | Compiled output | Status |
|---|---|---|---|
| 4 | Dead flash/RAM download code | no | open |
| 5 | Object-cache hardening | no observed defect | open, deferred by trigger |
| 6 | GOLD-regen workflow cleanup | no | open — only 6.2 (EXCEPT errout format) left; 6.4 closed 2026-09-17 by the Windows regen, residue is §23 |
| 10 | Language-spec extraction pipeline | no | open — measured 2026-09-17, Stephen's decision (repair vs retire) |
| 14 | Test-harness items | no | closed 2026-09-17 (Map-Instance-Correctness) |
| 16 | MAP tests lack STRUCTs | no | closed 2026-09-17 (Map-Instance-Correctness) |
| 19 | Coverage gate unmeetable | no | open |
| 20 | `.map` VAR bases / OBJ arrays | no (map only) | closed 2026-09-17 (Map-Instance-Correctness) |
| 21 | WUMMI Group B divergence from PNut | no | closed 2026-09-17 — stale GOLDs, suite now 49/49 |
| 22 | `.lst`/`.pre` unawaited streams | no | closed 2026-09-17 (Map-Instance-Correctness) |
| 23 | Non-ASCII in string literals loses a byte | **YES** | closed 2026-09-17 — source now decoded byte-faithfully |

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

> **Compiled output: no** — GOLD-regen workflow. Closed out 2026-09-17: 6.1
> (20 legacy `*-rebuild-v52/` dirs + their gitignore entry), 6.3 (544 `.elem`/
> `.elemORIG`/`.elemGOOD` files — `.elemold`/`.elemOLD`/`.elem.REF`, not named
> by this item, were left alone), and 6.5 (V52A-tests substring rule — verified
> correct, no drift) are deleted/verified and their subsections below removed.
> 6.6 is closed as a **fixed test-code defect, not a GOLD or compiler
> problem**: `src/tests/ALLCODE-tests/pnut-ts-allcode.test.ts.HOLD` forced
> `-d` for `coverage_003_v44.spin2` via a stale `explicitDebugFiles` entry
> left over from the pre-v55 GOLD (which *was* built `-cd`); the v55 regen
> (153de2f) rebuilt this file's GOLD as `-c` (no `DEBUG data`/`DEBUG records`
> section, 332 OBJ bytes) and nobody updated the list to match. Compiling
> with `-d` reproduces the old 340-byte/DEBUG-data shape byte-for-byte
> against the pre-v55 GOLD, proving the compiler is right and only the test
> harness was stale; fixed by removing the entry. The unrelated `-44` CLI
> argument `pnut-ts-cov.test.ts` passed for this file has never been a real
> pnut-ts option (Spin2 language-version forcing is source-tag-only, via
> `{Spin2_vNN}`, which this file has never carried) — it silently
> no-opped (commander prints "unknown option" but PNut-TS's error handler
> falls through and compiles anyway) and has been removed as dead/misleading
> test code. 6.2 (EXCEPT-tests errout format) and 6.4 (TOF GOLDs) remain
> open: both need a Windows PNut session that hasn't happened yet.

**Context:** A unified GOLD-regen workflow was built in `scripts/gold/`
(library + driver + bundle/apply scripts + 26 per-suite `rebuild-gold.ps1`
files + npm scripts `gen-regold-tarball` / `apply-regold-tarball`). It
supersedes the legacy per-suite scaffolding and the manual "tarball-by-hand
to Windows" process. The following cleanup items were deferred so the
workflow could be built and verified end-to-end without touching unrelated
state.

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

> ✅ **DONE 2026-09-17 — and it split the five into 3 stale + 2 real.** Stephen
> regenerated TOF (and BLDC and COV) on Windows PNut v55. The regen changed
> exactly the five TOF basenames named above and left the other four fixtures'
> GOLDs byte-identical, confirming the stale-GOLD diagnosis. `knownByteDivergence`
> and the whole-suite TOF exclusion are both removed.
>
> **Three of the five now pass** — `isp_hdmi_debug`, `isp_vl53l5cx`, `p2textdrv`.
> BLDC's three are green too (its exclusion list is gone), and COV gained
> `coverage_qlog_qexp`'s first GOLD, which adjudicated the «#74» CORDIC port as
> correct.
>
> ⚠ **Two do NOT, and they are now a real divergence, not a stale GOLD** — see
> §23. This is the finding the regen was supposed to expose: with current GOLDs
> in place the remaining difference is ours.

---

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

**Re-measured 2026-09-17 (Map-Instance-Correctness sprint, task «#73»), still
stopped at measurement — nothing above needed correction, and one new finding:**

- **No consumer found, in-repo or external.** Grepped the whole tree for any
  reference to `language-specification`, the three `databases/*.json` files, or
  `ide-integration/*` outside `DOCs/language-specification/` itself: nothing.
  No npm script wires any of the 4 `extraction-scripts/*.ts` or the 4
  `scripts/*.js` patch scripts; nothing in `src/` or `.claude/` reads the
  databases. `.claude/skill-conventions.md`'s `SPEC_DOC` points only at
  `README.md` itself, not the generated JSON. This whole subtree appears to be
  a standalone package built for a hypothetical external IDE consumer that
  never materialized.
- **Confirmed the committed `PASM2-Instruction-Database.json` is the patched
  output**, not a script's direct output: its `metadata.generatedAt` is
  `2025-12-13T22:54:11.597Z`, matching the punch-item's "generated 2025-12-13"
  and consistent with `extract-pasm2-database-corrected.ts` → the four
  `scripts/*.js` patches (each mutates the DB file in place; running them
  again on today's file would very likely double-apply corrections rather than
  reproduce it).
- **Effort estimate for a full repair, staying inside this task's ~2-hour
  ceiling:** the two import-path fixes and the one output-path fix are each
  one line, a few minutes total. Reconciling `extract-pasm2-database.ts`
  (comment-based, broken) vs `-corrected.ts` (parses `spinResolver.ts`) vs the
  four order-dependent `scripts/*.js` patches into one documented,
  idempotent, re-runnable flow — verifying the reconciled flow reproduces (or
  intentionally changes, with reasons) the 616KB committed database — is
  design work, not a mechanical fix, and was judged to exceed the 2-hour
  ceiling on inspection alone. Regenerating outputs for a subtree with zero
  identified consumers also runs against this sprint's "do not regenerate
  outputs whose consumers you cannot identify" guardrail.
- **Recommendation (Stephen decides):** given zero identified consumers,
  **retire with a staleness banner** is the lower-risk option — add a banner
  to `DOCs/language-specification/README.md` stating the pipeline is
  unmaintained/non-authoritative and pointing here, without spending repair
  effort on outputs nothing reads. A **repair sprint** is the alternative if
  an external consumer is expected to appear (e.g. a planned VS Code
  extension) — that sprint should budget for the reconciliation work above,
  not just the two-line import fix.

---

## Cross-cutting note: regression tests against "us-vs-us" GOLDs

Several suites (the resolver `dumpTables` GOLD, the `TEST/FULL/preprocessTESTs`
preproc GOLDs, the deleted `--regression tables` apparatus, the deleted
`pnut-ts-element` test) all share one structural problem: regression suites
that compare PNut-TS output against PNut-TS-generated snapshots from a prior
date. These rot whenever the format intentionally evolves and there's no
mechanism to refresh them.

The deletions in v1.54.3 (`--regression tables`, `pnut-ts-element`) accept
that some of these snapshot comparisons aren't worth maintaining because
the underlying data (bytecode tables, elementizer output format) is
*designed* to evolve. Items that survived (resolver, preprocessor) capture
behaviors that *shouldn't* change — math operations and preprocessor
semantics — so a stable GOLD makes sense provided we own the regenerate
flow. (The preprocessor GOLDs were regenerated and given a
regenerate-recipe header in the test file itself — see
`src/tests/FULL/pnut-ts-preproc.test.ts` — closing former punch list §2/§9.)

A general principle worth adopting: any GOLD that PNut (Pascal) cannot
produce must come with a documented "how to refresh this" recipe in the
test file's header, or it doesn't belong in the suite.

## 14. Test-harness items from the 1.55.4 closeout audit (added 2026-08-24)

> **Compiled output: no** — test harness. **Closed 2026-09-17 (Map-Instance-Correctness sprint).** 14a: `src/tests/MAP-tests/verify-map.ts` was rewritten for the 1.55.8 grammar — it now cross-references the compiled `.map` against `expected.json` and an independent header-walk decode (`mapOracle.ts`), asserting exact image bases and VAR addresses rather than the old coarse `mapEntry >= 4 * (methods + 1)` lower bound (commits `c3e6392`, `326d8b5`). 14b: `package.json`'s `test` script now runs `jest --runInBand` (commit `15a649a`), matching `.claude/skill-conventions.md`. Ready for the closeout archive sweep.

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

## 16. MAP test cases do not cover structures (added 2026-08-09, merged here 2026-08-30)

> **Compiled output: no** — test coverage. **Closed 2026-09-17 (Map-Instance-Correctness sprint).** `TEST/MAP-tests/test8-struct/struct_map.spin2` and shape fixture `S18_struct_copies` (`TEST/MAP-tests/shapes/`) exercise `STRUCT` fields in `.map` output, asserted by `objectLayout.test.ts` / `mapFormat.test.ts`. Ready for the closeout archive sweep.

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

> **Compiled output: no** — release-process gate. Its one failure
> (`coverage_003_v44` under the coverage-mode `ALLCODE-tests` harness) was
> §6.6, a stale-test-list defect, **fixed 2026-09-17** (not a GOLD or
> compiler problem). The threshold-vs-current-numbers gap below is
> unaffected by that fix and is still open — it needs Stephen's decision
> (see the dispatch report options), not code.

§2 of the release checklist requires Statements >= 88%, Branches >= 84%,
Functions >= 86% — a baseline labelled v1.51.x. No 1.55.x release has met it:
the committed report (`jest-coverage/`, last refreshed at v1.55.0) reads
84.08 / 75.55 / 80.87, and the v1.55.6 run measured 83.76 / 76.29 / 80.66 — the
same level. A gate every release passes by being ignored is not a gate.
`RELEASE-PROCESS.md` therefore stays `verified: 1.55.5` in the manifest.

`ALLCODE-tests` `coverage_003_v44.spin2` (listing, object and binary
mismatch) — the version-forced file of §6.6 — was the coverage run's one
*test* failure; it is now fixed (§6, above) and does not bear on the
percentage gap below.

**Fix:** re-baseline the table from a current run (or state the rule as "no
worse than the last release's committed report"). §6.6 no longer blocks
this — Stephen still needs to choose which form the rule takes; see the
options in the dispatch report for task «#72».

> **Partly answered, Stephen 2026-09-17 — the CADENCE half is settled, the
> THRESHOLD half is still open.** Coverage is refreshed with each PNut parity
> release, and is separately run as an instrument when the goal is to find thin
> spots and extend the regression suite. It is **not a per-release blocker and
> no release is held for it**; `RELEASE-PROCESS.md` §2 now says so. An interim
> coverage update is owed after v1.55.8, on its own schedule.
>
> What still needs his ruling is only the *form of the rule* — re-baseline the
> table to a current run, or restate it as "no worse than the last release's
> committed report". Raise it with the next coverage update rather than at a
> release.

---

## 20. `.map` VAR bases for shared images, and OBJ arrays (added 2026-09-14)

> **Compiled output: no** — the `.map` misdescribes a correct binary. **Closed 2026-09-17 (Map-Instance-Correctness sprint)**, superseded by the 1.55.8 rewrite: `ObjectLayout` (`src/classes/objectLayout.ts`) derives every instance's VAR base and array membership from the parent's own header-table entries, one per element, so merged copies and an OBJ declared after an array both get correct, distinct addresses. Verified by compiling `d[3] : "drv"` followed by `e : "drv"` — `D[0]`, `D[1]`, `D[2]` and `E` each print correct, ascending VAR bases and their own `Child slots`/`VAR` rows — and by the `S18_struct_copies` and array-shape fixtures in `TEST/MAP-tests/shapes/` (349/349 MAP-tests pass). The `P2KB-map-caveat-retraction-1.55.4.md` "Known wrong" block was re-measured and retracted in commit `9f5df2c`. Ready for the closeout archive sweep.

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
the "Known wrong" block from `DOCs/handoff/p2kb/P2KB-map-caveat-retraction-1.55.4.md`.

---

## 21. WUMMI "Group B" binaries differ from PNut's — ✅ CLOSED 2026-09-17 (stale GOLDs)

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

> ✅ **CLOSED 2026-09-17. It was a stale GOLD, not our distiller.** The three
> GOLDs were regenerated on Windows PNut v55 and the suite now runs **49 passed,
> 0 failed** (was 3 failed / 46 passed). Conclusive detail: this item recorded
> PNut-TS emitting `79,617` bin bytes for FG1 against a GOLD of `79,629`; the
> fresh v55 GOLD is **79,617** — exactly our output. Nothing in the dedup or
> distiller was ever wrong here. The "smaller objects" figures below are a
> pre-v55 GOLD being compared against v55 output. Left in place as the record of
> how the misreading happened.
>
> ⚠ **Re-verified 2026-09-17, and the diagnosis above is probably wrong.** Step 1
> was run at HEAD 173e70d: the divergence reproduces unchanged — **3 failed / 46
> passed**, the same three fixtures, so the 1.55.4 map/cache rework did not move
> it. But the cause looks like a **stale GOLD, not our distiller**: the three
> failing `.obj.GOLD` files are dated **2025-07-09/11** while all 46 passing ones
> are **2026-05-13**, the v55 regeneration date. These three missed that
> regeneration — the identical shape as §6.4's five TOF GOLDs, which is already
> a known-good explanation for exactly this symptom. A pre-v55 GOLD compared
> against v55 output diverges in object size and layout, which is what the
> "smaller objects" figures below describe.
>
> **So do not diagnose the distiller yet.** Regenerate the three GOLDs first
> (`GoldPrep/04-WUMMI-tests.zip`, targeted to these three) and re-run. If they go
> green, this item closes as a GOLD-currency defect and the dedup theory below
> was a misreading. If they still fail against *fresh v55* GOLDs, the divergence
> is real and step 2 applies with the evidence finally isolated.
>
> ⚠ `TEST/WUMMI-tests` is gitignored in full (`.gitignore:254`) — these GOLDs are
> **not recoverable from git**. Regenerate only the three; never run a
> whole-suite regen here without a snapshot.

**Before any action:**

1. ~~Build the current compiler and run the WUMMI suite.~~ **DONE 2026-09-17** —
   3 failed / 46 passed at 173e70d; see the re-verification note above. The
   1.55.2 figures below still cannot be assumed as *causes*, only as symptoms.
2. Only if the divergence reproduces: compare object-header tables and
   image-region counts per object against PNut's `.obj`, to find which objects
   were merged differently.

The header-derived ground-truth checker planned for the Map-Instance-Correctness
sprint is the natural tool for step 2.

---

## 22. `.lst` and `.pre` are written through streams nobody waits on (added 2026-09-14)

> **Compiled output: no** — output-file integrity; no failure observed.
> **Closed 2026-09-17 (Map-Instance-Correctness sprint), commit `283c094`.**
> The `.lst` listing, the `-i` preprocessed-source dump and the `--regression`
> element/preprocessor/resolver reports are now built in memory and written
> once with `fs.writeFileSync`, as `.bin`/`.flash`/`.map` already were. The
> dead `dumpUniqueObjectFile`/`dumpUniqueChildObjectFile` helpers and their
> commented-out call sites are removed. An unwritable output directory is now
> reported as a normal error with a non-zero exit instead of an uncaught stack
> trace. Ready for the closeout archive sweep.

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

## Closed and archived

Item numbers are never reused, so references elsewhere stay valid.

| Items | Archive |
|---|---|
| 7 | `completed/2026-08-09-Punch-List-Archive.md` |
| 5b, 5e, 5f, and three unnumbered `.map` items (all closed in 1.55.4) | `completed/2026-08-24-Punch-List-Archive.md` |
| 3, 8, 12, 13b, 13c, 13e, 13f, 17, 18 | `completed/2026-09-14-Punch-List-Archive.md` |

---

## 23. ✅ CLOSED — a non-ASCII byte in a string literal emitted one byte short (2026-09-17)

> **Compiled output: YES.** Listing, object AND binary all differ. Isolated by
> the 2026-09-17 Windows regen, which cleared every other stale-GOLD explanation
> in TOF — so with current GOLDs in place, this difference is **ours**.

**Failing:** `TEST/LARGE-tests/TOF/demo_180degrFOV` and
`isp_180degrFOV_TOFsensor`. Both fail identically in the LARGE suite (all three
outputs) and in the map-oracle GOLD test. Everything else in TOF, BLDC and COV
passes against the same regen batch.

**What is known:**

- Image **length matches** and **VAR size matches** in both; only content
  differs. First differing byte is early — `$30` for `isp_180degrFOV_TOFsensor`,
  `$d0` for `demo_180degrFOV`.
- These are the **two largest object trees in the suite**.
  `isp_180degrFOV_TOFsensor` is the only fixture with **three direct children**
  (`isp_pcf8575`, `isp_vl53l5cx`, `isp_hdmi_debug`), several of which have
  children of their own; `demo_180degrFOV` is simply the wrapper above it.
- **Not a shared-child dedup case** — checked: `isp_pcf8575` uses `jm_i2c` while
  `isp_vl53l5cx` uses `isp_i2c`, so no object appears twice in the tree.
- Every child compiles clean standalone, including `isp_vl53l5cx` with its
  86 KB `FILE` blob. The divergence appears only in the assembled parent.

**ROOT CAUSE — not the object tree at all.** The depth was a coincidence; these
two fixtures are simply the only ones in the corpus with a non-ASCII character
in a string literal:

```
screenTitle     BYTE    "-- 180° Field of View Sensor Debug --", 0
```

`isp_180degrFOV_TOFsensor.spin2:248` holds the degree sign as the UTF-8 pair
`c2 b0`. PNut has no Unicode model — it is byte-oriented and emits **both**
bytes, giving a 39-byte array. `loadFileAsString` decoded the file as UTF-8, so
`°` arrived as ONE JavaScript character and `charCodeAt` emitted ONE byte: 38.
Every method offset and DAT address after it shifted down by one
(`DVRCOMMAND` at `FFF000FA` against PNut's `FFF000FB`), which is why the
listing, object *and* binary all differed while `OBJ bytes` still matched.

⭐ **Why this hid for so long, and why WUMMI was always right:** latin1 was only
ever reached as a *fallback*, when the UTF-8 decode produced U+FFFD. WUMMI's
German sources are malformed UTF-8, so they fell through to latin1 and were
byte-exact by accident. Correctness depended on the source file being invalid.

**Fix:** `src/utils/files.ts` `loadFileAsString` now decodes latin1 — every byte
maps 1:1 to a character of the same value, which is exactly PNut's model and is
identical to UTF-8 for pure-ASCII source. UTF-16 is still detected, by embedded
NULs; the old `\xC0` heuristic went, since under byte-faithful decoding it fires
on any file containing that ordinary byte.

**Scope beyond these fixtures:** this affected *any* source with a non-ASCII byte
in a string literal, in any suite — the two TOF fixtures are just where the fresh
GOLDs made it visible.

**Verified:** LARGE 82/82 (was 80/82), MAP 349/349, WUMMI 49/49, full gated
regression **1000/1000 across 43 suites with zero skips** (was 986 + 2 skips).

**Separate defect fixed in the same pass:** the listing's
`Redundant OBJ bytes removed:` line was summing `earlyDeduplicationSavings` —
a compile-time cache/reuse count that removes nothing from the image — and had a
three-line variant PNut never prints (§21). It now reports the distiller's figure
alone, in PNut's single-line form. ⚠ Residual, not diagnosed: our distiller's
figure can still disagree with PNut's (this fixture reports 1_676 where PNut
prints no line) while both emit `OBJ bytes: 117_824`, so the images agree and
only the accounting differs. `compareListingFiles` filters these lines, which is
why no test sees it.
