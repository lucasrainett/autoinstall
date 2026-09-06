#!/usr/bin/env bash
# Exit 0 = configured as this entry wants, 1 = not.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Control Panel\\Keyboard'
  \$d = (Get-ItemProperty -Path \$k -Name KeyboardDelay -ErrorAction SilentlyContinue).KeyboardDelay
  \$s = (Get-ItemProperty -Path \$k -Name KeyboardSpeed -ErrorAction SilentlyContinue).KeyboardSpeed
  if (\$d -eq '0' -and \$s -eq '31') { exit 0 } else { exit 1 }" 2>/dev/null
