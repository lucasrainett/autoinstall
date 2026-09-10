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

# Test-Path before New-Item, because -Force on a registry key that already exists does not merely
# ensure it. Microsoft documents that the key and all its properties and values are overwritten
# with an empty key. In a loop writing several values to one key, each pass wiped what the pass
# before it had written and only the last survived: location-services, search-web-results and
# windows-recall all reported applied and then failed detection for exactly this reason, while the
# entries writing one value per key were unaffected -- which is what made the pattern visible.
powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer'; n='DisableSearchBoxSuggestions'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Search'; n='AllowCortana'; v=0}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Search'; n='ConnectedSearchUseWeb'; v=0})) {
    if (-not (Test-Path \$e.k)) { New-Item -Path \$e.k -Force | Out-Null }
    Set-ItemProperty -Path \$e.k -Name \$e.n -Value \$e.v -Type DWord -Force
  }"

echo "Remove web results from Start search: applied."
