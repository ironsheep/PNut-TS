# CLI-Robustness Sprint — Retrospective

**Sprint:** CLI-Robustness · **Build:** 1.55.2 (tag `v1.55.2`) · **Date:** 2026-08-08
**Closeout:** [`2026-08-08-CLI-Robustness-CLOSEOUT.md`](2026-08-08-CLI-Robustness-CLOSEOUT.md)
**Plan:** [`CLI-Robustness-Sprint-Plan.md`](CLI-Robustness-Sprint-Plan.md)

All 12 sections shipped clean. The learning is concentrated **not** in the
planned work — which executed almost exactly as designed — but in what the sprint
*discovered about the project's own infrastructure* on the way past it.

---

## Discovered perspectives

- **The changelog entry *is* the release notes.** `release.yml` extracts the
  `## [VERSION]` section verbatim into the published GitHub release body and
  copies the whole file into every package. Nobody edits it in between. The
  changelog had been drifting toward a second engineering record for ~5 releases
  on the assumption that a human would translate it later.
- **The release headline had been broken the entire time.** The summary line
  `grep -m1 '^- '` returns one *physical* line, so any wrapped first bullet
  published a fragment ending mid-sentence — and the bold-strip expected a
  `**Bold**: ` form the entries stopped using around 1.54.7.
- **Two packaging paths shipped different files.** The tag-push workflow shipped
  3 documents; the local macOS path shipped 7. What a user received depended on
  which build they downloaded — and the `./DOCs/images/patreon.png` link in all
  three shipped docs was broken in every tag-push package, because the workflow
  ships no `DOCs/` at all.
- **The failure mode for stale docs is *recall*, not negligence.** The plan named
  a preprocessor document, it was written, closeout verified it — and
  `Preprocessor.md`, the one in the release package, stayed four releases stale.
  Every layer did its job. Nobody searched.
- **`VOICING-STANDARDS.md` had zero inbound references its entire life** — no
  guide, script, index or skill cited it. That likely explains why the usage
  guides drifted from it.
- **`usage-guides/` and `usage-guides-new/` share zero filenames.** "new" is a
  second *topic batch*, not a successor tree — so nothing in it supersedes the
  shipped `Preprocessor.md`, which had to be updated in its own right.
- **`npm audit` said 3 vulnerabilities; `npm audit --omit=dev` said 0.** All were
  devDependencies. The scary number on the default-branch badge had no runtime
  meaning.
- **`Preprocessor.md` already documented case-insensitive symbols correctly** —
  independently corroborating the P2KB correction from our own shipped doc.

## Process insights

**Worked:**

- **Per-section commits carrying full rationale + verification lists.** Closeout
  verification was cheap because each commit already argued its own case; the
  audit only had to confirm the code matched.
- **Building the gate, then immediately running it on ourselves.** `docs-check`
  caught the two documents created *in the same session*, then caught the sprint
  plan being archived one turn after being written. A gate that fires on its
  author's own work in its first hour is a gate that will fire later.
- **Verifying claims against the binary rather than against the changelog.**
  Every diagnostic string documented in `Preprocessor.md` was reproduced by
  running the compiler. This is what made the P2KB request defensible.

**Got in the way:**

- **The general agent default "if on the default branch, branch first"** produced
  `sprint/cli-robustness` in a single-engineer repo. Nothing in the project said
  otherwise, so the default won. Now overridden in `CLAUDE.md`.
- **`sprint-plan`'s documentation clause is slot-driven** — `SPEC_DOC`,
  `HELP_VOICING_GUIDE`, `MANUAL_VOICING_GUIDE`, `STYLE_GUIDE_DOC`. This project
  leaves three unset, so three of five sub-clauses silently no-op. The clause
  appeared to be doing work it was not doing.
- **`RELEASE-PROCESS.md` had six pieces of drift** (manual release step that is
  automatic, version in 1 place vs 3, a TODO for a script that exists, a doc
  declared absent that exists, a release table 14 versions behind). A checklist
  nobody diffs against reality decays into ritual.

## Quality and efficiency observations

- **Estimates vs actuals diverged ~10× again** — ~16h planned, ~100m of recorded
  `todo-mcp` wall-clock across 13 tasks. Second consecutive sighting of the same
  ratio, which strengthens the units-mismatch reading (human-hours vs agent
  wall-clock) over an estimation-accuracy reading.
