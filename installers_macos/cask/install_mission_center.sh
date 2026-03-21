#!/usr/bin/env bash
# macOS has Activity Monitor built-in, but we install Stats as a menu bar alternative.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask stats &>/dev/null && echo "Stats already installed, skipping." && exit 0
brew install --cask stats
echo "Stats installed (macOS menu bar system monitor, similar to Mission Center)."
