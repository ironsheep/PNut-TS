# P2KB Gap Report — SETQ vs SETQ2 as the XBYTE mode control

> **For:** the P2 Knowledge Base maintainer / P2KB agent
> **From:** Spin2 interpreter v55 Theory-of-Operations review
> **Authority:** the corrected behavior below was stated directly by **Chip
> Gracey** (P2 silicon designer) and cross-checked against
> `src/ext/Spin2_interpreter.spin2` (v55, 2026.05.07).
> **Status:** confirmed documentation gap — not a correction of anything P2KB
> currently states wrong, but a missing mechanism that P2KB never describes.

---

## 1. Summary of the gap

P2KB has **two XBYTE documentation defects**, both in or adjacent to
`p2kbArchXbyteEngine`:

**(A) A missing mechanism — the `SETQ`/`SETQ2` persistence distinction.** P2KB
documents the XBYTE mode *operand format*, but never documents the role of
**`SETQ2` as the one-shot XBYTE mode override**, nor the
**persistent-vs-one-shot distinction** between `SETQ` and `SETQ2` when arming
XBYTE. A reader cannot understand how a Spin2-style interpreter switches dispatch
tables for a single bytecode and reverts automatically — the central
control-flow mechanism of the production Spin2 interpreter.

**(B) A factual error — the LUT-entry (EXECF target) bit layout is inverted.**
`p2kbArchXbyteEngine`'s `lut_table_format` states `[31:23] = address (9 bits)`
and `[22:0] = SKIPF pattern (23 bits)`. The correct layout — designer-confirmed,
and the exact form the production interpreter assembles — is **`[9:0] = address
(10 bits)`** in the LSBs and **`[31:10] = SKIPF pattern (22 bits)`** shifted up
by 10. See **§5b**.

Concretely, the affected KB entries:

1. **`p2kbArchXbyteEngine`** — *(A)* its `starting_xbyte` section shows only
   `_RET_ SETQ {#}D` and treats that as *the* way to arm XBYTE; it does not
   mention `SETQ2` in the XBYTE context, nor that the `SETQ`-loaded mode
   **persists across bytecodes** while a `SETQ2`-loaded mode **applies to only
   the next bytecode**. *(B)* its `lut_table_format` has the address/skip split
   inverted and mis-sized (see §5b).

2. **`p2kbPasm2Setq2`** — describes `SETQ2` *exclusively* as a LUT block-transfer
   setup (`SETQ2 + RDLONG/WRLONG`). It has no mention of its second role as the
   XBYTE one-shot mode control. (The analogous `p2kbPasm2Setq` entry should get
   a parallel cross-reference for its XBYTE role.)

---

## 2. The correct behavior (to be documented)

Before XBYTE re-triggers (the `_RET_`-prefixed instruction that retires with
`$1FF` on the hardware call stack), the value loaded by `SETQ` or `SETQ2`
configures the **XBYTE mode**: dispatch-table base + nibble-compression
threshold + flag-write bit (the operand format P2KB already documents — see §3).

The distinction P2KB is missing:

- **`SETQ` sets the *persistent* XBYTE mode.** Once armed this way, **every
  subsequent bytecode** dispatches through that mode. Bytecode routines that end
  in a plain `_RET_` (no new `SETQ`) keep using it — XBYTE retains the mode
  internally. You arm it **once**.

- **`SETQ2` sets a *one-shot* XBYTE mode for only the *next* bytecode.** After
  that single bytecode dispatches, XBYTE **automatically reverts** to the mode
  last set by `SETQ`. Nothing has to restore it; there is no "switch back"
  instruction.

This is the mechanism that lets one XBYTE-driven VM operate **two dispatch
tables**: a default table (armed once with `SETQ`) and an alternate table
borrowed for exactly one opcode at a time (via `SETQ2`), after which dispatch
returns to the default table on its own.

> **Note for the maintainer:** this mirrors the existing `SETQ`-vs-`SETQ2`
> personality split elsewhere in the ISA — `SETQ` targets COG-RAM block
> transfers and `SETQ2` targets LUT-RAM block transfers; here, `SETQ` sets the
> *persistent* XBYTE mode and `SETQ2` sets the *transient* one. The "2" variant
> is consistently the alternate/one-shot form. Framing it that way will help
> readers who already know the block-transfer pair.

---

## 3. The mode operand encoding (already in P2KB — repeated here for the worked example)

`p2kbArchXbyteEngine` already gives the compressed-table operand layout. For the
worked example below, the relevant fields are:

```
%ABBBB00xF
  A     = dispatch-table base selector
  BBBB  = high-nibble compression threshold
          (opcodes with high nibble >= BBBB are collapsed to one table slot)
  F     = 1 → write the bytecode's low index bits to C/Z (4 sub-cases free)
```

