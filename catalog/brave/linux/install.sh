#!/usr/bin/env bash
set -euo pipefail

# Brave's own Linux channel is their apt repo (brave.com/linux). Deliberately not the Flathub
# build: that one is community-maintained rather than published by Brave, and a browser is
# exactly the wrong place to accept an unverified publisher.

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Note `gpg --dearmor` writes to stdout here rather than taking `-o <file>`: with `-o` it stops to
# ask "File '...' exists. Overwrite? (y/N)" on any re-run, which would hang a non-interactive install.
curl -fsSL https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg |
  gpg --dearmor > "$TMP_DIR/brave-browser-archive-keyring.gpg"
sudo install -m 0644 "$TMP_DIR/brave-browser-archive-keyring.gpg" \
  /usr/share/keyrings/brave-browser-archive-keyring.gpg

printf '%s\n' \
  "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" \
  | sudo tee /etc/apt/sources.list.d/brave-browser-release.list >/dev/null

sudo apt update -y
sudo apt install -y brave-browser
