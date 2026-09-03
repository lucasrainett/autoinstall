#!/usr/bin/env bash
# Exit 0 = auto-hide is on, 1 = not.
#
# The setting lives in byte 8 of a binary blob; bit 0 is the auto-hide flag. Reading the whole
# value and testing that bit is the only way to ask — there is no named DWORD for it.
powershell.exe -NoProfile -Command "
  \$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3'
  \$v = (Get-ItemProperty -Path \$p -Name Settings -ErrorAction SilentlyContinue).Settings
  if (\$v -and (\$v[8] -band 1)) { exit 0 } else { exit 1 }" 2>/dev/null
