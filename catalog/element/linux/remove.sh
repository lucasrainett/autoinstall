#!/usr/bin/env bash
set -euo pipefail

command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
if flatpak info --user im.riot.Riot &>/dev/null; then
  flatpak uninstall --user im.riot.Riot -y
elif flatpak info --system im.riot.Riot &>/dev/null; then
  flatpak uninstall --system im.riot.Riot -y
fi
