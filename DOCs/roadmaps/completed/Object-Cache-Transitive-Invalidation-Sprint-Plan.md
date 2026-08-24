# Object Cache Transitive Invalidation — Sprint Plan

> **STATUS: CLOSED — 2026-08-24.** Twelve of thirteen sections certified SHIPPED
> against current code; §12 (the P2KB `map_caveat` retraction) is PARTIAL and
> carried over, blocked outside this repository. §6 and §9 audited PARTIAL at
> closeout and were fixed before closing. Shipped in build **1.55.4**, tag
> `v1.55.4` on `main`.
> Closeout audit: [`2026-08-24-Object-Cache-Transitive-Invalidation-CLOSEOUT.md`](2026-08-24-Object-Cache-Transitive-Invalidation-CLOSEOUT.md)
> — read it for per-section evidence, the exit baseline, the six deliverables
> that shipped outside this plan, and carryover items.

**Status:** started 2026-08-21
**Planned:** 2026-08-21
**Ships as:** 1.55.4 (`package.json`; mirror to `package-lock.json` and `src/pnut-ts.ts`)

## Sprint entry record

**Working tree (sprint-start §2).** Clean at start — no uncommitted edits, no
untracked files. Planning artifacts committed as `ccd2e9f`.

**Tracking readiness (sprint-start §3).** READY. 1 completed task archived
(`archive_20260821_222750.md`); todo-mcp context 2 keys / 1293 B, both live;
`MEMORY.md` 94 lines (audit threshold ~150); no stranded `task_#N_*` keys.
Noted as removal candidates, not acted on: `project_cli_robustness_state_2026-08-08.md`
and `project_preproc_symbols_state_2026-08-09.md` (closed sprints, but both still
carry design decisions to respect).

**Entry baseline (sprint-start §4), measured 2026-08-21.**

Build: `npm run build` clean, **zero warnings**.

| Suite set | Result |
|---|---|
| `TEST_COMMAND` (`jest -c smm.jestconfig.js`) | **325 / 325 passing, 20 / 20 suites** |
| `CACHE-tests` (`npm run test-cache`) | 59 / 59 passing — **tracked, but NOT in `TEST_COMMAND`** |
| `LANG-FEAT-tests` | 11 / 11 passing — **tracked, but NOT in `TEST_COMMAND`** |
| `WUMMI-tests` | 46 / 49 — fixtures are gitignored (`.gitignore:258`), local-only |
| `COV-tests`, `FULL/`, `SHORT/` | not measured — container-mode gated / config variants |

The TOF large-file timeout did not fire.

**Runner-coverage finding (baseline-health §3).** 27 compiled test files exist;
`smm.jestconfig.js` invokes **20**. The seven it does not invoke are named above.
Two of them — `CACHE-tests` (59 tests) and `LANG-FEAT-tests` (11) — are fully
tracked suites that are green but invisible to the project's standard regression
command. `CACHE-tests` is the suite this sprint changes most, and §6 adds a
second cache suite beside it.

**WUMMI failure group.** All three failures share one cause: GOLD mismatch on
listing + object + binary (`FG1.spin2`, `Main.spin2`, `Mustererkennung.spin2`).
Not timeouts. Per the project rule a GOLD mismatch is a real defect, never a GOLD
problem — but the fixtures are gitignored and local-only, so this is outside the
tracked baseline and outside this sprint. Recorded here so it is not rediscovered
as new.

**Entry baseline for closeout comparison:** build clean / 0 warnings ·
325/325 on `TEST_COMMAND` · 59/59 cache · 11/11 lang-feat.

## Open Questions

**None.** All planning questions were resolved with Stephen on 2026-08-21 before
this document was written. Decisions are recorded inline in the sections they
govern; the reasoning that produced them is in
[`Object-Cache-Correctness-Analysis.md`](Object-Cache-Correctness-Analysis.md).

---

## What this sprint fixes, stated once

**A stale object cache breaks the DAT-singleton guarantee.**

That is the whole defect, and it is worth stating in those terms rather than as
"the cache serves stale bytes," because the byte staleness is the mechanism and
the broken singleton is the consequence a P2 developer actually experiences.

The Spin2 object model guarantees that N declarations of the same object collapse
to one compiled image and therefore **one DAT region** — this is the
`singleton_object` archetype, and it is how shared resource state (a lock, a cog
handle, a mount flag) is meant to be held. The collapse is performed by
comparing **compiled-image content**:

> pnut-ts de-duplicates object images by COMPILED-IMAGE CONTENT, not by
> override-set identity. Same source, byte-identical image → ONE shared image,
> ONE shared DAT (singleton). **DAT is shared per compiled image; VAR is per
> instance.**
> — P2KB `p2kbSpin2ObjectImageDedup`, measured against pnut-ts v1.55.0

