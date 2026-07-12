# P2KB Update Request — Flash Loader & Boot ROM Coverage

> **For:** the P2KB maintainer agent.
> **From:** PNut-TS internals study, 2026-05-23.
> **Source artifact:** `src/ext/flash_loader.spin2` in the PNut-TS repo,
> authored by Chip Gracey (Parallax). The full theory-of-operations write-up
> based on that study is at
> `DOCs/internals/Flash-Loader-Theory-of-Operations.md` and should be read
> alongside this request — it's the evidence behind every proposal here.
>
> **What this document is:** a complete, actionable spec for additions and
> edits to the Propeller 2 Knowledge Base (P2KB) so that future LLM and
> human queries about P2 SPI flash booting, the ROM boot protocol, the
> streamer + smart-pin coordination pattern, and several under-documented
> instruction behaviors will surface the right material. Every proposal
> below cites the line in `flash_loader.spin2` that motivates it.
>
> **What this document is not:** a request to take any code-level action in
> PNut-TS itself. PNut-TS is unaffected by these changes; only the P2KB
> content is.

---

## 0. TL;DR for the maintainer agent

* Add **2 new entries** (boot ROM protocol; flash loader case study).
* Edit **7 existing entries** to add missing facts, idioms, or cross-links.
* Add **1 new compendium entry** (PASM2 idioms) — optional but high-value.
* Apply a **cross-reference matrix** (§4) so the new and existing entries
  link bidirectionally.
* Run the **discoverability tests** in §6 after the changes; they should
  all return non-zero results.

---

## 1. Why this request exists

While documenting `src/ext/flash_loader.spin2` for the PNut-TS internals
folder, the following discoverability gaps surfaced in P2KB:

```
p2kb_find term:"flash"          → 0 hits
p2kb_find term:"boot"           → 0 hits
p2kb_find term:"prop checksum"  → 0 hits
p2kb_find term:"boot rom"       → 0 hits (implied by above)
```

…yet `flash_loader.spin2` is **already cited as the source for examples in
five existing P2KB entries** (`p2kbPasm2Xinit`, `p2kbPasm2Rdfast`,
`p2kbPasm2StreamerSmartpinControl`, `p2kbPasm2SetqBlockOps`,
`p2kbArchSpiImplementationGuide`). The file is one of the most
information-dense pieces of P2 code in existence — touching the streamer,
smart pins, FIFO, hub block transfers, self-modifying code, cog boot, and
the ROM boot protocol — but there is no top-level place in P2KB where a
reader can land and learn about it as a system.

This request fixes that.

---

## 2. What P2KB already does well (preserve these)

The following entries are accurate and useful; the proposals below only
*augment* them. Do not regress these:

| Key | Strength worth preserving |
| --- | --- |
| `p2kbArchSpiImplementationGuide` | Excellent overall SPI-via-smart-pin walkthrough; the "pin joining (P_PLUS1_B)" critical-mistake callout is exactly the right pedagogical tone. |
| `p2kbPasm2StreamerSmartpinControl` | Already notes "Smart Pins MUST start (DIRH) before XINIT". The streamer-output-hierarchy paragraph about TT=%x1 overriding OUT is gold. |
| `p2kbPasm2Xinit` | Correctly extracts the `xinit/wypin/waitxfi` pattern with three flash_loader.spin2 examples. |
| `p2kbPasm2Setxfrq` | NCO formula + common-values table is clear; this is the model for how to document magic constants. |
| `p2kbPasm2SetqBlockOps` | The `flash_loader_buffers` example correctly shows the SETQ + RDLONG pattern. |

---

## 3. What's missing (gaps to fix)

| Gap | Severity | Addressed by |
| --- | --- | --- |
| Boot ROM SPI flash protocol — entirely absent | **Critical** | §5.1 (new entry) |
| Flash loader as a canonical case study — absent | High | §5.2 (new entry) |
| `HUBSET #%0010` as a deliberate halt mechanism | High | §5.3 (edit `Hubset`) |
| Streamer block-size ceiling (2047 longs / 65504 bits) | Medium | §5.4 (edit `Xinit`) |
| Streamer input direction needs WRFAST, output needs RDFAST — no cross-link | Medium | §5.5 (edit both) |
| Bit/edge lockstep rule between SETXFRQ and SCK smart pin | Medium | §5.6 (edit `StreamerSmartpinControl`) |
| `ADDPINS` operator encoding and pin-range effect on pin ops | Medium | §5.7 (edit `ADDPINS`) |
| `GETPTR` "size of just-downloaded data" idiom | Low | §5.8 (edit `Getptr`) |
| `WAITX #3` style streamer↔smart-pin alignment | Medium | covered in §5.6 |
| No PASM2-idioms compendium for patterns like SETD/SETS self-modify, dead-on-arrival scratch longs, DJNF vs DJNZ | Medium | §5.9 (new entry, optional) |

