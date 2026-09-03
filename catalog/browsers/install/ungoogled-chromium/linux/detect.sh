#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

flatpak info io.github.ungoogled_software.ungoogled_chromium &>/dev/null || exit 1

# Compares the deployed commit against the cached remote commit — "--cached" keeps this offline;
# an unknown remote commit means we simply report "current" instead of inventing an update.
# Resolve which installation holds it before asking anything about it.
scope=--user
flatpak info --user io.github.ungoogled_software.ungoogled_chromium &>/dev/null || scope=--system

installed=$(flatpak info "$scope" --show-commit io.github.ungoogled_software.ungoogled_chromium 2>/dev/null)
remote=$(flatpak remote-info "$scope" --cached flathub io.github.ungoogled_software.ungoogled_chromium --show-commit 2>/dev/null)
if [ -n "$installed" ] && [ -n "$remote" ] && [ "$installed" != "$remote" ]; then
  exit 2
fi
exit 0
