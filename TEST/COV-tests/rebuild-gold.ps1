<#
.SYNOPSIS
    Regenerate GOLDs for COV-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -c
      - Produces:     lst, obj, bin
      - Patterns:     debug_* -> -cd; isp_* -> -cd; coverage_debug_* -> -cd
      - Per-file:     coverage_clock_003.spin2 -> -cd
      - Skip:         (none)
      - Expect fail:  (none)

    Sourced from: src/tests/COV-tests/pnut-ts-cov.test.ts (glob *.spin2, filters
    out *__pre.spin2). The pattern overrides are the test's
    {debug_,isp_,coverage_debug_}* rule. coverage_clock_003.spin2 uses debug()
    but does not match the prefix pattern (from the existing v52 .ps1).

    NOTE: coverage_003_v44.spin2 does NOT get -cd here (it has no debug() call
    and does not match any -cd pattern above, so it falls through to the
    -DefaultFlag "-c"). Its committed v55 GOLD (153de2f) was built -c: no DEBUG
    data/records section, 332 OBJ bytes. The .test.ts previously passed pnut-ts
    flag -44 (force compile-as-v44) for this file; that flag has never existed
    in pnut-ts (version forcing is source-tag-only, via {Spin2_vNN}, which this
    file has never carried) and was removed as dead test code 2026-09-17. See
    Test-Suite-Punch-List.md §6.6.
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
            "debug_*"          = "-cd"
            "isp_*"            = "-cd"
            "coverage_debug_*" = "-cd"
        } `
        -PerFileFlag @{
            "coverage_clock_003.spin2" = "-cd"
        }
}
finally {
    Pop-Location
}
