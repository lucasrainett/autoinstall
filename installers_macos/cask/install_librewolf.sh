#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask librewolf &>/dev/null && echo "LibreWolf already installed, skipping." && exit 0
brew install --cask librewolf
