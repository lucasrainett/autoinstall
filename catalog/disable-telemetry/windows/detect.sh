#!/usr/bin/env bash
# Exit 0 = telemetry set to the minimum, 1 = not set.
# Runs under Git Bash, so the registry read goes through powershell.exe.
powershell.exe -NoProfile -Command \
  "$v = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -ErrorAction SilentlyContinue).AllowTelemetry; if (\$v -eq 0) { exit 0 } else { exit 1 }" 2>/dev/null
