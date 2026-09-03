#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$HOME/.local/share/JetBrains/Toolbox"
mkdir -p "$INSTALL_DIR" "$HOME/.local/bin"

TMP_TAR="$(mktemp -u).tar.gz"
curl -fsSL -o "$TMP_TAR" "https://data.services.jetbrains.com/products/download?platform=linux&code=TBA"
tar -xzf "$TMP_TAR" -C "$INSTALL_DIR" --strip-components=1
rm -f "$TMP_TAR"

ln -sf "$INSTALL_DIR/bin/jetbrains-toolbox" "$HOME/.local/bin/jetbrains-toolbox"
