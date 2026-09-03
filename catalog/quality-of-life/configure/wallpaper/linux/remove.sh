#!/usr/bin/env bash
set -euo pipefail

command -v gsettings >/dev/null 2>&1 || exit 0
[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ] || exit 0

# Resets to the distribution's default wallpaper. The previous picture was never recorded, so this
# is the only honest reversal — a known state rather than a guess.
gsettings reset org.gnome.desktop.background picture-uri
gsettings reset org.gnome.desktop.background picture-uri-dark
gsettings reset org.gnome.desktop.background picture-options

echo "Wallpaper reset to the system default."
