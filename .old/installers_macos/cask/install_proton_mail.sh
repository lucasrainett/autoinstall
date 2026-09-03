#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask proton-mail &>/dev/null && echo "Proton Mail already installed, skipping." && exit 0
brew install --cask proton-mail
