#!/usr/bin/env bash
set -euo pipefail

# EnableAutoDoh=2 makes Windows upgrade to DNS-over-HTTPS for any configured resolver that is on
# its known-DoH list, leaving the choice of resolver alone. Needs an elevated shell: this is a
# machine-wide service parameter under HKLM.
# Test-Path before New-Item, because -Force on a registry key that already exists does not merely
# ensure it. Microsoft documents that the key and all its properties and values are overwritten
# with an empty key. In a loop writing several values to one key, each pass wiped what the pass
# before it had written and only the last survived: location-services, search-web-results and
# windows-recall all reported applied and then failed detection for exactly this reason, while the
# entries writing one value per key were unaffected -- which is what made the pattern visible.
powershell.exe -NoProfile -Command "
  if (-not (Get-Command Get-DnsClientDohServerAddress -ErrorAction SilentlyContinue)) {
    Write-Error 'This build of Windows has no DNS-over-HTTPS support.'
    exit 1
  }
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters'
  if (-not (Test-Path \$k)) { New-Item -Path \$k -Force | Out-Null }
  Set-ItemProperty -Path \$k -Name EnableAutoDoh -Value 2 -Type DWord"

echo "DNS-over-HTTPS auto-upgrade enabled for resolvers that support it."
