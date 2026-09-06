#!/usr/bin/env bash
set -euo pipefail

# Enables all three profiles. Existing rules are untouched, matching the other platforms.
powershell.exe -NoProfile -Command \
  "Set-NetFirewallProfile -All -Enabled True"
