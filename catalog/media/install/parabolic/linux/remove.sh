#!/usr/bin/env bash
set -euo pipefail

# Nothing to uninstall if flatpak isn't even present.
command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
if flatpak info --user org.nickvision.tubeconverter &>/dev/null; then
  flatpak uninstall --user org.nickvision.tubeconverter -y
elif flatpak info --system org.nickvision.tubeconverter &>/dev/null; then
  flatpak uninstall --system org.nickvision.tubeconverter -y
fi
