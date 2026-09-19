# Map-Instance-Correctness — Sprint Closeout

**Closed:** 2026-09-19
**Plan:** `DOCs/roadmaps/completed/Map-Instance-Correctness-Sprint-Plan.md`
**Shipped as:** v1.55.8 (tag `v1.55.8`, final placement `e4da6fc`)
**Tasks:** «#53»–«#84» — 30 complete. «#82» was shelved by Stephen and is not
sprint work; «#79» was folded into this closeout's §6a.
**Board export:** [`2026-09-19-Map-Instance-Correctness-task-export.md`](2026-09-19-Map-Instance-Correctness-task-export.md)
**Retrospective:** [`2026-09-19-Map-Instance-Correctness-Retrospective.md`](2026-09-19-Map-Instance-Correctness-Retrospective.md)

---

## 1. Verdict

**Certified. Every plan commitment is SHIPPED against current code.**

Two items audited short of SHIPPED during closeout and were **fixed before
closing** rather than carried:

- «#74»'s last acceptance item — the resolver test was still outside the gated
  run. `jest-config/jest-coverage-config.json:26-27` now carries
  `dist/tests/FULL/` and `dist/tests/SHORT/`, and `--listTests` confirms
  `pnut-ts-resolver.test.js` is inside the gate.
- A **defect** the audit found in §8, fixed as «#84» — see §3.

Nothing is carried over into the punch list from this sprint. What remains open
(§7) is either Stephen's to act on or post-publish bookkeeping.

## 2. Section-by-section audit

