# P2KB Update Request — Flash Loader's RCFAST Architectural Contract

> **For:** the P2KB maintainer agent.
> **From:** PNut-TS internals review, 2026-05-25.
> **Source artifacts:**
> - `src/ext/flash_loader.spin2` in the PNut-TS repo, authored by Chip
>   Gracey (Parallax).
> - Chip Gracey's review feedback on
>   `DOCs/internals/Flash-Loader-Theory-of-Operations.md` (the companion
>   theory-of-operations write-up).
>
> **What this document is:** a follow-up to
> `Flash-Loader-P2KB-Update-Request.md`. That earlier request established
> the boot-ROM protocol and flash-loader case-study entries (now present
> as `p2kbArchSpiFlashBoot` and `p2kbExampleFlashLoaderCaseStudy`). This
> request adds the **one architectural fact the earlier round missed**:
> the flash loader executes entirely under RCFAST, and this is a load-
> bearing design choice, not an incidental performance footnote. The
> material here came directly from Chip's review of the theory-of-ops
> doc: he confirmed the doc inferred the streamer + smart-pin coordination
> correctly but did not grasp *why* it was set up at sysclk/2 — and that
> the same gap exists in P2KB.
>
> **What this document is not:** a request to take any code-level action
> in PNut-TS itself. The theory-of-ops doc has already been updated in
> three places (§3, §7.9, §10) to add the RCFAST architectural framing;
> this request mirrors those updates into P2KB.

---

## 0. TL;DR for the maintainer agent

* Edit **2 existing entries** to add the RCFAST architectural contract:
  - `p2kbArchSpiFlashBoot` — add `cog_clock` under `phase_2_post_load_state`.
  - `p2kbExampleFlashLoaderCaseStudy` — add one technique to the list.
* **Verify and possibly correct** the RCFAST upper-bound spec in
  `p2kbArchClockSystem` (current: "~20-25 MHz"; silicon designer cites
  20–30 MHz as the practical range).
* Optionally add a short clock-state note to `p2kbArchBootPatternSelection`
  noting that *all* ROM boot paths execute under RCFAST until user code
  takes over.
* Run the **discoverability tests** in §6 after the changes.

---

## 1. Why this request exists

While auditing the RCFAST architectural claim against P2KB, two halves of
the fact were found documented in *different* entries with **no connection
between them**:

| Entry | What it says | Connects RCFAST to flash loader? |
| --- | --- | --- |
| `p2kbArchClockSystem` | RCFAST is `boot_default: true`, "~20-25 MHz", ±10% over temperature | ❌ No |
| `p2kbArchSpiFlashBoot` | Describes ROM handoff, post-load SPI state, loader flow | ❌ Does not mention what clock the loader runs at |
| `p2kbArchBootRomContents` | Mentions "clock setup" abstractly only | ❌ No |
| `p2kbExampleFlashLoaderCaseStudy` | Lists 15 techniques | ❌ Not in the list |

A reader asking "what clock is the flash loader running at?" or "why does
this code work the same regardless of the user's `_clkfreq`?" must today
infer the answer by reading `boot_default: true` in the clock-system
entry and reasoning forward about its consequences. That is exactly the
gap Chip flagged in the companion theory-of-ops doc — and it has the
same root cause in P2KB.

The architectural fact, stated plainly:

> The flash loader executes entirely under RCFAST. The ROM does not
> switch clocks before `JMP #0`; the user's `_clkfreq` only takes effect
> after the loader's final `COGINIT` hands off to the user application.
> This makes the loader **clock-mode-agnostic** — same code, same fixed
> timing, regardless of what crystal/PLL configuration the user program
> ultimately selects. The SCK rate choice (sysclk/2 ≈ 10–15 MHz under
> RCFAST) sits comfortably below the W25Q128's 100+ MHz tolerance, so
> no retiming, PLL-stable wait, or upper-bound check on sysclk is
> required. The flash is always faster than the loader can talk; the
> loader is always slow enough to never overrun the flash.

