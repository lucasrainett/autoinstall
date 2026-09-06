#!/usr/bin/env bash
set -euo pipefail

# 0 is Windows' own default (no automatic upgrade).
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters'
  if (Test-Path \$k) { Set-ItemProperty -Path \$k -Name EnableAutoDoh -Value 0 -Type DWord }"

echo "DNS-over-HTTPS auto-upgrade disabled."
