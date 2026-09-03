#!/usr/bin/env bash
set -euo pipefail

WALLPAPER=$(cygpath -w "$(cd "$(dirname "$0")/.." && pwd)/wallpaper.png")

# The registry value alone does nothing until sign-out; SystemParametersInfo is what makes Windows
# reload the desktop immediately.
powershell.exe -NoProfile -Command "
  Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallPaper -Value '$WALLPAPER'
  Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class W { [DllImport(\"user32.dll\", CharSet=CharSet.Auto)] public static extern int SystemParametersInfo(int a,int b,string c,int d); }'
  [W]::SystemParametersInfo(20, 0, '$WALLPAPER', 3) | Out-Null"

echo "Wallpaper set."
