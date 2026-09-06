#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
dpkg-query -W -f='${Status}' brave-browser 2>/dev/null | grep -q '^install ok installed$' || exit 1

installed=$(dpkg-query -W -f='${Version}' brave-browser 2>/dev/null)
candidate=$(apt-cache policy brave-browser 2>/dev/null | awk '/Candidate:/ {print $2}')
if [ -n "$candidate" ] && [ "$candidate" != "(none)" ] && [ "$installed" != "$candidate" ]; then
  exit 2
fi
exit 0
