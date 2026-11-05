<#
.SYNOPSIS
    Regenerate GOLDs for LARGE-tests/OctoSerial using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj, bin
      - Patterns:     demo_octo* -> -cd
      - Per-file:     (none)
      - Skip:         (none)
      - Expect fail:  (none)

    Sourced from: src/tests/LARGE-tests/pnut-ts-large.test.ts (OctoSerial subset;
    glob *.spin2 in this subdir). Matches legacy LARGE-OctoSerial-rebuild-v52.
#>
param(
    [int]$PNutVersion = 55,
    [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
    [string]$PNutBinary = ""
)

. (Join-Path $PSScriptRoot "..\..\..\scripts\gold\rebuild-gold-lib.ps1")

Push-Location $PSScriptRoot
try {
    Invoke-RebuildGold `
        -PNutVersion $PNutVersion `
        -PNutInstallRoot $PNutInstallRoot `
        -PNutBinary $PNutBinary `
        -DefaultFlag "-c" `
        -PerFilePatternFlag @{
            "demo_octo*" = "-cd"
        }
}
finally {
    Pop-Location
}
