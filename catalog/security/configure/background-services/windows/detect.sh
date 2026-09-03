#!/usr/bin/env bash
# Exit 0 = every listed service is disabled or absent, 1 = at least one still starts.
powershell.exe -NoProfile -Command "
  foreach (\$n in @('DiagTrack','RetailDemo')) {
    \$svc = Get-Service -Name \$n -ErrorAction SilentlyContinue
    if (\$svc) {
      \$start = (Get-CimInstance Win32_Service -Filter \"Name='\$n'\").StartMode
      if (\$start -ne 'Disabled') { exit 1 }
    }
  }
  exit 0" 2>/dev/null
