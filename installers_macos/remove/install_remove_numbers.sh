#!/usr/bin/env bash
# Remove Numbers spreadsheet app.
# Replaced by OnlyOffice.

[ ! -d "/Applications/Numbers.app" ] && echo "Numbers not installed, skipping." && exit 0

sudo rm -rf "/Applications/Numbers.app"
echo "Numbers removed."
