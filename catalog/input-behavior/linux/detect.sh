#!/usr/bin/env bash
# Exit 0 = configured as this entry wants, 1 = not.
# gsettings needs a running session bus. A headless or container run has none, and this must not
# fail the entry there — it reports "not configured", which is the truth for a machine with no
# desktop session to configure.
if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  exit 1
fi

[ "$(gsettings get org.gnome.desktop.peripherals.touchpad tap-to-click 2>/dev/null)" = "true" ] || exit 1
[ "$(gsettings get org.gnome.desktop.peripherals.touchpad two-finger-scrolling-enabled 2>/dev/null)" = "true" ] || exit 1
[ "$(gsettings get org.gnome.desktop.peripherals.keyboard delay 2>/dev/null)" = "uint32 300" ] || exit 1
[ "$(gsettings get org.gnome.desktop.peripherals.keyboard repeat-interval 2>/dev/null)" = "uint32 20" ] || exit 1
exit 0
