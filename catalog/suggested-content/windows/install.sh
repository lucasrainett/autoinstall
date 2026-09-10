#!/usr/bin/env bash
set -euo pipefail

# HKCU only: this is a preference for the signed-in user, not a machine policy, so it needs no
# elevation and cannot affect anyone else's account.
# Test-Path before New-Item, because -Force on a registry key that already exists does not merely
# ensure it. Microsoft documents that the key and all its properties and values are overwritten
# with an empty key. In a loop writing several values to one key, each pass wiped what the pass
# before it had written and only the last survived: location-services, search-web-results and
# windows-recall all reported applied and then failed detection for exactly this reason, while the
# entries writing one value per key were unaffected -- which is what made the pattern visible.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
  if (-not (Test-Path \$k)) { New-Item -Path \$k -Force | Out-Null }
  foreach (\$n in @('SilentInstalledAppsEnabled','SystemPaneSuggestionsEnabled','SubscribedContent-338388Enabled','SoftLandingEnabled')) {
    Set-ItemProperty -Path \$k -Name \$n -Value 0 -Type DWord -Force
  }"
