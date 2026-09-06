#!/usr/bin/env bash
set -euo pipefail

# Deleting the keys returns macOS to its own defaults, rather than writing a guess at what was
# there before.
defaults delete -g InitialKeyRepeat 2>/dev/null || true
defaults delete -g KeyRepeat 2>/dev/null || true
defaults delete com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking 2>/dev/null || true
defaults delete com.apple.AppleMultitouchTrackpad Clicking 2>/dev/null || true

echo "Input behaviour reset to macOS defaults."
