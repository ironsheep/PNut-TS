# Punch List Archive — 2026-08-24

Items confirmed done and swept out of `DOCs/roadmaps/Test-Suite-Punch-List.md`
at the Object-Cache-Transitive-Invalidation sprint closeout. All six closed in
**v1.55.4**.

**This file is never re-edited.** If one of these must be reopened it returns to
the active punch list as a *new* item referencing this archive.

---

### 5b. `--cache-verify` CLI flag (M1)

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

Status: **CLOSED in 1.55.4** — shipped as `--cache-verify` (`src/pnut-ts.ts`,
`src/utils/cacheVerify.ts`). The shipped form is stronger than the one described
above: rather than re-compiling on every hit, it compiles the whole project twice
and compares `.bin` and `.map`. The uncached reference runs **first** and in a
**child process** — in-process it would inherit and perturb the very global state
under suspicion, and running it second is unsafe because `-o` renames only the
binary, so a reference compile cannot be redirected away from the `.map`/`.lst`/
`.obj` paths. Exits non-zero and names the artifact that disagreed.

---

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

Status: **CLOSED in 1.55.4.** Embedded blob bytes now enter the dependency
manifest — each `datFile.fileSpec` becomes a manifest entry hashed and
re-validated exactly like a source file — rather than being hashed into the key
as this entry proposed. Same effect, and it composes up the tree, so a blob
referenced from a depth-2 object invalidates every level above it.

The "why deferred" reasoning above was **wrong on its facts** and is left in
place deliberately as a caution. It claimed neither triggering pattern "appears
in observed project layouts". The second one — two applications in one project
sharing a library object that embeds a `FILE` blob, each resolving that blob
against its own directory — is exactly what users hit, and it needed nothing
unusual: `-C` with the default cache directory was enough. A gap dismissed as
theoretical was already shipping wrong binaries.

---

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

Status: **CLOSED in 1.55.4, by a different design.** The distiller-record
snapshot-and-replay described above was not built, and the ID-remap layer it
would have needed was never required. Instead the map is generated from an
explicit instance store (`src/classes/objInstanceInfo.ts`, populated in
`src/classes/compiler.ts`), which is rebuilt for cached and uncached children
alike, so a cache-served child's descendants are present by construction rather
than restored after the fact. Cached-vs-uncached `.map` equality is now asserted
in the byte-equivalence harness, so this cannot regress silently.

`Object-Cache-Future-Enhancements.md` still describes "Option C — Full
distiller-state cache" as live work; it is superseded by this.

---

### Warm-cache `.map` can describe a structure the `.bin` does not contain