---

## 4. Cross-referencing strategy

P2KB's current discoverability has two layers:

1. **Key name** — what `p2kb_find term:"X"` matches against.
2. **`aliases:` and `search_keywords:` blocks** — already used by
   `p2kbArchSpiImplementationGuide`. These are the right mechanism for
   surfacing entries under synonyms.

### Rule to apply consistently

Any entry that *cites* `flash_loader.spin2` or covers a topic that the
flash loader exercises should include in its frontmatter:

```yaml
aliases:
  - "flash boot"          # if applicable
  - "flash loader"
  - "boot rom"            # if applicable
search_keywords:
  - flash
  - boot
  - loader
  - SPI flash
  - W25Q128
related_entries:
  - p2kbArchBootRomSpiFlash       # new, see §5.1
  - p2kbExampleFlashLoaderCaseStudy   # new, see §5.2
```

This way `p2kb_find term:"flash"` and `term:"boot"` will both surface a
ranked list of entries by relevance — none returning 0 today.

### Bidirectional linking matrix

For every entry below that gets a new `related_entries:` link added, the
*target* entry must also link back. I list the full matrix in §5.10.

---

## 5. Change requests

Each request below is self-contained: key name, category, suggested
frontmatter, content draft, and required cross-references. Numbering is
stable so we can reference requests in conversation.

---

### 5.1 NEW — `p2kbArchBootRomSpiFlash`

**Category:** `architecture_core` (new sub-area: "boot")

**Status:** This is the most important missing piece. No P2KB entry today
covers the P2 silicon's ROM-level boot behavior.

**Rationale from source:** Lines 209–225 of `flash_loader.spin2` describe
the ROM contract verbatim:

> "The ROM booter reads this code from the 8-pin SPI flash from
> $000000..$0003FF, into cog registers $000..$0FF. If the booter verifies
> the 'Prop' checksum, it does a 'JMP #0' to execute this loader code."
> "On entry, both spi_cs and spi_ck are low outputs and the flash is
> outputting bit 7 of the byte at address $400 on spi_do."

These facts are foundational and currently nowhere in P2KB.

**Suggested frontmatter:**

```yaml
concept: boot_rom_spi_flash
title: P2 Boot ROM — SPI Flash Boot Protocol
category: architecture_boot
aliases:
  - boot
  - boot rom
  - flash boot
  - SPI flash boot
  - Prop checksum
  - boot protocol
search_keywords:
  - flash
  - boot
  - ROM
  - SPI flash
  - W25Q128
  - "Prop"
  - cold boot
  - power-up
related_entries:
  - p2kbExampleFlashLoaderCaseStudy
  - p2kbArchSpiImplementationGuide
  - p2kbPasm2Coginit
  - p2kbPasm2Hubset
```

**Suggested content (draft, agent may polish):**

