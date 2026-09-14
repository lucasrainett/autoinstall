#!/usr/bin/env bash
set -uo pipefail

# System Informer's uninstaller is its own setup tool, registered in Add/Remove Programs as
# "systeminformer-setup.exe -uninstall". Run that way it opens the uninstall wizard and waits for a
# click. The evidence run showed it twice over: given Inno Setup switches it ignored them and sat
# for the full four minutes, and `winget uninstall`, which runs the same registered command, then
# hung until the harness killed it — leaving the Windows installer lock held for everything after.
#
# The tool's own source, tools/CustomSetupTool/main.c in winsiderss/systeminformer, parses
# -uninstall and -silent ("silent" being an alias of "unattended", which skips every dialog). So the
# registered command is run with -silent added, and winget is only asked afterwards, bounded, to
# clear its record once there is nothing left for it to hang on.
powershell.exe -NoProfile -Command "
  \$roots = @(
    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
  \$app = Get-ItemProperty \$roots -ErrorAction SilentlyContinue |
          Where-Object { \$_.DisplayName -like 'System Informer*' } | Select-Object -First 1
  if (-not \$app) { Write-Host 'Not registered in Add/Remove Programs.'; exit 0 }
  if (\$app.UninstallString -notmatch '^\"([^\"]+)\"') { Write-Host 'Unrecognised uninstall command.'; exit 1 }
  \$exe = \$Matches[1]
  Write-Host \"Running: \$exe -silent -uninstall\"
  \$proc = Start-Process \$exe -ArgumentList '-silent', '-uninstall' -PassThru
  \$deadline = (Get-Date).AddSeconds(240)
  while ((Test-Path \$app.PSPath) -and ((Get-Date) -lt \$deadline)) { Start-Sleep -Seconds 3 }
  if (Test-Path \$app.PSPath) {
    if (-not \$proc.HasExited) { \$proc.Kill() }
    Write-Host 'Still registered after four minutes; the uninstall did not complete.'
    exit 1
  }
  Write-Host 'Uninstalled; Add/Remove Programs no longer lists it.'"
ps_rc=$?

if [ "$ps_rc" -ne 0 ]; then
  # Deliberately not falling back to winget: it runs the same wizard and would hang on it.
  echo "System Informer is still installed; not calling winget, whose uninstall hangs on the wizard." >&2
  exit 1
fi

# Bounded, in case winget still finds something to run.
timeout 60 winget uninstall --id WinsiderSS.SystemInformer -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true
