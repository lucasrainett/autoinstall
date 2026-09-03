#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization'; n='DODownloadMode'; v=0})) {
    New-Item -Path \$e.k -Force | Out-Null
    Set-ItemProperty -Path \$e.k -Name \$e.n -Value \$e.v -Type DWord -Force
  }"

echo "Disable update sharing: applied."