What P2KB does **not** currently make explicit, and should: this **single
operand** is what both `SETQ` and `SETQ2` load. So choosing `SETQ` vs `SETQ2`
chooses *persistence*, while the operand value chooses *table base + compression
+ flags*. They are orthogonal — one instruction, two independent decisions.

---

## 4. Worked example from the production Spin2 interpreter (v55)

This is the canonical real-world use of the mechanism, and would make an
excellent KB example. All line numbers are in `Spin2_interpreter.spin2` (v55).

### Persistent arm — done once, at launch

```
wrf_wr  _ret_  setq  #$1A1     ' line 406: "begin xbyte, compress Ax..Fx, write flags"
```

Decode of `#$1A1` = `%1_1010_0001`:

| Field | Bits | Value | Meaning |
| --- | --- | --- | --- |
| `A` | `1` | main table | selects the `maincodes` dispatch table |
| `BBBB` | `1010` | `$A` | collapse opcodes `$Ax..$Fx` to single slots |
| `F` | `1` | flags on | write low index bits to C/Z |

Equivalently, read as a sum of fields: `$1A1 = $100 | $A0 | $1` — table at **LUT
offset `$100`** (absolute LUT `$300`), compression starting at bytecode `$A0`,
flag-write on.

After this one instruction, **every** bytecode dispatches through `maincodes`.
Ordinary handlers end in `_RET_` and never re-issue `SETQ`.

### One-shot override — at the tail of each "setup" routine

```
_ret_  setq2  #$081     ' lines 742, 775, 798: "next bytecode is a variable operator"
```

Decode of `#$081` = `%0_1000_0001`:

| Field | Bits | Value | Meaning |
| --- | --- | --- | --- |
| `A` | `0` | alt table | selects the `altcodes` (variable-operator) table |
| `BBBB` | `1000` | `$8` | collapse opcodes `$8x..$Fx` (cf. interpreter line 643) |
| `F` | `1` | flags on | write low index bits to C/Z |

Equivalently, read as a sum of fields: `$081 = $000 | $80 | $1` — table at **LUT
offset `$000`** (absolute LUT `$200`; the variable-operator entries themselves
begin at bytecode `$15` → absolute `$215`), compression starting at bytecode
`$80`, flag-write on.

Because this is `SETQ2`, it applies to **only the next bytecode** — that one
opcode is read from `altcodes` and interpreted as a variable operator (read,
write, `++`, `<<=`, …). The bytecode *after* it dispatches through `maincodes`
again, automatically, with no further instruction. This is the entire
"setup-bytecode then operator-bytecode" pairing that keeps Spin2 bytecode
compact while supporting the full operator set on every addressing mode.

---

## 5. Proposed concrete edits

### To `p2kbArchXbyteEngine`

Add a section (suggested key `mode_persistence` under `starting_xbyte`):

```yaml
mode_persistence:
  setq:
    role: "Sets the PERSISTENT XBYTE mode."
    behavior: |
      The table base / compression / flag configuration loaded by SETQ is
      retained by XBYTE and applies to every subsequent bytecode. Bytecode
      routines that end in a plain _RET_ continue dispatching through this
      mode; it is armed once, not per-bytecode.
  setq2:
    role: "Sets a ONE-SHOT XBYTE mode for only the next bytecode."
    behavior: |
      The configuration loaded by SETQ2 applies to exactly the next bytecode,
      after which XBYTE automatically reverts to the mode last set by SETQ.
      No instruction is needed to switch back.
    use_case: |
      Lets one XBYTE VM run two dispatch tables: a default table (SETQ, armed
      once) and an alternate table borrowed for a single opcode (SETQ2), as the
      Spin2 interpreter does for its "setup bytecode then variable-operator
      bytecode" pairing.
  note: |
    SETQ vs SETQ2 chooses PERSISTENCE; the operand value chooses table base +
    compression threshold + flag-write. The two decisions are orthogonal.
```

Optionally widen the `starting_xbyte.setup.code` block to show both forms:

```
_RET_   SETQ    {#}D     ' persistent XBYTE mode (armed once)
_RET_   SETQ2   {#}D     ' one-shot XBYTE mode, reverts to last SETQ after one bytecode
```

### To `p2kbPasm2Setq2`

Add to `notes:` (and/or a short `xbyte_role:` block):

```yaml
xbyte_role: |
  Besides LUT block transfers, SETQ2 also serves as the ONE-SHOT XBYTE mode
  control: '_RET_ SETQ2 #mode' configures the XBYTE table/compression/flags for
  only the next bytecode, after which XBYTE reverts to the mode last set by
  SETQ. (SETQ sets the persistent XBYTE mode; SETQ2 sets the transient one.)
  See p2kbArchXbyteEngine.
```

