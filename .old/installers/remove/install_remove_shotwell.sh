#!/usr/bin/env bash
# Remove Shotwell photo manager.

! dpkg -s shotwell &>/dev/null && echo "Shotwell not installed, skipping." && exit 0

sudo apt remove --purge shotwell* -y
sudo apt autoremove -y
