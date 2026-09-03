#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

flatpak run it.mijorus.gearlever --list-installed 2>/dev/null | grep -qi '^Beeper' || exit 1

# Gear Lever tracks each AppImage's update source and reports the ones with updates available.
if flatpak run it.mijorus.gearlever --list-updates 2>/dev/null | grep -qi 'beeper'; then
  exit 2
fi
exit 0
