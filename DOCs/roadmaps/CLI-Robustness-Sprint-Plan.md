# CLI Robustness Sprint Plan

Three related robustness defects in the PNut-TS command-line contract, all
sharing one theme: **the compiler currently fails silently and leaves a
misleading result behind.**

1. Preprocessor diagnostics — including `#error` / `#warn` — are invisible
   and non-fatal.
2. A compile error is printed twice, and colored with ANSI escapes that
   downstream tools cannot filter.
3. A failed build leaves the previous build's output artifacts in place,
   so the next tool in the chain consumes stale bytes.

## Sprint execution record

Filled in at `sprint-start`; the plan itself was authored earlier.

| Item | Value |
|---|---|
| **Outgoing build** | **1.55.2** (patch bump from 1.55.1) |
| Version locations | `package.json:3`, `package-lock.json`, `src/pnut-ts.ts:31` — all three must move together |
| Started | 2026-08-07 |
| Branch | `sprint/cli-robustness` |
| Working-tree audit | Clean at start; no uncommitted edits, no untracked files in `src/`, `TEST/`, `jest-config/`, `DOCs/` |
| Container mode | Regression Mode (verified via `npm run cov-chk`) |

### Entry baseline (measured 2026-08-07)

**Build:** clean, **0 warnings** (`npm run build`).

**Standard regression suite** (`jest --runInBand -c smm.jestconfig.js`):
**276/276 passing**, 17 suites, exit 0. No `.skip` / `xit` / `xdescribe`
anywhere in `src/tests/`. The known `TOF/demo_180degrFOV.spin2`
environmental timeout did not trigger on this run.

**Runner-coverage gap — the significant finding.** `smm.jestconfig.js`
enumerates 17 explicit `roots`, and **9 test suites are outside it**, so
`npm test` never runs them:

```
CACHE-tests  COV-tests  EXCEPT-tests  FULL/preproc  FULL/resolver
LANG-FEAT-tests  PREPROC-tests  SHORT  WUMMI-tests
```

**`EXCEPT-tests` and `PREPROC-tests` are this sprint's two primary test
homes** (§9). A green `npm test` therefore says nothing about the suites
this sprint most affects. Measured separately: **133/137 passing**, 4
failures in 2 groups.

| Group | Tests | Cause | Disposition |
|---|---|---|---|
| **A — stderr pollution** | `PREPROC-tests/condCodeElse` | The captured `.errout` contains **only** Node `MaxListenersExceededWarning` text (11 error/close listeners on one `SyncWriteStream`), no compiler error. The runner treats any non-empty `.errout` as "Exception Generated". A harness artifact of running many compiles in one process under `--runInBand`. | **AGREED: fold into sprint** → §11 |
| **B — dedup parity divergence** | `WUMMI-tests/FG1`, `Main`, `Mustererkennung` | Real byte divergence, not EOL. PNut-TS's early-deduplication + distiller produce **smaller** objects than PNut (`OBJ bytes: 68_672` vs GOLD `68_780`) and a three-line savings summary where PNut's GOLD has one line. `.bin` differs accordingly (79_617 vs 79_629). A PNut-TS-only optimization diverging from PNut GOLDs. | **AGREED: defer** — out of scope, needs its own investigation |

Group A is recommended for folding in because it pollutes **exactly the
stderr-capture path** that §7 (single plain-text error output) changes and
§9 (`.errout.GOLD` fixtures) depends on — every new negative fixture would
inherit the same flakiness. Fix is small: stop re-attaching per-compile
listeners, or raise the cap on the shared stream.

Group B is recommended for deferral: it is an object-deduplication parity
question with no relationship to the CLI contract, and folding it in would
roughly double the sprint. It needs its own investigation — note the design
tension, since PNut-TS deliberately dedups harder than PNut, so *some*
divergence here is intended and the GOLDs may simply predate the feature.

**AGREED as a sprint deliverable** → §12: add `EXCEPT-tests` and
`PREPROC-tests` to `smm.jestconfig.js` roots. This sprint's entire
regression protection lives in those two suites; leaving them outside the
default suite means a future `npm test` would report green while this
sprint's guarantees silently rot.

**Exit-baseline assertion for closeout.** Health must be no worse than:
build clean / 0 warnings; standard suite 276/276 **plus** the newly-added
EXCEPT + PREPROC suites all green; Group A resolved; Group B still exactly
3 WUMMI failures and nothing new.

Patch level is the right tier per the project's `Major.PNutVersion.Patch`
convention: this sprint changes no PNut-version-defined language behavior,
so only the rightmost digit moves. Note that §4 still carries a **behavior
break** for sources with malformed directives — flagged to Stephen at plan
time, and shipping at patch level is his decision.

## Scope

In scope: items 1–3 above, their test fixtures, and the documentation that
describes the affected behavior.

Out of scope, explicitly: the multi-error collection architecture described
in `DOCs/roadmaps/Multi-Error-Reporting-Compiler-Roadmap.md`. That roadmap
covers the ~291 `throw new Error()` sites in `spinResolver.ts` and is
unrelated work. This sprint keeps the compiler fail-fast. §1 does introduce
an emit-at-detection diagnostic path in the *preprocessor* only, which
happens to be a small down-payment on that roadmap's goals, but no
`spinResolver.ts` behavior changes here.

## Reference-parity ground truth

The original PNut **does** have a preprocessor, implemented in the x86 core
(`REF-V52A/p2com.asm`), not in the Pascal units. Its directive table
(`p2com.asm:20091-20102`) is exactly eight directives:

```
DEFINE  UNDEF  IFDEF  IFNDEF  ELSEIFDEF  ELSEIFNDEF  ELSE  ENDIF
```

plus the built-in symbols `__PNUT__` and `__DEBUG__`.

**`#ERROR`, `#WARN`, `#INCLUDE`, and `#PRAGMA EXPORTDEF` do not exist in
PNut.** They are PNut-TS extensions. So for those four, we have no parity
constraint and are free to choose semantics and wording — but for the eight
that *are* shared, PNut's diagnostics are the parity target.

