#!/usr/bin/env bash
[ -f ~/.local/share/applications/cryptomator*.desktop ] && echo "Cryptomator already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/cryptomator/cryptomator/releases/latest | grep -oP '"tag_name": "\K[^"]+')
wget -O cryptomator.AppImage "https://github.com/cryptomator/cryptomator/releases/download/${VERSION}/cryptomator-${VERSION}-x86_64.AppImage"
flatpak run it.mijorus.gearlever --integrate cryptomator.AppImage -y
