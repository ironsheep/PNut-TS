#!/usr/bin/env bash
#
# bundle.sh — Build the folder Windows needs to regenerate GOLD files.
#
# First regenerates every TEST/<suite>/rebuild-gold.ps1
# (scripts/gold/gen-rebuild-scripts.js), then writes the output folder
# (default WINDOWS-RUN/, local, never committed) containing:
#   - TEST/<suite>/*.spin2          (source files for every Windows-regen suite)
#   - TEST/<suite>/<FILE blobs>     (files the sources pull in with FILE "...")
#   - TEST/<suite>/gen_*.d/         (aux files of generated fixtures)
#   - TEST/<suite>/rebuild-gold.ps1 (per-suite driver, generated)
#   - scripts/gold/rebuild-gold-lib.ps1   (shared engine)
#   - scripts/gold/rebuild-gold-all.ps1   (top-level driver)
#   - run.ps1                        (step 1: 3-fixture EXCEPT dry run; step 2,
#                                     only if step 1 passes: the full run)
#   - README.txt                     (3 lines: copy over, run, copy back)
#
# Copy the whole folder to Windows, run run.ps1, copy the whole folder back,
# then: npm run apply-regold-tarball -- WINDOWS-RUN
#
# Excluded from the folder:
#   - existing .GOLD files (regen produces them fresh)
#   - .lst, .obj, .bin, .flash, .elem, .errout intermediates
#   - __pre.spin2 outputs
#   - legacy <SUITE>-rebuild-v52/ scaffolding
#   - dirs without rebuild-gold.ps1 (PREPROC, FULL/, SHORT/, INCLUDE, CACHE, MAP)
#
# Usage:
#   ./scripts/gold/bundle.sh
#       Writes WINDOWS-RUN/. PNut version inferred from package.json
#       (Major.PNutVersion.Patch).
#
#   ./scripts/gold/bundle.sh --out-dir DIR
#       Write DIR/ instead.
#
#   ./scripts/gold/bundle.sh --replace
#       The output folder may already exist: it is removed and rebuilt, but
#       only if every .GOLD file in it is byte-identical to the tree's (that
#       is, nothing returned from Windows is waiting to be applied).
#
#   ./scripts/gold/bundle.sh -o /tmp/my-bundle.tar.gz
#       Also pack the folder into that tarball.
#
#   ./scripts/gold/bundle.sh --pnut-version 54
#       Override (rare — for cross-version sanity checks).

set -euo pipefail

# The step-1 dry run: three EXCEPT-tests fixtures, each expected to fail.
#   fvars_too_big       its committed .errout.GOLD came from Windows PNut
#                       (05a42ba), so the dry run's must compare equal to it
#   debug_empty_str     compiled -cd (the debug_* pattern)
#   pperr_stray_endif   a preprocessor error both compilers have
DRY_RUN_FILES=(fvars_too_big.spin2 debug_empty_str.spin2 pperr_stray_endif.spin2)

# ---- Parse args -------------------------------------------------------------

PNUT_VERSION=""
OUTPUT=""
OUT_DIR=""
REPLACE=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --pnut-version) PNUT_VERSION="$2"; shift 2 ;;
        -o|--output)    OUTPUT="$2"; shift 2 ;;
        --out-dir)      OUT_DIR="$2"; shift 2 ;;
        --replace)      REPLACE=1; shift ;;
        -h|--help)
            sed -n '/^#/p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

# ---- Locate repo root -------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# ---- Infer PNut version from package.json if not given ---------------------

if [[ -z "$PNUT_VERSION" ]]; then
    # Convention: package.json version is Major.PNutVersion.Patch (e.g., 1.55.0)
    PKG_VERSION="$(node -p "require('./package.json').version" 2>/dev/null || true)"
    if [[ -z "$PKG_VERSION" ]]; then
        echo "ERROR: Could not read version from package.json" >&2
        echo "       Pass --pnut-version explicitly." >&2
        exit 1
    fi
    PNUT_VERSION="$(echo "$PKG_VERSION" | cut -d. -f2)"
fi
if [[ ! "$PNUT_VERSION" =~ ^[0-9]+$ ]]; then
    echo "ERROR: PNut version '$PNUT_VERSION' is not a number" >&2
    echo "       Pass --pnut-version explicitly." >&2
    exit 1
