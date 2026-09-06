#!/usr/bin/env bash
# Exit 0 = firewall on for every profile, 1 = off for at least one.
# Runs under Git Bash, so the Windows-native query goes through powershell.exe.
powershell.exe -NoProfile -Command \
  "if ((Get-NetFirewallProfile -All).Enabled -contains \$false) { exit 1 } else { exit 0 }" 2>/dev/null
