#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask zen &>/dev/null && echo "Zen Browser already installed, skipping." && exit 0
brew install --cask zen
