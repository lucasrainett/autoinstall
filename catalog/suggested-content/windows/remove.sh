#!/usr/bin/env bash
set -euo pipefail

# Restores Windows' own default (enabled) rather than deleting the values, so the result is a
# state Windows recognises instead of an absent key whose meaning depends on the build.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
  New-Item -Path \$k -Force | Out-Null
  foreach (\$n in @('SilentInstalledAppsEnabled','SystemPaneSuggestionsEnabled','SubscribedContent-338388Enabled','SoftLandingEnabled')) {
    Set-ItemProperty -Path \$k -Name \$n -Value 1 -Type DWord -Force
  }"
