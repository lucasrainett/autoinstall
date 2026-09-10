#!/usr/bin/env bash
set -euo pipefail

# macOS ships no "reset to default" for this, so the stock picture is set back by path. If Apple
# moves it in a future release the entry says so rather than failing silently.
DEFAULT="/System/Library/Desktop Pictures/Ventura Graphic.heic"
if [ ! -f "$DEFAULT" ]; then
  echo "The stock wallpaper was not found at $DEFAULT; set one yourself in System Settings." >&2
  # Exit 3 — declined, nothing changed. Exiting 0 claimed the wallpaper had been reverted while
  # leaving ours in place, which the post-action check then reported as a failed removal.
  exit 3
fi

osascript -e "tell application \"System Events\" to tell every desktop to set picture to \"$DEFAULT\""
killall Dock 2>/dev/null || true

echo "Wallpaper reset to the macOS default."
