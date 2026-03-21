#!/usr/bin/env bash
# Configure macOS Dock settings and pinned apps.
# Equivalent of the Linux taskbar configuration.

echo "Configuring Dock..."

# ── Dock behavior ─────────────────────────────────────────────
# auto-hide the Dock
defaults write com.apple.dock autohide -bool true
# remove auto-hide delay
defaults write com.apple.dock autohide-delay -float 0
# speed up auto-hide animation
defaults write com.apple.dock autohide-time-modifier -float 0.3
# set icon size
defaults write com.apple.dock tilesize -int 48
# minimize windows using scale effect
defaults write com.apple.dock mineffect -string "scale"
# don't show recent apps in Dock
defaults write com.apple.dock show-recents -bool false
# don't animate opening applications
defaults write com.apple.dock launchanim -bool false

# ── set pinned Dock apps ──────────────────────────────────────
# clear existing Dock items
defaults write com.apple.dock persistent-apps -array

# helper function to add apps to Dock
add_dock_app() {
    local app_path="$1"
    if [ -d "$app_path" ]; then
        defaults write com.apple.dock persistent-apps -array-add \
            "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>$app_path</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>"
    fi
}

add_dock_app "/System/Applications/Utilities/Terminal.app"
add_dock_app "/Applications/Zen Browser.app"
add_dock_app "/Applications/Beeper.app"
add_dock_app "/Applications/Proton Pass.app"
add_dock_app "/Applications/Proton Mail.app"
add_dock_app "/Applications/Signal.app"

# ── apply changes ─────────────────────────────────────────────
killall Dock 2>/dev/null

echo "Dock configured."
