#!/usr/bin/env bash
# System performance and usability tweaks for macOS development workstations.
# Configures Finder, keyboard, trackpad, screenshots, and security settings.

echo "Applying macOS system tweaks..."

# ── Finder tweaks ─────────────────────────────────────────────
echo "  Configuring Finder..."
# show hidden files
defaults write com.apple.finder AppleShowAllFiles -bool true
# show all file extensions
defaults write NSGlobalDomain AppleShowAllExtensions -bool true
# show path bar and status bar
defaults write com.apple.finder ShowPathbar -bool true
defaults write com.apple.finder ShowStatusBar -bool true
# default to list view
defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"
# disable warning when changing file extension
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false
# show full POSIX path in Finder title
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true
# keep folders on top when sorting by name
defaults write com.apple.finder _FXSortFoldersFirst -bool true
# search current folder by default
defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"
# avoid creating .DS_Store files on network and USB volumes
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true
defaults write com.apple.desktopservices DSDontWriteUSBStores -bool true

# ── keyboard ──────────────────────────────────────────────────
echo "  Configuring keyboard..."
# fast key repeat rate
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain InitialKeyRepeat -int 15
# disable auto-correct
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false
# disable auto-capitalization
defaults write NSGlobalDomain NSAutomaticCapitalizationEnabled -bool false
# disable period substitution with double-space
defaults write NSGlobalDomain NSAutomaticPeriodSubstitutionEnabled -bool false
# enable full keyboard access for all controls (tab through dialogs)
defaults write NSGlobalDomain AppleKeyboardUIMode -int 3

# ── trackpad ──────────────────────────────────────────────────
echo "  Configuring trackpad..."
# enable tap to click
defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -bool true
defaults -currentHost write NSGlobalDomain com.apple.mouse.tapBehavior -int 1

# ── screenshots ───────────────────────────────────────────────
echo "  Configuring screenshots..."
# save screenshots to ~/Screenshots
mkdir -p "$HOME/Screenshots"
defaults write com.apple.screencapture location -string "$HOME/Screenshots"
# save as PNG
defaults write com.apple.screencapture type -string "png"

# ── security ──────────────────────────────────────────────────
echo "  Configuring security settings..."
# enable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on 2>/dev/null

# ── misc ──────────────────────────────────────────────────────
echo "  Applying misc tweaks..."
# expand save panel by default
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true
# expand print panel by default
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true
# disable Resume system-wide
defaults write com.apple.systempreferences NSQuitAlwaysKeepsWindows -bool false

# ── Terminal: set Pro profile if available ─────────────────────
if defaults read com.apple.Terminal "Window Settings" 2>/dev/null | grep -q '"Pro"'; then
    defaults write com.apple.Terminal "Default Window Settings" -string "Pro"
    defaults write com.apple.Terminal "Startup Window Settings" -string "Pro"
fi

# ── apply changes ─────────────────────────────────────────────
killall Finder 2>/dev/null
killall SystemUIServer 2>/dev/null

echo "System tweaks applied."
