#!/usr/bin/env bash
# Remove Keynote presentation app.
# Replaced by OnlyOffice.

[ ! -d "/Applications/Keynote.app" ] && echo "Keynote not installed, skipping." && exit 0

sudo rm -rf "/Applications/Keynote.app"
echo "Keynote removed."
