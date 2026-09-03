#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# Presence is asked of `flatpak list`, not `flatpak info`. With two branches of the same app
# installed — master and stable, say — `info` refuses to answer and exits non-zero, which reported
# installed software as absent and had the tool offer to install yet another copy.
flatpak list --columns=application 2>/dev/null | grep -qx "ai.jan.Jan" || exit 1

# Deployed commit vs the cached remote commit; "--cached" keeps this offline, and an unknown
# remote simply reports "current" rather than inventing an update.
# Resolve which installation holds it before asking anything about it.
scope=--user
flatpak info --user ai.jan.Jan &>/dev/null || scope=--system

# The update check needs one specific installation and branch. When that cannot be resolved —
# several branches present — the honest answer is "installed, and no update is being claimed".
installed=$(flatpak info "$scope" --show-commit ai.jan.Jan 2>/dev/null) || exit 0
remote=$(flatpak remote-info "$scope" --cached flathub ai.jan.Jan --show-commit 2>/dev/null)
if [ -n "$installed" ] && [ -n "$remote" ] && [ "$installed" != "$remote" ]; then
  exit 2
fi
exit 0
