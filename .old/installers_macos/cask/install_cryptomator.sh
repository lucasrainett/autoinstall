#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask cryptomator &>/dev/null && echo "Cryptomator already installed, skipping." && exit 0
brew install --cask cryptomator
