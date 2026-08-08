# Preprocessor Symbol Correctness Sprint Plan

The CLI-Robustness sprint (v1.55.2) made the preprocessor's **diagnostics**
correct. It did not touch the preprocessor's **symbol table**, and a plain
question from Stephen — *"which predefined symbols does PNut-TS emit?"* — walked
straight into a cluster of defects there.

Every one is the same shape as the last sprint's theme: **the symbol table
quietly does the wrong thing and the build succeeds anyway.**

Seven of the eight findings below were discovered by *asking the compiler*, not
by reading it. Each was reproduced against the shipping 1.55.2 binary before
being written down, and the reproduction is recorded in the section.

## Sprint execution record

Filled in at `sprint-start`; the plan itself was authored earlier the same day.

| Item | Value |
|---|---|
| **Outgoing build** | **1.55.3** (patch bump from 1.55.2) |
| Version locations | `package.json:3`, `package-lock.json` (two fields), `src/pnut-ts.ts:33` — all move together |
| Started | 2026-08-08 |
| Branch | **`main`** — this repo does not branch (see `CLAUDE.md`) |
| Working-tree audit | Clean; no uncommitted edits, no untracked files in `src/`, `TEST/`, `jest-config/`, `DOCs/`, `scripts/`; `main` in sync with `origin/main` |
| Container mode | Regression Mode (verified via `npm run cov-chk`) |
| Tracking board | Empty — 0 tasks, 0 context keys; left clean by the CLI-Robustness closeout |

Patch tier is correct per `Major.PNutVersion.Patch`: this sprint changes no
PNut-version-defined language behavior, so only the rightmost digit moves. §2
and §3 carry behavior breaks, shipping at patch level with Stephen's agreement —
the same call made for v1.55.2 §4.

### Entry baseline (measured 2026-08-08, at `3846a97`)

**Build:** clean, **0 warnings** (`npm run build`).

**Skips:** none. `.skip` / `xit(` / `xdescribe(` across `src/tests/` returns only
five `process.exit(` false positives.

**Default suite** (`npm test`): **320/320 passing, 20 suites**, exit 0.

**Runner coverage — 26 suite directories exist; the default runner enumerates
20.** Six sit outside it. Three of those had **no recorded baseline before this
sprint** and were measured here:

| Suite | Result | Status |
|---|---|---|
| `CACHE-tests` | **59/59** | ✅ green — *newly recorded* |
| `LANG-FEAT-tests` | **11/11** | ✅ green — *newly recorded* |
| `SHORT` | **2/2** | ✅ green — *newly recorded* |
| `WUMMI-tests` | 3 failed / 46 passed | ⚠️ known Group B, deferred since v1.55.2 |
| `FULL` (`jest-full-config`) | 4 failed / 27 passed | ⚠️ known — punch-list items 2 and 9 |
| `COV-tests` | not measurable | requires Coverage Mode; excluded by design |

**Total measurable in Regression Mode: 392 passing** (320 + 59 + 11 + 2), plus
WUMMI's 46 and FULL's 27 within their failing suites.

### Failure groups and dispositions

| Group | Tests | Cause | Disposition |
|---|---|---|---|
| **A — WUMMI dedup parity** | `FG1`, `Main`, `Mustererkennung` | PNut-TS's early-deduplication + distiller produce *smaller* objects than PNut, so `.obj`/`.bin` diverge from GOLDs that may predate the feature. Not EOL, not a GOLD-editing question. | **DEFER** — unchanged from v1.55.2; unrelated to preprocessor symbols and would roughly double the sprint |
| **B — `TEST/FULL` preprocessor GOLDs** | `condCode`, `condCodeElse`, `include` | Punch-list item 2: CON-only fixture sources, legal as imported objects but not top-level, so the compiler correctly errors `No PUB method or DAT block found`. GOLDs also predate a deliberate preprocessor output-format change. | **DEFER** — but see the §3 interaction note below |
| **C — `TEST/FULL` `dumpTables`** | `dumpTables` | Punch-list item 9; cause unknown, not a preprocessor-GOLD issue | **DEFER** — needs its own diagnosis |

