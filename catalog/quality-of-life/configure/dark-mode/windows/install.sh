#!/usr/bin/env bash
set -euo pipefail

# Both values: AppsUseLightTheme controls applications, SystemUsesLightTheme controls the taskbar
# and Start menu. Setting only one leaves the desktop visibly half-switched.
powershell.exe -NoProfile -Command \
  "Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name AppsUseLightTheme -Type DWord -Value 0; \
   Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name SystemUsesLightTheme -Type DWord -Value 0"
