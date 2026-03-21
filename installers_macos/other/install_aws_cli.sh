#!/usr/bin/env bash
# Install AWS CLI v2 for macOS.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v aws &>/dev/null && echo "AWS CLI already installed, skipping." && exit 0

# use Homebrew (official support)
brew install awscli

echo "AWS CLI installed: $(aws --version)"
