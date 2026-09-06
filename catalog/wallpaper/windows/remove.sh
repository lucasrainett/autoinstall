#!/usr/bin/env bash
set -euo pipefail

# Windows' own stock image. Cleared through the same API so the change is visible at once.
DEFAULT='C:\Windows\Web\Wallpaper\Windows\img0.jpg'
powershell.exe -NoProfile -Command "
  Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallPaper -Value '$DEFAULT'
  Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class W2 { [DllImport(\"user32.dll\", CharSet=CharSet.Auto)] public static extern int SystemParametersInfo(int a,int b,string c,int d); }'
  [W2]::SystemParametersInfo(20, 0, '$DEFAULT', 3) | Out-Null"

echo "Wallpaper reset to the Windows default."
