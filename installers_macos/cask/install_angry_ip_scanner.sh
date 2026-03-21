#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask angry-ip-scanner &>/dev/null && echo "Angry IP Scanner already installed, skipping." && exit 0
brew install --cask angry-ip-scanner
