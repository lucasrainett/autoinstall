#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask jetbrains-toolbox &>/dev/null && echo "JetBrains Toolbox already installed, skipping." && exit 0
brew install --cask jetbrains-toolbox
