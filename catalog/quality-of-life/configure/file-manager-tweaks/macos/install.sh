#!/usr/bin/env bash
set -euo pipefail

# Finder
defaults write com.apple.finder AppleShowAllFiles -bool true
defaults write NSGlobalDomain AppleShowAllExtensions -bool true
defaults write com.apple.finder ShowPathbar -bool true
defaults write com.apple.finder ShowStatusBar -bool true
defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true
defaults write com.apple.finder _FXSortFoldersFirst -bool true

# Save and print panels open expanded rather than collapsed to a single line.
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true
defaults write com.apple.systempreferences NSQuitAlwaysKeepsWindows -bool false

# Only when the profile exists — writing a Terminal profile name that is not installed leaves
# Terminal opening with a broken default.
if defaults read com.apple.Terminal "Window Settings" 2>/dev/null | grep -q '"Pro"'; then
  defaults write com.apple.Terminal "Default Window Settings" -string "Pro"
  defaults write com.apple.Terminal "Startup Window Settings" -string "Pro"
fi

killall Finder 2>/dev/null || true
killall SystemUIServer 2>/dev/null || true

echo "Finder and dialog defaults applied."
