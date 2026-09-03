#!/usr/bin/env bash
set -euo pipefail

# Two-step: first install Proton's "release" package, which registers their apt repo and signing
# key; only then is the actual app (proton-vpn-gnome-desktop) available to apt install.
RELEASE_DEB=$(curl -fsSL "https://repo.protonvpn.com/debian/dists/stable/main/binary-all/Packages" \
  | awk '/^Package: protonvpn-stable-release/{found=1} found && /^Filename:/{print $2; found=0}' \
  | tail -1)
TMP_DEB="$(mktemp -u).deb"
curl -fsSL -o "$TMP_DEB" "https://repo.protonvpn.com/debian/${RELEASE_DEB}"
sudo apt install -y "$TMP_DEB"
rm -f "$TMP_DEB"
sudo apt update
sudo apt install -y proton-vpn-gnome-desktop
