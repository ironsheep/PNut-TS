# P2KB Update Request — Preprocessor Directive Corrections

> **For:** the P2KB maintainer agent.
> **From:** PNut-TS, 2026-08-08, following the CLI-Robustness sprint (v1.55.2).
> **Target entry:** `p2kbSpin2PreprocessorOverview` (category
> `Preprocessor Directives`), plus the per-directive files it references
> (`undef.yaml`, `ifdef.yaml`, `error.yaml`, `warn.yaml`, `define.yaml`).
>
> **What this document is:** a spec for correcting factual errors in P2KB's
> preprocessor coverage. Two claims are contradicted by the shipping compiler,
> one recommended "correct" example now produces a warning, and several
> behaviors introduced in PNut-TS v1.55.2 are undocumented.
>
> **What this document is not:** a request for code changes in PNut-TS. The
> compiler behavior described here is intended and shipping. Only P2KB content
> changes.

---

## 0. TL;DR for the maintainer agent

* **2 factual corrections** — case sensitivity (§2.1) and nesting depth (§2.2).
  Both are stated as unqualified language rules; both are wrong for at least one
  compiler.
* **1 broken example** — the `contradictory_conditions` anti-pattern's *correct*
  form emits a warning under PNut-TS v1.55.2 (§2.3).
* **4 additions** — `#undef` no-op semantics, `#error`/`#warn` message parsing,
  unterminated-conditional detection, and diagnostic output format (§3).
* **1 framing change** — the overview presents PNut and PNut-TS behavior as
  identical. Where they diverge, say which compiler (§4).
* Verification commands for every claim are in §5. Each was run against
  PNut-TS v1.55.2 on 2026-08-08; the observed output is quoted inline.

---

## 1. Why this request exists

PNut-TS v1.55.2 made the preprocessor's diagnostics visible for the first time —
previously malformed directives were recorded and silently discarded. Bringing
those diagnostics up surfaced places where P2KB's description of the
preprocessor does not match what either compiler actually does.

Two of the errors matter beyond documentation accuracy: a reader following
P2KB's guidance will write code that behaves differently than described
(§2.1), or will be told a limit exists where it does not (§2.2).

---

## 2. Corrections — claims contradicted by the compiler

### 2.1 Symbol names are **not** case-sensitive

**P2KB currently says**, in three places:

```yaml
key_characteristics:
  - characteristic: "Case sensitivity"
    description: "Symbol names are case-sensitive (DEBUG_MODE != debug_mode)"
notes:
  - "Symbol names are case-sensitive"
```

**This is wrong for PNut-TS.** Preprocessor symbols are matched
case-insensitively, in both directions.

Verified:

```
$ cat case1.spin2
#define DEBUG_MODE
CON
#ifdef debug_mode
  RESULT = 111
#else
  RESULT = 222
#endif

$ pnut-ts --pass preprocess -i case1.spin2
$ grep RESULT case1__pre.spin2
  RESULT = 111          ← the lowercase test MATCHED the uppercase definition
```

The inverse (`#define lower_sym` tested by `#ifdef LOWER_SYM`) also matches.

The parenthetical `(DEBUG_MODE != debug_mode)` is the most damaging part — it
gives a concrete, memorable, and false rule. A reader relying on it might
`#define` two symbols differing only in case and expect them to be distinct;
under PNut-TS the second silently redefines the first.

**Requested change:** replace the characteristic and the note with:

```yaml
key_characteristics:
  - characteristic: "Case sensitivity"
    description: >-
      Symbol names are matched case-insensitively in PNut-TS — DEBUG_MODE,
      Debug_Mode and debug_mode all refer to the same symbol. Do not rely on
      case to distinguish two symbols.
notes:
  - "Symbol names are matched case-insensitively (PNut-TS); do not use case to distinguish symbols"
```

> **Action for the maintainer:** please confirm the original PNut's behavior
> before finalizing the wording. PNut-TS is verified above. If PNut is
> case-sensitive, this becomes a documented divergence and both behaviors must
> be named. If PNut also folds case, drop the compiler qualifier and state it as
> a language rule.

### 2.2 The 8-level nesting cap is PNut-specific, not a language rule

**P2KB currently says**, in three places:

```yaml
key_characteristics:
  - characteristic: "Maximum nesting"
    description: "Up to 8 levels of nested conditionals supported"
notes:
  - "Maximum nesting depth is 8 levels"
examples:
  - description: "Nested conditional compilation"   # captioned "(up to 8 levels)"
```

**PNut-TS deliberately does not implement this limit.** It is a PNut
implementation constraint, not a property of the language.

Verified — 10 levels of nesting, all symbols defined:

```
$ pnut-ts --pass preprocess -i nest10.spin2
(no diagnostic)
$ grep "R = " nest10__pre.spin2
  R = 99                ← innermost block emitted; compile clean
```

