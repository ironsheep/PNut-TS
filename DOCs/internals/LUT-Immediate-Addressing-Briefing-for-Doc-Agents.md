# RDLUT / WRLUT — LUT Immediate-Address Limit — Briefing for Documentation Agents

**Purpose:** authoritative, self-contained guidance for agents writing tutorials, manuals,
and examples that read or write the cog's 512-long Lookup Table (LUT) with `RDLUT` / `WRLUT`.
It states the precise limit on *immediate* LUT addressing and the exact compiler behavior, so
docs describe what PNut-TS actually does — not folklore.

**Status:** statement of fact for **PNut-TS v55 (1.55.x)**. Verified against the compiler
source and confirmed by compiling test cases with the shipped `dist/pnut-ts.js` (v1.55.0).
This is a *hard compiler limit enforced with a compile error*, not a silent runtime trap.

---

## 1. The headline rule

> A **plain immediate** LUT address (`RDLUT d,#S` / `WRLUT d,#S`) is restricted to **`#0`–`#255`**
> — the **lower half** of the 512-long LUT. A value of `#256` or higher is a **compile-time
> error**: `Constant must be from 0 to 255`.
>
> To address the **full LUT (0–511)**, use a **register** operand or a **`PTRA`/`PTRB`** pointer
> expression (optionally with an index).

This is exactly the behavior described in the community exchange that prompted this brief:
*"immediate addressing is only available for the first half of LUT; this was done to allow a
pointer (PTRA/PTRB) plus optional index to address the entire LUT."* PNut-TS implements precisely
that — and, importantly, **rejects** the over-range immediate rather than silently truncating it.

---

## 2. What the compiler actually does (verified)

Compiling a `DAT`/`org` block with each form (PNut-TS 1.55.0):

| Source                  | Result | Notes |
|-------------------------|--------|-------|
| `rdlut dest,#200`       | ✅ OK   | literal 0–255, lower half |
| `rdlut dest,#255`       | ✅ OK   | last directly-reachable literal |
| `rdlut dest,#256`       | ❌ **error** | `Constant must be from 0 to 255` |
| `rdlut dest,#500`       | ❌ **error** | `Constant must be from 0 to 255` |
| `rdlut dest,dest`       | ✅ OK   | **register** operand → reaches 0–511 |
| `rdlut dest,ptra`       | ✅ OK   | pointer → reaches 0–511 |
| `rdlut dest,ptra[5]`    | ✅ OK   | pointer + index |
| `rdlut dest,##500`      | ✅ OK (compiles) | augmented form — **see §5, do not recommend for LUT** |

`WRLUT` behaves identically for its `S` (address) operand — same limit, same error.

---

## 3. Why the limit exists (the encoding)

`RDLUT` and `WRLUT` share the P2's generic **hub-memory operand format** (the same one used by
`RDLONG`/`WRLONG`/`RDBYTE`/`WRBYTE`/`RDWORD`/`WRWORD`/`WMLONG`). The source operand encodes into a
**9-bit `S` field** plus an immediate (`I`) bit:

```
RDLUT:  EEEE 1010101 CZI DDDDDDDDD SSSSSSSSS      (I = instruction bit 18)
WRLUT:  EEEE 1100001 1LI DDDDDDDDD SSSSSSSSS
```

Nine bits *could* express 0–511 directly — but the **top bit of the `S` field (bit 8, `0x100`)
is reserved as the "this is a `PTRA`/`PTRB`/augmented expression" selector**, not as address bit 8.
So when `I = 1`:

- **bit 8 = 0** → the field is a plain literal, leaving only bits 7:0 → **0–255**.
- **bit 8 = 1** → the field is decoded as a pointer/indexed expression (PTRA/PTRB, ±index,
  pre/post inc/dec), which is how the **entire** 0–511 LUT is reached.

That single reserved bit is the whole story: a literal cannot set it (that would change its
meaning), so a literal can never name an address ≥ 256. A **register** operand (`I = 0`) carries a
full 9-bit cog-register address whose *contents* (0–511) select any LUT long, and a **PTRx**
expression sets bit 8 deliberately to take the pointer path.

---

## 4. Scope — this is not unique to LUT

The 0–255 plain-immediate cap applies to **every** instruction in this operand family, because
they all share the encoder path:

`RDLUT WRLUT RDLONG WRLONG RDBYTE WRBYTE RDWORD WRWORD WMLONG`

For the **hub** instructions the cap is rarely felt: hub addresses are 20-bit, so code naturally
uses a register, a `PTRx`, or the `##` (augmented, 20-bit) form. The limit *bites specifically for
LUT* because LUT addresses are small numbers (0–511) that authors instinctively write as bare
literals — and `#256`…`#511` look like they should work but do not.

