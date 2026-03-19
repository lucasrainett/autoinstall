#!/usr/bin/env bash
# Angry IP Scanner - Fast network scanner.
# Scans IP addresses and ports on local networks.
# https://angryip.org

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info org.angryip.ipscan &>/dev/null && echo "Angry Ip Scanner already installed, skipping." && exit 0
flatpak install org.angryip.ipscan -y --noninteractive
