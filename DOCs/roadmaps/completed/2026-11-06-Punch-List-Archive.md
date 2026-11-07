# Test Suite Punch List

Items deferred from the v1.54.3 cache-fix release that need follow-up. These
were uncovered while auditing `npm run test-full` and `npm run audit-errors`
before release. None block the v1.54.3 fix; all should be addressed before
they accumulate further.

---

## Status index (2026-09-19)

**Compiled output** asks one question: does this item mean the compiler can
produce a wrong program (`.bin` / `.obj` / `.flash`)?

| # | Item | Compiled output | Status |
|---|---|---|---|
| 4 | Dead flash/RAM download code | no | closed 2026-11-06: the helpers are removed from `src/` |
| 5 | Object-cache hardening | no observed defect | open, deferred by trigger |
| 6 | GOLD-regen workflow cleanup | no | closed 2026-11-06: 6.2 resolved (below); 6.4 closed by the Windows regen and archived 2026-09-19 |
| 10 | Language-spec extraction pipeline | no | open — measured 2026-09-17, Stephen's decision (repair vs retire) |

---

## 4. Dead flash/RAM download infrastructure (closed 2026-11-06)

> **Closed.** Re-checked 2026-11-06: `P2InsertFlashLoader`, `LoadHardware` and `flashLoaderLength` no longer appear in `src/`. The text below is the original item.

> **Compiled output: no** — dead code.

v1.54.3 removed the user-facing `--flash` / `--ram` / `--both` / `--plug` /
`--dvcnodes` CLI options (none ever went live), the dead branches that
referenced them, the `writeFlash` / `writeRAM` fields from `CompileOptions`,
and simplified `Spin2Parser.ComposeRam()` to drop its now-permanently-false
parameters. The following internal helpers became dead code as a result and
should be deleted in a follow-up pass:

- `Spin2Parser.P2InsertFlashLoader()` — only callable from the now-removed
  `programFlash` branch
- `Spin2Parser.LoadHardware()` — only callable from the now-removed
  `ramDownload` branch
- `ExternalFiles.flashLoaderLength` — referenced only from
  `P2InsertFlashLoader`, so it goes with it. The `flashLoader` getter and
  `flash_loader.obj` stay: the `-F` path (`P2MakeFlashFileImage`) copies bytes
  0x160-0x1f0 of it.

The flash *image file* path (`-F, --flashfile`, `P2MakeFlashFile`,
`writeFlashImageFile`) is still active and supported — that produces a
`.flash` image for an external programmer, which is the use case we kept.

**Why deferred:** removing the helpers touches `externalFiles.ts` — small, but
surface area beyond the CLI cleanup that motivated this release. Nothing under
`src/ext/` is removed; `externalFiles.ts` loses one getter.

---

## 6. GOLD-regen workflow cleanup (deferred from v55 prep, 2026-05-11)

> **Compiled output: no** — GOLD-regen workflow. Closed out 2026-09-17: 6.1
> (20 legacy `*-rebuild-v52/` dirs + their gitignore entry), 6.3 (544 `.elem`/
> `.elemORIG`/`.elemGOOD` files — `.elemold`/`.elemOLD`/`.elem.REF`, not named
> by this item, were left alone), and 6.5 (V52A-tests substring rule — verified
> correct, no drift) are deleted/verified and their subsections below removed.
> 6.6 is closed as a **fixed test-code defect, not a GOLD or compiler
> problem**: `src/tests/ALLCODE-tests/pnut-ts-allcode.test.ts.HOLD` forced
> `-d` for `coverage_003_v44.spin2` via a stale `explicitDebugFiles` entry
> left over from the pre-v55 GOLD (which *was* built `-cd`); the v55 regen
> (153de2f) rebuilt this file's GOLD as `-c` (no `DEBUG data`/`DEBUG records`
> section, 332 OBJ bytes) and nobody updated the list to match. Compiling
> with `-d` reproduces the old 340-byte/DEBUG-data shape byte-for-byte
> against the pre-v55 GOLD, proving the compiler is right and only the test
> harness was stale; fixed by removing the entry. The unrelated `-44` CLI
> argument `pnut-ts-cov.test.ts` passed for this file has never been a real
> pnut-ts option (Spin2 language-version forcing is source-tag-only, via
> `{Spin2_vNN}`, which this file has never carried) — it silently
> no-opped (commander prints "unknown option" but PNut-TS's error handler
> falls through and compiles anyway) and has been removed as dead/misleading
> test code. 6.2 (EXCEPT-tests errout format) and 6.4 (TOF GOLDs) were both
> later closed by Windows PNut sessions.

