#!/usr/bin/env bash
set -euo pipefail

# New-ItemProperty -Force rather than Set-ItemProperty: the Personalize key does not exist on a
# fresh Windows profile, and Set-ItemProperty fails outright on a missing key rather than creating
# it. The install then reported failure with no output, and detect afterwards correctly said the
# setting had not been applied. -Force creates the key and overwrites an existing value.
powershell.exe -NoProfile -Command \
  "\$key = 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'; \
   if (-not (Test-Path \$key)) { New-Item -Path \$key -Force | Out-Null }; \
   New-ItemProperty -Path \$key -Name AppsUseLightTheme   -PropertyType DWord -Value 0 -Force | Out-Null; \
   New-ItemProperty -Path \$key -Name SystemUsesLightTheme -PropertyType DWord -Value 0 -Force | Out-Null"
