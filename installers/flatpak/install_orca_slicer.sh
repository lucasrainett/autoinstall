#!/usr/bin/env bash
flatpak info io.github.softfever.OrcaSlicer &>/dev/null && echo "OrcaSlicer already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/OrcaSlicer/OrcaSlicer/releases/latest | grep -oP '"tag_name": "\K[^"]+')
VERSION_NUM=${VERSION#v}
wget -O OrcaSlicer-Linux-flatpak_x86_64.flatpak "https://github.com/OrcaSlicer/OrcaSlicer/releases/download/${VERSION}/OrcaSlicer-Linux-flatpak_V${VERSION_NUM}_x86_64.flatpak"
flatpak install --user ./OrcaSlicer-Linux-flatpak_x86_64.flatpak -y --noninteractive
