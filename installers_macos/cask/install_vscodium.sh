#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask vscodium &>/dev/null && echo "VSCodium already installed, skipping." && exit 0
brew install --cask vscodium
