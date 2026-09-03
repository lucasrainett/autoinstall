#!/usr/bin/env bash
# Exit 0 = suggestions are off (configured), 1 = still on (not configured).
#
# Each value is checked, not just one: Windows spreads these across several names under the same
# key, and having disabled one of them is not the same as having disabled suggestions.
powershell.exe -NoProfile -Command "
  \$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager'
  \$names = @('SilentInstalledAppsEnabled','SystemPaneSuggestionsEnabled','SubscribedContent-338388Enabled','SoftLandingEnabled')
  foreach (\$n in \$names) {
    \$v = (Get-ItemProperty -Path \$k -Name \$n -ErrorAction SilentlyContinue).\$n
    if (\$v -ne 0) { exit 1 }
  }
  exit 0" 2>/dev/null
