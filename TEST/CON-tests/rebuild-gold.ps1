<#
.SYNOPSIS
    Regenerate GOLDs for CON-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj, bin
      - Patterns:     (none)
      - Per-file:     (none)
      - Skip:         1 file(s), listed in -Skip below
      - Expect fail:  (none)

    Sourced from: src/tests/CON-tests/pnut-ts-con.test.ts (glob *.spin2).

    NOTE: CON-tests/symbol_length_test.errout.GOLD is an orphan artifact
    (no test reads it; pnut-ts produces no matching content). Not regenerated
    here. Safe to delete separately as cleanup.
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
        -Skip @(
            # fixtures.json row acc_beyond_pnut_expression_depth is goldSource pnut-ts
            "gen_acc_beyond_pnut_expression_depth.spin2"
        )
}
finally {
    Pop-Location
}