When the cache returns a stale image for one declaration and a fresh image for
another, those two images are **no longer byte-identical**.
`findDuplicateChild()` (`src/classes/compiler.ts:530`) stops matching them, and
the program gets two images — **two independent DAT regions**. A singleton
driver silently becomes two singletons: separate lock, separate mount state,
separate cog handle. No diagnostic, at any severity.

Measured on the `diamond` reproduction at v1.55.3:
17489 bytes / `Objects: 3` → **25693 bytes / `Objects: 4`** on a warm cache after
editing the driver, with the warm map showing two DAT regions
(`$00028 8204 driver D` and `$0204C 8204 object_3 D`).

### Root cause

`computeKey()` (`src/classes/objectCache.ts:213`) hashes only the child's **own**
inputs: `allPreprocessedLines`, overrides, `compilerVersion`, `enableDebug`,
`CACHE_FORMAT_VERSION`, `defSymbols`. Nothing about its `OBJ` children's content.

`#include` is textual and therefore lands in `preprocessedLines`, so the
"transitively captures all `#include` content" comment is true — and is the trap.
`OBJ` is a separate compilation unit whose bytes are embedded via
`compile_obj_blocks` and appear nowhere in the parent's source. On a hit
(`src/classes/compiler.ts:210`) the cached binary is injected and the subtree is
skipped, so the grandchild is never visited and its key is never computed.

The invariant we need — *a parent's key changes when any descendant's bytes
change* — was assumed to follow from the invariant we have — *each object's key
covers its own source*. It does not: the indirection holds only when the
grandchild is **visited**, and it is visited only when its parent **misses**,
which is the thing caching exists to prevent.

**We had written the false assumption down.** Row A8 of
`Object-Cache-Correctness-Analysis.md:52` reads *"Each grandchild's compiled
binary | recursive | Captured indirectly: each grandchild has its own cache
key."* §9 of this plan corrects it.

---

## 1. Dependency manifest — the core fix

**Why.** Close the invariant gap above by recording what a cached subtree was
built from, and re-checking it before the entry may be used.

**Current code.** The miss path already establishes the idiom this extends:
`compiler.ts:179-193` snapshots `defSymbolsLengthAtKey` and `recordCountAtKey`
*before* a child's recursion, then slices the subtree contribution out at store
time (`compiler.ts:497-502`). Manifests follow the same shape, but compose
recursively rather than by slicing a shared array.

**Target behavior.**

Define a manifest as a list of `{resolvedPath, contentHash}` covering every
source input in a child's subtree. It composes recursively:

- **on miss** — `manifest(self) = {self.fileSpec} ∪ blobs(self) ∪ ⋃ manifest(child_i)`
- **on hit** — `manifest(self)` is read from the entry's sidecar; it was already
  validated as the condition of the hit, and propagates to the parent unchanged

**Validation on hit.** Before accepting an entry, re-read each recorded path and
re-hash it. Any mismatch — differing hash, or a path that no longer exists — is
treated as a **miss**: compile normally. Because a parent's manifest covers its
entire subtree, validating at the point of hit covers every descendant; there is
no separate recursive descent.

**Implementation decisions** (internal; no user-visible surface):

- **`contentHash` is SHA-256 of the file's raw bytes.** Not mtime+size: mtime is
  unreliable across fresh checkouts, CI, and container bind-mounts — all normal
  in this project — and a false *match* is a silently wrong binary, which is the
  failure class being fixed.
- **Manifest lives in a new `<key>.dep` sidecar.** It gates whether the entry may
  be used, so it must be read *before* `get()` — which is also where hit/miss
  counters increment (`objectCache.ts:246-254`). Folding it into `.dbg`
  (read at `compiler.ts:222`, i.e. *after* acceptance) would invert that order and
  drag the stats logic into the change. `.dbg`'s own header comment already
  records that it has outgrown its name; a third unrelated payload makes that
  worse.
- **`#include`d files need no manifest entries.** Include content is textual and
  already lands in `preprocessedLines`, which is hashed into the key (row A1).
  Only `OBJ` descendants and `DAT ... FILE` blobs (§2) are absent from the key.
- **Manifest entries are path-anchored.** Validation re-reads the recorded path,
  so moving or renaming a tree invalidates rather than silently accepting. This
  is deliberate; §11 documents it.

**Integration points.** `objectCache.ts` — `CacheKeyInputs` unchanged (the
manifest is *not* hashed into the key; it is validated beside it), new
`getManifest()` / manifest field on `CacheStoreOptions`, new `depPath()`.
`compiler.ts` — validation ahead of `get()` at `:210`; manifest assembly at the
store site `:455-520`.

