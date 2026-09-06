#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
brew list --formula freerdp &>/dev/null || exit 1

# `brew outdated` prints the package only when a newer version is available.
if brew outdated --formula --quiet freerdp 2>/dev/null | grep -q .; then
  exit 2
fi
exit 0
