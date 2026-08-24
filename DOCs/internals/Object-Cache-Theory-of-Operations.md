# PNut-TS Object Cache Theory of Operations

## Overview

The object cache is a persistent, content-addressed store of compiled child
objects. When a build re-compiles an object tree whose lower levels have not
changed, the cache returns each unchanged child's compiled binary — plus the
side effects that child's compile would have had on shared compiler state —
instead of compiling it again.

The cache is **opt-in**. Nothing is read from or written to it unless `-C` /
`--cache` (or `--cache-verify`, which implies it) is on the command line. A
build without those flags behaves exactly as it did before the cache existed:
`ObjectCache` is constructed with `enabled = false`
(`src/classes/compiler.ts:92`), and every entry point returns early on that flag
(`src/classes/objectCache.ts:384`, `:439`, `:531`, `:549`).

Only child objects are cacheable. The top-level object is never keyed and never
stored — the recursion gate is `depth > 0`
(`src/classes/compiler.ts:304`).

This document describes the mechanism as it stands at v1.55.4, with
`CACHE_FORMAT_VERSION` 8.

## Command-line surface

Four options, declared together in `src/pnut-ts.ts:178-181`:

| Option | Effect |
|---|---|
| `-C`, `--cache` | Enable the object compilation cache |
| `--cache-dir <dir>` | Use `<dir>` instead of the default |
| `--cache-clear` | Remove the cache directory before compiling |
| `--cache-verify` | Also compile without the cache and fail if the results differ (implies `--cache`) |

The default directory is `.pnut-cache`
(`src/utils/context.ts:205`), resolved against the process working directory —
`ObjectCache` calls `path.resolve()` on whatever it is handed and creates the
directory when enabled (`src/classes/objectCache.ts:312-318`). So the default
places the cache in the directory the compile was launched from, not next to
the source.

`--cache-verify` sets `cache` as well as `cacheVerify`, because verifying a
build that was not cached would compare a build to itself
(`src/pnut-ts.ts:328-332`).

`--cache-clear` runs at CLI-parse time, not at compile time
(`src/pnut-ts.ts:336-344`). It therefore works when no source file is given at
all. Clearing reports `Cleared object cache: <dir>` when a directory was
removed, and a verbose-only `Cache directory not present, nothing to clear:
<dir>` when there was none.

At the end of a cached compile the counters are reported as
`Object cache: N hit(s), M miss(es) (<path>)`
(`src/classes/compiler.ts:842-851`).

## Content addressing: what the key hashes

A cache key is the hex SHA-256 digest of a fixed sequence of inputs
(`ObjectCache.computeKey`, `src/classes/objectCache.ts:338-380`). The inputs
are declared as `CacheKeyInputs` (`src/classes/objectCache.ts:100-123`) and are
supplied at the one call site in the compiler
(`src/classes/compiler.ts:307-325`).

Everything hashed, in the order it is hashed:

1. **The child's preprocessed source lines.** Each line's text followed by a
   newline (`:341-344`). These are post-preprocessor, so the content of every
   `#include` and the outcome of every `#ifdef` is already folded in.
2. **The OBJ parameter overrides**, sorted by name, as
   `name:type:value` (`:346-351`). Sorting removes declaration order from the
   key; the values themselves stay significant.
3. **The compiler version** as `v:<version>` (`:353`), taken from
   `context.compilerVersion`, which is the CLI's own version string
   (`src/pnut-ts.ts:80`).
4. **`--debug`** as `d:0` or `d:1` (`:354`).
5. **The cache format version** as `f:<n>` (`:355`).
6. **The active preprocessor symbol set** as `D:<SYMBOL>` per symbol,
   upper-cased, deduplicated and sorted (`:356-366`). This is
   `context.preProcessorOptions.defSymbols` at the moment of lookup, which
   carries both CLI `-D` definitions and anything an ancestor propagated with
   `#pragma exportdef`.
7. **The resolution root** as `r:<scoped path>` (`:375`).
8. **The `-I` include folders** as `I:<scoped path>` each, **in the order
   given** and never sorted (`:376-378`), because that order decides which of
   two same-named files wins.

### Why the resolution root is part of identity

The resolution root is the **top-level** file's directory — not the directory of
the object being keyed. The compiler passes `this.srcFile.dirName`
(`src/classes/compiler.ts:323`), where `this.srcFile` is the top file
(`src/classes/compiler.ts:153`).

