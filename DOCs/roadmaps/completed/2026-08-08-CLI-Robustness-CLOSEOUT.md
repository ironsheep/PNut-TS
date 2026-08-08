# CLI-Robustness Sprint — Closeout Audit

**Sprint:** CLI-Robustness · **Build:** 1.55.2 · **Closed:** 2026-08-08
**Plan:** `DOCs/roadmaps/completed/CLI-Robustness-Sprint-Plan.md`
**Tag:** `v1.55.2` (annotated, on `main`)

**Certification: PLAN CERTIFIED DONE.** All 12 plan sections SHIPPED, verified
against current code rather than against commit messages. No PARTIAL, no
MISSING, no AMBIGUOUS. One in-sprint scope extension, accepted by Stephen and
audited below alongside the planned work.

---

## 1. Cross-reference reconciliation

The `plan-to-tasks` table carries 13 rows covering 12 plan sections (§9 split
into §9a-c «#11» and §9d «#12», as the table's own splits note records).
Reconciled both directions: every numbered section has a row, every row maps to
a real section. **No drift — the table is accurate.**

## 2. Per-section audit

| § | Deliverable | Task | Status | Evidence |
|---|---|---|---|---|
| §1 | Preprocessor diagnostic infrastructure | «#4» | **SHIPPED** | `spinDocument.ts:55` `PreprocessorError`; `:199` `hadFatalDiagnostic`; `:413` set on fatal. Old model fully removed — `errorsfound`/`dumpErrors` occurrences now **0** |
| §2 | `#error` / `#warn` correctness | «#5» | **SHIPPED** | `spinDocument.ts:744` branch guard `thisSideKeepsCode() \|\| !inIfDef()`; message via capture group, not fixed offset |
| §3 | Malformed and bare directives | «#6» | **SHIPPED** | `spinDocument.ts:828` `#<name> is missing its argument`; `:949` `Expected #ENDIF` against the opening line index |
| §4 | Classify remaining diagnostics | «#7» | **SHIPPED** | `spinDocument.ts:71` `MSG_MISSING_CONDITIONAL`, `:75` `MSG_EXPECTED_SYMBOL` — PNut wording hoisted to named constants, `preceeded` misspelling preserved verbatim |
| §5 | Spin2 language-version diagnostic | «#8» | **SHIPPED** | `spinDocument.ts:1198` — redundant `ERROR:` prefix dropped, true source line carried |
| §6 | `#include` argument diagnostics | «#9» | **SHIPPED** | `spinDocument.ts:1125` filetype, `:1128` missing-quotes — both `DS_FATAL`, specific message survives to stderr |
| §7 | Single plain-text error output | «#3» | **SHIPPED** | `logger.ts` — `errorColor`/`warningColor` occurrences now **0**; `compiler.ts:154-155` stderr only, stdout duplicate deleted |
| §8 | Delete output artifacts on failure | «#10» | **SHIPPED** | `src/utils/outputFilespecs.ts:39` shared derivation helper; `pnut-ts.ts:102-113` `run()` wrapper calls `removeOutputFiles()` on throw **and** on nonzero exit; `:136` `unlinkSync` |
| §9a-c | Scaffolding + fixtures | «#11» | **SHIPPED** | `testUtils.ts:643` `filesThatExist()`, consumed by the EXCEPT runner at `pnut-ts-except.test.ts:455`; **16** `pperr_*.spin2` fixtures with **16** matching `.errout.GOLD` |
| §9d | Artifact-cleanup suite | «#12» | **SHIPPED** | `src/tests/CLEANUP-tests/pnut-ts-cleanup.test.ts`, `jest-config/jest-cleanup-only-config.json`, `package.json:44` `test-cleanup` |
| §10 | Documentation | «#14» | **SHIPPED** | Preprocessor-Usage-Guide.md + Theory-of-Operations.md + CHANGELOG.md, commit `bf3bdfc` |
| §11 | Test-harness stderr pollution | «#2» | **SHIPPED** | `testUtils.ts:630` `isNodeInternalWarning()`, applied at **both** capture blocks — `pnut-ts-except.test.ts:74` and `:276` |
| §12 | Default-suite coverage | «#13» | **SHIPPED** | `jest-config/jest-coverage-config.json:21-22` — EXCEPT and PREPROC roots added |

**Naming note (not a finding):** §8 shipped as `removeOutputFiles()` inside a
`run()`/`runCompile()` wrapper rather than the plan's illustrative
`cleanupOutputs()`. The wrapper is *stronger* than what the plan specified — it
structurally guarantees no exit path can bypass cleanup, which is what the plan's
"consolidate run()'s exit paths so cleanup cannot be bypassed by a future early
return" asked for.

## 3. Scope extension (accepted in-sprint)

Four documents were added to scope **after** the plan was written, surfaced by
documentation-currency machinery built during this sprint. They were not
oversights in the plan — the gate that finds them did not exist when the plan was
authored.

| Item | Status | Evidence |
|---|---|---|
| Shipped-docs voicing guide | **SHIPPED** | `DOCs/voicing/Shipped-Docs-Voicing.md` |
| `Preprocessor.md` — Diagnostics section, `#error`/`#undef` corrections | **SHIPPED** | commit `5b6ae8e`; `verified: 1.55.2` in manifest |
| `CommandLine.md` — transcript regenerated from the shipping binary | **SHIPPED** | commit `5b6ae8e`; was missing `-m`, `-C`, `--cache-dir`, `--cache-clear` |
| `README.md` — v54→v55 parity claim, cache + map features | **SHIPPED** | commit `5b6ae8e` |

Supporting infrastructure delivered alongside (also outside the original plan):

- `DOCs/voicing/` family — shared core + per-artifact guides (`dd4902d`)
- `CHANGELOG.md` re-voiced against the new guide, 4,924 → 3,319 words (`f12663b`)
- Release plumbing repaired — lede-based headline, complete shipped doc set with
  hard failure on a missing doc, six pieces of `RELEASE-PROCESS.md` drift (`d3ed700`)
- `npm run docs-check` + `DOCs/doc-coverage.json`, 123 documents classified (`710b955`)
- P2KB preprocessor update request (`c8cd87a`)
- Dependency advisories cleared (`6cd545a`)

## 4. Exit baseline

Measured on `main` at `6cd545a`, container in Regression Mode.

| Metric | Entry (2026-08-07) | Exit (2026-08-08) | Verdict |
|---|---|---|---|
| Build | clean, 0 warnings | clean, 0 warnings | **held** |
| `npm test` | 276/276, 17 suites | **320/320, 20 suites** | **improved** |
| eslint `./src` | clean | clean | **held** |
| Group A — stderr pollution | 1 failure (`condCodeElse`) | **resolved** | **fixed as committed** |
| Group B — WUMMI dedup parity | 3 failures (FG1, Main, Mustererkennung) | **3 failed / 46 passed** | **unchanged, as deferred** |
| `docs-check` | *(did not exist)* | unclassified 0, shipped-stale 0 | **new gate, green** |

The plan's exit assertion — *"build clean / 0 warnings; standard suite 276/276
plus the newly-added EXCEPT + PREPROC suites all green; Group A resolved; Group B
still exactly 3 WUMMI failures and nothing new"* — **is satisfied in full.**

### Honest verification notes

- **Verified by execution**, not by inspection: the diagnostic strings documented
  in `Preprocessor.md` were each reproduced against the 1.55.2 binary
  (`Expected #ENDIF`, `Must be preceeded by #IFDEF or #IFNDEF`, `Expected a
  preprocessor symbol`), as was delete-on-failure (a prior `.lst` is gone after a
  failing rebuild).
- **One unexplained transient.** A single `npm test` run during release
  preparation reported 1 failure; the two full runs immediately following, and
  every run since, reported 320/320. The failing test could not be captured
  because it did not recur. This matches a transient recorded during the sprint
  (`isp_dummy_flash`, one failure then six clean runs). Standing total: **2
  isolated failures against 8+ clean full runs**, cause unknown. Flagged, not
  chased — it has never reproduced under observation.
- **The release workflow had not completed at the time of writing.** `v1.55.2`
  was tagged and pushed; the GitHub Actions run publishes the binaries. This is
  the first run using the repaired packaging step, so the published artifact set
  and release headline are **code-complete, not yet confirmed on the canonical
  target**.

## 5. Carryover

Nothing carried over from the plan — every section shipped. The following are
*newly identified* items, not deferred plan commitments:

1. **`copyright` is excluded from the release workflow's doc set.** Root
   `copyright` names `github.com/ironsheep/Pnut_ts_dev` (a private dev repo) and
   credits Iron Sheep Productions only; the `scripts-pkg/_dist/` copy that has
   actually been shipping names the public `github.com/ironsheep/PNut_TS` and
   credits **Iron Sheep Productions and Parallax Inc.** The `_dist` text is the
   correct one. Fix root to match, then add `copyright` to the `for doc in ...`
   list at `.github/workflows/release.yml:112`. Two one-line changes.
2. **38 governed documents are stale**, draining at 3/sprint by
   `policy.autoAddGovernedPerSprint`. Oldest three:
   `DOCs/language-specification/README.md` (329d),
   `DOCs/language-specification/ide-integration/README.md` (329d),
   `DOCs/internals/SPIN2-BIN-Format.md` (239d). Deferred from this sprint by
   explicit decision — unrelated to CLI robustness, and the drawdown rate is
   deliberate.
3. **`pkg` advisory GHSA-22r3-9w55-cj54** (moderate, no fix). devDependency used
   only by `npm run bld-dist`. Migrate to `@yao-pkg/pkg` or Node SEA. Note
   `npm audit --omit=dev` reports **0** — no runtime exposure.
4. **`#include` of a constants-only file fails** with `No PUB method or DAT block
   found` blamed on the included file. Pre-existing (reproduced on pre-sprint
   `58180b1`), uncovered because `TEST/PREPROC-tests/inc/included.spin2` has PUB
   methods *and* that suite runs `--pass preprocess`. Deserves its own sprint —
   sharing constants is arguably the main reason to use `#include`.
5. **`jest-full-config` carries 4 failures** (`dumpTables`, `condCode`,
   `condCodeElse`, `include`, all `TEST/FULL/`) that the entry baseline never
   recorded. Proven pre-existing via a worktree at `58180b1`. **Three of the four
   are already documented** as punch-list item 2 ("Stale preprocessor GOLDs"),
   whose recorded root cause is that `condCode`/`condCodeElse`/`include` are
   CON-only sources — legal as imported objects, not as top-level — so the
   compiler correctly errors `No PUB method or DAT block found`. What is *new*
   here is (a) `dumpTables`, not covered by that item, and (b) the observation
   that `TEST/FULL/pnut-ts-preproc.test.ts` runs the CLI with `-I inc` relative
   to cwd rather than to the test directory, which is a likely contributing
   cause for `include` independent of the GOLD staleness.
6. **WUMMI Group B** (3 dedup-parity failures) remains deferred, as agreed at
   sprint entry.
7. **Two stale remote branches** — `origin/add-usb-serialport`, `origin/develop`
   — noticed when `sprint/cli-robustness` was retired under the new
   no-branching rule. Contents unknown.

## 6. Process changes made during this sprint

Recorded here because they change how future sprints run, not just what this one
shipped:

- **No branching in this repo.** `sprint/cli-robustness` was merged `--ff-only`
  to `main` and deleted; the rule is recorded in `CLAUDE.md`, which overrides the
  general agent default that produced the branch. Release tags belong on `main`.
- **`sprint-plan` gained a documentation gate** (project overlay): search for
  every document describing the changed surface, default to inclusion, exclusion
  requires a stated reason. Plus a second search — `npm run docs-check` — for
  aged documents, and a dependency/housekeeping cleanup check (`npm audit`,
  `npm audit --omit=dev`) at plan time.
- These overlays are machine-local (`.claude/` is gitignored) per the project's
  no-committed-Claude-artifacts policy.
