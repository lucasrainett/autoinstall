#!/usr/bin/env bash
# Install GitHub CLI via Homebrew.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v gh &>/dev/null && echo "GitHub CLI already installed, skipping." && exit 0

brew install gh

echo "GitHub CLI installed: $(gh --version | head -1)"
