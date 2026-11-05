<#
.SYNOPSIS
    Top-level driver: regenerate GOLD files for every Windows-regen test suite.

.DESCRIPTION
    Discovers every TEST/<dir>/rebuild-gold.ps1 (and TEST/LARGE-tests/<sub>/rebuild-gold.ps1)
    and runs each one in turn, passing through the version parameter.

    Each per-suite script is responsible for its own cd into the correct dir,
    its own flag/pattern logic, and its own Invoke-RebuildGold call.

    At the end it writes a summary: one line per fixture with its outcome
    (CAPTURED, SKIPPED, COMPILED-BUT-EXPECTED-TO-FAIL,
    FAILED-BUT-EXPECTED-TO-COMPILE, NO-ERROR-TXT, TIMED-OUT, RENAME-FAILED,
    NO-OUTPUT), the counts per suite, and a last line VERDICT: PASS when every
    fixture is CAPTURED or SKIPPED. It exits 0 on PASS and 1 otherwise.

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
    Explicit binary path override (rare — for testing dev builds, or a stub
    that hangs, to exercise the timeout).

.PARAMETER Suites
    Optional filter — only run suites whose path contains any of these strings.
    Example: -Suites OBJ-tests,COV-tests

.PARAMETER RepoRoot
    PNut-TS repo root. Default: script's grandparent.

.PARAMETER Files
    Optional — compile only these file names (e.g. fvars_too_big.spin2) in the
    suites that run; every other file and its GOLDs are left alone. A name that
    no suite has is reported NOT-FOUND.

.PARAMETER CompileTimeoutSeconds
    Seconds one compile may take before its process tree is killed and the
    file is recorded TIMED-OUT. Default 60.

.PARAMETER SummaryPath
    Where the summary is written. Default: TEST\gold-run-summary.txt.

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

.EXAMPLE
    .\rebuild-gold-all.ps1 -Suites EXCEPT-tests -Files fvars_too_big.spin2 -PNutBinary C:\stub\hang.bat -CompileTimeoutSeconds 5
    # One file through a stub that never returns: expect TIMED-OUT.
#>

