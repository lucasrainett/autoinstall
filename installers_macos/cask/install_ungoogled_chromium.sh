#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask ungoogled-chromium &>/dev/null && echo "Ungoogled Chromium already installed, skipping." && exit 0
brew install --cask ungoogled-chromium
