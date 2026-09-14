#!/usr/bin/env bash
set -uo pipefail

# winget reports "Successfully uninstalled" and leaves the application installed.
#
# Proven with before/after snapshots of the machine on a Windows runner: after the uninstall below
# returned success, the Add/Remove Programs entry and the program directory were both still there.
# winget hands the vendor's uninstaller its own --silent, which most of them ignore, and reports
# what it asked for rather than what happened.
#
# So: ask winget first, because it is the right tool when it works and it keeps winget's own record
# straight, then check Add/Remove Programs and run the uninstaller it names.
#
# The fallback runs in PowerShell rather than bash. It has to read the registry anyway, and it means
# switches are passed natively — under Git Bash a bare /S is rewritten into a Windows path before
# the uninstaller ever sees it, which is its own silent no-op.
DISPLAY_NAME='Zen Browser*'

winget uninstall --id Zen-Team.Zen-Browser -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

powershell.exe -NoProfile -Command "
  \$pattern = '$DISPLAY_NAME'
  \$roots = @(
    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
  \$app = Get-ItemProperty \$roots -ErrorAction SilentlyContinue |
          Where-Object { \$_.DisplayName -like \$pattern } | Select-Object -First 1
  if (-not \$app) { Write-Host 'Add/Remove Programs has no entry; the removal is complete.'; exit 0 }
  Write-Host \"winget left '\$(\$app.DisplayName)' registered; running its own uninstaller.\"

  if (\$app.QuietUninstallString) {
    # The vendor's own unattended command, run exactly as registered. Adding a switch to it is how
    # Proton Mail's Squirrel updater, registered as Update.exe --uninstall -s, was handed an NSIS /S.
    \$cmd = \$app.QuietUninstallString
    \$switches = @()
  } else {
    \$cmd = \$app.UninstallString
    if (-not \$cmd) { Write-Host 'That entry names no uninstaller.'; exit 1 }
    \$switches = @('/S')
  }

  if (\$cmd -match 'MsiExec') {
    \$code = [regex]::Match(\$cmd, '\{[0-9A-Fa-f-]+\}').Value
    \$exe = 'msiexec.exe'
    \$switches = @(\"/X\$code\", '/qn', '/norestart')
  } else {
    # Split the executable from any arguments the registry already carries.
    if (\$cmd -match '^\"([^\"]+)\"\s*(.*)\$') { \$exe = \$Matches[1]; \$rest = \$Matches[2] }
    else { \$exe = \$cmd; \$rest = '' }
    # unins000.exe is Inno Setup, which wants /VERYSILENT; the rest here are NSIS, which want /S.
    if (\$switches.Count -gt 0 -and \$exe -match 'unins\d*\.exe\$') {
      \$switches = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART')
    }
    if (\$rest) { \$switches = \$switches + \$rest.Split(' ') }
  }

  if (\$switches.Count -gt 0) { \$proc = Start-Process \$exe -ArgumentList \$switches -PassThru }
  else { \$proc = Start-Process \$exe -PassThru }

  # Wait for Add/Remove Programs to let go of the entry, not for the process. An NSIS uninstaller
  # copies itself to TEMP and relaunches, so the process started here exits at once: waiting on it
  # reported MSI Afterburner as finished while it was still fully installed, and the snapshots
  # taken half a minute later still showed its entry and directory. Bounded at four minutes, which
  # is generous for an uninstall and still fails inside the harness cap, so a stuck uninstaller
  # stops here rather than costing the entries behind it.
  \$deadline = (Get-Date).AddSeconds(240)
  while ((Test-Path \$app.PSPath) -and ((Get-Date) -lt \$deadline)) { Start-Sleep -Seconds 3 }
  if (Test-Path \$app.PSPath) {
    if (-not \$proc.HasExited) { \$proc.Kill() }
    Write-Host 'Still registered after four minutes; the vendor uninstaller did not complete.'
    exit 1
  }
  Write-Host 'Vendor uninstaller finished; Add/Remove Programs no longer lists it.'"
