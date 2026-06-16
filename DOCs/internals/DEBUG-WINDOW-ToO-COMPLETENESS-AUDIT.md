# Debug-Window Theory-of-Operations — Completeness Audit (vs v55 source)

> **Date:** 2026-06-14
> **Ground truth:** `REF-V52A/DebugDisplayUnit.pas` — confirmed **byte-for-byte
> identical** (133,829 bytes) to the v55 `DebugDisplayUnit.pas` the matrix cites; the
> directory name "V52A" is stale. CLOSE pathway also in `DebugUnit.pas` /
> `GlobalUnit.pas`.
> **Standard applied:** a ToO is *complete* only if it covers — for its window —
> **every** command, **every** parameter, and **every** legal range (numeric clamp)
> or value-set (enumerated keywords/text), with correct defaults. Incompleteness is a
> defect, not polish.
> **Method:** one auditor per window + one for the matrix, each ratifying the full doc
> against its slice of the Pascal source. Four high-value items independently
> re-verified by the orchestrator (see §4).

---

## 1. Scorecard

| Document | Verdict | Material defects | Minor / precision |
|---|---|--:|--:|
| **Matrix** (DEBUG-WINDOW-DIRECTIVE-MATRIX.md) | INCOMPLETE | 3 | 3 |
| LOGIC ToO | INCOMPLETE | 1 | 3 |
| SCOPE ToO | INCOMPLETE | 1 | 0 |
| SCOPE_XY ToO | COMPLETE | 0 | 3 |
| FFT ToO | **COMPLETE** | 0 | 0 |
| SPECTRO ToO | INCOMPLETE | 2 | 1 |
| PLOT ToO | INCOMPLETE | 1 | 4 |
| TERM ToO | INCOMPLETE | 1 | 2 |
| BITMAP ToO | INCOMPLETE | 1 | 1 |
| MIDI ToO | INCOMPLETE | 1 | 2 |

> **Correction (2026-06-14, post-review):** three items first flagged as "unclamped
> ⇒ wrong range" were re-examined and **retracted** — the value is bounded by its
> destination *type* or by a *mask at use*, so the stated range is actually correct.
> See §4a. Counts above already reflect the retractions (PLOT 2→1, SPECTRO 3→2,
> BITMAP minor 2→1).

"Material" = a wrong value/range/default, a missing command/parameter, or a
self-contradiction. "Minor" = imprecise attribution, undocumented shared-helper sub-form,
or cosmetic pseudo-code drift.

Note: the three matrix defects fixed earlier this session (TERM colors, CLOSE
universality, SPRITEDEF palette) were re-confirmed correct by the matrix auditor and are
**not** re-counted here.

---

## 2. Cross-cutting defects (hit multiple docs — fix once, apply everywhere)

### CC-1 — `POS` phantom "width/height" in legacy §4.2 tables — **WRONG**
`KeyPos` (2712–2716) reads exactly **two** numbers, `left` and `top`, applied as offsets
to `DebugDisplayLeft/Top`. It sets **no** width/height. Yet the older "§4.2 parameter
table" sections describe `POS` as `x, y, width, height`:
- **SPECTRO ToO** §4.2 (POS row).
- **TERM ToO** §4.2 (line ~343) **and** §12.1 protocol example (line ~1056).
- **MIDI ToO** §4.2 (line ~369) **and** §12.1 protocol example (lines ~1102–1103).

In every case the newer **"v55-verified Directive Reference"** table in the *same doc*
already states POS correctly (left, top) — so each is a **self-contradiction**, and the
legacy §4.2 row is the wrong one. (LOGIC/SCOPE/SCOPE_XY/FFT/PLOT/BITMAP ToOs did not
trip this — their POS entries are correct.)

### CC-2 — color-mode "tune" wrongly attributed to **RGBI** modes — **WRONG**
`KeyColorMode` (2785–2804) reads a tune parameter for **LUMA8/LUMA8W/LUMA8X** (keyword
or numeric) and for **HSV8/8W/8X, HSV16/16W/16X** (numeric). **RGBI8/RGBI8W/RGBI8X take
no tune** (no branch). Two docs over-state the set:
- **Matrix** §7.1 (lines ~463–465) — "LUMA/HSV/RGBI variants take a tune parameter".
  (Matrix §1.2 states it correctly — only §7.1 is wrong.)
- **BITMAP ToO** §-config KeyColorMode description.

