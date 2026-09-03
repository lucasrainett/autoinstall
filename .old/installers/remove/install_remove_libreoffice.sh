#!/usr/bin/env bash
# Remove LibreOffice office suite.
# Purges all libreoffice packages and cleans up orphaned dependencies.
# Replaced by OnlyOffice (installed via flatpak).

! dpkg -l | grep -q libreoffice && echo "LibreOffice not installed, skipping." && exit 0

sudo apt remove --purge libreoffice* -y
sudo apt autoremove -y
