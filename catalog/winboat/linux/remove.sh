#!/usr/bin/env bash
set -euo pipefail

# WinBoat installs either as a deb or as an AppImage integrated through Gear Lever, so removal has
# to cover both. The AppImage half previously passed the literal string "winboat" to Gear Lever,
# which expects a path — so it removed nothing and reported success.
if dpkg-query -W -f='${Status}' winboat 2>/dev/null | grep -q '^install ok installed$'; then
  sudo apt remove -y winboat
  exit 0
fi

command -v flatpak >/dev/null 2>&1 || { echo "flatpak is not installed; nothing to remove."; exit 0; }
flatpak info it.mijorus.gearlever &>/dev/null || {
  echo "Gear Lever is not installed, so nothing was integrated through it."; exit 0; }

# Column-padded output: the last field is the path. See the sibling AppImage entries.
APPIMAGE=$(flatpak run it.mijorus.gearlever --list-installed 2>/dev/null |
  awk '/^WinBoat/ { print $NF }' | head -1)

if [ -z "$APPIMAGE" ]; then
  echo "WinBoat is not integrated with Gear Lever; nothing to remove."
  exit 0
fi

flatpak run it.mijorus.gearlever --remove "$APPIMAGE" -y
