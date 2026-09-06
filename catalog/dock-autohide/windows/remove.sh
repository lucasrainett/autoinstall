#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command "
  \$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3'
  \$v = (Get-ItemProperty -Path \$p -Name Settings).Settings
  \$v[8] = \$v[8] -band 0xFE
  Set-ItemProperty -Path \$p -Name Settings -Value \$v
  Stop-Process -Name explorer -Force"

echo "Taskbar auto-hide turned off."
