<#
.SYNOPSIS
    Regenerate GOLDs for COV-tests using Windows PNut.

.DESCRIPTION
    Sourced from: src/tests/COV-tests/pnut-ts-cov.test.ts
      - Glob:    *.spin2 (filters out *__pre.spin2)
      - Rule:    files matching {debug_,isp_,coverage_debug_}* -> -cd
                 all others -> -c

    Per-file extra (from existing v52 .ps1 — files that use debug() but don't
    match the prefix pattern):
      - coverage_clock_003.spin2  -> -cd

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
