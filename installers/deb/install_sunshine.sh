#!/usr/bin/env bash
# Sunshine - Self-hosted game stream host for Moonlight.
# Stream games and desktop from this PC to other devices.
# https://app.lizardbyte.dev/Sunshine
#
# Downloads the latest .deb from GitHub releases, matching the current Ubuntu version.

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s sunshine &>/dev/null && echo "Sunshine already installed, skipping." && exit 0

UBUNTU_VERSION=$(. /etc/os-release && echo "$VERSION_ID")

cd ~/Downloads
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/LizardByte/Sunshine/releases/latest | grep -oP "\"browser_download_url\": \"\K[^\"]*ubuntu-${UBUNTU_VERSION}-amd64\.deb")
wget -q --show-progress -O sunshine.deb "$DOWNLOAD_URL"
sudo apt install -y ./sunshine.deb
