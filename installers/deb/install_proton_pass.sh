#!/usr/bin/env bash
dpkg -s proton-pass &>/dev/null && echo "Proton Pass already installed, skipping." && exit 0

cd ~/Downloads
wget -O proton-pass_amd64.deb "https://proton.me/download/PassDesktop/linux/x64/ProtonPass.deb"
sudo apt install -y ./proton-pass_amd64.deb
