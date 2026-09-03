#!/usr/bin/env bash
set -euo pipefail

# Installed snaps are removed first, because apt cannot purge snapd while they are mounted. Only
# what is actually installed is touched; nothing is force-unmounted.
if command -v snap >/dev/null 2>&1; then
  for s in $(snap list 2>/dev/null | tail -n +2 | awk '{print $1}'); do
    sudo snap remove --purge "$s" 2>/dev/null || true
  done
fi

# The GNOME Software plugin exists only to expose snaps in the software centre, so it is named as
# an intended part of this removal rather than left to trip the guard as "unrelated software".
# Anything genuinely unrelated — Firefox on stock Ubuntu, say — still stops the removal dead.
PACKAGES=(snapd gnome-software-plugin-snap)

# `apt remove` silently drags out every reverse-dependency too. This is exactly where that matters:
# on stock Ubuntu, Firefox is a snap and depends on snapd, so removing snapd would take the
# browser. The guard declines and says so rather than doing it quietly.
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

sudo apt remove --purge -y "${PACKAGES[@]}"
sudo apt autoremove -y
