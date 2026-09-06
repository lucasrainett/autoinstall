#!/usr/bin/env bash
set -euo pipefail

# HKCU only: this is a preference for the signed-in user, not a machine policy, so it needs no
# elevation and cannot affect anyone else's account.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
  New-Item -Path \$k -Force | Out-Null
  foreach (\$n in @('SilentInstalledAppsEnabled','SystemPaneSuggestionsEnabled','SubscribedContent-338388Enabled','SoftLandingEnabled')) {
    Set-ItemProperty -Path \$k -Name \$n -Value 0 -Type DWord -Force
  }"
