# PNut-TS Release Process

This document defines the release checklist and quality gates for PNut-TS releases.

---

## Pre-Release Checklist

Complete all items before packaging a release.

### 1. Build and Regression Tests

- [ ] Run `npm run build` - must complete without errors
- [ ] Run `npm test` - all regression tests must pass
- [ ] Run `npm run test-full` - complete test suite must pass

```bash
npm run build && npm test
```

### 2. Code Coverage Verification

Ensure coverage has not regressed from the baseline.

- [ ] Run coverage setup: `npm run cov-setup`
- [ ] Run coverage: `npm run coverage`
- [ ] Verify coverage meets or exceeds baseline:
  - Statements: >= 88%
  - Branches: >= 84%
  - Functions: >= 86%
- [ ] Run coverage teardown: `npm run cov-teardown`

```bash
npm run cov-setup
npm run coverage
# Review coverage report in jest-coverage/lcov-report/index.html
npm run cov-teardown
```

**Coverage Baseline (v1.51.x):**
| Metric | Baseline | Current |
|--------|----------|---------|
| Statements | 88.1% | ____% |
| Branches | 84.06% | ____% |
| Functions | 86.8% | ____% |

### 3. Error Code Audit

All compiler error messages must have unique error codes where duplicates exist.

- [ ] Run error code audit script: `npm run audit-errors`
- [ ] Fix any reported issues:
  - Duplicate messages missing unique codes
  - Same error code used for different messages
- [ ] Re-run audit to verify all issues resolved

```bash
npm run audit-errors
```

**Manual spot-check** (the script at `scripts/audit-error-codes.ts` is the
authoritative pass; these are for eyeballing a single file):
```bash
# Find all error codes
grep -oE '\(m[0-9]+\)' src/classes/spinResolver.ts | sort | uniq -c | sort -rn

# Check for duplicated codes (count > 1 indicates problem)
grep -oE '\(m[0-9]+\)' src/classes/*.ts | cut -d: -f2 | sort | uniq -d
```

### 4. Documentation Updates

- [ ] Update `CHANGELOG.md` with all changes since last release

  > **This entry is the release notes.** On tag push the release workflow
  > extracts the `## [VERSION]` section verbatim and publishes it as the GitHub
  > release body — nobody edits it in between. Write it for P2 developers using
  > the compiler, and follow
  > [`DOCs/voicing/CHANGELOG-Voicing.md`](voicing/CHANGELOG-Voicing.md) and the
  > shared [`DOCs/voicing/README.md`](voicing/README.md). Run the changelog
  > guide's checklist before tagging.

- [ ] Confirm the entry opens with a **lede** — the workflow uses that prose
      paragraph as the release headline
- [ ] Run the documentation currency check:

  ```bash
  npm run docs-check
  ```

  This is the **backstop**, not the primary net — the sprint-plan documentation
  gate is what catches docs describing behavior the sprint set out to change.
  This catches the residue: drift in claims that were true once, and docs made
  stale by defects discovered *during* execution that no plan could have named.

  - **UNCLASSIFIED must be zero.** A document missing from
    `DOCs/doc-coverage.json` is a document nobody is accountable for. Add it
    with a class before releasing.
  - **STALE — shipped must be zero.** These are copied into the release
    package; do not ship a package whose own documentation contradicts the
    binary beside it.
  - **STALE — governed** is informational here. It draws down through the
    sprint-plan gate at the manifest's per-sprint rate, not at release time.
  - When a document is brought current, set its `verified` field in the
    manifest to this release's version.

- [ ] Review and update `DOCs/internals/TECHNICAL-DEBT.md` if items were
      addressed
- [ ] Review and update `DOCs/roadmaps/Test-Suite-Punch-List.md` if items were
      addressed
- [ ] Ensure any new features have appropriate documentation, including the
      user-facing docs that ship in the package (see **Shipped documentation**
      below)

### 5. Version Update

The version string lives in **three** places and all three must agree:

- [ ] `package.json` — `version`
- [ ] `package-lock.json` — both `version` fields near the top
- [ ] `src/pnut-ts.ts` — the `version` field of the CLI class

- [ ] Verify version follows the project convention `MAJOR.PNUTVERSION.PATCH`
      (e.g. 1.55.x for PNut v55). When the PNut version bumps, the patch resets
      to 0; within a PNut version only the patch digit is ours to advance.

---

## Release Build

After all checklist items pass:

```bash
npm run bld-dist
```

This produces:
- npm package (`.tgz`)
- Platform binaries in `pkgs/` directory

---

## Post-Release

- [ ] Tag the release in git: `git tag v1.XX.Y`
- [ ] Push tag: `git push origin v1.XX.Y`

  Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds every
  platform binary, **creates the GitHub release automatically**, and fills the
  release body from this version's `CHANGELOG.md` section. There is no manual
  release-body step — which is why the changelog entry has to be right *before*
  the tag is pushed.

- [ ] Verify the published release page: headline sentence reads correctly, the
      "What's New" body matches the changelog entry, all six platform archives
      attached
