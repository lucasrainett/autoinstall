#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask lm-studio &>/dev/null && echo "LM Studio already installed, skipping." && exit 0
brew install --cask lm-studio
