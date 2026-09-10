#!/usr/bin/env bash
set -euo pipefail

# Nothing installed, nothing to say. Without this the script runs its whole course on a machine
# that never had snapd and then announces "snapd removed", which is untrue and the kind of output
# that teaches people to stop reading it.
dpkg-query -W -f='${Status}' snapd 2>/dev/null | grep -q '^install ok installed$' || {
  echo "snapd is not installed; nothing to do."
  exit 0
}

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

# Stopped and masked before the purge: a running snapd keeps its mounts busy, and dpkg then fails
# partway through with squashfs mounts still attached — a worse state than either before or after.
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl stop snapd.socket snapd.service 2>/dev/null || true
  sudo systemctl disable snapd.socket snapd.service 2>/dev/null || true
fi

sudo apt remove --purge -y "${PACKAGES[@]}"
sudo apt autoremove -y

# A purge leaves these behind, and on a machine that had snaps they are gigabytes of squashfs
# images. Each is removed only if nothing is still mounted under it: force-unmounting would risk
# data loss for a snap that somehow survived, and leaving a stale mount is recoverable while a
# broken unmount is not.
for dir in /snap /var/lib/snapd /var/cache/snapd; do
  if [ -d "$dir" ]; then
    if mount | grep -q " ${dir}/"; then
      echo "Left $dir in place: something is still mounted under it."
    else
      sudo rm -rf "$dir"
    fi
  fi
done

# The per-user snap folder holds each user's snap data. Only the invoking user's is touched —
# deleting other people's home directories is far beyond "uninstall snapd".
USER_HOME=$(getent passwd "${SUDO_USER:-$(id -un)}" 2>/dev/null | cut -d: -f6 || true)
USER_HOME="${USER_HOME:-$HOME}"
if [ -n "$USER_HOME" ] && [ -d "$USER_HOME/snap" ]; then
  rm -rf "$USER_HOME/snap"
fi

echo "snapd removed. No apt pin was added, so 'apt install snapd' still works if you want it back."
