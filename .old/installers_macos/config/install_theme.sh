#!/usr/bin/env bash
# macOS theme configuration.
# Downloads a custom wallpaper and applies dark mode.

WALLPAPER_DIR="$HOME/Pictures/Wallpapers"
WALLPAPER="$WALLPAPER_DIR/PaulsHardware8BitLogosChristmas.png"

mkdir -p "$WALLPAPER_DIR"

if [ ! -f "$WALLPAPER" ]; then
    curl -fsSL -o "$WALLPAPER" https://raw.githubusercontent.com/lucasrainett/autoinstall/master/wallpapers/PaulsHardware8BitLogosChristmas.png
fi

# set dark mode
defaults write NSGlobalDomain AppleInterfaceStyle -string "Dark"

# set wallpaper using osascript (works on all macOS versions)
osascript -e "tell application \"Finder\" to set desktop picture to POSIX file \"$WALLPAPER\"" 2>/dev/null

# set accent color to graphite
defaults write NSGlobalDomain AppleAccentColor -int -1
defaults write NSGlobalDomain AppleHighlightColor -string "0.847059 0.847059 0.862745 Graphite"

echo "Theme applied (dark mode + wallpaper)."
