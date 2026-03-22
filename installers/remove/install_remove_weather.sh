#!/usr/bin/env bash
# Remove GNOME Weather.

! dpkg -s gnome-weather &>/dev/null && echo "GNOME Weather not installed, skipping." && exit 0

sudo apt remove --purge gnome-weather -y
sudo apt autoremove -y
