# Map-Instance-Correctness — Sprint Retrospective

**Sprint:** Map-Instance-Correctness (started 2026-09-14, closed 2026-09-19)
**Shipped as:** v1.55.8, tag `v1.55.8`, final placement `e4da6fc`
**Closeout:** [`2026-09-19-Map-Instance-Correctness-CLOSEOUT.md`](2026-09-19-Map-Instance-Correctness-CLOSEOUT.md)
**Plan:** [`Map-Instance-Correctness-Sprint-Plan.md`](Map-Instance-Correctness-Sprint-Plan.md)

---

## Discovered perspectives

- **A tolerance in a parity comparison is not leniency, it is blindness.** The
  GOLD comparisons carried a ±1 allowance. Removing it («#75») immediately exposed
  a real compiler defect — compile-time `QLOG`/`QEXP` folded through floating
  point — and a 1M-input differential then measured **90,506 QLOG and 256,548
  QEXP disagreements** against the ported integer CORDIC. The tolerance had been
  hiding wrong constants in shipped binaries, not absorbing noise.
- **The `.map` defect class was never a map bug.** It was three disagreeing
  sources of layout truth (`recordedInstances`, distiller records, source-side
  bookkeeping). One model derived from the finished image dissolved the whole
  class, including the two defects P2KB had been told to warn users about.
- **A suite that enumerates fixtures by globbing shrinks silently on a clean
  clone.** CI was verifying 890 tests where a local run verified 1000 — for an
  unknown length of time, with nothing reporting it. We found out only because a
  release workflow crashed on a gitignored corpus. An absent fixture produces no
  failing test; it produces *no test*.
- **A sprint can break its own work through an unrelated task.** «#76» made
  unknown CLI options fatal; `scripts/p2kb-dedup-verify` had always passed a
  nonexistent `-b`. Harmless for months, fatal the moment the hardening landed —
  and undetected because no gate runs that script. This closeout's audit is what
  caught it («#84»).
- **An unversioned input can break a release with zero repository changes.** The
  v1.55.8 release failed for a day and a half: at the failing commit,
  `release.yml` differed from the last publishing release by a seven-line
  *comment*. The cause was Apple returning `HTTP 401` to `notarytool` after new
  Developer Program agreements. Stephen's observation — two runs, same runner
  image, one pass and one failure — is what falsified the theory I was pursuing.

## Process insights

- **The closeout audit paid for itself in one finding.** «#84» was a live defect
  in a script the sprint had just updated, missed by every gate the sprint ran.
  Auditing the plan against *current code* rather than against commits is what
  surfaced it.
- **Dispatching the §2 audit to three surveys worked, and the "a returned report
  is a claim" rule proved literally true.** Two of three came back with rows
  marked AMBIGUOUS that the agent had not read far enough to settle; sending one
  back closed five rows with citations. Accepting the first report would have
  put five unverified verdicts into a certification document.
- **The task card lost to momentum: read once across four task starts.** Not a
  tasks problem — a trigger problem. The card exists for the moment work begins,
  and that moment passed three times without it.
- **I theorized three times before asking for the one datum that mattered.** On
  the release failure I proposed action-version bumps, then a runner pin, then a
  toolchain probe — all sound, none aimed, because I had no error text. The 401
  arrived last and explained everything in one line.
- **`simplify`'s single-pass variant was the right call and central already says
  so.** A twelve-line comment-and-guard diff does not warrant four review agents;
  `task-handoff` §2 sanctions the documented single-pass under
  `arbiter-serial`. Good example of the skill set already having absorbed a lesson
  this project raised.

## Quality and efficiency observations

- **The feared ceiling was not there.** Memory warned that background full-suite
  runs get killed, so the exit baseline was planned as foreground chunks; the
  whole gated suite then ran in **9m48s** in one foreground pass. Chunk A alone
  finished in 19s. The constraint was narrower than the note implied.
- **The plan audit was the fastest part of closeout** — three parallel surveys,
  ~2 minutes of wall clock for eleven sections with file:line evidence.
- **Estimate-versus-actual behaved as it always does here** (~10–12×,
  doctrine-overlay §6, observational only). «#80» 45m→10m tracked; «#84» 30m→~15m.
- **The release consumed roughly half the session for zero repository defects.**
  Every minute of it was external: an artifact-service reset, a Node-runtime
  deprecation notice, and an Apple account state change.

## Downstream impact

**Enabled**

- The `.map` can be used as teaching material again: every instance's VAR base,
  every array element, and per-variant symbols are derived from the image.
- The P2KB `map_caveat` retraction is measurable and re-measured (15/15) — it now
  waits only on Stephen applying it.
- The gated suite is **2.3× wider** than at sprint entry (47 suites / 1011 tests
  vs 26 / 432) and now includes the resolver test and the FULL/SHORT roots, so the
  class «#74» was hiding in cannot hide there again.
- `localOnlyFixtures.test.ts` makes the clean-clone/local divergence a failing
  test instead of an invisible property.

**Destabilized**

- The `.map` format is a **breaking change**. Anything parsing it — P2KB text,
  community tooling, a user's script — is broken until updated. The CHANGELOG
  leads with it, which is the mitigation, not a fix.

**Made cheaper — the read that expires with this session**

- **Punch §19 (coverage gate unmeetable)** — the sprint added
  `scripts/generate-coverage-report.js` plus `npm run coverage-report` /
  `coverage-report-check`. Re-baselining the table, which was a manual exercise,
  is now one command. §19 has been open since 2026-09-13 waiting on a decision
  that a current measurement would inform.
- **Punch §5d (manifest sidecar, re-scoped)** — its open edge was that `.dep`
  declares source inputs but not the entry's own sidecar set. Cache format 10 now
  reads and replays the `.sym` sidecar on every hit, so the sidecar set is
  enumerated in code rather than implicit. The remaining work is smaller than the
  item's text describes.
- **Punch §6.2 (EXCEPT-tests errout format)** — with GOLD comparisons now exact
  everywhere, the errout-format question is decidable by measurement instead of
  by argument about what the tolerance was absorbing.

## Methodology lessons

Candidates for Stephen's decision; none acted on centrally by this document.
This project is a **promotion source**, so buffer entries are kept through
adopt → certify → promote.

**New this sprint**

1. **A gate that can silently shrink is not a gate.** A suite enumerating fixtures
   by globbing must assert what it did *not* find, or report the absence by name.
   Target: central `baseline-health` (a green run whose scope changed is not the
   same green). Generality: high — any repo with file-based fixtures and a
   gitignored or optional corpus. **Adopted locally** as
   `src/tests/CLEANUP-tests/localOnlyFixtures.test.ts` + the named-skip pattern in
   `mapOracleGold.test.ts`; `certified: 2026-09-19` — it fired on a planted
   fixture during «#81» and would have prevented the release failure outright.
2. **Every script a sprint touches gets run once before the sprint closes.**
   «#84» existed because `p2kb-verify` is reachable from no gate and was updated
   without being executed. Target: central `sprint-closeout` §2 (audit what the
   sprint *touched*, not only what it *asserted*). Generality: high.
   `certified: 2026-09-19` — the closeout audit caught exactly this, once.
3. **For an outward failure, the failing step's text is the first datum.** Do not
   propose a fix for a CI/release/signing failure before reading the error; three
   sound-but-unaimed changes preceded the one line that explained everything.
   This is **judgement, not procedure** → route to
   `skills-docs/WORKING-DOCTRINE.md`, not to a skill (SKILLS-AUTHORING Test 5).
4. **The task card's read-trigger belongs in structure, not prose.** Read once
   across four starts. Authoring rule 7's tier ladder says a rule flagged and
   still broken moves up a tier: the card is currently prose the agent is asked to
   remember to read.

**Existing buffer entries, triaged**

- **Seven** entries marked **ABSORBED** at v10/v12/v13 were checked against
  central this session and deleted from the buffer, per the promotion-source
  lifecycle (an entry auto-Addresses once central carries the change).
  Spot-verified in central: `WORKING-DOCTRINE.md` D2; `task-handoff` §2 fan-out
  proportionality (lines 124-136); `task-execution` §1 step 2; `plan-to-tasks`
  §2 "Keep today's behavior"; `AGENT-PROFILES.md` profile/MCP line;
  `SKILLS-AUTHORING.md` falsification bar. The seventh (the `{{DISPATCH_MODEL}}`
  entry) was accepted on its own ABSORBED note plus the v10 row in
  `SKILLS-VERSION.md`, not on a direct grep.
- **One deletion was made wrongly and undone.** A first pass split the buffer on
  date-led bullets only, which glued an undated entry onto its predecessor and
  dropped a still-open entry (the plan-time advisory check) with it. Caught by
  reading what was dropped, restored from this session's own snapshot of the
  file, and redone splitting on every top-level bullet. Worth recording: a
  memory file has no version control, so "verify what you deleted" is not
  optional there.
- The remaining entries keep their status; none reached a third deferral.

## Punch-list triage

- **Added by this sprint's closeout: 0.** Nothing was carried over; the two items
  that audited short were fixed before closing.
- **Archived at closeout: 7** (§6.4, §14 with 14a/14b, §16, §20, §21, §22, §23) →
  `2026-09-19-Punch-List-Archive.md`.
- **Still open: 5** — §4 (dead flash/RAM download code), §5 (object-cache
  hardening, deferred by trigger), §6.2 (EXCEPT errout format), §10 (language-spec
  extraction pipeline — measured, awaiting Stephen's repair-vs-retire call), §19
  (coverage gate).
- **Oldest dated item: §6, 2026-05-11** — four months. Its only surviving
  subsection is 6.2, and the sprint just made that one measurable (above). §4
  carries no date at all, which is itself a small finding: an undated item cannot
  be aged.
- **Is the list still an active register?** Yes, but two items are drifting for
  different reasons: §10 and §19 are both **waiting on a decision, not on work**,
  and each has now survived multiple sprints in that state. That is a planning
  finding — a decision item on a work register never wins a scope call — and both
  are surfaced in the closeout's open questions rather than left to age.

## Verdict

**Worth acting on.** Four methodology candidates, two of them already certified
by firing on real catches this sprint, plus a doctrine-level lesson about
diagnosing outward failures. The execution itself was clean — every plan
commitment shipped — but the sprint's most valuable output may be the two
instruments it built by accident: exact GOLD comparisons, and a test that refuses
to let the gate shrink in silence.
