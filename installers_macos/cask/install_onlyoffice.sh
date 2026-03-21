#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask onlyoffice &>/dev/null && echo "OnlyOffice already installed, skipping." && exit 0
brew install --cask onlyoffice
