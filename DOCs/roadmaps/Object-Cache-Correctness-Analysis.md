# Object Cache — Correctness Analysis

> **Status:** living analysis, refined as we learn more.
> **Last verified:** 1.55.4 — whole document re-read against the code, 2026-08-22.
> **Classification:** `governed` (was `historical` until 2026-08-21). It describes
> how the cache behaves today and is amended by every cache sprint, so it belongs
> in the staleness net rather than in the record of what we once believed.
> **Scope:** correctness of the persistent object cache (`--cache`), not performance, eviction, or sharing policy.
> **Ground truth:** "byte-identical to a fresh uncached compile, on every test in the suite, including the SD FAT32 driver suite that exposed v1.54.2 → v1.54.5."

This document is the audit we should have done before v1.53.3 shipped. Its purpose is to (a) catalog every input that affects a cached child object's compiled bytes, (b) catalog every observable side effect of a child compile, (c) evaluate whether the current `.bin + .sym + .dbg + .meta` shape is the right vessel for that catalog, and (d) draw a precise line between what can be made correct-by-construction and what can't, with the remediations for each.

---

## 1. Brief recap of how we got here

The plan in `completed/Persistent-Object-Cache-Plan.md` modeled a child compile as:

```
binary = pure_function(preprocessed_source, overrides, compiler_version)
```

Reality is:

```
binary, world_delta = stateful_function(declared_inputs, world_at_compile_time)
```

Each release fixed one piece of the gap between those two models:

