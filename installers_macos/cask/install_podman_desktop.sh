#!/usr/bin/env bash
# Podman Desktop - container management GUI for macOS.
# macOS equivalent of Pods on Linux.
[ "$AUTOINSTALL_UPDATE" != "true" ] && brew list --cask podman-desktop &>/dev/null && echo "Podman Desktop already installed, skipping." && exit 0
brew install --cask podman-desktop
