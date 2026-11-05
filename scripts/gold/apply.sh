#!/usr/bin/env bash
#
# apply.sh — Take what a Windows GOLD run returned (the WINDOWS-RUN/ folder,
# or a tarball of it) and lay the new or changed .GOLD files, plus
# TEST/gold-run-summary.txt, back into TEST/.
#
# Every returned GOLD is checked first: the .spin2 beside it in the returned
# folder must exist and be byte-identical to the tree's TEST/<suite>/<base>.spin2.
# If any GOLD fails that check, nothing at all is copied (exit 1): the run was
# made from different sources and its GOLDs cannot be trusted.
#
# Only GOLDs that are new or differ from the tree are copied. Nothing in TEST/
# is ever deleted.
#
# Usage:
#   ./scripts/gold/apply.sh WINDOWS-RUN
#   ./scripts/gold/apply.sh regold-output-v55.tar.gz
#       Prints the summary (unchanged / changed / new / missing / refused),
#       prompts for confirmation, then copies into TEST/.
#
#   ./scripts/gold/apply.sh WINDOWS-RUN --yes
#       Skip the confirmation prompt.
#
#   ./scripts/gold/apply.sh WINDOWS-RUN --dry-run
#       Show the summary only; don't copy anything.

set -euo pipefail

# ---- Parse args -------------------------------------------------------------

INPUT=""
YES=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --yes)     YES=1; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        -h|--help)
            sed -n '/^#/p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        -*) echo "Unknown arg: $1" >&2; exit 1 ;;
        *)  if [[ -z "$INPUT" ]]; then INPUT="$1"; else echo "Multiple inputs not supported" >&2; exit 1; fi; shift ;;
    esac
done

if [[ -z "$INPUT" ]]; then
    echo "Usage: $0 <WINDOWS-RUN folder | regold-output.tar.gz> [--yes] [--dry-run]" >&2
    exit 1
fi

if [[ ! -e "$INPUT" ]]; then
    echo "ERROR: Input not found: $INPUT" >&2
    exit 1
fi
INPUT="$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")"

# ---- Locate repo root -------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# ---- Find the returned TEST/ ------------------------------------------------

if [[ -d "$INPUT" ]]; then
    SEARCH="$INPUT"
else
    STAGING="$(mktemp -d -t regold-apply.XXXXXX)"
    trap 'rm -rf "$STAGING"' EXIT
    tar -xzf "$INPUT" -C "$STAGING"
    SEARCH="$STAGING"
fi

# Handles a TEST/ at the top or one level down (a wrapper directory)
NEW_TEST=""
if [[ -d "$SEARCH/TEST" ]]; then
    NEW_TEST="$SEARCH/TEST"