**Verification.**
- *Normal:* edit a depth-3 leaf; warm compile must byte-match a cold compile.
- *Normal:* unchanged tree still hits — the fix must not disable caching. Assert
  hit counts, not just output equality.
- *Edge:* diamond — the same object reached at depth 1 and depth 2; exactly one
  DAT region before and after mutation.
- *Edge:* a manifest path deleted between compiles → miss, not a crash.
- *Edge:* touched-but-unmodified file (mtime changes, content does not) → still a
  hit. This is what proves we hash content rather than stat.
- *Error:* `.dep` missing or malformed on an entry → treated as a miss, with the
  same "run with `--cache-clear`" guidance as the `.dbg` path.

---

## 2. Fold in A7 — `DAT ... FILE` blob bytes

**Why.** `DAT data byte FILE "blob.bin"` loads bytes from disk at compile time and
writes them into the binary, but the blob is **not** in the cache key today (row
A7, `Object-Cache-Correctness-Analysis.md:52`, marked `no`). Edit the blob, leave
the `.spin2` untouched, and a warm cache serves a binary carrying the old blob —
the same silent-wrong-output class as §1, closed by the same mechanism.

**Current code.** Blobs load at `compiler.ts:417` via
`loadFileAsUint8Array(datFile.fileSpec, this.context)`, iterating `datFileList`
(`compiler.ts:332`). `datFile.fileSpec` is already a resolved path, and the loop
sits inside `compileRecursively` at the child level — the same scope where the
manifest is assembled.

**Target behavior.** Every `datFile.fileSpec` in the child's `datFileList` becomes
a manifest entry, validated identically to source entries.

**Scope boundary — what this does NOT close.** §5.4-2: the same logical name
resolving to a *different file* under different `-I` paths or working
directories. The manifest hashes the file resolved **at store time** and does not
re-run resolution at hit time, so a path now pointing elsewhere still validates
clean. This remains open, is recorded as open in §9, and must not be described as
covered.

**Verification.**
- *Normal:* edit the blob only → warm compile matches cold.
- *Edge:* blob referenced from a depth-2 object → invalidates the whole chain
  above it.
- *Error:* blob deleted between compiles → miss and the existing load-failure
  diagnostic, not a stale hit.

---

## 3. Cache format version bump

**Why.** Caches already poisoned in the field must self-invalidate on upgrade
rather than requiring users to know to run `--cache-clear`.

**Current code.** `CACHE_FORMAT_VERSION = 6` (`objectCache.ts:81`), hashed into
every key (`objectCache.ts:224`) and checked by all three sidecar readers
(`:264`, `:283`).

**Target behavior.** Bump to **7**. Every existing key changes, so no v6 entry is
reachable; the first compile after upgrade is a full cold compile.

**Verification.**
- *Normal:* a v6 cache directory present at startup produces zero hits and a
  correct binary.
- *Edge:* `--cache-clear` still removes v6 leftovers.

---

## 4. Shared cache test scaffolding

**Why.** `src/tests/CACHE-tests/objectCache.test.ts` is a single 1231-line file
whose helpers (`makeTempCacheDir:23`, `cleanupDir:28`, `makeTextLines:34`) are
local to it. The invalidation class needs capability those helpers do not have:
stage a tree, compile, **mutate one file**, recompile, compare. Building that
second copy inside a second test file is how scaffolding stops being shareable —
so it is extracted first, not "refactored to shared later."

**Target behavior.** New `src/tests/CACHE-tests/cacheFixtures.ts` providing tree
staging into a temp dir, single-file mutation, cold/warm compile drivers, and
accessors for the assertion signals in §6. The existing suite is converted onto
it in this same task, so exactly one copy exists at all times.

**Verification.** Full `npm run test-cache` (59 tests) green after conversion,
with no change to any existing test's assertions.

---

## 5. The singleton-diamond fixture family

**Why.** Every property this sprint must prove needs to coexist in one program,
and that program must be one a P2 developer **should** write. A fixture that
only a mistake would produce is an interference pattern: a reader cannot tell
whether a failure means the compiler is wrong or the source is.

The `singleton_object` archetype supplies the justification. A DAT-singleton
holding shared resource state is *meant* to be declared by every object that
needs it, relying on content-dedup to collapse to one DAT
(P2KB `p2kbSpin2ObjectArchetypes`, `p2kbSpin2ObjectImageDedup`). The diamond is
the archetype working as designed.

**Target.** New family under `TEST/CACHE-fixtures/` (flat, prefixed — matching
the existing `expdef_*` / `dbg_cache_*` convention):

