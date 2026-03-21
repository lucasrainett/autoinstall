#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask eloston-chromium &>/dev/null && echo "Ungoogled Chromium already installed, skipping." && exit 0
brew install --cask eloston-chromium