### CC-3 — default packing mode (informational, currently LOGIC-only)
`SetDefaults` runs `SetPack(0, …)` (2915); `SetPack(0,…)` → `vPackShift=32, vPackCount=1,
vPackMask=$FFFFFFFF` (4152–4155) = **one full 32-bit sample per long, unpacked** — NOT
`LONGS_1BIT` (which is `val=29` → 32×1-bit). Every window that consumes a packed numeric
stream inherits this. Only the **LOGIC ToO** currently mis-states it (see L-1); the other
stream windows were not flagged, but confirm them during repair.

---

## 3. Per-document findings

### 3.1 Matrix — INCOMPLETE
- **M-1 [WRONG]** §7.1 RGBI tune — see **CC-2**.
- **M-2 [MISSING]** §7.3 omits the SPECTRO-unique rate default `if vRate=0 then vRate :=
  vSamples div 8` (1778) and the FFT default `if vRate=0 then vRate := vSamples` (1603).
- **M-3 [IMPRECISE]** §7.3/§7.0a SPECTRO `DEPTH` is not shown to write **`vWidth`** and feed
  the `vTrace and $4` width/height swap (1751–1787); "depth 256" reads as a DEPTH default
  when it is an inherited `vWidth`=256 (SPECTRO sets no DEPTH default).
- Minor: §4.4 SPECTRO/BITMAP readout divides X by `vDotSize` and Y by `vDotSizeY`
  separately (simplified to "÷ DOTSIZE"); PLOT `COLOR` immediately before `TEXT` binds the
  color to *text* not plot (1937–1942) — undocumented; TERM code 13 swallows a trailing 10
  (CRLF, 2298–2302) — undocumented.

### 3.2 LOGIC ToO — INCOMPLETE
- **L-1 [WRONG default — material]** Pack default stated/assumed as `LONGS_1BIT` (directive
  table, §5.2, §6.7/§8). Source default is the unpacked `val=0` mode (1 sample/long, 32-bit;
  4152–4155). The ToO's own §6.4 describes the `val=0` path correctly → **self-contradiction**.
- Minor: COLOR named-color **brightness nibble** (default 8) undocumented; `SAVE WINDOW` /
  `SAVE l t w h` forms undocumented; §10.5 cross-references "SCOPE_Configure" for the
  both-zero dot/line guard, which LOGIC does **not** apply (that guard is SCOPE-only, 1188).

### 3.3 SCOPE ToO — INCOMPLETE
- **S-1 [WRONG — material]** Directive table says channel `grid` is "parsed, **never
  rendered**". Source: per-channel `vGrid[i]` **is** rendered — ClearBitmap draws baseline/
  top grid lines from its bits 1/2/4/8 (3291–3322). The §4.2/§6 "rendered in ClearBitmap"
  statements are the correct ones; the "never rendered" line is the defect.
- All numeric clamps verified exact; otherwise complete.

### 3.4 SCOPE_XY ToO — COMPLETE
- Minor only: §4a `SIZE` default cell "256 (→ 512 px)" conflates the default width (256)
  with the result of `SIZE 256` (512); §8.1 pseudo-code "else if" framing; `SAVE`
  WINDOW/region forms not detailed. No wrong values.

### 3.5 FFT ToO — COMPLETE
- No defects. Every directive, parameter, range, and default matches source (incl. SAMPLES
  power-of-2 snap with first/last sub-ranges, LINESIZE −32..32, the forced `vDotSize:=1`
  when dot+line both 0). Clean.

### 3.6 SPECTRO ToO — INCOMPLETE
- **SP-1 [WRONG]** §4.2 POS "x,y,width,height" — see **CC-1**.
- **SP-2 [IMPRECISE default]** `DEPTH` default given as "varies / varies by trace"; source
  default is a fixed `vWidth=256` (2884), with the width/height swap happening *after* the
  parse loop. State DEPTH default = 256; describe the swap separately.
- ~~SP-3 [TRACE range]~~ **RETRACTED** — see §4a. `SetTrace` masks `Path and $F` (2979),
  so the effective range really is **0..15**; the doc's "0..15" is correct. Optional
  one-line note: the bound is the `$F` mask, not a parse clamp.

### 3.7 PLOT ToO — INCOMPLETE
- ~~P-1 [OPACITY range]~~ **RETRACTED** — see §4a. `vOpacity` is a `byte` (341), so the
  value is bounded to **0..255** on assignment; the documented "0..255" is correct.
