#!/usr/bin/env bash
set -euo pipefail

if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak is not installed; install it (and add the Flathub remote) then re-run this entry." >&2
  exit 1
fi

# Every flatpak command names its installation: flathub is commonly configured in more than one at
# once, and an unscoped command then fails under --noninteractive.
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub it.mijorus.gearlever -y --noninteractive

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

VERSION=$(curl -fsSL https://api.github.com/repos/cjpais/Handy/releases/latest |
  grep -oP '"tag_name": "\K[^"]+')
BARE=${VERSION#v}
# The filename here becomes the name Gear Lever stores it under, so keep it stable and lowercase.
curl -fsSL -o "$TMP_DIR/handy.appimage" \
  "https://github.com/cjpais/Handy/releases/download/${VERSION}/Handy_${BARE}_amd64.AppImage"
chmod +x "$TMP_DIR/handy.appimage"

flatpak run it.mijorus.gearlever --integrate "$TMP_DIR/handy.appimage" -y
