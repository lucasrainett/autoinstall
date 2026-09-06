#!/usr/bin/env bash
set -euo pipefail

# Proton doesn't publish an apt repo, only a versionless "always latest" .deb download URL.
# mktemp -u only reserves a *name* without creating the file, which is a race; create the
# directory for real and clean it up with a trap so a mid-script failure cannot leave a
# large .deb behind.
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
TMP_DEB="$TMP_DIR/package.deb"
curl -fsSL -o "$TMP_DEB" "https://proton.me/download/mail/linux/ProtonMail-desktop-beta.deb"

# Refresh package lists first: installing a local .deb still resolves its dependencies
# through apt, which fails on a machine whose lists are stale or absent.
sudo apt update -y
sudo apt install -y "$TMP_DEB"