That is the root because it is what name resolution actually uses.
`context.currentFolder` is set to the top-level document's directory
(`src/pnut-ts.ts:594`), and both kinds of logical name resolve from there:

- an `OBJ` name goes through `locateSpin2File`, which tries
  `currentFolder` first, then the built-in library directory, then the `-I`
  folders in order (`src/utils/files.ts:122-158`, called from
  `src/classes/spinFiles.ts:299`);
- a `DAT ... FILE` name goes through `locateDataFile` with the same
  `currentFolder` as its working directory, then the library directory, then the
  `-I` folders (`src/utils/files.ts:168-207`, called from
  `src/classes/spinFiles.ts:159`).

So the same library object, with byte-identical source and identical overrides,
legitimately compiles to *different bytes* for two different applications: each
application's `DAT ... FILE "defaults.dat"` resolves under that application's
own directory, and those blob bytes are written into the object's binary.
Without the resolution root in the key, the second application is served the
first application's binary.

### `scopedPath()` — why keys are relative

Both the resolution root and each include folder are passed through
`scopedPath()` before hashing (`src/classes/objectCache.ts:332-336`):

```ts
private scopedPath(absPath: string): string {
  const scopeRoot = path.dirname(this.cacheDir);
  const rel = path.relative(scopeRoot, path.resolve(absPath));
  return rel.split(path.sep).join('/');
}
```

The path is expressed **relative to the cache directory's parent**, with
separators normalized to `/`. The cache directory is the sharing scope, so its
parent is the root the members of that scope are measured against: with the
default `.pnut-cache`, that parent is the project root, and `proj/appA` hashes
as `appA`.

Hashing the absolute path instead would bake the checkout location into every
key, so the same tree built at two locations — or on two machines sharing a
cache directory — would share nothing. Normalizing the separator lets a key
computed on Windows match one computed on Linux.

### The rule for adding a compile option

Any option that can change a child object's bytes must be folded into
`computeKey()` **and** the format version must be bumped. That rule is recorded
at the head of the source (`src/classes/objectCache.ts:45-50`); today the
options it covers are `enableDebug`, `defSymbols`, and the resolution context.

## The on-disk entry

One entry is five files in the cache directory, all named for the key
(`src/classes/objectCache.ts:622-640`):

| File | Contents | Required on a hit |
|---|---|---|
| `<key>.bin` | The compiled child binary, raw | Yes — its presence is the hit gate |
| `<key>.sym` | The child's user symbols, its instance subtree, and its descendants' symbols | Only when a `.map` is being written |
| `<key>.dbg` | The hit-replay payload: debug records, `brkCode` write sites, subtree `exportdef` contributions | Yes, on every hit |
| `<key>.dep` | The dependency manifest | Yes — validation reads it first |
| `<key>.meta` | Human-readable JSON diagnostic | No, never read by the hit path |

They are written sidecars-first and **binary last**
(`src/classes/objectCache.ts:546-592`), so an interrupted run cannot leave a
`.bin` without its companions — `get()` gates on the `.bin` existing
(`:386`).

### Serialized shapes

Every sidecar but `.bin` is JSON and every one of them carries
`cacheFormatVersion`; a reader that finds a different value returns `undefined`
and the entry is treated as absent (`:401`, `:423`, `:456`, `:475`, `:504`).

**`.dep`** — `SerializedDepFile` (`:140-143`):

```ts
interface SerializedDepFile {
  cacheFormatVersion: number;
  entries: ManifestEntry[];        // { path: string; hash: string }
}
```

`ManifestEntry` (`:135-138`) is a resolved **absolute** path and the SHA-256 of
that file's raw bytes, hex.

**`.sym`** — `SerializedSymFile` (`:268-283`):

```ts
interface SerializedSymFile {
  cacheFormatVersion: number;
  symbols: SerializedSymbol[];              // this child's own user symbols
  instances?: CachedInstance[];             // its instance subtree
  subtreeSymbols?: SerializedSubtreeSymbols[];  // its DESCENDANTS' symbols
}
```

