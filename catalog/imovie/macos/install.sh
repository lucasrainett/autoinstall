#!/usr/bin/env bash
set -euo pipefail

# Reinstalling is a Mac App Store operation, and the store has no unattended install command for
# a signed-in user's purchases. Rather than pretend otherwise, this opens the store page so the
# reinstall is one click away — and says clearly that it did not install anything itself.
if [ -d "/Applications/iMovie.app" ]; then
  echo "iMovie is already installed."
  exit 0
fi

echo "iMovie is distributed through the Mac App Store, which cannot be driven unattended."
echo "Opening its App Store page — press Get/Download there to reinstall it."
open "macappstore://apps.apple.com/app/id408981434" 2>/dev/null || true
