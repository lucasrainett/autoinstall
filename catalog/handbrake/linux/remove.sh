#!/usr/bin/env bash
set -euo pipefail

# Nothing to uninstall if flatpak isn't even present.
command -v flatpak >/dev/null 2>&1 || exit 0

# Remove it from whichever installation holds it; an unscoped uninstall is ambiguous
# when the same remote is configured in more than one.
# Every installation, not the first one found. `if/elif` removed the user copy and left a
# system-wide one behind, after which detect correctly reported the entry as still present and the
# removal was recorded as having failed.
for scope in --user --system; do
  if flatpak info "$scope" fr.handbrake.ghb &>/dev/null; then
    flatpak uninstall "$scope" fr.handbrake.ghb -y
  fi
done
