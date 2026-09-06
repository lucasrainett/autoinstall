#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

brew list --cask zen &>/dev/null || exit 1

# `brew outdated` prints the package only when a newer version is available.
if brew outdated --cask --quiet zen 2>/dev/null | grep -q .; then
  exit 2
fi
exit 0
