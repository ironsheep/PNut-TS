# Object-Cache-Transitive-Invalidation — Retrospective

**Sprint:** Object-Cache-Transitive-Invalidation · **Shipped:** v1.55.4
**Closeout:** [`2026-08-24-Object-Cache-Transitive-Invalidation-CLOSEOUT.md`](2026-08-24-Object-Cache-Transitive-Invalidation-CLOSEOUT.md)

---

## Discovered perspectives

- **The defect we planned for was not the worst one in the file.** The plan
  targeted transitive staleness. Execution found that the cache key omitted the
  **resolution root**, so two applications in one project sharing a library
  object with a `DAT ... FILE` blob silently swapped each other's data — with
  `-C` and the default cache directory, no unusual setup. That is a
  wrong-binary-no-diagnostic class defect and nothing in the plan pointed at it.
- **A verification signal the plan ranked as primary was measurably backwards.**
  The plan said byte equality was weak and the `.map` signals would catch a fork
  it missed. Measured: editing the diamond node yields a warm binary **88 bytes
  larger** while the `.map` is byte-for-byte identical. A test gated on the map
  signals alone passes on a provably wrong binary. The plan was corrected
  mid-sprint against the measurement.
- **A test can encode the defect it is supposed to catch.** `verify-map.ts`
  asserted the map's method entry equalled the listing's VALUE field. The
  listing's VALUE is a header *slot index*; the map printed that same index in an
  address column. The assertion passed *because* the bug existed, and would have
  failed the moment it was fixed.
- **Instrument-before-fix produces no evidence about the fix.** The mutation
  sweep found zero defects against 1.55.4 across 38 checks. It was built after
  the fixes, so that is not validation — it is insurance for the next change, and
  it only means anything because it was proved able to fail (disabling the
  resolution-root fix gives 5/5 detections).
- **`ADDRESS INDEX`/`SYMBOL INDEX` rows collapse; they are not one-per-instance.**
  Stated wrong twice — in the changelog and in a subagent brief — before being
  measured. Rows are built per instance, then merged on identical content with
  the survivor labelled `SHARED+3`.

## Process insights

- **The Documentation Blast Radius gate named two files that nothing ever
  touched.** `TEST/MAP-tests/README.md` and `Distiller-Theory-of-Operations.md`
  were declared **Update** at plan time and were still untouched at tag time.
  They were found by the closeout audit, not by any gate. The gate produces rows;
  nothing binds an Update row to a numbered section, so nothing audits it.
- **A documentation pass introduced a contradiction into the document it was
  fixing.** Correcting §6 of the cache analysis added a paragraph citing
  "§5.4-2" — a subsection that the same release had already dissolved — and
  overstated the residual gap. The document carries `verified: 1.55.4`, so the
  false claim shipped under a stamp asserting someone had checked.
- **Dispatching the survey and the audit worked, and the audit caught the
  arbiter's own errors.** Both the §9 contradiction and the row-collapse mistake
  were mine; both were surfaced by a subagent given a narrow brief. Verifying its
  claims in source rather than relaying them is what made them safe to act on —
  one of its section verdicts (§6 PARTIAL) turned out to be technically right but
  materially smaller once the plan's own mid-sprint correction was read.
- **The punch list's "why deferred" reasoning was wrong on its facts and said
  so confidently.** Item 5e dismissed the `DAT FILE` blob gap because "neither
  pattern appears in observed project layouts." That pattern was exactly what bit
  users. The wrong reasoning was left in place at closeout, deliberately, as a
  caution.

## Quality and efficiency observations

- **Estimates ran ~12× actuals** — 29h 50m estimated, 2h 31m tracked, across 18
  tasks. **Fourth sighting of the same ratio.** It is very likely a units
  mismatch (human-hours estimated, agent wall-clock recorded) rather than
  estimation error, and it still has no ruling.
