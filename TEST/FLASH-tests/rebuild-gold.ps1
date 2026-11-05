<#
.SYNOPSIS
    Regenerate GOLDs for FLASH-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -ci
      - Produces:     lst, obj, bin, flash
      - Patterns:     (none)
      - Per-file:     (none)
      - Skip:         (none)
      - Expect fail:  (none)

    Sourced from: src/tests/FLASH-tests/pnut-ts-flash.test.ts (glob *.spin2).
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
        -DefaultFlag "-ci" `
        -Produces @("lst", "obj", "bin", "flash")
}
finally {
    Pop-Location
}
