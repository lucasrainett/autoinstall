#!/usr/bin/env bash
# Proton Pass - End-to-end encrypted password manager by Proton.
# Store passwords, generate secure ones, and autofill across devices.
# https://proton.me/pass
#
# Downloads the latest .deb from Proton's versionless URL (always latest).

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s proton-pass &>/dev/null && echo "Proton Pass already installed, skipping." && exit 0

cd ~/Downloads
wget -O proton-pass_amd64.deb "https://proton.me/download/PassDesktop/linux/x64/ProtonPass.deb"
sudo apt install -y ./proton-pass_amd64.deb
