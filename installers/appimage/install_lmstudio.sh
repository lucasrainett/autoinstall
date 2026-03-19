#!/usr/bin/env bash
[ -f ~/.local/share/applications/lm_studio*.desktop ] && echo "LM Studio already installed, skipping." && exit 0

cd ~/Downloads
wget -O lmstudio.AppImage https://lmstudio.ai/download/latest/linux/x64
flatpak run it.mijorus.gearlever --integrate lmstudio.AppImage -y