- v1.54.2: `enableDebug` added to key (config flag missing)
- v1.54.3: `.dbg` sidecar replays DebugData records on hit (write-side state missing)
- v1.54.4: brkSite remap + checksum recompute (read-side state missing — baked indices reference replayed records)
- v1.54.5: `defSymbols` snapshot added to key (read-side state missing — propagated `#pragma exportdef` set)
- v1.54.6: replay subtree's `defSymbols` mutations on hit (write-side state missing — skipped subtree's `#pragma exportdef` pushes)
- v1.55.4: `.dep` manifest revalidated on every hit (read-side state missing — **the descendants' source content itself**, plus DAT FILE blobs); instance subtree and descendant symbols replayed so `--map` survives a hit
- v1.55.4: resolution context added to key — the top-level file's directory and the `-I` list (read-side state missing — **which file a logical name reaches**, so one library object shared by two apps embedded the wrong `FILE` blob)

Most of these are one abstract bug: **a piece of process-global mutable state participates in the compile and the cache contract didn't account for it.**

The resolution-context fix is the exception, and worth separating. Nothing
mutable was involved: the missing input was **the question the compiler asks the
filesystem**. `OBJ k : "kid"` and `FILE "blob.dat"` are logical names, and the
same name reaches different files from different roots. That is not state
leaking across a boundary — it is an input that was never modelled as one. It is
also the only entry here closed *by construction* rather than by remembering to
replay something: two compiles whose resolution context differs can no longer
collide.

---

## 2. Narrowed state catalog — what actually affects child binary bytes

The earlier audit lumped together state that affects compile output with state that affects only `--map` output and state that doesn't cross the child-compile boundary at all. Here is the narrowed list, restricted to **what affects a cached child's compiled bytes** (correctness, not map fidelity).

### 2.1 Inputs the child binary depends on

| # | Input | In key today? | Notes |
|---|---|---|---|
| A1 | `srcFile.allPreprocessedLines` (post-`#ifdef`, post-`#include` expansion) | yes | Captures local `#define`/`#undef`/`#ifdef`/`#ifndef`/`#else`/`#elseifdef`/`#elseifndef`/`#endif`/`#error`/`#warn`/`#include` effects via the expanded text |
| A2 | OBJ parameter overrides (`OBJ x : "f" \| CONST = N`) | yes | Sorted name:type:value triples |
| A3 | Compiler version | yes | String compare |
| A4 | `enableDebug` flag | yes | Boolean, changes bytecode emission |
| A5 | `CACHE_FORMAT_VERSION` | yes | Force-invalidates on layout change |
| A6 | `context.preProcessorOptions.defSymbols` snapshot at child preprocess end | yes (v1.54.5) | Captures CLI `-D` + propagated `#pragma exportdef` from any ancestor's preprocess |
| A7 | DAT FILE bytes (`DAT data byte FILE "blob.bin"`) | **yes** (v1.55.4) | Loaded from disk at compile time, written into binary. Not in the *key*; hashed into the `.dep` manifest and revalidated on every hit (§7). Before v1.55.4 this was `no`, and editing a blob alone served a binary carrying the old bytes with no diagnostic. |
| A8 | Each grandchild's compiled binary | **yes** (v1.55.4), via manifest | See the correction below — this row was wrong from the first draft until v1.55.4. |
| A10 | Resolution context — the top-level file's directory and the `-I` search list | **yes** (v1.55.4) | Decides which file a *logical* name reaches (`OBJ k : "kid"`, `FILE "blob.dat"`), so a child's bytes depend on it even when its own source and overrides are identical. Hashed relative to the cache directory's parent, never as an absolute path. Before v1.55.4 this was `no`: two apps in one project sharing a library object collided in the default cache and the second was served the first's binary. See §5.4. |
| A9 | Shared `DebugData` table state at the moment each `debug()` is compiled | not in key | Affects which `brkCode` index gets baked. Handled on the *output* side via `.dbg` replay + brkSite remap, not the *input* side. |

#### Correction to row A8 — the assumption that cost four releases

Row A8 read, from the first draft until v1.55.4:

> *Each grandchild's compiled binary | recursive | Captured indirectly: each
> grandchild has its own cache key; correct iff grandchild's own key inputs are
> complete.*

**That is false, and it is the sentence that hid the defect.** The indirection
holds only while the grandchild is *visited*, and a grandchild is visited only
when its parent **misses** — which is precisely what caching exists to prevent.
On a hit the cached binary is spliced in and the whole subtree is skipped, so
the grandchild's key is never computed and its change is never noticed.

The invariant the row assumed:

> a parent's key changes when any descendant's bytes change

The invariant that actually existed:

> each object's key covers its own source

**What makes this worth writing down at length:** the row is not a typo. It is a
plausible piece of reasoning that is locally true — each grandchild really does
have its own key, and that key really is complete — and globally wrong, because
it quietly assumes the grandchild gets evaluated. A catalog is exactly where
that kind of error becomes invisible: it reads as a checked entry.

**How it is closed (v1.55.4).** Each entry carries a `.dep` manifest listing
every file its subtree was built from with a SHA-256 of the contents. A hit
re-hashes that list before the entry may be used and misses on any change. The
manifest composes recursively — a parent's list spans its whole subtree — so
revalidating a parent revalidates everything beneath it without visiting any of
it. The manifest is validated *beside* the key, not hashed *into* it.

**Note the shape of the mistake, because it recurred twice more.** Row B1 below
records the v1.54.6 gap — subtree pushes from descendants are not replayed when
the subtree is skipped. That is the same short-circuit, one axis over: a skipped
subtree cannot report what it contains. It was fixed for `defSymbols` **effects
flowing out** and never generalized to **inputs flowing in**. §5.3's conclusion —
*capture once at the boundary, replay covers everything below* — is right for
effects leaving a subtree and wrong for inputs entering it, and reading it as a
general principle is part of how A8 survived review. In v1.55.4 the same
short-circuit surfaced twice again, in the `--map` path (row B4).

### 2.2 Side effects of a child compile that other compiles read

| # | Side effect | Captured in cache entry today? |
|---|---|---|
| B1 | Pushes onto `context.preProcessorOptions.defSymbols` (from the child's own `#pragma exportdef`) | partial — child's own pushes happen via the SpinDocument constructor's preprocess on every cache hit, so they're naturally replayed; **subtree pushes from descendants are NOT replayed when the subtree is skipped on hit** (this is the v1.54.6 gap) |
| B2 | Records added to `spin2Parser.debugRawData` (DebugData table) | yes (v1.54.3) — `.dbg` records list |
| B3 | Symbols stored in `context.objectSymbolStore` | yes (v1.54.2) — `.sym` sidecar, when `--map` is requested |
| B4 | Object hierarchy + per-object symbols consumed by `--map` | **yes** (v1.55.4) — instance subtree and descendant symbols ride in `.sym` and replay on a hit. Previously `no`, described here as "latent, not correctness-critical"; that was wrong. A hit returned before the child loop, so a hit child's own children were never recorded and its grandchildren's symbols never restored — the warm `.map` silently lost a level and a set of method listings. Wrong output is not latent. |

### 2.3 Things explicitly *not* on this list and why

| Considered | Why not on the list |
|---|---|
| `clkMode`, `debugBaud`, `debugPin*` (set in `determine_clock` / `determine_bauds_pins`) | Written into the *top-level* binary only. Children don't include these. Top-level isn't cached. |
| `context.preProcessorOptions.undefSymbols` | CLI-only (`-U`), set at startup, never mutated during compile. Affects `defSymbols` only by gating which `exportdef` actually pushes — its effect is fully captured in the resulting `defSymbols`. |
| `context.preProcessorOptions.includeFolders` | CLI-only (`-I`), set at startup, never mutated during compile. Affects `#include` resolution; resolved content lands in `preprocessedLines` (A1). |
| `context.sourceFiles` registry | Mutated by every SpinDocument construction; reads are consistent because SpinDocument is *always* constructed before cache lookup (regardless of hit/miss). |
| Per-compile state: `mainSymbols`, `localSymbols`, `pubConList`, `objImage`, `spinFiles` | Reset at the start of every `compile1`. Doesn't cross compile boundaries. |
| `objImage.brkSites` (added v1.54.4) | Per-compile state; cleared on `objImage.reset()`. Captured into the cache entry at store time, replayed on hit. |
| `--regression`, `--coverage`, pass options (`afterPreprocess`, `afterElementize`, `afterConBlock`) | Today they don't change generated bytecode. Adding any flag that does → must be added to A1–A6. The risk is "adding a flag without adding it to the key"; not a current bug. |

### 2.4 Preprocessor directives that *don't* affect cross-file state

For completeness — the directives that matter only locally and are already captured by A1:

`#define`, `#undef`, `#ifdef`, `#ifndef`, `#elseifdef`, `#elseifndef`, `#else`, `#endif`, `#error`, `#warn`, `#include`. None of these mutate any `context.preProcessorOptions` field. Only `#pragma exportdef` does.

---

## 3. Is the current `.bin + .sym + .dbg + .meta` shape right?

Today's on-disk shape per cache entry, keyed by SHA-256 hex:

```
<key>.bin    load-bearing — compiled binary
<key>.dep    load-bearing ALWAYS (v1.55.4) — {path, sha256} for every file the
             subtree was built from; read BEFORE .bin, and the gate on whether
             the entry may be used at all
<key>.sym    load-bearing when --map — user symbols, PLUS (v1.55.4) the instance
             subtree and descendant symbols replayed on a hit
<key>.dbg    load-bearing on every hit since v1.54.6 — DebugData records,
             brkSites, and subtree exportdef contributions
<key>.meta   diagnostic JSON, never read by the hit path
```

### 3.1 What the shape gets right

- **Atomic write order**: sidecars first, `.bin` last. The `.bin`'s presence is the cache-hit gate, so a partial write from a `Ctrl-C` mid-suite leaves orphans that don't trigger a hit. Good.
- **Optional reads**: `.sym` is only read when `--map` is on; `.dbg` only when `--debug` is on. The common path doesn't pay sidecar I/O.
- **Per-sidecar format version**: each sidecar carries `cacheFormatVersion` and is rejected on mismatch. Good.
- **Inspectable**: a developer can `cat <key>.meta` to see what's in an entry. The `.sym` and `.dbg` are JSON. The `.bin` is the raw binary.

### 3.2 What the shape gets wrong or makes risky

- **Implicit contract per sidecar**: there's no manifest that says "this entry consists of these N sidecars." If we add a `.exp` (v1.54.6 exportdef-replay) sidecar, the hit path has to remember to read it; nothing forces that. A v1.54.6 binary written to disk during one run can be read by an earlier-build hit path that doesn't know about `.exp`, and the hit path silently completes without replay. We mitigate this by bumping `CACHE_FORMAT_VERSION` (which is in the key, so old entries become unreachable), but the discipline is "remember to bump." Same vulnerability that produced the bugs we already shipped.
- **Sidecar coupling is invisible**: a hit path that reads `.bin` and `.sym` but forgets `.dbg` doesn't error — it produces a wrong binary. Nothing structurally prevents this.
- **No internal cross-checks**: the `.bin` doesn't reference its sidecars. The `.sym` doesn't reference the `.bin`. If filesystem corruption swaps two entries' `.bin`s, no integrity check fires.
- **`.meta` is decorative**: it carries useful diagnostic info but the hit path never reads it, so it can't be used to validate the entry.
- **No format-version negotiation**: a single number that invalidates everything. Fine for now; ugly if we ever want a per-feature version (e.g. `.dbg-v3` interoperable with `.bin-v5`).

### 3.3 Two alternative shapes worth considering

**Shape A — Single-file bundle.** One file per key, e.g. `<key>.cache`, containing a length-prefixed sequence of sections (`MANIFEST`, `BIN`, `SYM`, `DBG`, `EXP`, `META`) with internal CRCs and a top-of-file format version. Atomic write of the whole thing. Hit path reads the manifest, validates section CRCs, dispatches. Adding a new section requires bumping the manifest schema, which is a single visible change.

- Pros: atomic, internally consistent, harder to "forget a sidecar," version negotiation is local.
- Cons: harder to inspect with `cat`, larger reads on the common path (can mitigate by lazy-reading sections), adds a small amount of binary parsing code.

**Shape B — Manifest-and-sidecars (current shape, with explicit manifest).** Keep the multi-file layout but add `<key>.json` as a manifest listing every sidecar this entry uses, their format versions, and their content hashes. The hit path reads the manifest first; missing or hash-mismatched sidecars fail the hit explicitly.

- Pros: keeps the inspectability of the current layout; adds the missing structural integrity check; smaller change than Shape A.
- Cons: doubles the small-file count; doesn't fix the "remember to bump format version when adding a sidecar" discipline gap (though the manifest schema *is* a place to centralize that).

> **v1.55.4 note — `.dep` is NOT Shape B.** The new manifest lists the **inputs
> the subtree was compiled from**; Shape B proposes a manifest of **the sidecars
> this entry consists of**, with their format versions and content hashes. They
> solve different problems: `.dep` catches a changed source, Shape B catches a
> missing or corrupt sidecar and the "remember to read the new sidecar" discipline
> gap. Adding `.dep` did not discharge M3, and v1.55.4 is a live demonstration of
> why M3 still matters — it added one sidecar *and* extended the meaning of
> another (`.sym` now also carries the instance subtree), which is exactly the
> invisible-coupling case §3.2 warns about. `CACHE_FORMAT_VERSION` was bumped to 7,
> by remembering to.

**Recommendation**: Shape B is the smaller correctness lift and the natural evolution of where we are. Shape A is the right answer if we ever ship a public `--cache` flag for end users (correctness over inspectability). For an internal compiler-engineering cache, Shape B is fine.

This question doesn't have to be settled before v1.54.6. Tracking it here so we revisit when the next sidecar (or the verification harness) lands.

---

## 4. Why "correct by construction" is hard — and the precise boundary

I claimed earlier that the cache cannot be made correct by construction. That was imprecise. Let me draw the boundary exactly.

### 4.1 What "correct by construction" requires

A system is correct-by-construction with respect to a class of bugs if **incorrect code in that class fails to compile or fails a test that runs unconditionally**. Vigilance, code review, and "remember to update the cache when you add state" do *not* count as correct-by-construction; they're vigilance-by-construction.

For the cache, the class of bugs is:

> **C1.** A new piece of process-global state participates in compilation but isn't accounted for by the cache (input not in the key, side effect not replayed, or both).

> **C2.** An existing piece of state changes meaning (e.g., `subObjectIds` adds a new flag bit) without bumping `CACHE_FORMAT_VERSION`.

> **C3.** A new emission path bakes data into the binary that depends on a shared mutable structure, but the v1.54.4-style remap+patch logic isn't extended to cover it.

### 4.2 The structural reasons we can't fully prevent C1/C2/C3 today

**R1. Compilation has implicit shared mutable state.** `context.preProcessorOptions.defSymbols`, `spin2Parser.debugRawData`, `context.objectSymbolStore`, `objectDistiller.records` are *globals* in the compile world. Any function in the resolver, parser, or preprocessor can read or write them without any type-system or test-system tracking. Adding a new global doesn't require the cache to know about it.

**R2. Implicit dependencies aren't tracked.** A compile reads from `defSymbols` at preprocess time. Nothing in the type system says "this read must contribute to a cache key"; nothing says "you read this, so the cache must invalidate when it changes." This is a *static-analysis* limitation: TypeScript can't see across the read of a mutable global.

**R3. Implicit side effects aren't tracked.** A compile pushes to `defSymbols`. Nothing in the type system says "this push must be captured into the cache entry." Same limitation, from the other direction.

**R4. The cache contract is informal.** There's no `interface CacheContract<T>` that says "if you mutate or read `T`, you must implement these methods to define your cache participation." The contract lives in `objectCache.ts`'s comments and in our heads.

**R5. There's no end-to-end automated verification.** The plan's step #9 ("byte-equivalence regression: full suite without `--cache`, then with, byte-compare") was never built. The only thing detecting cache drift is the user's SD test suite, run manually, after we've shipped.

### 4.3 The precise boundary

| Bug class | Can we prevent it by construction *today*? | What it would take |
|---|---|---|
| C1 (new shared state added without cache contract) | **No.** No type-system hook; TypeScript doesn't track mutation of `Context` fields. | Either (a) refactor to eliminate shared mutable state (Option III, multi-quarter) or (b) add a runtime registry + test that asserts every mutable container in `Context` is registered with a cache contract or explicitly opted out (Option II, weeks). Option (b) catches the bug at PR-time test runs, not at compile-time, so it's "correct by test" not "correct by type" — but it *is* by-construction in the sense that incorrect code can't merge. |
| C2 (semantic change to a state without format bump) | **No** by type system. **Yes** by test if every consumer's serialization shape is covered by a round-trip test that includes a hash assertion. | Round-trip golden tests. Hash the serialized form of each sidecar's representative inputs; a semantic change shifts the hash and forces a bump. |
| C3 (new emission path bakes shared-table data) | **No** by type system. **Partially** by test — the `--cache-verify` harness catches every C3 (because the byte-compare differs). | Verification harness is the catch-all here. |
| C4 (cache returns wrong content for any reason — collisions, format drift, instruction changes) | **No** by static analysis. **Yes** by `--cache-verify`: byte-compare every hit against a fresh compile in a CI lane. | Verification harness on every PR. |

**The boundary is at R1.** *Any* mitigation that doesn't eliminate shared mutable state is "vigilance enforced by tests" rather than "correctness enforced by types." That's still very different from "vigilance enforced by humans," which is what we have now.

### 4.4 The mitigations, mapped precisely

| Mitigation | Catches | Prevents at type level? | Prevents at test level? | Cost |
|---|---|---|---|---|
| **M1 — `--cache-verify` mode + CI lane.** Every cache hit also runs a fresh compile and byte-compares; mismatch errors. CI runs the full suite under `--cache-verify`. | C1, C2, C3, C4 — anything that produces a different binary | No | **Yes**, *if* CI suite has coverage for the broken pattern | Small. ~150 LOC + one CI lane. |
| **M2 — Typed `CacheContract<T>` registry.** Every mutable `Context` field implements the interface or is explicitly marked cache-irrelevant. Test asserts the registry covers every such field. | C1, partial C2 | No (TypeScript can't enforce "this field has a contract"), **but** the registry test fails on PR if a new field is added without a contract | Yes | Medium. ~400 LOC refactor of the four existing contracts + ~50 LOC registry test. |
| **M3 — Shape B manifest-per-entry.** Manifest lists sidecars + content hashes; hit path validates. | Partial C2, C4 (filesystem corruption, partial writes after recovery) | No | Yes (corrupt entry fails the hit) | Small. ~100 LOC + format version bump. |
| **M4 — Round-trip golden tests for every sidecar.** Hash the serialized form for representative inputs; semantic changes shift the hash. | C2 | No | Yes | Small. ~50 LOC per sidecar. |
| **M5 — Eliminate shared mutable state.** Refactor `defSymbols`, `DebugData`, etc. into per-compile parameters returning explicit deltas. Compile becomes pure. | C1, C2, C3 (eliminates the entire class) | **Yes** | Yes | Large. Multi-quarter resolver/parser refactor. |

### 4.5 Recommended mitigation stack

> **Status, v1.55.4: M1 is built — in a corrected form, and its original
> justification did not survive checking.**
>
> The claim this row carried — that M1 "would have caught all five bugs at
> PR-time" — was tested and could not be confirmed, on two counts. First,
> coverage: the pre-sprint fixtures reached depth 2 at most, so no harness could
> have exercised the depth-3 tree; someone still had to build that fixture.
> Second, and more fundamental: passive hit-verification compares a hit against
> a fresh compile *of the same source state*, while the staleness class only
> diverges when an un-keyed input changes *between* store and hit. A CI run that
> compiles cold then warm with nothing edited gets a hit that agrees, and passes
> clean while the bug sits there.
>
> What shipped instead, in three parts:
>
> - **`--cache-verify`** (`src/utils/cacheVerify.ts`) — a user-facing flag that
>   compiles once cached and once not, and fails on any difference. The
>   reference compile runs in a **child process**: compilation reads and writes
>   process-global state, so an in-process reference would inherit and perturb
>   the very state the cache is suspected of corrupting.
> - **The mutation sweep** (`src/tests/CACHE-SWEEP-tests/`, `npm run
>   test-cache-sweep`) — mutates every input of every fixture tree one at a
>   time and requires byte equality of `.bin` and `.map` against an uncached
>   build. This is the part that makes the staleness class visible, because
>   mutation is what creates the divergence.
> - **`.map` comparison** folded into the existing byte-equivalence harness, so
>   all ten fixtures now compare both artifacts rather than the binary alone.
>
> A measured note on value: run against 1.55.4, the sweep found **nothing** —
> 38 mutation checks across eight configurations, all clean, with the harness
> proven able to fail (disabling the resolution-root fix produced 5/5 detections).
> That is the honest scope of this instrument. It is insurance against the next
> change to cache code, not evidence about this one, and it is structurally
> incapable of finding an input category nobody imagined — which is precisely
> the class that has bitten this project five times.

**Tier 1 (this release window):** M1 — **done in v1.55.4**, in the corrected form described above. Treat its value as regression insurance for the next cache change rather than as validation of the current one; see the measured note.

**Tier 2 (next release window):** M2 + M4. After the next bug we don't catch via the SD suite, the question won't be "what did we miss?" — the registry will tell us. Plus golden tests catch semantic drift in serializers.

**Tier 3 (when the next sidecar lands):** M3. Cheap to do at the same time as adding `.exp`; bigger lift if retrofit later.

**Tier 4 (open question):** M5. The right long-term answer if PNut-TS keeps growing. Not justified for short-term correctness.

The combination M1 + M2 + M4 turns the cache from "correct if we remember everything" into "incorrect code can't merge." It's not "correct by types" (R1 prevents that without M5), but it *is* correct-by-CI, which is the strongest practical guarantee for a system with mutable globals.

---

## 5. Open questions — researched

The questions raised after the first pass have been investigated. Findings below.

### 5.1 Order independence and idempotence of `defSymbols` replay — **resolved, safe**

**Verified by code reading (`spinDocument.ts:241-260`):** `defineSymbol` is unconditionally idempotent. When a SpinDocument constructs and iterates `context.preProcessorOptions.defSymbols`, calling `defineSymbol` for each, any symbol that's already in the local `preProcSymbols` table is silently skipped (line 257-259: `else { logMessage("symbol already exists, add skipped"); }`).

**Order independence:** since `defineSymbol` is an idempotent set-add, the resulting `preProcSymbols` set depends only on the *set* of names in `defSymbols`, not their order. The cache key already sorts+dedupes (`computeKey` in `objectCache.ts:189-217`).

**Replay can safely:**
- Push symbols in any order onto `context.preProcessorOptions.defSymbols`
- Push duplicates that may already be present (e.g. CLI `-D` or sibling pushes)
- Defer dedup to the consumers

**Implication:** the v1.54.6 replay implementation can be a simple `for (const sym of subtreeExports) defSymbols.push(sym)`. No sort, no dedup, no order coordination needed. The preprocessor handles it.

### 5.2 The "false miss" concern — **not a correctness issue, minor perf issue**

After tracing the constructor → preprocess sequence in `compileRecursively`:

1. Parent SpinDocument constructed → its full preprocess runs to completion → all the parent's `#pragma exportdef`s have pushed before *any* child SpinDocument is created.
2. `compileRecursively(0, parent)` starts → `compile1` parses OBJ blocks → for each child fileSpec, `new SpinDocument(...)` constructs and runs the child's preprocess (line `compiler.ts:317`).
3. Recursive `compileRecursively(1, child)` runs → cache key computed.

By step 3, `defSymbols` always contains the *complete* parent preprocess result + this child's own preprocess pushes. Source-position of the OBJ block within the parent doesn't matter; OBJ blocks aren't preprocessor directives, so the parent's preprocess is linear and unaffected by where OBJ blocks appear.

**The only corner where the key is over-specified:** a single parent referencing the same child file *twice* with `#pragma exportdef`s between the two references. The child's SpinDocument is deduped via `sourceFiles.getFile(fileSpec)` so its preprocess runs only once (with the first-reference defSymbols state). But by the time `compileRecursively` hits the second reference, the parent's full defSymbols (including post-second-reference pushes) is in scope. The cache key uses that fuller set.

**Consequence:** the same child can produce two cache entries with identical content if a parent's exportdef sequence varies after the OBJ reference. This is a *false miss* — wastes a compile and a cache slot, never returns wrong content. **Safe to ignore for correctness; address as a perf optimization later if profiling shows it matters.**

### 5.3 Recursive cache hits and transitive state mutations — **design works, needs verification fixture**

Traced the recursive replay logic on paper:

- At cache STORE for child X: snapshot `defSymbols.length` at cache-key-time (call it `L_X`). After X's full compile (or X's cache-hit replay if X is itself a transitive hit), final length is `L_X_end`. **Stored subtree contribution = `defSymbols.slice(L_X, L_X_end)`.**
- This slice contains:
  - X's children's own `#pragma exportdef` pushes (their preprocesses ran during X's compile1)
  - For any X-grandchild that cache-hit during X's cold compile: that grandchild's *replayed* subtree, which itself transitively includes great-grandchildren's contributions. Because replay pushes onto the same shared `defSymbols`, those pushes are in the slice.
- At cache HIT for X: replay pushes the stored slice. The slice already encodes the full transitive contribution; one push-loop covers all depths.

**Conclusion:** the design is correctness-recursive — capture once at the boundary, replay covers everything below. Confidence is high but not yet empirical. **Need a 3-level fixture (parent → mid → bottom, where bottom has `#pragma exportdef` and a sibling at top depends on it) to confirm.**

> **v1.55.4 — fixture built, conclusion narrowed.** `TEST/CACHE-fixtures/sgl_*`
> is that fixture and more: depth 3, a DAT singleton reached both directly and
> through two different parents, one object declared twice, a DAT FILE blob, and
> an `#pragma exportdef` whose symbol reaches a depth-2 object and changes its
> bytes (verified by control: the tag is present with the export and absent
> under `-U`).
>
> The conclusion above holds **for effects flowing out of a subtree** and does
> not generalize. Read as a principle it says a boundary capture covers
> everything below it — which is false for **inputs flowing in**, and that
> reading is part of how row A8 survived. Effects out: capture at the boundary.
> Inputs in: revalidate the whole subtree, which is what `.dep` does.

### 5.4 Resolution context for OBJ children and FILE blobs — **CLOSED in v1.55.4 by keying on it**

`OBJ k : "kid"` and `DAT ... FILE "blob.dat"` are *logical* names. Which file
each reaches is decided by the **top-level file's directory** and the `-I`
search list — measured, not assumed: a `FILE` name resolves against the
top-level file's directory, beating both the process CWD and the directory of
the file that contains the directive.

So a child object's compiled bytes are a function of **(its source, its
overrides, the resolution context)**. Through v1.55.3 the cache key carried
only the first two.

**The trigger is narrower to describe and far broader to hit than earlier
drafts of this section claimed.** This section previously framed it as "same
`kid` content at *different paths*," reachable only via deliberate
cross-project `--cache-dir` sharing. Both halves were wrong. The real shape is
one shared library object at **one** path, reached by two top-level apps:

```
proj/
  lib/kid.spin2        DAT blob FILE "blob.dat"
  appA/top.spin2  +  appA/blob.dat
  appB/top.spin2  +  appB/blob.dat
```

Built from the project root, both apps share the **default** `.pnut-cache`.
`lib/kid.spin2` keys identically for both, so the second app was served the
first app's binary — silently, with no flag beyond `-C`. Uncached, each app
correctly embeds its own blob; only the cache cross-contaminated.

**How it is closed (v1.55.4).** `computeKey` now hashes the resolution context:
the top-level file's directory plus the `-I` list, in the order given, since
`-I` order decides which of two same-named files wins. Both are expressed
**relative to the cache directory's parent**, not as absolute paths — the cache
directory is the sharing scope, so that parent is the natural root to measure
against, and with the default `.pnut-cache` it *is* the project root. Keying on
absolute paths would bake the checkout location into every entry, so the same
tree built at two locations or on two machines would share nothing.
`CACHE_FORMAT_VERSION` 7 → 8.

This is correct by construction rather than by vigilance: two compiles whose
resolution context differs cannot collide, and two whose context matches
resolve every logical name identically, so sharing between them is sound.

Regression coverage: `src/tests/CACHE-tests/objectCacheResolutionRoot.test.ts`,
four cases — two apps under the default cache dir, the same pair in reverse
build order, two roots sharing one explicit `--cache-dir`, and a single-app
warm rebuild as the control. Verified red without the fix (the first three fail;
the control correctly does not move).

**Residual, honestly stated.** The `FILE` half is reproduced and test-covered.
The nested-`OBJ`-under-different-`-I` half is covered by the same mechanism —
the `-I` list is in the key — but no reproducer was built for it, so it is
covered by construction rather than demonstrated.

**Superseded recommendation.** This section previously recommended documenting
cross-directory sharing as "at user discretion" and not fixing in code. That
rested on the belief that the trigger required a deliberate non-default setup.
It did not, and a documented hazard was the wrong disposition for a silent
wrong binary reachable with `-C` alone.

### 5.5 `--regression` / `--coverage` flag effects on bytecode — **currently no impact, future risk**

Verified by code reading: `--regression` (`reportOptions.regressionTesting`) and `--coverage` (`reportOptions.coverageTesting`) gate diagnostic output and logging only. Neither path modifies `objImage` or `objectData` bytes today. So they don't need to be in the cache key as of v1.54.6.

**Future risk:** if `--coverage` is ever wired to actually emit instrumentation into the binary (an instruction-counting opcode, a trace marker, etc.), it must be added to the cache key. **The verification harness (M1) would catch this immediately on the PR that introduces it; the typed-contract registry (M2) would force the contributor to think about it.**

Tracking this here as a written reminder so any future PR touching `reportOptions` triggers a re-read of this section.

### 5.6 Are there inputs we still haven't catalogued? — **completed in §2, no additions found**

Re-walked the whole compile path looking for state reads not in §2.1's list:

| Read site | Source of read | In §2.1? |
|---|---|---|
| `srcFile.allPreprocessedLines` | A1 | yes |
| `overrideSymbolTable` (parameters from parent's OBJ block) | A2 | yes |
| `context.compilerVersion` | A3 | yes |
| `context.compileOptions.enableDebug` | A4 | yes |
| `context.preProcessorOptions.defSymbols` (at SpinDocument construction) | A6 | yes |
| `loadFileAsUint8Array` (DAT FILE) | A7 | yes (theoretical) |
| Each child file's `getOffsetAndLengthForFile` (via childImages) | A8 | yes (recursive) |
| `debugRawData.injectRecord` (debug records) | A9 | yes (replay) |
| `context.runEnvironment.developerModeEnabled` | new | **needs check** |
| `context.libraryFolder`, `extensionFolder` | new | **needs check** |

**`developerModeEnabled` audit:** grepped the resolver/parser. It gates only logging output and certain diagnostic checks. Doesn't alter `objImage` bytes. Safe.

**`libraryFolder` / `extensionFolder` audit:** these resolve where the embedded Spin2 interpreter loads from. Used only at top-level binary assembly (`spin2Parser.ts:637-640` for interpreter prepend). Children don't touch them. Safe — top-level isn't cached.

**No additions to §2.1 needed.** Catalog stands.

---

## 6. Where to next

> **v1.55.4 status.** The mitigation stack below is largely spent. **M1 is
> built** — see §4.5 — in two forms: the byte-equivalence harness that compares
> every fixture's cached output against an uncached compile (`.bin` *and* `.map`),
> and the user-facing `--cache-verify` flag that does the same for a real project.
> A mutation sweep (`npm run test-cache-sweep`) additionally mutates every input
> of every fixture tree one at a time. **M3, the manifest, is built** in the
> dependency-manifest form (`<key>.dep`), though not in the sidecar-integrity form
> originally proposed — see punch-list item 5b/5d for the exact scope split.
> **M2 (typed contracts) and M4 (golden serializer tests) remain unstarted.**
>
> The lesson this document records still stands and should not be softened: every
> defect catalogued here — including v1.55.4's — reached a release, and each was
> found by a user's project rather than by our own tests. What changed in 1.55.4
> is that the lane which would have caught them now exists. It has not yet caught
> anything, because it was built after the fact: run against 1.55.4 the sweep
> found zero defects across 38 checks and 8 configurations. That is insurance for
> the *next* cache change, not validation of this one, and it was proved able to
> fail before it was trusted (disabling the resolution-root fix produces 5/5
> detections).

Remaining work, in recommended order:

1. **M2 — typed `CacheContract<T>` registry.** Punch-list item 5c.
2. **M4 — golden serializer tests** for each sidecar's on-disk form.
3. **M3 (remainder) — sidecar-integrity manifest.** The `.dep` manifest declares
   the entry's *source inputs*; it does not yet declare the entry's own sidecar
   set, so a sidecar swapped between entries is still undetected. Punch-list 5d.

**The residual gap, stated narrowly.** §5.4 is closed for the case it was written
about: the resolution root and the `-I` list are now in the key, so *changing*
either produces a different entry. What remains open is narrower, and it is worth
naming precisely rather than restating the closed case. The manifest records the
absolute path each input **resolved to at store time** and re-validates by
re-reading that path. So if the search list is unchanged but a file later appears
at a *higher-precedence location within it*, the same logical name now resolves
to a different file — while the recorded path still exists, still hashes the
same, and still validates clean. The key is unchanged because the search list is
unchanged. Resolution is not re-run at hit time.

Closing it means re-running name resolution during validation and comparing the
result against the recorded path, not merely re-hashing that path.

This document gets updated as we research more — particularly section 5.
