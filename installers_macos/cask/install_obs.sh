#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask obs &>/dev/null && echo "OBS Studio already installed, skipping." && exit 0
brew install --cask obs