PNut has exactly four preprocessor error messages (`p2com.asm:3628-3639`),
all fatal via `set_error`:

| PNut message | Covers | Our section |
|---|---|---|
| `Expected #ENDIF` | Unterminated `#IFDEF`/`#IFNDEF` at EOF | §3b |
| `Limit of 8 nested #IFDEF/#IFNDEFs exceeded` | Nesting depth cap | §3c |
| `Must be preceeded by #IFDEF or #IFNDEF` | All six of Group B | §4 |
| `Expected a preprocessor symbol` | The missing-symbol sites of Group A | §4 |

Two divergences this exposes, both confirmed against current code:

- **PNut-TS does not enforce the 8-level nesting limit.** There is no depth
  check anywhere in `spinDocument.ts`; the state is an unbounded
  `PreProcState[]` (`spinDocument.ts:125`). PNut errors at 9 levels.
  **Not a defect** (D11) — the preprocessor is compiler-local, so its depth
  is ours to set.
- **PNut-TS does not define `__PNUT__`.** Deliberate: it defines
  `__PNUT_TS__` (`spinDocument.ts:1061`) alongside `__propeller__`,
  `__P2__`, `__propeller2__`, `__DATE__`, `__FILE__`, `__TIME__`. No action;
  recorded so it is not "fixed" by mistake later.

### The superset principle

PNut-TS is by design a **superset** compiler. The parity contract is
one-directional:

> Everything PNut can compile, we compile identically.
> We are *not* required to reject everything PNut rejects.

The 8-level nesting cap fails that test as a parity requirement. It is an
implementation artifact, not a language rule — `p2com.asm:3463` stores the
entire nesting state as 8 nibbles in the 32-bit `edx` register:

```
xor  edx,edx      ;reset preprocessor stack (8 nibbles/levels)
```

The limit is what fit in a register on 1990s-era x86. PNut-TS has no such
constraint, so importing the number would import the constraint that
produced it.

**Verified empirically** (v1.55.1, `dist/`): 12- and 40-level nests compile
correctly, and correctly *exclude* — a 12-level nest with level 7 undefined
properly excludes the innermost `CON` assignment, confirmed both in
`__pre.spin2` output and by the undefined-symbol error at the reference
site. Deep nesting is not merely tolerated; inclusion and exclusion are
depth-agnostic and work as intended.

### Language rule vs compiler-local feature

The right test is **not** "does PNut have an error message for it." It is:
*does the wider Spin2 community treat this as part of the language?*

**Symbol naming is language.** The 30-character limit is honored across
community compilers because symbol identity governs what source text
*means* — compilers must agree or code stops porting. PNut-TS therefore
**enforces** it: `spinElementizer.ts:846-852`, PNut's exact error text
`Symbol exceeds 30 characters`, GOLD coverage at
`TEST/EXCEPT-tests/symbol_length_test_30max.spin2`.

> An earlier draft of this plan claimed PNut-TS did *not* enforce the
> 30-character limit, citing `CLAUDE.md`. That was wrong — the `CLAUDE.md`
> passage was stale and has been corrected. PNut-TS has enforced it since
> the limit was added to the elementizer.

**The preprocessor is not language.** It is a per-compiler feature, and the
proof is in this document: PNut implements 8 directives, PNut-TS implements
12, FlexSpin implements a different set again with C-style valued
`#define`s. If the preprocessor were part of the Spin2 specification, our
four extra directives would themselves be a violation — and no one treats
them as one. A feature whose directive set legitimately varies per compiler
cannot have a specified nesting depth.

So the 8-level cap is PNut-local, and PNut-TS is free to exceed it. The two
limits are not symmetric, and the consistency argument between them does not
hold.

**Applies to capacity, not correctness.** This exemption covers *limits*
only. Where PNut and PNut-TS share a construct, PNut's diagnostics and
semantics remain the parity target (D10) — being a superset means accepting
more, never behaving differently on what both accept.

**Applied deliberately, not case-by-case.** Every *other* new fatality in
this plan survives the principle, because each is either a case PNut also
rejects (Group A, Group B, unterminated `#ifdef`, bare directives, unknown
directive) or governs a PNut-TS-only extension where we set the rules
(`#error`, `#warn`, `#pragma`, language-version). The nesting cap was the
only decision resting on "PNut rejects it, so we should too."

**Future idea, not sprint scope.** Portability checking is a legitimate want
— someone shipping source to PNut users would like to know their 12-level
nest, 35-character symbol, or `#INCLUDE` will not build there. The right
shape for that is a coherent `--pnut-compat` lint mode covering the whole
class at once, not one-off hardcoded caps. Recorded here so the idea is not
lost; explicitly out of scope for this sprint.

> **P2KB caveat.** The `p2kbSpin2PreprocessorOverview` entry (index 3.5.0)
> states the whole directive set — including `#ERROR`, `#WARN`, `#INCLUDE`,
> and `#PRAGMA EXPORTDEF` — is "Available in PNut/pnut_ts v47 and later
> compilers." That overstates PNut, which has only the eight above. The
> entry's "maximum nesting 8 levels" claim is correct for PNut and
> currently false for PNut-TS. Worth feeding back to the KB.

## Decisions taken

Recorded so they can be vetoed on reading rather than rediscovered in
execution.

