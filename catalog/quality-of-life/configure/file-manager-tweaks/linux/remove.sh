#!/usr/bin/env bash
set -euo pipefail

command -v gsettings >/dev/null 2>&1 || exit 0
[ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ] || exit 0

# `reset` restores the schema default, the only honest reversal: the previous value was never
# recorded, and inventing one is worse than returning to a known state.
gsettings reset org.gtk.Settings.FileChooser show-hidden
gsettings reset org.gnome.nautilus.preferences default-folder-viewer
gsettings reset org.gnome.nautilus.preferences show-delete-permanently

echo "File manager defaults reset."
