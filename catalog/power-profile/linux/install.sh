#!/usr/bin/env bash
set -euo pipefail

if ! command -v powerprofilesctl >/dev/null 2>&1; then
  echo "power-profiles-daemon is not installed, so there is no profile to set." >&2
  exit 3
fi

# Not every machine offers 'performance' — it depends on the platform profile the firmware
# exposes. Saying so beats a bare failure from powerprofilesctl.
if ! powerprofilesctl list 2>/dev/null | grep -q "performance"; then
  echo "This machine's firmware offers no 'performance' profile." >&2
  exit 3
fi

powerprofilesctl set performance
echo "Power profile set to performance."