`SerializedSymbol` (`:212-217`) is deliberately terse — `n` name, `t` type
(`eElementType`), `v` value, `i` present only when the symbol is inline. A
`bigint` value is tagged as `{ $b: "<decimal>" }` so the round trip is lossless
(`:648-668`). `SerializedSubtreeSymbols` (`:263-266`) is `f` (source file name)
and `s` (that file's symbols).

`CachedInstance` (`:242-255`) records one object instance inside the subtree:

```ts
interface CachedInstance {
  relativeParent: number;      // -1 = a direct child of the subtree root
  childPosition: number;       // position in the parent's OBJ block
  sourceFileName: string;
  overrides?: CachedOverride[];
}
```

It is self-contained rather than index-based on purpose: a source **name**
rather than a source-file index (indices are registration order and need not
match on a later run), and a parent counted **from the subtree root** rather
than an absolute instance id (the subtree lands at a different offset in every
compile that reuses it).

`CachedOverride` (`:236-240`) is `{ name, value: string, isFloat }`. The value
is a string because the sidecar is JSON and JSON has no `bigint`; the map prints
these rather than computing with them.

**`.dbg`** — `SerializedDbgFile` (`:296-304`):

```ts
interface SerializedDbgFile {
  cacheFormatVersion: number;
  records: SerializedDbgRecord[];   // { i: origIndex, b: base64 record bytes }
  brkSites: SerializedBrkSite[];    // { o: offset, k: 0 spin | 1 pasm, i: origIndex }
  subtreeExports: string[];
}
```

**`.meta`** — `CacheMetadata` (`:89-98`), written pretty-printed (`:588-590`):
source file name, serialized overrides, compiler version, `enableDebug`, format
version, a `Date.now()` timestamp, binary size and symbol count. It exists to be
read by a human staring at a cache directory.

## `CACHE_FORMAT_VERSION`

```ts
export const CACHE_FORMAT_VERSION = 8;
```

`src/classes/objectCache.ts:82`.

It is hashed into every key (`:355`) *and* stamped into every JSON sidecar.
Bumping it therefore changes every key, which makes every existing entry
unreachable rather than merely suspect: an entry written by an older format is
never found, never validated and never served. Old `.bin` files linger until
`--cache-clear` removes the directory, but they cannot be hit.

That is the property to reach for when a defect is found in what the cache
stores or how it keys. Entries poisoned by the old behavior self-invalidate on
upgrade; users do not have to be told to run `--cache-clear`.

The three most recent bumps:

| Version | What it was for |
|---|---|
| 6 | The `.dbg` sidecar gained `subtreeExports`, so a hit replays the `#pragma exportdef` symbols its skipped subtree would have pushed. |
| 7 | The `.dep` dependency manifest was added, so a hit revalidates every file its subtree was built from. |
| 8 | The resolution root and the `-I` list joined the key, and `CachedInstance` gained `overrides`. |

## The dependency manifest

This is the heart of the correctness story, and it is the part that is *not*
in the key.

A child's cache key covers its own preprocessed source and nothing below it.
The bytes of its `OBJ` descendants are embedded in its binary but appear
nowhere in that key, and on a hit the whole subtree is skipped — so a
descendant never gets the chance to report that it changed. The manifest is
what closes that gap.

### What one manifest holds

Every input file the cached subtree was built from: the object's own source,
its `DAT ... FILE` blobs, and, recursively, everything its `OBJ` children were
built from. Each entry is a resolved absolute path and the SHA-256 of that
file's raw bytes (`manifestEntryFor`, `src/classes/objectCache.ts:743-745`;
`hashBytes`, `:738-740`).

### Content hash, not mtime

The fingerprint is the file's contents, not its modification time or size. A
fresh checkout, a CI job and a container bind-mount all rewrite mtimes without
changing a byte — so an mtime comparison produces spurious misses. Worse, the
opposite error is possible too, and a false *match* here is a silently wrong
binary, which is the exact failure this mechanism exists to end. The reasoning
is recorded on the type itself (`src/classes/objectCache.ts:125-134`).

### How the manifest composes

On a **miss**, after the object has compiled
(`src/classes/compiler.ts:638-654`):

```ts
const descendantManifests = this.subtreeManifests.splice(manifestMarkAtKey);
const blobEntries: ManifestEntry[] = datFileList.map((datFile) => manifestEntryFor(datFile.fileSpec));
const subtreeManifest: ManifestEntry[] = mergeManifests(...descendantManifests, [manifestEntryFor(srcFile.fileSpec)], blobEntries);
```

That is `{self} + embedded DAT FILE blobs + the union of every child's
manifest`. `subtreeManifests` is a shared accumulator: a child marks its length
on the way in (`src/classes/compiler.ts:300`), its descendants push onto it on
the way out, and the child splices exactly its own subtree's contribution back
off. `mergeManifests` (`src/classes/objectCache.ts:754-762`) keeps one entry per
resolved path and sorts by path, so a diamond that reaches one file through two
parents costs one entry, not two.

