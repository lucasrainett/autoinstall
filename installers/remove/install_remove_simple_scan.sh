#!/usr/bin/env bash
# Remove Simple Scan document scanner.

! dpkg -s simple-scan &>/dev/null && echo "Simple Scan not installed, skipping." && exit 0

sudo apt remove --purge simple-scan -y
sudo apt autoremove -y
