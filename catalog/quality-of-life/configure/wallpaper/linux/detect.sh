#!/usr/bin/env bash
# Exit 0 = our wallpaper is set, 1 = not.
if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  exit 1
fi

WALLPAPER="$(cd "$(dirname "$0")/.." && pwd)/wallpaper.png"
current=$(gsettings get org.gnome.desktop.background picture-uri 2>/dev/null)
case "$current" in
  *"$WALLPAPER"*) exit 0 ;;
  *) exit 1 ;;
esac