| # | Decision | Rationale |
|---|---|---|
| D1 | Fix the whole preprocessor diagnostic class (all 18 `reportError()` sites), not just `#error`/`#warn` | All 18 share one defect and one mechanism; fixing 2 leaves 16 identical holes |
| D2 | `-i` intermediate `*__pre.spin2` is **kept** on a failed build | It is opt-in diagnostic output, not a build product — GCC keeps `-save-temps` output on failure for exactly this reason |
| D3 | Output cleanup fires only on a nonzero exit that occurred **after** a source file was resolved | Arg-level failures (missing filename, file not found) never establish a target; deleting a same-named prior artifact there would be surprising |
| D4 | Delete-on-failure, not delete-at-start | Preserves the last-good artifact when the invocation fails on a typo or bad arguments |
| D5 | Strip ANSI color from **all** logger channels | Lets external tools and filters colorize; tests already expect plain text, so no GOLD churn |
| D6 | Preprocessor errors are emitted **at detection time**, fatality is decided at end of `preProcess()` | Reports every preprocessor error in one run rather than only the first, without abandoning fail-fast: nothing proceeds to compile |
| D7 | `#error` alone throws immediately rather than deferring to end of pass | `#error` is a deliberate author-placed stop; "abort here" is its meaning |
| D8 | A single surrounding pair of matching quotes is stripped from `#error`/`#warn` message text | `DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md` documents the quoted form throughout; echoing the quotes back is noise |
| D10 | For the eight directives PNut also has, adopt PNut's exact error wording | Parity is this project's whole premise; a user moving between compilers should see the same diagnostic. Includes PNut's spelling `preceeded` — matched verbatim rather than silently corrected |
| D11 | **Do not** enforce PNut's 8-level nesting limit — no error, no warning | The preprocessor is not part of the Spin2 language; its directive set differs per compiler, so its nesting depth is implementation-defined. Contrast the 30-character symbol limit, which the whole community treats as spec and which we **do** enforce. See "Language rule vs compiler-local feature" below |
| D9 | Negative preprocessor fixtures live in `TEST/EXCEPT-tests/`, not `TEST/PREPROC-tests/` | The PREPROC runner requires `.pre`/`.lst`/`.bin` to exist for every fixture and never compares `.errout` to GOLD; the EXCEPT runner is GOLD-driven and handles artifact-free failures already |

---

## 1. Preprocessor diagnostic infrastructure

### Why

`SpinDocument.reportError()` (`src/classes/spinDocument.ts:297`) pushes every
preprocessor diagnostic into a private `errorsfound[]` array. The only reader
is `dumpErrors()` (`spinDocument.ts:839`, called once at `spinDocument.ts:798`),
which emits through `logMessage()` — gated behind `logOptions.logPreprocessor`,
a debug-only flag. The public `errors` getter (`spinDocument.ts:308`) has
**zero consumers** anywhere in `src/` outside tests.

Net effect: every preprocessor diagnostic in the compiler is invisible in
normal operation and affects neither the exit code nor artifact production.
Verified against dist v1.55.1.

### Target

Replace the accumulate-and-maybe-log model with an emit-at-detection model
carrying a severity:

- `reportError()` gains a severity parameter: `fatal` | `warning`.
- Every diagnostic is written immediately to **stderr** through
  `context.logger`, in source order, interleaved correctly with the
  surrounding preprocessing.
- Message format matches the existing `#include`-not-found precedent at
  `spinDocument.ts:646`:
  `<fileSpec>:<lineNumber>:error:<message>` and
  `<fileSpec>:<lineNumber>:warning:<message>`.
  Line number is 1-based (`sourceLineIndex + 1`), as `dumpErrors()` already
  does.
- A `fatal` diagnostic sets a per-document `hadFatalDiagnostic` flag but does
  not stop the pass — preprocessing continues so the author sees all errors
  in one run (D6).
- At the end of `preProcess()`, if `hadFatalDiagnostic` is set, throw a
  `PreprocessorError` (new named subclass of `Error`).
- `errorsfound[]`, the `errors` getter, and `dumpErrors()` are removed —
  they have no remaining purpose or consumers.

### Integration points

Three construction sites, each already has a correct propagation path:

| Site | Path today | Behavior with `PreprocessorError` |
|---|---|---|
| `src/pnut-ts.ts:485` (top-level source) | `try`/`catch` at 485-494 → `errorMsg` + `shouldAbort` + `return 1` | Catch must **not** re-print — §1 already emitted the diagnostic. Catch becomes: set `shouldAbort`, run cleanup (§8), return 1 |
| `spinDocument.ts:638` (`#include`) | Nested ctor throw propagates into parent's `preProcess()` | Propagates to top-level catch unchanged — an `#error` inside an included file aborts correctly, for free |
| `src/classes/compiler.ts:345` (child object) | Inside `Compile()`'s `try` → caught at `compiler.ts:140`, re-reported as `file:line:error:msg` via `compilerErrorMsg` | Must be recognized by type and re-thrown **without** re-reporting, or the diagnostic prints twice |

`src/classes/spinElementizer.ts:82` constructs an empty `SpinDocument('')`,
which never preprocesses — unaffected.

### Verification

- **Normal**: a clean source produces no preprocessor diagnostics and
  exit 0, unchanged.
- **Edge**: a fatal in an `#include`d file aborts the top-level build and
  names the *included* file and its own line number, not the includer's.
- **Edge**: a fatal in a child object (`OBJ` block) prints exactly once.
- **Edge**: multiple fatals in one file all print, in source order, before
  the build aborts.
- **Error**: fatal → exit 1, no artifacts (per §8).

---

## 2. `#error` and `#warn` correctness

### Why

Four distinct defects at `spinDocument.ts:613-623`.

**2a — No conditional-branch guard.** Neither directive is wrapped in the
`thisSideKeepsCode()` test that governs every other content-bearing
directive (`spinDocument.ts:461, 476, 659, 757`). Both therefore fire from
inside a *dead* `#ifdef` branch — verified. This makes the documented
idiom in `Preprocessor-Usage-Guide.md:403` (`#error` in the fall-through
`#else` of a board-select chain) fire on **every** build regardless of which
board is selected.

**2b — Message text is mis-sliced.** Both use `currLine.substring(7)`:

```typescript
const message: string = currLine.substring(7);   // spinDocument.ts:616 and 621
```

`'#warn hello'.substring(7)` → `'ello'` — the first character of every
`#warn` message is dropped, unconditionally. And any leading indentation
shifts the slice: `'  #error indented'.substring(7)` → `'r indented'`. Both
verified in Node.

