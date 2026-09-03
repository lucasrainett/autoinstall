#!/usr/bin/env bash
set -euo pipefail

# KeyboardDelay 0 is the shortest of Windows' four delay steps; KeyboardSpeed 31 the fastest of
# its 32 repeat rates. Per-user under HKCU, so no elevation.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Control Panel\\Keyboard'
  Set-ItemProperty -Path \$k -Name KeyboardDelay -Value '0'
  Set-ItemProperty -Path \$k -Name KeyboardSpeed -Value '31'"

echo "Keyboard repeat configured. Takes effect at next sign-in."
