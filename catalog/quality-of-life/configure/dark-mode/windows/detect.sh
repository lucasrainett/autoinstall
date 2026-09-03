#!/usr/bin/env bash
# Exit 0 = dark mode active, 1 = light. Runs under Git Bash, so the registry read goes through
# powershell.exe.
powershell.exe -NoProfile -Command \
  "$v = (Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name AppsUseLightTheme -ErrorAction SilentlyContinue).AppsUseLightTheme; if (\$v -eq 0) { exit 0 } else { exit 1 }" 2>/dev/null
