#!/usr/bin/env bash
# GNOME Boxes - Simple virtual machine manager.
# Create and manage VMs with an easy-to-use interface.
# https://apps.gnome.org/Boxes

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info org.gnome.Boxes &>/dev/null && echo "Boxes already installed, skipping." && exit 0
flatpak install org.gnome.Boxes -y --noninteractive
