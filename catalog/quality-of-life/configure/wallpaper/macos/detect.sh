#!/usr/bin/env bash
# Exit 0 = our wallpaper is set, 1 = not.
WALLPAPER="$(cd "$(dirname "$0")/.." && pwd)/wallpaper.png"
current=$(osascript -e 'tell application "System Events" to get picture of current desktop' 2>/dev/null || true)
[ "$current" = "$WALLPAPER" ]
