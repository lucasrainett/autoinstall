#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
#
# Asks Gear Lever rather than looking for a file: it owns the AppImage folder, that folder is
# user-configurable, and hardcoding a path was a real bug in this catalog once.
# WinBoat ships a .deb as well as an AppImage, and this must recognise both. Checking only the
# AppImage reported it absent on a machine that had installed the deb — the same blindness that
# hid a deb-installed Steam behind a Flathub-only check.
if dpkg-query -W -f='${Status}' winboat 2>/dev/null | grep -q '^install ok installed$'; then
  installed=$(dpkg-query -W -f='${Version}' winboat 2>/dev/null)
  candidate=$(apt-cache policy winboat 2>/dev/null | awk '/Candidate:/ {print $2}')
  if [ -n "$candidate" ] && [ "$candidate" != "(none)" ] && [ "$installed" != "$candidate" ]; then
    exit 2
  fi
  exit 0
fi

command -v flatpak >/dev/null 2>&1 || exit 1
# Presence is asked of `flatpak list`, not `flatpak info`. With two branches of the same app
# installed — master and stable, say — `info` refuses to answer and exits non-zero, which reported
# installed software as absent and had the tool offer to install yet another copy.
flatpak list --columns=application 2>/dev/null | grep -qx "it.mijorus.gearlever" || exit 1

flatpak run it.mijorus.gearlever --list-installed 2>/dev/null | grep -qi "winboat" || exit 1

if flatpak run it.mijorus.gearlever --list-updates 2>/dev/null | grep -qi "winboat"; then
  exit 2
fi
exit 0
