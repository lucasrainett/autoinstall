#!/usr/bin/env bash
set -euo pipefail

# Anthropic's own apt repository — the channel claude.ai/download documents for Debian-family
# Linux, and the one this catalog's reference machine was already using.
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Note `gpg --dearmor` writes to stdout here rather than taking `-o <file>`: with `-o` it stops to
# ask "File '...' exists. Overwrite? (y/N)" on any re-run, which would hang a non-interactive install.
curl -fsSL https://downloads.claude.ai/claude-desktop/apt/claude-desktop-keyring.asc |
  gpg --dearmor > "$TMP_DIR/claude-desktop-keyring.gpg"
sudo install -m 0644 "$TMP_DIR/claude-desktop-keyring.gpg" \
  /usr/share/keyrings/claude-desktop-keyring.gpg

printf '%s\n' \
  "deb [signed-by=/usr/share/keyrings/claude-desktop-keyring.gpg] https://downloads.claude.ai/claude-desktop/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/claude-desktop.list >/dev/null

sudo apt update -y
sudo apt install -y claude-desktop
