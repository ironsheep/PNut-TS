# RDPIN() C-Flag-in-Bit-31 — Audit of the P_STATE_TICKS Example (Manual p.199, Ch.13)

**Date:** 2026-07-05
**Trigger:** User report that a published `P_STATE_TICKS` example does not behave as documented when run under FlexSpin.
**Verdict:** Example is **correct for official Spin2 (PNut / PNut-TS)**. The failure is a **FlexSpin divergence**, not a doc error.

---

## 1. The User's Report (verbatim)

> On p.199, Ch13, this example for the smart-pin mode P_STATE_TICKS is given:
>
> ```spin2
> CON
>     _clkfreq = 200_000_000
>     INPUT_PIN = 20
>
> PUB measure_states() | duration, was_high
>     PINFLOAT(INPUT_PIN)
>     WRPIN(INPUT_PIN, P_STATE_TICKS)
>     PINLOW(INPUT_PIN) ' Enable
>     repeat
>         repeat until PINREAD(INPUT_PIN) ' Wait for transition
>         duration := RDPIN(INPUT_PIN)
>         ' Check C flag (bit 31 of RDPIN result indicates C)
>         was_high := (duration >> 31) & 1
>         duration &= $7FFFFFFF ' Mask off C flag
>          if was_high
>            DEBUG("High time: ", UDEC_(duration), " clocks")
>          else
>           DEBUG("Low time: ", UDEC_(duration), " clocks")
> ```
>
> Is bit 31 of the duration genuinely supposed to contain the previous state (or is it
> meant to be readable through rdpin())? When I run this, I get alternating durations, but
> no state changes are recorded (obviously they must be actually changing though — I get
> several durations reported and they're close to values I get when measuring time deltas
> with getct() from one pin state to the next with the I/O pin in "normal" mode. I'm using
> FlexSpin, in case this makes a difference.
>
> EDIT: Side note: I just looked in the FlexSpin sources and found the builtin function
> `_rdpinx()` which returns two values and it works with some modification to the above
> sources. Since rdpin() doesn't seem to return the C flag however, I'm still not sure if
> this is a FlexSpin-ism or if there's something in the example that needs to be changed.

---

## 2. Short Answer

- **Yes** — bit 31 of `RDPIN()`'s result is *genuinely* supposed to hold the smart pin's C
  flag, which for `P_STATE_TICKS` means "previous state was high (1) / low (0)."
- The example is **correct as written for the official Parallax Spin2 language** (the PNut
  and PNut-TS interpreters).
- It fails under **FlexSpin** because **FlexSpin's `RDPIN()` does not fold the C flag into
  bit 31**. FlexSpin returns only the raw 32-bit Z value and exposes the C flag separately
  via its non-standard builtin `_rdpinx()`. **This is a FlexSpin-ism.** The example does not
  need to change for official Spin2.

---

## 3. Ground Truth — the Interpreter Source

The official Spin2 bytecode interpreter (`REF-V52A/Spin2_interpreter.spin2`, which is
identical to the v55 interpreter) implements `RDPIN`/`RQPIN` as follows:

```
1102  rdpin_    rdpin  x,x  wc      ' read smart-pin Z-value into x; capture smart-pin flag into C
1103  rqpin_    rqpin  x,x  wc
1104        _ret_ bitc  x,#31       ' write the C flag into bit 31 of x, then return/push x
```

(`REF-V52A/Spin2_interpreter.spin2:1102-1104`)

Mechanism, step by step:

1. `rdpin x,x wc` — reads the smart pin's 32-bit Z result into `x` **and** captures the
   smart pin's mode-dependent flag into the **C** flag (because of `WC`).
2. `bitc x,#31` — overwrites **bit 31 of `x`** with the value of the **C** flag.
3. `x` is pushed as the method's return value.

So the returned long is: **bit 31 = C flag**, **bits 0..30 = low 31 bits of the Z result**.
The measurement's original bit 31 is destroyed by design — hence the example's
`duration &= $7FFFFFFF` to recover the true count. This is exactly the documented contract.

This confirms the P2 Knowledge Base `RDPIN` entry ("32-bit result with bit 31 containing the
pin's C flag state") against the interpreter source — not just against the KB.

## 4. What the C Flag Means for P_STATE_TICKS

Smart pin mode `%10000` = `P_STATE_TICKS` ("Time A-input state durations"):

- On **every** A-input transition, the smart pin latches the **duration of the state that
  just ended** into Z, raises IN, and sets its output flag to the **type of that state**.
- **C flag = previous state: 1 = was high, 0 = was low.** (Silicon-level behavior; see the
  smart-pin timing docs and the PASM idiom `rdpin d,#pin wc` / `if_c` / `if_nc`.)

Therefore `was_high := (duration >> 31) & 1` is the correct, intended way to read the
state type in Spin2 — *on a compiler that honors the bit-31 convention.*

## 5. Why It Fails Under FlexSpin

FlexSpin (Eric Smith / Total Spectrum) is an independent Spin2 compiler with its own
runtime. Its `RDPIN()` returns the **raw** 32-bit Z value with **no C-flag folding**. For
`P_STATE_TICKS`, the durations the user is seeing are small (well under 2^31), so bit 31 of
the raw value is always 0 → `was_high` is always 0 → the code always prints "Low time" and
"no state changes are recorded." That matches the reported symptom precisely.

FlexSpin instead provides `_rdpinx(pin)`, a **non-standard** builtin that returns *two*
values (the Z result **and** the C flag separately). The user's own fix using `_rdpinx()`
confirms the diagnosis: FlexSpin chose a two-value API rather than overloading bit 31.

**Bottom line:** the discrepancy is a deliberate FlexSpin design difference from the official
Spin2 language, not a bug in the example.

## 6. Recommendations

1. **No change required for the example's correctness** under PNut / PNut-TS — it is a
   faithful, working demonstration of the official `RDPIN()` bit-31 contract.
2. **Optional portability note in the manual/example.** Since we publish for a mixed-compiler
   audience, consider a one-line caveat near this example, e.g.:

   > *Note: `RDPIN()`/`RQPIN()` return the smart pin's C flag in bit 31 of the result. This
   > is the official Spin2 behavior (PNut / PNut-TS). Some third-party compilers (e.g.
   > FlexSpin) do not fold C into bit 31 and instead expose it through a separate builtin
   > such as `_rdpinx()`.*

3. **PNut-TS itself:** no action. PNut-TS emits `bc_rdpin` and runs the same interpreter,
   so the example works as written; there is no PNut-TS defect here.

## 7. Note on the P2KB P_STATE_TICKS Example (separate, minor)

While auditing, note the P2KB `p2kbArchSmartPin10000TimeAStates` Spin2 example calls
`rdpin(pwm_pin)` **multiple times per iteration** (`if rdpin(...) & $80000000` then
`rdpin(...) & $7FFFFFFF`). Because each `RDPIN` **acknowledges and advances** the smart pin,
those are two different measurements — a latent bug in *that* KB example. The user's p.199
example does it correctly (reads once into `duration`, then extracts bit 31 and masks). Flag
for a future P2KB fix; out of scope for this report.

---

## Sources

- `REF-V52A/Spin2_interpreter.spin2:1102-1104` — `rdpin x,x wc` + `bitc x,#31` (ground truth)
- `REF-V52A/Spin2_interpreter.spin2:927-928` — `bc_rdpin` / `bc_rqpin` bytecode dispatch
- P2KB `p2kbArchSmartPin10000TimeAStates` — P_STATE_TICKS mode: "C flag = previous state
  (1=was high, 0=was low)"
- P2KB `p2kbSpin2Rdpin` — RDPIN returns bit 31 = C flag (now cross-checked vs source)
- User's own finding: FlexSpin `_rdpinx()` two-value builtin
