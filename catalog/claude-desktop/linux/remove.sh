#!/usr/bin/env bash
set -euo pipefail

# Shared collateral guard: refuse rather than drag unrelated software out with it. Exit 3 means
# "declined, nothing changed", which the runner reports as a decline rather than a failure.
PACKAGES=(claude-desktop)

if ! dpkg-query -W -f='${Status}' claude-desktop 2>/dev/null | grep -q '^install ok installed'; then
  echo "claude-desktop is not installed; nothing to do."
  exit 0
fi

WOULD_REMOVE=$(apt-get -s remove --purge "${PACKAGES[@]}" 2>/dev/null \
  | awk '/^Remv /{print $2}' | sort -u)
UNEXPECTED=$(comm -23 <(printf '%s\n' "$WOULD_REMOVE") <(printf '%s\n' "${PACKAGES[@]}" | sort -u))

if [ -n "$UNEXPECTED" ]; then
  echo "Skipping removal: apt would also remove unrelated software:" >&2
  printf '  %s\n' $UNEXPECTED >&2
  exit 3
fi

sudo apt remove --purge -y "${PACKAGES[@]}"
# The package registers these itself, and removing it takes them with it — but an entry that added
# the repository by hand leaves them behind, so clear them either way.
sudo rm -f /etc/apt/sources.list.d/claude-desktop.list \
  /usr/share/keyrings/claude-desktop-archive-keyring.asc
sudo apt update -y || true