- **Six unanticipated defects surfaced during execution**, all fixed in-sprint and
  none in the plan: `getPragmaSymbolValue()` requiring >2 tokens, bare `#define`
  vs `#define ` diverging, the `#undef`-not-found path not commenting its line
  out, `writeObjectFile()` taking the listing name, `compareExceptionFiles()`
  normalizing paths only on `:error:` lines, and the EXCEPT runner's *second*
  stderr-capture block missing the §11 filter.
- **§1 alone turned a passing fixture red.** `condNestCodeCmdLn.spin2` contains the
  dead-branch `#error` that §2 exists to fix, so making diagnostics visible before
  adding the branch guard breaks it. §1+§2 were one atomic green-unit and the plan
  never said so.
- **The scope extension cost more than the sprint's largest planned section** —
  four documents plus a voicing guide, none of it in the plan, all of it real work
  the release genuinely needed.

## Downstream impact

**Enables:**

- `npm run docs-check` gives every future sprint a doc-currency backstop and makes
  the 38-document staleness backlog *visible and rate-limited* rather than
  invisible.
- `DOCs/voicing/` gives the next document — including the still-unwritten guides —
  a standard to inherit instead of a fresh argument.
- The repaired release plumbing means the next tag publishes a correct headline
  and a complete document set.
- The EXCEPT-runner artifact-absence assertion and the CLEANUP suite give §8's
  behavior permanent regression cover.

**Destabilizes / leaves behind:**

- **A behavior break ships at patch level.** Sources with malformed directives
  that built before will now fail. Accepted deliberately; the changelog leads with
  it.
- **38 governed documents are now known-stale.** The debt existed before; it is
  now measured, which means it is now *owed*.
- **`copyright` is excluded from the release package** pending an attribution
  decision — the shipped text and the repo text disagree and the repo's is wrong.
- **An unexplained transient test failure** stands at 2 isolated failures against
  8+ clean full runs.

## Methodology lessons

Six candidates in `feedback_skill_evolution_candidates.md`; triage and verdicts in
§5 below. The dominant theme:

> **Gates that ask you to *recall* fail; gates that make you *run something*
> hold.** The documentation gate, the dependency gate, and the baseline check all
> converge on the same shape — a command with output, not a checkbox ticked from
> memory.

Second theme, narrower but sharper:

> **A slot-driven clause silently no-ops on any project that leaves the slots
> unset.** That is not a preference gap, it is a structural one, and it argues for
> promotion ahead of the usual two-project convergence bar.

---

## Candidate triage (`PROMOTION_SOURCE: yes` — promotion-source verdicts)

| # | Candidate | Target | Verdict |
|---|---|---|---|
| 1 | Reproduce the reporter's actual scenario before shipping a fix | `defect-fixing` | **Adopted**, `certified: PENDING` — no defect work this sprint to certify against |
| 2 | Plans that make a tolerated input a hard failure need a compatibility-impact step | `sprint-plan` | **Adopted this retrospective** — written into the overlay; certification evidence from this sprint noted |
| 3 | No procedure covers save/clear at the planning→execution boundary | `task-handoff` | **Deferred** — real, unaddressed, no overlay written |
| 4 | Ordering validated for dependencies but not for "does A alone break what B repairs?" | `plan-to-tasks` | **Adopted this retrospective** — written into a new overlay; certified by §1/§2 |
| 5 | Estimates vs actuals differ ~10×; units never stated | `sprint-plan` / `plan-to-tasks` | **Deferred** — second sighting recorded; needs Stephen's intent on what an estimate denotes |
| 6 | Search-and-disposition doc gate; default to inclusion | `sprint-plan` | **Promote** — adopted *and* certified (caught `Preprocessor.md`, then caught the plan archive within one turn); slot-independent, repairs a central no-op |

**No entries closed-no-change.** Nothing was deleted.

### Recommendation on #6

It meets adopted + certified. Convergence (a second project wanting it) does not
exist yet, so promotion requires Stephen's **owner-judgment override**
(`SKILLS-AUTHORING.md` Test 3). The argument for exercising it: the rule needs
**no slots at all**, and it repairs the doc clause precisely on the projects where
that clause currently does nothing. Waiting for a second project means every
project keeps the no-op in the meantime.

### Gap found in the skill set itself

`sprint-retrospective` §5 states that certification vocabulary and cert-marker
names "live in the project's `sprint-retrospective` overlay." **This project has
no such overlay**, so the promotion-source lifecycle ran here without a defined
evidence vocabulary. Worth writing before the next retrospective, or the
`certified:` notes will drift in format.
