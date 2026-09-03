#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask beeper &>/dev/null && echo "Beeper already installed, skipping." && exit 0
brew install --cask beeper
