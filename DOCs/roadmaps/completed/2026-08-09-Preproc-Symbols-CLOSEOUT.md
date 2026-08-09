# Preprocessor Symbol Correctness Sprint — Closeout Audit

**Sprint:** Preproc-Symbols · **Build:** 1.55.3 · **Closed:** 2026-08-09
**Plan:** `DOCs/roadmaps/completed/Preprocessor-Symbol-Correctness-Sprint-Plan.md`
**Tag:** `v1.55.3` on `main` (pushed; release workflow triggered — see Verification)
**Retrospective:** [`2026-08-09-Preproc-Symbols-Retrospective.md`](2026-08-09-Preproc-Symbols-Retrospective.md)

**Certification: PLAN CERTIFIED DONE.** All 11 plan sections SHIPPED, verified
against current code. No PARTIAL, no MISSING, no AMBIGUOUS. §8 took its
planned broken-pipeline branch — that outcome is a SHIPPED deliverable (the
plan made Phase A's recorded answer the deliverable), not a carryover. Two
in-sprint discoveries extended documentation scope beyond the plan's
doc-impact gate; both audited below.

---

## 1. Cross-reference reconciliation

The `plan-to-tasks` table carries 11 rows for 11 plan sections, tasks
«#15»–«#25», seq 1–11. Reconciled both directions: every numbered section has
a row, every row maps to a real section. §10's split (A+B → «#15», C → «#21»)
matches the table's own notes. **No drift — the table is accurate.**

## 2. Per-section audit

| § | Deliverable | Task | Status | Evidence |
|---|---|---|---|---|
| §1 | `#undef` clears both symbol tables | «#16» | **SHIPPED** | `spinDocument.ts:1046-1050` removes from `preProcSymbols` and `preProcTextSymbols`, found-in-either return. Fixture `TEST/PREPROC-tests/ppokUndefClears.spin2` pins define/undef/re-define and presence-only shapes |
| §2 | Function-like `#define` fatal | «#18» | **SHIPPED** | `spinDocument.ts:586` — `'#define does not support arguments — only simple symbol definitions'`, `DS_FATAL`, line commented out. Fixture `TEST/EXCEPT-tests/pperr_define_args.spin2` + `.errout.GOLD` |
| §3 | Multi-word `#define` values | «#19» | **SHIPPED** | `spinDocument.ts:1188` rest-of-line value via `removeTrailingLineComment()` (`:1198`, quote-guarded tick/brace cut). Fixture `ppokDefineMulti.spin2`. Zero tracked GOLDs moved (only multi-word define in TEST/ is presence-only); FULL suite failures kept exact shape |
| §4 | `__VERSION__` visible to preprocessor | «#20» | **SHIPPED** | `spinDocument.ts:1296` in `preloadSymbolTable()` via pre-existing `context.compilerVersion` channel; late define + unused import removed from `pnut-ts.ts`. Verified in top file, include, child object. Fixture `ppokVersionSym.spin2` (presence-only by design — value-bearing GOLD would break every bump) |
| §5 | Built-in `#undef` guard | «#17» | **SHIPPED** | `spinDocument.ts:1038` `UR_BUILTIN_REFUSED` from `preloadedSymbolNames` (filled by `preloadSymbolTable()` itself — drift-proof); caller warning `:606` `'cannot undefine built-in symbol [X]'`. `-D` symbols stay removable. Fixture `ppokUndefBuiltin.spin2` incl. case-insensitive `__file__` |
| §6 | `Preprocessor.md` table + full verify | «#24» | **SHIPPED** | All four known errors gone (`__PNUT_TS__`, presence-only `__propeller__`, working `__VERSION__`, real built-in guard); presence-only vs substituting split documented; whole document reproduced against the built binary; `verified: 1.55.3` |
| §7 | `SPIN2-BIN-Format.md` verify | «#23» | **SHIPPED** | Whole-doc rewrite against v55-era source: no trailing checksum/symbols in emitted `.bin`, dormant `.binf` path replaced by real `--flashfile`/`.flash` description, v45+/v54 tagged symbol records, params limit 127, mode-exclusive layouts. `verified: 1.55.3`. Bonus: two stale `(2MB)` source comments fixed to 24MB |
| §8 | Lang-spec pipeline: assess then act | «#21» | **SHIPPED** (broken branch) | Phase A definite answer recorded in plan §8 execution record + punch-list item 10: two scripts never ran from committed location (pre-move imports), `-corrected` is the undocumented real generator, spin2 database enum ordinals stale since v53 (probe reverted). No counts hand-patched; Group C left in place per plan; scope decision with Stephen |
| §9 | `copyright` reconcile and ship | «#22» | **SHIPPED** | Root == `_dist`, byte-identical; public URL + both attributions (matching Stephen's own 2024-08/09 wording in LICENSE/banner/`ce38ad9`); `release.yml:114` doc loop includes `copyright`, hard-fail guard intact; RELEASE-PROCESS.md open item closed. Punch item 7 closes |
| §10 A+B | Audit findings: fix 4, document 2 | «#15» | **SHIPPED** | `exitCode` initializer dropped (`pnut-ts.ts:102` region); inner guards removed in `compiler.ts` compRecur/logDuplicationStats; `hexDumpLineIndices` gone from `testUtils.ts`; both `spinResolver.ts` hubOrgLimit assignments kept with parity comments (~:1303/:1313). Group C dispositioned via §8 as planned |
| §11 | Docs, changelog, version bump | «#25» | **SHIPPED** | CHANGELOG `[1.55.3]` with awk-verified extractable lede; usage guide updated + new Predefined Symbols section; ToO contradiction-checked (left at 1.55.2 honestly — no whole-doc re-read); P2KB request §9 addendum appended; version 1.55.3 in all three locations, binary reports it, `__VERSION__` substitutes it |

## 2a. In-sprint scope extensions (accepted during execution)

Both arose from §6/§11's reproduce-every-claim discipline; neither was in the
plan's doc-impact gate:

1. **`-U` documentation was wrong everywhere.** Reproduction showed `-U` does
   not undefine `-D` symbols — its only effect is gating `#pragma exportdef`
   (`spinDocument.ts:812`). `Preprocessor.md`, `CommandLine.md` (which the
   gate had excluded on the assumption `-U` semantics were untouched — the
   semantics were untouched, but the *documentation of them* was wrong all
   along) and the usage guide now describe shipping behavior.
2. **`#pragma exportdef` exports presence, not value** — the doc's flagship
   MEMDRIVER example never compiled. Docs corrected with a verified
   presence-flag example; punch-list item 11 carries the code-side decision.

## 3. Exit baseline (vs. entry at `3846a97`)

| Check | Entry | Exit | Verdict |
|---|---|---|---|
| Build | clean, 0 warnings | clean, 0 warnings | ✅ |
| Skips | none | none | ✅ |
| Default suite | 320/320, 20 suites | **325/325**, 20 suites (+5 new fixtures) | ✅ improved |
| CACHE | 59/59 | 59/59 | ✅ |
| LANG-FEAT | 11/11 | 11/11 | ✅ |
| SHORT | 2/2 | 2/2 | ✅ |
| WUMMI | 3 failed / 46 passed | 3 failed / 46 passed — same three | ✅ unchanged |
| FULL | 4 failed / 27 passed | 4 failed / 27 passed — same four, same shape | ✅ unchanged |

New fixtures: `ppokUndefClears`, `ppokUndefBuiltin`, `ppokDefineMulti`,
`ppokVersionSym` (PREPROC), `pperr_define_args` (EXCEPT).

**Observed flake, not a regression:** `FLASH-tests/isp_dummy_flash` failed in
2 of 6 full-suite runs with an **empty `.flash` file** (0 bytes read at
compare time), passing standalone and on every rerun. A test-harness write
race, seen for the first time this sprint at this frequency — punch-list
item 12.

## 4. Verification status

- **Verified on the canonical target** (Jest run-in-band, Node 24, dev
  container): all six suites above, plus every §1–§5 behavior manually
  reproduced against the built binary (the plan's per-section verify lists).
- **Code-complete, awaiting external verification:** the v1.55.3 release
  itself. Tag pushed 2026-08-09; the release workflow was in progress when
  this audit was written (Stephen monitoring), and community/external testing
  had not yet begun. The "release verified" record (v1.55.2 precedent:
  `c03fe3b`) is deliberately **not** part of this closeout.
- One plan verify-bullet was unachievable as written and re-scoped with
  recorded rationale: `CON V = __VERSION__` cannot compile (a bare dotted
  triple is not a Spin2 expression); the working contexts (`#ifdef`, string
  literals) are what shipped and what the docs state.

## 5. Carryover and decisions parked with Stephen

No plan section carries over. Open decisions, all recorded on the punch list
or flagged in the sprint record:

1. **Punch item 10** — lang-spec extraction tree: repair sprint / retire /
   staleness banner.
2. **Punch item 11** — implement `#pragma exportdef` value export, or accept
   presence-only.
3. **`-U` semantics** — leave as exportdef gate (docs now truthful) or make
   it actually undefine.
4. **Copyright attribution line** — shipped verbatim from the `_dist` text;
   standing veto window.
5. **Punch item 12** — FLASH empty-file test race.
6. Minor: `#define` of a built-in is silently skipped (asymmetric with the
   new undef warning); `externalFiles.ts` log strings still say "v43";
   `compiler.ts` REMOVE-BEFORE-FLIGHT commented dumps + dead
   `uniqueObjectName`; `testUtils.ts` duplicated hex-dump-line regex.
