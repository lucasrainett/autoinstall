#!/usr/bin/env bash
set -euo pipefail

# Proton doesn't publish an apt repo, only a versionless "always latest" .deb download URL.
# mktemp -u only reserves a *name* without creating the file, which is a race; create the
# directory for real and clean it up with a trap so a mid-script failure cannot leave a
# large .deb behind.
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
TMP_DEB="$TMP_DIR/package.deb"
# Retried: Proton's download server answered HTTP 503 on two runners at once, an outage on their
# side that cleared on its own. A transient failure should not fail the install.
curl -fsSL --retry 3 --retry-delay 5 --retry-all-errors -o "$TMP_DEB" "https://proton.me/download/mail/linux/ProtonMail-desktop-beta.deb"

# Refresh package lists first: installing a local .deb still resolves its dependencies
# through apt, which fails on a machine whose lists are stale or absent.
sudo apt update -y
sudo apt install -y "$TMP_DEB"
