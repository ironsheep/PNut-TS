# Object-Cache-Transitive-Invalidation — Sprint Closeout

**Closed:** 2026-08-24
**Plan:** `DOCs/roadmaps/completed/Object-Cache-Transitive-Invalidation-Sprint-Plan.md`
**Shipped as:** v1.55.4 (tag `v1.55.4`, commit `b00940d`)
**Tasks:** «#27»–«#44» (18), all complete
**Retrospective:** [`2026-08-24-Object-Cache-Transitive-Invalidation-Retrospective.md`](2026-08-24-Object-Cache-Transitive-Invalidation-Retrospective.md)

---

## 1. Verdict

**Certified, with one carryover requiring Stephen's decision (§12).**

Twelve of thirteen plan sections are SHIPPED against current code. §12 is
PARTIAL and blocked outside this repository. Two sections audited PARTIAL during
closeout (§6, §9) and were **fixed before closing** rather than carried.

## 2. Section-by-section audit

| § | Commitment | Verdict | Evidence |
|---|---|---|---|
| §1 | Dependency manifest | **SHIPPED** | `objectCache.ts:530` `isEntryValid()` re-reads and re-hashes every `.dep` entry; `getIfValid` `:438` counts a stale entry as a miss; SHA-256 of raw bytes `:739`; manifest absent from `CacheKeyInputs` `:98-121`, so validated beside the key, not hashed into it |
| §2 | `DAT ... FILE` blobs in the manifest | **SHIPPED** | `compiler.ts:651` merges every `datFile.fileSpec` into the subtree manifest |
| §3 | Format version bump | **SHIPPED** | `objectCache.ts:82` `CACHE_FORMAT_VERSION = 8`; checked by all four sidecar readers |
| §4 | Shared test scaffolding | **SHIPPED** | `cacheFixtures.ts:45,50,57`; the old local helpers are **gone** from `objectCache.test.ts`, not left beside the new ones |
| §5 | Singleton-diamond fixture family | **SHIPPED** | `TEST/CACHE-fixtures/sgl_*`; diamond arms at `sgl_svc_logger.spin2:18` / `sgl_svc_config.spin2:21`; `#pragma exportdef` path at `sgl_app_top.spin2:28` |
| §6 | Invalidation suite, 7 mutation targets | **SHIPPED** *(was PARTIAL — fixed at closeout)* | All seven targets present with the required byte-equality gate. The corroborating "second net" had shipped in one test instead of seven; added to the other five, `objectCacheInvalidation.test.ts`. 87/87 cache tests pass |
| §7 | Index-space unification | **SHIPPED** | Resolved by construction rather than by patching seven sites: hierarchy is recorded during descent (`compiler.ts:248-254`). `objectIndex` no longer exists anywhere in `src/`; `getFileAtIndex` has zero callers |
| §8 | `ObjInstanceStore` rekey | **SHIPPED** | `objInstanceInfo.ts:148-167` keyed on instance identity; the "Indexed by object index" doc comment is gone; all four `getInstance` callers audited |
| §9 | Row A8 + analysis stamp | **SHIPPED** *(was PARTIAL — fixed at closeout)* | A7/A8 corrected `:66-67`; B1 connection `:106-115`. The residual-gap paragraph contradicted §5.4 and cited a section that no longer exists — **the contradiction was introduced during this release's own doc pass** and is corrected |
| §10 | Three governed documents | **SHIPPED** | `doc-coverage.json:149,153,154` stamped 1.55.4; content reworked in `94bcb37` |
| §11 | Shipped docs + changelog | **SHIPPED** | `README.md:49`, `CommandLine.md:75,82,88-97,116`; `CHANGELOG.md` leads with the singleton consequence |
| §12 | P2KB `map_caveat` retraction | **PARTIAL — CARRYOVER** | Re-measurement and replacement text exist in `P2KB-map-caveat-retraction-1.55.4.md:132-171`. **The amendment is not applied**; the live entry still carries `map_caveat`. Blocked outside this repository |
| §13 | Register cache suites in `npm test` | **SHIPPED** | `jest-config/jest-coverage-config.json:23`; `testMatch` sweeps all six suites in that directory |