**§3 interaction — watch this during execution.** Group B's fixtures are
preprocessor GOLD comparisons, and §3 changes what the preprocessor emits for
multi-word `#define` values. If a Group B fixture's failure *changes shape*
during this sprint, that is signal, not noise — re-read it rather than assuming
it is the same known failure.

**Exit-baseline assertion for closeout.** Health must be no worse than: build
clean / 0 warnings; no skips; default suite ≥320 passing with any newly-added
tests on top; CACHE 59/59, LANG-FEAT 11/11, SHORT 2/2 still green; WUMMI still
exactly 3 failures and nothing new; FULL still exactly 4 and nothing new.

**Observation for a future sprint (not this one):** CACHE, LANG-FEAT and SHORT
are all green and outside the default runner — the same invisible-skip shape
v1.55.2 §12 fixed for EXCEPT and PREPROC. Adding them to
`jest-config/jest-coverage-config.json` roots would bring the default suite to
392. Not folded in here: it is unrelated to symbol correctness, and doing it
mid-sprint would move the very count the exit baseline asserts against.

## Scope

Two strands, deliberately in one sprint because the second is the documentation
consequence of the first:

1. **Symbol-table correctness** — §1-§5. `#undef` leaving substitutions live,
   `#undef` deleting built-ins, `#define` mangling its own input, `__VERSION__`
   defined too late to exist.
2. **Documentation currency** — §6-§9. The shipped preprocessor reference is
   wrong in four places; the aged-document wave the manifest selected; the
   `copyright` text that has never shipped correctly.
3. **External audit backlog** — §10. Eleven Low findings from the repo's
   static-analysis watcher, cleared to zero or explicitly dispositioned.

## Decisions taken

Settled with Stephen before this plan was written. Each is closed; none is
re-litigated during execution.

| # | Decision | Resolution |
|---|---|---|
| D1 | `__VERSION__` string form | **Bare `1.55.2`**, matching `package.json` and the CLI banner. The doc's `'v1.43.0'` example is corrected, not the value. |
| D2 | Function-like `#define` — warn or error? | **Error.** See the severity rule below. |
| D3 | Multi-word `#define` value | **Fix, do not reject.** Take the rest of the line. C and FlexSpin do; our own doc's wording implies it. This is a parser bug, not a design stance. |
| D4 | Language-specification docs | **Assess, then act.** Determine whether the extraction pipeline still runs before committing to regenerate vs reclassify. |
| D5 | `copyright` reconciliation | **In scope.** Two one-line changes; completes the shipped document set. |
| D6 | `#undef` of a built-in | **Warn and refuse**, scoped to the preloaded `__*__` set. `-D` symbols stay undefinable. |
| D7 | Where the built-in guard lives | In `undefineSymbol()`, so every caller inherits it. |

### The severity rule (D2's justification — adopt project-wide)

> **Warn when the build is still correct. Error when the build would be wrong.**

This reproduces every severity choice already made in v1.55.2 — `#undef`
not-found warns (no-op, build correct); stray `#endif`, unclosed `#ifdef`,
illegal `{Spin2_vNN}`, missing directive argument all fatal (build compiles the
wrong thing). It is written down here because it was previously implicit, and it
decides §2 and §5 without further argument.

---

## 1. `#undef` must clear the substitution table

### Why

**This is the most serious defect in the sprint and it affects ordinary user
code, not an edge case.** There are two symbol tables — `preProcSymbols`
(presence, what `#ifdef` reads) and `preProcTextSymbols` (substitution).
`undefineSymbol()` clears only the first.

So an undefined symbol keeps rewriting your source:

```
#define UF hello
#undef UF
#ifdef UF     ' -> FALSE   (presence correctly removed)
  F = UF      ' -> hello   (STILL SUBSTITUTES)
```

