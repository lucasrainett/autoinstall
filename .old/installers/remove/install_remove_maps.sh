#!/usr/bin/env bash
# Remove GNOME Maps.

! dpkg -s gnome-maps &>/dev/null && echo "GNOME Maps not installed, skipping." && exit 0

sudo apt remove --purge gnome-maps -y
sudo apt autoremove -y