fi

if [[ -z "$OUT_DIR" ]]; then
    OUT_DIR="WINDOWS-RUN"
fi
mkdir -p "$(dirname "$OUT_DIR")"
OUT_DIR="$(cd "$(dirname "$OUT_DIR")" && pwd)/$(basename "$OUT_DIR")"
if [[ -n "$OUTPUT" ]]; then
    mkdir -p "$(dirname "$OUTPUT")"
    OUTPUT="$(cd "$(dirname "$OUTPUT")" && pwd)/$(basename "$OUTPUT")"
fi

# ---- The output folder must not hold unapplied results ----------------------

case "$OUT_DIR/" in
    "$REPO_ROOT/"|"$REPO_ROOT/TEST/"*|"$REPO_ROOT/scripts/"*|"$REPO_ROOT/src/"*|"$REPO_ROOT/.git/"*)
        echo "ERROR: --out-dir $OUT_DIR is inside the source tree; it is removed and rebuilt, so it must be a folder of its own" >&2
        exit 1 ;;
esac
if [[ "$REPO_ROOT/" == "$OUT_DIR/"* ]]; then
    echo "ERROR: --out-dir $OUT_DIR contains the repository" >&2
    exit 1
fi

if [[ -e "$OUT_DIR" ]]; then
    if [[ -n "$(ls -A "$OUT_DIR" 2>/dev/null)" && $REPLACE -eq 0 ]]; then
        echo "ERROR: $OUT_DIR already exists and is not empty." >&2
        echo "       Pass --replace to rebuild it, or --out-dir to write elsewhere." >&2
        exit 1
    fi
    UNAPPLIED=()
    while IFS= read -r -d '' gold; do
        rel="${gold#"$OUT_DIR"/}"
        rel="${rel#TEST/}"
        if ! cmp -s "$gold" "TEST/$rel"; then
            UNAPPLIED+=("$rel")
        fi
    done < <(find "$OUT_DIR" -type f -name '*.GOLD' -print0)
    if [[ ${#UNAPPLIED[@]} -gt 0 ]]; then
        echo "ERROR: $OUT_DIR holds ${#UNAPPLIED[@]} .GOLD file(s) that differ from TEST/ (not applied yet):" >&2
        for f in "${UNAPPLIED[@]:0:20}"; do echo "  $f" >&2; done
        echo "       Apply them (npm run apply-regold-tarball -- $OUT_DIR) or move the folder away." >&2
        exit 1
    fi
fi

# ---- Regenerate the per-suite scripts ---------------------------------------

node scripts/gold/gen-rebuild-scripts.js

for f in "${DRY_RUN_FILES[@]}"; do
    if [[ ! -f "TEST/EXCEPT-tests/$f" ]]; then
        echo "ERROR: dry-run fixture TEST/EXCEPT-tests/$f does not exist" >&2
        exit 1
    fi
    if ! sed -n '/-ExpectFail @(/,/^        )/p' TEST/EXCEPT-tests/rebuild-gold.ps1 \
         | grep -x "            \"$f\"" > /dev/null; then
        echo "ERROR: dry-run fixture $f is not in TEST/EXCEPT-tests/rebuild-gold.ps1 -ExpectFail" >&2
        exit 1
    fi
done

# ---- Discover suites that have rebuild-gold.ps1 -----------------------------

mapfile -t SUITE_SCRIPTS < <(find TEST -name rebuild-gold.ps1 -not -path '*-rebuild-v*' | sort)

if [[ ${#SUITE_SCRIPTS[@]} -eq 0 ]]; then
    echo "ERROR: No TEST/*/rebuild-gold.ps1 files found." >&2
    exit 1
fi

# Extract the suite directories
SUITE_DIRS=()
for script in "${SUITE_SCRIPTS[@]}"; do
    SUITE_DIRS+=("$(dirname "$script")")
done

echo "Output folder:      $OUT_DIR"
echo "PNut version:       $PNUT_VERSION"
echo "Suites discovered:  ${#SUITE_DIRS[@]}"
for d in "${SUITE_DIRS[@]}"; do echo "  - $d"; done
echo ""

# ---- Build the folder -------------------------------------------------------

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Copy each suite: .spin2 sources + FILE-directive blobs + the rebuild-gold.ps1
# (Skip .GOLD, .lst, .obj, .bin, .flash, .elem, .errout, __pre.spin2)
#
# The blob copy is NOT optional. Spin2's FILE directive pulls binary payloads in
# at compile time (TOF's p2font16 and vl53l5cx_mm1_1_fw.dat, BLDC's p2font16,
# WUMMI's Type1.bin/Type2.bin). Shipping only .spin2 makes those fixtures fail
# on Windows, and the round trip is what pays for the discovery. Copying by
# extension cannot work either: WUMMI's payloads are named .bin, which is also a
# compiler OUTPUT extension — so we copy exactly the names the FILE directives
# use. Same rule as scripts/gold/prep-jobs.sh; keep the two in step.
for suite_dir in "${SUITE_DIRS[@]}"; do
    target="$OUT_DIR/$suite_dir"
    mkdir -p "$target"
    # Copy .spin2 sources, excluding __pre.spin2 / -pre.spin2
    find "$suite_dir" -maxdepth 1 -name '*.spin2' \
        ! -name '*__pre.spin2' ! -name '*-pre.spin2' \
        -exec cp {} "$target/" \;
    # Copy every file named by a FILE directive in those sources
    while IFS= read -r blob; do
        [[ -z "$blob" ]] && continue
        if [[ -f "$suite_dir/$blob" ]]; then
            cp "$suite_dir/$blob" "$target/"
        else
            echo "  WARNING: $suite_dir: FILE \"$blob\" not found in suite dir" >&2
        fi
    done < <(find "$suite_dir" -maxdepth 1 -name '*.spin2' \
                  ! -name '*-pre.spin2' ! -name '*__pre.spin2' -print0 \
             | xargs -0 -r grep -hoiE '\bfile[[:space:]]+"[^"]+"' 2>/dev/null \
             | sed -E 's/.*"([^"]+)".*/\1/' | sort -u)
    # Generated fixtures keep their aux files in gen_<id>.d/
    find "$suite_dir" -mindepth 1 -maxdepth 1 -type d -name 'gen_*.d' \
        -exec cp -r {} "$target/" \;
    cp "$suite_dir/rebuild-gold.ps1" "$target/"
done

# Copy shared engine + driver
mkdir -p "$OUT_DIR/scripts/gold"
cp scripts/gold/rebuild-gold-lib.ps1 "$OUT_DIR/scripts/gold/"
cp scripts/gold/rebuild-gold-all.ps1 "$OUT_DIR/scripts/gold/"

# ---- run.ps1: dry run, then (only if it passed) the full run ---------------

DRY_RUN_PS="$(printf '"%s", ' "${DRY_RUN_FILES[@]}")"
DRY_RUN_PS="${DRY_RUN_PS%, }"

sed -e "s/@PNUT_VERSION@/$PNUT_VERSION/" -e "s/@DRY_RUN_FILES@/$DRY_RUN_PS/" \
    > "$OUT_DIR/run.ps1" <<'EOF'
<#
.SYNOPSIS
    The Windows GOLD visit: a three-fixture EXCEPT-tests dry run, then the
    full run of every suite.

.DESCRIPTION
    Step 1 compiles three EXCEPT-tests fixtures, each expected to fail, so
    each must leave an .errout.GOLD made from PNut's Error.txt. Step 2 starts
    only when step 1 ends VERDICT: PASS. Each step writes
    TEST\gold-run-summary.txt, which therefore holds the last step that ran.

    Run from anywhere:
        powershell -ExecutionPolicy Bypass -File .\run.ps1
#>
param(
    [int]$PNutVersion = @PNUT_VERSION@,
    [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
    [string]$PNutBinary = "",
    [int]$CompileTimeoutSeconds = 60
)

$all = Join-Path $PSScriptRoot "scripts\gold\rebuild-gold-all.ps1"
$dryRun = @(@DRY_RUN_FILES@)

# ---- Step 0: the per-compile timeout, checked on a throwaway copy ---------
# A stub compiler that never finishes must be recorded TIMED-OUT, and its whole
# process tree killed. Runs in %TEMP%, so nothing in this folder is touched
# except the one-line result file. Its result is reported, never blocking.
$stubRoot = Join-Path $env:TEMP ("pnutts-timeout-check-" + [guid]::NewGuid().ToString("N"))
$stubSuite = Join-Path $stubRoot "TEST\EXCEPT-tests"
$timeoutResult = Join-Path $PSScriptRoot "TEST\timeout-check.txt"
try {
    New-Item -ItemType Directory -Force -Path $stubSuite | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $stubRoot "scripts\gold") | Out-Null
    Copy-Item -Path (Join-Path $PSScriptRoot "scripts\gold\*.ps1") -Destination (Join-Path $stubRoot "scripts\gold")
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "TEST\EXCEPT-tests\rebuild-gold.ps1") -Destination $stubSuite
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "TEST\EXCEPT-tests\fvars_too_big.spin2") -Destination $stubSuite
    $stub = Join-Path $stubRoot "hang.bat"
    Set-Content -LiteralPath $stub -Value "@ping -n 600 127.0.0.1 >nul" -Encoding ASCII
    $stubSummary = Join-Path $stubRoot "summary.txt"
    Write-Output "STEP 0: timeout check with a stub compiler that never finishes (about 15 s)"
    & (Join-Path $stubRoot "scripts\gold\rebuild-gold-all.ps1") -RepoRoot $stubRoot -PNutBinary $stub `
        -Suites EXCEPT-tests -Files @("fvars_too_big.spin2") -CompileTimeoutSeconds 5 `
        -SummaryPath $stubSummary | Out-Null
    $timedOut = $false
    if (Test-Path -LiteralPath $stubSummary) {
        $timedOut = [bool]((Get-Content -LiteralPath $stubSummary) -match "TIMED-OUT")
    }
    $leftover = @(Get-CimInstance Win32_Process -Filter "Name='PING.EXE'" |
        Where-Object { $_.CommandLine -like "*-n 600 127.0.0.1*" })
    foreach ($p in $leftover) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    $line = "timeout check: recorded TIMED-OUT = $timedOut; stub processes left running = $($leftover.Count)"
    if ($timedOut -and $leftover.Count -eq 0) { $line = "PASS $line" } else { $line = "FAIL $line" }
} catch {
    $line = "FAIL timeout check could not run: $($_.Exception.Message)"
}
Set-Content -LiteralPath $timeoutResult -Value $line -Encoding ASCII
Write-Output "  $line"
Remove-Item -LiteralPath $stubRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Output ""

Write-Output "STEP 1 of 2: dry run, EXCEPT-tests: $($dryRun -join ', ')"
& $all -PNutVersion $PNutVersion -PNutInstallRoot $PNutInstallRoot -PNutBinary $PNutBinary `
    -Suites EXCEPT-tests -Files $dryRun -CompileTimeoutSeconds $CompileTimeoutSeconds
if ($LASTEXITCODE -ne 0) {
    Write-Output ""
    Write-Output "STEP 1 FAILED: the full run was not started. Copy this folder back as it is."
    exit 1
}

Write-Output ""
Write-Output "STEP 2 of 2: full run, every suite"
& $all -PNutVersion $PNutVersion -PNutInstallRoot $PNutInstallRoot -PNutBinary $PNutBinary `
    -CompileTimeoutSeconds $CompileTimeoutSeconds
$code = $LASTEXITCODE
Write-Output ""
Write-Output "Done. Copy this whole folder back; TEST\gold-run-summary.txt has the result."
exit $code
EOF

cat > "$OUT_DIR/README.txt" <<'EOF'
1. Copy this whole folder to Windows (Windows PNut installed; PowerShell 5.1 is enough).
2. In it run:  powershell -ExecutionPolicy Bypass -File .\run.ps1
3. Copy the whole folder back; TEST\gold-run-summary.txt should end with VERDICT: PASS.
EOF

COUNT=$(find "$OUT_DIR" -type f | wc -l)
echo "Folder ready: $OUT_DIR ($COUNT files)"

# ---- Optional tarball -------------------------------------------------------

if [[ -n "$OUTPUT" ]]; then
    tar -C "$(dirname "$OUT_DIR")" -czf "$OUTPUT" "$(basename "$OUT_DIR")"
    echo "Tarball ready: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
fi

echo ""
echo "Next steps:"
echo "  1. Copy $OUT_DIR to Windows, whole."
echo "  2. In it: powershell -ExecutionPolicy Bypass -File .\\run.ps1"
echo "  3. Copy the whole folder back, then: npm run apply-regold-tarball -- $OUT_DIR"
