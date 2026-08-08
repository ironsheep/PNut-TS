# Usage Guide Voicing

How the usage guides under `DOCs/internals/usage-guides*/` are written.

**Read [`README.md`](README.md) first** — it carries the audience, the
evidence-grounding rule, the no-internals/no-churning-values rule, and the voice.
This document adds only what is specific to a usage guide. Keep both open while
writing.

---

## What a usage guide is for

A reader arrives at a usage guide because they want to *use* a feature and the
language spec did not tell them enough. The guide's job is to get them to working
code, then to explain enough that they do not come back with the same question in
a different shape.

## Where to find your evidence

Beyond the general rule in the shared core, the usual sources for these guides
are `src/classes/spinResolver.ts`, `src/utils/`, `src/classes/parseUtils.ts`,
`src/classes/types.ts`, and the fixtures under `TEST/`. A behavior with a test
fixture is the strongest evidence available — cite it.

Where the compiler emits a diagnostic for a misuse, run it and quote the actual
text. A guide that paraphrases an error message is a guide the reader cannot
search from their build log.

## Structure

Each guide follows the same seven sections, in order:

1. **Overview** — what this feature does, when to use it
2. **Basic Usage** — the simplest working example
3. **Syntax / Forms** — every variation, with an example each
4. **Patterns** — common idioms and good practice
5. **Anti-patterns** — what not to do, and why it fails
6. **Summary Table** — quick reference for return visitors
7. **Related Documentation** — links to neighboring guides

Consistency across guides matters more than the ideal structure for any one of
them. A reader who learns the shape once should find it everywhere.

## Pedagogy

- **Concrete before abstract.** Show a working example first, then explain the
  principle behind it.
- **Progressive complexity.** Simple case → variations → advanced usage → edge
  cases.
- **Meaningful examples.** Solve real problems — blink an LED, read a sensor —
  not `foo`/`bar` abstractions.
- **Complete examples.** No `...` and no fragments. Code should compile, or be
  clearly marked as a snippet.
- **Show the error paths.** What happens when it fails? Readers learn more from
  the failure than from the success.
- **Anticipate confusion.** Address common misconceptions explicitly, and
  contrast concepts that are easily mistaken for one another.
- **Explain why.** Understanding is what prevents the *next* error.

## Anti-patterns are required

Every guide includes an anti-patterns section. Show the wrong form, show the
right form, and explain why the wrong one fails — not merely that it does.

Verify that the "correct" form actually is. An anti-pattern whose recommended
fix produces a warning is worse than no anti-pattern at all, because the reader
trusts it. (This is not hypothetical: P2KB's preprocessor entry recommends a
defensive `#UNDEF` that warns under PNut-TS v1.55.2 — see
`DOCs/internals/Preprocessor-P2KB-Update-Request.md`.)

## Checklist before finishing

- [ ] Every claim grounded in compiler source, a test fixture, or observed output
- [ ] Diagnostic text quoted exactly as the compiler emits it
- [ ] Examples complete, realistic, and compilable
- [ ] Anti-patterns included, with the *why*, and the correct form verified
- [ ] Progressive complexity — simple through edge cases
- [ ] Summary table present
- [ ] Related-documentation links present and correct
- [ ] No compiler internals, no numeric bytecode values (shared core, rule 3)