```
app_top.spin2              top_level_application archetype
  shr  : "shared_state"    singleton, declared directly          depth 1
  log  : "svc_logger"                                            depth 1
  log2 : "svc_logger"      repeated instantiation → §7/§8        depth 1
  cfg  : "svc_config"                                            depth 1

svc_logger.spin2           library object that also needs the singleton
  shr  : "shared_state"    DIAMOND arm 1                         depth 2
  fmt  : "fmt_util"                                              depth 2

svc_config.spin2
  shr  : "shared_state"    DIAMOND arm 2                         depth 2
  DAT  cfgblob BYTE FILE "cfg_defaults.bin"    → §2 (A7)

shared_state.spin2         the DAT singleton: lock + counter in DAT
  tick : "tick_leaf"                                             depth 3

tick_leaf.spin2            the transitive mutation target
```

Also carries a `#pragma exportdef` propagation path, so the v1.54.6 subtree-export
fix cannot silently regress while this code is being changed.

**The invariant every test asserts.** Three objects declare `shared_state`;
there must be exactly **one** DAT region for it. Assertions key on the
`Objects:` count and DAT symbol addresses — **never on `.map` instance/source
labels**, which are the subject of §7 and are untrustworthy until it lands.
P2KB independently reached the same conclusion (`map_caveat`), which is why §12
exists.

Keeping the cache assertions off the labels also keeps §1-§3 and §7-§8
independently verifiable, in either order.

**Verification.** The fixture is exercised by §6; on its own it must compile
clean cold, and each property must be independently mutable — editing
`tick_leaf.spin2` must not perturb the blob test, and vice versa.

---

## 6. Invalidation test suite

**Why.** The 49 existing cache tests validate **fidelity** — `objectCache.test.ts:1198`
compiles the *same unmodified source* three times (uncached / cold / warm) and
asserts all three match. No test in the file ever edits a source between compiles.
Depth was never the gap; two fixtures are genuine 3-level trees. **Mutation** was
the gap. Flag invalidation *is* covered (`:797`, the `--debug` toggle); source
invalidation has no coverage at all. Every v1.54.x defect was a fidelity defect,
so the harness grew around fidelity.

**Target behavior.** New `src/tests/CACHE-tests/objectCacheInvalidation.test.ts`,
built on §4's scaffolding, establishing mutation as a first-class test class:
compile → mutate exactly one input → recompile warm → assert the warm result
equals a cold compile of the mutated tree.

Mutation targets, one test each: depth-1 child · depth-2 grandchild · depth-3
leaf · diamond shared object · `DAT FILE` blob · a file touched but not modified
(must still hit) · a manifest path deleted (must miss, not crash).

**Verification.** Each test asserts three signals, with **byte equality as the
primary and required one**: the warm binary must equal an uncached compile of the
mutated tree. `Objects:` count and the DAT symbol addresses are asserted as
corroboration, not as the gate.

*Corrected 2026-08-21 during «#28», against measurement — the original text had
this backwards.* It claimed byte equality was the weak signal and the map
signals would catch a fork it missed. Measured on the §5 fixture: editing the
diamond node produces a warm binary **88 bytes larger** than truth, while the
warm `.map` is **byte-for-byte identical** to the uncached one — same layout,
same `Objects: 6`, same DAT addresses. The map describes the freshly-derived
structure while the binary carries stale embedded content, so the two disagree
and only the binary tells the truth. A test gated on the map signals alone would
have passed on a provably wrong binary.

Keep asserting the map signals anyway: the reporter's tree *did* move
`Objects: 3` → `4`, so they catch a shape this fixture does not. They are a
second net, never the first.

**Follow-on question this raises** (recorded, not resolved here): a `.map` that
describes a structure the `.bin` does not contain is its own defect, independent
of the cache. §9 records it; it is not in this sprint's scope.

---

## 7. Map index-space unification

**Why.** `buildObjInstanceInfo()` mixes **four distinct index spaces**. The
reported symptoms are three; the confusion is systemic, and the sites not
reported fail exactly the same way.

| | Space | Produced by |
|---|---|---|
| **A** | distiller **record** index | position in `_recordList` (`distillerList.ts:119`) |
| **B** | distiller **objectId** | sequential walk of the binary object tree (`objectDistiller.ts:100-103`) |
| **C** | **source-file** index | first-registration order of unique files (`context.ts:114-123`) |
| **D** | symbol-encoded instance index | `value & 0xffffff` (`compiler.ts:739`) |

**Why it stayed hidden.** In a tree where every object appears exactly once, **B**
and **C** both count 0,1,2… in the same order and coincide by accident. They
diverge precisely when an object is instantiated more than once — the diamond.
The `.map` therefore looked correct for years.

**Current code — every mixed site:**

