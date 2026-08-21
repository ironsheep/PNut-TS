# Documentation Voice — shared core

Read this before writing or revising any project document. It holds the rules
that apply to **everything we publish**. Each artifact then has its own short
guide for the rules specific to it.

| Guide | Governs |
|---|---|
| [`CHANGELOG-Voicing.md`](CHANGELOG-Voicing.md) | `CHANGELOG.md` — which is published verbatim as the release notes |
| [`Usage-Guide-Voicing.md`](Usage-Guide-Voicing.md) | the usage guides under `DOCs/internals/usage-guides*/` |
| [`Shipped-Docs-Voicing.md`](Shipped-Docs-Voicing.md) | the documents that ship inside the release package — `README.md`, `Preprocessor.md`, `CommandLine.md`, `AUTHORS`, `LICENSE`, `copyright` |

---

## Who we write for

**P2 developers using the compiler** — people writing `.spin2` and `.pasm2`,
building from the command line or from a script, comparing our behavior against
the original PNut.

They are technical and they read closely, because a compiler's exact words are
what they have to work with. They are **not** PNut-TS contributors: they have no
visibility into our source tree, our test suites, or our sprints.

Assume a competent reader. Do not explain basic programming; focus on
Spin2/PASM2 and on this compiler's actual behavior.

## The four rules

### 1. Grounded in evidence

Every claim traces to compiler source, a test, or observed compiler output. If
you cannot find the evidence, investigate — do not guess. No hand-waving, no
hallucination.

This is the load-bearing rule. Everything else is style; this one is why the
documents are worth reading at all.

### 2. The compiler's perspective, not the hoped-for one

Document how the compiler actually behaves, not how someone assumes or wishes it
behaved. Where our behavior diverges from the original PNut, say so and name
which compiler does what — a reader porting source between them needs both
sides, and the portable subset stated plainly.

### 3. No internals, and no values that churn

Do not expose compiler internals: TypeScript identifiers, class and method
names, internal data-structure shapes, test-suite names or counts.

Do not cite **numeric** bytecode, opcode, or LUT values. They re-sort between
revisions, so a number printed in a permanent document is wrong the moment the
next revision lands. Symbolic `bc_*` names are fine; describe effects rather
than encodings.

What *is* the user's surface, and belongs in the text freely: diagnostic strings
quoted exactly as the compiler emits them, CLI flags, file extensions, language
directives, and preprocessor directives.

### 4. Deeply trustworthy — including about what we don't know

Readers must be able to trust the content completely. Acknowledge uncertainty
rather than fake confidence. If something is unverified, say it is unverified
and say what would verify it. If an earlier document or release was wrong, say
so plainly and correct it rather than quietly rewriting history.

## Voice

Neutral technical voice. Not marketing ("powerful!", "blazing fast"), not casual
("kinda", "just do this"), not condescending.

Consistent terminology — the same term for the same concept across every
document. When the compiler has a name for something, use the compiler's name.

## Applying this

Each artifact guide states its own structure, length, and cadence. Where an
artifact guide is silent, this document governs. Where it deliberately differs,
it says so and gives the reason.

If a rule here needs an exception in more than one artifact, it belongs here in
amended form — not duplicated with variations in each guide.
