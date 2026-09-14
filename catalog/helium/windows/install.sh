#!/usr/bin/env bash
set -euo pipefail

# No winget package exists for Helium, so this downloads the official mini-installer directly
# from GitHub releases (imputnet/helium-windows) rather than going through winget — same spirit
# as Obtainium's "track the latest release and install it directly" approach. `/silent /install`
# is a real, published silent-install invocation for a Chromium mini_installer.exe (confirmed
# against eloston.ungoogled-chromium's actual winget manifest) — NOT independently verified
# against Helium's own binary: Helium's own README states its Windows packaging is only "based
# on" ungoogled-chromium-windows and "heavily modified", so this is a well-reasoned inference
# from shared lineage, not a direct test. Flag rather than trust blindly if this misbehaves.
# Resolved from the web redirect, not api.github.com. The API allows 60 unauthenticated requests an
# hour per address, shared by every job on a CI runner's IP, and it answered helium's Windows
# install with HTTP 403. /releases/latest redirects to /releases/tag/<version> and is not counted.
VERSION=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/imputnet/helium-windows/releases/latest |
  sed 's|.*/tag/||')
case "$VERSION" in
  "" | */*) echo "Could not resolve the latest imputnet/helium-windows release." >&2; exit 1 ;;
esac
INSTALLER="$(mktemp -u).exe"
curl -fsSL -o "$INSTALLER" \
  "https://github.com/imputnet/helium-windows/releases/download/${VERSION}/helium_${VERSION}_x64-mini-installer.exe"
# MSYS_NO_PATHCONV, because this runs under Git Bash: an argument that looks like a POSIX path is
# rewritten to a Windows one before the native program sees it, so /s becomes something like
# C:/Program Files/Git/s. reg.exe answered "ERROR: Invalid syntax", VLC's uninstaller took /S as a
# path and silently did nothing while still exiting 0, and Helium's installer ignored
# /silent /install the same way. The switch is passed through unchanged with this set.
MSYS_NO_PATHCONV=1 "$INSTALLER" /silent /install
rm -f "$INSTALLER"
