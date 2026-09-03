#!/usr/bin/env bash
# Remove Rhythmbox music player.

! dpkg -s rhythmbox &>/dev/null && echo "Rhythmbox not installed, skipping." && exit 0

sudo apt remove --purge rhythmbox* -y
sudo apt autoremove -y
