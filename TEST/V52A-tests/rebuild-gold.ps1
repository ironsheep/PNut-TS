<#
.SYNOPSIS
    Regenerate GOLDs for V52A-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj, bin
      - Patterns:     *debug* -> -cd
      - Per-file:     (none)
      - Skip:         (none)
      - Expect fail:  (none)

    Sourced from: src/tests/V52A-tests/pnut-ts-v52a.test.ts (glob *.spin2,
    filters out *__pre.spin2). The pattern is the test's rule: files whose name
    contains "debug" (case-insensitive substring) get -cd.

    NOTE on drift: the legacy V52A-rebuild-v52/rebuild-gold.ps1 used -cd for
    every file. The .test.ts substring rule (which the user has designated as
    the source of truth) excludes 14 of 17 files from debug. If the existing
    GOLDs were generated with -cd everywhere, regenerating under this rule
    will produce different output for those 14 files. That diff is expected
    and corrects the prior drift.
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
        -PerFilePatternFlag @{
            # PowerShell -like is case-insensitive, so one entry covers
            # 'debug', 'Debug', 'DEBUG', etc. (PS hashtable keys are also
            # case-insensitive — multiple casings would parse-error.)
            "*debug*" = "-cd"
        }
}
finally {
    Pop-Location
}
