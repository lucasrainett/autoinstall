#!/usr/bin/env bash
# UTM - virtual machine manager for macOS.
# macOS equivalent of GNOME Boxes on Linux.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask utm &>/dev/null && echo "UTM already installed, skipping." && exit 0
brew install --cask utm
