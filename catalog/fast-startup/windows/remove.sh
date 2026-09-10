#!/usr/bin/env bash
set -euo pipefail

# Same guard as install.sh: reverting these settings writes to HKLM or scheduled tasks, and an
# unelevated shell fails partway, leaving the machine half-reverted. Declining (exit 3) leaves it
# consistently as it was.
if ! powershell.exe -NoProfile -Command \
  "\$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); \
   if (\$admin) { exit 0 } else { exit 1 }" 2>/dev/null
then
  echo "Reverting this needs an elevated shell. Run the tool as administrator." >&2
  echo "Nothing was changed." >&2
  exit 3
fi

# 1 is what Windows ships. Written back explicitly rather than deleted: an absent value here is
# treated as enabled anyway, but being explicit makes the state readable.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power'
  Set-ItemProperty -Path \$k -Name HiberbootEnabled -Value 1 -Type DWord"

echo "Fast Startup re-enabled."
