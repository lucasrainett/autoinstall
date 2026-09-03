#!/usr/bin/env bash
# Exit 0 = dark mode active, 1 = not active (or no desktop session to ask).
# gsettings needs a session bus; without one this reports "not applied" rather than failing, which
# is the honest answer on a headless machine.
command -v gsettings >/dev/null 2>&1 || exit 1
[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ] || exit 1
gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null | grep -q "prefer-dark"
