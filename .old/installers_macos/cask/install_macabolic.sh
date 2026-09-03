#!/usr/bin/env bash
# Macabolic - video and audio downloader for macOS.
# macOS native port of Parabolic on Linux.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask macabolic &>/dev/null && echo "Macabolic already installed, skipping." && exit 0
brew tap alinuxpengui/macabolic
brew install --cask macabolic