| Site | Defect |
|---|---|
| `compiler.ts:724` | `allSymbols.get(parentIdx)` looks up a **C**-keyed map (`objectSymbolStore.ts:17`, keyed by `getFileIndex`) with an **A** index — can return a *different object's* symbols entirely |
| `compiler.ts:735-741` | compares **D** against `childPosition` — rotated instance labels |
| `compiler.ts:743` | `getFileAtIndex(childObjectId)` passes **B** into a **C** lookup — the `object_N` fallback names in the warm map |
| `compiler.ts:747` | stores `parentIndex`=**A** beside `objectIndex`=**B** |
| `mapGenerator.ts:394` | `getChildInstances(instance.objectIndex)` compares **A** to **B** — self-referencing child, missing level |
| `mapGenerator.ts:399` | `records.getRecordAt(child.objectIndex)` uses **B** as **A** |
| `mapGenerator.ts:677` | parameter named `recordIndex` (**A**) passed to `getFileAtIndex` (**C**) |

**Target behavior.** Make the space explicit at every boundary rather than
patching comparisons. `distillerList.ts:185` `findRecordIndexByObjectId()`
already exists as the **B→A** translator, so most sites become a one-line
conversion; the remaining work is **B→C**, which needs an explicit map built
where records are created.

**Verification.**
- *Normal:* `npm run test-map` — all 7 existing map fixtures byte-identical to
  their `expected.json`. This is the regression floor: the fix must not perturb
  single-instance trees, where today's accidental coincidence yields correct
  output.
- *Edge:* §5's fixture — `log`/`log2` both labelled correctly, `shared_state`
  named (not `object_N`), child lists non-self-referencing at every level.
- *Error:* an objectId with no corresponding record must produce a defined
  fallback, not an exception.

---

## 8. Rekey `ObjInstanceStore` on instance identity

**Why.** `_instances` is a `Map<number, ObjInstanceInfo>` keyed by
`instance.objectIndex` (`objInstanceInfo.ts:114,120`). An object instantiated
twice collides and the second silently overwrites the first — the missing sibling
in the reported map. An instance's identity is **(parent, position)**, not its
object.

**Target behavior.** Key on the composite identity. Audit every
`getInstance(objectIndex)` caller — `mapGenerator.ts:605` is the known one — since
each assumes one instance per object and each needs a decision about which
instance it means.

Split from §7 deliberately: §7 corrects *which number is used where*, §8 changes
*what a key is*. Landing them separately keeps `test-map` meaningful as a
bisection point between the two.

**Verification.**
- *Normal:* all 7 map fixtures unchanged.
- *Edge:* `log`/`log2` both present in the map with distinct entries.
- *Edge:* an object instantiated twice under *different* parents — both retained.
- *Error:* `getInstance` on an unknown identity returns `undefined` as today.

---

## 9. Correct row A8 and stamp the analysis

**Why.** `Object-Cache-Correctness-Analysis.md:52` states the false assumption
that let this defect survive four releases. The document was reclassified
`historical` → `governed` on 2026-08-21 precisely because it describes current
behavior and is amended every cache sprint — history is not rewritten, but a
living analysis that is wrong must be corrected.

**Target behavior.**
- Correct row A8 to state the real invariant and how §1 establishes it.
- Correct row A7 to `yes` (§2).
- Record §5.4-2 as **still open**, explicitly noting the manifest does not close
  it.
- Extend §5.4-3 with the path-anchoring consequence from §1.
- Note the B1 connection: the v1.54.6 subtree-export fix addressed the same
  short-circuit one axis over — effects flowing *out* of a skipped subtree — and
  was never generalized to inputs flowing *in*. §5.3's "capture once at the
  boundary, replay covers everything below" is right for the former, wrong for
  the latter.
- Set `verified` to the release being prepared **only if the whole document is
  re-read against the code**. A partial pass leaves `verified` where it was.

---

## 10. Three auto-added governed documents

**Why.** Oldest-first drawdown at `autoAddGovernedPerSprint: 3`. These three
surfaced because they are the oldest — which is a consequence of no sprint ever
having been thematically about them. Gating the queue on theme means the
off-theme tail never drains.

| Document | Staleness |
|---|---|
| `DOCs/language-specification/README.md` | source 330d newer |
| `DOCs/language-specification/ide-integration/README.md` | source 330d newer |
| `DOCs/internals/PASM2-ASSEMBLY-LABELS.md` | source 228d newer |

**Target behavior.** Read each end-to-end against current source, correct what is
wrong, stamp `verified` to the release being prepared. At 224 / 202 / 170 lines
these are all verifiable whole, so the partial-stamp escape does not apply: if
one cannot be finished, `verified` stays where it was and the document stays on
the list.