The fold runs whether or not the object is cacheable, so a depth-0 top level
still consumes its children's entries instead of leaving them dangling on the
accumulator; only `depth > 0` pushes its own result upward
(`src/classes/compiler.ts:653-655`).

A `DAT ... FILE` blob that has since been deleted is deliberately **not**
tolerated: `manifestEntryFor` throws on an unreadable file, and that propagates
as a compile error. Silently omitting it would produce an entry that later
validates clean against an input that no longer exists.

On a **hit**, the manifest is read from the `.dep` sidecar and pushed upward
unchanged (`src/classes/compiler.ts:434-435`):

```ts
const cachedManifest = this.objectCache.getManifest(cacheKey);
this.subtreeManifests.push(cachedManifest ?? []);
```

It does not need rechecking: it was validated as the *condition* of this hit, so
it is current by construction. Skipping this step would make the parent's
manifest cover only the children that compiled fresh, reintroducing the same
blind spot one level up.

### The manifest is validated, not hashed

The manifest is **not** an input to `computeKey()`. Folding it into the key
would mean the key changes whenever any file in the subtree changes — which
sounds equivalent but is not: the key would then have to be computed *after*
the subtree was walked, which is the walk the cache exists to avoid. Instead the
key identifies the entry and the manifest is checked beside it, at the moment
of lookup.

## The hit path

`getIfValid()` is the only way a binary leaves the cache during a compile
(`src/classes/objectCache.ts:438-445`):

```ts
getIfValid(key: string): Uint8Array | undefined {
  if (!this.enabled) return undefined;
  if (!this.isEntryValid(key)) {
    this._misses++;
    return undefined;
  }
  return this.get(key);
}
```

Validation runs **before** the lookup so an entry whose inputs have changed is
accounted a miss — which is what it is, since the caller is about to compile.
Keeping the counting here rather than in the compiler keeps the hit/miss
statistics truthful without the compiler touching the counters.

`isEntryValid()` (`:530-544`) reads the `.dep` sidecar and, for every recorded
entry, re-reads that path and re-hashes its bytes. It returns `false` — treat as
a miss, compile — when:

- the sidecar is absent, malformed, or stamped with another format version
  (`getManifest`, `:498-510`);
- any recorded path is gone or unreadable;
- any recorded hash differs from what the file holds now.

Each of those is a case where the entry cannot be *proved* still right, and an
unprovable entry is not one to serve.

### Why validating at the point of hit covers the whole subtree

Because a parent's manifest spans its entire subtree, re-hashing it at the
parent revalidates every descendant without visiting any of them. Editing a file
three levels down invalidates the entry of every ancestor above it in the same
pass, in one flat loop over one list — there is no separate recursive descent,
and no recursive descent is possible at that moment, because the whole point of
the hit is that the subtree is not being walked.

### What a hit replays instead of compiling

A hit returns before the child-object loop in `compileRecursively`, so
everything the skipped compile would have done to shared state has to be put
back from the sidecars (`src/classes/compiler.ts:330-478`):

1. **The `.dbg` sidecar is mandatory.** Its absence throws
   `Object cache: missing or invalid .dbg sidecar for [<file>] (key=…). Run
   with --cache-clear to rebuild.` (`:341-347`). It is load-bearing on every
   hit, `--debug` or not, because of step 2.
2. **Subtree `exportdef` symbols replay** onto
   `context.preProcessorOptions.defSymbols` (`:356-358`), so later siblings
   preprocess against the same symbol set a cold compile would have given them.
3. **Debug records and `brkCode` sites**, only when `--debug` is on
   (`:363-390`). Each recorded record's bytes are re-injected into the freshly
   built `DebugData` table, which returns a *new* index; every recorded
   `brkSite` in the cached binary is then patched from its original index to the
   new one (`patchBrkSite`, `src/classes/objectCache.ts:718-735`). A
   `brkSite` whose `origIndex` has no record throws with the same
   `--cache-clear` guidance. If any patch changed a byte, the Spin object
   checksum is recomputed (`recomputeChildChecksum`, `:701-716`), because the
   loader rejects an image whose byte sum is non-zero.
4. **The binary is spliced into `childImages`** — after being offered to
   `findDuplicateChild`, so a cached image dedupes against an already-placed
   identical one exactly as a freshly compiled image would (`:392-411`).
5. **Symbols are restored**, only when a `.map` is being written: the child's
   own from `.sym` (`:417-427`), and its descendants' from the same sidecar's
   `subtreeSymbols` (`:448-455`). Descendants are held by *name*, because the
   hit is what skipped loading them, so they have no source-file index yet.
