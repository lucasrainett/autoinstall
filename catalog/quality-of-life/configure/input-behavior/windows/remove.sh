#!/usr/bin/env bash
set -euo pipefail

# Windows' shipped defaults: delay step 1, repeat rate 31 is the default too, so only the delay
# actually differs — both are written back explicitly rather than deleted, because an absent value
# is not the same as the default here.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Control Panel\\Keyboard'
  Set-ItemProperty -Path \$k -Name KeyboardDelay -Value '1'
  Set-ItemProperty -Path \$k -Name KeyboardSpeed -Value '31'"

echo "Keyboard repeat reset to Windows defaults."
