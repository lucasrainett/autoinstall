#!/usr/bin/env bash
# Proton VPN - Privacy-focused VPN by Proton.
# Encrypted VPN with no-logs policy and Secure Core servers.
# https://protonvpn.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.protonvpn.www &>/dev/null && echo "Proton Vpn already installed, skipping." && exit 0
flatpak install com.protonvpn.www -y --noninteractive
