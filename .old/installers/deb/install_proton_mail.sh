#!/usr/bin/env bash
# Proton Mail - End-to-end encrypted email by Proton.
# Desktop client for Proton Mail with offline access and notifications.
# https://proton.me/mail
#
# Downloads the latest .deb from Proton's versionless URL (always latest).

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s proton-mail &>/dev/null && echo "Proton Mail already installed, skipping." && exit 0

cd ~/Downloads
curl -fsSL -o ProtonMail-desktop-beta.deb "https://proton.me/download/mail/linux/ProtonMail-desktop-beta.deb"
sudo apt install -y ./ProtonMail-desktop-beta.deb
