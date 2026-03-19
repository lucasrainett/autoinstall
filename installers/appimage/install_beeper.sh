#!/usr/bin/env bash
# Beeper - Unified messaging app (owned by Automattic).
# Combines chats from iMessage, WhatsApp, Telegram, Slack, and more into one inbox.
# https://www.beeper.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -f ~/AppImages/beeper.appimage ] && echo "Beeper already installed, skipping." && exit 0

cd ~/Downloads
wget -q --show-progress -O beeper.AppImage https://api.beeper.com/desktop/download/linux/x64/stable/com.automattic.beeper.desktop
flatpak run it.mijorus.gearlever --integrate beeper.AppImage -y
