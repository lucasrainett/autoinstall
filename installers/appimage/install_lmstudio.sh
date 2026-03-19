#!/usr/bin/env bash
# LM Studio - Desktop app for running local LLMs.
# Download, manage, and chat with open-source language models offline.
# https://lmstudio.ai

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -f ~/AppImages/lm_studio.appimage ] && echo "LM Studio already installed, skipping." && exit 0

cd ~/Downloads
wget -q --show-progress -O lmstudio.AppImage https://lmstudio.ai/download/latest/linux/x64
flatpak run it.mijorus.gearlever --integrate lmstudio.AppImage -y