This fact is currently nowhere in P2KB.

---

## 2. What P2KB already does well (preserve these)

The following entries from the earlier round of additions are accurate
and useful; the proposals below only *augment* them. Do not regress these:

| Key | Strength worth preserving |
| --- | --- |
| `p2kbArchSpiFlashBoot` | Clean two-phase walkthrough; `phase_2_post_load_state.bus_state` correctly captures the SPI-bus contract. The `authority:` block citing flash_loader.spin2 as GOLDEN is the right pattern. |
| `p2kbExampleFlashLoaderCaseStudy` | Concise technique catalog with one-line summaries + cross-refs. The "don't restate, link to canonical" rule is well applied. |
| `p2kbArchClockSystem` | RCFAST source block already states `boot_default: true`; this is the right place for the spec, the missing piece is reconciling the upper-bound number. |

---

## 3. What's missing (gaps to fix)

| Gap | Severity | Addressed by |
| --- | --- | --- |
| Cog clock state at flash-loader entry — entirely absent from boot entry | **High** | §5.1 (edit `p2kbArchSpiFlashBoot`) |
| Clock-mode-agnostic design as a flash-loader technique | High | §5.2 (edit `p2kbExampleFlashLoaderCaseStudy`) |
| RCFAST upper-bound discrepancy (P2KB: 20–25 MHz; designer: 20–30 MHz) | Medium | §5.3 (verify and possibly edit `p2kbArchClockSystem`) |
| ROM boot paths all run RCFAST until user code takes over — no cross-cutting note | Low | §5.4 (optional edit to `p2kbArchBootPatternSelection`) |

---

## 4. Cross-referencing strategy

The earlier request established the entries and cross-links. This request
*adds facts inside* those entries without introducing new keys, so no new
cross-reference matrix is needed — the existing links between
`p2kbArchSpiFlashBoot`, `p2kbExampleFlashLoaderCaseStudy`,
`p2kbArchClockSystem`, and the streamer/smart-pin entries already form
the right graph.

The one new cross-link worth adding is from `p2kbArchSpiFlashBoot` to
`p2kbArchClockSystem` (and back), so a reader landing on either entry
can navigate to the other when reasoning about boot-time clock state.

---

## 5. Change requests

Each request below is self-contained: target key, location within the
entry, and content draft. Numbering is stable so we can reference
requests in conversation.

---

### 5.1 EDIT — `p2kbArchSpiFlashBoot`

**What to add:** A `cog_clock` field under the existing
`phase_2_post_load_state` block, and a new cross-reference to
`p2kbArchClockSystem`.

**Insert location:** Append `cog_clock:` to the existing
`phase_2_post_load_state` block, after `bus_state:` and before
`benefit:`. Add `architecture/timing/clock-system.yaml` to the existing
`related:` list at the end of the entry.

**Rationale from source:**

* `flash_loader.spin2` line 12: source comment "Program/Boot performance
  using Winbond W25Q128 (RCFAST)" — confirms RCFAST is the operating
  regime, but as a performance footnote only.
* Chip Gracey's review of the theory-of-ops doc, 2026-05-25:
  > "RCFAST is at least 20MHz, but could be as high as 30MHz. We talk
  > to the SPI chip as fast as we can, because at 20-30MHz, we will
  > never be too fast for the SPI Flash. This way, we don't need to
  > accommodate any kind of external clocking, which might need
  > retiming, if it was too fast. It just always works fast,
  > regardless of the final clocking mode."
* `p2kbArchClockSystem` already documents `rcfast.boot_default: true`,
  so the ROM not switching clocks is consistent with that entry — but
  the implication for the flash loader is currently nowhere stated.

**Draft `cog_clock:` content (to insert into `phase_2_post_load_state`):**

