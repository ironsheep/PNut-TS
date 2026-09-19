# Test Suite Punch List

Items deferred from the v1.54.3 cache-fix release that need follow-up. These
were uncovered while auditing `npm run test-full` and `npm run audit-errors`
before release. None block the v1.54.3 fix; all should be addressed before
they accumulate further.

---

## Status index (2026-09-19)

**Compiled output** asks one question: does this item mean the compiler can
produce a wrong program (`.bin` / `.obj` / `.flash`)?

| # | Item | Compiled output | Status |
|---|---|---|---|
| 4 | Dead flash/RAM download code | no | open |
| 5 | Object-cache hardening | no observed defect | open, deferred by trigger |
| 6 | GOLD-regen workflow cleanup | no | open — only 6.2 (EXCEPT errout format) left; 6.4 closed by the Windows regen and archived 2026-09-19 |
| 10 | Language-spec extraction pipeline | no | open — measured 2026-09-17, Stephen's decision (repair vs retire) |
| 19 | Coverage gate unmeetable | no | open |

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

## Closed and archived

Item numbers are never reused, so references elsewhere stay valid.

| Items | Archive |
|---|---|
| 7 | `completed/2026-08-09-Punch-List-Archive.md` |
| 5b, 5e, 5f, and three unnumbered `.map` items (all closed in 1.55.4) | `completed/2026-08-24-Punch-List-Archive.md` |
| 3, 8, 12, 13b, 13c, 13e, 13f, 17, 18 | `completed/2026-09-14-Punch-List-Archive.md` |
| 6.4, 14 (14a, 14b), 16, 20, 21, 22, 23 (all closed in 1.55.8) | `completed/2026-09-19-Punch-List-Archive.md` |

---
