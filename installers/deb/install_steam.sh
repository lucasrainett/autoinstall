#!/usr/bin/env bash
# Steam - PC gaming platform by Valve.
# Game store, library manager, and community hub.
# https://store.steampowered.com
#
# Installs the official .deb package from Valve's repo.

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s steam-launcher &>/dev/null && echo "Steam already installed, skipping." && exit 0

cd ~/Downloads
wget -O steam.deb "https://repo.steampowered.com/steam/archive/precise/steam_latest.deb"
sudo apt install -y ./steam.deb
