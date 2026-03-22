#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask helium &>/dev/null && echo "Helium already installed, skipping." && exit 0
brew install --cask helium
