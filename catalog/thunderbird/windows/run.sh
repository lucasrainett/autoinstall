#!/usr/bin/env bash
# Starts the application. Optional operation: an entry without one simply cannot be started from
# the tool, which is the honest answer for a command-line utility with nothing to open.
#
# Resolved at run time through Get-StartApps rather than hardcoding a path. Windows installers put
# executables in Program Files, %LOCALAPPDATA%, or a versioned subdirectory of either, and Store
# apps have no path at all — only an AppID. Get-StartApps is the one list that covers both, and it
# is what the Start menu itself searches, so a match here is a thing the user could have clicked.
#
# UNVERIFIED against a real Windows install: the display name is this entry's name, which is
# usually but not always what the Start menu shows.
set -euo pipefail

powershell.exe -NoProfile -Command "
  \$app = Get-StartApps | Where-Object { \$_.Name -eq 'Thunderbird' } | Select-Object -First 1
  if (-not \$app) { \$app = Get-StartApps | Where-Object { \$_.Name -like 'Thunderbird*' } | Select-Object -First 1 }
  if (-not \$app) { Write-Error 'Not found in the Start menu: Thunderbird'; exit 1 }
  Start-Process ('shell:AppsFolder\' + \$app.AppID)
"
