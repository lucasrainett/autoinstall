#!/usr/bin/env bash
set -euo pipefail

if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  echo "No desktop session bus — these are per-session GNOME settings and cannot be applied here." >&2
  exit 3
fi

gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true
gsettings set org.gnome.desktop.peripherals.touchpad two-finger-scrolling-enabled true
# 300ms before a held key repeats, 20ms between repeats: noticeably quicker than GNOME's 500/30
# without reaching the point where a stuck key runs away.
gsettings set org.gnome.desktop.peripherals.keyboard delay 300
gsettings set org.gnome.desktop.peripherals.keyboard repeat-interval 20

echo "Input behaviour configured."