```yaml
overview: |
  When a P2 powers up with no serial download in progress, its
  internal ROM autoprobes for an SPI flash on the fixed pin assignment
  spi_cs=61, spi_ck=60, spi_di=59, spi_do=58. If a recognized flash
  responds, the ROM loads the first 1 KB (256 longs) of flash content
  into cog 0 register space $000..$0FF and verifies a four-byte
  "Prop" checksum before executing it.

fixed_pin_assignment:
  spi_cs: 61    # chip select (P2 → flash)
  spi_ck: 60    # clock (P2 → flash)
  spi_di: 59    # data into flash (P2 → flash, flash's "SI")
  spi_do: 58    # data out of flash (P2 ← flash, flash's "SO")
  note: |
    These are baked into the silicon. Boards must wire the SPI flash
    here for boot-from-flash to work.

boot_sequence:
  - "ROM issues SPI READ command at flash address $000000."
  - "ROM clocks out 256 longs (1024 bytes) into cog 0 RAM $000..$0FF."
  - "ROM sums all 256 longs as 32-bit values."
  - "If sum == %\"Prop\" (= $706F7250), ROM does JMP #0."
  - "Otherwise the chip stalls; no code executes."

prop_checksum:
  required_sum: '%"Prop"'    # ASCII "Prop" interpreted as little-endian long
  numeric_value: "$706F7250"
  responsibility: |
    The program that writes the flash is responsible for inserting a
    correction long that makes the sum come out exactly. See
    flash_loader.spin2 `loader_sum` for the canonical technique
    (`loader_sum = "Prop" - sum_of_first_256_longs`).

post_load_state:
  description: |
    The state of the SPI bus when the ROM hands control to user code
    at cog $0 is non-obvious and exploitable.
  facts:
    - spi_cs: "low output (asserted; ROM did not deselect)"
    - spi_ck: "low output (parked between edges)"
    - spi_di: "irrelevant on output side"
    - spi_do: |
        flash is mid-stream, currently presenting bit 7 of the byte
        at flash address $400. User code can continue the read simply
        by cycling spi_ck — no new READ command is needed.
  importance: |
    flash_loader.spin2 exploits this by NOT re-issuing a flash command
    when it needs additional application bytes from $400+. It just
    starts toggling spi_ck and capturing bits with the streamer. This
    saves dozens of bytes of code and cuts boot latency.

what_lives_at_flash_$000_$3FF:
  description: |
    The 1 KB ROM-loaded region is by convention used for a flash
    "loader" program (see p2kbExampleFlashLoaderCaseStudy). The loader
    is the code that copies the rest of the user application from
    flash to hub and jumps to it. The application can start anywhere
    after the loader's code; small applications can ride entirely
    inside the 1 KB ROM-loaded region.

related_topics:
  - Serial download (non-flash boot path) — pending P2KB coverage
  - Clock configuration at boot (HUBSET) — see p2kbPasm2Hubset
```

**Bidirectional cross-references to add elsewhere:** see §5.10.

---

### 5.2 NEW — `p2kbExampleFlashLoaderCaseStudy`

**Category:** Probably a new category `examples_flash` or reuse `examples_*`
sibling style. Use whatever pattern matches the existing
`p2kbExampleSmartPins001BasicIo` family.

**Rationale:** The flash loader is a single ~300-line file that exercises
seven distinct P2 subsystems at once. It deserves a top-level case-study
entry the way `p2kbExampleSmartPins001BasicIo` does for smart pins.

**Suggested frontmatter:**

```yaml
concept: flash_loader_case_study
title: Flash Loader (flash_loader.spin2) — Annotated Case Study
category: examples_flash
aliases:
  - flash loader
  - flash_loader.spin2
  - flash programmer
  - boot loader
  - SPI flash loader
search_keywords:
  - flash loader
  - flash programmer
  - SPI flash boot
  - streamer SPI
  - smart pin SPI
related_entries:
  - p2kbArchBootRomSpiFlash
  - p2kbArchSpiImplementationGuide
  - p2kbPasm2StreamerSmartpinControl
  - p2kbPasm2Xinit
  - p2kbPasm2Rdfast
  - p2kbPasm2Wrfast
  - p2kbPasm2Hubset
  - p2kbPasm2RepInstruction
  - p2kbArchSmartPin00101TransitionOutput
  - p2kbPasm2SetqBlockOps
```

**Suggested content:** an abbreviated version of
`DOCs/internals/Flash-Loader-Theory-of-Operations.md` from the PNut-TS
repo. Sections to lift from that document (already prose; the maintainer
agent can adapt to P2KB house style):

1. **Two halves overview** — programmer (one-shot) vs loader (every boot).
2. **The cog image layout** — 256 longs partitioned across programmer code,
   loader code, data words, and the first slice of user application.
3. **Streamer + smart-pin as 2-channel DMA** — the central technique.
4. **The `zero` aliased-scratch pattern** — dead-on-arrival data words as
   checksum accumulators.
5. **Self-modifying erase strategy** — SETD/SETS on `.cmd` and `.tst` for
   4 KB vs 64 KB erase.
6. **The "Prop" checksum patch trick** — `loader_sum = "Prop" - sum`.
7. **The fail-safe halt** — `FLTL D ADDPINS 2` + `HUBSET #%0010`.
8. **Mid-stream flash hand-off** — exploiting the ROM's post-load state.

