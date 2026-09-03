#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask orcaslicer &>/dev/null && echo "OrcaSlicer already installed, skipping." && exit 0
brew install --cask orcaslicer
