#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask steam &>/dev/null && echo "Steam already installed, skipping." && exit 0
brew install --cask steam
