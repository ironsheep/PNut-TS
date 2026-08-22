# P2KB `map_caveat` — re-measurement and proposed amendment (1.55.4)

**Status:** measurement complete, amendment proposed. **Not yet applied** — P2KB
is an external corpus and is edited by Stephen, not from this repo.
**Measured:** 2026-08-22 against pnut-ts **1.55.4**.

---

## Why this exists

The P2 Knowledge Base entry `p2kbSpin2ObjectImageDedup` carries a standing
warning about *our* `.map` output:

> **`map_caveat`:** In the multi-instance `.map`, the instance-name /
> source-name columns can be internally inconsistent — do NOT trust those
> labels. The reliable signals are the `Objects:` count and the DAT symbol
> addresses.

That warning was correct when written. It is a defect report, published outside
this repository, telling P2 developers to route around a bug — and `1.55.4`
fixes the bug. The entry also self-flags *"pnut-ts v1.55.0 (measured
2026-06-30) — compiler-coupled; re-verify on a compiler version bump"*, so the
re-measurement is owed regardless.

Nothing in `DOCs/doc-coverage.json` can see this document, which is exactly why
it was a numbered sprint deliverable rather than a note.

## The entry's own measurement procedure, re-run

Rebuilt from the fixtures the entry itself specifies (`forking_a_dat_region`
and `cascade_through_tiers`) and read the same way it says to read them —
`-m`, then the `Objects:` count and DAT addresses.

| Case | v1.55.0 (entry) | v1.55.4 (measured) | |
|---|---|---|---|
| identical overrides (100,100), seeded probe | `Objects: 2`, one shared DAT | `Objects: 2`, one shared DAT | ✅ |
| differing overrides (100,200), seeded probe | `Objects: 3`, two independent DAT | `Objects: 3`, two independent DAT | ✅ |
| differing overrides, override unreferenced | `Objects: 2`, silently merged | `Objects: 2`, silently merged | ✅ |
| one top override, 3-tier seeded+forwarding chain | `Objects: 5` | `Objects: 5` | ✅ |

**Every dedup claim in the entry still holds.** The mechanism it documents is
unchanged; only our `.map` rendering of it changed.

## What changed: the labels are now correct

The 3-tier cascade, which is the case the caveat was written about:

```
=== OBJECT HIERARCHY ===

  case4  (1 methods)
      +-- A : casc_mid  (1 methods)
      |   \-- LEAF : casc_leaf  (1 methods)
      \-- B : casc_mid  (1 methods)
          \-- LEAF : casc_leaf  (1 methods)

=== MEMORY LAYOUT ===
  $00000  $00023     36  case4            (entry)
  $00024  $00042     31  casc_mid         A
  $00044  $00055     18  casc_leaf        LEAF
  $00058  $00076     31  casc_mid         B
  $00078  $00089     18  casc_leaf        LEAF
```

Both instances present, each with its own child, every source name correct, no
`object_N` placeholders. Before 1.55.4 this same tree lost instances, attached
names to the wrong file, and printed placeholder names — `buildObjInstanceInfo`
was mixing four different index spaces that only coincide when every object
appears exactly once.

## What is still true, and must not be dropped from the entry

**`SYMBOL INDEX` lists one row per source file, not per image.** In the cascade
above there are five images — `casc_mid` and `casc_leaf` each appearing twice —
but that section carries a single `MTAG` row (`$00034`) and a single `LTAG` row
(`$0004C`). The second image's DAT addresses appear nowhere in it.

This is a different problem from the one the caveat describes: symbols are
stored per source file, so the section can only report one address for a symbol
that now lives at several. The effect on a reader is still an address that is
right for one instance and silently wrong for the other, so **the entry should
keep pointing readers at `MEMORY LAYOUT` / `ADDRESS INDEX` for per-instance DAT
addresses.** Tracked in this repo's punch list.

Replacing one inaccuracy with another would be worse than leaving the caveat
alone, which is why this section exists.

## Proposed amendment

Replace `map_caveat:` with:

```yaml
  map_caveat: |
    Fixed in pnut-ts 1.55.4. Through 1.55.3 the multi-instance .map could show
    instance-name / source-name columns that were internally inconsistent —
    instances missing, names attached to the wrong source file, or placeholder
    names like object_12 — and those labels were not to be trusted. As of
    1.55.4 the hierarchy, memory layout and address index name every instance
    and its source correctly, including an object declared more than once.

    One limitation remains: SYMBOL INDEX reports one row per SOURCE FILE, so
    when an override forks a file into several images only the first image's
    DAT address appears there. For per-instance DAT addresses read MEMORY
    LAYOUT or ADDRESS INDEX, which list every image.

    The Objects: count is reliable in every version.
```

And update the toolchain stamp:

```yaml
toolchain: "pnut-ts 1.55.4 (re-measured 2026-08-22) — compiler-coupled; re-verify on a compiler version bump"
```

The `description`, `THE RULE`, `forking_a_dat_region`, `the_silent_trap`,
`cascade_through_tiers` and `verification.measured` blocks all re-measured
clean and need no change.

## Note on the source

Per `feedback_p2kb_validation`, P2KB entries are verified before being relied
on. This one is object-model rather than execution-model — where the confirmed
P2KB defects live — is explicitly marked as *measured* against our own compiler
with a reproducible method, and every one of its four cases was re-run here
against the shipping build. It is confirmed, not taken on faith.

Also note `p2kb-mcp` serves a boot-time snapshot and does not reload on
republish: after this amendment is applied, a stale read needs a session
restart, not `p2kb_refresh`.