6. **The instance subtree is replayed** (`:457-471`), relative parents
   re-based onto the current recursion point. Without this a hit would silently
   flatten the hierarchy in the `.map`.
7. **The manifest is handed upward** (`:434-435`), as described above.

The store side is the mirror image (`src/classes/compiler.ts:657-757`): the
subtree's debug records, `brkSite` list, `defSymbols` slice, instance slice and
descendant symbols are all captured from the same accumulators before
`objectCache.set()` writes them.

## `--cache-verify`

Verification compiles the same source twice — once with the cache, once
without — and compares what the two builds produced.

Two structural decisions make the comparison meaningful, and both are in
`src/utils/cacheVerify.ts`.

**The reference compile runs in a child process** (`:80-92`):

```ts
const args = referenceArgs(process.argv.slice(2));
const result = spawnSync(process.execPath, [process.argv[1], ...args], { encoding: 'utf8' });
```

The reason the cache is hard in the first place is that compilation reads and
writes process-global state: the preprocessor symbol set, the debug record
table, the object image. A reference compile run inside this process would
inherit that state and then perturb it, so it could differ from a real compile
for reasons having nothing to do with the cache. A separate process starts from
nothing.

`referenceArgs()` (`:54-71`) strips exactly the cache flags — `-C`,
`--cache`, `--cache-clear`, `--cache-verify`, and `--cache-dir` with its value
in either spelling — and carries everything else through untouched. A reference
built under different include paths, defines or debug settings would differ for
reasons that are not the cache's fault.

**The reference compile runs first** (`src/pnut-ts.ts:663-675`). `-o` renames
only the binary; the listing, map and object file keep their derived names
(`src/utils/outputFilespecs.ts:49-56`). A reference compile therefore cannot be
redirected somewhere harmless — it necessarily writes over the same paths. So it
runs first, its outputs are read into memory as a `VerifySnapshot`, and the real
cached compile then overwrites them normally. What is compared is that snapshot
against what the cached build finally left on disk.

The snapshot holds the binary and, when `-m` is on, the map text with the
`Generated:` line filtered out — the one line two identical compiles may
legitimately differ on (`readMapWithoutStamp`, `:38-45`).

### Messages and exit behavior

If the reference compile itself fails, nothing is compared:

```
--cache-verify: the uncached reference compile failed, so nothing could be verified.
```

followed by the child's stderr (`:84`). `pnut-ts` returns exit code 1 without
running the cached compile at all (`src/pnut-ts.ts:672-674`).

On agreement (`src/utils/cacheVerify.ts:126`):

```
Object cache verified: output matches an uncached build
```

emitted as a progress message, and the build finishes normally.

On disagreement (`:130-135`):

```
Object cache VERIFICATION FAILED — a cached build did not reproduce the uncached result:
  - <problem>
  Rebuild with --cache-clear to recover, and please report this: a cache hit served content a fresh compile would not have produced.
```

Each `<problem>` names the artifact that disagreed and, for the binary, both
sizes — `binary differs — cached N bytes, uncached M bytes`, `the cached build
produced no binary, the uncached one produced N bytes`, `map differs from the
uncached build`, or `the cached build produced no map, the uncached one did`
(`:105-123`). The compile's own outputs are left in place; `pnut-ts` returns
exit code 1 (`src/pnut-ts.ts:683-685`).

## Known boundary

The manifest records the file that name resolution reached **at store time**,
as a resolved absolute path, and validation re-reads exactly that path
(`manifestEntryFor`, `src/classes/objectCache.ts:743-745`; `isEntryValid`,
`:530-544`). Validation does not re-run name resolution.

So there is a case validation does not catch: a logical name that would resolve
to a *different file* on a later build. If a file appears at a
higher-precedence location in the search order — the top-level directory, the
library directory, or an earlier `-I` folder — while the previously resolved
file stays on disk unchanged, a fresh compile would pick up the new file, but
the recorded path still hashes clean and the entry is served.

The `-I` list and the resolution root are themselves in the key
(`src/classes/objectCache.ts:375-378`), so *changing the search list* is
covered — that changes every key. What is not covered is the search list
staying the same while its contents change such that resolution would land
somewhere new.

This case is open. Closing it would mean re-running resolution for each
recorded logical name at validation time, which the manifest's current shape —
resolved paths, with no record of the logical name that produced them — cannot
support.
