#!/usr/bin/env bash
dpkg -s proton-mail &>/dev/null && echo "Proton Mail already installed, skipping." && exit 0

cd ~/Downloads
wget -O ProtonMail-desktop-beta.deb "https://proton.me/download/mail/linux/ProtonMail-desktop-beta.deb"
sudo apt install -y ./ProtonMail-desktop-beta.deb
