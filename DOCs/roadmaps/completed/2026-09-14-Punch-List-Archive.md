# Punch List Archive — 2026-09-14

Items confirmed done and swept out of `DOCs/roadmaps/Test-Suite-Punch-List.md`
in an ad-hoc maintenance pass during Map-Instance-Correctness sprint planning.
Items 3 and 12 were verified closed on 2026-09-14 (each carries its evidence);
the rest were already marked closed in the active list and are archived as
written.

**This file is never re-edited.** If one of these must be reopened it returns to
the active punch list as a *new* item referencing this archive.

---

## 3. Pre-existing `audit-errors` duplicates (8)

`npm run audit-errors` reports 8 duplicate-message issues that pre-date
v1.54.3 (confirmed by stashing changes and re-running on `main`). All cluster
around STRUCT support added in v1.54.0:

- `"Expected an existing STRUCT name"` — needs 2 unique codes
- `"Expected a structure member name"` — needs 2 unique codes
- `"Structure does not contain this name"` — needs 3 unique codes
- `"Indexed structures cannot exceed $FFFF bytes in size"` — inconsistent codes
- `"Structure index must be from 0 to $FFFF"` — needs 2 unique codes
- `"Structure exceeds hub range of $FFFFF"` — inconsistent codes
- `"Bit number exceeds BYTE/WORD/LONG boundary"` — needs 2 unique codes
- `"OBJ data exceeds ${this.obj_limit / 1024}k limit"` — needs 2 unique codes
  (this one is in `compiler.ts`, not STRUCT-related)

**Convention** (per `DOCs/RELEASE-PROCESS.md`): error codes are `(mGGI)`
where `GG` is a group ID and `I` is the instance within the group. Multiple
locations sharing one message text get one group with sequential instance
suffixes. Suggested next step: assign group codes per the convention and
re-run `npm run audit-errors` until clean.

**Why deferred:** mechanical fix that's tangential to the cache work.
Ideally addressed as a single dedicated commit so the changelog entry reads
cleanly.


Status: **CLOSED 2026-09-14** — `npm run audit-errors` passes on 1.55.7:
341 error statements, 151 unique codes, no code used for two messages, and every
duplicated message carries its own code. The commit that assigned the codes was
not identified; the audit result is the evidence.

---

## 8. — closed 2026-09-13, fixed in commit `1a98da4`

`#include` in a top-level file compiled the **included** file in its place. Its
document registered in `Context.sourceFiles` while the top file was still
preprocessing in its constructor, so it sat at index 0 where `getTopFile()`
looks. A constants-only include failed with `No PUB method or DAT block found`;
an include carrying a `PUB` did *not* "work" as first recorded here — it
silently built a binary of the included file alone. `#include` inside an `OBJ`
child was never affected.

Fixed by `SourceFiles.addTopFile()`. Covered by `inc_consts_only` and
`inc_with_pub` in `src/tests/INCLUDE-tests/pnut-ts-include.test.ts`, compared
against Windows PNut GOLDs built from hand-flattened twins in
`TEST/INCLUDE-tests/flattened/` (PNut has no `#include`).

---

## 12. `isp_dummy_flash` intermittently compares an empty `.flash` (added 2026-08-09)

**Surfaced by:** Preproc-Symbols sprint full-suite runs — failed in 2 of 6
runs with `Flash Files Don't match!`, and on inspection the compiler-written
`.flash` file was **0 bytes** at comparison time. Passes standalone and on
every rerun; the file regenerates at its normal 6,436 bytes. Never observed
before this sprint at this frequency.

**Shape:** a test-harness write race, not a compiler defect — the FLASH
runner's `waitForFiles()` sees the file exist before its content is flushed
(or a same-process stream is still open when the comparator reads). The
preprocessor changes this sprint do not touch flash generation, and the
failure did not correlate with any code change (first sighting was on a
diff that only removed logging guards).