---

## 11. Shipped documentation

**Why.** Both shipped docs make a claim that is **false today** and becomes true
with §1 — this is the highest-visibility prose in the project.

**Current text.**
- `README.md:49` — *"A persistent object cache that skips recompiling child
  objects whose inputs have not changed"*
- `CommandLine.md:72` — same claim, plus *"pointing several source trees at one
  folder maximizes reuse"*

The first is the sprint's own claim, stated before it was true. The second
actively recommends the `--cache-dir` sharing pattern that §5.4-3 flags as
user-discretion, presenting it as an unqualified benefit.

**Target behavior.** Both re-verified against post-fix behavior. `CommandLine.md`
gains a brief caveat on cross-tree sharing and on the path-anchoring from §1.
Governed by `DOCs/voicing/Shipped-Docs-Voicing.md` (`CONFORMANCE_GUIDES`).

**`CHANGELOG.md`** — always in scope. Governed by `central:changelog-voicing`;
PNut-TS is class 2 (developer tool), Released mode. Per
`feedback_changelog_user_facing_only`: user-facing facilities only. The entry
leads with the singleton consequence, not the internal mechanism, and does not
editorialize about our own documentation accuracy.

---

## 12. External: P2KB `map_caveat` retraction

**Why.** Our map defect is documented **outside this repository** and P2
developers are being told to route around it:

> **map_caveat:** In the multi-instance `.map`, the instance-name / source-name
> columns can be internally inconsistent — do NOT trust those labels. The
> reliable signals are the `Objects:` count and the DAT symbol addresses.
> — P2KB `p2kbSpin2ObjectImageDedup`

The entry also self-flags *"pnut-ts v1.55.0 (measured 2026-06-30) —
compiler-coupled; re-verify on a compiler version bump."* We are shipping past
that measurement, so re-verification is owed regardless of §7/§8.

**Target behavior.** After §7/§8 land, re-run the entry's own measurement
procedure against the new build; retract or amend `map_caveat`; update the
`toolchain:` stamp. No document in `DOCs/doc-coverage.json` can see this, which
is exactly why it is a numbered deliverable rather than a note.

**Caveat on the source.** Per `feedback_p2kb_validation`, P2KB entries are
verified before reliance. This one is object-model (not execution-model, where
the confirmed defects live), is explicitly marked *measured* against our own
compiler with a reproducible method, and §5/§6 re-measure it directly — so this
sprint independently confirms it rather than taking it on faith.

---

## 13. Register the cache suites in the standard regression run

**Why.** The entry baseline found that `smm.jestconfig.js` — what
`npm test` invokes (`jest --runInBand -c smm.jestconfig.js`) — exercises 20 of the 27 compiled test
files. `CACHE-tests` is one of the seven it skips: 59 tracked, green, passing
tests that the project's standard regression command never runs. §6 adds a
second cache suite beside it.

This matters to this sprint specifically, not just as hygiene. The
compatibility gate above requires a **full-suite** run rather than slices,
precisely because a cache entry that stops being served can red an unrelated
fixture. That gate is only meaningful if the full suite actually contains the
cache tests. Today it does not, so the sprint's own protection would depend on
someone remembering `npm run test-cache` by hand.

**Current code.** The roots list is an explicit, hand-maintained array in
`jest-config/jest-coverage-config.json` (20 entries), merged into
`smm.jestconfig.js` over `old.jestconfig.json`. A hand-maintained list is exactly
the drift case `baseline-health` §3 warns about: a test file can be added without
ever being registered, and it then reads as green because it never ran.

**Target behavior.** Add `<rootDir>/dist/tests/CACHE-tests/` to that roots array.
`testMatch` is `**/*.test.js`, so registering the directory picks up both
`objectCache.test.js` and §6's new `objectCacheInvalidation.test.js`
automatically — no second edit when §6 lands.

**Scope boundary.** Only the cache suites. The other six unregistered files —
`LANG-FEAT-tests` (tracked, 11 passing), `COV-tests` (container-mode gated),
`FULL/`, `SHORT/`, and `WUMMI-tests` (gitignored, local-only) — are **out of
scope for this sprint** by Stephen's decision on 2026-08-21. They are recorded in
the entry baseline above so the gap stays visible rather than being rediscovered.

**Ordering.** Must land **after** §6, so the new suite exists when the directory
is registered. Registering first would put a root in the config pointing at a
suite that is not written yet.

**Verification.**
- *Normal:* `npm test` reports **21 suites**, and its test total rises by
  59 plus §6's new tests.
- *Normal:* the previously-passing 325 still pass — registration must not
  perturb them.
- *Edge:* the sprint's own §6 tests actually appear in the standard run's output,
  not merely in `npm run test-cache`.
