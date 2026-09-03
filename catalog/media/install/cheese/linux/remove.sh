#!/usr/bin/env bash
set -euo pipefail

PACKAGES=("cheese")

# The app's own subpackages are expected casualties; anything outside that family is not, and
# aborts rather than quietly taking unrelated software with it.
EXPECTED_PREFIX="cheese"
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
