Four jobs. Each folder is flat: sources, the files they pull in, files.txt,
build.ps1.

On Windows, in each folder:

    powershell -ExecutionPolicy Bypass -File build.ps1

It compiles each line of files.txt and renames the output to .GOLD.
Zip the folder, send it back, I take it from there.

Default is bare "PNut_shell.bat" from PATH. If yours is named/located differently:

    powershell -ExecutionPolicy Bypass -File build.ps1 -Pnut PNut_shell.bat

  COV-tests  25 files   coverage_qlog_qexp has no GOLD at all (decides #74)
  TOF         9 files   5 GOLDs missed the v55 regen (punch 6.4)
  BLDC       12 files   3 GOLDs missed the v55 regen
  WUMMI       3 files   FG1/Main/Mustererkennung only - their GOLDs are dated
                        2025-07-09/11 while the other 46 are 2026-05-13, so
                        they missed the v55 regen too. WUMMI's whole directory
                        is gitignored, so I only touch those three.