**Suggested fix:** make the flash comparator (and possibly `waitForFiles` in
`src/tests/testUtils.ts`) wait for non-zero size / stable size across two
polls rather than bare existence, or ensure the write path is synchronous
before the test asserts. Check whether other binary comparisons share the
same latent race.


Status: **CLOSED 2026-09-14 — it was a compiler defect, fixed in 1.55.4.** The
"harness race" reading above was wrong. `P2MakeFlashFile` opened a second
`fs.createWriteStream` on the `.flash` path that was never written to and was
closed at once; `createWriteStream` truncates asynchronously, so under load the
truncation could land after the real write and leave a zero-byte file. 1.55.4
removed that stream (`src/classes/spin2Parser.ts`, the comment in
`P2MakeFlashFile`) and made the binary writes synchronous; the CHANGELOG records
it (".flash output could be written empty"). The same unawaited-stream pattern
survives in two other outputs — tracked as new item 22.

---

## 17. — closed 2026-08-30, fixed in v1.55.5

Cached parents did not patch their descendants' brkCodes: a parent's `.bin`
carried its descendants' relocated code, but its brkSite list covered only its
own region, so on a cache hit `injectRecord` could return different indices and
every descendant brkCode was left pointing at whatever now occupied its old
one. The binary came out the **right size** with wrong content, so only byte
comparison against an uncached build caught it.

Filed and fixed the same day. Descendant brkSites are now registered as
`compile_obj_blocks` copies each child image in — rebased past the 8-byte
vsize/psize header their coordinates include — and relocated through
`distillObjects`, which compacts the image and drops the regions it eliminates.
Covered by three tests in `src/tests/CACHE-tests/objectCache.test.ts` and by
`npm run cache-fuzz` (306 ordered pairs, 0 mismatches).

---

## 18. — closed 2026-09-13

Conditional explicit `AUGS`/`AUGD` had no GOLD-backed test. v1.55.6 fixed
`AUGS #v` / `AUGD #v` with bit 31 of `v` set — the arithmetic `>> 9` OR'd in
unmasked forced bits 31..23 to 1, overwriting the condition field as well as
AUGS's opcode bit — but its fixture `pnut-ts-augs-sign.spin2` covers only the
unconditional form, where the condition field is already `%1111`.

Closed by `TEST/DAT-PASM-tests/pnut-ts-augs-cond.spin2` with PNut v55 GOLDs:
`if_z`/`if_nz`/`if_c`/`if_nc` forms of both instructions with bit-31 operands
(including `#-1`), bit-31-clear controls, and a conditional `##` auto-prefix.
The fixed build matches the GOLDs. A survey of every other right-shift and
encoded-field OR in `src/` for the same class found no further instances.

---

### 13b. — closed 2026-08-30

`Testing.md` gained an "If you use the object cache" section: what
`--cache-verify` does, that it is opt-in so a plain `--cache` build ships a bad
binary silently, that a mismatch is always worth reporting and what to include,
and that the first build after a format bump is slow on purpose.

*Correction to the original entry:* it named `DOCs/internals/Testing.md`, which
does not exist. The file is top-level `Testing.md`, linked from `README.md`.

---

### 13c. — closed 2026-08-30

All three roadmap links repaired (the documents had moved to
`roadmaps/completed/`; the index now says so rather than linking into the void).
The `/internals/` index went from 5 entries to the full set, grouped — compiler
and output formats, runtime and silicon, DEBUG windows, usage guides, briefings
— and the `/roadmaps/` list now names the punch list and both cache documents.
Every relative link in the file was checked and resolves. The hour-estimate
framing ("~600+ hours across all roadmaps") was dropped; it is not how this
project plans.

---

### 13e. — closed 2026-08-30

`DOCs/RELEASE-PROCESS.md` is now class `governed` covering `packaging`, so a
change to `.github/workflows/release.yml` or `package.json` can stale it. Its
Release History table also gained the 1.55.5 row it was missing. `docs-check`
now reports `process=13 governed=60` where it read 14/59.

---

### 13f. — closed 2026-08-24

Both faces now read `2024-2026` as a range, decided by Stephen and applied in
commit `c813767`.
