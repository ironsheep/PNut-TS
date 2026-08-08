# Shipped Documentation Voicing

How the documents that ship **inside the release package** are written:

`README.md` · `CHANGELOG.md` · `CommandLine.md` · `Preprocessor.md` ·
`AUTHORS` · `LICENSE` · `copyright`

**Read [`README.md`](README.md) first** — it carries the audience, the
evidence-grounding rule, the no-internals/no-churning-values rule, and the voice.
This document adds only what is specific to a document that leaves the repo.

`CHANGELOG.md` is governed by [`CHANGELOG-Voicing.md`](CHANGELOG-Voicing.md)
instead; it is the one shipped document with its own shape.

---

## What makes these different

Every other document in this project is read by someone who has the repo. These
are read by someone who has **a folder with a binary in it** — unzipped from a
release, possibly offline, possibly in a plain-text viewer with no markdown
rendering, and quite possibly months after download.

Three consequences follow, and they are the whole of this guide.

## 1. Self-contained — no link may point into the repo

A relative link works when you preview the file in the repo and breaks in the
package. This is not hypothetical: **all three of these documents currently link
`./DOCs/images/patreon.png`, and the release workflow ships no `DOCs/`
directory at all.** `README.md` also links `BUILD-RUN.md`, `Coverage.md` and
`Goals.md`, none of which ship.

The rules:

- **Link only to files that ship beside the document.** `LICENSE`, `copyright`,
  `CHANGELOG.md`, `CommandLine.md`, `Preprocessor.md` and `README.md` may
  reference each other freely — they are in the same folder.
- **Everything else gets an absolute `https://` URL** to the GitHub repo. A
  developer-only document (`BUILD-RUN.md`, `Testing.md`, `Coverage.md`,
  `Goals.md`, anything under `DOCs/`) is linked by URL or not at all.
- **Images must be absolute URLs.** A packaged document has no asset directory.

Before release, every relative link in these files must resolve to a file in the
shipped set. `npm run docs-check` does not verify links — check them by eye when
you touch one.

## 2. Version-locked to the binary beside it

The reader is holding one specific build. A document describing a different one
is worse than no document, because they have no way to tell.

- **Any sample output — help text, transcripts, error messages — must come from
  the shipping build.** Regenerate it; do not hand-edit the version string.
  Paste real output.
- **Do not write "currently", "recently", "will soon".** The reader's *now* is
  not yours. Say what this version does.
- **Do not describe unreleased behavior.** If it is not in the binary in that
  folder, it does not belong in the documents beside it.

When a release changes a documented surface, these files are updated **in that
release**, not the next one. They are `class: shipped` in
`DOCs/doc-coverage.json`, which means `docs-check` blocks the release while any
of them is stale — the only class with no budget and no drawdown rate.

## 3. Written for someone with a problem, not someone browsing

Package documentation is opened when something is not working. That shapes the
content:

- **Lead with the working case**, then the variations, then the failure modes.
- **Quote diagnostics exactly.** A user searching their build log for
  `Expected #ENDIF` should find it here verbatim. This is the single highest-value
  thing these documents contain.
- **When behavior changed, say which version changed it** — "as of v1.55.2" — so
  a reader on an older build knows why their experience differs.
- **State what is an error and what merely warns.** A reader needs to know
  whether their build stopped or continued.
- **Where we diverge from PNut, say so and name the portable form.** Many
  readers move source between the two compilers; that is often why they opened
  the file.

## Checklist

- [ ] Every relative link resolves to a file in the shipped set; everything else
      is an absolute URL
- [ ] No image references a path that is not shipped
- [ ] Sample output regenerated from this release's binary
- [ ] Diagnostic strings quoted exactly as the compiler emits them
- [ ] Behavior changes attributed to the version that introduced them
- [ ] Errors distinguished from warnings
- [ ] PNut divergences named, with the portable form stated
- [ ] No "currently" / "soon" / unreleased behavior
- [ ] `verified` updated in `DOCs/doc-coverage.json` to this release
