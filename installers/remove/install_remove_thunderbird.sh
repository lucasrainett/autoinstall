#!/usr/bin/env bash
# Remove Thunderbird email client.
# Replaced by Proton Mail (installed via deb).

! dpkg -s thunderbird &>/dev/null && ! snap list thunderbird &>/dev/null 2>&1 && echo "Thunderbird not installed, skipping." && exit 0

sudo snap remove thunderbird 2>/dev/null
sudo apt remove --purge thunderbird* -y 2>/dev/null
sudo apt autoremove -y
rm -rf ~/.thunderbird
