#!/usr/bin/env bash
# Exit 0 = every tool is installed and current, 1 = at least one is missing, 2 = an update exists.
#
# A bundle is "installed" only when all of it is: reporting satisfied while a member is missing
# would leave the plan with nothing to do and the tool still absent.
NEEDS_UPDATE=0
for pkg in unzip zip tree tmux htop net-tools build-essential; do
  dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q '^install ok installed$' || exit 1
  installed=$(dpkg-query -W -f='${Version}' "$pkg" 2>/dev/null)
  candidate=$(apt-cache policy "$pkg" 2>/dev/null | awk '/Candidate:/ {print $2}')
  if [ -n "$candidate" ] && [ "$candidate" != "(none)" ] && [ "$installed" != "$candidate" ]; then
    NEEDS_UPDATE=1
  fi
done
[ "$NEEDS_UPDATE" -eq 1 ] && exit 2
exit 0