---

## 5. The `##` (augmented) form — accepted, but **not** the way to reach LUT 256–511

`rdlut dest,##500` **compiles** (it does not error), but **do not document it as the way to read
the upper half of LUT.** What the encoder emits is the generic hub-style augmented sequence:

- an `AUGS` prefix carrying the upper 23 bits (which are **0** for a value < 512, i.e. meaningless
  for a 9-bit LUT address), followed by
- the instruction with the **low 9 bits installed verbatim** — so for `##500` the `S` field
  becomes `0x1F4`, which **has bit 8 set**.

Because bit 8 is the pointer/expression selector (§3), an augmented LUT literal ≥ 256 lands on the
silicon's pointer-decode path rather than naming LUT long 500 as a literal. The LUT address space
is only 9 bits, so the AUGS high bits buy nothing here. **The supported, unambiguous ways to reach
LUT 256–511 are a register operand or a `PTRA`/`PTRB` expression** — recommend those.

---

## 6. Copy-paste callout for manuals/tutorials

> **Addressing the LUT with `RDLUT` / `WRLUT`**
> - A **literal** address is limited to **`#0`–`#255`** (the lower half of the 512-long LUT).
>   `RDLUT d,#256` and above are a **compile error** (`Constant must be from 0 to 255`).
> - To reach **any** LUT long (0–511), use a **register** holding the address —
>   `RDLUT d, addrReg` — or a **`PTRA`/`PTRB`** pointer, optionally indexed —
>   `RDLUT d, PTRA` / `RDLUT d, PTRB[4]`.
> - The architectural reason: the 9-bit address field's top bit selects the pointer/indexed
>   form, so a literal only spans 8 bits (0–255). Pointers carry the full range.

```spin2
        rdlut   value, #200          ' ✅ literal, lower half
        rdlut   value, #500          ' ❌ compile error: Constant must be from 0 to 255
        mov     idx,   #500          ' put the address in a register...
        rdlut   value, idx           ' ✅ register operand reaches all 512 longs
        rdlut   value, ptrb          ' ✅ pointer reaches all 512 longs
        rdlut   value, ptra[16]      ' ✅ pointer + index
```

---

## 7. Guardrails — what the docs must NOT claim

- **Do not** say `RDLUT d,#500` "wraps", "reads LUT 244", or "works but accesses the wrong long."
  It **does not assemble** — PNut-TS raises `Constant must be from 0 to 255`. Describe it as a
  rejected literal, not a silent miscompile.
- **Do not** present `RDLUT d,##500` as the supported route to the upper LUT half (§5). Point
  authors to a register or `PTRx` instead.
- **Do not** state the limit as "256 longs of LUT are inaccessible." All 512 longs are reachable;
  only the *plain-literal* addressing mode is limited to the lower 256. Scope the limit to the
  immediate operand, not to the memory.
- **Do not** cite numeric opcode/bytecode values for these instructions (project convention:
  instruction names yes, numeric encodings only as illustrative bit-fields, never as authoritative
  constants — they re-sort between revisions). The bit-field diagrams in §3 are for explanation.

---

## 8. Source of truth (for reviewers verifying this brief)

- **The 0–255 cap and its error** — `src/classes/spinResolver.ts`, `tryPtraPtrb()`, the no-pointer
  single-`#` branch: *"have '#' but constrained to 8-bit value! (not 9-bit)"* → `if (value > 255)
  throw 'Constant must be from 0 to 255'` (`[error_cmbf0t255]`).
- **Bit 8 = pointer-expression selector** — same function: on a found pointer, `ptrBits |= (1 << 18)
  | 0x100` sets the `I` bit (bit 18) and `S` bit 8 (`0x100`); the index/inc/dec encodings layer on
  from there.
- **Operand format binding** — `src/classes/parseUtils.ts`: `ac_rdlut` → `operand_dsp` (`D,S/#/PTRx`)
  and `ac_wrlut` → `operand_lsp` (`D/#,S/#/PTRx`); the dispatch for both routes the source operand
  through `tryPtraPtrb()` (`spinResolver.ts`, `operand_dsp`/`operand_lsp` cases).
- **`##` augmented path** — same function, the `checkPound()`-twice branch: emits `AUGS` via
  `emitAugDS(AT_S, …)` then installs the low 9 bits (`& 0x1ff`).
- **Empirical confirmation** — compiling the §2 cases with `dist/pnut-ts.js` (PNut-TS 1.55.0)
  reproduces every row, including the `#256`/`#500` error and the `##500`/register/`PTRx` accepts.
