#!/usr/bin/env bash
# Flatseal - Flatpak permission manager.
# Review and modify permissions for all installed flatpak apps.
# https://github.com/tchx84/Flatseal

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.github.tchx84.Flatseal &>/dev/null && echo "Flatseal already installed, skipping." && exit 0
flatpak install com.github.tchx84.Flatseal -y --noninteractive
