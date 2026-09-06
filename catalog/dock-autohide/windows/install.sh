#!/usr/bin/env bash
set -euo pipefail

# Only bit 0 of byte 8 is touched; the rest of the blob holds taskbar position and size, which are
# the user's and must survive.
powershell.exe -NoProfile -Command "
  \$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3'
  \$v = (Get-ItemProperty -Path \$p -Name Settings).Settings
  \$v[8] = \$v[8] -bor 1
  Set-ItemProperty -Path \$p -Name Settings -Value \$v
  Stop-Process -Name explorer -Force"

echo "Taskbar set to auto-hide."
