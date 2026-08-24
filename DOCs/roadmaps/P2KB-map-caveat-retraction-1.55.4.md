# P2KB `map_caveat` — re-measurement and proposed amendment (1.55.4)

**Status:** measurement complete, amendment proposed and **still required**.
Not yet applied — P2KB is an external corpus, edited by Stephen, not from this
repo. **Measured:** 2026-08-22 against pnut-ts **1.55.4**.

> **Re-checked 2026-08-22, after the entry was revised.** The entry has since
> been substantially rewritten — it gained a `singleton_rule` block,
> `the_other_silent_trap` ("WANTED ONE, GOT TWO"), a `completeness_rule` for
> forwarding constants, an `enforcement` block, several new measured cases and
> a new oneliner. That revision addressed override-forwarding and singleton
> semantics, which is a different subject.
>
> **`map_caveat` came through it verbatim, character for character**, so this
> amendment is still needed.
>
> The revision *did* remove the `toolchain:` field, so the stamp update this
> document originally proposed is moot and has been dropped below. Version
> guidance now lives in `verification.method`.
>
> Because the fetched entry contains all of that new material, this is a fresh
> read rather than the boot-time snapshot `p2kb-mcp` can otherwise serve — the
> one failure mode that could have made "unchanged" mean "not reloaded."

**Also re-verified against the entry's newest case.** The revision's headline
example — one declaration overridden, its sibling not — reproduces in shape at
1.55.4 (`Objects: 3` forked vs `2` when both are overridden; the entry's 348/216
byte figures are specific to its own fixture). The forked map reads:

```
  $00000  $00023     36  mirror_bad       (entry)
  $00024  $00037     20  drv2             A
  $00038  $00049     18  drv2             B
```

Both instances present, correct source file, correct instance names — which is
precisely what `map_caveat` tells readers not to trust.

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

> **This is now runnable, not just recorded.** The table below was originally
> produced by hand from the entry's prose. It is now reproduced by
> `npm run p2kb-verify` (`scripts/p2kb-dedup-verify`), which stages the entry's
> fixtures, compiles each with `-m`, checks the `Objects:` count against the
> value the entry records, and dumps the `MEMORY LAYOUT` label columns so the
> `map_caveat` question can be answered by looking rather than by trusting this
> document. Exit 0 = every case matched; exit 1 names which diverged.
>
> The entry self-flags *"compiler-coupled behaviour: re-measure rather than
> assume"*, so this is owed again at every compiler version bump — which is why
> it is a script and not a paragraph.

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

> **Superseded 2026-08-22, before this text was applied.** The limitation
> described below was FIXED in 1.55.4 rather than documented: both index
> sections now emit one row per image, method rows carry real bytecode
> addresses instead of header-table slot indices, and instances are named by
> access path (`A.LEAF`, `B.LEAF`). The steer this section proposed — send
> readers to `MEMORY LAYOUT` / `ADDRESS INDEX` for per-instance DAT addresses —
> was also wrong on its own terms: neither section carries DAT rows at all.
>
> The section is kept as the record of what was proposed and why. Do not apply
> it. The P2KB entry is being derived by evaluating the shipped build directly,
> which sees the corrected behavior.

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
    names like object_12 — and those labels were not to be trusted. SYMBOL
    INDEX and ADDRESS INDEX also reported one row per SOURCE FILE, so when an
    override forked a file into several images only the first image's addresses
    appeared.

    As of 1.55.4 the hierarchy, memory layout and both index sections name
    every instance and its source correctly, including an object declared more
    than once, and both index sections report per INSTANCE rather than per
    source file. Instances are named by path (A.LEAF, B.LEAF) and the MEMORY
    LAYOUT Overrides column shows the override that forked each image. Where
    several instances genuinely share one region the row names them (A+1).

    On 1.55.3 and earlier, prefer the Objects: count and the DAT symbol
    addresses. The Objects: count is reliable in every version.
```

> **Corrected 2026-08-24 — do not use an earlier draft of this block.** The
> version drafted on 2026-08-22 retained a limitation reading *"SYMBOL INDEX
> reports one row per SOURCE FILE… For per-instance DAT addresses read MEMORY
> LAYOUT or ADDRESS INDEX."* That was true when it was written and **was fixed
> later in the same release** by the index-space work — the punch-list item
> recording it is archived as CLOSED in 1.55.4. Publishing it would have
> steered P2 developers away from the section that now answers their question.
> Caught by `npm run p2kb-verify`, which now asserts the per-instance behaviour
> rather than printing it.

No `toolchain:` change is proposed — the field no longer exists. If a version
anchor is still wanted, `verification.method` is where it now belongs; a line
such as *"instance/source labels confirmed correct at pnut-ts 1.55.4"* would
carry it without reinstating a field the revision deliberately dropped.

Everything else re-measured clean and needs no change: `description`,
`THE RULE`, `singleton_rule`, `forking_a_dat_region`, `the_silent_trap`,
`the_other_silent_trap`, `cascade_through_tiers` and `verification.measured`.

## Note on the source

Per `feedback_p2kb_validation`, P2KB entries are verified before being relied
on. This one is object-model rather than execution-model — where the confirmed
P2KB defects live — is explicitly marked as *measured* against our own compiler
with a reproducible method, and every one of its four cases was re-run here
against the shipping build. It is confirmed, not taken on faith.

Also note `p2kb-mcp` serves a boot-time snapshot and does not reload on
republish: after this amendment is applied, a stale read needs a session
restart, not `p2kb_refresh`.

## Reproducing this yourself

```
npm run p2kb-verify
```

Measured 2026-08-24 against v1.55.4: **6 of 6 cases matched the entry.** Both
halves of the proposed amendment are demonstrated by its output rather than
asserted here:

- **The labels are correct.** The fork case prints two clearly distinguished
  rows — `drv  A  BUS_TAG=100` at `$00024` and `drv  B  BUS_TAG=200` at
  `$00038` — with the right source file, the right instance name, and the
  override that caused the fork. The 3-tier case names instances by path
  (`A.LEAF`, `B.LEAF`) with each tier's forwarded value. A singleton prints
  `A+1`, naming the region's occupants rather than silently showing one.
- **The per-source-file collapse is gone.** In that same forked program
  `SYMBOL INDEX` prints **two** `TAG` rows — `drv  A  DAT  $0002C` and
  `drv  B  DAT  $00040` — and those addresses fall inside A's region
  (`$00024-$00035`) and B's (`$00038-$00049`) respectively. The harness asserts
  this rather than displaying it, because a draft of the amendment retained a
  limitation that had already been fixed.
