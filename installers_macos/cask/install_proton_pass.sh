#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask proton-pass &>/dev/null && echo "Proton Pass already installed, skipping." && exit 0
brew install --cask proton-pass
