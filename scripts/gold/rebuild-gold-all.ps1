<#
.SYNOPSIS
    Top-level driver: regenerate GOLD files for every Windows-regen test suite.

.DESCRIPTION
    Discovers every TEST/<dir>/rebuild-gold.ps1 (and TEST/LARGE-tests/<sub>/rebuild-gold.ps1)
    and runs each one in turn, passing through the version parameter.

    Each per-suite script is responsible for its own cd into the correct dir,
    its own flag/pattern logic, and its own Invoke-RebuildGold call.

.PARAMETER PNutVersion
    PNut compiler version to use. Default 55.
    Resolves to the HEADLESS CLI:
    C:\Program Files (x86)\Parallax Inc\PNut_v<NN>\PNut_shell.bat
    (fallback: bare PNut_shell on PATH). Version is selected by which
    install dir hosts PNut_shell.bat — the binary itself has no version
    suffix. The GUI editor PNut_v<NN>.exe is *not* used — it's interactive
    and produces no command-line output.

.PARAMETER PNutInstallRoot
    Install-root override (rare).

.PARAMETER PNutBinary
    Explicit binary path override (rare — for testing dev builds).

.PARAMETER Suites
    Optional filter — only run suites whose path contains any of these strings.
    Example: -Suites OBJ-tests,COV-tests

.PARAMETER RepoRoot
    PNut-TS repo root. Default: script's grandparent.

.EXAMPLE
    .\rebuild-gold-all.ps1
    # Regenerates every Windows-regen GOLD using PNut_shell.bat from the v55 install.

.EXAMPLE
    .\rebuild-gold-all.ps1 -PNutVersion 52
    # Round-trip sanity check: regen against v52, output should match
    # the existing checked-in GOLDs byte-for-byte.

.EXAMPLE
    .\rebuild-gold-all.ps1 -Suites OBJ-tests,DBG-tests
    # Only regen those two suites.
#>

param(
    [int]$PNutVersion = 55,
    [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
    [string]$PNutBinary = "",
    [string[]]$Suites = @(),
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$testRoot = Join-Path $RepoRoot "TEST"
if (-not (Test-Path $testRoot)) {
    Write-Error "TEST directory not found at: $testRoot"
    exit 1
}

# Discover per-suite rebuild-gold.ps1 files (recursive — picks up LARGE subdirs too).
# Exclude the legacy <SUITE>-rebuild-v52/ scaffolding directories.
$suiteScripts = Get-ChildItem -Path $testRoot -Filter rebuild-gold.ps1 -Recurse `
    | Where-Object { $_.Directory.Name -notmatch '-rebuild-v\d' } `
    | Sort-Object FullName

if ($Suites.Count -gt 0) {
    $suiteScripts = $suiteScripts | Where-Object {
        $path = $_.FullName
        $matched = $false
        foreach ($s in $Suites) {
            if ($path -like "*$s*") { $matched = $true; break }
        }
        $matched
    }
}

if ($suiteScripts.Count -eq 0) {
    Write-Warning "No rebuild-gold.ps1 scripts matched."
    exit 0
}

Write-Output "Regenerating GOLDs for $($suiteScripts.Count) suite(s) using PNut v${PNutVersion}"
Write-Output ""

$totalOk = 0
$totalFailed = 0
$totalSkipped = 0

foreach ($script in $suiteScripts) {
    & $script.FullName `
        -PNutVersion $PNutVersion `
        -PNutInstallRoot $PNutInstallRoot `
        -PNutBinary $PNutBinary
    # Per-suite scripts print their own summary; we just tally.
    # (Per-suite Invoke-RebuildGold returns its $stats hashtable, but the call
    #  context here doesn't need to capture it — the user-facing output is
    #  already streamed.)
}

Write-Output ""
Write-Output "=========================================="
Write-Output "All suites complete."
Write-Output "=========================================="