Each section should cite the source line numbers from `flash_loader.spin2`.

---

### 5.3 EDIT — `p2kbPasm2Hubset`

**What to add:** A `halt_technique` section documenting the
`HUBSET #%0010` idiom.

**Insert location:** After the existing `clock_configuration` block,
before `safe_clock_switching`.

**Draft content:**

```yaml
halt_technique:
  description: |
    Writing HUBSET with the clock-source bits set to %10 (XI = external
    crystal/oscillator pin) on a board where no external clock signal
    is present effectively halts the system clock until the next chip
    reset. The cog stalls instantly; no further instructions execute.
  code: |
    HUBSET #%0010    ' switch to XI source; if XI is dead, chip halts
  uses:
    - "Checksum-fail fault response in flash boot code"
    - "Tamper-detection: stop the chip dead if integrity check fails"
    - "Guaranteed-no-code-runs branch when something is fundamentally wrong"
  source_example: flash_loader.spin2 line 276 (the `stop` label)
  caveats:
    - "Requires hardware reset to recover (no software-issued recovery path exists)."
    - "If a working external clock IS present on XI, the chip will keep running on that — NOT a halt."
    - "Pair with FLTL on outputs (see ADDPINS) to also tri-state pins before halting."
```

**Cross-references to add:**

```yaml
related_entries:
  - p2kbArchBootRomSpiFlash
  - p2kbExampleFlashLoaderCaseStudy
```

---

### 5.4 EDIT — `p2kbPasm2Xinit`

**What to add:** A `max_block_size` note in the `notes:` section, plus a
new pattern called `large_transfer_chunking`.

**Rationale from source:** Line 250 of `flash_loader.spin2` reads
`bmask x,#10` (= $7FF = 2047 longs) just before any XINIT-driven streaming
operation. This number reflects the streamer's transfer-count field
limit, which is currently undocumented.

**Draft addition to `notes:`:**

```yaml
notes:
  - "XINIT zeros the phase accumulator, starting fresh"
  - "Streamer and smart pins can work in parallel for maximum efficiency"
  - "Mode word in D configures transfer direction, pin count, and data format"
  - "Source in S typically contains data or hub address"
  - "Maximum block per XINIT for bit-counted streaming: 2047 longs (65504 bits). The streamer's count field is 16 bits, so transfers in bit-granularity modes must satisfy `longs * 32 < 65536`. For larger payloads, loop with successive XINIT calls — see `flash_loader.spin2` lines 250-261 for the canonical chunking pattern."
```

**New pattern to add to `patterns:`:**

```yaml
patterns:
  - name: Large-transfer chunking
    description: |
      For streamer transfers larger than 2047 longs, divide and conquer
      by reissuing XINIT in a loop. The hub FIFO is already configured
      from a single RDFAST/WRFAST; only the streamer count needs to be
      reissued each iteration.
    implementation: |
      ' Drain `count` longs from FIFO to a streamer-paced output pin
      .block      bmask   x, #10              ' x = $7FF = 2047 longs cap
                  fle     x, count            ' clamp to remaining
                  sub     count, x
                  shl     x, #5               ' convert to bit count
                  setword mode, x, #0         ' patch into streamer mode
                  shl     x, #1               ' edges = 2 * bits
                  wypin   x, #clk_pin         ' kick the SCK smart pin
                  waitx   #3                  ' alignment pad — see §5.6
                  xinit   mode, #0
                  waitxfi
                  tjnz    count, #.block
    source: flash_loader.spin2 lines 250-261
```

**Cross-references to add:**

```yaml
related_entries:
  - p2kbExampleFlashLoaderCaseStudy
  - p2kbArchBootRomSpiFlash
```

---

### 5.5 EDIT — `p2kbPasm2Rdfast` AND `p2kbPasm2Wrfast`

**What to add:** A short, parallel "streamer direction pairing" note on
both entries that cross-links them.

**Rationale from source:**

* `flash_loader.spin2` line 109 uses `rdfast #0,#@loader` immediately
  before configuring an output streamer that pushes bytes from hub to
  `spi_di`.
* Line 248 uses `wrfast #0, ##$400-app_start*4` immediately before
  configuring an input streamer that captures bits from `spi_do` to hub.

