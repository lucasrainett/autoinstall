#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
#
# Several package names are accepted because distributions disagree: Valve's own deb registers
# `steam-launcher`, Ubuntu's multiverse package is `steam-installer`, and some derivatives ship a
# plain `steam`. All of them mean the same thing to a user — Steam is installed from a deb.
for pkg in steam-launcher steam-installer steam; do
  if dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q '^install ok installed$'; then
    installed=$(dpkg-query -W -f='${Version}' "$pkg" 2>/dev/null)
    candidate=$(apt-cache policy "$pkg" 2>/dev/null | awk '/Candidate:/ {print $2}')
    if [ -n "$candidate" ] && [ "$candidate" != "(none)" ] && [ "$installed" != "$candidate" ]; then
      exit 2
    fi
    exit 0
  fi
done
exit 1
