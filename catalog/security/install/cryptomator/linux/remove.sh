#!/usr/bin/env bash
set -euo pipefail

# Gear Lever's own --remove trashes the AppImage together with its .desktop entry and icon, so the
# integration is undone by the same tool that created it. It takes a file path, not an app name,
# and its AppImage folder is user-configurable — so the path is read back out of --list-installed
# (everything after the final "]" column) rather than hardcoded.
#
# Vaults and their contents live wherever the user put them and are never touched here: this
# uninstalls the app, not the encrypted data it opens.
APPIMAGE=$(flatpak run it.mijorus.gearlever --list-installed 2>/dev/null |
  sed -n 's/^Cryptomator.*\]  *//p')

if [ -z "$APPIMAGE" ]; then
  echo "Cryptomator is not integrated with Gear Lever; nothing to remove."
  exit 0
fi

flatpak run it.mijorus.gearlever --remove "$APPIMAGE" -y