**2c — Not visible, not fatal.** Covered by §1's mechanism.

**2d — Quotes echoed.** The guide documents `#error "message"` throughout;
the implementation passes the quotes into the message text.

### Target

- Extract the message with the capture group of the matching regex rather
  than a fixed offset — immune to both indentation and directive length.
- Strip one surrounding pair of matching quotes if present (D8).
- Guard both with `thisSideKeepsCode() || !inIfDef()`, matching
  `spinDocument.ts:461`.
- `#error` → emit `…:error:<message>`, then throw `PreprocessorError`
  immediately (D7). Exit 1, no artifacts.
- `#warn` → emit `…:warning:<message>`, continue, exit 0.
- Both are commented out of the preprocessed stream as today.

### Verification

- **Normal**: `#error "msg"` at top level → stderr line, exit 1, no
  `.bin`/`.lst`/`.obj`. `#warn "msg"` → stderr line, exit 0, artifacts
  written.
- **Edge**: both inside a *dead* `#ifdef` branch → completely silent,
  exit 0, artifacts written. This is the headline regression.
- **Edge**: both inside a *live* branch → fire normally.
- **Edge**: indented `  #error msg` → message text is exactly `msg`.
- **Edge**: `#warn hello` → message is `hello`, not `ello`.
- **Edge**: two `#warn` then one `#error` → three lines, in order, exit 1.
- **Error**: bare `#error` with no message — see §3.

---

## 3. Malformed and bare directives

### Why

Every directive regex requires trailing whitespace — e.g.
`/^\s*#error\s+/i` at `spinDocument.ts:613`. A directive written with **no
argument** fails that match and falls through the whole `else if` chain to
`spinDocument.ts:688`:

```typescript
} else if (currLine.match(/^\s*#-*[0-9%$]+\s*,*|^\s*#_*[A-Za-z_]+\s*,*/)) {
  // ignore these enumeration starts, they are not meant to be directives
```

The second alternative matches `#` followed by letters — legitimate Spin2
`CON` enum-start syntax, but it also silently swallows a bare `#error`,
`#define`, `#ifdef`, `#ifndef`, `#include`, `#warn`, or `#pragma`. A bare
`#error` on its own line does nothing at all today and never reaches
`spinDocument.ts:617`.

Separately, there is **no check for an unterminated `#ifdef`** — a
conditional never closed by `#endif` simply ends at EOF, silently, with the
rest of the file's inclusion state decided by a block the author never
closed.

### Target

**3a — Bare-directive detection.** Immediately before the enum-start branch,
test whether the leading `#token` (case-insensitively) *exactly* equals a
known directive name:
`define|undef|ifdef|ifndef|elseifdef|elseifndef|else|endif|error|warn|include|pragma`.
If it does, it is a malformed directive → fatal diagnostic
`#<name> is missing its argument`. Otherwise fall through to enum handling
exactly as today.

This is an exact-token test, not fuzzy matching, and introduces **no** new
risk to valid Spin2 enums: those exact tokens are already claimed as
directives by the case-insensitive regexes above, so no currently-working
`#ENUMBASE` line changes meaning. `#else` and `#endif` legitimately take no
argument and are matched by `/^\s*#else\s*/i` and `/^\s*#endif\s*/i` before
this point, so they never reach the check.

**3b — Unterminated conditional.** At the end of `preProcess()`, if
`inIfDef()` is still true, emit a fatal diagnostic naming the line of the
unclosed `#ifdef`/`#ifndef`. This requires the if-state stack to retain the
opening line index; add it if not already carried.

Message is PNut's exact wording (D10), `p2com.asm:3629`:

```
Expected #ENDIF
```

**3c — Nesting depth: no limit added (D11).** PNut caps at 8 levels; we do
not, and will not — the preprocessor is compiler-local, not language spec.
No code change. The work here is a **regression fixture locking deep nesting
in as supported behavior**, so a future change cannot quietly introduce a
cap, and covering deep *exclusion* correctness, which nothing currently
exercises below level 2. Placed in `TEST/PREPROC-tests/` as a positive
fixture (§9c).

### Verification

- **Normal**: a `CON` block using `#0`, `#1`, `#MYBASE` enum starts
  preprocesses exactly as today — byte-identical `.pre` output against the
  existing PREPROC GOLD files.
- **Edge**: bare `#error` → fatal, exit 1.
- **Edge**: bare `#define` / `#ifdef` / `#include` / `#warn` / `#pragma` →
  fatal, each naming the right directive.
- **Edge**: `#ifdef FOO` with no `#endif` → fatal `Expected #ENDIF` naming
  the `#ifdef` line.
- **Edge**: correctly nested `#ifdef`/`#else`/`#endif` → no diagnostic.
- **Edge**: 12 nested `#ifdef`s, all defined → compiles, innermost included.
- **Edge**: 12 nested `#ifdef`s with an intermediate level *undefined* →
  innermost correctly **excluded**. Testing only the all-defined case would
  pass even if deep exclusion were broken, so both halves are required.
- **Error**: `#endif` without `#ifdef` → fatal (§4, group B).

---

## 4. Classifying the remaining directive diagnostics

### Why

The 18 `reportError()` sites are not uniform in severity. Classification,
with the reasoning for each group.

**Group A — malformed directive → fatal (5 sites)**

| Line | Message |
|---|---|
| 469 | `#define is missing symbol name` |
| 489 | `#undef is missing symbol name` |
| 536 | `#directive is missing symbol name` (`#ifdef`/`#elseifdef`) |
| 586 | `#directive is missing symbol name` (`#ifndef`/`#elseifndef`) |
| 681 | `#pragma <cmd> is missing symbol name` |

Unambiguous source syntax errors. Note that on these paths the offending
line is *not* commented out, so the raw directive text currently flows into
the elementizer and produces a confusing downstream error instead. Comment
the line out on the error path as well, for a clean single diagnostic.

**Wording (D10).** The four sites covering directives PNut also has — 469,
489, 536, 586 — take PNut's exact message (`p2com.asm:3638`):

