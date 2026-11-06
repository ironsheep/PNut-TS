<#
.SYNOPSIS
    Regenerate GOLDs for SPIN-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj, bin
      - Patterns:     (none)
      - Per-file:     (none)
      - Skip:         2 file(s), listed in -Skip below
      - Expect fail:  (none)

    Sourced from: src/tests/SPIN-tests/pnut-ts-spin.test.ts (glob *.spin2).
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
            # fixtures.json row acc_beyond_pnut_block_stack is goldSource pnut-ts
            "gen_acc_beyond_pnut_block_stack.spin2"
            # fixtures.json row acc_beyond_pnut_nested_blocks is goldSource pnut-ts
            "gen_acc_beyond_pnut_nested_blocks.spin2"
        )
}
finally {
    Pop-Location
}
