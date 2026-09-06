#!/usr/bin/env bash
set -euo pipefail

# Checked explicitly: without it the script dies with a bare "command not found" and exit 127,
# which tells the user nothing about what to do. The startup scan also warns when a package
# manager the catalog needs is missing, but a script run by hand must explain itself too.
if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak is not installed; install it (and add the Flathub remote) then re-run this entry." >&2
  exit 1
fi

# Helium publishes AppImage/tarball/deb builds on GitHub, with no apt repo or Flathub package.
# Gear Lever does the desktop integration (launcher entry, icon, update tracking) instead of
# leaving a loose executable in a folder with no way to launch it from the desktop.

# Every flatpak command names its installation. Flathub is commonly configured in more than one
# installation at once — Zorin OS ships a system flathub alongside the per-user one — and an
# unscoped command then fails with "No remote chosen to resolve matches for <app>" under
# --noninteractive. That single omission accounted for 18 of the 22 failures on a real machine.
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub it.mijorus.gearlever -y --noninteractive

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

VERSION=$(curl -fsSL https://api.github.com/repos/imputnet/helium-linux/releases/latest |
  grep -oP '"tag_name": "\K[^"]+')
# The filename here becomes the name Gear Lever stores it under, so keep it stable and lowercase.
curl -fsSL -o "$TMP_DIR/helium.appimage" \
  "https://github.com/imputnet/helium-linux/releases/download/${VERSION}/helium-${VERSION}-x86_64.AppImage"
chmod +x "$TMP_DIR/helium.appimage"

flatpak run it.mijorus.gearlever --integrate "$TMP_DIR/helium.appimage" -y
