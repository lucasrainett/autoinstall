#!/usr/bin/env bash
set -euo pipefail

# Declines rather than half-applies when not elevated. On Windows these settings live under HKLM or
# in scheduled tasks, and without administrator rights PowerShell fails partway through with
# "PermissionDenied ... HRESULT 0x80070005" — some changes made, some not. Seen on a CI runner,
# but the same thing happens in any non-elevated shell.
if ! powershell.exe -NoProfile -Command \
  "\$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); \
   if (\$admin) { exit 0 } else { exit 1 }" 2>/dev/null
then
  echo "This entry changes machine-wide settings and needs an elevated shell." >&2
  echo "Run the tool as administrator. Nothing was changed." >&2
  exit 3
fi

powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors'; n='DisableLocation'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors'; n='DisableLocationScripting'; v=1})) {
    New-Item -Path \$e.k -Force | Out-Null
    Set-ItemProperty -Path \$e.k -Name \$e.n -Value \$e.v -Type DWord -Force
  }"

echo "Disable location services: applied."
