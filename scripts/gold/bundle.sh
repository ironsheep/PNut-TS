#!/usr/bin/env bash
#
# bundle.sh — Package up everything Windows needs to regenerate GOLD files.
#
# Output: regold-bundle-v<NN>.tar.gz containing:
#   - TEST/<suite>/*.spin2          (source files for every Windows-regen suite)
#   - TEST/<suite>/rebuild-gold.ps1 (per-suite driver)
#   - scripts/gold/rebuild-gold-lib.ps1   (shared engine)
#   - scripts/gold/rebuild-gold-all.ps1   (top-level driver)
#   - manifest.json                  (declares pnut_version + suite list)
#   - README.txt                     (Windows-side workflow instructions)
#
# Excluded from bundle:
#   - existing .GOLD files (regen produces them fresh)
#   - .lst, .obj, .bin, .flash, .elem, .errout intermediates
#   - __pre.spin2 outputs
#   - legacy <SUITE>-rebuild-v52/ scaffolding
#   - dirs without rebuild-gold.ps1 (PREPROC, EXCEPT, FULL/, SHORT/, INCLUDE, CACHE, ALLCODE, MAP)
#
# Usage:
#   ./scripts/gold/bundle.sh
#       PNut version inferred from package.json (Major.PNutVersion.Patch).
#
#   ./scripts/gold/bundle.sh --pnut-version 54
#       Override (rare — for cross-version sanity checks).
#
#   ./scripts/gold/bundle.sh -o /tmp/my-bundle.tar.gz
#       Custom output path.

set -euo pipefail

# ---- Parse args -------------------------------------------------------------

PNUT_VERSION=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --pnut-version) PNUT_VERSION="$2"; shift 2 ;;
        -o|--output)    OUTPUT="$2"; shift 2 ;;
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
    if [[ ! "$PNUT_VERSION" =~ ^[0-9]+$ ]]; then
        echo "ERROR: Could not parse PNut version from package.json '$PKG_VERSION'" >&2
        echo "       Pass --pnut-version explicitly." >&2
        exit 1
    fi
fi

if [[ -z "$OUTPUT" ]]; then
    OUTPUT="regold-bundle-v${PNUT_VERSION}.tar.gz"
fi

# ---- Discover suites that have rebuild-gold.ps1 -----------------------------

mapfile -t SUITE_SCRIPTS < <(find TEST -name rebuild-gold.ps1 -not -path '*-rebuild-v*' | sort)

