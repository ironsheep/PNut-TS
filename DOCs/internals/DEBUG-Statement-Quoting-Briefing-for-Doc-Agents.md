# DEBUG Statement Syntax & String Quoting — Briefing for Documentation Agents

**Purpose:** authoritative, self-contained guidance for agents writing tutorials, manuals,
and examples that involve Spin2 `DEBUG()` statements. Covers the overall syntax of the two
debug forms and — the reason this brief exists — the string-quoting rules, which differ
between the two forms and are a common silent-failure trap.

**Status:** documentation mitigation for a known silent failure (double-quoted strings in
backtick display commands are accepted by the compiler and silently ignored at runtime — no
error is emitted). Parser-level validation is deferred; until then, docs are the guardrail.

---

## 1. There are two distinct DEBUG forms

### A. Non-backtick (data / formatter) debug
Outputs values and text to the DEBUG terminal/log.

```spin2
debug("Temp: ", sdec_(temp), " degC")
```

- Comma-separated arguments: string literals, formatter calls (`UDEC`, `SDEC`, `UHEX`,
  `UBIN`, and their `_`/`_BYTE`/`_WORD`/`_LONG` variants), and bare expressions.
- **Strings use DOUBLE quotes: `"..."`.**
- A single quote `'` is the Spin2 comment character — it does **not** delimit a string here.

### B. Backtick (display) debug — also called the "TIC" form
Drives the DEBUG display windows: `SCOPE`, `SCOPE_XY`, `PLOT`, `TERM`, `BITMAP`, `LOGIC`,
`FFT`, `SPECTRO`, `MIDI`. The leading backtick (`` ` ``, the "tick"/"TIC") switches the
statement into display-command mode.

```spin2
debug(`BITMAP MyWin SIZE 320 240 TITLE 'My Window')   ' create/configure a window
debug(`MyWin SAVE 'snapshot')                          ' feed a command to it (.bmp auto-added)
```

- **Strings use SINGLE quotes: `'...'`.** This applies to all text arguments — window
  `TITLE`, `SAVE`/layer filenames, etc.
- A backtick statement alternates between two segment types:
  - **Display-command text** — keywords, numbers, and single-quoted strings, passed through
    literally to the display engine.
  - **`` `(expr[, expr ...]) `` value substitutions** — these drop back into ordinary Spin2
    expression syntax; their *runtime values* are streamed to the display.
- The statement ends at the closing `)`.

---

## 2. The quoting rules (the part that bites people)

| Context | String delimiter | The other quote |
|---|---|---|
| Non-backtick debug: `debug("hi", …)` | double `"…"` | `'` starts a comment |
| Backtick display-command text: `` debug(`… 'name') `` | single `'…'` | `"` is **silently ignored** |
| Inside `` `(expr) `` substitutions | normal Spin2 (double `"…"`) | normal Spin2 rules |

The two forms have **opposite** rules — that collision is the root of the confusion, so
always document the contrast, not just one side.

### Why double quotes fail in backtick display commands
The display engine recognizes only the apostrophe `'` as a string delimiter. A double quote
is not a delimiter there: the engine skips it and then mis-reads the intended filename/title
as stray keywords. **No compile error is produced** — the title or filename is simply lost.

```spin2
debug(`MyWin SAVE 'snapshot')   ' ✅ writes snapshot.bmp
debug(`MyWin SAVE "snapshot")   ' ❌ silently does NOT save snapshot.bmp — no error
```

### Additional rules for backtick display strings
- **No escape mechanism.** The first `'` after the opening one closes the string. You
  **cannot** embed a literal apostrophe inside a display string.
- **`SAVE` auto-appends `.bmp`.** Provide the base name only: `SAVE 'shot'` → `shot.bmp`.
  (Region forms: `SAVE WINDOW 'shot'` captures the whole window; `SAVE l t w h 'shot'`
  captures a desktop rectangle. **Both region forms still need the trailing single-quoted
  filename** — without it the region is grabbed but nothing is written, another silent
  no-op. Source: `KeySave` saves only when a string follows, `DebugDisplayUnit.pas:2864`.)
- An unterminated string (missing closing `'`) is not an error — it runs to the end of the
  command.

---

## 3. Copy-paste callout for manuals/tutorials

> **DEBUG string quoting — two opposite rules**
> - **Backtick display commands** — `` debug(`BITMAP w SAVE 'shot') ``: text arguments
>   (window `TITLE`, `SAVE`/layer filenames, etc.) use **single quotes `'…'`**. Double
>   quotes are **not recognized** — the text is silently ignored and your title/filename is
>   lost, with **no compile error**.
> - **Plain debug** — `debug("temp=", udec(x))`: strings use **double quotes `"…"`**; a
>   single quote `'` starts a comment.
> - Inside backtick display text there is **no escape**: the first `'` closes the string, so
>   a literal apostrophe cannot be embedded.

---

## 4. Guardrails — what the docs must NOT claim

- **Do not** write "double quotes are never valid anywhere in a backtick debug." They are
  valid inside `` `(...) `` Spin2-expression substitutions. Scope the prohibition to
  **display-command text arguments**.
- **Do not** imply the compiler rejects/warns on the mistake — it does not; the failure is
  silent at runtime. That silence is precisely why the docs matter.
- **Do not** cite numeric bytecode/opcode values for the debug commands (project convention:
  names yes, numeric values no — they re-sort between revisions). Refer to commands by name.

---

## 5. Source of truth (for reviewers verifying these docs)

- Compiler emits the backtick text **raw** (no quote interpretation at compile time):
  `src/classes/spinResolver.ts` → `debugTickString()`.
- The `'`-only string recognition for display windows lives in the host display parser:
  `REF-V52A/p2com.asm` → `check_dd_str` (matches the apostrophe and nothing else).
- Runtime `dc_*` formatting/transmit (the on-chip side) is in the shipped debugger kernel:
  `REF-V52A/Spin2_debugger.spin2` → `debug_byte`; the interpreter (`Spin2_interpreter.spin2`
  → `debug_`) BRKs into it.