```
Expected a preprocessor symbol
```

This replaces `#define is missing symbol name`, `#undef is missing symbol
name`, and both `#directive is missing symbol name` strings. It also
resolves the "name the actual directive" wart, since PNut's wording does not
name one. Site 681 (`#pragma`) is a PNut-TS extension with no parity
constraint — keep a message that names the pragma, since `#pragma` takes a
command argument that PNut's generic wording would not explain.

**Group B — structural conditional errors → fatal (6 sites)**

| Line | Message |
|---|---|
| 498 | `#elseifdef found before #ifdef/#ifndef` |
| 540 | `#elseifdef without earlier #if*...` |
| 550 | `#elseifndef found before #ifdef/#ifndef` |
| 590 | `#elseifndef without earlier #if*...` |
| 598 | `#else found before #ifdef/#ifndef` |
| 607 | `#endif without earlier #if*...` |

This is the group that most justifies the sprint. A broken conditional nest
means **the wrong code was included or excluded** — it does not produce a
compile error the author would notice, it produces a clean successful build
of the wrong source. Plus §3b's unterminated-`#ifdef` check and §3c's
nesting limit.

**Wording (D10).** All six collapse to PNut's single message
(`p2com.asm:3635`):

```
Must be preceeded by #IFDEF or #IFNDEF
```

PNut's spelling of "preceeded" is matched verbatim, not silently corrected —
parity means a user grepping build logs across both compilers gets the same
hits. Worth a code comment so a future reader does not "fix" it.

**Group C — unsupported / unknown → fatal (2 sites)**

| Line | Message |
|---|---|
| 685 | `#pragma [<cmd>] UNSUPPORTED!` |
| 696 | `Unknown #directive: [<token>]` |

**Group E — non-fatal → warning (1 site here, plus `#warn` from §2)**

| Line | Message | Why warning |
|---|---|---|
| 479 | `#undef symbol [<sym>] not found` | Harmless and arguably legal — C specifies `#undef` of an undefined symbol as a no-op |

Groups D and F are §5 and §6.

### Target

Each site passes the severity above to the §1 `reportError()`. No other
logic changes beyond the two message-text improvements noted for Group A.

### Verification

One fixture per row above (see §9), each asserting: the exact stderr line,
exit 1 for fatal / exit 0 for warning, and artifact presence matching.

Plus the behavior-break check this group's fatality creates: run the **full**
275-test regression suite and confirm no existing fixture starts failing
because a previously-silent diagnostic is now fatal. Any that does is a
source that was silently compiling wrong and needs individual review — not
a reason to soften the severity.

---

## 5. Spin2 language-version diagnostic

### Why

`spinDocument.ts:1042`, inside `getVersionFromHeader()` — not the directive
loop, which is why it is easy to miss:

```typescript
this.requiredVersion = this.legalVersions.includes(possibleVersion) ? possibleVersion : 0;
if (possibleVersion != this.requiredVersion) {
  this.reportError(`ERROR: ${symbolMatch[0]}, ${possibleVersion} is not a legal Spin2 Language Version!`, index, 0);
}
```

Two defects beyond invisibility:

1. **Wrong line number.** `index` is the index into `headerComments[]`, not
   the source line index. Even once visible, this reports a meaningless
   line number.
2. **Silently compiles against the wrong language level.** On an illegal
   version, `requiredVersion` is set to `0` and compilation proceeds under
   the default version. A source that declares `{Spin2_v99}` compiles as if
   it had declared nothing.

The message also carries a redundant `ERROR: ` prefix that the §1 format
now supplies.

### Target

- Carry the true source line index alongside each header comment so the
  diagnostic can cite it; report it via §1.
- Severity fatal — compiling a source against a language level it did not
  ask for is exactly the silent-wrong-output failure this sprint exists to
  eliminate.
- Drop the redundant `ERROR: ` prefix.

`legalVersions` (`spinDocument.ts`) is the authority for what is legal and
already must be updated per PNut version — unchanged by this work.

### Verification

- **Normal**: `{Spin2_v55}` in the header → no diagnostic, compiles at v55.
- **Edge**: no version in the header → no diagnostic, default version.
- **Error**: `{Spin2_v99}` → fatal citing the **correct source line** of the
  header comment, exit 1, no artifacts.

---

## 6. Surfacing `#include` argument diagnostics

### Why

Two sites in `isolateFilename()` (`spinDocument.ts:963-982`):

| Line | Message |
|---|---|
| 975 | `Filetype [<ext>] NOT supported, must be .spin2` |
| 978 | `Unable to get filename from #include ... (missing quotes?)` |

Both report and return `undefined`. The caller at `spinDocument.ts:626`
then throws the generic
`Filename missing from #include statement (m631)`.

So these two are **already fatal and already visible** — the defect is only
that the specific, actionable diagnostic is swallowed and replaced by a
vague one. `Filetype [.txt] NOT supported` is much better than
`Filename missing`, which is not even accurate for that case.

### Target

Emit the specific diagnostic through §1 (fatal), and let the existing
`spinDocument.ts:626` throw path handle abort — or drop that generic throw
in favor of §1's end-of-pass throw, whichever leaves exactly one message.
No exit-code or artifact change; message text only.

### Verification

- **Error**: `#include "foo.txt"` → the filetype message, exit 1, printed
  exactly once.
- **Error**: `#include foo.spin2` (no quotes) → the missing-quotes message,
  exit 1, printed exactly once.
- **Error**: `#include "missing.spin2"` → the existing not-found message,
  unchanged.

---

## 7. Single plain-text error output

### Why

A compile error is reported twice, on two different streams:

```typescript
// src/classes/compiler.ts:148
this.context.logger.logMessage(`${compilerErrorText}`);          // → stdout, plain
// src/classes/compiler.ts:151
this.context.logger.compilerErrorMsg(compilerErrorText, underTestStatus);  // → stderr
```