## 3. Findings the plan did not anticipate

**Half of what shipped was not in the plan.** The cross-reference table covers
«#27»–«#38». Six further deliverables shipped — «#39» resolution-root keying,
«#40» the full `.map` redesign, «#41» map comparison folded into the
byte-equivalence harness, «#42» `--cache-verify`, «#43» the duplicate-source
warning, «#44» the mutation sweep suite. «#39» in particular fixed a *silently
wrong binary* that the plan never contemplated: two applications in one project
sharing a library object that embeds a `DAT ... FILE` blob, hit with `-C` and the
default cache directory alone.

This is not a criticism of the plan — the defect was found by executing it. But a
plan that describes half the sprint is a planning signal, and it belongs in the
retrospective rather than being absorbed silently.

**Estimates and actuals differ by roughly 12×.** 29h 50m estimated across 18
tasks; 2h 31m of recorded todo-mcp wall-clock. This is the fourth sighting of the
same ratio and it remains unresolved pending Stephen's ruling on what an estimate
denotes. Tracked in the promotion buffer.

**Two Documentation Blast Radius rows the plan declared were never touched** —
`TEST/MAP-tests/README.md` and `DOCs/internals/Distiller-Theory-of-Operations.md`.
Both were fixed at closeout. The plan-time gate named them correctly; execution
did not come back to them. The gate is only as good as the closeout that audits it.

## 4. Exit baseline

| Measure | Entry (2026-08-21, plan:19-29) | Exit (2026-08-24) | Verdict |
|---|---|---|---|
| Build | clean, zero warnings | clean, zero warnings | unchanged |
| `npm test` | **325 / 325**, 20 suites | **415 / 415**, 26 suites | improved |
| Cache suites | 59 / 59, **outside** the standard run | folded in — part of the 415 | improved (§13) |
| Cache mutation sweep | did not exist | **26 / 26** | new |
| `npm run lint` | clean | clean | unchanged |
| `docs-check` unclassified | 0 | 0 | unchanged |
| `npm audit` | 1 moderate (`pkg`, no fix) | **0** | improved |

**Health did not worsen. No regression against the entry baseline.** The +90
tests are the cache suites entering the standard run (§13) plus §6's additions
and the new suites from «#41»–«#44».

## 5. Carryover

1. **§12 — apply the P2KB `map_caveat` amendment.** The prepared text is in
   `DOCs/roadmaps/P2KB-map-caveat-retraction-1.55.4.md:132-171`. Until it lands,
   `p2kbSpin2ObjectImageDedup` tells P2 developers to distrust `.map` instance
   and source labels that are now correct. Outside this repo; needs Stephen.
2. **Punch-list §13** — documentation residue from the release sweep
   (`SPIN2-BIN-Format.md` citation audit, `Testing.md`, `DOCs/README.md` links,
   the generated coverage report, the empty `packaging` doc area, and the
   `LICENSE`/`copyright` year, which is Stephen's call).
3. **Punch-list §14** — test-harness items: strengthen `verify-map.ts` from a
   lower bound to the exact `abs == base + rel` identity, and resolve the
   `--runInBand` divergence together with `objectCache.test.ts`'s in-place
   compiles.
4. **Punch-list 5d (re-scoped)** — the `.dep` manifest declares source inputs but
   not the entry's own sidecar set, so a sidecar swapped between entries is still
   undetected.

## 6. Verification status

Everything above is **verified on the canonical target** — this dev container is
where PNut-TS builds and runs its full suite, so there is no provisional half.

Two exceptions, stated rather than glossed:

- **The mutation sweep found zero defects.** It was built after the fixes, so it
  validates nothing about this release. It was proved *able* to fail — disabling
  the resolution-root fix produces 5/5 detections — which is what makes it
  insurance for the next cache change.
- **Five of six `pkg` targets are unverified locally.** The container is
  `aarch64`; a packed x64 binary cannot execute here. Only CI can prove those.