```yaml
cog_clock:
  source: |
    RCFAST is active. The ROM does not switch clocks before JMP #0;
    the cog runs at the RCFAST rate (see architecture/timing/clock-system.yaml).
  frequency_range: |
    Approximately 20-30 MHz across process, voltage, and temperature
    (silicon designer's practical range; spec sheet gives a guaranteed
    minimum of 20 MHz). The flash loader is designed to operate
    correctly across this entire range without runtime adjustment.
  significance: |
    The flash loader executes its entire SPI dance under RCFAST. The
    user's _clkfreq only takes effect AFTER the loader's final
    COGINIT to the user application. This makes the loader
    "clock-mode-agnostic": identical code, identical timing, regardless
    of what crystal/PLL configuration the user program ultimately
    selects. The loader does not have to know.
  spi_rate_consequence: |
    Picking SCK = sysclk/2 in this regime gives SCK ≈ 10-15 MHz —
    comfortably below the W25Q128's 100+ MHz tolerance. The flash is
    always faster than the loader can talk; the loader is always slow
    enough to never overrun the flash. This is what allows the loader
    to avoid any runtime decision about clock rate, retiming, or
    PLL-stable wait. It "just works fast, regardless of the final
    clocking mode."
  custom_loader_caveat: |
    Custom flash loaders that wish to use a faster sysclk must issue
    HUBSET to switch clocks AND rebalance the streamer NCO / WXPIN
    pair to maintain bit-edge lockstep (see
    language/pasm2/concepts/streamer_smartpin_control.yaml). They must
    also reconsider the WAITX #3 alignment pad between WYPIN and XINIT,
    which is calibrated for the RCFAST sysclk/2 regime. The production
    loader avoids all of this by staying in RCFAST.
```

**Cross-references to add to `related:`:**

```yaml
related:
  # ... existing entries unchanged ...
  - architecture/timing/clock-system.yaml
```

---

### 5.2 EDIT — `p2kbExampleFlashLoaderCaseStudy`

**What to add:** A new entry in the `techniques_demonstrated:` list
calling out the RCFAST-locked, clock-mode-agnostic design.

**Insert location:** Append after the existing 15 techniques (i.e., as a
16th item). The new technique is architectural rather than
instruction-specific, so it could equally well lead the list — maintainer
agent's call on ordering.

**Draft entry:**

```yaml
- technique: "RCFAST-locked, clock-mode-agnostic SPI rate selection"
  lines: "all SPI setup paths (lines 100-107 programmer, 241-244 loader)"
  canonical: architecture/boot-rom/spi-flash-boot.yaml
  one_liner: |
    The loader runs entirely under RCFAST so its fixed timing
    constants (SETXFRQ $4000_0000, WXPIN #1, WAITX #3) work
    unchanged regardless of the user's final crystal/PLL config.
```

**No other changes needed** — the existing `related:` block already
links to `architecture/boot-rom/spi-flash-boot.yaml`, which §5.1 above
ensures will then cross-link to `architecture/timing/clock-system.yaml`.

---

### 5.3 VERIFY/EDIT — `p2kbArchClockSystem` (RCFAST upper-bound spec)

**What to verify:** The `rcfast.frequency` field currently says
"~20-25 MHz (process/temperature dependent)". Chip Gracey, the P2's
designer, cites the practical range as **20–30 MHz**. These two numbers
disagree by 5 MHz at the upper bound, which is non-trivial for anyone
budgeting timing margins.

**Rationale:** P2KB's stated sources are "Silicon Doc v35, P2 Datasheet,
pnut_ts Clock-Configuration-Usage-Guide.md". If those sources do indeed
give 25 MHz as the upper bound, the discrepancy may reflect a
characterization-vs-spec distinction (spec'd typical max vs. observed
practical max). If they give 30 MHz, the P2KB entry is stale.

**Suggested action:**

1. Verify against the latest silicon doc and the P2 datasheet what the
   stated RCFAST upper bound actually is.
