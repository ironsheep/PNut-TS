<#
.SYNOPSIS
    Regenerate GOLDs for EXT-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj
      - Patterns:     (none)
      - Per-file:     (none)
      - Skip:         (none)
      - Expect fail:  (none)

    Sourced from: src/tests/EXT-tests/pnut-ts-ext.test.ts (glob *.spin2; the
    test filters out *v44*, which are pnut-ts-only).
    Produces lst and obj only: interpreter sources do not produce a .bin.

    NOTE: EXT-tests includes Spin2_interpreter.spin2 and Spin2_debugger.spin2 —
    re-compiling these under v55 verifies the v55 interpreter source itself
    round-trips through the v55 compiler. High-value canary for ABI releases.
#>
param(
    [int]$PNutVersion = 55,
    [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
    [string]$PNutBinary = ""
)

. (Join-Path $PSScriptRoot "..\..\scripts\gold\rebuild-gold-lib.ps1")

Push-Location $PSScriptRoot
try {
    Invoke-RebuildGold `
        -PNutVersion $PNutVersion `
        -PNutInstallRoot $PNutInstallRoot `
        -PNutBinary $PNutBinary `
        -DefaultFlag "-c" `
        -Produces @("lst", "obj")
}
finally {
    Pop-Location
}