- *Error:* a cache test failure reds `npm test`, which is the entire point of the
  change.

**Counts this changes:** the "325 regression tests" figure appears in
`MEMORY.md` and in release prose; it becomes 384 + §6's additions. Listed in the
Documentation Blast Radius below.

---

## Documentation Blast Radius

### `npm run docs-check` — run 2026-08-21, pasted verbatim

```
docs-check — 130 tracked .md, 130 in manifest

STALE — governed (39) — oldest 3 auto-added per sprint
  → DOCs/language-specification/README.md  covers [compiler-core] · never verified; source 330d newer
  → DOCs/language-specification/ide-integration/README.md  covers [compiler-core] · never verified; source 330d newer
  → DOCs/internals/PASM2-ASSEMBLY-LABELS.md  covers [compiler-core] · never verified; source 228d newer
    … 36 more; backlog draws down at 3/sprint
    DOCs/roadmaps/Object-Cache-Correctness-Analysis.md  covers [object-cache, compiler-core] · never verified; source 91d newer

classes: shipped=4  process=15  governed=58  generated=1  historical=52
current: 23 · stale: 39 · unclassified: 0
```

`unclassified: 0` — the five UNCLASSIFIED findings from the Preproc-Symbols
archive move were repaired 2026-08-21 before this plan was written, per the
overlay's fix-UNCLASSIFIED-first rule.

`Object-Cache-Correctness-Analysis.md` is stale and on-theme, so it enters via the
**surface** search (§9), not the aging drawdown — it does not displace any of the
three auto-adds.

### Surface search — documents describing what this sprint changes

`docs-check` cannot find omissions; this is the grep pass. Historical records are
excluded **as a class** per the overlay: `DOCs/roadmaps/completed/**`, past sprint
plans and closeouts, prior-sprint ledgers and studies, generated reports.

| Document | Disposition |
|---|---|
| `README.md` | **Update** → §11 — claims cache tracks "inputs", false today |
| `CommandLine.md` | **Update** → §11 — same claim + recommends `--cache-dir` sharing |
| `CHANGELOG.md` | **Update** → §11 — always in scope |
| `DOCs/roadmaps/Object-Cache-Correctness-Analysis.md` | **Update** → §9 — rows A7/A8, §5.4 |
| P2KB `p2kbSpin2ObjectImageDedup` | **Update** → §12 — external; `map_caveat` + toolchain stamp |
| `TEST/MAP-tests/README.md` | **Update** — describes map fixture expectations §7/§8 touch |
| `DOCs/RELEASE-PROCESS.md` | **Excluded** — matched on "cache"/"map" in the shipped-docs list only; that list is unchanged. Matched text reproduced and confirmed true. |
| `DOCs/roadmaps/Object-Cache-Future-Enhancements.md` | **Excluded** — forward-looking proposals, not a description of current behavior. **NOT verified** — re-surface at closeout. |
| `DOCs/roadmaps/Test-Suite-Punch-List.md` | **Excluded** — swept by `punch-list-maintenance` at closeout, not here |
| `DOCs/voicing/CHANGELOG-Voicing.md` | **Excluded** — voicing guide, matched on an example. Text confirmed true. |
| `DOCs/internals/Distiller-Theory-of-Operations.md` | **Update** — §7 changes how distiller record/object ids are consumed; the ToO describes those spaces |
| `DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md` | **Excluded** — matched on `.map` in an unrelated example. **NOT verified** — out of scope. |
| `DOCs/analysis/Default-Parameters-Feasibility.md` | **Excluded** — analysis document, prior sprint |
| `DOCs/internals/theory-of-operations/PLOT_Theory_of_Operations.md` | **Excluded** — debug-window plotting; matched "map" as a verb. Confirmed unrelated. |

**Counts to re-check at closeout:** the cache test count (59) and the regression
suite total (325) both appear in `MEMORY.md` and in release prose. §6 adds cache
tests and §13 folds the whole cache suite into the standard run, so the headline
figure becomes 384 + §6's additions — a change of both the number and what it
counts.

