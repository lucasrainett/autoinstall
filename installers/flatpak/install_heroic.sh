#!/usr/bin/env bash
# Heroic Games Launcher - Native launcher for Epic, GOG, and Amazon Games.
# Play your Epic Games Store, GOG, and Amazon Prime Gaming libraries on Linux.
# https://heroicgameslauncher.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.heroicgameslauncher.hgl &>/dev/null && echo "Heroic Games Launcher already installed, skipping." && exit 0
flatpak install com.heroicgameslauncher.hgl -y --noninteractive