Reproduced against 1.55.2. The author has every reason to believe `UF` is gone —
`#ifdef` agrees with them — and it silently continues to expand.

### Current code

`spinDocument.ts` `undefineSymbol()`:

```ts
private undefineSymbol(oldSymbol: string): boolean {
  let removeStatus: boolean = false;
  if (this.preProcSymbols.exists(oldSymbol)) {
    this.preProcSymbols.remove(oldSymbol);
    removeStatus = true;
  }
  return removeStatus;
}
```

`preProcTextSymbols` is never touched. `defineSymbol()` (`spinDocument.ts:299`)
is the counterpart that populates both — read it to confirm exactly which table
receives a symbol under each `eTextSub` value, and make removal its mirror.

### Target

`undefineSymbol()` removes from **both** tables. Return `true` if the symbol was
present in *either* — a symbol living only in the substitution table (should not
happen, but the asymmetry is what created this bug) must still count as found,
or the §5 not-found warning will fire spuriously.

### Verification

- **Normal:** `#define UF hello` / `#undef UF` → `#ifdef UF` false **and**
  `F = UF` emits `UF` unsubstituted.
- **Edge:** `#define UF` (no value, presence-only) / `#undef UF` → still returns
  found, no spurious not-found warning.
- **Edge:** define, undef, re-define with a different value → the new value
  substitutes, not the old.
- **Error:** `#undef NEVER_DEFINED` → still exactly one warning, unchanged text.
- **Regression:** the full suite. Any fixture whose output changes here was
  relying on a symbol that should have been gone.

---

## 2. Function-like `#define` is an error

### Why

```
#define SQ(x) ((x)*(x))
CON
  R = SQ(3)      ' -> emits "SQ(3)" unchanged
```

No diagnostic. Worse than doing nothing: `getSymbolValue()` splits on whitespace,
so a symbol literally named **`SQ(X)`** is registered — reachable only via
`#ifdef SQ(X)`, useless for anything else. Confirmed: `#ifdef SQ` is false,
`#ifdef SQ(X)` is true.

Every call site of the macro is silently wrong. Per the severity rule, that is
an error.

### Current code

`spinDocument.ts:562` matches `/^\s*#define\s+/i`, then `getSymbolValue()`
(`spinDocument.ts:1134`) takes `lineParts[1]` as the symbol with no validation of
its shape.

### Target

Before defining, reject a symbol token that is not a bare identifier. Detect the
function-like form specifically — an `(` in the token — and report:

```
<file>:<line>:error:#define does not support arguments — only simple symbol definitions
```

Naming the *capability gap* matters: someone porting source from a preprocessor
that does support macro arguments needs to know it is unsupported, not that
their line has a typo.

Comment the line out on the error path, as the other Group A sites do, so the
raw directive never reaches the elementizer.

### Compatibility impact (required — this is a behavior break)

- **What breaks:** a source containing a function-like `#define` that builds
  today will now fail.
- **How narrow:** such a source is *already* miscompiling — the macro never
  expanded. The only case going from "builds" to "fails" is an **unused**
  function-like define.
- **Safety net:** the full regression suite. A fixture that starts failing here
  had a dead macro; that is a finding, not a reason to soften severity.
- **Gate:** full-suite run, not just PREPROC/EXCEPT.
- **Changelog:** called out as a break, above the fix list, per
  `DOCs/voicing/CHANGELOG-Voicing.md`.

### Verification

- **Normal:** `#define FOO hello` unaffected; `#define BAR` unaffected.
- **Error:** `#define SQ(x) ((x)*(x))` → the message above, exit 1, no artifacts.
- **Edge:** `#define FOO(` — malformed but still function-like → same error, no crash.
- **Edge:** a value *containing* parens — `#define MASK (1<<3)` — must **not**
  trigger it. Only the **symbol** token is inspected.

---

## 3. Multi-word `#define` values are truncated

### Why

```
#define MSG hello there world
  R = MSG        ' -> "hello"
```

