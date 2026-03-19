#!/usr/bin/env bash
# Proton VPN - Privacy-focused VPN by Proton.
# Encrypted VPN with no-logs policy and Secure Core servers.
# https://protonvpn.com
#
# Adds the official Proton VPN repo, then installs the GNOME desktop app.

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s proton-vpn-gnome-desktop &>/dev/null && echo "Proton VPN already installed, skipping." && exit 0

cd ~/Downloads
RELEASE_DEB=$(curl -s "https://repo.protonvpn.com/debian/dists/stable/main/binary-all/Packages" \
    | awk '/^Package: protonvpn-stable-release/{found=1} found && /^Filename:/{print $2; found=0}' \
    | tail -1)
wget -q --show-progress -O protonvpn-stable-release.deb "https://repo.protonvpn.com/debian/${RELEASE_DEB}"
sudo apt install -y ./protonvpn-stable-release.deb
sudo apt update
sudo apt install -y proton-vpn-gnome-desktop
