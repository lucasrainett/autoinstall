#!/usr/bin/env bash
set -euo pipefail

if ! command -v gsettings >/dev/null 2>&1 || [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  echo "No desktop session bus — these are per-session GNOME settings." >&2
  exit 3
fi

# Hidden files in the file chooser, list view in Nautilus, and a real delete alongside "move to
# trash". Linux has no equivalent of the extensions toggle: it never hides them.
gsettings set org.gtk.Settings.FileChooser show-hidden true
gsettings set org.gnome.nautilus.preferences default-folder-viewer "list-view"
gsettings set org.gnome.nautilus.preferences show-delete-permanently true

echo "File manager defaults applied."
