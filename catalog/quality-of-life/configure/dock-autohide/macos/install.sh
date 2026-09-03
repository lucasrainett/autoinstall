#!/usr/bin/env bash
set -euo pipefail

defaults write com.apple.dock autohide -bool true
# Without this the Dock waits half a second before appearing, which reads as lag rather than as a
# deliberate hide.
defaults write com.apple.dock autohide-delay -float 0
killall Dock 2>/dev/null || true

echo "Dock set to auto-hide."
