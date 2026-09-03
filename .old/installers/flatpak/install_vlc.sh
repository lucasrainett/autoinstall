#!/usr/bin/env bash
# VLC - Free and open-source multimedia player.
# Plays most multimedia files, DVDs, CDs, and streaming protocols.
# https://www.videolan.org

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info org.videolan.VLC &>/dev/null && echo "Vlc already installed, skipping." && exit 0
flatpak install org.videolan.VLC -y --noninteractive
