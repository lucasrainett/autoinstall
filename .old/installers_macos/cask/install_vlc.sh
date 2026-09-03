#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask vlc &>/dev/null && echo "VLC already installed, skipping." && exit 0
brew install --cask vlc
