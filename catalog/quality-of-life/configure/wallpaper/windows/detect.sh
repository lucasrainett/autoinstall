#!/usr/bin/env bash
# Exit 0 = our wallpaper is set, 1 = not.
# cygpath converts the Git Bash path to the Windows form the registry stores.
WALLPAPER=$(cygpath -w "$(cd "$(dirname "$0")/.." && pwd)/wallpaper.png" 2>/dev/null || echo "")
[ -n "$WALLPAPER" ] || exit 1
powershell.exe -NoProfile -Command "
  \$v = (Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallPaper -ErrorAction SilentlyContinue).WallPaper
  if (\$v -eq '$WALLPAPER') { exit 0 } else { exit 1 }" 2>/dev/null
