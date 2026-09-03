#!/usr/bin/env bash
# Exit 0 = installed for this user, 1 = not installed.
# Runs under Git Bash, so the Appx query goes through powershell.exe.
powershell.exe -NoProfile -Command \
  "if (Get-AppxPackage -Name 'Microsoft.MixedReality.Portal') { exit 0 } else { exit 1 }" 2>/dev/null