And `Logger` wraps messages in ANSI escapes unconditionally:
`errorMsg()` (`logger.ts:22-25`) and `warningMsg()` (`logger.ts:52-55`) in
red/yellow, `compilerErrorMsg()` (`logger.ts:27-35`) in red except under
test. Colorizing at the source prevents downstream tools from filtering or
recolorizing, and makes the stdout/stderr copies differ.

### Target (D5)

- Delete the stdout duplicate at `compiler.ts:148`. The exception tests
  capture stderr only (`src/tests/EXCEPT-tests/pnut-ts-except.test.ts:66-76`),
  so this line is not captured by any test and its removal is safe.
- Remove the `errorColor` wrap from `compilerErrorMsg()` (`logger.ts:31`)
  and `errorMsg()` (`logger.ts:23`), and the `warningColor` wrap from
  `warningMsg()` (`logger.ts:53`). The now-unused `errorColor()`
  (`logger.ts:62`) and `warningColor()` (`logger.ts:67`) private helpers go
  with them.
- The `underTest` parameter of `compilerErrorMsg()` becomes vestigial once
  color is unconditional — remove it and its call-site argument rather than
  leaving a dead flag.
- `PNutInTypeScript.errorColor()` (`src/pnut-ts.ts:601`) is a separate
  duplicate of the same helper; check its callers and remove it if it
  becomes unused.

Result: one plain line per error, on stderr, for every channel — including
§1's new `#error`/`#warn` output.

### Verification

- **Normal**: a failing compile emits exactly one line, on stderr, with no
  ANSI bytes. Assert on the raw bytes, not the rendered string.
- **Edge**: stdout is empty of error text — a caller redirecting only
  stdout sees nothing about the failure.
- **Edge**: the 7 existing `.errout.GOLD` fixtures still match. They are
  already plain (`logger.ts:31` stripped color under test), so no GOLD
  churn is expected. **If a GOLD mismatch appears, the fix is in the code —
  GOLD files are never edited.**
- **Error**: arg-level errors (`Missing filename argument`,
  `does not exist or is not a .spin2 file`) also emit plain. These route
  through `errorMsg()` and are the paths most likely to reveal an
  unnoticed color dependency.

---

## 8. Delete output artifacts on failure

### Why

All artifact writes happen at the **end** of `Compile()`
(`src/classes/compiler.ts:137-139`): `P2List()` → `.lst`, `P2Map()` →
`.map`, `ComposeRam()` → `.bin`/`.obj`/`.flash`. All are inside the `try`.

Consequences, all confirmed:

- A failed build leaves the **previous** successful `.bin` in place — old
  bytes, old timestamp. Any `make`-style or scripted consumer downstream
  loads stale code onto hardware and debugs a binary that does not
  correspond to the source.
- A mid-sequence failure can leave a *fresh* `.lst` beside a *stale* `.bin`
  — actively misleading, since the listing and the binary disagree.
- `.map` is written through a `WriteStream` (`src/classes/mapGenerator.ts:49`)
  and can be left truncated.

GCC and `ld` unlink their output on failure for precisely this reason.

### Target

A single `cleanupOutputs()` in `src/pnut-ts.ts`, invoked on every nonzero
exit that occurs after a source file has been resolved (D3), deleting every
filespec this invocation could have produced. Missing files are not an
error.

**The filespec derivation is the tricky part** — it is spread across four
different rules and a `cleanupOutputs()` that only does
`filename.replace('.spin2', …)` would miss two of them:

| Artifact | Derivation | Source |
|---|---|---|
| `.lst` | `filename.replace('.spin2', '.lst')` | `pnut-ts.ts:506` |
| `.map` | `filename.replace('.spin2', '.map')` | `pnut-ts.ts:510` |
| `.flash` | `filename.replace('.spin2', '.flash')` | `pnut-ts.ts:508` |
| `.obj` | `listFilename.replace('.lst', '.obj')` | `spin2Parser.ts:497` |
| `.bin` / `.binary` | `listFilename.replace('.lst', '.' + binarySuffix)`, where `binarySuffix` is `bin` or `binary` per `-a` (`pnut-ts.ts:241`) — **overridden entirely by `-o <name>`**, which becomes `path.join(dirname(listFilename), outputFilename)` | `spin2Parser.ts:573-580` |
| `.binf` / `.binaryf` | same, with `f` appended, for the flash-loader variant | `spin2Parser.ts:575` |

Rather than duplicate these six rules in `cleanupOutputs()` — which would
drift the moment one of them changes — extract the derivations into a
single shared helper (e.g. `outputFilespecs(context, sourceFilename)`)
that both the writers and the cleanup consume. This is the "audit for a
shared component before writing a new one" case: two callers exist from day
one, so it is shared from the start, not refactored later.

`*__pre.spin2` (`spinDocument.ts:213`) is **not** deleted (D2).

