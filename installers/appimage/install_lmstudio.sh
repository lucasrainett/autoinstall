#!/usr/bin/env bash
# LM Studio - Desktop app for running local LLMs.
# Download, manage, and chat with open-source language models offline.
# https://lmstudio.ai

[ "$AUTOINSTALL_UPDATE" != "true" ] && ls ~/AppImages/*[Ll][Mm]*[Ss]tudio* &>/dev/null && echo "LM Studio already installed, skipping." && exit 0

cd ~/Downloads
curl -fsSL -o lmstudio.AppImage https://lmstudio.ai/download/latest/linux/x64
flatpak run it.mijorus.gearlever --integrate lmstudio.AppImage -y
