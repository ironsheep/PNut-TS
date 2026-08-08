# CHANGELOG Voicing

How entries in `CHANGELOG.md` are written.

**Read [`README.md`](README.md) first** — it carries the audience, the
evidence-grounding rule, the no-internals/no-churning-values rule, and the voice.
This document adds only what is specific to the changelog.

This guide is also a deliberate **project-specific override** of the central
`build-wrapup` skill's §3 rules. Those rules assume a product whose internals the
audience never touches; PNut-TS is a compiler, and its "internals" — diagnostic
strings, directives, CLI flags — are exactly what its users type and search for.
Where this guide and `build-wrapup` §3 disagree, this guide wins for
`CHANGELOG.md`.

## Why the voicing matters more here than in most projects

**The changelog entry *is* the release notes.** On a `v*` tag push,
`.github/workflows/release.yml` extracts the `## [VERSION]` section verbatim and
publishes it as the GitHub release body, and copies the whole `CHANGELOG.md` into
every platform package. Nobody edits it in between. What is written here is what
the community reads.

So this document is not a style preference. It is the last editorial pass before
publication.

## The one test

The audience is the project-wide one (shared core). What the changelog adds is a
sharper filter for deciding how much detail an entry carries — it is the one
document written under time pressure, at the end of a sprint, when the temptation
to paste in the engineering record is strongest.

> **Detail earns its place if a reader can act on it or search for it. Detail
> that only demonstrates we did the work does not.**

Applied consistently, this resolves nearly every judgment call:

| Detail | Verdict | Why |
|---|---|---|
| Exact diagnostic text (`Expected #ENDIF`) | **Keep** | They will paste it into a search box |
| CLI flags, file extensions (`-I`, `--cache-dir`, `.lst`) | **Keep** | Their command lines and build scripts |
| Directives and language surface (`#pragma exportdef`, `{Spin2_v55}`) | **Keep** | What they type |
| The old wrong behavior, when it failed *silently* | **Keep** | Explains a mystery they may have already lived through |
| What to do about it (`--cache-clear` once, remove a workaround) | **Keep** | Directly actionable |
| TypeScript identifiers, class and method names | **Cut** | Unsearchable and unactionable for them |
| Internal data-structure shapes, field names, sidecar layouts | **Cut** | Not their surface |
| Test counts, suite names, fixture paths, coverage numbers | **Cut** | Proves we worked; changes nothing for them |
| Sprint bookkeeping, deferred internal punch lists | **Cut** | Belongs in the sprint record |

On the last two: **our confidence is expressed by shipping, not by reciting test
counts.** The single exception is honesty about what is *not* verified — that is
actionable, and it stays (see "Be honest" below).

## Structure of an entry

```
## [VERSION] YYYY-MM-DD

<lede — one or two sentences>

### ⚠️ Behavior change — <what breaks>      (only when something breaks)

<what changes, then why it is not as bad as it sounds — or is>

### Added / Fixed / Changed / Performance    (Keep a Changelog sections)

- **Bold claim in a sentence.** Supporting detail.
```

### The lede

Every release carrying more than a single fix opens with one or two sentences in
plain prose, before any section heading. It answers "why would I upgrade?" or
"what broke?"

The lede is the single most-read sentence of the release — write it last, once
you know what the release turned out to be about.

A release with exactly one fix may skip it and let the bullet stand alone; the
release workflow falls back to that bullet. Anything larger needs a lede, or the
headline becomes whichever item happens to sort first.

> **How it is used:** `.github/workflows/release.yml` publishes the lede as the
> release headline (`**This release:** …`), joining its wrapped lines back into
> one sentence. If there is no lede it falls back to the first bullet, with the
> bold lead-in flattened. Neither path truncates. Read your lede once as a
> standalone sentence with nothing around it — that is how it will appear.

### Section headings

Use the Keep a Changelog set — `Added`, `Fixed`, `Changed`, `Performance`,
`Known issues`. Do not invent headings for internal purposes. In particular there
is **no `Testing` section, and no `Verified` section.**

A `⚠️ Behavior change` / `⚠️ Breaking` section is the one sanctioned addition,
and it goes above everything else.

## Writing a bullet

**Lead with the effect, in bold, as a complete sentence.** Not a label.

- Good: `**`#include` argument errors were replaced by a vaguer message.**`
- Weak: `**BUGFIX**: #include error message`

Then one or two sentences of supporting detail: what the user saw before, and
what they see now. Stop there.

**Say what they experienced, not what we changed.** "A failed build left the
previous run's binary in place with its old timestamp" is the bug. "The cleanup
path ran after the listing filename was assigned" is not — that is a commit
message.

**One sentence of *why* is earned when the old behavior failed silently.** A
wrong answer that looked like a right answer deserves an explanation; a loud
crash usually does not.

**Be honest.** If something is fixed but unverified on real hardware, say so. If
an earlier release claimed a fix that did not land, say that too — see the
v1.54.7 note about v1.54.5 and v1.54.6. Users who upgraded twice chasing one bug
are owed the explanation, and it costs us nothing but candor.

## Length

There is no line budget, but there is a shape: **most bullets are two to four
lines.** A bullet running past six lines is usually carrying rationale that
belongs in the commit message.

For scale, a typical release lands around 20–50 lines. A language-version release
or one with a behavior break earns more. If an entry is approaching 100 lines,
something in it is being written for us rather than for them.

The detailed engineering record already exists — in the commit messages and the
sprint plan. The changelog does not duplicate it.

## Special cases

**Bug arcs across several releases.** When a defect takes multiple attempts, each
release keeps its own honest entry — history is not rewritten. Give the final one
a lede that says plainly it is the real fix, and tell the reader what to do
(`--cache-clear` once). Do not bury the fact that the earlier attempts missed.

**Bytecode and opcode values.** Shared core rule 3 applies — `bc_*` names yes,
numeric values never. In a changelog the temptation is specific: an
optimization-heavy release wants to show its work by listing the encodings that
moved. Describe the effect instead — "one byte smaller for step values in
`[2, 33]`" is what the reader can verify, and it stays true across revisions.

**Contributor credit stays.** `_(Thank you @wummi for reporting this!)_` and
linked issue numbers are part of the voice of a community project. Keep them,
keep the GitHub issue links, and name the requester on user-requested features.

**PNut parity notes stay.** Where we match PNut's wording, say so — including
where we reproduce its misspellings deliberately. Where we knowingly diverge, say
that too, and point at the guide that explains it. Parity is why many of our
users are here.

## Checklist before tagging

- [ ] Lede present, and it reads well as a standalone headline
- [ ] No test counts, suite names, or fixture paths
- [ ] No TypeScript identifiers or internal structure names
- [ ] Every diagnostic string quoted exactly as the compiler emits it
- [ ] No numeric bytecode/LUT values
- [ ] Breaking or behavior-changing items are called out above the fold
- [ ] Anything unverified is labeled as such
- [ ] Contributor thanks and issue links carried over
- [ ] Read it once as a user who just had a build break — does it tell them what
      to do?
