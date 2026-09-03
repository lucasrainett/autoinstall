#!/usr/bin/env bash
set -euo pipefail

if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  echo "No GNOME session available, so there is no desktop appearance to change." >&2
  echo "Run this from a graphical session." >&2
  exit 1
fi

# Both keys: color-scheme drives GTK4/libadwaita apps, gtk-theme still matters for older GTK3
# apps that do not follow the newer preference.
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
gsettings set org.gnome.desktop.interface gtk-theme 'Adwaita-dark'
echo "Dark mode enabled."
