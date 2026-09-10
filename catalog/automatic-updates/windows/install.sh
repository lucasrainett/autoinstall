#!/usr/bin/env bash
set -euo pipefail

# Windows updates automatically out of the box, so this entry's job is to *undo* a policy that
# turned it off rather than to switch something on. Writing NoAutoUpdate=0 rather than deleting the
# key: an explicit "yes" survives a later policy refresh that a missing value would not.
#
# Machine-wide policy under HKLM, so this needs an elevated shell.
# Test-Path before New-Item, because -Force on a registry key that already exists does not merely
# ensure it. Microsoft documents that the key and all its properties and values are overwritten
# with an empty key. In a loop writing several values to one key, each pass wiped what the pass
# before it had written and only the last survived: location-services, search-web-results and
# windows-recall all reported applied and then failed detection for exactly this reason, while the
# entries writing one value per key were unaffected -- which is what made the pattern visible.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU'
  if (-not (Test-Path \$k)) { New-Item -Path \$k -Force | Out-Null }
  Set-ItemProperty -Path \$k -Name NoAutoUpdate -Value 0 -Type DWord
  Start-Service -Name wuauserv -ErrorAction SilentlyContinue
  Set-Service  -Name wuauserv -StartupType Automatic -ErrorAction SilentlyContinue"

echo "Automatic Windows updates enabled."
