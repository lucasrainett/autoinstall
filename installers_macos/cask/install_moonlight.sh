#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask moonlight &>/dev/null && echo "Moonlight already installed, skipping." && exit 0
brew install --cask moonlight
