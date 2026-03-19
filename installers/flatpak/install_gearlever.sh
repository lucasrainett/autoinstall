#!/usr/bin/env bash
# GearLever - AppImage manager for GNOME.
# Integrates AppImage files into the desktop (menu entries, icons).
# Required before installing any AppImage apps.
# https://github.com/mijorus/gearlever

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info it.mijorus.gearlever &>/dev/null && echo "Gearlever already installed, skipping." && exit 0
flatpak install it.mijorus.gearlever -y --noninteractive