- **P-2 [WRONG default — material]** `CIRCLE/OVAL/BOX/OBOX` linesize defaults to **0**
  (`t7 := 0`, 2027) ⇒ *filled* shape, *not* `vLineSize`. (DOT/LINE *do* default linesize to
  `vLineSize`, 1967.) This is a **default** discrepancy, independent of clamping — confirm
  against what the PLOT ToO states before fixing.
- Minor: `LINESIZE`/shape thickness is writer-bounded to 128 px (3872), not unclamped (§4a);
  `DOTSIZE` y defaults to x (1893); `vPlotColor` default = clCyan, `vTextColor` = clWhite
  (Configure-time, 1877–1878); `PRECISE` is an `xor 8` toggle (1947), not a set; CROP
  explicit-branch destination defaults to source `l/t` (2083–2084).

### 3.8 TERM ToO — INCOMPLETE
- **T-1 [WRONG — material]** §4.2 (line ~343) + §12.1 example (line ~1056) POS
  "x,y,width,height" — see **CC-1**. (Authoritative Directive Reference at line ~211 is
  correct.)
- Minor: `SAVE` arg-forms (filename / WINDOW / l t w h) not enumerated; BACKCOLOR config
  default `clBlack` is correct but comes from `SetDefaults`, not `TERM_Configure` (attribution).
- TERM default colors are **correct** in this doc (ORANGE/BLACK, BLACK/ORANGE, LIME/BLACK,
  BLACK/LIME) — matches the matrix fix; no change.

### 3.9 BITMAP ToO — INCOMPLETE
- **B-1 [WRONG]** KeyColorMode tint attributed to RGBI — see **CC-2**.
- ~~B-2 [TRACE range]~~ **RETRACTED** — see §4a. The `$F` mask (2412) and `and 7` (2435)
  make "0..15" the correct effective range. (Optional note: bound is the mask, not a parse
  clamp.)
- Minor: §23.1 pseudo-code `SetTrace(vTrace, True)` should read `SetTrace(vTrace, vRate = 0)`
  (2412) — §3.2 already states it correctly.

### 3.10 MIDI ToO — INCOMPLETE
- **MI-1 [WRONG — material]** §4.2 (line ~369) + §12.1 example (lines ~1102–1103) POS
  "x,y,width,height" — see **CC-1**. (Directive Reference at line ~212 is correct.)
- Minor: §4.2 understates `RANGE` lastKey's dynamic lower bound (`firstKey..127`) and
  COLOR's named-color value-set — both correct in the v55 reference table.
- `HIDEXY`-not-accepted is **confirmed correct** (no `key_hidexy` arm in MIDI_Configure).

---

## 4. Orchestrator re-verifications (claims confirmed against source)

| Claim | Source | Result |
|---|---|---|
| PLOT OPACITY unclamped | 1944–1945 | **Confirmed** — raw store, no clamp |
| PLOT CIRCLE-family linesize default 0 | 2027 | **Confirmed** — `t7 := 0` |
| SCOPE per-channel vGrid is rendered | 3291–3322 (ClearBitmap) | **Confirmed** — "never rendered" is wrong |
| LOGIC pack default = unpacked val=0 (not LONGS_1BIT) | 4152–4155 | **Confirmed** — shift 32, count 1, mask $FFFFFFFF |

---

## 4a. Bounding verification — "nothing is left unchecked"

**Premise (correct):** the Pascal author range-checks *every* value; an absent
parse-time clamp means the bound lives downstream, not that the value is free. Every
"unclamped" finding was re-traced to its actual bound. **Result: no genuinely
unguarded value exists.** Bounds are enforced by one of five mechanisms:

