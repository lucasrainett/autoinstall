#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask protonvpn &>/dev/null && echo "Proton VPN already installed, skipping." && exit 0
brew install --cask protonvpn
