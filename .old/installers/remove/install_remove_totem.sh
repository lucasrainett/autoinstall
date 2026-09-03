#!/usr/bin/env bash
# Remove GNOME Videos (Totem) media player.
# Replaced by VLC (installed via flatpak).

! dpkg -s totem &>/dev/null && echo "Totem not installed, skipping." && exit 0

sudo apt remove --purge totem* -y
sudo apt autoremove -y
