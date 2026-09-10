#!/usr/bin/env bash
set -uo pipefail

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
winget uninstall --id VideoLAN.VLC -e --accept-source-agreements --disable-interactivity --purge --silent || true

# `winget list` reads Add/Remove Programs, so it can lag; the directory is the fact on disk.
for dir in "/c/Program Files/VideoLAN/VLC" "/c/Program Files (x86)/VideoLAN/VLC"; do
  [ -d "$dir" ] || continue
  echo "winget left VLC in place; falling back to its own uninstaller."
  ls -la "$dir" | head -20
  # VLC's NSIS uninstaller has been named both uninstall.exe and unins000.exe across versions, and
  # the exit code matters — a silent failure here is what sent this investigation in circles.
  uninstaller=""
  for candidate in "$dir/uninstall.exe" "$dir/unins000.exe" "$dir/Uninstall.exe"; do
    [ -f "$candidate" ] && { uninstaller="$candidate"; break; }
  done
  if [ -z "$uninstaller" ]; then
    echo "no uninstaller found in $dir" >&2
  else
    echo "running: $uninstaller /S"
    # MSYS_NO_PATHCONV, because this runs under Git Bash: an argument that looks like a POSIX path
    # is rewritten to a Windows one before the native program sees it, so /S becomes something like
    # C:/Program Files/Git/S. That is why this uninstaller exited 0 having removed nothing — it was
    # never given the silent switch at all.
    MSYS_NO_PATHCONV=1 "$uninstaller" /S; rc=$?
    echo "uninstaller exit code: $rc"
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      [ -d "$dir" ] || break
      sleep 2
    done
    echo "after waiting, $dir $([ -d "$dir" ] && echo 'still exists' || echo 'is gone')"
  fi
done

if [ -d "/c/Program Files/VideoLAN/VLC" ] || [ -d "/c/Program Files (x86)/VideoLAN/VLC" ]; then
  echo "VLC is still installed after both winget and its own uninstaller." >&2
  exit 1
fi