- **Half the sprint shipped outside the plan** — six deliverables («#39»–«#44»)
  with no plan section. Not a planning failure in itself; they were discovered by
  executing. But nothing in the closeout format asks for plan coverage, so a
  sprint can describe half of itself and read as clean.
- **The crash cost nothing**, because the context key carried the sprint's
  decisions and gotchas rather than just its position. Recovery was one
  `context_resume` plus a verification run.

## Downstream impact

**Enables:** a mutation sweep that will catch the next cache regression; a
`--cache-verify` flag users can run on their own projects; an instance model
that makes the `.map` trustworthy enough to be the second net in cache tests;
two internals documents where the `map-file` area previously had **zero**
covering documents.

**Destabilizes:** every existing cache is invalidated by the format bump, and
some previously-hitting builds now correctly miss. Anything parsing `.map` needs
updating. `.dep` declares source inputs but not the entry's own sidecar set, so
sidecar-swap corruption remains undetected (punch 5d).

## Methodology lessons

1. **An Update row in the Documentation Blast Radius has no owner.** The plan
   declares it; no numbered section carries it; closeout audits sections. Fix
   belongs in `sprint-closeout` §2 — audit the plan's Blast Radius table rows
   directly, not only its numbered sections. *This sprint is the evidence: two
   declared rows, both missed, both found only by an adversarial audit.*
2. **Editing a governed document should re-read what the edit cites.** A
   cross-reference to a section the same release dissolved is a silent
   contradiction under a `verified` stamp. Candidate for `document-finalize`.
3. **Closeout should state plan coverage.** "12 of 13 sections shipped" and "6 of
   18 deliverables had no plan section" are different facts and only the first is
   currently reported.
4. **A punch-list "why deferred" rationale is a claim and can be false.** 5e's
   dismissal was confidently wrong. Deferral reasoning deserves the same
   reproduce-the-claim discipline the doc gate applies to Excluded rows.

## Candidates-buffer triage (`{{PROMOTION_SOURCE}}: yes` — adopt → certify → promote)

| Entry | Verdict |
|---|---|
| Atomic green-unit ordering (2026-08-08) | **Addressed** — `APPLIED` to central `plan-to-tasks` §3b in v6; confirmed central carries it. Delete. |
| Doc-impact search-and-disposition gate (2026-08-08) | **Addressed** — `APPLIED` to central `sprint-plan` §4 in v6. Delete. |
| Documentation deliverables *outside* the repository (2026-08-21) | **Certified** — this sprint's §12 existed as a numbered deliverable *because of* this rule. It fired exactly as designed; the retraction is carried over only because it is blocked outside the repo. |
| Verification signals that don't detect the defect (2026-08-21) | **Certified** — the 88-byte measurement reversed the plan's own ranking mid-sprint, before seven tests were written against an insensitive signal. |
| Planned fixture filename silently gitignored (2026-08-21) | **Certified** — fired during «#27»; `cfg_defaults.bin` was invisible to git and renamed `.dat`. |
| Compatibility-impact plan-close gate (2026-08-07) | **Promote** — adopted, certified twice, re-measured against central at v9 and still central-absent. Needs the generality gate + owner-judgment override. |
| "Excluded" row silently asserts the doc is TRUE (2026-08-09) | **Adopted**, `certified: PENDING`. Note: this sprint's misses were on the *Update* side, not the Excluded side — see methodology lesson 1. |
| `DISPATCH_MODEL` precedence + dispatch conserves-not-clears (2026-08-24) | **Proposal** — fleet-wide, not project-shaped; central already has the session's write-up. |
| Estimate vs. actual ~12× (2026-08-08) | **Deferred — fourth sighting.** Past the three-retrospective threshold. Needs an explicit address-now or closed-no-change ruling from Stephen. |
| planning→execution handoff boundary (2026-08-07) | **Deferred** — not exercised this sprint. |
| External static-analysis triage (2026-08-08) | **Deferred** — no analyzer run this sprint. |
| Per-task `simplify` fan-out on micro-diffs (2026-08-09) | **Deferred** — not exercised. |
| `npm audit` at plan time (2026-08-20) | **Certified** — the advisory it predicts surfaced exactly where predicted: on the push before a release tag. Resolved same day by migrating to `@yao-pkg/pkg`. |
| Reproduce reporter's actual scenario (2026-06-08) | **Adopted**, `certified: PENDING` — no user-bundle defect work this sprint. |
| Atomic-unit commit deferral assumes a PAIR (2026-08-21) | **Deferred** — the 3-task unit did occur; work was not lost, so no forcing evidence yet. |
| `TaskCreate` assumed present (2026-08-21) | **Deferred** — harness property, unchanged. |
| Rename-refactor misses raw locals (2026-08-21) | **Deferred** — real but single-sighting. |

## Verdict

**This sprint produced process learning worth acting on.** Four methodology
lessons, three buffer entries newly certified, one ready to promote, and one
deferred item now past the threshold that requires an explicit ruling.
