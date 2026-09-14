#!/usr/bin/env bash
set -uo pipefail

# MSYS_NO_PATHCONV, because this runs under Git Bash: an argument that looks like a POSIX path is
# rewritten to a Windows one before the native program sees it, so /s becomes something like
# C:/Program Files/Git/s and reg.exe answers "ERROR: Invalid syntax".
UNINSTALL_CMD=$(
  MSYS_NO_PATHCONV=1 reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Helium" 2>/dev/null \
    | grep "UninstallString" | head -1 | sed -E 's/.*REG_SZ +//'
)

if [ -z "$UNINSTALL_CMD" ]; then
  echo "Helium is not registered in Add/Remove Programs; nothing to remove."
  exit 0
fi

eval "$UNINSTALL_CMD --force-uninstall"
rc=$?

# 19 is not a failure. Helium is built on Chromium, whose setup.exe answers 19 — UNINSTALL_SUCCESSFUL
# — after removing the application; Chrome itself behaves the same way and it is a well-known trap
# for anyone driving it from a script. Treating it as an error reported a removal that had in fact
# happened as a failure. 0 and 19 both mean done; anything else is reported as itself.
case "$rc" in
  0 | 19) ;;
  *)
    echo "Helium's uninstaller returned $rc." >&2
    exit "$rc"
    ;;
esac

# Verified rather than assumed, because the exit code alone has already misled us once here.
if MSYS_NO_PATHCONV=1 reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Helium" 2>/dev/null | grep -q "DisplayName"; then
  echo "Helium is still registered in Add/Remove Programs after the uninstall." >&2
  exit 1
fi
