#!/usr/bin/env bash
set -euo pipefail

# Checked explicitly: without it the script dies with a bare "command not found" and exit 127,
# which tells the user nothing about what to do. The startup scan also warns when a package
# manager the catalog needs is missing, but a script run by hand must explain itself too.
if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak is not installed; install it (and add the Flathub remote) then re-run this entry." >&2
  exit 1
fi

# Cryptomator ships the AppImage as its primary Linux download (cryptomator.org/downloads/linux
# leads with it; Flatpak/PPA/AUR/NixOS are listed as secondary "you'll also find it here" repos).
#
# Deliberately NOT the Flathub flatpak, even though that listing is vendor-verified: the flatpak
# sandbox restricts filesystem access, so Cryptomator can't reach vaults living in arbitrary
# locations (cloud-sync folders, external drives) without per-path overrides. That defeats the
# point of an app whose whole job is unlocking vaults wherever they happen to live.
#
# Gear Lever does the desktop integration (launcher entry, icon, update tracking) instead of this
# script hand-rolling .desktop and icon files. Note Gear Lever is itself a flatpak, but it only
# manages files — the AppImage it integrates still runs natively and unsandboxed, so none of the
# filesystem restriction above applies to Cryptomator itself.

case "$(uname -m)" in
  x86_64) ARCH="x86_64" ;;
  aarch64 | arm64) ARCH="aarch64" ;;
  *)
    echo "unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

# Every flatpak command names its installation. Flathub is commonly configured in more than one
# installation at once — Zorin OS ships a system flathub alongside the per-user one — and an
# unscoped command then fails with "No remote chosen to resolve matches for <app>" under
# --noninteractive. That single omission accounted for 18 of the 22 failures on a real machine.
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub it.mijorus.gearlever -y --noninteractive

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

VERSION=$(curl -fsSL https://api.github.com/repos/cryptomator/cryptomator/releases/latest |
  grep -oP '"tag_name": "\K[^"]+')
# The filename here becomes the name Gear Lever stores it under, so keep it stable and lowercase.
curl -fsSL -o "$TMP_DIR/cryptomator.appimage" \
  "https://github.com/cryptomator/cryptomator/releases/download/${VERSION}/cryptomator-${VERSION}-${ARCH}.AppImage"
chmod +x "$TMP_DIR/cryptomator.appimage"

flatpak run it.mijorus.gearlever --integrate "$TMP_DIR/cryptomator.appimage" -y
