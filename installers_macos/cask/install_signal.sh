#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask signal &>/dev/null && echo "Signal already installed, skipping." && exit 0
brew install --cask signal
