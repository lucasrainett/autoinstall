#!/usr/bin/env bash
# Remove iMovie and its support files (~2.4GB).
# Replaced by HandBrake and OBS.

[ ! -d "/Applications/iMovie.app" ] && echo "iMovie not installed, skipping." && exit 0

sudo rm -rf "/Applications/iMovie.app"
sudo rm -rf "/Library/Application Support/iMovie"
echo "iMovie removed."
