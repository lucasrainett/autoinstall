#!/usr/bin/env bash
set -euo pipefail

command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
if flatpak info --user com.markdeepwell.GitY &>/dev/null; then
  flatpak uninstall --user com.markdeepwell.GitY -y
elif flatpak info --system com.markdeepwell.GitY &>/dev/null; then
  flatpak uninstall --system com.markdeepwell.GitY -y
fi
