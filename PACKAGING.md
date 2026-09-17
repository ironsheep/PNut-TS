# PNut-TS Packaging

This document describes how PNut-TS is packaged and released today. It is the
authority for packaging **mechanics**; `DOCs/RELEASE-PROCESS.md` is the
authority for the release **checklist** (tests, docs, version bump) and links
here for how the build itself works.

Packaging happens **only** in `.github/workflows/release.yml`, triggered by
pushing a `v*` tag (or run manually via `workflow_dispatch`, with an optional
`dry_run` input that skips the final release-publishing job). There is no
local packaging step, no manual macOS-signing process, and no `npm publish`
anywhere in the current process.

---

## Distribution shape

PNut-TS ships as a **standalone executable** with the Node.js runtime
embedded — users do not need Node.js installed. Six platform/architecture
combinations are built from the `pkg.targets` list in `package.json`:

```json
"targets": [
  "node22-win-arm64",
  "node22-win-x64",
  "node22-linux-x64",
  "node22-linux-arm64",
  "node22-macos-x64",
  "node22-macos-arm64"
]
```

The packaging tool is `@yao-pkg/pkg` (invoked as `npx @yao-pkg/pkg . --out-path pkgs`
in the workflow), a maintained fork of the original `vercel/pkg` that supports
Node 20+ targets. `pkg.assets` in `package.json` (`out/ext/*`) embeds the
external `.obj` files (`Spin2_interpreter.obj`, `Spin2_debugger.obj`,
`flash_loader.obj`, `clock_setter.obj`, from `src/ext/`) into every binary.

Both `pnut-ts` (primary) and `pnut_ts` (compatibility alias) names work in
every package: `pnut_ts` is a symlink to `pnut-ts` on Unix and a copy of
`pnut-ts.exe` on Windows (symlinks there require admin rights).

---

## What `.github/workflows/release.yml` does

### Job 1: `build` (`ubuntu-latest`)

1. Reads `package.json`'s `version` and derives the packed form used in
   filenames (`1.55.7` → `015507`).
2. Validates the pushed tag's base version matches `package.json` (tolerating
   `-test`/`-rc`/`-beta`/`-alpha` suffixes as pre-releases).
3. `npm ci`, `npm run build`, `npm run esbuild`, `npm test`.
4. Builds all six standalone executables in one step:
   `npx @yao-pkg/pkg . --out-path pkgs`.
5. **Prepare package contents**: for each of the six platforms, creates
   `packages/pnut-ts-<platform>-<packed-version>/pnut_ts/`, copies in the
   pkg-built binary (as `pnut-ts`, plus the `pnut_ts` compatibility alias),
   and copies these documents from the repo root:

   `README.md` · `CHANGELOG.md` · `AUTHORS` · `CommandLine.md` ·
   `Preprocessor.md` · `copyright` · `LICENSE.txt` (or `LICENSE`)

   **The step fails the job if any of the first six is missing** (explicit
   `[ ! -f "${doc}" ]` check per file); the license file falls back from
   `LICENSE.txt` to `LICENSE` and only warns if neither exists.
6. Zips the four Windows/Linux folders directly and uploads them as the
   `packages-zip` artifact. The two macOS folders are uploaded as separate
   artifacts (`macos-x64-pkg`, `macos-arm64-pkg`) for the next job, along with
   `package.json` itself (`version-info` artifact).

### Job 2: `macos-sign` (`macos-latest`, needs `build`)

1. Downloads the macOS package folders and `package.json`, restores
   executable permissions (GitHub Actions artifacts don't preserve them).
2. **Only if the `MACOS_CERTIFICATE` secret is set**: imports the signing
   certificate into a temporary keychain, code-signs both `pnut-ts` binaries
   with the hardened runtime and a timestamp, verifies each signature, and
   recreates the `pnut_ts` compatibility symlink (signing can disturb it).
   Without that secret, this step and every following signing/notarizing step
   in this job are skipped — the job still builds and zips DMGs, just
   unsigned and unnotarized.
3. Builds a branded DMG background image, then a styled DMG per architecture
   (`hdiutil create`/`convert`), with a Finder window layout applied via
   AppleScript and, if present, custom folder/volume icons from `assets/`.
4. **Only if signing was enabled**: signs each DMG, then submits it to Apple
   notarization (`xcrun notarytool submit ... --wait`) and staples the ticket
   (`xcrun stapler staple`).
5. Zips each DMG (`pnut-ts-macos-<arch>-<packed-version>.zip`) and uploads
   both as the `packages-macos-zip` artifact.

**Secrets used by this job** (verified against `release.yml`):

| Secret | Used for |
|---|---|
| `MACOS_CERTIFICATE` | Base64-encoded `.p12` signing certificate; presence gates all signing/notarizing steps |
| `MACOS_CERTIFICATE_PWD` | Password for the `.p12` certificate |
| `KEYCHAIN_PWD` | Password for the temporary keychain created to hold it |
| `APPLE_TEAM_ID` | Apple Developer Team ID, used in the codesign identity string and passed to `notarytool` |
| `APPLE_DEVELOPER_NAME` | Developer name, used in the codesign identity string |
| `APPLE_ID` | Apple ID email, passed to `notarytool submit` |
| `APPLE_ID_PASSWORD` | App-specific password, passed to `notarytool submit` |

### Job 3: `release` (`ubuntu-latest`, needs both jobs above, skipped entirely when `dry_run` is true)

1. Downloads every artifact (`packages-zip`, `packages-macos-zip`,
   `version-info`) and generates `checksums.txt` (`sha256sum *`) over all of
   them.
2. Decides pre-release status by comparing the tag to `package.json`'s exact
   version.
3. Builds the release body by extracting this version's section out of
   `CHANGELOG.md` — matching either the current `## vX.Y.Z (date)` heading or
   the older Keep a Changelog `## [X.Y.Z] date` form — and pulling its lede
   sentence as the release headline, falling back to the first bullet for
   older entries that predate the lede convention.
4. Publishes the GitHub release with `softprops/action-gh-release`, attaching
   every zip plus `checksums.txt`.

---

## Local testing: `npm run bld-dist`

```bash
npm run build && npm run esbuild && npx @yao-pkg/pkg . -t node22-linux-x64 -o pkgs/p2-pnut-ts-linux-x64 && npx @yao-pkg/pkg . -t node22-linux-arm64 -o pkgs/p2-pnut-ts-linux-arm64
```

This builds only the two Linux binaries, for local sanity-testing in the
container. It does not build Windows or macOS binaries, does not sign or
notarize anything, and does not run `npm pack` — there is no npm package
artifact in the current process, and no `npm publish` step exists anywhere in
this repository or workflow.

---

## Version numbering

The version string follows `MAJOR.PNUTVERSION.PATCH` (e.g. `1.55.7` for PNut
v55, patch 7) and must agree in three places:

- `package.json` — `version`
- `package-lock.json` — both `version` fields near the top
- `src/pnut-ts.ts` — the `version` field of the CLI class

`release.yml` derives the packed form used in artifact filenames by
zero-padding each part to two digits (`1.55.7` → `015507`), used in names like
`pnut-ts-linux-x64-015507.zip`.
