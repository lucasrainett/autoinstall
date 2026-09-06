#!/usr/bin/env bash
# Exit 0 = configured as this entry wants, 1 = not.
#
# gsettings needs a running session bus. A headless or container run has none, and reporting "not
# configured" there is the truth for a machine with no desktop session to configure.
if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  exit 1
fi

[ "$(gsettings get org.gtk.Settings.FileChooser show-hidden 2>/dev/null)" = "true" ] || exit 1
[ "$(gsettings get org.gnome.nautilus.preferences default-folder-viewer 2>/dev/null)" = "'list-view'" ] || exit 1
[ "$(gsettings get org.gnome.nautilus.preferences show-delete-permanently 2>/dev/null)" = "true" ] || exit 1
exit 0
