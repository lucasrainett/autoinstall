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

# Removes the policy value entirely rather than writing a different number: absence is what
# "unmanaged" means to Windows, so the machine returns to its edition default instead of being
# pinned to a level this tool chose.
powershell.exe -NoProfile -Command \
  "Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -ErrorAction SilentlyContinue"

powershell.exe -NoProfile -Command \
  "Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Application Experience\\' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null; \
   Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null"