Cleanup must fire on all four post-resolution failure exits:
`pnut-ts.ts:494` (preprocess throw — this is also §1's `#error` path),
`pnut-ts.ts:498` (invalid file), `pnut-ts.ts:581` (compile throw), and the
`shouldAbort` return at `pnut-ts.ts:594`. `run()`'s exit paths should be
consolidated so cleanup cannot be bypassed by a future early return.

Note `pnut-ts.ts:531` (missing filename argument) is a **pre**-resolution
failure and must *not* trigger cleanup, per D3.

### Verification

- **Normal**: a successful build writes all requested artifacts and deletes
  nothing.
- **Edge — the core case**: build successfully, then edit the source to
  fail, rebuild → the prior `.bin` is **gone**, not stale. This is the
  scenario the whole item exists for and needs an explicit test (§9).
- **Edge**: `-o custom.bin` → the custom-named binary is the one deleted.
- **Edge**: `-a` (`.binary` suffix) → the `.binary` is deleted.
- **Edge**: `-l -m -O -F` all together → every one of the six artifacts is
  removed.
- **Edge**: `-i` → `*__pre.spin2` **survives** the failure (D2).
- **Edge**: failing build with no prior artifacts → no error, exit 1
  normally.
- **Error**: `pnut-ts nosuchfile.spin2` → exit 1 and any same-named prior
  artifacts are **untouched** (D3).

---

## 9. Test scaffolding and fixtures

### Why

The existing suites cannot express these cases as they stand:

- **`TEST/PREPROC-tests/` cannot host negative fixtures.** The runner
  (`src/tests/PREPROC-tests/pnut-ts-preproc.test.ts:139-156`) requires
  `.pre`, `.lst`, and `.bin` to exist for every fixture and fails the test
  when they are missing — exactly what a correct `#error` now produces. It
  also writes `.errout` but never compares it to a GOLD.
- **`TEST/EXCEPT-tests/` can.** Its runner is GOLD-driven
  (`pnut-ts-except.test.ts:337-345`): it expects only those artifacts for
  which a `.GOLD` exists, so a fixture carrying only `.errout.GOLD` asserts
  only stderr. It does not require an exception to propagate — a `return 1`
  path works. Its second `describe` globs the complement of
  `{debug_,isp_,coverage_debug_}*.spin2` (`pnut-ts-except.test.ts:255`), so
  new fixtures are picked up with **no runner changes**.
- **But EXCEPT does not assert artifact *absence*** — it simply does not
  check for artifacts lacking a GOLD. Item 3 needs that assertion.
- **And EXCEPT wipes artifacts before each run**
  (`pnut-ts-except.test.ts:310-311`), so it cannot simulate a stale artifact
  from a prior good build.

### Target

**9a — Strengthen the shared EXCEPT runner.** Add the negative assertion:
when no `.bin.GOLD` / `.lst.GOLD` / `.obj.GOLD` exists for a fixture, assert
that the corresponding artifact does **not** exist after the run. This is
shared test scaffolding, and it converts all 7 existing EXCEPT fixtures into
regression coverage for §8 at no additional fixture cost.

**9b — Negative preprocessor fixtures** in `TEST/EXCEPT-tests/`, named
`pperr_*.spin2`, each with an `.errout.GOLD`. One per verification case in
§2, §3, §4, §5, and §6 — roughly: dead-branch `#error`, dead-branch `#warn`,
live `#error`, live `#warn`, indented `#error`, `#warn` first-character,
multi-diagnostic ordering, bare directives, unterminated `#ifdef`,
each Group A/B/C row,
`#undef`-not-found, illegal language version, both `#include` argument
errors, and an `#error` inside an `#include`d file.

The `.errout.GOLD` content for every fixture covering one of the eight
PNut-shared directives must carry PNut's exact message text (D10). These
GOLDs are authored by us, not generated on Windows — PNut cannot compile
fixtures using PNut-TS-only directives, and its diagnostics go to a GUI
rather than stderr. Note in the fixture comments that the *message text*
is the parity artifact, not the surrounding `file:line:error:` framing,
which is PNut-TS's own.

**9c — Positive fixtures** in `TEST/PREPROC-tests/`: a `CON` enum-start
source (`#0`, `#1`, `#MYBASE`) proving §3a does not disturb valid enums; a
well-formed `#warn` source proving warnings do not suppress artifacts; and a
**deep-nesting fixture** at 12 levels, in both the all-defined and
intermediate-level-undefined configurations — locking in D11 (we support
nesting beyond PNut's 8) and proving conditional logic stays correct below
level 2, which nothing currently covers. Both halves are required: an
all-defined test alone would pass even if deep exclusion were broken.
These produce artifacts, so the existing runner handles them.

**9d — A new artifact-cleanup suite**, `src/tests/CLEANUP-tests/`, with its
own `jest-config/jest-cleanup-only-config.json` and a `test-cleanup`
`package.json` script, following the existing per-category pattern. It is
the only suite that needs to *sequence* two compiles, so it is procedural
rather than GOLD-driven: compile a good source → assert `.bin` exists and
record its bytes → compile a failing variant to the same basename → assert
`.bin` is gone. Plus the `-o`, `-a`, `-i`-survives, and
pre-resolution-failure-does-not-clean cases from §8.

Any reusable helpers (artifact-absence assertion, two-phase compile) go in
`src/tests/testUtils.ts` alongside the existing shared helpers, not into
individual test files.

### Verification

- `npm run test-pre`, `npm run test-exc`, and the new `npm run test-cleanup`
  all pass.
- The full suite (`npm run build && jest --runInBand -c smm.jestconfig.js`)
  stays at its entry count with no new failures. The known
  `TOF/demo_180degrFOV.spin2` timeout on slower machines is the only
  accepted exception.

---

## 10. Documentation

### Why

`DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md` already
documents the *intended* semantics — line 251 onward describes `#error` and
`#warn`, and `DOCs/internals/Theory-of-Operations.md:99` states `#error`
"causes compilation to fail." The code has never done that. So the guides
are not wrong about intent; they are silent on the diagnostics this sprint
makes real, and their `#error`-in-`#else` example (line 403) only becomes
correct once §2a lands.

### Target

- **`DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md`** — add a
  diagnostics section: the `file:line:error:` / `file:line:warning:` output
  format, which conditions are fatal vs. warning (the §4 table), the exit
  codes, and the guarantee that a failed build leaves no artifacts. Confirm
  the `#error`-in-`#else` examples now describe real behavior.
- **`DOCs/internals/Theory-of-Operations.md`** — update the preprocessor
  section to describe emit-at-detection plus end-of-pass abort, replacing
  any description of the `errorsfound[]`/`dumpErrors()` model being removed.
- **`CHANGELOG.md`** (root — the release one) — entries for all three items.
  §4's new fatalities are a **behavior break** for sources that compile
  today and must be called out as such, not buried in a fix list.
- **CLI help** (`src/pnut-ts.ts:92-107`) — no option is added or changed by
  this sprint, so no help text changes. Confirmed rather than assumed.

- **Preprocessor guide, parity section** — the guide does not currently
  distinguish the eight directives PNut shares from the four that are
  PNut-TS-only (`#ERROR`, `#WARN`, `#INCLUDE`, `#PRAGMA EXPORTDEF`). That
  distinction matters to anyone writing portable source, and this sprint
  establishes it. Document the nesting difference here too as a
  **portability note**: PNut caps at 8 levels, PNut-TS has no cap, so a
  source nesting deeper than 8 will not build under PNut. We don't reject
  the source, but we do tell the user where it will and won't build.
- **`CLAUDE.md`** — already corrected during this planning pass: its
  "Symbol Name Length Limits" section claimed PNut-TS had no 30-character
  limit, which is stale. PNut-TS enforces it
  (`spinElementizer.ts:846-852`). No further work, recorded so the change
  is not a surprise in the sprint diff.
- **P2KB feedback** (outside this repo) — the
  `p2kbSpin2PreprocessorOverview` entry attributes all twelve directives to
  "PNut/pnut_ts v47+", which is wrong for PNut. Report with the
  `p2com.asm:20091-20102` citation.

`DOCs/language-specification/README.md` (the spec) covers the Spin2
language, not the CLI contract or the PNut-TS-specific preprocessor, so it
is not affected.

### Verification

Each document's claims are checked against the shipped behavior, not
against this plan — the guide's stated exit codes and message formats must
be reproduced from an actual run.

---

## 11. Test-harness stderr pollution

Folded in at sprint start from entry-baseline **Group A**.

### Why

`TEST/PREPROC-tests/condCodeElse.errout` contains no compiler error at all —
only repeated Node warnings:

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 error listeners added to [SyncWriteStream]. MaxListeners is 10.
```

The suites capture stderr by overriding `process.stderr.write` per test
(`pnut-ts-except.test.ts:66-76` and the equivalent in the PREPROC runner)
while the compiler attaches `error`/`close` listeners to the same shared
stream on each of many compiles in one `--runInBand` process. Past ten,
Node emits the warning **to stderr**, where the capture picks it up, and the
runner treats any non-empty `.errout` as "Exception Generated".

This belongs in this sprint rather than deferred: §7 rewrites the error
output path and §9 adds a set of new `.errout.GOLD` fixtures. Every one of
them would inherit this flakiness, and a spurious failure in a
freshly-authored fixture is far more expensive to diagnose than one in a
known-good suite.

### Target

Find the per-compile listener attachment and stop re-attaching to a stream
that outlives the compile — attach once, or detach on completion. Raising
`setMaxListeners` is the fallback only if a genuine one-listener-per-compile
design is required; it suppresses the warning without fixing the leak, so it
needs a comment saying why.

Whichever route, the `.errout` capture must contain **only** compiler
diagnostics. Consider having the capture ignore lines matching Node's
internal-warning shape as defense in depth, so unrelated future Node
warnings cannot break every negative fixture at once.

### Verification

- **Normal**: `npm run test-pre` fully green, `condCodeElse.errout` empty.
- **Edge**: the full PREPROC + EXCEPT suites run in one `--runInBand`
  process with no `MaxListenersExceededWarning` in any `.errout`.
- **Edge**: a compile that *does* emit a real diagnostic still captures it
  intact — the fix must not suppress genuine stderr.
- **Error**: with §9's new fixtures added (the largest `.errout` fixture
  count this suite has had), still no listener warnings.

## 12. Default-suite coverage for the sprint's test homes

Folded in at sprint start from the entry-baseline runner-coverage gap.

### Why

`smm.jestconfig.js` merges `old.jestconfig.json` with
`jest-config/jest-coverage-config.json`, whose `roots` array names 17
directories explicitly. Nine suites are absent, so `npm test` never runs
them — among them **`EXCEPT-tests` and `PREPROC-tests`**, which §9 makes
this sprint's primary regression homes.

Leaving them out means the default suite reports green while every
guarantee this sprint establishes goes unchecked. An explicit-list runner
that drifts behind the test files is the most invisible kind of skip:
the tests show up as neither pass nor fail, just absent.

### Target

Add `<rootDir>/dist/tests/EXCEPT-tests/` and
`<rootDir>/dist/tests/PREPROC-tests/` to the `roots` array in
`jest-config/jest-coverage-config.json`. This must land **after** §11, or
the default suite immediately goes red on the Group A artifact.

The other seven uncovered suites (`CACHE-tests`, `COV-tests`, `FULL/*`,
`LANG-FEAT-tests`, `SHORT`, `WUMMI-tests`) are **deliberately left out of
this change** — `WUMMI-tests` carries the deferred Group B failures and
would turn the default suite red, `COV-tests` requires Coverage Mode, and
the rest are outside this sprint's remit. Their absence is now documented
rather than accidental, which is the actual improvement.

### Verification

- **Normal**: `npm test` runs 19 suites and is green, with the EXCEPT and
  PREPROC test counts added to the 276.
- **Edge**: the count increase matches what those two suites report when
  run standalone — no tests silently dropped by a `testMatch` mismatch.
- **Error**: deliberately break one new `.errout.GOLD` and confirm `npm
  test` now catches it. Without this check we have not actually proven the
  suites are wired in.

## Notes for execution

- **Order.** §11 early — it unblocks trustworthy `.errout` fixtures for
  everything else, and §12 depends on it. §1 next: §2 through §6 all depend
  on its severity mechanism. §12 last of the test work, once the suites it
  adds are green.
- **Order (original).** §1 first — §2 through §6 all depend on its severity mechanism.
  §7 is independent and can land at any point. §8 depends on the shared
  filespec helper but nothing else. §9's runner strengthening (9a) should
  land before the fixtures that rely on it. §10 last, verified against
  shipped behavior.
- **The behavior break in §4 is the one thing to watch.** Groups A, B, and C
  turn silently-tolerated malformed directives into hard failures. The
  regression suite is the safety net, and a full-suite run is the gate.
- **GOLD files are never edited.** If §7 or §4 produces a GOLD mismatch, the
  compiler code is what changes.
