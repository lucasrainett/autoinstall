#!/usr/bin/env bash
[ -f ~/.local/share/applications/helium*.desktop ] && echo "Helium already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/imputnet/helium-linux/releases/latest | grep -oP '"tag_name": "\K[^"]+')
wget -O helium.AppImage "https://github.com/imputnet/helium-linux/releases/download/${VERSION}/helium-${VERSION}-x86_64.AppImage"
flatpak run it.mijorus.gearlever --integrate helium.AppImage -y
