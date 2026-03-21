#!/usr/bin/env bash
# Logi Options+ - official Logitech device manager for macOS.
# macOS equivalent of Solaar on Linux.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask logi-options+ &>/dev/null && echo "Logi Options+ already installed, skipping." && exit 0
brew install --cask logi-options+
