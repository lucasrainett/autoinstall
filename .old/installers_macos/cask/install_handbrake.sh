#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask handbrake-app &>/dev/null && echo "HandBrake already installed, skipping." && exit 0
brew install --cask handbrake-app