This pairing — RDFAST before output, WRFAST before input — is currently
not stated explicitly anywhere in P2KB. Readers often expect the
opposite based on the verb names.

**Draft note for `p2kbPasm2Rdfast`:**

```yaml
streamer_pairing:
  rule: |
    Use RDFAST before any streamer command that moves data from hub
    memory OUT to pins (e.g., X_RFBYTE_* modes, X_RFLONG_*). The FIFO
    pre-fetches hub data for the streamer to consume.
  paired_with: p2kbPasm2Wrfast
  example_source: "flash_loader.spin2 line 109"
```

**Draft note for `p2kbPasm2Wrfast`:**

```yaml
streamer_pairing:
  rule: |
    Use WRFAST before any streamer command that captures pin data
    INTO hub memory (e.g., X_*_WFBYTE, X_*_WFLONG modes). The FIFO
    sinks streamer output into hub.
  paired_with: p2kbPasm2Rdfast
  example_source: "flash_loader.spin2 line 248"
  common_confusion: |
    The verb "WRFAST" sounds like it should be paired with hub-write
    operations, and "RDFAST" with hub-read. From the streamer's
    perspective that's true, but from the cog code's perspective the
    direction is opposite: RDFAST configures the FIFO so the streamer
    can READ from hub (and write to pins); WRFAST configures the FIFO
    so the streamer can WRITE to hub (after reading from pins).
```

---

### 5.6 EDIT — `p2kbPasm2StreamerSmartpinControl`

**What to add:** Two new subsections under the existing `coordination:`
section: a `bit_edge_lockstep` rule and an `alignment_pad` rule.

**Rationale from source:**

* Lines 100-107 of `flash_loader.spin2` set `WXPIN #1` and
  `SETXFRQ @clk2/4` (where `clk2 = $4000_0000`). The relationship
  `wxpin_value * 2 == 2^32 / setxfrq_value` is what keeps SCK and the
  streamer in lockstep at sysclk/2.
* Line 259 uses `waitx #3` between `wypin x,#spi_ck` and `xinit wmode,#0`.
  This is a deliberate alignment of the streamer's first sample to the
  middle of the first SPI data bit.

Neither of these timing relationships is documented today.

**Draft `bit_edge_lockstep` section:**

```yaml
bit_edge_lockstep:
  rule: |
    When pairing a P_TRANSITION smart pin (clock) with a streamer
    (data), the rates must satisfy:
      bits_per_streamer_clk = 2^32 / SETXFRQ_value
      sysclks_per_SCK_edge  = WXPIN_value
      one streamer bit must equal one full SCK cycle (two edges)
    Therefore:
      SETXFRQ = $4000_0000 (= sysclk/2)  AND  WXPIN = 1
      → 1 bit per 2 sysclks, 1 SCK cycle per 2 sysclks. Lockstep.
    Halving the SCK rate (WXPIN = 2) MUST be matched by halving the
    streamer NCO (SETXFRQ = $2000_0000), or bits will be silently
    dropped or duplicated.
  worked_example: |
    ' sysclk/2 SPI (max-rate single-bit SPI)
    setxfrq ##$4000_0000     ' streamer: 1 bit per 2 sysclks
    wxpin   #1, #SCK_PIN     ' smart pin: 1 sysclk between SCK edges
    
    ' sysclk/4 SPI (half-rate)
    setxfrq ##$2000_0000     ' streamer: 1 bit per 4 sysclks
    wxpin   #2, #SCK_PIN     ' smart pin: 2 sysclks between SCK edges
  source: flash_loader.spin2 lines 100-107, 246
```

**Draft `alignment_pad` section:**

```yaml
alignment_pad:
  rule: |
    When the streamer SAMPLES an input pin (e.g., MISO/spi_do) that is
    driven by a remote device clocked by our P_TRANSITION smart pin,
    a 3-clock WAITX between starting the clock and starting the
    streamer aligns the streamer's first sample with the middle of
    the first valid bit on the input.
  why_3_clocks: |
    WYPIN takes 2 clocks to take effect on the smart pin; XINIT also
    takes 2 clocks to engage the streamer. The 3-clock WAITX pads
    the pipeline so the streamer's first read happens AFTER the
    flash has presented a fresh bit on the falling SCK edge.
  code: |
    wypin   bit_count_doubled, #SCK_PIN  ' start SCK transitions
    waitx   #3                           ' pipeline alignment pad
    xinit   input_streamer_mode, #0      ' streamer begins sampling
    waitxfi
  caveat: |
    This value is rate-dependent. It is correct for the SCK rate and
    NCO setup in §bit_edge_lockstep. Different SCK rates may need
    different pad values; verify with a logic analyzer if you change
    either WXPIN or SETXFRQ.
  source: flash_loader.spin2 line 259
```

