#!/usr/bin/env bash
set -euo pipefail

# Whichever name this distribution used.
APT_PKG=""
for pkg in steam-launcher steam-installer steam; do
  if dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q '^install ok installed$'; then
    APT_PKG="$pkg"
    break
  fi
done
[ -n "$APT_PKG" ] || exit 0

PACKAGES=("$APT_PKG")

# Steam's own runtime packages (steam-libs*) exist only to support it and are expected casualties;
# anything outside that family still aborts. The i386 architecture is deliberately left enabled —
# other software may rely on it, and removing it is far beyond "uninstall Steam".
EXPECTED_PREFIX="steam"
COLLATERAL=$(apt-get -s remove --purge "${PACKAGES[@]}" 2>/dev/null |
  awk '/^Remv/ {print $2}' |
  grep -v "^${EXPECTED_PREFIX}" || true)

if [ -n "$COLLATERAL" ]; then
  echo "Skipping removal of ${PACKAGES[*]}: apt would also remove unrelated software:"
  printf '  - %s\n' $COLLATERAL
  echo "Left installed. Remove those packages explicitly first if that is really intended."
  # Exit 3, not 0: the engine verifies each action by re-running detect.sh afterwards, and this
  # entry is deliberately still installed. Reporting success would make that check call a correct,
  # protective decision a failure; 3 means "declined, nothing changed".
  exit 3
fi

sudo apt remove --purge -y "${PACKAGES[@]}"
sudo apt autoremove -y
