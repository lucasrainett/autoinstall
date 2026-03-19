#!/usr/bin/env bash

flatpak info org.videolan.VLC &>/dev/null && echo "Vlc already installed, skipping." && exit 0
flatpak install org.videolan.VLC -y --noninteractive
