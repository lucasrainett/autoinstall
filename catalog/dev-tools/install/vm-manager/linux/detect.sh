#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

# GNOME Boxes ships both ways and this must recognise both. Checking only the deb reported it
# absent on a machine that plainly had the flatpak — the same blindness that hid a deb-installed
# Steam behind a Flathub-only check.
if flatpak info org.gnome.Boxes &>/dev/null; then
  scope=--user
  flatpak info --user org.gnome.Boxes &>/dev/null || scope=--system
  installed=$(flatpak info "$scope" --show-commit org.gnome.Boxes 2>/dev/null)
  remote=$(flatpak remote-info "$scope" --cached flathub org.gnome.Boxes --show-commit 2>/dev/null)
  if [ -n "$installed" ] && [ -n "$remote" ] && [ "$installed" != "$remote" ]; then
    exit 2
  fi
  exit 0
fi

dpkg-query -W -f='${Status}' gnome-boxes 2>/dev/null | grep -q '^install ok installed$' || exit 1

# Compares the installed version against apt's candidate. Uses apt-cache (no sudo, no network):
# if the machine's package lists are stale the candidate simply equals the installed version and
# this correctly reports "current" rather than guessing.
installed=$(dpkg-query -W -f='${Version}' gnome-boxes 2>/dev/null)
candidate=$(apt-cache policy gnome-boxes 2>/dev/null | awk '/Candidate:/ {print $2}')
if [ -n "$candidate" ] && [ "$candidate" != "(none)" ] && [ "$installed" != "$candidate" ]; then
  exit 2
fi
exit 0
