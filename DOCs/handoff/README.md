# Handoff

Work packages this repo hands to an **external agent** that owns a corpus we do
not edit. One subfolder per receiving agent.

| Folder | Receiving agent | What it holds |
|---|---|---|
| `p2kb/` | the P2KB maintainer agent | amendments and gap reports for the P2 Knowledge Base |

⚠ **Two receiving agents, two different models. Do not apply this folder's
convention to the documentation agent.**

- **P2KB — a request lifecycle.** Each document asks for a change, gets applied
  once, and is then done. Pending / archive, described below.
- **The documentation agent — a current set, redelivered.** There is no pending
  queue and no archive. We keep the latest version of the documents it consumes
  in a standard place; when one or more are updated, we hand-deliver the updates
  and they **overwrite** the agent's previous copies. A document is never
  "applied" and never retires — it just has a latest version.

Its set is the `agent-consumer` head in `.claude/skill-conventions.md`, and it is
deliberately short: **the user guide, and the Theory-of-Operations documents.**
Both are held to cite-the-authority-or-omit, because an agent reading a hedged
claim does not carry the qualifier forward the way a person does.

> **Not yet built.** The mechanism is undecided on one point — whether the
> standard place holds *copies* of those documents or a manifest naming their
> canonical paths. Copies would duplicate content this repo already maintains,
> and one canonical copy with links is this project's stated rule for exactly
> that reason. Settle that before creating the folder.

## The convention (P2KB, and any other request-lifecycle handoff)

- **The folder itself is the handoff unit.** Hand over `p2kb/` and everything
  in it is outstanding. Nothing else has to be read first to know what is owed.
- **`<folder>/archive/` holds what has been confirmed applied, and is
  untracked** (`.gitignore`). Once an amendment is live in the external corpus,
  that corpus is the system of record and the repo stops carrying the request.
  The document stays on disk locally; it is not in a fresh clone.
- **Move only on confirmation, never on submission.** "Handed over" is not
  "applied". Verify against the live corpus — for P2KB, `p2kb_get` on the target
  entry — and record the date in the document's `Status:` header before moving.
- **Partly applied stays put.** A request whose content landed but whose
  acceptance criteria did not is still outstanding, and its `Status:` line says
  exactly what is left. Two of the archived Flash-Loader requests were in that
  state for months with nothing tracking it, which is what this folder is for.

## Standing rule

We draft; Stephen applies. Nothing here is edited into the external corpus by
this project — see `.claude/doctrine-overlay.md` §1.

## Currently outstanding

| Document | State |
|---|---|
| `p2kb/P2KB-abort-trap-amendment.md` | ready — hardware-confirmed 69/69, not applied |
| `p2kb/P2KB-map-caveat-retraction-1.55.4.md` | ready — current to 1.55.8, not applied |

⚠ The `map_caveat` retraction is the urgent one: verified live on 2026-09-17,
`p2kbSpin2ObjectImageDedup` still tells readers not to trust the `.map`
instance-name and source-name columns. That became wrong when 1.55.8 shipped.
