#!/usr/bin/env bash
# Minder - Mind mapping tool for GNOME.
# Create and organize ideas with visual mind maps.
# https://github.com/phase1geo/Minder

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.github.phase1geo.minder &>/dev/null && echo "Minder already installed, skipping." && exit 0
flatpak install com.github.phase1geo.minder -y --noninteractive
