#!/usr/bin/env bash
# Exit 0 = DoH auto-upgrade is on, 1 = not (or unsupported on this build).
powershell.exe -NoProfile -Command "
  if (-not (Get-Command Get-DnsClientDohServerAddress -ErrorAction SilentlyContinue)) { exit 1 }
  \$k = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters'
  \$v = (Get-ItemProperty -Path \$k -Name EnableAutoDoh -ErrorAction SilentlyContinue).EnableAutoDoh
  if (\$v -eq 2) { exit 0 } else { exit 1 }" 2>/dev/null
