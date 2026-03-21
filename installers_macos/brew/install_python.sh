#!/usr/bin/env bash
# Install Python 3 via Homebrew.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v python3 &>/dev/null && echo "Python already installed, skipping." && exit 0

brew install python

echo "Python installed: $(python3 --version)"
