#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask heroic &>/dev/null && echo "Heroic Games Launcher already installed, skipping." && exit 0
brew install --cask heroic
