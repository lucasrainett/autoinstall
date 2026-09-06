#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power'
  Set-ItemProperty -Path \$k -Name HiberbootEnabled -Value 0 -Type DWord"

echo "Fast Startup disabled. Shutdown is now a real shutdown."
