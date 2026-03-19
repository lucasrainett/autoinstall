#!/usr/bin/env bash
# Cryptomator - Client-side encryption for cloud storage.
# Creates encrypted vaults that work with any cloud provider (Dropbox, GDrive, etc.).
# https://cryptomator.org
#
# Fetches the latest version from the GitHub releases API.

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -f ~/.local/share/applications/cryptomator*.desktop ] && echo "Cryptomator already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/cryptomator/cryptomator/releases/latest | grep -oP '"tag_name": "\K[^"]+')
wget -O cryptomator.AppImage "https://github.com/cryptomator/cryptomator/releases/download/${VERSION}/cryptomator-${VERSION}-x86_64.AppImage"
flatpak run it.mijorus.gearlever --integrate cryptomator.AppImage -y
