#!/usr/bin/env bash
# Install Tailscale VPN via Homebrew cask (macOS GUI app).

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -d "/Applications/Tailscale.app" ] && echo "Tailscale already installed, skipping." && exit 0

brew install --cask tailscale-app

echo "Tailscale installed."
