#!/usr/bin/env bash
set -euo pipefail

# Duplicating the scheme first is what makes this work on machines where the built-in High
# performance plan is hidden: powercfg can activate it by GUID even when the Settings UI does not
# list it. A failure here means the firmware genuinely does not offer it.
powershell.exe -NoProfile -Command "
  \$guid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
  powercfg /duplicatescheme \$guid 2>&1 | Out-Null
  powercfg /setactive \$guid
  if (\$LASTEXITCODE -ne 0) {
    Write-Error 'This machine does not offer the High performance power scheme.'
    exit 1
  }"

echo "Power scheme set to High performance. On a laptop this costs battery life."
