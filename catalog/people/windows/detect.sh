#!/usr/bin/env bash
# Exit 0 = installed for this user, 1 = not installed.
# Runs under Git Bash, so the Appx query goes through powershell.exe.
powershell.exe -NoProfile -Command "
  foreach (\$n in @('Microsoft.People')) {
    if (Get-AppxPackage -Name \$n) { exit 0 }
  }
  exit 1" 2>/dev/null
