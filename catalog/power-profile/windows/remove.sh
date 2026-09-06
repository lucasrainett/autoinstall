#!/usr/bin/env bash
set -euo pipefail

# SCHEME_BALANCED — what Windows ships as the default on every machine.
powershell.exe -NoProfile -Command "
  powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e" 2>/dev/null || true

echo "Power scheme set back to Balanced."
