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

### 5b. `--cache-verify` CLI flag (M1, deferred)

**What:** a CLI flag that, on every cache hit, also runs a fresh compile
of the same input and byte-compares the resulting binary. Mismatch raises
a clear cache-corruption error.

**Why deferred:** the comprehensive byte-equivalence regression test
(`describe.each` over 9 fixtures in `objectCache.test.ts`) gives the same
correctness backstop at PR time, which is the higher-leverage path.
`--cache-verify` becomes useful as an end-user ad-hoc diagnostic ("I'm
worried, let me run my own project's compile under cache-verify and have
peace of mind") but isn't structurally necessary if every PR has CI green.

**Trigger to revisit:** a user reports a cache failure on a project we
don't have a fixture for, AND the byte-equivalence test passes. That
combination means we want a runtime tool to reproduce in the user's own
environment.

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

### 5d. Manifest sidecar (Shape B / M3, deferred)

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

### 5e. Hash DAT FILE bytes into the cache key (theoretical gap A7)

**What:** when a child has `DAT data byte FILE "blob.bin"`, hash the
loaded bytes into the cache key alongside the source. Today the source
line `byte FILE "blob.bin"` enters the key; the resolved bytes do not.

**Why deferred:** only bites when `blob.bin` content varies across two
compiles of the same `.spin2` source — in practice requires either (a)
running the compile from two different working directories with different
files at the same logical path, or (b) build pipelines that regenerate
DAT files between cached compiles. Neither pattern appears in observed
project layouts.

**Trigger to revisit:** a user reports a "stale embedded blob" failure.
Fix is ~10 LOC: hash the result of `loadFileAsUint8Array` into the key.
CACHE_FORMAT_VERSION bump.

### 5f. Distiller record replay on cache hit (latent map-fidelity gap)

**What:** restore `objectDistiller.records` for cached subtrees so
`--map` output shows the full parent → child → grandchild hierarchy.
Today the `.sym` sidecar restores user symbols but not distiller
records, so grandchildren of cache-served children are missing from
the map.

**Why deferred:** affects `--map` output only; doesn't affect compile
correctness. Documented at length in
`DOCs/roadmaps/Object-Cache-Future-Enhancements.md` as "Option C —
Full distiller-state cache." Implementation is non-trivial because
distiller records cross-reference each other by IDs that are allocated
fresh each compile; a snapshot-and-replay approach needs an ID remap
layer.

**Trigger to revisit:** a user reports a `--cache --map` map file is
missing a grandchild they expected to see.

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

## 7. `copyright` excluded from the release package (added 2026-08-08)

**Surfaced by:** CLI-Robustness closeout, while reconciling the two packaging
paths.

The repo root `copyright` names `github.com/ironsheep/Pnut_ts_dev` — a private
dev repo — and credits Iron Sheep Productions only. The
`scripts-pkg/_dist/copyright` copy that has actually been shipping names the
public `github.com/ironsheep/PNut_TS` and credits **Iron Sheep Productions and
Parallax Inc.** The `_dist` text is the correct one to publish.

Because of this, `copyright` was deliberately left out of the release workflow's
document list — adding it as-is would publish the wrong text to every platform.

**Fix:** reconcile root `copyright` to the `_dist` wording, then add `copyright`
to the `for doc in ...` list at `.github/workflows/release.yml:112`. Two one-line
changes. Attribution wording is Stephen's call, not a mechanical merge.

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
