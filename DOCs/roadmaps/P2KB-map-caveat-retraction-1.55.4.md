# P2KB `map_caveat` — re-measurement and proposed amendment (1.55.4 → 1.55.8)

**Status:** amendment **still required, not applied** — the live entry
(`p2kbSpin2ObjectImageDedup`, last fetched 2026-09-16) still carries the
original `map_caveat` verbatim. P2KB is an external corpus, edited by Stephen;
this document is the proposal for him to apply, not an edit to P2KB itself.

**Re-measured 2026-09-17 against the Map-Instance-Correctness sprint build
(pre-1.55.8, `npm run p2kb-verify` — `scripts/p2kb-dedup-verify`, 15/15 cases
matched).** That sprint fixed the shapes the caveat was written about:
identical-copy and nested VAR bases, OBJ arrays, an OBJ declared after an
array, and DAT-layout forks. This replaces the 1.55.4/1.55.7 drafts below,
which said the multi-instance `.map` was correct except for a residual
`SYMBOL INDEX`-only limitation — that residual limitation is closed too, and
two further defect classes (identical-copy/nested VAR bases, OBJ arrays) that
those drafts had not yet found are now fixed and covered by the script. Every
one of the entry's seven published measured cases, including the two whose
fixtures were not published, is now independently reproduced by reconstructed
fixtures built from the entry's own prose — see the table below.

## Why this exists

The P2 Knowledge Base entry `p2kbSpin2ObjectImageDedup` carries a standing
warning about our `.map` output:

> **`map_caveat`:** In the multi-instance `.map`, the instance-name /
> source-name columns can be internally inconsistent — do NOT trust those
> labels. The reliable signals are the `Objects:` count and the DAT symbol
> addresses.

That warning was correct when written, against a pre-1.55.4 build. It is a
defect report, published outside this repository, telling P2 developers to
route around a bug. The bug it names was fixed in 1.55.4; two further defect
classes in the same area (identical-copy/nested VAR bases, OBJ arrays,
including an OBJ declared after an array) were found later and fixed for
1.55.8. The entry also self-flags *"compiler-coupled behaviour: re-measure
rather than assume if a result surprises you,"* so the re-measurement is owed
at every version bump.

## What changed at 1.55.8

The `.map` format itself changed in 1.55.8 (see
`DOCs/internals/MAP-File-Format.md`): there is no `Objects:` line any more. A
`SUMMARY` sentence states the image count directly — *"the top object and N
OBJ declarations became N instances, built from I images; S images are shared
by more than one instance"* — and `MEMORY LAYOUT` / `OBJECT DETAILS` carry
every instance's own address facts, including `VAR` rows per instance rather
than per source file.

**The old `Objects: N` figures published in the entry correspond exactly to
this build's `SUMMARY` image count `I`.** `scripts/p2kb-dedup-verify` asserts
that mapping for every one of the entry's own cases (see next section) rather
than assuming it.

## The entry's own cases, re-measured

Re-run from the fixtures the entry itself specifies (or, for the two cases
whose exact fixture source is not published, reconstructed from its prose —
noted per-row below), now read as the 1.55.8 grammar states to read them
(`SUMMARY` image count, `MEMORY LAYOUT` / `OBJECT DETAILS` addresses) instead
of the removed `Objects:` line:

| Case | Entry's `Objects: N` | Sprint build `SUMMARY` images | Image counts reproduced | Byte totals |
|---|---|---|---|---|
| identical overrides (100,100), seeded probe | 2, one shared DAT | 2, one shared DAT | yes | not stated by entry |
| differing overrides (100,200), seeded probe | 3, two independent DAT | 3, two independent DAT | yes | not stated by entry |
| differing overrides (100,200), override unreferenced | 2, silently merged | 2, silently merged | yes | not stated by entry |
| one top override, 3-tier seeded+forwarding chain | 5 (every DAT tier forked) | 5 | yes | not stated by entry |
| one declaration overridden, its sibling not (the mirror trap) | 3 forked / 2 when both overridden, 348/216 bytes | 3 forked / 2 when both overridden, 76/56 bytes (our fixture) | yes | entry's own fixture, not published — absolute bytes not expected to match and were not compared; the **relation** was asserted instead (forked Code/DAT bytes > merged) and holds: 76 > 56, same as the entry's 348 > 216 |
| two DIFFERING overrides of a CON the object never references — reconstructed | 2, ONE image, binaries md5-identical to the equal-overrides program | 2 images; `t11_diff.bin` md5-identical to `t11_same.bin` | yes | not stated by entry; identity (not size) is the claim, and it holds byte-for-byte |
| a tier forwarding only one of an object's TWO DAT-sizing CONs — reconstructed (`leaf2`/`mid_incomplete`/`mid_complete`) | 4 (two driver images) → 3 (one), 372/240 bytes | 4 (two `leaf2.spin2` images) → 3 (one `leaf2.spin2` image) | yes | entry's own fixture, not published — our reconstruction's Code/DAT bytes (120 → 92) are not expected to match 372/240; the image-count transition (two images → one) is the load-bearing claim and it reproduces exactly |

