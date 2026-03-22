#!/usr/bin/env bash
# Remove Pages word processor.
# Replaced by OnlyOffice.

[ ! -d "/Applications/Pages.app" ] && echo "Pages not installed, skipping." && exit 0

sudo rm -rf "/Applications/Pages.app"
echo "Pages removed."
