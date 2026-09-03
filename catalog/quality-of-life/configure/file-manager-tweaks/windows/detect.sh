#!/usr/bin/env bash
# Exit 0 = configured as this entry wants, 1 = not.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'
  \$hidden = (Get-ItemProperty -Path \$k -Name Hidden -ErrorAction SilentlyContinue).Hidden
  \$ext    = (Get-ItemProperty -Path \$k -Name HideFileExt -ErrorAction SilentlyContinue).HideFileExt
  if (\$hidden -eq 1 -and \$ext -eq 0) { exit 0 } else { exit 1 }" 2>/dev/null
