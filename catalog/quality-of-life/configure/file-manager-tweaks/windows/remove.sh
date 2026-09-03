#!/usr/bin/env bash
set -euo pipefail

# Windows' shipped defaults: hidden files concealed, extensions concealed.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'
  Set-ItemProperty -Path \$k -Name Hidden -Value 2 -Type DWord
  Set-ItemProperty -Path \$k -Name HideFileExt -Value 1 -Type DWord
  Stop-Process -Name explorer -Force"

echo "File Explorer defaults reset."