| Mechanism | Where | Values bounded this way |
|---|---|---|
| **(a) Parse clamp** `Within`/`KeyValWithin` | at the directive | the majority of config params (SIZE, SAMPLES, RATE, DOTSIZE, DEPTH, MAG, RANGE, channel/trigger ranges, SPRITE id/orient/scale, LAYER, CROP, set-col/row, …) |
| **(b) Destination type** (Pascal `byte`) | on assignment | `vOpacity` (OPACITY ⇒ 0..255), `vPrecise` |
| **(c) Mask at use** (`and $F`, `and 7`, bit tests) | in consumer | `vTrace` (SetTrace `Path and $F` ⇒ **0..15**, 2979); channel `grid` bits 1/2/4/8 (3298–3322) |
| **(d) Writer-level guard / clip** (`Exit` or coordinate clip) | in the pixel writers | PLOT coordinates → `SmoothClip`/`SmoothFill` (3783–3792)/`SmoothPlot` (3815); line/dot **thickness** → `Min(radius, maxr shl 8)` = **128 px** (3872); shape **width/height** → `SmoothShape` rejects unless `xs/ys ∈ [1,2048]`, `xro/yro ∈ [0,1024]`, `thick ≥ 0` (3606–3612); `TEXTANGLE` → `val mod 360` (3076) |
| **(e) Storage-type width** (the variable's Pascal type) | on assignment / arithmetic | the floor bound that *always* applies: `byte` ⇒ 0..255 (`& $FF`); `integer` ⇒ −2³¹..2³¹−1, **wraps on overflow**; `int64` ⇒ ±2⁶³. Operative for the values with no tighter clamp — LOGIC `TRIGGER mask/match`, SCOPE `TRIGGER arm/fire`, channel `tall/base`, `RATE` cadence (RateCycle `= vRate`, 3079), `POLAR twopi/theta` (`vTwoPi` is **int64**), `TEXTSTYLE`, and all coordinate/packing intermediates that overflow 32 bits |

> **There is no "unbounded."** Category (e) is the universal backstop: every value is at
> minimum bounded by its receiving variable's storage width. State that width — it is the
> spec, not a detail.

### Parity implication for the TypeScript port (PNut-TS) — this is why receiving-type belongs in the spec

Pascal gets truncation/wrap/masking **for free** from typed storage; a TypeScript
`number` (float64) does **not** — it neither truncates to a byte nor wraps at 32 bits
(only at 2⁵³). So omitting the receiving-variable width from these docs is a **parity
hazard**: a port that stores the raw value diverges from Windows PNut. Concretely the port
must explicitly emulate what the Pascal type did implicitly:

| Pascal mechanism | Port must do | Else divergence |
|---|---|---|
| `byte` sink (`vOpacity`, `vPrecise`) | `val & 0xFF` | `OPACITY 300` ⇒ Pascal 44 vs naive TS 300 → wrong alpha |
| mask at use (`vTrace`, scroll `& 7`) | `val & 0xF` / `& 7` | stale high bits change trace/scroll behavior |
| `integer` 32-bit wrap (`shl`/`*` in writers, packing, `high-low`) | Int32 coercion (`\| 0`, `Math.imul`, `>>> 0`) | large intermediates keep growing → wrong coords/pixels |
| `int64` (`vTwoPi`) | BigInt / precision-safe path | precision loss above 2⁵³ in polar math |
| **signedness** — `integer` is *signed* (bounds `$7FFFFFFF` / `−$80000000`); `byte` unsigned | coerce signed (`\| 0`) for `integer`, unsigned (`& 0xFF`) for `byte`; match `Within`/compare | high-bit value read as +N not −N → flips clamps, triggers, comparisons |
| **sign-extension** of `SIGNED`-packed sub-samples (`UnPack`, 4170) | `if (s >> (bits-1)) & 1: s \|= ~mask` | SIGNED data emerges positive → wrong sample values |
| **logical shift** — Pascal `shr` is zero-fill even on signed | use `>>>`, **not** `>>` | arithmetic `>>` sign-propagates → wrong bits |

**Conclusion (answers the parity question directly): yes — if the ToO/matrix does not
state the receiving variable's size *and signedness*, the docs are *incomplete for a
parity-faithful port*, and a port written against them can silently lose 100% feature
parity.** The completeness standard is therefore extended: every value's entry must carry
its **receiving Pascal type — width *and* sign** (and the resulting truncation, 32-bit
wrap, mask, sign-extension, and logical-shift semantics), not just its parse-time clamp.

### Retractions (first flagged as "unclamped ⇒ wrong", now confirmed correct)

- **PLOT `OPACITY` (was P-1):** `vOpacity` is a `byte` (341) → `vOpacity := val` keeps the
  low 8 bits ⇒ effective **0..255**. The matrix/ToO "0..255" is **correct**. *Not a defect.*
- **SPECTRO `TRACE` (was SP-3):** `SetTrace` does `vTrace := Path and $F` (2979); SPECTRO
  masks post-loop (1789) ⇒ effective **0..15**. The doc's "0..15" is **correct**. *Not a defect.*
- **BITMAP `TRACE` (was B-2):** same `$F` mask (2412); plus `SET` does `vTrace and 7` (2435)
  ⇒ effective **0..15**. *Not a defect.*
- **PLOT update `LINESIZE` / shape thickness:** previously called "no clamp"; actually bounded
  to **128 px** by `Min(radius, maxr shl 8)` (3872) and `thick ≥ 0` in SmoothShape (3611).

### Methodology note (carry forward)
When a value reaches a consumer via bare `KeyVal` (no `Within`), **do not** conclude
"unclamped" — locate the byte-type assignment, the `and`-mask, the writer-level
`Exit`/clip, or confirm it is a data-domain value by design. The bound is always there.

---

## 4b. Full-rubric resweep (2026-06-14) — parity dimension

Every doc + the matrix were re-ratified against source on the complete rubric (coverage,
range, **bounding mechanism, receiving type width+sign, default provenance, arg-consumption
control flow, side effects, edge handling, boundary inclusivity, numeric-parity**), plus two
cross-cutting passes (numeric semantics; color/transform). Headline: **coverage and ranges
hold up, but NO document is parity-complete** — receiving-type width/sign and Pascal
numeric semantics are systematically absent. Even FFT (clean on the first pass) is
incomplete here.

### Revised verdict (parity rubric)

| Doc | Coverage/range | Hard errors found in resweep | Parity-complete? |
|---|---|---|:--:|
| Matrix | solid | §7.1 RGBI-takes-tune (reintroduced); FFT/SPECTRO rate-defaults; DEPTH→vWidth | ❌ |
| LOGIC | solid | pack default (LONGS_1BIT→unpacked); **HOLDOFF reset is conditional** | ❌ |
| SCOPE | solid | **grid "never rendered" (it IS)**; **9th channel "ignored" (it clobbers ch8)**; HOLDOFF conditional | ❌ |
| SCOPE_XY | solid | **`vTwoPi` declared `integer` — is `int64`** (value $100000000 can't fit int32); SIZE 16..1024 mislabel | ❌ |
| FFT | solid | none hard; systemic width/sign + banker's-Round absent | ❌ |
| SPECTRO | solid | **POS "x,y,w,h" (is left,top)**; DEPTH default; TRACE "0..15" framed as parse-clamp | ❌ |
| PLOT | solid | **SIZE default 512×512 (is 256×256)**; **`vOpacity`/`vPrecise` declared `integer` (are `byte`)**; **`vTwoPi` `integer` (is `int64`)**; CIRCLE-family linesize default 0 | ❌ |
| TERM | solid | **POS "x,y,w,h" (is left,top)** | ❌ |
| BITMAP | solid | **KeyColorMode RGBI-takes-tint (it doesn't)**; **LUT default "grayscale" (is undefined)**; SetTrace(True) vs (vRate=0) | ❌ |
| MIDI | solid | **POS "x,y,w,h" (is left,top)** | ❌ |

### Hard type/value errors (must-fix — flatly wrong vs source)

1. **`vTwoPi` is `int64`, mis-declared `integer`** in SCOPE_XY §4.2 and PLOT §4.1. Its own default `$100000000` (2³²) is unrepresentable as int32 — internal contradiction. (decl 315)
2. **`vOpacity`, `vPrecise` are `byte`, mis-declared `integer`** in PLOT §4.2/§4.1. (decl 341–342)
3. **PLOT SIZE default 512×512** (§5.2) contradicts source 256×256 (2884) and the doc's own Directive-Ref.
4. **SCOPE channel `grid` "never rendered"** — vGrid IS rendered (ClearBitmap 3291–3322).
5. **SCOPE 9th-channel "ignored"** — actually overwrites channel 8's slot (vIndex saturates at 8, writes [7], 1219).
6. **LOGIC + SCOPE HOLDOFF reset "unconditional"** — `vHoldOffCount:=0` only fires when a number was supplied (1051 / 1251).
7. **LOGIC pack default LONGS_1BIT** — is unpacked val=0 (1×32-bit; SetPack(0,…) 2915/4152).
8. **POS "x,y,width,height"** in SPECTRO/TERM/MIDI §4.2 (+ TERM/MIDI §12.1) — KeyPos reads left,top only (2712).
9. **BITMAP KeyColorMode RGBI-takes-tint** — only LUMA8-family (keyword|num) and HSV families (num) take a tune; RGBI takes none (2788–2803).
10. **BITMAP LUT default "grayscale"** — `SetDefaults` never initializes `vLut[]`; default contents undefined (contradicts the doc's own §17.4).
11. **Matrix §7.1 "LUMA/HSV/RGBI take a tune"** — RGBI takes none (matrix §1.2 already says it right → self-contradiction).

### Systemic gap A — receiving-type width+sign (every doc)

The docs label values "int" and never state width/sign. Concrete fields needing explicit
type: `vTwoPi` int64; `vOpacity`/`vPrecise`/`vKeyPress`/`vLogicBits[]` byte; everything else
signed 32-bit `integer` (wraps; bounds `$7FFFFFFF`/`−$80000000`). Plus the **SIGNED-pack
sign-extension** mechanism (UnPack 4170) and the global fact that all wire/parse values
arrive as **signed 32-bit `val`**.

### Systemic gap B — numeric semantics (matrix + all per-window docs)

The cross-cutting numeric pass found **two areas documented nowhere**, both parity-critical:

1. **Delphi `Round` = banker's (round-half-to-even)** ≠ JS `Math.round` (round-half-up).
   **51 `Round` sites** across coordinate/scale/color math (corrected 2026-06-16; the
   first pass undercounted as "37") — the gamma alpha-blend (`MixColors` 3418–3420,
   `SmoothFill` 3803, `SmoothPlot` 3827–3829, `SmoothPixel` 4009–4011) and FFT/SPECTRO/
   SCOPE scaling are the highest risk (silent ±1-LSB `.bin`/pixel divergence). The
   fourth gamma cluster (`MixColors`) was missed on the first pass.
2. **Delphi `extended` = 80-bit float (Win32)** vs TS 64-bit `double` — residual edge-case
   divergence in `Power`/`Sqrt`/trig feeding a `Round`.

Partially covered (need consolidation): `div`/`Trunc` toward zero (≠ `Math.floor`); `shr`
logical ⇒ `>>>`; 32-bit wrap under `{$Q-}/{$R-}` with **deliberate `Int64()` casts** (1123,
1352, 1519, 1699, 1849) that mark where 64-bit is required vs where wrap is intended;
packing bit-exactness (NewPack ALT swizzle order; `vPackMask=0` for the 32-bit case via
shift-wrap).

**Recommendation (both cross-cutting agents):** add a single global **"Numeric Semantics"**
section to the matrix (areas: banker's Round + the 37-site list, toward-zero div/Trunc,
logical shr, 32-bit wrap + Int64-cast map, packing bit-exactness, 80-bit-float residual
risk), and attach a "Delphi Round = banker's" note to every gamma-blend formula. Color/
transform math is otherwise parity-complete (named-color RGBI8X table re-derived and
verified byte-for-byte; clXxx-vs-directive distinction correct; PC_MOUSE/PC_KEY wire format
correct).

---

## 5. Repair plan (ordered) — ✅ EXECUTED 2026-06-14

> **Status: COMPLETE.** All 9 per-window ToO docs + the matrix were repaired (one
> agent per doc, each verifying every fact against source before editing). Landed:
> the 11 hard type/value/behavior fixes; a "Receiving types & numeric parity
> (TS-port contract)" subsection in every doc (signed-32 default; `vTwoPi`=int64,
> `vOpacity`/`vPrecise`/`vKeyPress`/`vLogicBits[]`=byte called out); and a new global
> **§8 Numeric Semantics** section in the matrix (banker's `Round`, toward-zero
> `div`/`Trunc`, logical `shr`, 32-bit wrap + Int64-cast map, packing bit-exactness,
> 80-bit-float residual risk). FFT needed no hard fix; its repair was parity-only.
> Note: a couple of agents found bonus source facts while editing (e.g. SCOPE_XY's
> real default caption is `' - SCOPE_XY'`, set at form-create, not "Scope_XY").

The original ordered plan follows for reference.



1. **Cross-cutting first** (touch all affected docs in one sweep):
   - CC-1: fix `POS` → "left, top" in SPECTRO/TERM/MIDI §4.2 tables and TERM/MIDI §12.1
     protocol examples.
   - CC-2: narrow color-mode tune to LUMA8-family + HSV families (drop RGBI) in Matrix §7.1
     and BITMAP ToO.
2. **Per-doc material fixes:** L-1 (pack default), S-1 (vGrid rendered), SP-2/SP-3 (DEPTH
   default, TRACE range), P-1/P-2 (OPACITY unclamped, shape linesize default 0), M-2/M-3
   (SPECTRO/FFT rate defaults, DEPTH→vWidth).
3. **Minor/precision** items per §3, including the BITMAP `SetTrace` pseudo-code and the
   SAVE/brightness-nibble shared-helper notes.
4. Re-confirm CC-3 across all stream windows (SCOPE/SCOPE_XY/FFT/SPECTRO/BITMAP) while
   fixing LOGIC's pack default.
5. No GOLD/source files are touched; this is documentation-only.

*FFT ToO requires no changes. SCOPE_XY needs only optional polish.*
