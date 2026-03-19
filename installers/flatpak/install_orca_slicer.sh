#!/usr/bin/env bash
# OrcaSlicer - 3D printer slicer based on BambuStudio/PrusaSlicer.
# Converts 3D models into G-code for FDM printers with multi-material support.
# https://github.com/OrcaSlicer/OrcaSlicer
#
# Not on Flathub yet, so we download the .flatpak file from GitHub releases.
# Uses the GitHub API to get the latest version tag, strips the "v" prefix
# for the filename (tag: v2.3.1 -> filename: ...V2.3.1...), then installs locally.

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.github.softfever.OrcaSlicer &>/dev/null && echo "OrcaSlicer already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/OrcaSlicer/OrcaSlicer/releases/latest | grep -oP '"tag_name": "\K[^"]+')
VERSION_NUM=${VERSION#v}
wget -O OrcaSlicer-Linux-flatpak_x86_64.flatpak "https://github.com/OrcaSlicer/OrcaSlicer/releases/download/${VERSION}/OrcaSlicer-Linux-flatpak_V${VERSION_NUM}_x86_64.flatpak"
flatpak install --user ./OrcaSlicer-Linux-flatpak_x86_64.flatpak -y --noninteractive
