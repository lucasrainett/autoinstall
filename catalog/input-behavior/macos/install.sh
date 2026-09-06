#!/usr/bin/env bash
set -euo pipefail

# macOS counts these in 15ms ticks: 20 ticks (~300ms) before repeating, 2 ticks (~30ms) between.
# The System Settings slider stops well short of this, which is why it is set here directly.
defaults write -g InitialKeyRepeat -int 20
defaults write -g KeyRepeat -int 2
defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -bool true
defaults write com.apple.AppleMultitouchTrackpad Clicking -bool true

echo "Input behaviour configured. Key-repeat changes take effect after logging out."
