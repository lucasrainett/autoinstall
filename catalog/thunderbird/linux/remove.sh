#!/usr/bin/env bash
set -euo pipefail

PACKAGES=("thunderbird")

# The check runs before anything is removed, so exit 3 means what it says: nothing changed. Doing
# it the other way round — remove first, check the apt package second — would have exited 3 after
# the snap was already gone. `apt-get -s remove` on a package that is not installed lists nothing,
# so this is a no-op on a machine that only has the snap.

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

# Removes the snap — the actual application. Removing only the apt package would leave Thunderbird
# fully installed and working, which is the trap this entry exists to avoid: neither the deb's
# prerm nor its postrm touches the snap (verified by unpacking the package's maintainer scripts).
# `snap list` blocks when snapd is installed but its daemon is not running: it keeps retrying the
# socket rather than failing. Proven in an Ubuntu 24.04 container, where the thunderbird deb pulls
# snapd in as a dependency but nothing starts it — this script hung indefinitely and only the
# harness timeout ended it. The same shape exists on any machine where snapd is masked or disabled.
# `command -v snap` is not enough; the socket has to actually be there, and the call is bounded as
# well so a wedged daemon costs ten seconds rather than the run.
snap_usable() {
  command -v snap >/dev/null 2>&1 && [ -S /run/snapd.socket ]
}

if snap_usable && timeout 10 snap list thunderbird >/dev/null 2>&1; then
  sudo snap remove thunderbird
fi

# The apt shim is useless once the snap is gone — it exists only to point at it — so clear it too
# if the distribution installed one. Guarded because many systems will not have it.
if dpkg-query -W -f='${Status}' thunderbird 2>/dev/null | grep -q '^install ok installed$'; then
  sudo apt remove --purge -y "${PACKAGES[@]}"
fi
