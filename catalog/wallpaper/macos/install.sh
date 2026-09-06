#!/usr/bin/env bash
set -euo pipefail

WALLPAPER="$(cd "$(dirname "$0")/.." && pwd)/wallpaper.png"
[ -f "$WALLPAPER" ] || { echo "Wallpaper image missing: $WALLPAPER" >&2; exit 1; }

# Every desktop, not just the active one: a multi-display Mac otherwise ends up with one screen
# changed and the rest not.
osascript -e "tell application \"System Events\" to tell every desktop to set picture to \"$WALLPAPER\""
killall Dock 2>/dev/null || true

echo "Wallpaper set."