| § | Commitment | Verdict | Evidence |
|---|---|---|---|
| §1 | One layout model, `ObjectLayout`, built once after the final image | **SHIPPED** | `objectLayout.ts:472` `buildObjectLayout()`; instance walk `:534-626`; images numbered in address order `:630-642`; `slotPath` `:150` |
| §1 | Declaration metadata expanded into slots via `elementCount` | **SHIPPED** | `RecordedNode.elementCount` `objectLayout.ts:48`; expansion `:592-624` |
| §1 | Own VAR size recorded per compiled variant | **SHIPPED** | `CompiledVariant.ownVarBytes` `objectLayout.ts:38`, checked `:546-548` |
| §1 | `ObjInstanceInfo`/`ObjInstanceStore` and their four accessors deleted | **SHIPPED** | Absent from `src/classes/*.ts`; surviving mentions are test comments recording the history |
| §1 | Cache parity — `elementCount` in the cached subtree, format bumped | **SHIPPED** | `objectCache.ts:296` carries `elementCount`; `CACHE_FORMAT_VERSION = 10` `:97`. The plan says "now 9": `fb07fc3` made it 9, then `02c17fb` (the commit that lands §1 itself) made it 10 for `.sym` sidecar replay. The plan's number went stale mid-sprint; it is not an overshoot |
| §2 | Symbols captured per compile, attached to that compile's instance | **SHIPPED** | `compiler.ts:658-671` builds a `CompiledVariant` per compile; cache-hit path `compiler.ts:475` `compiledVariantFromCache` |
| §2 | Each image gets the symbols of any instance that uses it | **SHIPPED** | `objectLayout.ts:662-679` `symbolVariants`/`symbols` |
| §2 | Non-map readers of the old per-source-file symbol store migrated | **SHIPPED** | The store and its accessors do not exist in `src/`; `compiler.ts:658` captures symbols directly into the variant, so nothing can still read per-source-file symbols by mistake. Migration was structural removal, confirmed by absence |
| §3 | Six sections in the specified order | **SHIPPED** | `mapGenerator.ts:210-217`; bodies at `:246`, `:298`, `:322`, `:362`, `:472`, `:502` |
| §3 | Single-token cells, comma-joined lists, `D[0..4]` run compression | **SHIPPED** | `formatRunList` `mapGenerator.ts:65-99` |
| §3 | Generator reads only `ObjectLayout` | **SHIPPED** | `mapGenerator.ts:16` imports nothing else; contract stated `:6-12` |
| §3 | Grammar specified in `MAP-File-Format.md` before the generator finished | **SHIPPED** | `DOCs/internals/MAP-File-Format.md` (grammar `:1-30`, worked example `:60-97`, parser notes `:99-140`) |
| §3 | Worked example reproduced byte-for-byte by a test | **SHIPPED** | `mapFormat.test.ts:96-102` extracts the spec's fenced example and asserts equality; falsification control `:106-113` |
| §3 | CHANGELOG leads with the breaking format change | **SHIPPED** | `CHANGELOG.md:24` |
| §4 | Checker never imports `ObjectLayout`, `mapGenerator` or the distiller | **SHIPPED** | `mapOracle.ts:46` imports only `fs`; `mapGroundTruth.ts:30-32` imports only `./mapOracle`, `./mapParser`, `./shapeMatrix` |
| §4 | Decoder measured against Windows `.obj.GOLD` bytes | **SHIPPED** | `mapOracle.ts:12,187` |
| §4 | Map parser for the §3 grammar | **SHIPPED** | `mapParser.ts` (393 lines) |
| §4 | DAT symbol under test is a LONG with a unique magic value | **SHIPPED** | `shapeMatrix.ts:8-9`, located via `findLongValue` (`:16`) |
| §4 | Shape matrix, including STRUCT copies, a 255-element array, a PASM-only top | **SHIPPED** | `TEST/MAP-tests/shapes/S18_struct_copies.spin2`, `S25_array_255.spin2`, `S26_pasm_only.spin2` (40 shape sources in all) |
| §4 | Each shape compiled uncached and warm-cached; the two `.map`s identical | **SHIPPED** | `mapFormat.test.ts:126-147`; per-layout `objectLayout.test.ts:278-299` |
| §4 | GOLD corpora incl. WUMMI less punch §21 | **SHIPPED** | `mapOracleGold.test.ts:59-78` |
| §4 | `npm run map-fuzz`, printing the seed of a failure | **SHIPPED** | `package.json:50`; `scripts/map-fuzz.js` |
| §4 | Negative controls — the checker must be able to fail | **SHIPPED** | `mapVerifyFalsification.test.ts` (corrupt method address, wrong VAR name, wrong method name). No test replays a stored 1.55.7 map, which the plan named as one illustration; the requirement it illustrates is met by these controls |
| §5 | `verify-map.ts` exact method entries, image bases cross-checked by the §4 decoder | **SHIPPED** | `verify-map.ts:96-150`, `:160-165` |
| §5 | Fixtures staged into a temp tree; the MAP suite never writes into `TEST/` | **SHIPPED** | `map.test.ts:20,47` via `stageTree`; stated in `TEST/MAP-tests/README.md` |
| §5 | STRUCT fixture, and the README documenting every fixture | **SHIPPED** | `TEST/MAP-tests/test8-struct/struct_map.spin2` + `expected.json`; README covers all eight |
| §6 | `--runInBand` on `npm test`; cache tests off in-place `TEST/` writes | **SHIPPED** | `package.json:60`; `objectCache.test.ts` uses `stageTree` throughout; private cache dir `cacheFixtures.ts:100-124` |
| §7 | `.lst`, `-i` report, `--regression` and object writes all synchronous | **SHIPPED** | `spin2Parser.ts:512`, `spinDocument.ts:315`, `regression.ts:61,92,123`, `spin2Parser.ts:571,652` |
| §7 | Dead `dumpUniqueChildObjectFile`/`dumpUniqueObjectFile` deleted | **SHIPPED** | Neither name occurs anywhere in `src/` |
| §8 | `p2kb-verify` reads the 1.55.8 map format; new identical-copy, array and DAT-fork cases | **SHIPPED** | `scripts/p2kb-dedup-verify:245,263-264,423,482,521,581` |
| §8 | `npm run p2kb-verify` passes every case | **SHIPPED** *(was a DEFECT — fixed at closeout, «#84»)* | 15/15 measured 2026-09-19. See §3 |
| §8 | P2KB entry re-measured and rewritten as "reliable from 1.55.x" | **SHIPPED as a proposal** | `DOCs/handoff/p2kb/P2KB-map-caveat-retraction-1.55.4.md:7-14` |
| §8 | Stephen applies the amendment; live entry verified | **CARRYOVER — outside this repository** | The draft records that the live entry still carries the original `map_caveat` |
| §9 | `MAP-File-Format.md` rewritten; authority repointed to `ObjectLayout` | **SHIPPED** | `MAP-File-Format.md:23-30`; stamped `"verified": "1.55.8"` `doc-coverage.json:257-263` |
| §9 | `CommandLine.md` `-m` row, `README.md` feature line | **SHIPPED** | `CommandLine.md:83`; `README.md:53` |
| §9 | Cache ToO, Distiller ToO and `Theory-of-Operations.md` brought current | **SHIPPED** | Cache ToO `:463,468`; Distiller ToO `:89-97,338-360`; ToO `:598-615`. The plan's own line citations for these three are stale — the content is present at different lines |
| §9 | `TEST/MAP-tests/README.md` updated for §5 | **SHIPPED** | `TEST/MAP-tests/README.md:1-20` |
| §9 | Punch §14, §16, §20, §22 closed into a dated archive at closeout | **SHIPPED** | Swept in this closeout — see §7 |
| §10 | Dev-only advisories cleared, lockfile only | **SHIPPED** | `npm audit` → 0 vulnerabilities (re-run at closeout); commit `9a01733` |
| §11 | `Data-Packing-Alignment-Guide.md` re-verified, VAR-packing first | **SHIPPED** | `doc-coverage.json:450-459` stamped 1.55.8 |
| §11 | `PNUT-TS-MISSING-EFFECTS.md` re-verified | **SHIPPED** | `doc-coverage.json:313-320` stamped 1.55.8 |
| §11 | `Inline-PASM-Usage-Guide.md` re-verified, examples compiled | **SHIPPED** | `doc-coverage.json:485-494` stamped 1.55.8 |

The §1↔task cross-reference table reconciles in both directions: all eleven
numbered sections have a row, and all thirteen rows name a real section.

## 3. Findings the plan did not anticipate

**The sprint roughly doubled.** The table covers «#53»–«#65». Eighteen further
tasks shipped, almost all of them defects found while working — Stephen's rule
that a defect is fixed when found, not recorded:

- «#66» `.obj` written for `-O` without `-l`; «#68» `-D SYM=value` rejected with
  a diagnostic; «#69» `if`/`elseif` on their own line diagnosed; «#76» an unknown
  command-line option aborts; «#70» `#pragma exportdef` settled as presence-only.
- «#75» every GOLD comparison made exact — and what that exposed. This is the
  sprint's most consequential unplanned finding: a ±1 tolerance had been hiding
  real divergence, which is what surfaced «#74».
- «#74» PNut's integer CORDIC ported for compile-time `QLOG`/`QEXP`
  (`src/utils/cordicQ.ts`, BigInt 64-bit fixed point). A differential run over
  1M inputs found 90,506 QLOG and 256,548 QEXP disagreements against the old
  floating-point folding. Stephen regenerated the Windows GOLDs (`715812f`).
- «#71» preprocessor GOLDs owned and regenerated, FULL `-I` path fixed; «#72»
  our own test and release-gate defects; «#73», «#77», «#78» documentation
  defects and re-verification.
- «#67» the release and packaging docs rewritten to describe the real release
  build (the workflow, not `npm run bld-dist`).
- «#80», «#81» found by the v1.55.8 release workflow failing: a gated suite that
  required the gitignored WUMMI corpus, and the clean-clone shrink behind it —
  CI was verifying 890 tests where a local run verified 1000, silently. Closed
  by `src/tests/CLEANUP-tests/localOnlyFixtures.test.ts`, which fails on any
  present-but-untracked fixture outside a commented allowlist.
- **«#84», found by this closeout's own audit.** `scripts/p2kb-dedup-verify:101`
  compiled with `-b`, a flag PNut-TS never defined. It was harmless while
  unknown options were ignored and became fatal the moment «#76» made them an
  error — so a script this sprint updated was broken by another change in the
  same sprint, and `npm run p2kb-verify` scored 14/15 while the P2KB draft
  claimed 15/15. The flag is gone (a bare compile already writes `.bin`), 15/15
  is measured, and the draft is re-stamped against shipped 1.55.8. Nothing
  caught this because `p2kb-verify` is reachable from no gate — see §7.

## 4. Exit baseline

Canonical target: the dev container, `npm run build && jest --runInBand -c smm.jestconfig.js`.

| | Entry (2026-09-14) | Exit (2026-09-19) |
|---|---|---|
| Suites | 26 | **47** |
| Tests | 432 passed | **1011 passed** |
| Failed | 0 | **0** |
| Skipped | 0 | **0** |
| Wall clock | 143 s | 588 s |

Health has not worsened; the gate is 2.3× wider than at entry. `npm run lint`
clean. `npm audit` reports 0 vulnerabilities. The growth is the sprint's own MAP,
CACHE and CLI suites plus the FULL/SHORT roots added at closeout.

## 5. Verification, stated honestly

- Every SHIPPED verdict above is a **code citation in the current tree**, not a
  commit message. Where an audit could not settle a row by reading, it was sent
  back rather than accepted — five rows were closed that way.
- The exit baseline was **run**, in band, in the canonical environment.
- `npm run p2kb-verify` 15/15 was **measured after** the «#84» fix.
- **No style gate was run, because none exists.** `STYLE_GATE_COMMAND` is unset
  in `.claude/skill-conventions.md`; every `CONFORMANCE_GUIDES` row for the
  surfaces this sprint wrote into is `strength: reference`, and conformance was
  spot-read, not mechanically checked. This is recorded as owed, not waived.
- `npm run docs-check` is advisory. At closeout: no document whose covered source
  this sprint changed is stale, and no shipped doc is stale.
- The three §11 guide re-verifications are certified by their `doc-coverage.json`
  1.55.8 stamps. The closeout did not recompile all 47 guide examples a second
  time; it verified that the stamps and the content exist.

## 6. Board

- 30 tasks complete («#53»–«#84», less «#79» and «#82»).
- One task was paused during the sprint — «#74», on Stephen's Windows GOLD
  regeneration. The blockage was resolved by `715812f` and the task is complete.
- «#82» is shelved at backlog priority by Stephen's instruction (the
  static-analysis checker gap). It carries its measurements so nothing must be
  re-derived.
- **Task cards: 1 read against 4 task starts this session.** The card requires a
  read at every start and close; it was read once, at «#80», and the later starts
  worked from that reading. Recorded as a process miss, not smoothed over.

## 7. Carryover and what remains open

**Stephen's, outside this repository**

1. **P2KB `map_caveat`** — the retraction is drafted, current, and re-measured
   against shipped 1.55.8 (`DOCs/handoff/p2kb/P2KB-map-caveat-retraction-1.55.4.md`).
   The published entry still carries the original caveat, which is now wrong for
   1.55.8. Only Stephen can apply it.

**Post-publish bookkeeping for v1.55.8**

2. Verify the published release page: six archives, headline and body against the
   CHANGELOG section, macOS signing.
3. Add the 1.55.8 row to `DOCs/RELEASE-PROCESS.md` (deliberately a post-publish
   step).
4. The interim coverage update owed after this release, on its own schedule
   (`RELEASE-PROCESS.md:31`).

**One open question**

5. **Should `npm run p2kb-verify` be reachable from a gate?** «#84» existed
   because nothing runs it. It compiles fixtures and takes seconds, so it could
   join the gated suite as a test — but it verifies claims about an external
   corpus, which is a different job from regression testing. Not added silently;
   Stephen's call.

**Not carryover, recorded for accuracy**

6. The plan's own citations went stale in three places (`CACHE_FORMAT_VERSION`
   9 vs 10; three §9 line numbers). The plan is archived as written; this
   document carries the corrections.