**All seven of the entry's published measured cases are now reproduced,
including the image-count and identity claims for the two whose original
fixture source was never published.** The two entries' own absolute byte
figures (348/216 and 372/240) remain specific to fixtures we don't have; no
reconstruction here was tuned to hit those numbers, and none is expected to.

**Every dedup claim the entry makes still holds.** Only our `.map` rendering
of that mechanism changed.

## The three map shapes the caveat was written about, now fixed

`scripts/p2kb-dedup-verify` adds cases for exactly the shapes the sprint found
broken at 1.55.4–1.55.7 (Map-Instance-Correctness sprint, punch list §20):

- **Identical-copy and nested VAR bases.** Two instances sharing one image
  (`LEFT`, `RIGHT` : `"motor"`), each with its own child (`LEFT.LOG`,
  `RIGHT.LOG`), get four distinct, correctly-nested `VAR` bases: each child's
  base is checked against its parent's `VAR` base plus the parent image's own
  child-slot offset.
- **OBJ arrays.** `d[3] : "drv"` gets one shared image and three distinct `VAR`
  rows, one per element; the image's `MEMORY LAYOUT` `Instances` cell lists all
  three (as the array run `D[0..2]`).
- **An OBJ declared after an array in the same parent.** `d[3] : "drv"`
  followed by `e : "drv_unref"`: `E` gets its own image and address, its
  correct source file, and its own `OBJECT DETAILS` block — no placeholder
  name, no misattributed source, no missing index rows.
- **A DAT-layout fork.** `a : "buf" | SIZE = 4`, `b : "buf" | SIZE = 100`:
  two separate images, each with its own `DAT` offsets for the field after the
  sized array.

All fifteen cases (the seven entry cases — one of them split into an
image-count check plus a byte-relation check, two of them reconstructed — plus
these four map-shape cases, plus the reconstructed completeness-rule case's
two variants) pass against the sprint build; see
`scripts/p2kb-dedup-verify`.

## Proposed amendment

Replace `map_caveat:` with:

```yaml
  map_caveat: |
    Measured against pnut-ts 1.55.8; re-measure on a newer compiler.

    Through 1.55.3 the multi-instance .map is unreliable: instances can be
    missing, names attached to the wrong source file, placeholder names like
    object_12 printed, DAT symbol addresses inconsistent between sections, and
    a symbol's address listed only for its first copy. On those versions trust
    only the Objects: count.

    1.55.4 through 1.55.7 fixed objects declared once and copies forked by
    differing overrides: every section named the right instance with the right
    address. It was still wrong for copies that share one image without being
    forked (identical-copy and nested VAR bases could repeat or go missing),
    OBJ arrays (only one element was reported), and any OBJ declared after an
    array (wrong location, placeholder name, missing rows).

    From 1.55.8, every section reports every instance and every image
    correctly, including those shapes: each instance is named by access path
    (A, A.LEAF, D[1], A.D[1].LEAF) with its source object and own VAR base,
    array elements each get their own row, and copies sharing one image are
    listed together with correct shared code/DAT addresses and their own,
    separate VAR bases. Trust the labels.
```

And replace `verification.method` with:

```yaml
  verification.method: |
    Compile with -m and read the .map's SUMMARY sentence for the image count,
    and the MEMORY LAYOUT / OBJECT DETAILS sections for instance and DAT
    addresses (the .map format changed at pnut-ts 1.55.8: there is no
    Objects: line). Compiler-coupled behaviour: re-measure rather than assume
    if a result surprises you.
```

No other field needs to change: `description`, `THE RULE`, `singleton_rule`,
`forking_a_dat_region`, `the_silent_trap`, `the_other_silent_trap`,
`cascade_through_tiers` and `verification.measured` all describe the
compile-time mechanism, which this sprint did not touch — only how the `.map`
reports its result.

## Note on the source

Per `feedback_p2kb_validation`, P2KB entries are verified before being relied
on. This one is object-model rather than execution-model — where the confirmed
P2KB defects live — is explicitly marked as *measured* against our own
compiler with a reproducible method, and every case this document reports was
re-run here against the sprint build via `scripts/p2kb-dedup-verify`.

Also note `p2kb-mcp` serves a boot-time snapshot and does not reload on
republish: after this amendment is applied, a stale read needs a session
restart, not `p2kb_refresh`.

## Reproducing this yourself

```
npm run p2kb-verify
```

Measured 2026-09-17 against the Map-Instance-Correctness sprint build:
**15 of 15 cases matched.** The script prints the `SUMMARY` sentence for every
case and asserts, rather than merely displays, the four map-shape cases and the
two reconstructed entry cases above — a temporarily corrupted expected value
fails and names the case (verified twice: once against the DAT-layout-fork
case, once against the new completeness-rule case, each edited, re-run to
confirm exit 1 naming the case, then reverted) before this document was
finalized.
