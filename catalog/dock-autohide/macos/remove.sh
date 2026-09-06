#!/usr/bin/env bash
set -euo pipefail

defaults write com.apple.dock autohide -bool false
defaults delete com.apple.dock autohide-delay 2>/dev/null || true
killall Dock 2>/dev/null || true

echo "Dock auto-hide turned off."