**Docstrings in scope by definition:** `objectCache.ts:1-62` header comment (the
on-disk layout list gains `.dep`, and the "transitively captures all `#include`
content" line at `:215` is the sentence that encoded the false assumption);
`DebugInfo`'s doc block (`objectCache.ts:125-155`); `ObjInstanceStore`'s
"Indexed by object index" comment (`objInstanceInfo.ts:110-112`), which §8 makes
false.

**No duplication found** between the documents above — each claim has one home.

---

## Compatibility impact

This sprint makes **no previously-valid input a hard failure**, so the overlay's
compatibility-break step does not apply in its strict form. Two user-visible
behavior changes are recorded here anyway:

1. **Every existing cache is invalidated** by the `CACHE_FORMAT_VERSION` 6→7 bump
   (§3). First compile after upgrade is cold. This is the intended migration —
   silently reusing v6 entries is the defect.
2. **Some previously-hitting compiles will now miss.** That is the fix: those
   hits were wrong. Users who measured cache speedup on a multi-level tree will
   see a lower hit rate, and that lower number is the honest one.

Neither is a break in the "working build stops building" sense; both belong in
the changelog above the fix list.

**Gate:** full suite (`npm run test-full`), not just `test-cache` and `test-map`.
A cache entry that stops being served can red an unrelated fixture — and if it
does, that fixture was passing on a stale binary, which is a finding rather than
a reason to soften the fix.

---

## Dependency and housekeeping

`npm audit` run 2026-08-21:

| | Result |
|---|---|
| `npm audit` | 1 moderate — `pkg` (Local Privilege Escalation, GHSA-22r3-9w55-cj54), **no fix available** |
| `npm audit --omit=dev` | **0 vulnerabilities** — no user of the compiler is exposed |

Dev-only with no fix → **not auto-added**, recorded as a tracked decision per the
overlay. Migration path (`@yao-pkg/pkg` or Node SEA) is its own scoped work; it is
already tracked in `project_dependency_security` and is not folded in here.

---

## Verification summary

| Deliverable | Gate |
|---|---|
| §1-§3 cache fix | §6 suite green; `npm run test-cache` (59) green |
| §4 scaffolding | existing cache suite green, assertions unchanged |
| §5 fixture | compiles clean cold; properties independently mutable |
| §6 invalidation suite | all seven mutation targets; three signals asserted per test |
| §7-§8 map | `npm run test-map` (7 fixtures) byte-identical; §5 fixture labelled correctly |
| §9-§11 docs | `npm run docs-check` shows the four addressed documents current |
| §13 suite registration | `npm test` reports 21 suites; total rises by 59 + §6's tests |
| §12 P2KB | measurement re-run against the new build; caveat retracted or amended |
| **All** | `npm run test-full` — full suite, not slices |

**Measurement discipline.** Where a gate says "stop," it means **stop and confirm
the measurement**, never stop and abandon. The `Objects:`-count and DAT-address
probes in §6 read the same map generator §7/§8 modify — they are not independent
witnesses of each other. A §6 failure observed while §7/§8 are in flight must be
confirmed against the binary directly (object count from the `.obj`, DAT
addresses from the `.lst`) before it is treated as a defect.

---

## Section ↔ task cross-reference

Generated by `plan-to-tasks` on 2026-08-21. Sprint tag: `cache-invalidation`.
`seq` is the implementation order and the only ordering signal — `todo_next`
walks it.

| Plan § | Deliverable | Task | seq |
| --- | --- | --- | --- |
| §5 | Singleton-diamond fixture family | «#27» | 1 |
| §4 | Shared cache test scaffolding | «#28» | 2 |
| §6 | Invalidation test suite *(ends red by design)* | «#29» | 3 |
| §1 + §3 | Dependency manifest + format bump 6→7 | «#30» | 4 |
| §2 | DAT FILE blobs (A7) *(closes green-unit)* | «#31» | 5 |
| §13 | Register cache suites in `npm test` | «#32» | 6 |
| §7 | Map index-space unification | «#33» | 7 |
| §8 | `ObjInstanceStore` rekey | «#34» | 8 |
| §9 | Row A8 correction + analysis stamp | «#35» | 9 |
| §10 | Three auto-added governed docs | «#36» | 10 |
| §11 | Shipped docs + changelog | «#37» | 11 |
| §12 | P2KB `map_caveat` retraction | «#38» | 12 |

**Ordering rationale.** The fixture and scaffolding are foundational, so they come
first. The invalidation suite is written **before** the fix so the tests are seen
to fail — a test that never failed has not been shown to test anything, and this
project's own lesson is to reproduce before fixing.

**Atomic green-unit: «#29» + «#30» + «#31».** «#29» lands red by design because
it encodes an unfixed defect; «#30» turns most of it green; «#31» closes it. That
red is not a regression and must not be resolved by weakening the assertions.
«#32» registers the cache suites into `npm test` and therefore cannot start until
«#31» is green, or it turns the standard regression run red.

**Independent tracks.** The map work («#33», «#34») has no dependency on the cache
work — the invalidation tests deliberately assert on `Objects:` count and DAT
addresses rather than `.map` labels, which keeps the two halves verifiable in
either order. «#38» depends on «#33»/«#34» landing. Documentation tasks («#35»–«#37»)
follow the code so their claims are true when written.
