#!/usr/bin/env bash
# Exit 0 = Fast Startup is off, 1 = still on.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power'
  \$v = (Get-ItemProperty -Path \$k -Name HiberbootEnabled -ErrorAction SilentlyContinue).HiberbootEnabled
  if (\$v -eq 0) { exit 0 } else { exit 1 }" 2>/dev/null