param(
    [int]$PNutVersion = 55,
    [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
    [string]$PNutBinary = "",
    [string[]]$Suites = @(),
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [string[]]$Files = @(),
    [int]$CompileTimeoutSeconds = 60,
    [string]$SummaryPath = ""
)

# Under "powershell -File", -Suites A,B arrives as the one string "A,B".
$Suites = @($Suites | ForEach-Object { $_ -split ',' } | Where-Object { $_ -ne "" })
$Files = @($Files | ForEach-Object { $_ -split ',' } | Where-Object { $_ -ne "" })

$testRoot = Join-Path $RepoRoot "TEST"
if (-not (Test-Path $testRoot)) {
    Write-Error "TEST directory not found at: $testRoot"
    exit 1
}
if (-not $SummaryPath) {
    $SummaryPath = Join-Path $testRoot "gold-run-summary.txt"
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
    exit 1
}

Write-Output "Regenerating GOLDs for $($suiteScripts.Count) suite(s) using PNut v${PNutVersion}"
Write-Output ""

# Run options reach Invoke-RebuildGold through the environment, so the
# generated per-suite wrappers need no extra parameters.
$savedTimeout = $env:PNUTTS_GOLD_TIMEOUT_SECONDS
$savedOnly = $env:PNUTTS_GOLD_ONLY
$env:PNUTTS_GOLD_TIMEOUT_SECONDS = "$CompileTimeoutSeconds"
$env:PNUTTS_GOLD_ONLY = ($Files -join ';')

$suiteRuns = New-Object System.Collections.ArrayList
try {
    foreach ($script in $suiteScripts) {
        $suiteName = $script.Directory.FullName
        if ($suiteName.StartsWith($testRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            $suiteName = $suiteName.Substring($testRoot.Length).TrimStart('\', '/')
        }
        # The per-suite output streams straight through; the $stats hashtable
        # Invoke-RebuildGold returns is kept for the summary instead of printed.
        $returned = New-Object System.Collections.ArrayList
        & $script.FullName `
            -PNutVersion $PNutVersion `
            -PNutInstallRoot $PNutInstallRoot `
            -PNutBinary $PNutBinary | ForEach-Object {
                if ($_ -is [hashtable] -and $_.ContainsKey("results")) {
                    [void]$returned.Add($_)
                } else {
                    $_
                }
            }
        $stats = $null
        if ($returned.Count -gt 0) { $stats = $returned[$returned.Count - 1] }
        [void]$suiteRuns.Add(@{ Name = $suiteName; Stats = $stats })
    }
}
finally {
    $env:PNUTTS_GOLD_TIMEOUT_SECONDS = $savedTimeout
    $env:PNUTTS_GOLD_ONLY = $savedOnly
}

# ---- Summary ---------------------------------------------------------------

$order = @("CAPTURED", "SKIPPED", "COMPILED-BUT-EXPECTED-TO-FAIL",
           "FAILED-BUT-EXPECTED-TO-COMPILE", "NO-ERROR-TXT", "TIMED-OUT",
           "RENAME-FAILED", "NO-OUTPUT")
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("PNut GOLD run  $(Get-Date -Format s)")
$lines.Add("PNut v${PNutVersion}   timeout ${CompileTimeoutSeconds} s per compile   compiler override: $PNutBinary")
if ($Files.Count -gt 0) { $lines.Add("Files: $($Files -join ', ')") }
$lines.Add("")

$bad = 0
$seen = @{}
foreach ($run in $suiteRuns) {
    if ($null -eq $run.Stats) {
        $lines.Add(("{0,-31} {1}  (the suite returned no results; see its output)" -f "NO-RESULT", $run.Name))
        $bad++
        continue
    }
    foreach ($r in $run.Stats.results) {
        $lines.Add(("{0,-31} {1}\{2}  ({3}, expect {4})  {5}" -f $r.Outcome, $run.Name, $r.File, $r.Flag, $r.Expect, $r.Detail))
        $seen[$r.File] = $true
        if ($r.Outcome -ne "CAPTURED" -and $r.Outcome -ne "SKIPPED") { $bad++ }
    }
}
foreach ($name in $Files) {
    if (-not $seen.ContainsKey($name)) {
        $lines.Add(("{0,-31} {1}  (no suite that ran has this file)" -f "NOT-FOUND", $name))
        $bad++
    }
}

$lines.Add("")
$lines.Add("Per suite:")
foreach ($run in $suiteRuns) {
    if ($null -eq $run.Stats) {
        $lines.Add(("  {0,-28} NO-RESULT" -f $run.Name))
        continue
    }
    $counts = @{}
    foreach ($r in $run.Stats.results) {
        if ($counts.ContainsKey($r.Outcome)) { $counts[$r.Outcome]++ } else { $counts[$r.Outcome] = 1 }
    }
    $parts = @()
    foreach ($o in $order) {
        if ($counts.ContainsKey($o)) { $parts += "$o=$($counts[$o])" }
    }
    if ($parts.Count -eq 0) { $parts = @("no files") }
    $lines.Add(("  {0,-28} {1}" -f $run.Name, ($parts -join '  ')))
}

$lines.Add("")
if ($bad -eq 0) {
    $lines.Add("VERDICT: PASS")
} else {
    $lines.Add("VERDICT: FAIL ($bad not as expected)")
}
$lines | Set-Content -LiteralPath $SummaryPath -Encoding UTF8

Write-Output ""
Write-Output "=========================================="
Write-Output "All suites complete. Summary: $SummaryPath"
Write-Output "=========================================="
foreach ($l in $lines) { Write-Output $l }

if ($bad -eq 0) { exit 0 } else { exit 1 }
