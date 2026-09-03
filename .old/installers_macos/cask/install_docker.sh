#!/usr/bin/env bash
# Install Docker Desktop for macOS via Homebrew cask.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v docker &>/dev/null && echo "Docker already installed, skipping." && exit 0

brew install --cask docker-desktop

echo "Docker Desktop installed. Launch it from Applications to complete setup."
