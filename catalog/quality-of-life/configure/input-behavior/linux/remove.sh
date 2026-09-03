#!/usr/bin/env bash
set -euo pipefail

command -v gsettings >/dev/null 2>&1 || exit 0
[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ] || exit 0

# `reset` restores the schema default, which is the only honest reversal available: the previous
# value was never recorded, and inventing one would be worse than returning to a known state.
gsettings reset org.gnome.desktop.peripherals.touchpad tap-to-click
gsettings reset org.gnome.desktop.peripherals.touchpad two-finger-scrolling-enabled
gsettings reset org.gnome.desktop.peripherals.keyboard delay
gsettings reset org.gnome.desktop.peripherals.keyboard repeat-interval

echo "Input behaviour reset to GNOME defaults."
