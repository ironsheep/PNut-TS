# Forum Analysis — WAITSEx `WC` flag behavior without a preceding SETQ

**Date captured:** 2026-07-04
**Source:** Parallax forums, thread posts #2300–#2304 (evanh, TonyB_)
**Relevance to PNut-TS:** documentation / silicon-semantics question — **not** a compiler codegen defect. See analysis §2.

---

## 1. Verbatim thread capture

> **evanh — 2026-07-02 03:43 (#2300)**
> Chip,
> What happens to C flag when issuing WAITSE1 WC without the required preceding SETQ?
> Does it use whatever is in Q register as a timeout?
> Or does it not do the timer and do nothing with C flag?
> Or does it always set or clear C?
>
> Testing suggests that it's the last option: No timer and always clears C.

> **TonyB_ — 2026-07-02 13:55 (#2301)**
> If the optional SETQ is missing then WAITSEx WC/WZ/WCZ will clear C or Z or both, assuming the event happens. I have used WAITSEx WCZ as a convenient way of clearing C and Z "for free" in time-critical code.

> **evanh — 2026-07-02 17:16 (#2302)**
> As far as I can see, the way the docs are written, this is undocumented behaviour. When using the WC modifier, I'd still class SETQ as required, not optional. Of course, if Chip should decide to change the docs to say both abilities are as intended, then SETQ becomes optional.
> PS: Hehe, I rewrote this four times to make it flow.

> **TonyB_ — 2026-07-03 03:48 (#2303)**
> For WAITSEx the instructions spreadsheet says *Prior SETQ sets optional CT timeout value* which tells me SETQ is optional. For RDLONG it says *Prior SETQ/SETQ2 invokes cog/LUT block transfer* so *Prior* must mean the instruction before in both cases. HTH

> **evanh — 2026-07-03 05:16 (#2304-a)**
> What!? SETQ is required to activate that timeout feature. Just like SETQ is required to activate the block copy.
> Anyway, that wasn't even my point. I was talking about when WC modifier is used. It is only intended, as the docs are written, for timeout feature. Which also requires SETQ to work.
> Arguably the docs are just incomplete. But then Chip should update them.

> **TonyB_ — 2026-07-03 06:41 (#2304-b)**
> My testing gave same results as yours: if no SETQ and event happens then WC/WZ/WCZ will clear C/Z/CZ.

---

## 2. Analysis

### Q1 — What are they talking about?

The `WAITSEx` family (`WAITSE1..4`) waits for a selectable event flag, clears it, and resumes.
It has an **optional timeout** feature: if you execute a `SETQ` with a future System-Counter
target *immediately before* the `WAITSEx`, the wait will abort when the counter reaches that
target. The `WC`/`WZ`/`WCZ` effect then reports **which happened first**:

- **timeout reached first → C/Z set (1)**
- **event occurred first → C/Z cleared (0)**

The question is a corner case: what does `WC` do when there is **no** preceding `SETQ` (so no
timeout is armed)? Three hypotheses were floated; both evanh's and TonyB's on-silicon testing
land on the same answer:

> With no `SETQ`, there is no timer. When the event occurs (which it always does, since nothing
> can time out), `WC`/`WZ`/`WCZ` **clears** C/Z. TonyB exploits this as a "free" clear of C and Z
> in time-critical code.

This is consistent with the P2KB entry for `WAITSE1`, which states the flag is *"cleared (0) if
the event occurred first"* and that the WC/WZ/WCZ effect is *"recommended only with timeout
specified."* With no timeout armed, the event is by definition always "first," so the flag always
clears. The behavior is real and self-consistent — the dispute is only whether the **docs**
describe it (evanh: undocumented/incomplete; TonyB: reads it as intended/optional).

### Q2 — Does it inform anything we're doing?

**No change to the compiler.** This is P2 *silicon runtime* behavior (flag state after a wait),
not something PNut-TS models or enforces:

- PNut-TS encodes `WAITSE1 {WC|WZ|WCZ}` as a no-operand poll/wait instruction
  (operand format 28 — "moves S to D, sets S to $024"). The `WC`/`WZ`/`WCZ` bits are encoded in
  the CZ field exactly as written by the programmer.
- The `SETQ`-immediately-before pairing is **not** tracked, required, or validated by the
  compiler for `WAITSEx` (just as it isn't for the `RDLONG`/block-transfer `SETQ` pairing). The
  compiler emits whatever the programmer writes; the silicon decides what the flags mean.
- Therefore there is **no code path in PNut-TS that this thread contradicts or exposes.** Nothing
  to fix, gate, or warn on. (A "you used `WC` without a preceding `SETQ`" lint would be a *new
  opinionated feature*, and given TonyB's deliberate free-clear idiom, it would produce false
  positives — not recommended.)

Where it *could* touch us: **our documentation**. Our Theory-of-Operations / P2KB-facing docs
should describe the no-SETQ case accurately (event-always-first → flag clears) so we don't
propagate the "undocumented" gap evanh is complaining about. The P2KB entry we already serve is
essentially correct on this point.

### Q3 — Can we offer a solution?

We can't change silicon or the official docs (that's Chip's call, as evanh notes). What we *can*
offer:

1. **A precise doc statement** (for our internals docs / a P2KB clarification note):
   *"`WAITSEx {WC|WZ|WCZ}` with no preceding `SETQ`: no timeout is armed, so the event always
   satisfies the wait 'first' and C/Z are **cleared** (0). Setting C/Z (=1) is only reachable via
   the `SETQ`-armed timeout path. Clearing C/Z this way is a documented-if-you-read-it side
   effect that some code uses as a free flag clear."*
2. **No compiler change recommended.** Explicitly record that we considered a SETQ-pairing lint
   and rejected it (legitimate free-clear idiom).

### Q4 — Is there testing / code we can run to answer this?

**Partially — with an important limit.** PNut-TS is a *compiler*, not a P2 emulator, so it cannot
observe runtime C/Z flag state. The flag-behavior question was answered the only way it can be:
on real silicon (which both evanh and TonyB did, agreeing).

What PNut-TS *can* verify:
- That `WAITSE1 WC` (and WZ/WCZ, and SE2/3/4) **compile and encode** correctly, with the CZ
  effect bits set, and **without** requiring a preceding `SETQ`. This confirms the compiler
  imposes no pairing rule — consistent with the silicon treating SETQ as optional.

What PNut-TS **cannot** do:
- Determine the resulting C flag value at runtime — that requires actual P2 hardware or a
  cycle-accurate emulator. Not in scope for this project.

**Bottom line:** the members are correct and their testing is authoritative for the runtime
answer; our only actionable item is documentation accuracy, and the entry we serve is already
substantially right.
