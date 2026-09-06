#!/usr/bin/env bash
set -euo pipefail

[ -f /etc/sysctl.d/99-autoinstall-network.conf ] || exit 0
sudo rm -f /etc/sysctl.d/99-autoinstall-network.conf

# Re-reads what is left, so the kernel returns to whatever the remaining files say rather than
# keeping these values until the next reboot.
sudo sysctl --system > /dev/null 2>&1 || true
echo "Network hardening reverted to the distribution's defaults."