**Cross-references to add:**

```yaml
related_entries:
  - p2kbExampleFlashLoaderCaseStudy
  - p2kbArchBootRomSpiFlash
```

---

### 5.7 EDIT — `p2kbSpin2OpOpADDPINS`

**Current state:** One-line stub.

**What to add:** Encoding, semantics for pin operations, worked example.

**Rationale from source:** Line 275 of `flash_loader.spin2` uses
`fltl #spi_di addpins 2` to float THREE pins (spi_di, spi_ck, spi_cs) in
a single instruction. The mechanism — `ADDPINS` packs a count into bits
[10:6] of the destination operand and `FLTL/DRVH/DRVL/DIRH/DIRL` apply to
`count+1` contiguous pins — deserves explicit documentation.

**Suggested replacement content:**

```yaml
operator: "ADDPINS"
type: operator
category: Pin
description: |
  Encodes a pin-range count into a pin operand for use with pin
  instructions that accept ranges (FLTL, FLTH, DRVH, DRVL, DIRH, DIRL,
  OUTH, OUTL, etc.). The result is a 9- or 11-bit operand value where
  bits [5:0] are the base pin number and bits [10:6] (5 bits) are the
  additional-pin count.

encoding:
  formula: "base_pin + count<<6"
  base_pin_bits: "[5:0]"
  count_bits:    "[10:6]  (range 0-31, meaning '0 extra pins' to '31 extra pins')"
  pins_affected: "count + 1 contiguous pins starting at base_pin"

examples:
  - code: |
      FLTL #spi_di ADDPINS 2     ' float pins 59, 60, 61 (= di, ck, cs)
    description: |
      Floats three contiguous pins in one instruction. spi_di is pin 59,
      "ADDPINS 2" means base+0, base+1, base+2 → pins 59, 60, 61.
    source: flash_loader.spin2 line 275

  - code: |
      DRVH #LED_BASE ADDPINS 7   ' drive 8 LEDs high
    description: |
      Drive 8 contiguous pins high. ADDPINS 7 means base + up to 7
      more pins, total 8 pins.

constraints:
  - "Range cannot cross a 32-pin port boundary (wraps within the same group of 32)."
  - "9-bit immediate operand limits ADDPINS to 7. Use ##base ADDPINS N for ranges 8-31 (compiler emits AUGD)."
  - "Counting is inclusive: ADDPINS N affects N+1 pins."

related:
  - p2kbPasm2Fltl
  - p2kbPasm2Drvh
  - p2kbPasm2Drvl
  - p2kbPasm2Dirh
  - p2kbPasm2Dirl
  - p2kbExampleFlashLoaderCaseStudy

search_keywords:
  - addpins
  - pin range
  - multi-pin
  - pin group
  - float pins
```

---

### 5.8 EDIT — `p2kbPasm2Getptr`

**What to add:** A short "common usage" note about its role at the end of
a serial download.

**Rationale from source:** Line 50 of `flash_loader.spin2`:

```pasm
            getptr  s    ' get size of download in bytes
```

This is a tight, well-known idiom in PNut-loaded code: after the PNut
serial downloader hands control to the user image, the FIFO write pointer
sits at the end of the just-downloaded data. So `GETPTR` *is* "how many
bytes did I just receive?"

**Draft `common_usage:` section:**

```yaml
common_usage:
  download_size_idiom:
    description: |
      When user code begins executing immediately after a PNut serial
      download, the hub FIFO write pointer is positioned at the byte
      just past the last byte received. GETPTR returns that pointer,
      which equals the byte size of the just-downloaded image.
    code: |
      getptr  size_in_bytes      ' bytes downloaded
      shr     size_in_bytes, #2  ' convert to longs
    source: flash_loader.spin2 line 50
    note: |
      This relies on the PNut download protocol's exit state and is
      idiomatic for one-shot loader programs. It does not apply
      generally — only at the very start of a serial-downloaded
      program before any RDFAST/WRFAST has been issued.
```