- [ ] Publish to npm if applicable
- [ ] Add a row to the **Release History** table below

---

## Shipped documentation

Two packaging paths exist and both must ship the same documentation:

| Path | Trigger | Source of the docs |
|---|---|---|
| `.github/workflows/release.yml` | `v*` tag push | the repo originals, copied directly |
| `scripts-pkg/cs_pack.sh` (local, macOS signing) | run by hand from the `DIST` folder | whatever is sitting in `scripts-pkg/_dist/` |

The shipped set is:

`README.md` · `CHANGELOG.md` · `AUTHORS` · `CommandLine.md` ·
`Preprocessor.md` · `LICENSE` · `copyright`

The workflow copies these from the repo and **fails the release if one is
missing**. The local path copies them from `scripts-pkg/_dist/`, which is a
hand-maintained duplicate and is gitignored — so it drifts silently and is the
one to watch.

- [ ] Before a local package build, refresh `scripts-pkg/_dist/` from the repo
      originals rather than editing the copies in place
- [ ] When adding a document to the shipped set, add it in **both** places — the
      workflow's `for doc in ...` list and `scripts-pkg/_dist/`

> **Open item — `copyright`.** The repo's root `copyright` names
> `github.com/ironsheep/Pnut_ts_dev` and credits Iron Sheep Productions only;
> the `_dist` copy that has actually been shipping names the public
> `github.com/ironsheep/PNut_TS` and credits Iron Sheep Productions **and
> Parallax Inc.** The `_dist` text is the correct one to publish. Until the root
> file is reconciled, `copyright` is deliberately **not** in the workflow's copy
> list, so the tag-push path omits it rather than shipping the wrong text.

---

## Error Code Convention

Error codes follow the pattern `(mGGI)` where:
- `m` prefix indicates "message"
- `GG` is a 2-digit group ID (01-99) identifying a group of duplicate error messages
- `I` is a 1-digit instance ID (1-9) identifying which occurrence within the group

**Example:** If the message "Expected end of line" appears 3 times in the code:
- First occurrence: `(m011)` - group 01, instance 1
- Second occurrence: `(m012)` - group 01, instance 2
- Third occurrence: `(m013)` - group 01, instance 3

**Numbering Rules:**
1. Each unique duplicate message text gets the next available group number (01, 02, 03...)
2. Within each group, instances are numbered 1 through N
3. Single-occurrence messages don't need error codes (no duplicates to distinguish)
4. Maximum 9 instances per group (if more needed, split into logical subgroups)

**When adding new error codes:**
1. Run `npm run audit-errors` to find duplicate messages without codes
2. Assign the next available group number to each new duplicate message group
3. Number each instance within the group (1, 2, 3...)

---

## Release History

| Version | Date | Notes |
|---------|------|-------|
| 1.55.2 | 2026-08-08 | Preprocessor diagnostics, single plain-text errors, delete-artifacts-on-failure |
| 1.55.1 | 2026-07-12 | DEBUG_PIN_RX clobbered the TX pin |
| 1.55.0 | 2026-05-13 | PNut v55 support; interpreter ABI break |
| 1.54.7 | 2026-05-09 | Object cache — actual SD FAT32 root cause |
| 1.54.6 | 2026-05-09 | Object cache — subtree exportdef replay |
| 1.54.5 | 2026-05-08 | Object cache — exportdef symbols in the key |
| 1.54.4 | 2026-05-08 | Object cache — debug reference remapping |
| 1.54.3 | 2026-05-08 | Object cache — debug records saved in entries |
| 1.54.2 | 2026-05-06 | Object cache — debug/non-debug keying, map fidelity |
| 1.54.1 | 2026-05-05 | `--cache-clear` without a source file |
| 1.54.0 | 2026-04-23 | PNut v54 support; STRUCT bitfields |
| 1.53.4 | 2026-04-03 | `--cache-dir` |
| 1.53.3 | 2026-04-03 | Persistent object cache; DEBUG capacity in listings |
| 1.53.2 | 2026-03-20 | Non-zero exit on all error paths |
| 1.53.1 | 2026-03-19 | `-I` with absolute paths |
| 1.53.0 | 2026-03-11 | PNut v53 support; `OFFSETOF` |
| 1.52.2 | 2026-02-26 | 62.7% compile-speed improvement |
| 1.52.1 | 2026-02-14 | Language version v52 support |
| 1.51.7 | 2025-12-26 | `--map`; 30-char symbol limit; `$` in DAT declarations |
| 1.51.6 | 2025-09-30 | Line number fix, early deduplication |
| 1.51.5 | 2025-07-11 | send() fix, encoding fixes |
| 1.51.4 | 2025-05-30 | OBJ limit fix |
| 1.51.3 | 2025-05-27 | Include directories, OBJ limit |
| 1.51.2 | 2025-05-19 | Preprocessor fixes |
| 1.51.1 | 2025-05-05 | Post increment/decrement fix |
| 1.51.0 | 2025-05-01 | Language version v51 support |
