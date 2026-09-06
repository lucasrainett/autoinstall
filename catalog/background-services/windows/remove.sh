#!/usr/bin/env bash
set -euo pipefail

# Automatic is what Windows ships for both of these.
powershell.exe -NoProfile -Command "
  foreach (\$n in @('DiagTrack','RetailDemo')) {
    \$svc = Get-Service -Name \$n -ErrorAction SilentlyContinue
    if (\$svc) { Set-Service -Name \$n -StartupType Automatic }
  }"

echo "Background services restored."
