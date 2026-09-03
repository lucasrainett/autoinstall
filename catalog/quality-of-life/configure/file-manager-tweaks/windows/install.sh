#!/usr/bin/env bash
set -euo pipefail

# Hidden = 1 shows hidden files; HideFileExt = 0 shows extensions, which is the setting that makes
# a "document.pdf.exe" visible for what it is.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'
  Set-ItemProperty -Path \$k -Name Hidden -Value 1 -Type DWord
  Set-ItemProperty -Path \$k -Name HideFileExt -Value 0 -Type DWord
  Stop-Process -Name explorer -Force"

echo "File Explorer defaults applied."
