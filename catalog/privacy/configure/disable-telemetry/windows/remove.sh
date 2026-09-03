#!/usr/bin/env bash
set -euo pipefail

# Removes the policy value entirely rather than writing a different number: absence is what
# "unmanaged" means to Windows, so the machine returns to its edition default instead of being
# pinned to a level this tool chose.
powershell.exe -NoProfile -Command \
  "Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -ErrorAction SilentlyContinue"

powershell.exe -NoProfile -Command \
  "Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Application Experience\\' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null; \
   Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null"
