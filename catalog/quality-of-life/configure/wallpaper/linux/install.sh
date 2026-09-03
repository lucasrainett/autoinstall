#!/usr/bin/env bash
set -euo pipefail

if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  echo "No desktop session bus — the wallpaper is a per-session GNOME setting." >&2
  exit 1
fi

WALLPAPER="$(cd "$(dirname "$0")/.." && pwd)/wallpaper.png"
[ -f "$WALLPAPER" ] || { echo "Wallpaper image missing: $WALLPAPER" >&2; exit 1; }

# Both keys: GNOME chooses between them by theme, so setting only picture-uri leaves a dark-mode
# desktop showing the old picture and looking like the entry did nothing.
gsettings set org.gnome.desktop.background picture-uri "file://$WALLPAPER"
gsettings set org.gnome.desktop.background picture-uri-dark "file://$WALLPAPER"
gsettings set org.gnome.desktop.background picture-options "zoom"

echo "Wallpaper set."
