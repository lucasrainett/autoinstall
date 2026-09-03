#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
flatpak info com.github.tchx84.Flatseal &>/dev/null || exit 1

# Deployed commit vs the cached remote commit; "--cached" keeps this offline, and an unknown
# remote simply reports "current" rather than inventing an update.
# Resolve which installation holds it before asking anything about it.
scope=--user
flatpak info --user com.github.tchx84.Flatseal &>/dev/null || scope=--system

installed=$(flatpak info "$scope" --show-commit com.github.tchx84.Flatseal 2>/dev/null)
remote=$(flatpak remote-info "$scope" --cached flathub com.github.tchx84.Flatseal --show-commit 2>/dev/null)
if [ -n "$installed" ] && [ -n "$remote" ] && [ "$installed" != "$remote" ]; then
  exit 2
fi
exit 0
