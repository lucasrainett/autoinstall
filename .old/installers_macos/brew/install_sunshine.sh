#!/usr/bin/env bash
# Sunshine - self-hosted game stream host for Moonlight.
# macOS support is experimental.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v sunshine &>/dev/null && echo "Sunshine already installed, skipping." && exit 0

brew tap LizardByte/homebrew
brew install sunshine

echo "Sunshine installed (experimental on macOS). Configure at https://localhost:47990"