if [[ ${#SUITE_SCRIPTS[@]} -eq 0 ]]; then
    echo "ERROR: No TEST/*/rebuild-gold.ps1 files found." >&2
    echo "       (Per-suite scripts must exist before bundling.)" >&2
    exit 1
fi

# Extract the suite directories
SUITE_DIRS=()
for script in "${SUITE_SCRIPTS[@]}"; do
    SUITE_DIRS+=("$(dirname "$script")")
done

echo "Bundle target:      $OUTPUT"
echo "PNut version:       $PNUT_VERSION"
echo "Suites discovered:  ${#SUITE_DIRS[@]}"
for d in "${SUITE_DIRS[@]}"; do echo "  - $d"; done
echo ""

# ---- Build staging tree -----------------------------------------------------

STAGING="$(mktemp -d -t regold-bundle.XXXXXX)"
trap 'rm -rf "$STAGING"' EXIT

BUNDLE_NAME="regold-bundle-v${PNUT_VERSION}"
BUNDLE_DIR="$STAGING/$BUNDLE_NAME"
mkdir -p "$BUNDLE_DIR"

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
    target="$BUNDLE_DIR/$suite_dir"
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
    cp "$suite_dir/rebuild-gold.ps1" "$target/"
done

# Copy shared engine + driver
mkdir -p "$BUNDLE_DIR/scripts/gold"
cp scripts/gold/rebuild-gold-lib.ps1 "$BUNDLE_DIR/scripts/gold/"
cp scripts/gold/rebuild-gold-all.ps1 "$BUNDLE_DIR/scripts/gold/"

# Manifest
cat > "$BUNDLE_DIR/manifest.json" <<EOF
{
  "pnut_version": $PNUT_VERSION,
  "bundle_name": "$BUNDLE_NAME",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "suite_count": ${#SUITE_DIRS[@]},
  "suites": [
$(for d in "${SUITE_DIRS[@]}"; do echo "    \"$d\","; done | sed '$ s/,$//')
  ]
}
EOF

# README for the Windows side
cat > "$BUNDLE_DIR/README.txt" <<EOF
PNut-TS GOLD Regeneration Bundle
=================================
Version: v${PNUT_VERSION}
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

WHAT THIS IS
------------
This bundle contains everything needed to regenerate the .lst.GOLD,
.obj.GOLD, .bin.GOLD (and .flash.GOLD where applicable) reference files
on Windows, using PNut_shell.bat (the HEADLESS CLI) from the v${PNUT_VERSION}
install directory.

PREREQUISITES
-------------
- PNut v${PNUT_VERSION} installed; the headless CLI must be available as:
    C:\\Program Files (x86)\\Parallax Inc\\PNut_v${PNUT_VERSION}\\PNut_shell.bat
  (or as PNut_shell on PATH — though that won't distinguish versions, so
  prefer the versioned install path)
- NOTE: PNut_v${PNUT_VERSION}.exe is the GUI editor; it is interactive and does
  NOT produce .lst/.obj/.bin output from the command line. We need the
  PNut_shell.bat variant inside the versioned install dir.
- PowerShell 5.1+ (default on all modern Windows)

USAGE
-----
1. Extract this tarball anywhere on Windows:
     tar xf ${BUNDLE_NAME}.tar.gz
     cd ${BUNDLE_NAME}

2. Run the top-level driver (regenerates ALL suites):
     powershell -ExecutionPolicy Bypass -File scripts\\gold\\rebuild-gold-all.ps1

   Or regenerate a single suite (faster for debugging):
     cd TEST\\OBJ-tests
     powershell -ExecutionPolicy Bypass -File rebuild-gold.ps1

   Or a subset of suites:
     powershell -ExecutionPolicy Bypass -File scripts\\gold\\rebuild-gold-all.ps1 \\
         -Suites OBJ-tests,DBG-tests

3. Pack the result for return:
     tar czf regold-output-v${PNUT_VERSION}.tar.gz TEST/

4. Transfer regold-output-v${PNUT_VERSION}.tar.gz back to the PNut-TS repo and
   run on the container side:
     npm run apply-regold-tarball -- regold-output-v${PNUT_VERSION}.tar.gz

ROUND-TRIP SANITY CHECK
-----------------------
Before trusting v${PNUT_VERSION} GOLDs, regenerate v52 GOLDs and verify they
match the existing checked-in GOLDs byte-for-byte:

     powershell -ExecutionPolicy Bypass -File scripts\\gold\\rebuild-gold-all.ps1 \\
         -PNutVersion 52

(Assumes you have PNut v52 installed alongside v${PNUT_VERSION}.)
EOF

# ---- Tar it up --------------------------------------------------------------

tar -C "$STAGING" -czf "$OUTPUT" "$BUNDLE_NAME"

SIZE=$(du -h "$OUTPUT" | cut -f1)
COUNT=$(find "$BUNDLE_DIR" -type f | wc -l)
echo "Bundle ready: $OUTPUT ($SIZE, $COUNT files)"
echo ""
echo "Next steps:"
echo "  1. Transfer $OUTPUT to your Windows box."
echo "  2. tar xf $(basename "$OUTPUT") && cd $BUNDLE_NAME"
echo "  3. powershell -ExecutionPolicy Bypass -File scripts\\gold\\rebuild-gold-all.ps1"
echo "  4. tar czf regold-output-v${PNUT_VERSION}.tar.gz TEST/"
echo "  5. Transfer back, then: npm run apply-regold-tarball -- regold-output-v${PNUT_VERSION}.tar.gz"