---

### 5.9 NEW (optional but high-value) — `p2kbPasm2Idioms`

**Category:** New — `pasm2_idioms` or place under `pasm2_misc`.

**Status:** This is a *compendium* entry. The flash loader is so dense in
idioms that breaking them out into a "common PASM2 patterns" reference
would benefit any LLM trying to generate idiomatic P2 code.

**Suggested frontmatter:**

```yaml
concept: pasm2_idioms
title: PASM2 Idioms — Common Patterns That Aren't In The Instruction Set
category: pasm2_idioms
aliases:
  - PASM2 patterns
  - common patterns
  - PASM2 tricks
search_keywords:
  - idiom
  - pattern
  - self-modify
  - scratch
  - dead-on-arrival
  - SETD SETS
  - DJNF
related_entries:
  - p2kbPasm2RepInstruction
  - p2kbPasm2Setd
  - p2kbPasm2Sets
  - p2kbPasm2Djnf
  - p2kbPasm2Djnz
  - p2kbExampleFlashLoaderCaseStudy
```

**Idioms to include (with `flash_loader.spin2` source citations):**

1. **Dead-on-arrival scratch longs.** A data word that is guaranteed zero
   on entry and will be *overwritten* before its real use is free
   accumulator storage in the meantime. Example: `zeroa`/`zerob`/`zeroc`
   in `flash_loader.spin2` lines 286-291.

2. **Self-modifying inner loops via `SETD` / `SETS`.** When a tight loop
   would otherwise need a branch to switch between two opcode variants,
   patch the instruction's D or S field once per outer iteration.
   Example: `flash_loader.spin2` lines 115-116, where the erase opcode
   and the boundary mask are patched for 4 KB vs 64 KB strategy.

3. **`DJNF` for "at least once, then while not full".** `DJNZ`
   pre-decrements and exits at zero — bad when starting count is zero.
   `DJNF` post-decrements and exits on underflow — handles zero-start
   correctly. Example: `flash_loader.spin2` line 152.

4. **`REP` for zero-overhead checksum/copy loops.** Two-instruction body
   wrapped in `REP #2, count` is the canonical "tight inner loop" in
   PASM2. Example: `flash_loader.spin2` lines 58-59 (checksum).

5. **`SETQ` / `SETQ2` block transfers as memcpy substitute.** Pair with
   `RDLONG`/`WRLONG` for up to 512 longs of one-shot transfer. Example:
   `flash_loader.spin2` lines 148-151 (the `.move` loop transfers 512
   longs per iteration via LUT staging).

6. **The aliased-pin-range trick.** `FLTL D ADDPINS N` floats N+1
   contiguous pins in one instruction. Example: `flash_loader.spin2`
   line 275 (floats spi_di/ck/cs together).

---

### 5.10 Cross-reference matrix (apply bidirectionally)

For every (A → B) link below, ensure B also lists A under `related_entries:`.

```
p2kbArchBootRomSpiFlash       ⇄ p2kbExampleFlashLoaderCaseStudy
p2kbArchBootRomSpiFlash       ⇄ p2kbArchSpiImplementationGuide
p2kbArchBootRomSpiFlash       ⇄ p2kbPasm2Coginit
p2kbArchBootRomSpiFlash       ⇄ p2kbPasm2Hubset

p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2StreamerSmartpinControl
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2Xinit
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2Rdfast
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2Wrfast
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2Hubset
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2RepInstruction
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbArchSmartPin00101TransitionOutput
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2SetqBlockOps
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2Getptr
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbSpin2OpOpADDPINS
p2kbExampleFlashLoaderCaseStudy ⇄ p2kbPasm2Idioms     # if §5.9 adopted

p2kbPasm2Rdfast               ⇄ p2kbPasm2Wrfast        (already related — make explicit)

p2kbPasm2Hubset               ⇄ p2kbArchBootRomSpiFlash  (already above)
```

---

## 6. Discoverability tests

After all changes are applied, the following P2KB queries should each
return at least one relevant result. They all return 0 today.

