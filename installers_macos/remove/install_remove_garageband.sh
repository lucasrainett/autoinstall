#!/usr/bin/env bash
# Remove GarageBand and its sound library (~1.5GB).

[ ! -d "/Applications/GarageBand.app" ] && echo "GarageBand not installed, skipping." && exit 0

sudo rm -rf "/Applications/GarageBand.app"
sudo rm -rf "/Library/Application Support/GarageBand"
sudo rm -rf "/Library/Audio/Apple Loops/Apple/Apple Loops for GarageBand"
echo "GarageBand removed."
