#!/usr/bin/env bash
set -euo pipefail

# DiagTrack is the Connected User Experiences and Telemetry service; RetailDemo exists only for
# shop-floor display machines. Both are safe to disable on a personal machine and neither is a
# dependency of anything a user interacts with.
powershell.exe -NoProfile -Command "
  foreach (\$n in @('DiagTrack','RetailDemo')) {
    \$svc = Get-Service -Name \$n -ErrorAction SilentlyContinue
    if (\$svc) {
      Stop-Service -Name \$n -Force -ErrorAction SilentlyContinue
      Set-Service -Name \$n -StartupType Disabled
    }
  }"

echo "Background services reduced."
