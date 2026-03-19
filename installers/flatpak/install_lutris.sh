#!/usr/bin/env bash
# Lutris - Open source game manager for Linux.
# Install and play games from GOG, Epic, Battle.net, Ubisoft, and Wine/Proton.
# https://lutris.net

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info net.lutris.Lutris &>/dev/null && echo "Lutris already installed, skipping." && exit 0
flatpak install net.lutris.Lutris -y --noninteractive
