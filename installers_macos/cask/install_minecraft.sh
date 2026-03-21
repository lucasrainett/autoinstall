#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask minecraft &>/dev/null && echo "Minecraft already installed, skipping." && exit 0
brew install --cask minecraft
