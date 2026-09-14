#!/usr/bin/env bash
set -uo pipefail

# Deliberately the reverse order of the other fallbacks: Add/Remove Programs first, winget second.
#
# `winget uninstall` for this package hangs at "Starting package uninstall..." and never returns.
# Git Bash cannot signal a native Windows process, so the harness's only option is to kill it, and
# a winget killed mid-uninstall leaves the Windows installer lock held — which then costs every
# entry behind it in the same shard. In the run that exposed this it took thunderbird and volta
# outright, and made minecraft's uninstall fail with 1618, ERROR_INSTALL_ALREADY_RUNNING.
#
# Running the vendor's own uninstaller first means winget has nothing left to do and returns
# immediately. An earlier attempt guessed the uninstaller path and guessed wrong; this reads it
# from the registry, which is where the previous eight fallbacks got theirs.
powershell.exe -NoProfile -Command "
  \$roots = @(
    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
  \$app = Get-ItemProperty \$roots -ErrorAction SilentlyContinue |
          Where-Object { \$_.DisplayName -like 'System Informer*' } | Select-Object -First 1
  if (-not \$app) { Write-Host 'Not registered in Add/Remove Programs.'; exit 0 }
  \$cmd = \$app.QuietUninstallString
  if (-not \$cmd) { \$cmd = \$app.UninstallString }
  if (-not \$cmd) { Write-Host 'That entry names no uninstaller.'; exit 0 }
  Write-Host \"Running: \$cmd\"
  if (\$cmd -match '^\"([^\"]+)\"\s*(.*)\$') { \$exe = \$Matches[1]; \$rest = \$Matches[2] }
  else { \$exe = \$cmd; \$rest = '' }
  \$switches = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART')
  if (\$rest) { \$switches = \$switches + \$rest.Split(' ') }
  \$proc = Start-Process \$exe -ArgumentList \$switches -PassThru
  if (-not \$proc.WaitForExit(240000)) {
    \$proc.Kill()
    Write-Host 'The vendor uninstaller did not finish in four minutes; stopped it.'
  }"

# Now winget, which should find nothing left to do and return at once.
winget uninstall --id WinsiderSS.SystemInformer -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true
