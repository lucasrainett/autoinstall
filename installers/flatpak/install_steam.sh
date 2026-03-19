#!/usr/bin/env bash
# Steam - PC gaming platform by Valve.
# Game store, library manager, and community hub.
# https://store.steampowered.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.valvesoftware.Steam &>/dev/null && echo "Steam already installed, skipping." && exit 0
flatpak install com.valvesoftware.Steam -y --noninteractive
