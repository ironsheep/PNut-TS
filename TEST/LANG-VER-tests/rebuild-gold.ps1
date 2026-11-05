<#
.SYNOPSIS
    Regenerate GOLDs for LANG-VER-tests using Windows PNut.

.DESCRIPTION
    GENERATED FILE - DO NOT EDIT. Written by scripts/gold/gen-rebuild-scripts.js
    from scripts/gold/suites.json, scripts/fixtures/fixtures.json and this
    directory's .spin2 listing. Change those, then run: npm run gen-rebuild-scripts

    Rules:
      - Default flag: -cd
      - Produces:     lst, obj, bin
      - Patterns:     (none)
      - Per-file:     spin_builtin_math_v51.spin2 -> -c
      - Skip:         (none)
      - Expect fail:  (none)

    Sourced from: src/tests/LANG-VER-tests/pnut-ts-langVer.test.ts (glob
    *.spin2, filters out *__pre.spin2). Default -cd is the .test.ts default;
    the per-file -c entries are its noDebugFiles list.
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
        -DefaultFlag "-cd" `
        -PerFileFlag @{
            "spin_builtin_math_v51.spin2" = "-c"
        }
}
finally {
    Pop-Location
}
