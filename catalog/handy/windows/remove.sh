#!/usr/bin/env bash
set -uo pipefail

# winget reports "Successfully uninstalled" and leaves the application installed.
#
# Proven on a Windows runner: after the uninstall below returned success, Add/Remove Programs still
# held an entry for this package (checked across HKLM, WOW6432Node and HKCU) and in most cases the
# program directory was still on disk. Eight entries behaved this way in a single run. winget hands
# the vendor's uninstaller its own --silent, which most of them ignore, and then reports what it
# asked for rather than what happened.
#
# So: ask winget first, because it is the right tool when it works and it keeps winget's own record
# straight, then check Add/Remove Programs and run the uninstaller it names.
#
# The whole fallback runs in PowerShell rather than bash. It has to read the registry anyway, and
# it means the switches are passed natively — under Git Bash a bare /S is rewritten into a Windows
# path before the uninstaller ever sees it, which is its own silent no-op.
DISPLAY_NAME='Handy'

winget uninstall --id cjpais.Handy -e \
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
  # QuietUninstallString is the vendor's own unattended form where they provide one, and is always
  # preferable to guessing switches.
  \$cmd = \$app.QuietUninstallString
  if (-not \$cmd) { \$cmd = \$app.UninstallString }
  if (-not \$cmd) { Write-Host 'That entry names no uninstaller.'; exit 1 }

  # Bounded rather than -Wait. MSI Afterburner's uninstall sat there until the harness killed the
  # whole operation at ten minutes, and a winget killed mid-flight leaves the Windows installer
  # lock held, which costs every entry behind it in the same shard. Four minutes is generous for an
  # uninstall and still fails inside the harness cap, so the damage stops here.
  if (\$cmd -match 'MsiExec') {
    \$code = [regex]::Match(\$cmd, '\{[0-9A-Fa-f-]+\}').Value
    \$proc = Start-Process msiexec.exe -ArgumentList \"/X\$code\", '/qn', '/norestart' -PassThru
    if (-not \$proc.WaitForExit(240000)) {
      \$proc.Kill()
      Write-Host 'The MSI uninstall did not finish in four minutes; stopped it.'
      exit 1
    }
  } else {
    # Split the executable from any arguments the registry already carries.
    if (\$cmd -match '^\"([^\"]+)\"\s*(.*)$') { \$exe = \$Matches[1]; \$rest = \$Matches[2] }
    else { \$exe = \$cmd; \$rest = '' }
    # unins000.exe is Inno Setup, which wants /VERYSILENT; everything else here is NSIS, which
    # wants /S. Guessing wrong means a wizard nobody can click, so the two are distinguished.
    \$switches = @('/S')
    if (\$exe -match 'unins\d*\.exe\$') { \$switches = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART') }
    if (\$rest) { \$switches = \$switches + \$rest.Split(' ') }
    \$proc = Start-Process \$exe -ArgumentList \$switches -PassThru
    if (-not \$proc.WaitForExit(240000)) {
      \$proc.Kill()
      Write-Host 'The vendor uninstaller did not finish in four minutes; stopped it.'
      exit 1
    }
  }
  Write-Host 'Vendor uninstaller finished.'"
