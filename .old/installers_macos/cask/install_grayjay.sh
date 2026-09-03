#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask grayjay &>/dev/null && echo "Grayjay already installed, skipping." && exit 0
brew install --cask grayjay