```
p2kb_find term:"flash"            → expect ≥ 2 (case study + boot ROM)
p2kb_find term:"boot"             → expect ≥ 2
p2kb_find term:"boot rom"         → expect ≥ 1
p2kb_find term:"prop checksum"    → expect ≥ 1
p2kb_find term:"flash loader"     → expect ≥ 1
p2kb_find term:"halt"             → expect Hubset entry surfaced
p2kb_find term:"addpins"          → expect expanded ADDPINS entry surfaced
p2kb_find term:"chunking"         → expect Xinit entry surfaced
```

Additionally, these natural-language `p2kb_get` queries should resolve
without ambiguity to the new entries:

```
p2kb_get query:"how does P2 boot from SPI flash"
    → p2kbArchBootRomSpiFlash

p2kb_get query:"flash loader"
    → p2kbExampleFlashLoaderCaseStudy

p2kb_get query:"halt the P2 chip from software"
    → p2kbPasm2Hubset  (halt_technique section)

p2kb_get query:"float multiple pins at once"
    → p2kbSpin2OpOpADDPINS  (or p2kbPasm2Fltl with cross-link)
```

---

## 7. Cited source ranges

All proposals trace to specific lines of `src/ext/flash_loader.spin2`
(in the PNut-TS repo). The line numbers below are from the file as of
2026-05-23.

| Proposal | Source lines | Topic |
| --- | --- | --- |
| §5.1 — Boot ROM entry | 209–225 | ROM contract narrated in source comment |
| §5.1 — fixed pin assignment | 27–30 | CON block |
| §5.1 — post-load state | 217–219, 232 (loader entry) | "spi_cs/spi_ck low, flash mid-stream" |
| §5.2 — case study | full file | All sections |
| §5.3 — HUBSET halt | 275–276 | `if_nz hubset #%0010` fault response |
| §5.4 — XINIT max block | 250 | `bmask x,#10` → $7FF cap |
| §5.5 — RDFAST/WRFAST direction | 109 (RDFAST→output), 248 (WRFAST→input) | streamer direction pairing |
| §5.6 — bit/edge lockstep | 100–107, 246 | SETXFRQ + WXPIN lockstep |
| §5.6 — alignment pad | 258–261 | `wypin / waitx #3 / xinit` sequence |
| §5.7 — ADDPINS encoding | 275 | `fltl #spi_di addpins 2` floats 3 pins |
| §5.8 — GETPTR idiom | 50 | `getptr s` at top of programmer |
| §5.9 — dead-on-arrival scratch | 60, 78, 84, 286–291 | `@zeroa/4`, `@zerob/4`, `@zeroc/4` |
| §5.9 — SETD/SETS self-modify | 114–116 | erase strategy switch |
| §5.9 — DJNF | 152 | `djnf t,#.move` |
| §5.9 — REP body | 58–59, 76–77, 82–83 | checksum/sum loops |
| §5.9 — SETQ/SETQ2 transfer | 148–151 | hub→LUT→hub memcpy |

---

## 8. Out-of-scope (do not change in this request)

* **PNut-TS source code** is not touched by this request. PNut-TS only
  *contains* `flash_loader.spin2`; it does not consume P2KB at runtime.
* **The flash_loader.spin2 file itself** is authored by Chip Gracey and
  may not be modified casually. If a P2KB entry needs a line of source
  rephrased, paraphrase in the P2KB entry rather than requesting an
  edit upstream.
* **Other ROM features** (e.g., serial download protocol details, USB
  boot, SD card boot) are out of scope for this batch. They deserve
  their own future entries but are not covered by the source artifact
  studied here.

---

## 9. Acceptance criteria

This update request is complete when:

1. All entries listed in §5 exist and contain at minimum the content
   sketched here (the maintainer agent may improve wording and add
   examples but must not omit the facts).
2. All bidirectional links in §5.10 resolve in both directions.
3. All eight `p2kb_find` queries in §6 return ≥ 1 result.
4. All four `p2kb_get` natural-language queries in §6 resolve
   unambiguously to the new entries.
5. `p2kb_version` reflects an updated index timestamp.

---

## 10. Companion reading

* `DOCs/internals/Flash-Loader-Theory-of-Operations.md` — the full
  theory-of-operations write-up that motivated this request. Read this
  for narrative context and additional architectural notes (sections 7.1
  through 7.10 of that doc, in particular, are the long-form versions of
  the idioms summarized here).
* `src/ext/flash_loader.spin2` — the source artifact itself.
