#!/usr/bin/env bash
# Solaar - Logitech device manager for Linux.
# Configure and monitor Logitech wireless keyboards, mice, and trackpads.
# https://pwr-solaar.github.io/Solaar

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.github.pwr_solaar.solaar &>/dev/null && echo "Solaar already installed, skipping." && exit 0
flatpak install io.github.pwr_solaar.solaar -y --noninteractive
