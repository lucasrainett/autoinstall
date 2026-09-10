#!/usr/bin/env bash
set -euo pipefail

# The socket, not just the command: `snap install` blocks retrying it when snapd is installed but
# its daemon is not running, rather than failing. Seen in an Ubuntu 24.04 container where the
# thunderbird deb pulls snapd in but nothing starts it; the same shape exists wherever snapd is
# masked or disabled.
#
# Exit 3 — declined, nothing changed — rather than a failure: a distribution that does not run
# snapd cannot offer this entry, and that is not something going wrong.
if ! command -v snap >/dev/null 2>&1 || [ ! -S /run/snapd.socket ]; then
  echo "snapd is not running, and Thunderbird is distributed as a snap on this distribution." >&2
  echo "Install and start snapd first, or use a distribution package if your distro ships one." >&2
  exit 3
fi

# Installs the snap directly rather than the apt package: the deb is only a shim around the snap,
# so going through apt would be an indirection that installs the same thing.
sudo snap install thunderbird
