#!/usr/bin/env bash
set -euo pipefail

# AllowTelemetry=0 ("Security") is honoured fully on Enterprise/Education; Home and Pro clamp it
# to the "Required" level. Setting it is still the correct, documented minimum for the edition —
# it is not silently ineffective, it is bounded by the edition.
powershell.exe -NoProfile -Command \
  "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force | Out-Null; \
   Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -Type DWord -Value 0"

# The scheduled tasks that gather and upload the data.
powershell.exe -NoProfile -Command \
  "Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Application Experience\\' -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null; \
   Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null"
