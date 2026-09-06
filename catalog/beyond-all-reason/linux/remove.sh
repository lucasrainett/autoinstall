#!/usr/bin/env bash
set -euo pipefail

command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
if flatpak info --user info.beyondallreason.bar &>/dev/null; then
  flatpak uninstall --user info.beyondallreason.bar -y
elif flatpak info --system info.beyondallreason.bar &>/dev/null; then
  flatpak uninstall --system info.beyondallreason.bar -y
fi
