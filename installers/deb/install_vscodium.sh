#!/usr/bin/env bash
# VSCodium - VS Code without Microsoft telemetry.
# Community-driven, freely-licensed build of VS Code.
# https://vscodium.com
#
# Adds the official VSCodium apt repo, then installs codium.

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s codium &>/dev/null && echo "VSCodium already installed, skipping." && exit 0

curl -fsSL https://gitlab.com/paulcarroty/vscodium-deb-rpm-repo/raw/master/pub.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/vscodium-archive-keyring.gpg > /dev/null
echo 'deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/vscodium-archive-keyring.gpg] https://download.vscodium.com/debs vscodium main' | sudo tee /etc/apt/sources.list.d/vscodium.list > /dev/null
sudo apt update
sudo apt install -y codium
