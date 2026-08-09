# Preprocessor Symbol Correctness Sprint — Retrospective

**Sprint:** Preproc-Symbols · **Build:** 1.55.3 (tag `v1.55.3`) · **Closed:** 2026-08-09
**Closeout:** [`2026-08-09-Preproc-Symbols-CLOSEOUT.md`](2026-08-09-Preproc-Symbols-CLOSEOUT.md)

Closeout covers *what shipped*; this covers *what was learned*.

## Discovered perspectives

- **Documentation claims about *unchanged* surface can be wrong too.** The
  plan's doc-impact gate excluded `CommandLine.md` because "-U semantics are
  untouched" — true, but the doc's *description* of those untouched semantics
  had been false all along (`-U` never undefined `-D` symbols; it only gates
  `#pragma exportdef`). Reproduction during §6, not the gate, caught it.
- **A documented feature can have never worked.** `#pragma exportdef`'s
  flagship MEMDRIVER example never compiled — the pragma exports presence,
  not value. Nobody had run the example since it was imported from FlexSpin's
  semantics. Reproduce-the-example is the only test that catches this class.
- **The two-phase assess-then-act shape (§8) earned its keep.** Phase A found
  the extraction pipeline broken in place (imports never valid from the
  committed location; the real generator undocumented) — Phase-B regeneration
  work done on plan-time assumptions would have been wasted or wrong.
- **Version-bearing GOLDs are a trap.** A fixture asserting `__VERSION__`'s
  substituted value would fail at every version bump; the presence-only
  fixture pattern (`ppokVersionSym`) is the durable form.
- **`CON V = __VERSION__` can never compile** — a bare dotted triple is not a
  Spin2 expression. The plan's verify bullet assumed it could; the mechanism
  (blunt text substitution, no `#if` evaluation) makes string contexts and
  `#ifdef` the entire usable surface. Plan-time verify bullets for
  substitution features should be checked against what the substituted text
  is legal *as*.

## Process insights

- **Whole-document verification keeps paying.** The stamp rule ("partial
  update ≠ verified") forced full reads that found four *more* defects in the
  usage guide beyond the planned updates — a release-build pattern relying on
  the nonexistent `-U` behavior, two anti-pattern "correct forms" that warn
  on every build since v1.55.2, and a phantom `-E` flag. Same mechanism that
  caught the original `__PNUTTS__` error.
- **Head-to-tail execution under the contract worked: zero unplanned stops.**
  The one plan-time unknown (§8) had its uncertainty designed in, so the
  broken-pipeline outcome was motion, not a stop.
- **The per-task 4-agent simplify pass is heavyweight for micro-diffs.** It
  found real improvements every time it fired (shadowed variable names,
  comment dedup, a missed hoist), but four agents reviewing a 4-line diff is
  disproportionate; see methodology candidate (c).
- **The flaky-test signal only emerged from run count.** `isp_dummy_flash`'s
  empty-`.flash` race (2 of 6 full runs) was invisible to any single gate;
  per-task full-suite runs are what surfaced the pattern (punch item 12).

## Quality and efficiency observations

- Estimates again ran far above agent wall-clock (plan ~11.5h across 11
  tasks; actual session wall-clock across all tasks roughly a third of that,
  dominated by full-suite runs, not edits) — consistent with the
  units-mismatch reading already in the buffer (third sighting, ratio
  smaller here because suite runs are irreducible clock).
- The costliest single activity was repeated full-suite verification (7 runs
  ≈ 2 min each) — justified, since one run caught the §1-era flake and the
  runs are what certified the exit baseline.

## Downstream impact

- **Enables:** preprocessor symbol semantics are now trustworthy *and*
  truthfully documented; the P2KB update request is current through v1.55.3;
  the shipped doc set is complete (copyright included) for the first time.
- **Opens:** punch 10 (extraction-tree repair is a scoped sprint candidate);
  punch 11 (exportdef value export would be another behavior change if
  taken); the two §2/§3 behavior breaks may generate community reports
  during external testing — the changelog's ⚠️ section is the first
  responder.

## Methodology lessons (candidates — Stephen confirms)

New entries added to the buffer this retrospective:

- **(a) Doc-gate exclusions must verify the doc's claim, not just the
  scope.** An "Excluded — surface untouched" disposition silently asserts
  the doc's existing text is *true*; CommandLine.md proved that assertion
  can be false. Proposed rule: an exclusion requires either (i) the matched
  text reproduced true, or (ii) an explicit "not verified, out of scope"
  marker so the next sprint's gate sees it. Target: `sprint-plan` overlay
  (doc-impact gate). Status: open, adoption proposed.
- **(b) Simplify-pass proportionality.** `task-handoff` §2 invokes the
  4-agent `simplify` fan-out at every task boundary regardless of diff
  size. Proposed: a size-scaled form (single combined reviewer under ~50
  changed lines). Target: central `task-handoff`/`simplify`. Status: open,
  first sighting.

Existing entries — certification evidence and second sightings recorded in
the buffer; verdicts proposed in the hand-back table (promotion-source
lifecycle: nothing deleted without Stephen).

- **Doc search-and-disposition gate (PROMOTE, awaiting owner-judgment):**
  fresh certification — the gate's aged-document sweep selected the two
  docs (§7/§8) that turned out to carry the sprint's largest drift, and its
  plan-time inclusion of `Preprocessor.md` is what routed the reproduction
  work that found the `-U`/exportdef defects.
- **External-audit triage (was: open, first sighting):** this sprint
  *executed* the proposed three-disposition triage as plan §10's structure
  (fix 4 / document 2 as parity / defer 5 into the owning assessment) and
  it worked exactly as sketched — including the cluster-as-diagnosis read
  (5 findings dating the extraction tree). Second data point; adoption into
  the `sprint-plan` overlay proposed.
- **Planning→execution boundary handoff (deferred, second sighting):** this
  sprint *crossed* that boundary (plan/tasks in one session, execution
  resumed post-`/clear`) and the resume-key-only variant proved sufficient
  in practice — supporting evidence for the proposed `task-handoff` §0
  branch shape, still unadopted.
- **Estimate units (deferred):** third sighting; still needs Stephen's
  statement of intent before anything changes.
