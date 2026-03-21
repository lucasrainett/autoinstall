#!/usr/bin/env bash
# Blankie - ambient sound mixer for macOS.
# macOS equivalent of Blanket on Linux.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask blankie &>/dev/null && echo "Blankie already installed, skipping." && exit 0
brew install --cask blankie
