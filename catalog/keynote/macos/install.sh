#!/usr/bin/env bash
set -euo pipefail

# Reinstalling is a Mac App Store operation, and the store has no unattended install command for
# a signed-in user's purchases. Rather than pretend otherwise, this opens the store page so the
# reinstall is one click away — and says clearly that it did not install anything itself.
if [ -d "/Applications/Keynote.app" ]; then
  echo "Keynote is already installed."
  exit 0
fi

# Mac App Store apps cannot be installed unattended, so this script cannot complete the install.
# It used to open the App Store page and exit 0 — claiming success while installing nothing, which
# the verification then caught as "detect still reports absent after install". Exit 3 is this
# catalog's "declined, nothing changed", and is the honest answer either way: with a desktop the
# App Store page is opened for the user to finish by hand, and the tool still cannot claim the
# install happened.
if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ ! -t 1 ]; then
  echo "This app is distributed through the Mac App Store, which cannot be driven" >&2
  echo "unattended. Nothing was changed. Install it from the App Store by hand if you want it." >&2
  exit 3
fi


echo "Keynote is distributed through the Mac App Store, which cannot be driven unattended."
echo "Opening its App Store page — press Get/Download there to reinstall it."
open "macappstore://apps.apple.com/app/id409183694" 2>/dev/null || true

# Opened, not installed — the tool cannot confirm what the user does in the App Store.
exit 3
