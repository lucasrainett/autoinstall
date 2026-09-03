#!/usr/bin/env bash
set -euo pipefail

PACKAGES=("brave-browser")

# Brave's own subpackages (brave-browser-beta/-nightly, if the user added a channel) are expected
# casualties; anything outside that family still aborts. `apt remove` otherwise silently drags out
# every reverse-dependency — measured on a real machine, removing `curl` would also have
# uninstalled Steam.
EXPECTED_PREFIX="brave-browser"
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

# Also drop Brave's apt repo and signing key, so the machine stops tracking updates for a browser
# it no longer has. Left in place these would keep `apt update` reaching out to Brave forever.
sudo rm -f /etc/apt/sources.list.d/brave-browser-release.list \
  /usr/share/keyrings/brave-browser-archive-keyring.gpg
