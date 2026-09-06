#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command \
  "Set-NetFirewallProfile -All -Enabled False"
