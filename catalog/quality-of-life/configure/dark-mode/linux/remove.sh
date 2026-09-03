#!/usr/bin/env bash
set -euo pipefail

command -v gsettings >/dev/null 2>&1 || exit 0
[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ] || exit 0

# `reset` restores whatever the distribution default is, rather than assuming everyone's default
# was the stock light theme — a distro or the user may have set something else entirely.
gsettings reset org.gnome.desktop.interface color-scheme || true
gsettings reset org.gnome.desktop.interface gtk-theme || true
echo "Desktop appearance reset to its default."
