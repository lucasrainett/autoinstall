#!/usr/bin/env bash
set -euo pipefail

# Gear Lever's --remove trashes the AppImage along with its .desktop entry and icon. It takes a
# file path, not an app name, and its AppImage folder is user-configurable — so the path is read
# back out of --list-installed (everything after the final "]" column) rather than hardcoded.
APPIMAGE=$(flatpak run it.mijorus.gearlever --list-installed 2>/dev/null |
  sed -n 's/^Helium.*\]  *//p')

if [ -z "$APPIMAGE" ]; then
  echo "Helium is not integrated with Gear Lever; nothing to remove."
  exit 0
fi

flatpak run it.mijorus.gearlever --remove "$APPIMAGE" -y
