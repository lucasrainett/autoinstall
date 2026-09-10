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
VERSION=$(curl -fsSL https://api.github.com/repos/imputnet/helium-windows/releases/latest | grep -oP '"tag_name": "\K[^"]+')
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