Observed 2026-08-21 while building the cache-invalidation scaffolding (sprint
task «#28»). With `--cache --map`, after editing an object reached both directly
and transitively, the generated `.map` was **byte-for-byte identical** to an
uncached build's map — same MEMORY LAYOUT, same `Objects: 6`, same DAT symbol
addresses — while the `.bin` was **88 bytes larger** than the uncached binary.

The map is derived from distiller/symbol state while the binary is assembled
from cached child images, and on a warm cache the two can disagree. That makes
`--map` output actively misleading in exactly the situation a user would reach
for it.

The stale-binary half is fixed by the Object-Cache-Transitive-Invalidation
sprint. What is NOT covered, and is why this entry exists: whether the map and
binary can still disagree once the cache is correct. Reproduce with
`TEST/CACHE-fixtures/sgl_*` — cold compile, edit `state_counter LONG 0` to
`LONG 99` in `sgl_shared_state.spin2`, recompile warm, compare `.map` and `.bin`
against an uncached build.

Status: **CLOSED**, verified against 1.55.4 (2026-08-22). Re-ran the reproducer
plus three more mutations — depth-1 singleton DAT value, depth-3 leaf CON, the
`DAT FILE` blob, and adding a third instance of an already-doubled object. In
every case the warm-cache `.bin` AND `.map` were byte-identical to an uncached
build (only the `Generated:` timestamp line differs). The residual question this
entry existed to hold open — whether map and binary can still disagree once the
cache is correct — is answered: not for any mutation we can construct.

---

### `.map` MEMORY LAYOUT has an `Overrides` column that is never populated

Observed 2026-08-22 while adding the warm-vs-uncached `.map` comparison. The
column exists in the header and is always blank. `ObjInstanceInfo` carries the
machinery — `addOverride`, `addOverridesFromSymbols`, `hasOverrides`,
`formatOverrides` — and **nothing in the compiler ever calls it**.

Reproduce with `TEST/MAP-tests/test4-override`: `child2` declares
`| DEFAULT_VALUE = 20` and `child3` declares `| DEFAULT_VALUE = 30,
MULTIPLIER = 5`, and the map prints three `param_child` rows with an empty
`Overrides` cell on each. The overrides are the whole reason three images
exist, so the reader is shown three identical-looking rows with no account of
why there are three.

Status: **CLOSED in 1.55.4**, both halves.

The direct-child half reads the override table where the instance is recorded
(`objFile.parameterSymbolTable`). The half with teeth is an override declared
BELOW a cached object: the hit is exactly what skips re-parsing that OBJ block,
so the values now ride in the entry's instance sidecar (`CachedInstance.overrides`,
serialised with string values because JSON has no bigint). Without that, a warm
build would print blank cells where a cold build prints values — a warm/cold
divergence, which is the class this release exists to remove.

Fixed inside the same release that moved `CACHE_FORMAT_VERSION` 7 → 8, so the
sidecar change cost users no additional cache rebuild. Doing it later would have
required a second bump.

Regression coverage: `src/tests/CACHE-tests/mapOverrides.test.ts` (top-level and
below-a-cached-object, warm compared against both cold and uncached), fixtures
`TEST/CACHE-fixtures/ovr_deep_*`, and the tree is in the mutation sweep.

---

### `.map` SYMBOL INDEX shows one row per source file, not per image

Observed 2026-08-22 while re-measuring the P2KB object-image-dedup entry against
1.55.4 (sprint task «#38»). When a CON override forks one source file into
several independent images, `MEMORY LAYOUT` and `ADDRESS INDEX` correctly list
every image with its own address and instance label, but `SYMBOL INDEX` lists
each symbol **once** — at the first image's address.

Reproduced with a 3-tier seeded-and-forwarding cascade: 5 images, of which
`casc_mid` and `casc_leaf` each appear twice, yet `SYMBOL INDEX` carries a
single `MTAG` row (`$00034`) and a single `LTAG` row (`$0004C`). The second
image's DAT addresses appear nowhere in that section.

This follows from symbols being stored per source file
(`objectSymbolStore` is keyed by source-file index), so it is a design
limitation rather than the index-space confusion fixed in 1.55.4 — but the
effect on a reader is the same: an address that is right for one instance and
silently wrong for the other. Either the section should repeat symbols per
image, or it should say which image it is reporting.

Reproducer: `scratchpad` case in the sprint record, or rebuild from the pattern
in P2KB `p2kbSpin2ObjectImageDedup` (`cascade_through_tiers`).

Status: **CLOSED in 1.55.4** — and the entry understated it. `ADDRESS INDEX` had
the same one-row-per-source-file collapse for method rows, and worse: the numbers
in its `Address` column were method **slot indices** in the object header table,
not addresses at all. The map test suite asserted the map matched that index,
so the check passed only while the defect was present.

Fixed by making both index sections iterate INSTANCES rather than the
source-file-keyed symbol store, and by dereferencing the header slot to get a
method's real bytecode address. Instances are now named by access path
(`A.LEAF`, `B.LEAF`), which also gives Object Details unique headings and lets
the flat sections say which image they mean. Regression coverage in
`src/tests/MAP-tests/map.test.ts` under "index sections describe every image".

---
