#!/usr/bin/env bash
set -euo pipefail

# Store apps cannot be installed unattended for a signed-in user, so this opens the Store page
# rather than pretending to have installed anything.
echo "Copilot is distributed through the Microsoft Store, which cannot be driven unattended."
echo "Opening its Store page — press Get/Install there to reinstall it."
powershell.exe -NoProfile -Command "Start-Process 'ms-windows-store://pdp/?ProductId=9NHT9RB2F4HD'" 2>/dev/null || true
