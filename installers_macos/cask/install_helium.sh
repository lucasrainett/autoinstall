#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask helium-browser &>/dev/null && echo "Helium already installed, skipping." && exit 0
brew install --cask helium-browser