PNut-TS's regression suite covers 12-level nesting in both all-defined and
intermediate-undefined configurations.

This is a deliberate, documented divergence: PNut-TS follows a superset-parity
principle — it adheres to community-recognized *language* rules but does not
reproduce PNut-local *implementation* limits.

**Requested change:**

```yaml
key_characteristics:
  - characteristic: "Maximum nesting"
    description: >-
      PNut caps conditional nesting at 8 levels. PNut-TS imposes no fixed
      limit. Source nested deeper than 8 levels compiles under PNut-TS and
      will not compile under PNut — keep to 8 for portability.
notes:
  - "Nesting depth: PNut caps at 8 levels; PNut-TS has no fixed limit. Stay within 8 for portable source"
```

Also amend the nested-conditional example's description from "Nested
conditionals (up to 8 levels)" to "Nested conditional compilation" — the
parenthetical restates the disputed limit as though it were universal.

### 2.3 The `contradictory_conditions` "correct" example now emits a warning

**P2KB currently recommends:**

```spin2
#IFDEF USE_MODE_A
#UNDEF USE_MODE_B     ' Make mutual exclusivity explicit
  ' Mode A code
#ELSEIFDEF USE_MODE_B
  ' Mode B code
#ENDIF
```

Under PNut-TS v1.55.2, `#undef` of a symbol that was never defined is a
**warning** (see §3.1). In the common case — where `USE_MODE_B` was simply never
defined — this recommended pattern produces a diagnostic on every build:

```
$ pnut-ts --pass preprocess -i p2kb_correct.spin2
p2kb_correct.spin2:3:warning:#undef symbol [USE_MODE_B] not found
```

The build still succeeds; the warning is noise, but it is noise P2KB is
actively recommending users generate.

**Requested change:** keep the anti-pattern, replace the `correct` block with a
form that does not lean on defensive `#undef`:

```spin2
' Test the modes in priority order — the chain itself enforces exclusivity
#IFDEF USE_MODE_A
  ' Mode A code
#ELSEIFDEF USE_MODE_B
  ' Mode B code
#ELSE
#ERROR Define exactly one of USE_MODE_A or USE_MODE_B
#ENDIF
```

and add a `note`:

```yaml
    note: >-
      An #ELSEIFDEF chain is already mutually exclusive; a defensive #UNDEF adds
      nothing and, under PNut-TS, warns when the symbol was never defined.
```

This replacement is verified clean, and it also demonstrates the `#ERROR`
fall-through idiom correctly (§3.2).

---

## 3. Additions — v1.55.2 behavior not yet documented

### 3.1 `#undef` of an undefined symbol is a warning, not an error

Add to `undef.yaml` and to the overview's `notes`:

> `#undef` of a symbol that was never defined is a **warning**, not an error —
> C specifies `#undef` of an undefined symbol as a no-op. The build continues
> and output artifacts are written. Diagnostic text:
> `#undef symbol [NAME] not found`

Note this supersedes the existing overview note *"Note that #undef will not do
anything if one of our built-in symbols was named"* only in part — that
built-in-symbol note should be retained if it is still accurate for PNut;
PNut-TS behavior for built-ins was not exercised in this pass and is **not**
verified here.

### 3.2 `#ERROR` and `#WARN` only fire from branches that are taken

Add to `error.yaml` and `warn.yaml`:

> `#ERROR` and `#WARN` are subject to conditional compilation like any other
> content-bearing directive: one inside a branch that is not taken does not
> fire. This makes the fall-through idiom safe — an `#ERROR` in the final
> `#ELSE` of a configuration chain fires only when no configuration matched.

Verified — `#error` inside an untaken `#else` produces no diagnostic:

```
$ pnut-ts --pass preprocess -i p2kb_err.spin2      # OPTION_A defined
(clean)
```

> **Context worth recording:** in PNut-TS this idiom was broken until v1.55.2 —
> `#ERROR`/`#WARN` were not guarded by the branch test and fired on *every*
> build regardless of which branch was selected. P2KB's `missing_default_case`
> anti-pattern already recommends the idiom, and that recommendation is now
> sound. If P2KB carries per-directive minimum-version metadata, the reliable
> form is PNut-TS v1.55.2+.

### 3.3 Message text parsing

Add to `error.yaml` and `warn.yaml`:

> The message is everything after the directive. One surrounding pair of
> matching quotes is stripped, so `#error "text"` and `#error text` produce the
> same message. Leading whitespace before the directive does not affect the
> message.

### 3.4 Unterminated conditionals are detected

Add to `ifdef.yaml` / `ifndef.yaml` / `endif.yaml`:

> An `#IFDEF` or `#IFNDEF` never closed by `#ENDIF` is an error reported against
> the line that *opened* the block: `Expected #ENDIF`. Previously the block
> ended silently at EOF, with the remainder of the file's inclusion decided by a
> conditional the author never finished.

This makes P2KB's existing `unbalanced_conditionals` anti-pattern
(severity `compile_error`) accurate for PNut-TS as of v1.55.2 — before that
release, its stated severity was aspirational. The anti-pattern itself needs no
change; it is now simply true.

### 3.5 Diagnostic output format

Worth one note in the overview, since it is what users grep:

> Preprocessor diagnostics are written to **stderr**, one per line, in source
> order, as `<filespec>:<line>:error:<message>` or
> `<filespec>:<line>:warning:<message>` — the same format as compilation errors,
> with no ANSI color codes. All preprocessor errors in a file are reported from
> a single build.

Several diagnostics use PNut's exact wording so build logs from either compiler
match the same search: `Expected a preprocessor symbol`,
`Must be preceeded by #IFDEF or #IFNDEF`, `Expected #ENDIF`. **The misspelling
in the second is PNut's and is reproduced deliberately — do not "correct" it in
P2KB.** `#ERROR`, `#WARN`, `#INCLUDE` and `#PRAGMA` are PNut-TS extensions and
use wording of their own.

---

## 4. Framing — name the compiler where behavior diverges

The overview reads as though PNut and PNut-TS are interchangeable. For most of
the preprocessor they are, but §2.1 and §2.2 are both cases where an unqualified
statement is wrong for at least one of them.

**Requested convention:** where behavior is known to differ, name the compiler
and state the portable subset. The nesting entry in §2.2 is the model — it gives
both behaviors and then tells the reader what to do ("keep to 8 for
portability"). That is more useful than either behavior alone.

---

## 5. Verification

Every claim above was produced with PNut-TS **v1.55.2** on **2026-08-08**, using
`--pass preprocess -i` (which stops after preprocessing and writes the
preprocessed source to `<name>__pre.spin2`).

| § | Claim | How to reproduce |
|---|---|---|
| 2.1 | Symbols are case-insensitive | `#define DEBUG_MODE` + `#ifdef debug_mode` → block taken |
| 2.2 | No 8-level nesting cap | 10 nested `#ifdef`s, all defined → clean, inner block emitted |
| 2.3 | p2kb's "correct" example warns | `#undef USE_MODE_B` where never defined → `warning:#undef symbol [USE_MODE_B] not found` |
| 3.1 | `#undef` unknown → warning | `#undef NEVER_DEFINED` → warning, build continues |
| 3.2 | `#error` respects branches | `#error` in untaken `#else` → no diagnostic |

Two claims in the current entry were **checked and found correct** — leave them
alone:

* `__DEBUG__` is automatically defined when debug output is enabled. Verified:
  defined with `-d`, undefined without.
* `#INCLUDE` accepts a filename without the `.spin2` suffix; the suffix is
  appended. (PNut-TS additionally errors on any *other* suffix.)

---

## 6. Out of scope

* `minimum_version: "v47"` and the `-D`/`-U` `(v48+)` annotations were **not
  verified** in this pass. They are PNut-lineage version claims and PNut-TS is
  not the authority on them. Left untouched deliberately — do not treat their
  omission here as endorsement.
* PNut-TS behavior for `#undef` of a *built-in* symbol was not exercised.
* No change is requested to the `overusing_preprocessor_for_logic`,
  `no_include_guard`, `deeply_nested_conditionals`, or `missing_default_case`
  anti-patterns beyond what §2.3 and §3.4 state. Their guidance is sound.

---

## 7. Acceptance criteria

- [ ] `p2kb_get "preprocessor"` no longer claims symbol names are case-sensitive
- [ ] No entry states an 8-level nesting maximum without naming PNut as its source
- [ ] The `contradictory_conditions` correct-example compiles warning-free under
      PNut-TS v1.55.2
- [ ] `#undef`-of-undefined is documented as a warning with its exact text
- [ ] `#ERROR`/`#WARN` branch-guarding is documented
- [ ] `Must be preceeded by` retains PNut's misspelling
- [ ] Divergences name the compiler and state the portable subset

---

## 8. Companion reading

* `DOCs/internals/usage-guides-new/Preprocessor-Usage-Guide.md` — PNut-TS's own
  preprocessor guide, including its Diagnostics and PNut Compatibility sections
  (the source for §3 here).
* `CHANGELOG.md`, entry `[1.55.2]` — the behavior changes that prompted this
  request, including the list of directives whose wording now matches PNut's.
* `Preprocessor.md` (repo root) — the user-facing doc shipped in the package.
  **Note:** this file has not yet been updated for v1.55.2 and should not be
  used as a reference for the behaviors in §3.
