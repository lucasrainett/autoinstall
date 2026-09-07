#!/usr/bin/env bash
set -euo pipefail

# Updates the app in *every* installation that holds it, not just one.
#
# An app can be installed both system-wide and per-user at the same time — Bottles was, on the
# machine where this was found, and 90 of that machine's 100 flatpaks were system-wide. Updating
# only --user left the system copy stale, so detect kept reporting "update available" immediately
# after a successful update, and the run was recorded as a failure.
command -v flatpak >/dev/null 2>&1 || {
  echo "flatpak is not installed; nothing to update." >&2
  exit 1
}

updated=0
for scope in --user --system; do
  if flatpak info "$scope" org.freeplane.App &>/dev/null; then
    flatpak update "$scope" org.freeplane.App -y --noninteractive
    updated=1
  fi
done

if [ "$updated" -eq 0 ]; then
  echo "org.freeplane.App is not installed in any flatpak installation." >&2
  exit 1
fi