`getSymbolValue()` returns `lineParts[2]` — one token. Tokens 3+ are discarded
with no diagnostic. Per D3 this is a parser bug: C and FlexSpin take the rest of
the line, and `Preprocessor.md`'s own wording (*"whenever the symbol FOO appears,
substitute hello"*) implies the whole value.

### Current code

`spinDocument.ts:1134` `getSymbolValue()` — `value = lineParts[2]`.

### Target

Value is everything after the symbol token, leading/trailing whitespace trimmed.
Single-token values are unchanged in behavior.

**Note the interaction with §2:** both are fixed in `getSymbolValue()`. Do §2
first — the symbol-shape validation is what makes it safe to be liberal about
the value.

### Compatibility impact

- **What changes:** any source with a multi-word `#define` starts substituting
  the full value instead of the first token. Output changes — likely toward what
  the author intended, but it *changes*.
- **Safety net:** full-suite run. A GOLD that shifts here needs individual review
  before acceptance: confirm the new expansion is the correct one and that the
  GOLD was encoding the truncation bug.
- **Gate:** full suite, and explicitly diff any `.pre.GOLD` that moves.

### Verification

- **Normal:** `#define MSG hello there world` → `MSG` expands to all three words.
- **Normal:** `#define FOO hello` → unchanged (single token).
- **Edge:** trailing whitespace on the directive line is not carried into the value.
- **Edge:** `#define MEMDRIVER "driver2.spin2"` — the quoted `#pragma exportdef`
  idiom from `Preprocessor.md` — unchanged.
- **Edge:** `#define BAR` (no value) → still `1`.
- **Regression:** full suite; every moved GOLD reviewed individually.

---

## 4. `__VERSION__` is defined too late to exist

### Why

`__VERSION__` is documented as a predefined symbol. It is defined at
`pnut-ts.ts:588` — **after** the `SpinDocument` constructor, and preprocessing
runs inside that constructor. So the preprocessor never sees it:

```
CON
  V = __VERSION__     ' -> error: Undefined symbol
```

Confirmed not visible to child objects either. It is the **only** symbol defined
after the constructor — all four `new SpinDocument` sites were checked, so this
class has exactly one member.

### Current code

- `pnut-ts.ts:588` — `this.spinDocument.defineSymbol('__VERSION__', this.version, eTextSub.SA_TEXT_YES);`
- `spinDocument.ts:1207` `preloadSymbolTable()` — where the other seven live, with
  the commented-out placeholder `// baseSymbols['__VERSION__'] = ...;` at :1227
  showing this was always the intent.

### Target

Define `__VERSION__` inside `preloadSymbolTable()` alongside the rest, value
**bare `1.55.2`** (D1), `SA_TEXT_YES` so it substitutes. Remove the `pnut-ts.ts`
line and the placeholder comment.

The version string must come from wherever `pnut-ts.ts` sources it — do **not**
add a fourth place the version lives. `SpinDocument` may need the version passed
via `Context`; establish that channel rather than importing across layers.

### Verification

- **Normal:** `CON V = __VERSION__` compiles; the emitted constant is the version string.
- **Normal:** `#ifdef __VERSION__` is true.
- **Edge:** visible inside an `#include`d file and inside a child object.
- **Edge:** the three version locations still agree after the change; no fourth appears.

---

## 5. `#undef` of a built-in warns and refuses

### Why

The shipped doc says *"#undef will not do anything if one of our built-in symbols
was named."* **No such guard exists.** `#undef __P2__` succeeds silently and
`#ifdef __P2__` becomes false thereafter.

Built-ins describe the *compilation environment*, not user state. A library
testing `#ifdef __P2__` misbehaves far from the file that removed it.

### Current code

`undefineSymbol()` — removes anything present, no protection. Built-ins are
loaded through the same `defineSymbol()` path as user symbols
(`spinDocument.ts:1207-1233`), so they are indistinguishable at removal time.

### Target

