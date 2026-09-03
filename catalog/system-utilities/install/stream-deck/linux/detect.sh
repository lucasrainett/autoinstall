#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
flatpak info com.core447.StreamController &>/dev/null || exit 1

# Deployed commit vs the cached remote commit; "--cached" keeps this offline, and an unknown
# remote simply reports "current" rather than inventing an update.
# Resolve which installation holds it before asking anything about it.
scope=--user
flatpak info --user com.core447.StreamController &>/dev/null || scope=--system

installed=$(flatpak info "$scope" --show-commit com.core447.StreamController 2>/dev/null)
remote=$(flatpak remote-info "$scope" --cached flathub com.core447.StreamController --show-commit 2>/dev/null)
if [ -n "$installed" ] && [ -n "$remote" ] && [ "$installed" != "$remote" ]; then
  exit 2
fi
exit 0
