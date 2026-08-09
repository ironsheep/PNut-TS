# Punch-List Archive — 2026-08-09

Items confirmed done and swept from `DOCs/roadmaps/Test-Suite-Punch-List.md`
at the Preproc-Symbols sprint closeout. Archive files are never re-edited; a
reopened item returns to the active list as a new entry referencing this one.

---

## 7. `copyright` excluded from the release package (added 2026-08-08, closed 2026-08-09)

**Surfaced by:** CLI-Robustness closeout, while reconciling the two packaging
paths.

The repo root `copyright` named `github.com/ironsheep/Pnut_ts_dev` — a private
dev repo — and credited Iron Sheep Productions only, while the
`scripts-pkg/_dist/copyright` copy that had actually been shipping named the
public `github.com/ironsheep/PNut_TS` and credited Iron Sheep Productions and
Parallax Inc. `copyright` was therefore deliberately left out of the release
workflow's document list.

**Closed by** Preproc-Symbols sprint §9 (commit `67c3b9c`, shipped in
v1.55.3): root reconciled to the `_dist` wording (public URL, both
attributions — matching the attribution Stephen established across LICENSE,
the CLI banner and the shipping copy in Aug–Sep 2024), both copies
byte-identical, `copyright` added to the workflow's document loop with its
hard-fail guard intact, RELEASE-PROCESS.md open item removed. First release
to ship it: v1.55.3.
