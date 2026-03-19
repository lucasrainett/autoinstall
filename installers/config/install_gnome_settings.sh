#!/usr/bin/env bash
# GNOME settings backup and restore via dconf.
# https://wiki.gnome.org/Projects/dconf
#
# First run: exports all current GNOME settings to dotfiles/gnome-settings.ini.
#   Review and commit this file to version control.
# Subsequent runs: restores settings from the committed file.
# This covers keybindings, extension configs, theme settings, and everything else.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETTINGS_FILE="$SCRIPT_DIR/../../dotfiles/gnome-settings.ini"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "No gnome-settings.ini found, exporting current settings..."
    mkdir -p "$(dirname "$SETTINGS_FILE")"
    dconf dump / > "$SETTINGS_FILE"
    echo "Exported to $SETTINGS_FILE"
    echo "Review and commit this file, then it will be restored on next run."
    exit 0
fi

echo "Restoring GNOME settings from gnome-settings.ini..."
dconf load / < "$SETTINGS_FILE"
