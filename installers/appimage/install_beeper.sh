#!/usr/bin/env bash
[ -f ~/.local/share/applications/beeper*.desktop ] && echo "Beeper already installed, skipping." && exit 0

cd ~/Downloads
wget -O beeper.AppImage https://api.beeper.com/desktop/download/linux/x64/stable/com.automattic.beeper.desktop
flatpak run it.mijorus.gearlever --integrate beeper.AppImage -y