`undefineSymbol()` (D7) refuses removal for the preloaded set and signals it to
the caller, which emits:

```
<file>:<line>:warning:cannot undefine built-in symbol [__P2__]
```

Warning, not error, per the severity rule — refusing keeps the build correct.
Consistent with the `#undef` not-found warning already shipped.

**Scope:** the preloaded `__*__` set only. Symbols arriving via `-D` remain
undefinable — `-U` is documented as the command-line counterpart and a source
overriding a build-system `-D` is legitimate.

The built-in list must be derived from the same place `preloadSymbolTable()`
builds it, not restated — a second list would drift the moment a symbol is added.

### Verification

- **Normal:** `#undef __P2__` → warning, exit 0, `#ifdef __P2__` still **true**.
- **Normal:** `#undef MY_SYM` (user) → removed, no warning.
- **Edge:** `#undef __DEBUG__` under `-d` → warning, still defined.
- **Edge:** `-D FOO` then `#undef FOO` → removed, no warning (not a built-in).
- **Edge:** `#undef __file__` (lowercase) → still recognized as built-in;
  matching is case-insensitive.

---

## 6. `Preprocessor.md` — Predefined Symbols and full verification

### Why

Four errors, all in the shipped user reference. It carries `verified: 1.55.2` in
the manifest, which **overclaimed** — only its diagnostics sections were read
when that stamp was applied.

| Claim | Reality |
|---|---|
| `__PNUTTS__` | does not exist — the compiler defines **`__PNUT_TS__`** |
| `__propeller__` "defined as 2" | source sets `1`, and the value is unobservable |
| `__VERSION__` usable | not until §4 |
| `#undef` of built-in "will not do anything" | it currently succeeds; §5 makes the doc true |

The first is the most damaging: anyone following the doc to detect this compiler
wrote a test that silently never fires.

### Target

Rewrite the Predefined Symbols table, and **read the whole document** against the
code — that is what the stamp means.

- Correct the symbol name and drop the bogus numeric values.
- Document the **presence-only vs substituting** split: symbols valued `1` are
  registered `SA_NUMBER_NO` and are testable with `#ifdef` but never substituted;
  string-valued ones substitute. Since there is no `#if` expression evaluation,
  numeric "values" are not observable at all.
- Document `__FILE__`'s per-file behavior — inside an `#include` it is the
  *included* file's name (verified).
- Update `#define` for §2 and §3; `#undef` for §1 and §5.
- Follow `DOCs/voicing/Shipped-Docs-Voicing.md`.

Only after the full read: set `verified: <this build>`.

### Verification

- Every symbol in the table reproduced against the built compiler.
- Every relative link resolves inside the shipped set (per the voicing guide).
- No claim about behavior this sprint changes remains in the pre-sprint form.

---

## 7. `SPIN2-BIN-Format.md` — verify against v54/v55

### Why

Selected by the aged-document gate: 438 lines, last touched **2025-09-13**,
covering `object-format`, whose source is 239 days newer. It predates v54 STRUCT
support and the v55 bytecode/interpreter changes.

### Target

Read against current `objectImage.ts` / `objectStructures.ts` / the v55
interpreter. Correct what has drifted; if it proves accurate, say so and stamp it
— *verified-and-unchanged is a valid outcome and the stamp is the deliverable.*

Per the shared voicing core: no numeric bytecode values.

### Verification

Each structural claim traced to current source with a `file:line`, or corrected.
`verified` set only after the whole document is read.

---

## 8. Language-specification pair — assess, then act

### Why

