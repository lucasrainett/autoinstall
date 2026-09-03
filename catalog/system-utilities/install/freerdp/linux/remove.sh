#!/usr/bin/env bash
set -euo pipefail

PACKAGES=(freerdp3-x11)

# `apt remove` silently drags out every reverse-dependency too. Measured on a real machine:
# removing `curl` would also have uninstalled Steam, and removing `python3-pip` would have
# uninstalled howdy (a PAM authentication module). Uninstalling one catalog entry must never
# quietly take unrelated software with it, so refuse and report instead of guessing.
COLLATERAL=$(apt-get -s remove "${PACKAGES[@]}" 2>/dev/null |
  awk '/^Remv/ {print $2}' |
  grep -vxF -f <(printf '%s\n' "${PACKAGES[@]}") || true)

if [ -n "$COLLATERAL" ]; then
  # Skip, don't fail: declining to touch unrelated software is the correct outcome here, not an
  # error. Uninstalling one entry must never remove anything the user didn't ask about.
  echo "Skipping removal of ${PACKAGES[*]}: apt would also remove:"
  printf '  - %s\n' $COLLATERAL
  echo "Left installed. Remove those packages explicitly first if that is really intended."
  # Exit 3, not 0: the engine verifies each action by re-running detect.sh afterwards, and this
  # entry is deliberately still installed. Reporting success would make that check call a correct,
  # protective decision a failure; 3 means "declined, nothing changed".
  exit 3
fi

sudo apt remove -y "${PACKAGES[@]}"
