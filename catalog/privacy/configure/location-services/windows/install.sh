#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors'; n='DisableLocation'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors'; n='DisableLocationScripting'; v=1})) {
    New-Item -Path \$e.k -Force | Out-Null
    Set-ItemProperty -Path \$e.k -Name \$e.n -Value \$e.v -Type DWord -Force
  }"

echo "Disable location services: applied."
