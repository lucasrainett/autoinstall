#!/usr/bin/env bash
# Install common development tools via Homebrew.
# macOS equivalent of apt common tools.

echo "Installing common development tools..."

TOOLS=(
    git
    curl
    jq
    tree
    htop
    tmux
    unzip
    coreutils
    gnu-sed
    grep
    make
    cmake
    openssl
    readline
)

brew install "${TOOLS[@]}"

echo "Common tools installed."
