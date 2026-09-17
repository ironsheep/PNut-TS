<#
.SYNOPSIS
    Shared engine for all per-suite rebuild-gold.ps1 scripts.

.DESCRIPTION
    Each per-suite rebuild-gold.ps1 is a thin wrapper that dot-sources this file
    and calls Invoke-RebuildGold with its suite-specific data.

    Behaviors handled here so per-suite scripts stay tiny:
      - PNut binary path resolution (auto-find at standard install location)
      - Cleanup of prior outputs and GOLDs
      - File-loop with per-file/per-pattern flag overrides
      - Error.txt parsing and reporting
      - Output-extension rename to .GOLD (lst, obj, bin, flash, ...)
      - Skip list for files we deliberately omit from Windows regen

    Does NOT capture errout GOLDs from Error.txt. Errout GOLDs are pnut-ts-derived
    by convention and live in EXCEPT-tests; that workflow is separate.

.NOTES
    Compatible with Windows PowerShell 5.1 (default on Windows). No PS7-only
    cmdlets, no module dependencies, no JSON parsing.
#>

function Invoke-RebuildGold {
    param(
        # Compiler selection
        [int]$PNutVersion = 55,
        [string]$PNutInstallRoot = "C:\Program Files (x86)\Parallax Inc",
        [string]$PNutBinary = "",

        # Per-suite rules
        [string]$DefaultFlag = "-c",
        [string[]]$Produces = @("lst", "obj", "bin"),
        [hashtable]$PerFileFlag = @{},
        [hashtable]$PerFilePatternFlag = @{},
        [string[]]$Skip = @()
    )

    # ---- Resolve PNut binary -----------------------------------------------
    # We need the HEADLESS PNut: PNut_shell.bat (no version suffix) inside the
    # versioned install dir PNut_v${N}\. NOT the GUI editor (PNut_v${N}.exe),
    # which is interactive and ignores -c/-cd. Version selection happens by
    # which install directory we invoke PNut_shell.bat from.

    if (-not $PNutBinary) {
        $shellPath = Join-Path $PNutInstallRoot "PNut_v${PNutVersion}\PNut_shell.bat"
        if (Test-Path $shellPath) {
            $PNutBinary = $shellPath
        } elseif (Get-Command "PNut_shell.bat" -ErrorAction SilentlyContinue) {
                        $PNutBinary = "PNut_shell.bat"
        } else {
            Write-Error @"
PNut_shell.bat (v${PNutVersion}) not found.
  Looked at: $shellPath
  Also tried on PATH: PNut_shell.bat
NOTE: We need the headless variant (PNut_shell.bat inside the PNut_v${PNutVersion}\
      install dir), not the GUI editor (PNut_v${PNutVersion}.exe). The GUI does
      not produce .lst/.obj/.bin output from the command line.
"@
            return
        }
    }

    if ($PNutBinary -match "[\\/]" -and -not (Test-Path $PNutBinary)) {
        Write-Error "PNut binary not found at: $PNutBinary"
        return
    }

    Write-Output ""
    Write-Output "=== Suite: $($PWD.Path) ==="
    Write-Output "    Compiler:     $PNutBinary"
    Write-Output "    Default flag: $DefaultFlag"
    Write-Output "    Produces:     $($Produces -join ', ')"
    if ($PerFileFlag.Count -gt 0) {
        Write-Output "    Per-file overrides: $($PerFileFlag.Count) file(s)"
    }
    if ($PerFilePatternFlag.Count -gt 0) {
        Write-Output "    Per-pattern overrides: $($PerFilePatternFlag.Count) pattern(s)"
    }
    if ($Skip.Count -gt 0) {
        Write-Output "    Skip:         $($Skip -join ', ')"
    }

    # ---- Cleanup prior outputs and prior GOLDs -----------------------------
    # We clean the GOLDs we're about to regenerate so a partial run leaves a
    # half-state visible (missing GOLDs) rather than mixing old + new.

    $cleanupGlobs = @("*__pre.spin2", "*-pre.spin2", "Error.txt")
    foreach ($ext in $Produces) {
        $cleanupGlobs += "*.$ext"
        $cleanupGlobs += "*.$ext.GOLD"
    }
    Remove-Item -Force -ErrorAction SilentlyContinue $cleanupGlobs

    # ---- Process each .spin2 -----------------------------------------------

    $stats = @{ ok = 0; failed = 0; skipped = 0 }

    Get-ChildItem -Filter *.spin2 | Sort-Object Name | ForEach-Object {
        $fileName = $_.Name
        $baseName = $_.BaseName

        # Skip preprocessor outputs (defensive — cleanup already removed them)
        if ($fileName -like "*__pre.spin2" -or $fileName -like "*-pre.spin2") {
            return
        }

        # Skip explicitly listed files
        if ($Skip -contains $fileName) {
            Write-Output "  $fileName -> SKIPPED (explicit)"
            $stats.skipped++
            return
        }

        # Resolve flag for this file (exact-match first, then pattern)
        $flag = $DefaultFlag
        $flagSource = "default"
        if ($PerFileFlag.ContainsKey($fileName)) {
            $flag = $PerFileFlag[$fileName]
            $flagSource = "per-file"
        } else {
            foreach ($pattern in $PerFilePatternFlag.Keys) {
                if ($fileName -like $pattern) {
                    $flag = $PerFilePatternFlag[$pattern]
                    $flagSource = "pattern '$pattern'"
                    break
                }
            }
        }

        # Compile
        & $PNutBinary $flag $fileName > $null 2>&1

        # Parse Error.txt
        $compileOk = $true
        $errorMessage = ""
        if (Test-Path Error.txt) {
            $content = (Get-Content Error.txt -Raw).Trim()
            if ($content -ne "okay" -and $content -ne "") {
                $compileOk = $false
                $errorMessage = $content
            }
        }

        if (-not $compileOk) {
            Write-Output "  $fileName ($flag) -> ERROR: $errorMessage"
            $stats.failed++
            return
        }

        # Brief sleep — Windows PNut sometimes holds output handles briefly,
        # and Dropbox/OneDrive/AV scanners can grab fresh files for a moment.
        # 300ms matches the long-standing legacy convention; retry covers the
        # case where the initial sleep wasn't enough.
        Start-Sleep -Milliseconds 300

        # Rename produced outputs to .GOLD (with retry for file-lock races).
        $renamedExts = @()
        $renameErrors = @()
        foreach ($ext in $Produces) {
            $src = "$baseName.$ext"
            if (-not (Test-Path $src)) { continue }

            $renamed = $false
            $attempts = 0
            $maxAttempts = 6  # total wait on failure: 200+400+800+1600+3200 = 6.2s
            $delay = 200
            while (-not $renamed -and $attempts -lt $maxAttempts) {
                try {
                    Rename-Item $src "$src.GOLD" -Force -ErrorAction Stop
                    $renamed = $true
                } catch [System.IO.IOException] {
                    $attempts++
                    if ($attempts -ge $maxAttempts) {
                        $renameErrors += "${ext}: $($_.Exception.Message)"
                    } else {
                        Start-Sleep -Milliseconds $delay
                        $delay *= 2
                    }
                }
            }
            if ($renamed) { $renamedExts += $ext }
        }

        if ($renameErrors.Count -gt 0) {
            Write-Output "  $fileName ($flag) -> PARTIAL: renamed [$($renamedExts -join ',')], FAILED [$($renameErrors -join '; ')]"
            $stats.failed++
        } elseif ($renamedExts.Count -gt 0) {
            Write-Output "  $fileName ($flag) -> .$($renamedExts -join '.GOLD .').GOLD"
            $stats.ok++
        } else {
            Write-Output "  $fileName ($flag) -> compiled but produced none of: $($Produces -join ',')"
            $stats.failed++
        }
    }

    Write-Output "    Summary: ok=$($stats.ok) failed=$($stats.failed) skipped=$($stats.skipped)"
    return $stats
}
