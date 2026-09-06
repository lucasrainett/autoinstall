#!/usr/bin/env bash
set -euo pipefail

# EnableAutoDoh=2 makes Windows upgrade to DNS-over-HTTPS for any configured resolver that is on
# its known-DoH list, leaving the choice of resolver alone. Needs an elevated shell: this is a
# machine-wide service parameter under HKLM.
powershell.exe -NoProfile -Command "
  if (-not (Get-Command Get-DnsClientDohServerAddress -ErrorAction SilentlyContinue)) {
    Write-Error 'This build of Windows has no DNS-over-HTTPS support.'
    exit 1
  }
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters'
  New-Item -Path \$k -Force | Out-Null
  Set-ItemProperty -Path \$k -Name EnableAutoDoh -Value 2 -Type DWord"

echo "DNS-over-HTTPS auto-upgrade enabled for resolvers that support it."
