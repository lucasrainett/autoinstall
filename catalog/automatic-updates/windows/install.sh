#!/usr/bin/env bash
set -euo pipefail

# Windows updates automatically out of the box, so this entry's job is to *undo* a policy that
# turned it off rather than to switch something on. Writing NoAutoUpdate=0 rather than deleting the
# key: an explicit "yes" survives a later policy refresh that a missing value would not.
#
# Machine-wide policy under HKLM, so this needs an elevated shell.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU'
  New-Item -Path \$k -Force | Out-Null
  Set-ItemProperty -Path \$k -Name NoAutoUpdate -Value 0 -Type DWord
  Start-Service -Name wuauserv -ErrorAction SilentlyContinue
  Set-Service  -Name wuauserv -StartupType Automatic -ErrorAction SilentlyContinue"

echo "Automatic Windows updates enabled."
