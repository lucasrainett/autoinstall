#!/usr/bin/env bash
# Elgato Stream Deck - official macOS app.
# macOS equivalent of Stream Controller on Linux.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask elgato-stream-deck &>/dev/null && echo "Stream Deck already installed, skipping." && exit 0
brew install --cask elgato-stream-deck
