#!/usr/bin/env bash
# Remove Brave browser and all associated files.
# Purges the apt package, removes the apt source list, GPG key,
# config/cache directories, and GNOME keyring entries.

! dpkg -s brave-browser &>/dev/null && echo "Brave not installed, skipping." && exit 0

sudo apt purge brave-browser brave-keyring -y
sudo apt autoremove -y
sudo rm -f /etc/apt/sources.list.d/brave-browser-*.list
rm -rf ~/.config/BraveSoftware
rm -rf ~/.cache/BraveSoftware
rm -rf ~/.local/share/keyrings/brave-browser*
sudo rm -f /usr/share/keyrings/brave-browser-archive-keyring.gpg