**Context:** A unified GOLD-regen workflow was built in `scripts/gold/`
(library + driver + bundle/apply scripts + 26 per-suite `rebuild-gold.ps1`
files + npm scripts `gen-regold-tarball` / `apply-regold-tarball`). It
supersedes the legacy per-suite scaffolding and the manual "tarball-by-hand
to Windows" process. The following cleanup items were deferred so the
workflow could be built and verified end-to-end without touching unrelated
state.

### 6.2 EXCEPT-tests errout-format resolution (closed 2026-11-06)

> **Closed.** Windows PNut's `Error.txt` is `path:line:error:message`, so
> EXCEPT-tests joined the Windows regen and its `.errout.GOLD` files now come from
> PNut, apart from fixtures for PNut-TS-only behaviour. The orphan
> `TEST/CON-tests/symbol_length_test.errout.GOLD` is deleted. The text below is the
> original item.

`scripts/gold/investigate-errout.ps1` was written to capture Windows PNut's
`Error.txt` format for the 7 EXCEPT test sources + the CON `symbol_length_test`
orphan. Output (JSON, paste-back) settles whether EXCEPT-tests can join the
Windows-regen scope or must remain pnut-ts-derived.

Three possible outcomes drive different follow-ups:

- **Windows produces `path:line:error:message`** (matches pnut-ts gcc-style):
  add `TEST/EXCEPT-tests/rebuild-gold.ps1` (default `-c`, but capture
  `Error.txt → .errout.GOLD` on compile failure). Library needs a small
  extension to the success-path-only behavior. Regenerate all 61 EXCEPT
  GOLDs (incidentally fixing the stale `/workspaces/Pnut-ts-dev/...` paths
  baked into 5 of them).

- **Windows produces a different parseable format**: write a normalizer in
  the library that translates Windows `Error.txt` to canonical
  `path:line:error:message` before saving as GOLD. Otherwise as above.

- **Windows format is irreconcilable**: leave EXCEPT-tests excluded from
  Windows regen. Document the pnut-ts-as-errout-source convention in the
  test file headers. Delete the orphan `TEST/CON-tests/symbol_length_test.errout.GOLD`
  (unreferenced, unproduced by any current code).

**Trigger:** run `investigate-errout.ps1` on Windows whenever next at the
Windows box. The empirical output dictates the path; no design work needed
until then.

## Cross-cutting note: regression tests against "us-vs-us" GOLDs

Several suites (the resolver `dumpTables` GOLD, the `TEST/FULL/preprocessTESTs`
preproc GOLDs, the deleted `--regression tables` apparatus, the deleted
`pnut-ts-element` test) all share one structural problem: regression suites
that compare PNut-TS output against PNut-TS-generated snapshots from a prior
date. These rot whenever the format intentionally evolves and there's no
mechanism to refresh them.

The deletions in v1.54.3 (`--regression tables`, `pnut-ts-element`) accept
that some of these snapshot comparisons aren't worth maintaining because
the underlying data (bytecode tables, elementizer output format) is
*designed* to evolve. Items that survived (resolver, preprocessor) capture
behaviors that *shouldn't* change — math operations and preprocessor
semantics — so a stable GOLD makes sense provided we own the regenerate
flow. (The preprocessor GOLDs were regenerated and given a
regenerate-recipe header in the test file itself — see
`src/tests/FULL/pnut-ts-preproc.test.ts` — closing former punch list §2/§9.)

A general principle worth adopting: any GOLD that PNut (Pascal) cannot
produce must come with a documented "how to refresh this" recipe in the
test file's header, or it doesn't belong in the suite.

---

## Closed and archived

Item numbers are never reused, so references elsewhere stay valid.

| Items | Archive |
|---|---|
| 7 | `completed/2026-08-09-Punch-List-Archive.md` |
| 5b, 5e, 5f, and three unnumbered `.map` items (all closed in 1.55.4) | `completed/2026-08-24-Punch-List-Archive.md` |
| 3, 8, 12, 13b, 13c, 13e, 13f, 17, 18 | `completed/2026-09-14-Punch-List-Archive.md` |
| 6.4, 14 (14a, 14b), 16, 20, 21, 22, 23 (all closed in 1.55.8) | `completed/2026-09-19-Punch-List-Archive.md` |
| 19 (closed 2026-11-05: the coverage rule is a maintainer step, `npm run coverage -- --check`, with no percentage gate; the old Coverage Mode is retired) | No archive file; closed in place by `PROCESS/Test-Hardening-Sprint-Plan.md` §14 and `DOCs/RELEASE-PROCESS.md` §2 |

---
