#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

# Presence is asked of `flatpak list`, not `flatpak info`. With two branches of the same app
# installed — master and stable, say — `info` refuses to answer and exits non-zero, which reported
# installed software as absent and had the tool offer to install yet another copy.
flatpak list --columns=application 2>/dev/null | grep -qx "io.podman_desktop.PodmanDesktop" || exit 1

# Compares the deployed commit against the cached remote commit — "--cached" keeps this offline;
# an unknown remote commit means we simply report "current" instead of inventing an update.
# Resolve which installation holds it before asking anything about it.
scope=--user
flatpak info --user io.podman_desktop.PodmanDesktop &>/dev/null || scope=--system

# The update check needs one specific installation and branch. When that cannot be resolved —
# several branches present — the honest answer is "installed, and no update is being claimed".
installed=$(flatpak info "$scope" --show-commit io.podman_desktop.PodmanDesktop 2>/dev/null) || exit 0
remote=$(flatpak remote-info "$scope" --cached flathub io.podman_desktop.PodmanDesktop --show-commit 2>/dev/null)
if [ -n "$installed" ] && [ -n "$remote" ] && [ "$installed" != "$remote" ]; then
  exit 2
fi
exit 0
