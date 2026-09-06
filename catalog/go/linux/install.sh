#!/usr/bin/env bash
set -euo pipefail

LATEST=$(curl -fsSL "https://go.dev/VERSION?m=text" | head -1)
TMP_TAR="$(mktemp -u).tar.gz"
curl -fsSL -o "$TMP_TAR" "https://go.dev/dl/${LATEST}.linux-amd64.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "$TMP_TAR"
rm -f "$TMP_TAR"

if ! grep -q '/usr/local/go/bin' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export PATH=$PATH:/usr/local/go/bin' >> "$HOME/.bashrc"
fi
