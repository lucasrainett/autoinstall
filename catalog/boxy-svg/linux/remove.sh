#!/usr/bin/env bash
set -euo pipefail

# Nothing to uninstall if flatpak isn't even present.
command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
if flatpak info --user com.boxy_svg.BoxySVG &>/dev/null; then
  flatpak uninstall --user com.boxy_svg.BoxySVG -y
elif flatpak info --system com.boxy_svg.BoxySVG &>/dev/null; then
  flatpak uninstall --system com.boxy_svg.BoxySVG -y
fi
