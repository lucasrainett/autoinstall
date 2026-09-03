#!/usr/bin/env bash
set -euo pipefail

# 1 is what Windows ships. Written back explicitly rather than deleted: an absent value here is
# treated as enabled anyway, but being explicit makes the state readable.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power'
  Set-ItemProperty -Path \$k -Name HiberbootEnabled -Value 1 -Type DWord"

echo "Fast Startup re-enabled."
