#!/usr/bin/env bash
set -euo pipefail

# Remove whichever packaging is present. Detect recognises both, so removal must too, or
# unchecking this would silently do nothing on a machine that installed the deb.
if dpkg-query -W -f='${Status}' winboat 2>/dev/null | grep -q '^install ok installed$'; then
  sudo apt remove -y winboat
  exit 0
fi

command -v flatpak >/dev/null 2>&1 || exit 0
flatpak info it.mijorus.gearlever &>/dev/null || exit 0

# Gear Lever owns the file and the desktop entry, so it does the removal; deleting the AppImage by
# hand would leave a launcher pointing at nothing.
flatpak run it.mijorus.gearlever --remove winboat -y 2>/dev/null || true