2. If the silicon spec gives a single typical max (e.g., 25 MHz) but the
   guaranteed-minimum-and-observed-maximum range is broader, update the
   field to express both:

```yaml
rcfast:
  description: "Internal RC oscillator - fast mode"
  frequency: "20-30 MHz across process/voltage/temperature (typical ~24 MHz)"
  guaranteed_min: "20 MHz"
  practical_max: "~30 MHz (per silicon designer)"
  spec_typical: "~24 MHz at room temperature"
  stability: "Wide variation across process and temperature; not for precision timing"
  boot_default: true
```

3. If the silicon spec truly tops out at 25 MHz, leave the entry as-is
   and instead note in `p2kbArchSpiFlashBoot.phase_2_post_load_state.cog_clock`
   (§5.1 above) that the silicon designer reports observed units running
   as high as 30 MHz — and that the flash loader's SPI rate choice is
   defensive against the full practical range.

**Either way:** the flash-loader-side entry (§5.1) should cite "20-30 MHz"
because that is the range the loader is *designed to tolerate*, regardless
of which subset the silicon spec formally guarantees.

---

### 5.4 EDIT (optional, low priority) — `p2kbArchBootPatternSelection`

**What to add:** A one-paragraph "clock state during boot" cross-cutting
note that applies to *all* ROM boot paths (serial, SPI flash, SD card),
not just SPI flash boot.

**Rationale:** The fact that "ROM does not switch clocks before user code
runs" is not specific to flash boot — it applies equally to serial-loaded
programs and SD-loaded programs. The `p2kbArchBootPatternSelection` entry
is the natural place to call this out once, so the SD-card-boot and
serial-loader entries can link back rather than duplicate.

**Draft addition (location: as a top-level note after pattern enumeration):**

```yaml
boot_time_clock_state:
  description: |
    All ROM boot paths execute under RCFAST. The ROM Booter does not
    issue any HUBSET to change clock source before JMP'ing into loaded
    code. User _clkfreq only takes effect once user code itself does
    HUBSET (typically as the first action in the Spin2 runtime startup
    or in PASM2 user code).
  implication: |
    Boot-time code (flash loaders, serial download stubs, SD loaders)
    can rely on RCFAST timing without configuration. It also means
    that any timing-sensitive boot-time activity (SPI flash reads,
    serial baud detection) must be calibrated for the RCFAST range
    (~20-30 MHz), not for the user's eventual operating frequency.
  see_also:
    - architecture/timing/clock-system.yaml
    - architecture/boot-rom/spi-flash-boot.yaml
```

This is marked optional because it duplicates information that, with §5.1,
will already exist in the flash-boot entry. But surfacing it once at the
pattern-selection level prevents future SD-boot or serial-loader entries
from missing it.

---

## 6. Discoverability tests

After all changes are applied, the following P2KB queries should each
return results that mention the RCFAST architectural contract:

```
p2kb_find term:"rcfast"             → expect ≥ 3 hits (clock system, flash boot, case study)
p2kb_get query:"what clock does the flash loader run at"
    → resolves to p2kbArchSpiFlashBoot with cog_clock content surfaced
p2kb_get query:"why does the flash loader use sysclk/2 for SPI"
    → resolves to p2kbArchSpiFlashBoot or p2kbExampleFlashLoaderCaseStudy
p2kb_get query:"clock-mode-agnostic boot"
    → resolves to p2kbArchSpiFlashBoot
```

Today, `p2kb_find term:"rcfast"` returns **0 hits** — even though
`p2kbArchClockSystem` documents RCFAST extensively. This suggests the
clock-system entry may need an explicit `aliases:` or `search_keywords:`
block to surface under "rcfast" queries. The maintainer agent should
verify whether that's a separate indexing issue or a side-effect of how
the key/value mapping handles substring matches.

---

## 7. Cited source ranges

