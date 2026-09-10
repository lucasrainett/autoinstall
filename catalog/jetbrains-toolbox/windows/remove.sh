#!/usr/bin/env bash
set -uo pipefail

# Toolbox's uninstall ran past the ten-minute harness cap and was killed, wedging the Windows
# installer lock for the four entries that followed it in the same shard.
#
# JetBrains ships an NSIS uninstaller at %LOCALAPPDATA%\JetBrains\Toolbox\bin\Uninstall.exe and
# documents /S for silent removal. Note it may still open a browser tab at
# jetbrains.com/toolbox-app/uninstall — harmless here, but it is why this is bounded.
# https://toolbox-support.jetbrains.com/hc/en-us/articles/115001313270
# Git Bash ships coreutils, so `timeout` is normally there. This must not die without it, or
# nothing would be uninstalled at all; the harness cap still applies, we just lose the ability to
# stop short of it.
bounded() {
  if command -v timeout >/dev/null 2>&1; then timeout 240 "$@"; else "$@"; fi
}

bounded winget uninstall --id JetBrains.Toolbox -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

TOOLBOX="${LOCALAPPDATA:-$HOME/AppData/Local}/JetBrains/Toolbox"
if [ -f "$TOOLBOX/bin/Uninstall.exe" ]; then
  echo "winget left JetBrains Toolbox in place; running its own uninstaller."
  # MSYS_NO_PATHCONV, because this runs under Git Bash: an argument that looks like a POSIX path is
  # rewritten to a Windows one before the native program sees it, so /s becomes something like
  # C:/Program Files/Git/s. reg.exe answered "ERROR: Invalid syntax", VLC's uninstaller took /S as a
  # path and silently did nothing while still exiting 0, and Helium's installer ignored
  # /silent /install the same way. The switch is passed through unchanged with this set.
  MSYS_NO_PATHCONV=1 bounded "$TOOLBOX/bin/Uninstall.exe" /S
  echo "  uninstaller exit code: $?"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -f "$TOOLBOX/bin/Uninstall.exe" ] || break
    sleep 2
  done
fi

if [ -f "$TOOLBOX/bin/Uninstall.exe" ]; then
  echo "JetBrains Toolbox is still installed after both winget and its own uninstaller." >&2
  exit 1
fi
