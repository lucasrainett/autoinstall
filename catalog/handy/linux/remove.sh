#!/usr/bin/env bash
set -euo pipefail

# Gear Lever's --list-installed output is column-padded, so a value taken with
# `sed 's/^Name.*\]  *//p'` carries the padding with it and the path ends in spaces. Gear Lever
# then answers "please specify a valid AppImage file" and the removal silently does nothing — the
# entry stayed installed and the run recorded a failed removal. Proven against the real output:
# sed yielded "/home/u/AppImages/handy.appimage          ", awk yields it clean.
#
# The last field is the path in every row, including names that contain spaces ("T3 Code (Alpha)").
command -v flatpak >/dev/null 2>&1 || { echo "flatpak is not installed; nothing to remove."; exit 0; }
flatpak info it.mijorus.gearlever &>/dev/null || {
  echo "Gear Lever is not installed, so nothing was integrated through it."; exit 0; }

APPIMAGE=$(flatpak run it.mijorus.gearlever --list-installed 2>/dev/null |
  awk '/^Handy/ { print $NF }' | head -1)

if [ -z "$APPIMAGE" ]; then
  echo "Handy is not integrated with Gear Lever; nothing to remove."
  exit 0
fi

flatpak run it.mijorus.gearlever --remove "$APPIMAGE" -y
