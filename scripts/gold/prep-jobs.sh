#!/usr/bin/env bash
#
# Build GoldPrep/<job>/ — a flat folder per job: sources, dependent files,
# files.txt, build.ps1. Then zip each folder for transfer.
#
# build.ps1 is copied verbatim from scripts/gold/win-build.ps1 and is the same
# in every folder. Only files.txt differs. Nothing here generates PowerShell.
#
# Flags mirror the per-suite rules in TEST/<suite>/rebuild-gold.ps1.
#
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="GoldPrep"

rm -rf "$OUT"
mkdir -p "$OUT"

# flag_for <job> <filename>
flag_for() {
  case "$1" in
    COV-tests)
      case "$2" in
        debug_*|isp_*|coverage_debug_*|coverage_clock_003.spin2) echo "-cd" ;;
        *) echo "-c" ;;
      esac ;;
    TOF)
      case "$2" in demo_180*) echo "-cd" ;; *) echo "-c" ;; esac ;;
    BLDC)  echo "-c" ;;
    WUMMI) echo "-cd" ;;
  esac
}

# make_job <job> <suite dir> [only basenames...]
make_job() {
  local job="$1" suite="$2"; shift 2
  local only=("$@")
  local dir="$OUT/$job"
  mkdir -p "$dir"

  # every source in the suite — children must be present to resolve
  find "$suite" -maxdepth 1 -name '*.spin2' \
       ! -name '*-pre.spin2' ! -name '*__pre.spin2' -exec cp {} "$dir/" \;

  # files named by FILE directives (p2font16, *.dat, Type1.bin ...) — without
  # these the compile fails on Windows
  local blobs=0
  while IFS= read -r b; do
    [[ -z "$b" ]] && continue
    if [[ -f "$suite/$b" ]]; then cp "$suite/$b" "$dir/"; blobs=$((blobs+1)); fi
  done < <(grep -hoiE '\bfile[[:space:]]+"[^"]+"' "$suite"/*.spin2 2>/dev/null \
           | sed -E 's/.*"([^"]+)".*/\1/' | sort -u)

  # files.txt — what to compile, and with which flag
  : > "$dir/files.txt"
  local n=0
  for f in $(cd "$dir" && ls *.spin2 | sort); do
    if [[ ${#only[@]} -gt 0 ]]; then
      local base="${f%.spin2}" keep=0
      for k in "${only[@]}"; do [[ "$base" == "$k" ]] && keep=1; done
      [[ $keep -eq 0 ]] && continue
    fi
    echo "$(flag_for "$job" "$f") $f" >> "$dir/files.txt"
    n=$((n+1))
  done

  cp scripts/gold/win-build.ps1 "$dir/build.ps1"
  ( cd "$OUT" && zip -qr "$job.zip" "$job" )
  printf "  %-10s %2d to compile, %d source(s), %d dependent file(s)\n" \
         "$job" "$n" "$(ls "$dir"/*.spin2 | wc -l)" "$blobs"
}

make_job COV-tests TEST/COV-tests
make_job TOF       TEST/LARGE-tests/TOF
make_job BLDC      TEST/LARGE-tests/BLDC-Motor-drv
make_job WUMMI     TEST/WUMMI-tests FG1 Main Mustererkennung

echo
cp scripts/gold/jobs-README.txt "$OUT/README.txt"

echo "Ready: $OUT/  (folders + zips)"
