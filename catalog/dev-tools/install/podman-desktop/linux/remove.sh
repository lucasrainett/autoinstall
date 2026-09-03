#!/usr/bin/env bash
set -euo pipefail

# Nothing to uninstall if flatpak isn't even present.
command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
if flatpak info --user io.podman_desktop.PodmanDesktop &>/dev/null; then
  flatpak uninstall --user io.podman_desktop.PodmanDesktop -y
elif flatpak info --system io.podman_desktop.PodmanDesktop &>/dev/null; then
  flatpak uninstall --system io.podman_desktop.PodmanDesktop -y
fi
