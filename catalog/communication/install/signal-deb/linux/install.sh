#!/usr/bin/env bash
set -euo pipefail

# Signal's own Linux channel is their apt repo: signal.org/download/linux documents apt (and their
# separately-signed AppImage) and never mentions Flatpak at all.
#
# Deliberately NOT the Flathub build: unlike this catalog's other flatpaks it is NOT vendor-verified
# (flathub.org/api/v2/verification/org.signal.Signal/status reports verified=false), i.e. it is
# community-maintained rather than published by Signal. It also needed a SIGNAL_PASSWORD_STORE
# override just to reach the system keyring through the sandbox — a symptom of the sandbox fighting
# the app, not a supported configuration.

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Note `gpg --dearmor` writes to stdout here rather than taking `-o <file>`: with `-o` it stops to
# ask "File '...' exists. Overwrite? (y/N)" on any re-run, which would hang a non-interactive install.
curl -fsSL https://updates.signal.org/desktop/apt/keys.asc |
  gpg --dearmor > "$TMP_DIR/signal-desktop-keyring.gpg"
sudo install -m 0644 "$TMP_DIR/signal-desktop-keyring.gpg" \
  /usr/share/keyrings/signal-desktop-keyring.gpg

# Signal publishes a deb822 .sources file (it carries its own Signed-By pointing at the keyring
# installed above), so fetch theirs rather than hand-writing a sources entry that could drift.
curl -fsSL -o "$TMP_DIR/signal-desktop.sources" \
  https://updates.signal.org/static/desktop/apt/signal-desktop.sources
sudo install -m 0644 "$TMP_DIR/signal-desktop.sources" \
  /etc/apt/sources.list.d/signal-desktop.sources

sudo apt update -y
sudo apt install -y signal-desktop
