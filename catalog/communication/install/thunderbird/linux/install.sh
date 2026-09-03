#!/usr/bin/env bash
set -euo pipefail

if ! command -v snap >/dev/null 2>&1; then
  echo "snapd is not available, and Thunderbird is distributed as a snap on this distribution." >&2
  echo "Install snapd first, or use a distribution package if your distro still ships one." >&2
  exit 1
fi

# Installs the snap directly rather than the apt package: the deb is only a shim around the snap,
# so going through apt would be an indirection that installs the same thing.
sudo snap install thunderbird
