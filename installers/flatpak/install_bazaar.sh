#!/usr/bin/env bash
# Bazaar - Wallpaper and theme browser for GNOME.
# Browse and apply wallpapers from various sources.
# https://github.com/kolunmi/bazaar

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.github.kolunmi.Bazaar &>/dev/null && echo "Bazaar already installed, skipping." && exit 0
flatpak install io.github.kolunmi.Bazaar -y --noninteractive
