#!/usr/bin/env bash
set -euo pipefail

# Reverts what install.sh changed — the enabled state — and nothing else. Rules are left in place
# so re-enabling later restores the same configuration, and ufw itself is not uninstalled: it may
# have been present (and in use) long before this entry ran.
command -v ufw >/dev/null 2>&1 || exit 0
sudo ufw disable
