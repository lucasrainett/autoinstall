#!/usr/bin/env bash
set -euo pipefail

# Best-effort: reads the uninstall command Helium's own installer registered (the standard way
# any registered Windows app is uninstalled) since there's no winget package to uninstall
# through instead. Unverified against a real Windows Helium install — flagged rather than
# assumed correct, same as this entry's detect.sh.
UNINSTALL_CMD=$(
  # MSYS_NO_PATHCONV, because this runs under Git Bash: an argument that looks like a POSIX path is
  # rewritten to a Windows one before the native program sees it, so /s becomes something like
  # C:/Program Files/Git/s. reg.exe answered "ERROR: Invalid syntax", VLC's uninstaller took /S as a
  # path and silently did nothing while still exiting 0, and Helium's installer ignored
  # /silent /install the same way. The switch is passed through unchanged with this set.
  MSYS_NO_PATHCONV=1 reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Helium" 2>/dev/null \
    | grep "UninstallString" | head -1 | sed -E 's/.*REG_SZ +//'
)
if [ -n "$UNINSTALL_CMD" ]; then
  eval "$UNINSTALL_CMD --force-uninstall"
fi
