# Compile every source listed in files.txt and rename the output to .GOLD.
#
#   powershell -ExecutionPolicy Bypass -File build.ps1
#   powershell -ExecutionPolicy Bypass -File build.ps1 -Pnut "D:\somewhere\PNut_shell.bat"
#
# files.txt holds one job per line:   <flag> <source>
#   -c  coverage_001.spin2
#   -cd debug_test_002.spin2
#
# This file is identical in every job folder. Only files.txt differs.

param(
    [string]$Pnut = "PNut_shell.bat"
)

Set-Location $PSScriptRoot

# Get-Command resolves a bare name on PATH (.bat, .cmd or .exe) and a full
# path alike, so -Pnut takes either form.
if (-not (Get-Command $Pnut -ErrorAction SilentlyContinue)) {
    Write-Host "Cannot find: $Pnut"
    Write-Host "Re-run with the right name or path, e.g.:"
    Write-Host "  -Pnut PNut_shell.bat"
    Write-Host "  -Pnut 'C:\path\to\PNut_shell.bat'"
    exit 1
}

$ok = 0
$bad = 0
$locked = 0

foreach ($line in Get-Content files.txt) {
    $line = $line.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { continue }

    $parts = $line.Split(" ")
    $flag = $parts[0]
    $file = $parts[1]

    & $Pnut $flag $file > $null 2>&1

    $err = ""
    if (Test-Path Error.txt) { $err = (Get-Content Error.txt -Raw).Trim() }
    if ($err -ne "" -and $err -ne "okay") {
        Write-Host ("FAIL  {0} {1}  --  {2}" -f $flag, $file, $err)
        $bad = $bad + 1
        continue
    }

    Start-Sleep -Milliseconds 300

    # Retry the rename: Dropbox/OneDrive and AV scanners hold a freshly written
    # file open for a moment, and PNut itself can too. 10 tries x 500ms.
    $base = [System.IO.Path]::GetFileNameWithoutExtension($file)
    foreach ($ext in @("lst", "obj", "bin")) {
        if (-not (Test-Path "$base.$ext")) { continue }
        $tries = 0
        while ($true) {
            try {
                Move-Item "$base.$ext" "$base.$ext.GOLD" -Force -ErrorAction Stop
                break
            } catch {
                $tries = $tries + 1
                if ($tries -ge 10) {
                    Write-Host ("LOCK  {0}.{1} still locked - not renamed" -f $base, $ext)
                    $locked = $locked + 1
                    break
                }
                Start-Sleep -Milliseconds 500
            }
        }
    }

    Write-Host ("ok    {0} {1}" -f $flag, $file)
    $ok = $ok + 1
}

Write-Host ""
Write-Host "done: $ok ok, $bad failed, $locked not renamed"
if ($locked -gt 0) {
    Write-Host "Some files stayed locked. If this folder is inside Dropbox or"
    Write-Host "OneDrive, copy it somewhere local and re-run - that is the usual"
    Write-Host "cause. Re-running is safe; it just recompiles."
}
Write-Host "Zip this folder and send it back."
