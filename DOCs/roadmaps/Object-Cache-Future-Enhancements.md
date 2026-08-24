# Object Cache — Future Enhancements

This file captures cache-related ideas that we deliberately deferred. Each entry
describes the trigger that should make us reconsider, the design sketch, and
the risks.

Background: the shipped mechanism is described in
`DOCs/internals/Object-Cache-Theory-of-Operations.md`. **Read that, not the
paragraph this one replaced** — the old summary described the v1.54.3 layout and
was two format versions out of date by v1.55.4, listing neither the `.dep`
dependency manifest nor the resolution root in the key. A background note that
silently ages is worse than a pointer, so this is now a pointer.

---

## Option C — Full distiller-state cache (SUPERSEDED in v1.55.4)

> **Do not implement this.** The gap it addresses was closed in v1.55.4 by a
> different design, and the premise stated below — that grandchildren of a cached
> child are missing from the map — is no longer true. The map is now generated
> from an explicit instance store (`src/classes/objInstanceInfo.ts`, populated in
> `src/classes/compiler.ts`) that is rebuilt for cached and uncached children
> alike, so a cache-served child's descendants are present by construction rather
> than restored after the fact. No distiller-record serialization and no ID-remap
> layer were needed. Cached-vs-uncached `.map` equality is asserted in the
> byte-equivalence harness. The rest of this section is retained as a record of
> the design that was considered and not taken.

### What it would buy us

Today, when a child object is served from cache and `--map` is enabled, we
restore the child's user symbols (so methods, DAT, VAR, etc. appear under that
child in the map). What we do **not** restore is the child's *distiller record*
— specifically its `subObjectIds` list, which describes the child's
parent→grandchild relationships.

Consequence: in a map file, **grandchildren of a cached child do not appear**.
For a top-level project that uses one cache layer of children, the map is
complete. For deeper nesting (top → child → grandchild) where the child is
cache-served, only top-level and the immediate child show up.

Option C closes that gap by serializing the distiller record subtree alongside
the binary and the symbols.

### Why we deferred it

It's a real chunk of work and introduces coupling we'd rather not pay for
until a user actually needs it.

1. **ID remap layer.** Distiller records reference each other by IDs that are
   allocated dynamically during compile. A cached child's subObjectIds were
   valid in *its* compile run; in a fresh run the IDs collide with whatever
   the current run has allocated. We'd need to:
   - Serialize the cached subtree with internal ID references using local
     placeholders (e.g. `{$ref: 0}`) instead of absolute IDs.
   - On hit, allocate fresh IDs and rewrite the references during injection.
   - Validate that the rewritten subtree is internally consistent.

2. **Recursive metadata.** A cached child's distiller record points at
   *grandchild* records, which point at great-grandchild records, etc. So the
   `.sym` (or a new `.dist` sidecar) becomes a tree, not a flat list. Either:
   - Inline the entire subtree in one sidecar, or
   - Recursively reference grandchild cache keys in the sidecar and look them
     up at hit time. This is more compact but introduces a fragility: if a
     grandchild's cache entry has been evicted, the parent's hit becomes a
     miss. Ugly to recover from.

3. **Discipline gap.** `CACHE_FORMAT_VERSION` catches *format* changes but not
   *semantic* ones. If someone alters how `subObjectIds` are constructed
   (e.g. a new flag bit) without bumping the version, stale caches return
   wrong-but-well-typed data. Same risk we have today for compiler-version-
   gated data, but Option C amplifies the surface area.

### Sketch of the implementation

If/when we do this:

- Add a `DistillerSnapshot` interface — a serializable form of one record plus
  any of its descendants we need for map output.
- Sidecar: `<key>.dist` (load-bearing when `--map` is on).
- Bump `CACHE_FORMAT_VERSION` (rule of thumb: any time a sidecar's shape changes).
- Hit-path additions in `compiler.ts`:
  ```
  if (writeMapFile) {
    const distSnap = objectCache.getDistillerSnapshot(cacheKey);
    if (distSnap) {
      injectDistillerSubtree(distSnap, this.spinResolver.distiller);
    } else {
      // log warning; map will be incomplete for this object's grandchildren
    }
  }
  ```
- `injectDistillerSubtree` is the new piece of code. It walks the snapshot,
  allocates fresh IDs, rewrites internal references, and adds the records to
  the live distiller.

### Trigger to revisit

A user reports running `--cache --map` together and finding that an object
they expected to see in the map (a grandchild of a cached child) is missing.
Until then, the simpler symbols-only restore is enough.

---

## Other possibilities

### LRU eviction / max-size policy

The cache grows unbounded today. For most projects this is fine — entries are
small. If someone runs into disk pressure, add an eviction policy keyed on
last-access time of `.bin` files. **Trigger:** user reports the cache directory
growing larger than expected.

### Cache symbol tables for full listing fidelity

Listing files (`.lst`) currently have the same gap as map files for cached
children: the cached child's body shows the binary but not the resolved
symbols inline. If users find listings useful in `--cache` mode and the gap
matters, the same sidecar approach used for map symbols extends here.
**Trigger:** user reports a listing-vs-no-cache discrepancy that affects them.

### Cache sharing across projects

Today `.pnut-cache/` lives in CWD. A `--cache-dir` flag already exists for
manual sharing. If multiple projects share enough common children that this
becomes worth automating, we could add a default global cache under
`~/.pnut-ts/cache/`. **Trigger:** user request, plus evidence of shared
children across distinct projects.

### Parallel-safe writes

Single-threaded today. If parallel compilation is ever added, cache writes
need atomic-rename (write `.tmp`, rename to final) to avoid one process
reading a half-written entry from another. **Trigger:** parallel compile
project starts.