All proposals trace to specific lines of `src/ext/flash_loader.spin2`
(in the PNut-TS repo) or to Chip Gracey's review feedback. Line numbers
below are from the file as of 2026-05-25.

| Proposal | Source | Topic |
| --- | --- | --- |
| §5.1 — cog_clock contract | flash_loader.spin2 line 12; Chip's review 2026-05-25 | "RCFAST" performance footnote + designer's architectural rationale |
| §5.1 — SPI rate consequence | flash_loader.spin2 lines 100-107, 241-244, 246 | SETXFRQ $4000_0000 + WXPIN #1 lockstep at sysclk/2 |
| §5.1 — custom loader caveat | flash_loader.spin2 lines 258-261 | WAITX #3 alignment pad (calibrated for RCFAST regime) |
| §5.2 — 16th technique | flash_loader.spin2 source-wide | Technique applies across the entire file's SPI setup |
| §5.3 — RCFAST upper bound | Chip Gracey's review 2026-05-25 ("20-30MHz") vs. p2kbArchClockSystem (~20-25 MHz) | Spec discrepancy to verify |
| §5.4 — boot-time clock state | Architectural consequence of ROM design; not source-line-specific | Applies to all boot paths |

---

## 8. Out-of-scope (do not change in this request)

* **PNut-TS source code** is not touched by this request. PNut-TS only
  *contains* `flash_loader.spin2`; it does not consume P2KB at runtime.
* **The flash_loader.spin2 file itself** is authored by Chip Gracey and
  may not be modified casually. The theory-of-ops doc has already been
  updated to add the RCFAST framing; the source file's one-line RCFAST
  reference (line 12) could be expanded into a fuller comment block in
  a future upstream revision, but that is not part of this request.
* **Detailed serial-download or SD-card boot clock behavior** beyond the
  cross-cutting note in §5.4. Those paths almost certainly also run
  RCFAST until user code takes over, but confirming and documenting them
  in full belongs to a separate request once those entries are themselves
  fleshed out.

---

## 9. Acceptance criteria

This update request is complete when:

1. `p2kbArchSpiFlashBoot.phase_2_post_load_state.cog_clock` exists and
   contains at minimum the facts in §5.1 (source = RCFAST, frequency
   range, significance, SPI rate consequence, custom-loader caveat).
2. `p2kbArchSpiFlashBoot.related` includes a link to
   `architecture/timing/clock-system.yaml`.
3. `p2kbExampleFlashLoaderCaseStudy.techniques_demonstrated` includes
   the RCFAST-locked / clock-mode-agnostic technique (§5.2).
4. The RCFAST upper-bound discrepancy is resolved one of two ways:
   either `p2kbArchClockSystem` is updated to cite 20-30 MHz with
   appropriate sourcing, or the flash-boot entry explicitly notes the
   silicon designer's wider observed range while the clock-system entry
   retains the spec-typical figure (§5.3).
5. `p2kb_find term:"rcfast"` returns ≥ 1 result (which it does not
   today, despite extensive RCFAST coverage in `p2kbArchClockSystem` —
   §6 indexing note).
6. The natural-language queries in §6 resolve to the updated entries.

---

## 10. Companion reading

* `DOCs/internals/Flash-Loader-Theory-of-Operations.md` — the
  theory-of-operations write-up. **§3 item 5, §7.9, and §10 of that
  document were updated 2026-05-25** to add the RCFAST architectural
  framing that motivated this request; those three sections are the
  long-form versions of the facts proposed here.
* `DOCs/internals/Flash-Loader-P2KB-Update-Request.md` — the original
  P2KB update request (the structural additions of `p2kbArchSpiFlashBoot`
  and `p2kbExampleFlashLoaderCaseStudy`). This request is a follow-up
  that adds one architectural fact those entries do not yet carry.
* `src/ext/flash_loader.spin2` — the source artifact itself.
