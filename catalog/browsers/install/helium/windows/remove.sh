#!/usr/bin/env bash
set -euo pipefail

# Best-effort: reads the uninstall command Helium's own installer registered (the standard way
# any registered Windows app is uninstalled) since there's no winget package to uninstall
# through instead. Unverified against a real Windows Helium install — flagged rather than
# assumed correct, same as this entry's detect.sh.
UNINSTALL_CMD=$(
  reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Helium" 2>/dev/null \
    | grep "UninstallString" | head -1 | sed -E 's/.*REG_SZ +//'
)
if [ -n "$UNINSTALL_CMD" ]; then
  eval "$UNINSTALL_CMD --force-uninstall"
fi