### To `p2kbPasm2Setq` (parallel cross-reference)

Add to `notes:`:

```yaml
xbyte_role: |
  Besides COG-RAM block transfers, SETQ also arms the PERSISTENT XBYTE mode:
  '_RET_ SETQ #mode' (with $1FF on the call stack) sets the table base /
  compression / flag configuration that XBYTE retains for all subsequent
  bytecodes. SETQ2 overrides it for a single bytecode. See p2kbArchXbyteEngine.
```

---

## 5b. The LUT-entry (EXECF target) format — error and fix

**This is a correction, not an addition.** `p2kbArchXbyteEngine` currently
documents the LUT dispatch-entry format as:

```yaml
lut_table_format:
  entry_format: |
    Each LUT entry contains:
    [31:23] = Base routine address (9 bits)
    [22:0] = SKIPF pattern (23 bits) or extended address
```

That split is **inverted and mis-sized**. The correct EXECF-target layout is:

```
[9:0]   = handler address    (10 bits, in the LSBs)
[31:10] = SKIPF skip pattern  (22 bits, shifted up by 10)
```

`10 + 22 = 32`. The address occupies the **low** 10 bits (enough to reach any
COG/LUT address, `$000..$3FF`); the skip pattern fills the **upper** 22 bits.

**Evidence — the interpreter assembles entries exactly this way.** Every entry
in the `maincodes`/`altcodes` tables is built as `address | (skip << 10)`, e.g.:

```
bc_jmp      long  branch | %01011111110 << 10     ' handler in [9:0], skip in [31:10]
```

The `<< 10` is dispositive: the skip pattern is shifted left by 10, so the
handler address must occupy bits `[9:0]`. This form is used uniformly across the
dispatch tables and was confirmed directly by the designer.

### Proposed fix to `p2kbArchXbyteEngine`

```yaml
lut_table_format:
  entry_format: |
    Each LUT dispatch entry packs an EXECF target:
    [9:0]   = handler address (10 bits, in the LSBs; reaches COG/LUT $000..$3FF)
    [31:10] = SKIPF skip pattern (22 bits, shifted up by 10)
    Built in source as: address | (skip_pattern << 10)
  execf_operation:
    jump: "To bits [9:0] of the LUT entry"
    skipf: "Using bits [31:10] as the 22-bit skip pattern"
```

> The entry's existing `execf_operation` block currently reads `jump: "To bits
> [31:23] of LUT entry"` and `skipf: "Using bits [22:0] as skip pattern"` — both
> must flip to `[9:0]` and `[31:10]` respectively.

---

## 6. Evidence / citations

- **Designer statement (authoritative):** Chip Gracey, reviewing the v55 ToO —
  *"`setq` sets the permanent xbyte mode and base, while `setq2` sets an
  alternate mode and base just for the next bytecode … only when it needs to get
  the next bytecode from the variable-operation table will it do a `setq2` …
  after that, it reverts to main-table behavior for the next bytecode."* He also
  noted P2KB "doesn't seem to understand the details of `setq`/`setq2` for
  xbyte."
- **Source evidence:** `Spin2_interpreter.spin2` (v55) line 406 (persistent
  launch arm `setq #$1A1`), lines 742 / 775 / 798 (one-shot `setq2 #$081` setup
  tails), line 643 (`$8x..$Fx` collapse in the alt table), line 516 (comment:
  "Variable operator bytecodes … triggered via `_ret_ setq2 #$081`").
- **Designer statement (LUT entry format):** Chip Gracey — the address is *"10
  bits in the LSBs"* and the skip pattern is *"22 bits … shifted up by 10
  bits."* He noted he believed the ToO *"had this correct, initially"* (the
  prose had drifted to match P2KB's inverted layout).
- **Source evidence (LUT entry format):** the `address | (skip << 10)` entry
  form used throughout the dispatch tables (e.g. `bc_jmp`, the `%…<<10` literal).
- **P2KB cross-check:** `p2kbArchXbyteEngine`'s mode-*operand* format
  (`%ABBBB00xF`, flag bit `F`) matches the source exactly and needs no change;
  its `lut_table_format` (the EXECF-entry address/skip split) is **wrong** and
  must be corrected (§5b). `p2kbPasm2Setq2` carries a block-transfer-only
  description and is missing the XBYTE one-shot role.

---

*This report covers one **correction** — the inverted LUT-entry address/skip
split (§5b) — and one set of **additions** — the `SETQ`/`SETQ2` persistence
semantics (§2, §5). The mode-*operand* format P2KB already carries is correct
and needs no change; together with the two fixes above, the XBYTE entry becomes
a complete, usable mental model for building an XBYTE bytecode VM.*
