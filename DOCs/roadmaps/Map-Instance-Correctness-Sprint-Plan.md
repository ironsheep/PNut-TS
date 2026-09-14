# Map-Instance-Correctness Sprint Plan

**Status:** STARTED 2026-09-14. **Outgoing build: `1.55.8`** (agreed with Stephen
at sprint start).

## Sprint start record (2026-09-14)

- **Build number:** `1.55.8` — PNut v55 unchanged; patch bump. Ships two
  output-side breaks (§ Compatibility impact), led in the CHANGELOG.
- **Working tree:** clean at `74cbbe1`; nothing uncommitted or untracked in the
  blast radius (`src/`, `TEST/`, `scripts/`, `DOCs/`, `package*.json`).
- **Tracking readiness: READY.** Board empty (task #52 archived). Context pruned
  of three stale keys — `task_#51_progress` and `task_#52_progress` (both tasks
  complete) and the superseded `resume_pnut_ts_2026-09-13`. `MEMORY.md` 101 lines.
  Recurring observation (stranded breadcrumbs after `todo_complete`, second
  audit) recorded in `feedback_skill_evolution_candidates.md`.
- **Entry baseline (canonical — the dev container is the verdict environment):**
  build clean, 0 warnings (`npm run build`, full log grepped); `npm run lint`
  clean; `npm run build && jest --runInBand -c smm.jestconfig.js` → **26/26 suites,
  432/432 tests passed, 0 failed, 0 skipped** (143 s). No failure groups, so no
  fix-when decisions. **Not exercised by that runner** (outside its `roots`, run by
  their own category scripts): `ALLCODE-tests`, `CACHE-SWEEP-tests`, `COV-tests`,
  `FULL`, `LANG-FEAT-tests`, `PERF`, `SHORT`, `WUMMI-tests`. Known standing state
  there, not re-measured: `test-full` carries punch §9 failures; `WUMMI-tests`
  carries §21 (deferred). §4's GOLD corpora read fixtures in `COV-tests` and
  `WUMMI-tests` — those checks run inside the new MAP suite, not these runners.

**Scope, confirmed by Stephen 2026-09-14:** punch list §20 treated as a
**defect class** (every per-instance fact the `.map` prints, checked against the
compiled image), plus §14 (whole), §16 and §22. **Not in scope:** §21 (WUMMI
Group B — deferred, re-verify before any action), §13a, §13d, §10 (stays on the
punch list unchanged).

**Presentation authority:** how the map presents its content was delegated
("think from pedagogical perspective"; "keep it flowing well and conceptually
easy to understand"). The five-section format in §3 was reviewed with Stephen
and approved to build.

---

## 0. Open Questions — none remaining

Resolved 2026-09-14 by Stephen:

1. **Plan-time housekeeping.** (a) Dev-only `npm audit` advisories: **"fix a if we
   can"** — `npm audit fix --dry-run` resolves all three without `--force`; §10.
   (b) `docs-check` governed auto-add: **"yes do the doc maint. as needed"** — the
   three documents are §11.

---

## Why

The `.map` is how a P2 developer sees what the compiler actually built from
their object tree: which declarations share one compiled image (and so share
DAT), which fork, and where every instance's VAR lives. Two defects were found
while re-verifying P2KB's `map_caveat` (punch §20). Treated as a class, a
prototype ground-truth checker shows the map is wrong for **most** non-trivial
object trees. The compiled binary is correct in every case measured; only the
description of it is wrong — which is exactly the failure a developer cannot
detect by running the program.

## The defect class, measured

Prototype: `DOCs/analysis/map-instance-oracle-prototype/oracle.py` with 18 shapes
in `shapes/`. It decodes every object's header table from the compiled image —
per element, `(object offset, VAR offset)` longs until a long with bit 31 set —
and derives each instance's code base and VAR base as parent + offset. That rule
is the interpreter's own: `callh` in `src/ext/Spin2_interpreter.spin2` reads the
pair at `pbase + index*8` and does `add pbase,y` / `add vbase,z` at every call
depth (domain authority 2). The emitting side is `spinResolver.ts:4693-4701`
(one pair per array element) and `:5017-5029` (offsets filled in). Compared with
the map's `OBJECT DETAILS` (Location, VAR Base), `MEMORY LAYOUT` regions and
`ADDRESS INDEX` method addresses, uncached and warm-cache builds of 1.55.7:

| Shape | Result |
|---|---|
| S04 three forked copies · S11 identical leaves inside one parent | PASS |
| S01–S03 identical copies · S18 STRUCT copies | VAR base wrong after the first copy |
| S09 identical mids · **S10 forked mids** | VAR base of nested children wrong — **even for forks** |
| S12 two identical mids each with identical leaves | nested and copy VAR bases wrong |
| S16 zero-VAR children mixed with VAR children | VAR base wrong |
| S05 array only | elements 1..n-1 absent from every section |
| S06–S08 array then another OBJ · S13 array of parents · S14 array inside a child · S15 · S17 three levels | later siblings mis-mapped, `Object_<n>` placeholders, their methods missing from `ADDRESS INDEX` |
| S17 warm cache vs uncached | nested VAR bases differ between the two `.map` files; `.bin` identical |
| All shapes | `MEMORY LAYOUT` region start/size correct |

One more member, found by hand: **forked copies whose override changes a DAT
layout** (`CON SIZE`, `DAT buf BYTE 0[SIZE]`, `tag LONG 1`; `a | SIZE = 4`,
`b | SIZE = 100`) print the **same** DAT offsets for both — B's layout — so A's
`TAG` is listed at `+$6C` (`$00090`), outside A's own image (`$24-$39`). The
same mechanism applies to method-entry offsets and VAR symbol offsets.

**Not yet measured by the prototype** (the sprint's checker covers them):
instance labels and tree order, `Used by` sharing, DAT and VAR symbol addresses
in general, override display, summary counts.

## Root causes

Three index spaces are reconciled by assumption rather than by data:

1. **Declaration space vs header-slot space.** `recordedInstances` holds one entry
   per `OBJ` declaration (`compiler.ts`, the push in the child loop of
   `compileRecursively`, ~560-575); the header table holds one entry per array
   element. `assignDistillerRecords` (`compiler.ts:1128-1152`) zips a parent's
   declared children against the distiller record's `subObjectIds` with
   `Math.min(children.length, subObjectIds.length)`, so every sibling after an
   array is paired with the wrong slot. Element counts are known at parse time
   (`ObjFile.setObjectInstanceCount`, `spinFiles.ts:98-101`) but never recorded
   with the instance.
2. **Instance id vs distiller object id.** `getVarBaseForInstance`
   (`mapGenerator.ts:769-836`) finds a direct child's header slot by comparing a
   distiller object id (`subObjectIds[i] & 0x7fffffff`) with an `ObjInstanceStore`
   id — different numberings that coincide only in simple trees — and for deeper
   instances sums VAR sizes over `objectSymbolStore`, which is keyed by **source
   file** and whose contents differ between cached and uncached builds.
3. **Source file vs compiled variant.** `ObjectSymbolStore` stores one symbol list
   per source-file index (`objectSymbolStore.ts:26`; written at `compiler.ts:467`
   and `:671`), overwritten by each compile of that file. Every consumer reads it
   by `instance.sourceFileIndex` (`mapGenerator.ts:310`, `:488`, `:598`), so every
   fork of a file is described with the last-compiled variant's offsets.

The fix removes the reconciliation instead of repairing it: build the layout
from the compiled image, which already records the truth.

---

## 1. Layout model derived from the compiled image

**Current:** instance facts come from `recordedInstances` + distiller records +
the source-file symbol store, stitched together in `buildObjInstanceInfo`
(`compiler.ts:1033-1113`) and `assignDistillerRecords`, and repaired in
`mapGenerator` lookups.

**Target:** one model, `ObjectLayout` (new, `src/classes/objectLayout.ts`),
built once after the final image is complete (after distillation), used by the
map generator and nothing else needs to reconcile:

- **Instances** — walk the final image's header tables from the top object: for
  each slot, `codeBase = parentCodeBase + objOffset`, `varBase = parentVarBase +
  varOffset`, recursively. The top object's VAR base is the executable size
  already used today. Each instance carries its **slot path**.
- **Images** — distinct `codeBase` values; numbered `#1..#n` in address order
  (`#1` is the top object). Region size is the long after the method table.
- **Declaration metadata** — attached by expanding each parent's recorded
  declarations into slots using a new `elementCount` on the recorded instance
  (from `ObjFile`'s instance count): declaration `d[3]` occupies three slots named
  `D[0]..D[2]`. Name resolution from the parent's `type_obj` symbol keeps the
  existing correction at `compiler.ts:1063-1077`. Overrides as today.
- **Symbols per compiled variant** — see §2.
- **Own VAR size** per instance — recorded per compiled variant (the resolver's
  VAR size before children are appended), so the VAR layout can show an
  instance's own block separately from its children's.
- **Cache parity** — the cached instance subtree (`objectCache.ts:267`,
  `getInstances` `:441`) gains `elementCount`; `CACHE_FORMAT_VERSION`
  (`objectCache.ts:97`, now 9) is bumped. Because the model is built from the
  final image, a warm build and a cold build of the same source produce the same
  layout by construction.

**Shared-component audit:** `ObjectDistiller.buildObjectTree`
(`objectDistiller.ts:73-106`) also decodes header tables, but on the image it is
about to compact and with its own flat id numbering; it is the system whose
index space caused defect 2, so the layout walk does not reuse its records. The
walk is small and lives in `ObjectLayout`. `ObjInstanceInfo`/`ObjInstanceStore`
are replaced by `ObjectLayout`'s types; `assignDistillerRecords`,
`getVarBaseForInstance`, `getObjectNameByIndex` and `instancePathsForRecord` are
deleted.

**Verification.** Normal: every prototype shape matches the header walk for
code base, VAR base and slot count. Edge: 255-element array; array of arrays
through a child; zero-VAR objects; a child with a DAT block and no methods (the
header walk cannot distinguish "no methods" by bit 31 alone — confirm the
decoding against a GOLD `.obj` before relying on it, and add the shape); PASM-only
top file (no object table — map still generated). Error: a slot whose offsets
fall outside the image stops map generation with an internal error rather than
printing a guessed row.

## 2. Symbols belong to a compiled variant, not a source file

**Current:** `ObjectSymbolStore` keyed by source-file index; each compile of a
file overwrites the previous variant's symbols.

**Target:** symbols captured per compile of a child (each
`compileRecursively` call, and each cache hit's replayed symbols) and attached to
that compile's recorded instance; `ObjectLayout` gives each image the symbols of
any instance that uses it (identical bytes imply identical layout). Method entry
offsets, DAT offsets, PASM labels and VAR offsets are all read from the variant.
Existing non-map readers of `ObjectSymbolStore` (e.g. `compiler.ts:805`) keep
working or are migrated in the same change — inventory them in the task.

**Verification.** Normal: the `SIZE = 4` / `SIZE = 100` fork prints each image's
own `TAG` offset, inside its own region. Edge: forks differing only in a VAR
array size (VAR symbol offsets differ); a fork differing only in a method's code
size (method entry offsets differ); identical copies (one symbol set, shared).
Error: an image with no captured symbols prints its regions and addresses with
an empty symbol list, never another variant's.

## 3. The `.map`, rewritten to teach the layout

**Principles.** The map teaches two concepts: an **image** is compiled code plus
DAT, shared by every instance that uses it; an **instance** is one declared
object or array element, and **each instance has its own VAR**. Sections flow in
the order a reader asks: what did I write → what did the compiler build → where
did it land → the details → lookup. Every fact appears once, in the section that
owns it. Two identifiers join the sections: image `#n` and the instance path
(`A`, `A.LEAF`, `D[1]`, `A.D[1].LEAF`). Table cells are single tokens; lists in
cells are comma-joined without spaces; a contiguous run of three or more array
elements is written `D[0..4]`. Nothing is summarized into a count that hides
members.

**Sections** (header line and generation stamp as today):

1. **`=== SUMMARY ===`** — one plain sentence ("3 declarations became 4
   instances, built from 3 images; 1 image is used by 3 instances."), totals
   (code/DAT bytes, VAR bytes, program total), and a short fixed legend defining
   image, instance, shared DAT, own VAR, `#n` and path notation.
2. **`=== OBJECT TREE ===`** — every instance, array elements included, as a tree:
   path, source object, overrides, `image #n`.
3. **`=== MEMORY LAYOUT ===`** — one walk through hub memory in address order:
   each image (`code`, range, size, `#n`, source, overrides, used by), then each
   instance's own VAR block (`VAR`, range, size, path, `#n`), then the program
   total.
4. **`=== OBJECT DETAILS ===`** — one block per image: header line with range,
   source, overrides and users; **shared** entries once (methods with
   image-relative and absolute entry, DAT, PASM labels, inline PASM, the child
   slot table showing which image and VAR offset occupy each slot); then **each
   user's own VAR** symbols with absolute addresses.
5. **`=== ADDRESS INDEX ===`** then **`=== SYMBOL INDEX ===`** — reference
   tables: one row per address (code/method/DAT/PASM rows owned by `#n`, VAR rows
   owned by an instance path) and one row per symbol occurrence.

**Current code:** `mapGenerator.ts` sections at `:99` summary, `:129`/`:149`
hierarchy, `:187` layout, `:275` details, `:456` address index, `:573` symbol
index; `summarizeInstances` `:754`. Written synchronously at `:69` (keep).

**Target:** the generator reads only `ObjectLayout`. The section and column
grammar is specified in `MAP-File-Format.md` (§9) before the generator is
finished, and the checker (§4) parses exactly that grammar.

**Compatibility.** A breaking change for anything that parses `.map` — the
second in two releases. The CHANGELOG says so above the fix list, with the
section names that changed.

**Verification.** Normal: the worked example in `MAP-File-Format.md` is produced
byte-for-byte by the generator (a test compiles it). Edge: PASM-only program;
program with no VAR; object with no DAT; 255-element array (element runs
compress); deep path names wider than the column minimum. Error: map requested on
a failed compile produces no `.map` (existing behavior, `Preprocessor.md` —
reproduce, do not assume).

## 4. Ground-truth checker (the class's regression net)

**Target:** a test-side checker that never imports `ObjectLayout`, `mapGenerator`
or the distiller.

- **Decoder** (`src/tests/MAP-tests/mapOracle.ts`, promoted from the prototype):
  reads raw image bytes from a listing image dump, a compiler `.obj`, or a
  Windows **`.obj.GOLD` (8-byte header: VAR size, image length; image follows —
  measured on `TEST/COV-tests/coverage_001.obj.GOLD`)**; walks header tables by
  the interpreter rule; yields images, slot paths, code/VAR bases, method entry
  addresses, region sizes.
- **Map parser** for the §3 grammar (test-side, shared by the MAP suites).
- **Expectations from construction.** Generated shapes carry their expected tree
  (names, element counts, overrides), VAR symbol offsets (from declared sizes),
  and DAT markers: each DAT symbol under test is a `LONG` with a unique magic
  value, located in the image bytes — an address witness independent of every
  compiler symbol table.
- **Matrix** (`TEST/MAP-tests/shapes/`, committed, parallel-safe via staging): the
  18 prototype shapes; the DAT-layout fork; VAR-size and code-size forks; STRUCT
  copies (§16); DAT-only child; 255-element array; PASM-only top. Each compiled
  uncached and warm-cached; the two `.map` files must be identical.
- **GOLD corpora:** every existing fixture with an `.obj.GOLD` and child objects
  (`OBJ-tests`, `COV-tests/coverage_001`, `LARGE-tests` HUB75/TOF/PnlLtMeas, and
  WUMMI except the §21 fixtures): structural checks — image regions, slot count,
  VAR bases, method addresses — reading **PNut's** bytes.
- **`npm run map-fuzz`** — seeded random object trees (depth, arrays, identical
  vs forked overrides, VAR/no-VAR, STRUCT, DAT-size forks), cold vs warm cache,
  same checks; prints the seed of any failure. Precedent:
  `scripts/cache-order-fuzz.sh`.

**Hard stop — confirm the measurement first.** The checker and `ObjectLayout`
both walk header tables, so a shared misunderstanding would pass both. Before a
checker FAIL is treated as a compiler defect — or a PASS as proof — confirm the
decode by a second path: the same fixture's Windows `.obj.GOLD` bytes, and the
interpreter's `callh` rule. A disagreement between the checker and GOLD bytes is
a checker defect first.

**Verification.** Normal: all matrix shapes and GOLD corpora pass after §1–§3.
Negative controls: run the checker against the **1.55.7** map output for the
matrix and confirm it reports the failures in the table above (it must be able
to fail); corrupt one VAR base in a copied `.map` and confirm one FAIL naming it.

## 5. MAP test harness (punch §14a, §16)

**Current:** `src/tests/MAP-tests/map.test.ts` compiles in place in
`TEST/MAP-tests/testN/` via `execSync`; `verify-map.ts` cross-checks `.map` against
`.lst` and `expected.json`; method entries only against `mapEntry >= 4*(methods+1)`
(`verify-map.ts:264-274`). `objectCache.test.ts` also compiles in place in
`TEST/MAP-tests/test4-override` — two suites writing one directory. No fixture
has an OBJ array, merged copies with VAR, or a STRUCT.

**Target:** `verify-map.ts` and `expected.json` files updated to the §3 grammar;
method entries asserted exactly (`absolute == image base + relative`, both from
the map, image base cross-checked by the §4 decoder); fixtures staged into a
temporary tree (`stageTree`, `src/tests/CACHE-tests/cacheFixtures.ts:113-127`)
so no MAP suite writes into `TEST/`; a STRUCT fixture (`TEST/MAP-tests/test8-struct`,
adapted from `TEST/LANG-FEAT-tests/struct_basic.spin2`) asserting struct VAR
symbols and their sizes; `TEST/MAP-tests/README.md` documents all fixtures (it
currently describes three of seven).

**Verification.** Normal: seven existing fixtures plus the STRUCT fixture pass.
Edge: struct containing a nested struct and an array member. Error: an
`expected.json` naming a symbol the map lacks fails with the symbol's name.

## 6. Test isolation (punch §14b)

**Current:** `package.json:59` `"test": "npm run build && jest -c
smm.jestconfig.js"` — no `--runInBand`, while `.claude/skill-conventions.md`
records the in-band command and Stephen ruled (2026-09-13) that the full suite
runs in band. `objectCache.test.ts` (integration block, ~567-611) compiles in
place into `TEST/OBJ-tests` and `TEST/MAP-tests/test4-override` with the default
`.pnut-cache`.

**Target:** both remedies, since they fix different things: `--runInBand` added
to the `test` script (matches the recorded rule), and `objectCache.test.ts`
moved onto `stageTree` with a private cache directory (removes the hazard rather
than serializing around it).

**Verification.** Normal: `npm test` runs in band and passes. Edge: run
`map.test.ts` and `objectCache.test.ts` concurrently (two jest processes) — no
cross-suite failures. Error: n/a.

## 7. Output files written completely (punch §22)

**Current:** unawaited `fs.createWriteStream` for the listing (`spin2Parser.ts`,
`P2List` `:163-169`, `stream.end()` `:461`) and the preprocessor report
(`spinDocument.ts:287`, `-i`); also `regression.ts:33`, `:69`, `:100`
(`--regression`); `dumpUniqueChildObjectFile` / `dumpUniqueObjectFile`
(`src/utils/files.ts:285-320`) whose only callers are commented out
(`compiler.ts:623`, `:868`).

**Target:** build text in memory and `fs.writeFileSync` once, as
`mapGenerator.ts:69` does, for `.lst`, the preprocessor report and the
`--regression` outputs; delete the two dead dump helpers and the commented calls.

**Verification.** Normal: listing and `-i` report byte-identical to before across
the full suite (listing GOLDs). Edge: a test reads `.lst` in-process immediately
after compile returns and sees the complete file. Error: an unwritable output
path reports the error and exits non-zero (reproduce today's behavior first).

## 8. `p2kb-verify` and the P2KB `map_caveat`

**Current:** `scripts/p2kb-dedup-verify` parses `MEMORY LAYOUT` / `SYMBOL INDEX`
rows in the 1.55.4 format and exercises only forked copies;
`DOCs/roadmaps/P2KB-map-caveat-retraction-1.55.4.md` proposes caveat text with a
"Known wrong through 1.55.7" block.

**Target:** the script reads the §3 format and adds identical-copy VAR, array and
DAT-layout-fork cases; the P2KB document's replacement text is re-measured
against the sprint build and rewritten to what is then true (expected: a short
"reliable from 1.55.x" statement, with the ≤1.55.3 and 1.55.4–1.55.7 history kept
brief). Stephen applies it; the live entry is verified by `p2kb_get`, not by
asking.

**Verification.** Normal: `npm run p2kb-verify` passes against the entry's own
cases plus the new ones. Error: a case whose `Objects:` count disagrees with the
entry fails naming the case.

## 9. Documentation

Conformance: `DOCs/voicing/README.md` for all; `Shipped-Docs-Voicing.md` for
`README.md` and `CommandLine.md`; `central:changelog-voicing` for `CHANGELOG.md`.

- **`DOCs/internals/MAP-File-Format.md`** — rewritten for the §3 format: concepts
  (image, instance, shared DAT, own VAR), the section grammar, the worked
  example (generated by the compiler, see §3), arrays, forks with differing
  layouts, cache parity, notes for parser authors. Authority paragraph repointed
  from `buildObjInstanceInfo` to `ObjectLayout`. `verified` stamped to the
  release.
- **`CommandLine.md`** — the `-m` row describes the map in the new terms.
- **`README.md`** (`:53`) — feature line updated; format change noted.
- **`CHANGELOG.md`** — breaking change first (`.map` format; cache discarded on
  upgrade by the format bump), then the fixes stated as user-visible facilities.
- **`DOCs/internals/Object-Cache-Theory-of-Operations.md`** (`:154`, `:439-445`) —
  what the `.sym` sidecar now carries (per-variant symbols, element counts) and
  the format version.
- **`DOCs/internals/Distiller-Theory-of-Operations.md`** (`:63`, `:308`) — the map
  no longer reads distiller records.
- **`DOCs/internals/Theory-of-Operations.md`** (`:397`) — `.lst` and the
  preprocessor report join the synchronous writes.
- **`TEST/MAP-tests/README.md`** — §5.
- **`DOCs/roadmaps/Test-Suite-Punch-List.md`** — close §14, §16, §20, §22 to the
  dated archive at closeout.

## 10. Dependency advisories (dev-only)

**Current:** `npm audit` reports 3 advisories — `js-yaml` (high; via `eslint`
and `@eslint/eslintrc`), `browserslist` (high), `baseline-browser-mapping`
(moderate). `npm audit --omit=dev` reports 0: no compiler user is exposed.

**Target:** `npm audit fix` without `--force` (the dry run resolves all three
within declared ranges); commit `package-lock.json` only. If the real run wants
to touch `package.json` or move a major version, stop and confirm the
measurement — the dry run said it would not.

**Verification.** Normal: `npm audit` reports 0; build, lint and the full suite
pass. Edge: `npm run bld-dist` still packages (the lockfile feeds the packaged
build). Error: n/a.

## 11. Documentation maintenance — `docs-check` governed auto-add

The three most-stale governed documents, re-verified whole against current
source, corrected where wrong, and stamped `verified` to the release. Rules:
`DOCs/voicing/README.md` for all three; `DOCs/voicing/Usage-Guide-Voicing.md` for
the two usage guides. Every claim is reproduced — examples compiled with the
sprint build, diagnostics quoted from real output, behavior claims checked in
`spinResolver.ts` / `parseUtils.ts` (and against `REF-V52A/p2com.asm` where the
guide asserts PNut parity). Line citations that add nothing over a symbol name
become symbol names, so they stop drifting.

- **`DOCs/language-specification/REQUESTS/PNUT-TS-MISSING-EFFECTS.md`** (144 lines,
  last touched 2025-12-23) — a resolved record of which instructions accept which
  flag effects (`WC`/`WZ`/`WCZ`), with `spinResolver.ts` line citations. Verify
  every effect rule against the effect-parsing routines it names (e.g.
  `tryWCZ`), correct rules and citations, and keep its RESOLVED status accurate.
  It sits in the language-specification tree that punch §10 keeps as-is; this
  section touches only this document.
- **`DOCs/internals/usage-guides/Data-Packing-Alignment-Guide.md`** (427 lines,
  21 Spin2 examples) — claims about sequential packing, `ALIGNW`/`ALIGNL`, and
  instruction alignment in DAT. **Its VAR-packing claims bear directly on the VAR
  symbol offsets §2 and §4 check**: verify them first and use the result in the
  §4 expectations, not the other way round. Section structure brought to the
  usage-guide seven-section form where it departs.
- **`DOCs/internals/usage-guides/Inline-PASM-Usage-Guide.md`** (549 lines, 26
  Spin2 examples) — `ORG`/`ORGH`…`END` inline blocks, local-variable access,
  limits. Verify limits and diagnostics against the resolver; compile every
  example.

**Verification.** Normal: every example compiles as the guide says (or fails
with the quoted diagnostic); every stated rule has a source citation or a
compiled demonstration. Edge: claims about limits (block size, register access)
exercised at the boundary. Error: a claim that cannot be reproduced is corrected
or removed, never kept with a hedge. `docs-check` shows the three as current.

---

## Documentation Blast Radius

**`docs-check` at plan time (2026-09-14):** `current: 22 · stale: 42 ·
unclassified: 0`. Governed auto-add for this sprint:
`PNUT-TS-MISSING-EFFECTS.md`, `Data-Packing-Alignment-Guide.md`,
`Inline-PASM-Usage-Guide.md` — taken as §11. Also stale and relevant:
`Distiller-Theory-of-Operations.md` (updated in §9 for the parts this sprint
changes; the whole-document re-verification is not claimed).
`MAP-File-Format.md` reads current (verified 1.55.5) and is rewritten in §9.

**First search** — `git ls-files '*.md' | xargs grep -ln -iE
'\.map\b|--map|memory map|MEMORY LAYOUT|SYMBOL INDEX|OBJECT DETAILS|OBJECT HIERARCHY'`,
historical classes (`DOCs/roadmaps/completed/**`, roadmaps and analyses) excluded
as a class:

| Document | Disposition |
|---|---|
| `DOCs/internals/MAP-File-Format.md` | **Update** — §9 |
| `CommandLine.md` | **Update** — §9 |
| `README.md` | **Update** — §9 |
| `CHANGELOG.md` | **Update** — §9 |
| `DOCs/internals/Object-Cache-Theory-of-Operations.md` | **Update** — §9 |
| `DOCs/internals/Distiller-Theory-of-Operations.md` | **Update** — §9 |
| `DOCs/internals/Theory-of-Operations.md` | **Update** — §9 (§22 writes) |
| `TEST/MAP-tests/README.md` | **Update** — §5 |
| `DOCs/roadmaps/P2KB-map-caveat-retraction-1.55.4.md` | **Update** — §8 |
| `DOCs/README.md` (`:14`, `:69`) | Excluded — index lines stay true; re-read at closeout |
| `Preprocessor.md` (`:255`), `usage-guides-new/Preprocessor-Usage-Guide.md` (`:367`) | Excluded — "a failed build deletes outputs including `.map`": **out of scope, NOT verified** (§3 error case reproduces it) |
| `DOCs/internals/SPIN2-BIN-Format.md` (`:131`) | Excluded — historical note on the 1.55.4 writers; NOT verified |
| `DOCs/RELEASE-PROCESS.md` (`:249`, `:269`) | Excluded — release-history rows |
| `MANUAL-FEATURE-DISTRIBUTION-GUIDE.md`, `String-Constants-Usage-Guide.md`, `ORG-Directives-Usage-Guide.md`, debug-window ToOs (`Data-Packing-Alignment-Guide.md` is re-verified whole in §11) | Excluded — "memory layout / memory map" of hub memory or data, not the `.map` file |
| `DOCs/Regression-Test-Coverage-Report.md` | Excluded — punch §13d, stale by banner |

**Shipped set:** `README.md`, `CHANGELOG.md`, `CommandLine.md` updated;
`Preprocessor.md` excluded as above; `AUTHORS`, `LICENSE`, `copyright` untouched.

**Duplication:** the map format is specified only in `MAP-File-Format.md`;
`CommandLine.md` and `README.md` describe it in one line each and link — keep it
that way.

## Compatibility impact

No previously accepted **input** becomes a failure. Two output-side breaks:

1. **`.map` format** — section names, columns and row model change (§3). Safety
   net: the §4 checker and §5 suites parse the new grammar; the CHANGELOG leads
   with the break.
2. **Object cache** — `CACHE_FORMAT_VERSION` bump; the first build after
   upgrading recompiles everything (as at 1.55.4).

Gate: full suite (`npm run build && jest --runInBand -c smm.jestconfig.js`) plus
`npm run cache-fuzz`, `npm run map-fuzz` and `npm run p2kb-verify`, and
`npm audit` clean after §10.

---

## Dispatch record

- **Dispatch model:** `arbiter-serial` — same as the project default
  (`DISPATCH_MODEL` in `.claude/skill-conventions.md`). Every task compiles
  into or runs suites over the shared `TEST/` tree, and «#60»→«#61»→«#62»/«#63» are
  coupled on the `ObjectLayout` shape and the map grammar. One agent at a time; the
  arbiter runs every jest suite, `cache-fuzz`, `map-fuzz` and `p2kb-verify`.
- **Two-phase (design returned for review before implementation):** «#59» (map
  grammar — reviewed by Stephen too, since the format was approved in outline) and
  «#60» (`ObjectLayout` + per-variant symbols).
- **Atomic green-unit:** «#61» (generator rewrite) leaves `map.test.ts` and
  `p2kb-verify` red by design; «#62» restores `map.test.ts`, «#64» restores
  `p2kb-verify`. Both tasks carry the text.
- **Ordering notes (rework pass):** «#56» verifies the VAR-packing rule before
  «#58» encodes it in expectations (discovery before utilization); «#59» fixes
  the grammar before «#61» applies it and «#62»/«#63»/«#64» parse it (standards
  before application); «#60» precedes «#61» (foundation before building);
  documentation «#65» follows every behavior change.

## Section ↔ task cross-reference

Sprint tag: `map-instance-1558`.

| Plan § | Deliverable | Task | seq |
| ------ | ----------- | ---- | --- |
| §10 | Dev-only npm audit advisories | «#53» | 1 |
| §7 | Synchronous `.lst` / `-i` / `--regression` writes (punch §22) | «#54» | 2 |
| §6 | Test isolation, `npm test` in band (punch §14b) | «#55» | 3 |
| §11 | Data-Packing-Alignment guide re-verified (feeds §4) | «#56» | 4 |
| §11 | MISSING-EFFECTS record + Inline-PASM guide re-verified | «#57» | 5 |
| §4 | Image ground-truth decoder + shape matrix (part 1) | «#58» | 6 |
| §3 | Map grammar specified in `MAP-File-Format.md` [two-phase] | «#59» | 7 |
| §1, §2 | `ObjectLayout` from the image; symbols per variant [two-phase] | «#60» | 8 |
| §3 | `mapGenerator` rewritten to the five-section format [green-unit] | «#61» | 9 |
| §5 | MAP harness: new grammar, exact entries, STRUCT, staging (punch §14a, §16) | «#62» | 10 |
| §4 | Every map fact checked: matrix, GOLD corpora, `map-fuzz` (part 2) | «#63» | 11 |
| §8 | `p2kb-verify` + P2KB `map_caveat` re-measured | «#64» | 12 |
| §9 | Documentation current for 1.55.8 | «#65» | 13 |
