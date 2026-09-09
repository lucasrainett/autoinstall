#!/usr/bin/env bash
set -euo pipefail

# winget alone does not remove VLC, and says it did.
#
# Proven on a Windows runner: `winget uninstall --id VideoLAN.VLC --purge --silent` prints
# "Successfully uninstalled" and exits 0, yet afterwards `winget list` still shows the package
# *and* C:\Program Files\VideoLAN still exists. VLC ships an NSIS uninstaller that does not honour
# the switches winget passes it, so winget reports what it asked for rather than what happened.
#
# So: ask winget first — it is the right tool when it works, and it keeps the package database
# consistent — then check, and fall back to VLC's own uninstaller with the /S switch NSIS
# documents for silent removal.
winget uninstall --id VideoLAN.VLC -e --accept-source-agreements --purge --silent || true

# `winget list` reads Add/Remove Programs, so it can lag; the directory is the fact on disk.
for dir in "/c/Program Files/VideoLAN/VLC" "/c/Program Files (x86)/VideoLAN/VLC"; do
  [ -d "$dir" ] || continue
  uninstaller="$dir/uninstall.exe"
  if [ -x "$uninstaller" ]; then
    echo "winget left VLC in place; running its own uninstaller."
    # NSIS returns immediately, so wait for the directory to actually go rather than assuming.
    "$uninstaller" /S || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      [ -d "$dir" ] || break
      sleep 2
    done
  fi
done

if [ -d "/c/Program Files/VideoLAN/VLC" ] || [ -d "/c/Program Files (x86)/VideoLAN/VLC" ]; then
  echo "VLC is still installed after both winget and its own uninstaller." >&2
  exit 1
fi
