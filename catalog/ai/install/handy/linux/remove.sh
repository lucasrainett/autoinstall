#!/usr/bin/env bash
set -euo pipefail

command -v flatpak >/dev/null 2>&1 || exit 0
flatpak info it.mijorus.gearlever &>/dev/null || exit 0

# Gear Lever owns the file and the desktop entry, so it does the removal; deleting the AppImage by
# hand would leave a launcher pointing at nothing.
flatpak run it.mijorus.gearlever --remove handy -y 2>/dev/null || true
