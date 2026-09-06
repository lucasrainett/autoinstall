#!/usr/bin/env bash
set -euo pipefail

# Removes this entry's policy value rather than setting NoAutoUpdate=1. Reverting must not leave
# the machine *worse* than it found it: unchecking "keep updates on" should restore Windows'
# default behaviour, not silently disable security updates.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU'
  if (Test-Path \$k) {
    Remove-ItemProperty -Path \$k -Name NoAutoUpdate -ErrorAction SilentlyContinue
  }"

echo "Removed this entry's update policy; Windows' own default applies again."
