#!/usr/bin/env bash
set -euo pipefail

# Removes for the current user only. Deliberately not -AllUsers: that needs an elevated shell and
# affects other people's accounts on a shared machine, which is a much larger change than "I don't
# want this on my desktop".
powershell.exe -NoProfile -Command "
  foreach (\$n in @('Microsoft.MicrosoftStickyNotes')) {
    Get-AppxPackage -Name \$n | Remove-AppxPackage -ErrorAction SilentlyContinue
  }"
