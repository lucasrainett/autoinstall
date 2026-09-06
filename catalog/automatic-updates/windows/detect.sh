#!/usr/bin/env bash
# Exit 0 = automatic updating is on, 1 = not.
#
# NoAutoUpdate=1 under the WindowsUpdate policy key is the only way updates are actually switched
# off on a consumer machine; its absence means Windows Update is doing its normal job.
powershell.exe -NoProfile -Command "
  \$k = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU'
  \$v = (Get-ItemProperty -Path \$k -Name NoAutoUpdate -ErrorAction SilentlyContinue).NoAutoUpdate
  if (\$v -eq 1) { exit 1 } else { exit 0 }" 2>/dev/null
