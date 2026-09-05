#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

dpkg-query -W -f='${Status}' kdeconnect 2>/dev/null | grep -q '^install ok installed' || exit 1

# apt lists the package under "Listing..." only when a newer candidate exists.
if apt list --upgradable 2>/dev/null | grep -q '^kdeconnect/'; then
  exit 2
fi
exit 0