else
    for d in "$SEARCH"/*/; do
        if [[ -d "$d/TEST" ]]; then
            NEW_TEST="${d%/}/TEST"
            break
        fi
    done
fi

if [[ -z "$NEW_TEST" ]]; then
    echo "ERROR: No TEST/ directory found inside $INPUT" >&2
    exit 1
fi
if [[ "$(cd "$NEW_TEST" && pwd)" == "$REPO_ROOT/TEST" ]]; then
    echo "ERROR: $INPUT is the repository itself" >&2
    exit 1
fi

# An errout GOLD keeps the absolute path of the machine that made it; two that
# differ only in that path or in line endings read the same to the EXCEPT harness.
errout_text() {
    tr '\r' '\n' < "$1" | sed -E '/^[[:space:]]*$/d; s#^.*[/\\]([^/\\]+\.spin2:[0-9]+:)#\1#; s/[[:space:]]+$//'
}

# ---- Compare, check sources, summarize --------------------------------------

mapfile -t NEW_GOLDS < <(find "$NEW_TEST" -type f -name '*.GOLD' | sort)

UNCHANGED=0
declare -a CHANGED_FILES=()
declare -a COSMETIC_FILES=()
declare -a NEW_FILES=()
declare -a REFUSED=()
declare -a TO_COPY=()

for new in "${NEW_GOLDS[@]}"; do
    rel="${new#"$NEW_TEST"/}"
    dir="$(dirname "$rel")"
    name="$(basename "$rel")"
    base="${name%.*.GOLD}"
    src_new="$NEW_TEST/$dir/$base.spin2"
    src_tree="TEST/$dir/$base.spin2"
    if [[ ! -f "$src_tree" ]]; then
        REFUSED+=("$rel: TEST/$dir/$base.spin2 does not exist in the tree")
        continue
    fi
    if [[ ! -f "$src_new" ]]; then
        REFUSED+=("$rel: no $base.spin2 beside it in the returned folder")
        continue
    fi
    if ! cmp -s "$src_new" "$src_tree"; then
        REFUSED+=("$rel: $base.spin2 differs from the tree's (the run used other sources)")
        continue
    fi
    existing="TEST/$rel"
    if [[ -f "$existing" ]]; then
        if cmp -s "$new" "$existing"; then
            UNCHANGED=$((UNCHANGED + 1))
            continue
        fi
        if [[ "$name" == *.errout.GOLD ]] && cmp -s <(errout_text "$new") <(errout_text "$existing"); then
            COSMETIC_FILES+=("$rel")
        else
            CHANGED_FILES+=("$rel")
        fi
    else
        NEW_FILES+=("$rel")
    fi
    TO_COPY+=("$rel")
done

SUMMARY_FILE="$NEW_TEST/gold-run-summary.txt"
HAVE_SUMMARY=0
[[ -f "$SUMMARY_FILE" ]] && HAVE_SUMMARY=1

# Missing: a GOLD the tree has for a fixture the run compiled, which came back
# without it. With a summary, "compiled" means listed there and not SKIPPED; a
# run limited to a few files (the dry run) then reports only those. Without one,
# every fixture of a suite with a rebuild-gold.ps1 counts.
declare -A OUTCOME=()
if [[ $HAVE_SUMMARY -eq 1 ]]; then
    while read -r outcome where _; do
        [[ "$where" == *.spin2 ]] || continue
        where="${where//\\//}"
        OUTCOME["${where%.spin2}"]="$outcome"
    done < <(tr -d '\r' < "$SUMMARY_FILE" | sed '1s/^\xEF\xBB\xBF//')
fi

mapfile -t EXISTING_GOLDS < <(find TEST -name '*.GOLD' -not -path '*-rebuild-v*' | sort)
declare -a MISSING_FILES=()
for old in "${EXISTING_GOLDS[@]}"; do
    rel="${old#TEST/}"
    [[ -f "$NEW_TEST/$rel" ]] && continue
    dir="$(dirname "$rel")"
    name="$(basename "$rel")"
    key="$dir/${name%.*.GOLD}"
    if [[ $HAVE_SUMMARY -eq 1 ]]; then
        if [[ -n "${OUTCOME[$key]+set}" && "${OUTCOME[$key]}" != "SKIPPED" ]]; then
            MISSING_FILES+=("$rel  (${OUTCOME[$key]})")
        fi
    elif [[ -f "TEST/$dir/rebuild-gold.ps1" ]]; then
        MISSING_FILES+=("$rel")
    fi
done

# ---- Report -----------------------------------------------------------------

list() {  # list <title> <limit> items...
    local title="$1" limit="$2"; shift 2
    [[ $# -eq 0 ]] && return 0
    echo "$title"
    local n=0
    for f in "$@"; do
        n=$((n + 1))
        if [[ $n -gt $limit ]]; then echo "  ... ($(( $# - limit )) more)"; break; fi
        echo "  $f"
    done
    echo ""
}

echo ""
echo "=========================================="
echo "Regold apply summary"
echo "=========================================="
echo "Returned from:     $INPUT"
echo "GOLDs unchanged:   $UNCHANGED"
echo "GOLDs changed:     ${#CHANGED_FILES[@]}"
echo "GOLDs path/EOL:    ${#COSMETIC_FILES[@]}  (errout GOLDs differing only in the machine path or line endings)"
echo "GOLDs new:         ${#NEW_FILES[@]}"
echo "GOLDs missing:     ${#MISSING_FILES[@]}  (the tree has one; the run compiled the fixture but returned none)"
echo "GOLDs refused:     ${#REFUSED[@]}"
if [[ $HAVE_SUMMARY -eq 1 ]]; then
    echo "Run summary:       $(tail -n 1 "$SUMMARY_FILE" | tr -d '\r')"
else
    echo "Run summary:       (none returned)"
fi
echo ""

list "Changed GOLDs:" 50 "${CHANGED_FILES[@]}"
list "Path/EOL-only errout GOLDs:" 50 "${COSMETIC_FILES[@]}"
list "New GOLDs:" 50 "${NEW_FILES[@]}"
list "WARNING: GOLDs not regenerated (see the run summary for why):" 50 "${MISSING_FILES[@]}"

if [[ ${#REFUSED[@]} -gt 0 ]]; then
    list "REFUSED (source beside the GOLD is not the tree's):" 1000 "${REFUSED[@]}"
    echo "Nothing copied: rebuild the folder from the current tree and rerun on Windows."
    exit 1
fi

# ---- Apply or stop ----------------------------------------------------------

if [[ $DRY_RUN -eq 1 ]]; then
    echo "Dry run — no files copied."
    exit 0
fi

if [[ ${#TO_COPY[@]} -eq 0 && $HAVE_SUMMARY -eq 0 ]]; then
    echo "Nothing to copy."
    exit 0
fi

if [[ $YES -eq 0 ]]; then
    echo "Copy ${#TO_COPY[@]} GOLD(s) and the run summary into TEST/? [y/N] "
    read -r CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        echo "Aborted. Nothing copied."
        exit 0
    fi
fi

for rel in "${TO_COPY[@]}"; do
    mkdir -p "$(dirname "TEST/$rel")"
    cp "$NEW_TEST/$rel" "TEST/$rel"
done
if [[ $HAVE_SUMMARY -eq 1 ]]; then
    cp "$SUMMARY_FILE" TEST/gold-run-summary.txt
fi

echo ""
echo "Copied ${#TO_COPY[@]} GOLD(s) into TEST/$( [[ $HAVE_SUMMARY -eq 1 ]] && echo ', and TEST/gold-run-summary.txt' )."
echo ""
echo "Run 'git status' and 'git diff --stat' to review."
git status -- TEST/ | head -30
