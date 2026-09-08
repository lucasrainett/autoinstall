#!/usr/bin/env bash
set -euo pipefail

# Shared collateral guard: refuse rather than drag unrelated software out with it. Exit 3 means
# "declined, nothing changed", which the runner reports as a decline rather than a failure.
PACKAGES=(tofu)

WOULD_REMOVE=$(apt-get -s remove --purge "${PACKAGES[@]}" 2>/dev/null \
  | awk '/^Remv /{print $2}' | sort -u)
UNEXPECTED=$(comm -23 <(printf '%s\n' "$WOULD_REMOVE") <(printf '%s\n' "${PACKAGES[@]}" | sort -u))

if [ -n "$UNEXPECTED" ]; then
  echo "Skipping removal: apt would also remove unrelated software:" >&2
  printf '  %s\n' $UNEXPECTED >&2
  exit 3
fi

sudo apt remove --purge -y "${PACKAGES[@]}"
sudo rm -f /etc/apt/sources.list.d/opentofu.list \
  /etc/apt/keyrings/opentofu.gpg /etc/apt/keyrings/opentofu-repo.gpg
sudo apt update -y || true
