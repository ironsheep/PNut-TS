<#
.SYNOPSIS
    Regenerate GOLDs for INCLUDE-tests/flattened using Windows PNut.

.DESCRIPTION
    Windows PNut has no #include. Each file here is the hand-flattened twin of
    a #include test in ..\ ; the GOLDs made here are compared against what
    PNut-TS produces from the #include version.
      - Glob:    *.spin2
      - Default: -c (no debug)
      - No per-file overrides
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
        -DefaultFlag "-c"
}
finally {
    Pop-Location
}