Both READMEs (224 and 202 lines) were selected by the aged-document gate, last
touched **2025-09-13** (~v52; we are at v55). They describe a **generated** tree —
`extraction-scripts/` holds `extract-spin2-language.ts`,
`extract-pasm2-database.ts`, `generate-ide-formats.ts` — and quote hardcoded
counts (*"359 PASM2 instructions, 36 SPIN2 keywords, 72 operators, 55 built-in
functions"*) that v53's `OFFSETOF`, v54's STRUCT bitfields and v55's additions
have almost certainly moved.

### Target — explicitly two-phase (D4)

**Phase A — assess (this is the deliverable; do not skip to B).** Determine
whether the extraction pipeline still runs against current source. Record the
answer either way.

*Corroborating evidence:* the external audit (§10) reports five findings in
`extraction-scripts/`, **all dated 2025-09-13 — the same date as these two
documents.* The scripts and the docs they generate have been untouched together
since ~v52. Phase A should also answer why `extract-pasm2-database-corrected.ts`
exists alongside `extract-pasm2-database.ts`.

**Phase B — act on what A found:**

- **Pipeline runs:** regenerate, update the counts, stamp `verified`. Consider
  reclassifying `databases/` and `ide-integration/` as `generated` in the
  manifest — a generated tree should not be hand-audited every sprint.
- **Pipeline is broken:** do **not** hand-patch the counts to look current. That
  produces a doc that claims to describe a generated artifact it no longer
  matches. Record the breakage as a punch-list item with what fails, leave
  `verified` unchanged, and bring the scope decision to Stephen.

Phase A may reveal this is a repair sprint of its own. **That is an acceptable
outcome** and is why the phases are separated.

### Verification

- Phase A reaches a definite answer, recorded in the plan's execution notes.
- Phase B's path is chosen by that answer, not assumed at plan time.
- No count is published that was not produced by a run.

---

## 9. `copyright` — reconcile and ship

### Why

Punch-list item 7. The repo root `copyright` names
`github.com/ironsheep/Pnut_ts_dev` — a **private** repo — and credits Iron Sheep
Productions only. The `scripts-pkg/_dist/` copy that has actually been shipping
names the public `github.com/ironsheep/PNut_TS` and credits **Iron Sheep
Productions and Parallax Inc.**

`copyright` was deliberately excluded from the release workflow's document list
because adding it as-is would publish the wrong text.

### Target

1. Reconcile root `copyright` to the `_dist` wording — public URL, both
   attributions. **Attribution wording is Stephen's call, not a mechanical
   merge**; confirm the exact line before committing.
2. Add `copyright` to the `for doc in ...` list at
   `.github/workflows/release.yml:112`.
3. Update `DOCs/RELEASE-PROCESS.md` — remove the "Open item — `copyright`" note,
   since the shipped set is then complete.

### Verification

- Root and `_dist` copies identical.
- The workflow's document loop includes it and still hard-fails on a missing file.
- No private repo URL in any shipped file.

---

## 10. External audit findings

### Why

The repo is watched by an external static-analysis system reporting **11 Low, 0
Medium, 0 High**. All are mechanical. Clearing the board to zero has value beyond
the individual fixes: a board at zero means the *next* finding is signal rather
than noise in a standing backlog.

They triage into three groups, and **two of the groups must not be treated the
same way.**

### Group A — fix (4 findings)

| Finding | Site | Note |
|---|---|---|
| `UNUSED_VAR_ASSIGN` — `exitCode` initializer never read | `src/pnut-ts.ts:102` | **Ours, from CLI-Robustness §8.** `let exitCode: number = 1;` is assigned by `runCompile()` or the catch rethrows, so the initializer is dead on every path. Drop it to `let exitCode: number;`. |
| `CONSTANT_CONDITION` — nested `isLoggingOutline` | `src/classes/compiler.ts:399` | Inner guard inside `if (this.isLoggingOutline) {`. Remove the inner. |
| `CONSTANT_CONDITION` — nested `isLoggingOutline` | `src/classes/compiler.ts:668` | Outer condition already includes `&& this.isLoggingOutline`. Remove the inner. |
| `USELESS_ARRAY` — `hexDumpLineIndices` | `src/tests/testUtils.ts:387` | Populated, never read. Remove. |

The two `isLoggingOutline` findings are residue from the performance sprint's
Opt#1 (inline logging guards, -56.5%) — guards were added at call sites that were
*already* inside a guarded block. Removing the inner check changes nothing at
runtime and restores readability.

### Group B — do NOT fix; document as intentional (2 findings)

| Finding | Site |
|---|---|
| `ASSIGN_SAME_VALUE` — `hubOrgLimit = obj_size_limit` | `src/classes/spinResolver.ts:1303` |
| `ASSIGN_SAME_VALUE` — `hubOrgLimit = obj_size_limit` | `src/classes/spinResolver.ts:1313` |

**The analyzer is right about the code and wrong about the project.** Line 1294
sets `hubOrgLimit` before the `if (inLineMode)`, and both branches set it again —
redundant in isolation. But this block is a deliberate line-by-line port of
PNut's `@@passblock:` structure; the comment `// PNut @@passblock:` sits three
lines above finding 8.

Structural correspondence with `REF-V52A/p2com.asm` is what makes this port
auditable against the original. Collapsing "redundant" assignments optimizes away
the very property the project depends on — and the next person diffing our
resolver against Chip's Pascal would find a gap with no explanation.

**Target:** keep both assignments. Add a brief comment at each naming the parity
reason, and suppress the rule at those sites if the analyzer supports inline
suppression. If it does not, record them as accepted-and-explained wherever the
audit system tracks dispositions.

**This is a general rule worth stating beyond these two sites:** an external
analyzer has no model of deliberate structural parity. Any `ASSIGN_SAME_VALUE`,
dead-store, or simplification finding inside PNut-ported resolver code is
suspect-by-default and must be checked against `REF-V52A/` before being
"cleaned up."

### Group C — rolls into §8 (5 findings)

All five are in `DOCs/language-specification/extraction-scripts/`:
`extract-condition-codes.ts:16` (`UNUSED_IMPORT eValueType`),
`extract-spin2-language.ts:17` (`UNUSED_IMPORT eOperationType`),
`generate-ide-formats.ts:126` (`UNUSED_DECL operators`),
`extract-pasm2-database.ts:317` and `extract-pasm2-database-corrected.ts:313`
(`UNUSED_PARAM opcode`).

**Every one is dated 2025-09-13 — the same date as the two documents §8
assesses.** That is corroborating evidence for §8 Phase A: the extraction tree
has been untouched as a whole since v52, scripts and docs together.

Do **not** fix these ahead of §8. If Phase A finds the pipeline broken, these
files may be rewritten or retired and the fixes wasted; if it finds the pipeline
healthy, they are a five-minute cleanup on a tree we are already editing. Either
way §8 decides. `extract-pasm2-database-corrected.ts` existing alongside
`extract-pasm2-database.ts` is itself a question Phase A should answer.

### Verification

- Group A: analyzer reports 4 fewer findings; build clean; full suite green.
- Group B: both assignments still present, each carrying its parity comment;
  dispositions recorded so they do not resurface as new findings each scan.
- Group C: resolved by §8's chosen path, not independently.
- Board reaches **0 High / 0 Medium / 0 Low**, or every remainder is an explained
  Group B disposition.

## 11. Documentation and release notes

### Why

Sections 1-5 change user-visible behavior, two of them breaking.

### Target

1. **`Preprocessor.md`** — §6 (its own section; it is the primary reference).
2. **`DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md`** — the
   internal guide covers the same surface and was verified at 1.55.2; the `#define`
   and `#undef` semantics change under it. Follow
   `DOCs/voicing/Usage-Guide-Voicing.md`, including its rule that an anti-pattern's
   *recommended fix* must itself be verified.
3. **`CHANGELOG.md`** — per `DOCs/voicing/CHANGELOG-Voicing.md`. §2 and §3 are
   behavior changes and lead the entry. Requires a lede — the release workflow
   publishes it as the headline.
4. **`DOCs/internals/Theory-of-Operations.md`** — verified at 1.55.2 and describes
   preprocessor symbol handling; confirm §1/§4's table changes do not contradict it.
5. **`DOCs/internals/Preprocessor-P2KB-Update-Request.md`** — the outstanding P2KB
   request describes 1.55.2 behavior. §1-§5 change what a correct P2KB entry says;
   append rather than rewrite, so the maintainer sees one coherent request.

### Verification

Every documented claim reproduced against the built compiler, not against this
plan.

---

## Documentation impact gate

Run per `.claude/skills/sprint-plan/project-overlay.md` before this plan closed.

**Surface searched:** `#define`, `#undef`, `__DEBUG__`, `__P2__`, "predefined",
"preprocessor symbol" across all tracked `*.md`. Historical and generated classes
triaged out by class.

| Document | Class | Disposition |
|---|---|---|
| `Preprocessor.md` | shipped | **Update** → §6 |
| `CHANGELOG.md` | shipped | **Update** → §10 |
| `CommandLine.md` | shipped | **Excluded** — matched only on the `-D`/`-U`/`-I` option table, which this sprint does not change. `-U` semantics are untouched (§5 scopes the guard to `#undef`). |
| `DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md` | governed | **Update** → §10 |
| `DOCs/internals/Theory-of-Operations.md` | governed | **Update** → §10 (confirm-or-correct) |
| `DOCs/roadmaps/Test-Suite-Punch-List.md` | governed | **Update** — item 7 closes via §9; §8 Phase B may add one |
| `DOCs/internals/theory-of-operations/TERM_Theory_of_Operations.md` | governed | **Excluded** — false positive; matched "4 **predefined** color pairs", unrelated to preprocessor symbols |

**Aged-document sweep** (`npm run docs-check`): 38 governed stale, drawdown rate
3/sprint. Auto-added: `DOCs/language-specification/README.md` (329d),
`DOCs/language-specification/ide-integration/README.md` (329d),
`DOCs/internals/SPIN2-BIN-Format.md` (239d) → §7 and §8. Shipped-stale: none.
Unclassified: 0.

**Dependency cleanup** (`npm audit`): 1 moderate — `pkg`,
GHSA-22r3-9w55-cj54, **no fix available**. `npm audit --omit=dev` reports **0**:
devDependency only, used by `npm run bld-dist`, no runtime exposure. **Not
auto-added** — no-fix items are recorded, not folded in. Migration to
`@yao-pkg/pkg` or Node SEA remains its own scoped work.

---

## Notes for execution

**Ordering.** §2 before §3 — both edit `getSymbolValue()`, and the symbol-shape
validation is what makes liberal value parsing safe. §1 before §5 — both edit
`undefineSymbol()`, and §1 establishes the both-tables contract §5's refusal
returns through. §6 after §1-§5 (documents shipped behavior, not planned
behavior). §10 last.

**Atomic green-units** (per `.claude/skills/plan-to-tasks/project-overlay.md`):
none identified. Each section reaches green independently — unlike
CLI-Robustness §1/§2, no section here surfaces a defect another section repairs.
Confirm during `plan-to-tasks` rather than assuming.

**Fixture home.** Negative fixtures go in `TEST/EXCEPT-tests/` as `pperr_*.spin2`
with `.errout.GOLD` — the PREPROC runner requires `.pre`/`.lst`/`.bin` for every
fixture, which a correct error does not produce. Positive fixtures (substitution
behavior, `__VERSION__` visibility) go in `TEST/PREPROC-tests/`. Shared helpers
go in `src/tests/testUtils.ts`, never into individual test files.

**GOLD files are sacred.** §3 will move `.pre.GOLD` content. A moved GOLD is
reviewed and regenerated on Windows through the documented flow — never
hand-edited to match new output.

**Version.** Patch tier — no PNut-version language behavior changes. Three
locations move together: `package.json`, `package-lock.json`, `src/pnut-ts.ts`.

## Open questions

**None.** D1-D7 closed with Stephen before this plan was written; the §8 two-phase
structure exists precisely so that its unknown is resolved by execution rather
than guessed at now.
