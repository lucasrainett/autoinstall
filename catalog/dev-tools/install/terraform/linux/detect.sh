#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

dpkg-query -W -f='${Status}' terraform 2>/dev/null | grep -q '^install ok installed$' || exit 1

# Compares the installed version against apt's candidate. Uses apt-cache (no sudo, no network):
# if the machine's package lists are stale the candidate simply equals the installed version and
# this correctly reports "current" rather than guessing.
installed=$(dpkg-query -W -f='${Version}' terraform 2>/dev/null)
candidate=$(apt-cache policy terraform 2>/dev/null | awk '/Candidate:/ {print $2}')
if [ -n "$candidate" ] && [ "$candidate" != "(none)" ] && [ "$installed" != "$candidate" ]; then
  exit 2
fi
exit 0
