#!/usr/bin/env bash
set -euo pipefail

APP="/Applications/iMovie.app"
[ -d "$APP" ] || exit 0

# Deletes only the application bundle. Documents created with it live in the user's home folder
# (and iCloud) and are deliberately never touched — removing the app must not remove the work.
sudo rm -rf "$APP"
echo "Removed $APP. Your documents were not touched; reinstall from the App Store if wanted."
