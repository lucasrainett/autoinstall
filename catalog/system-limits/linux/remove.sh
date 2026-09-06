#!/usr/bin/env bash
set -euo pipefail

sudo rm -f /etc/sysctl.d/99-autoinstall-dev.conf
sudo rm -f /etc/security/limits.d/99-autoinstall-dev.conf

# Re-reads what is left, so the kernel goes back to whatever the remaining files say rather than
# keeping this entry's values until the next reboot.
sudo sysctl --system > /dev/null 2>&1 || true

echo "Developer limits reverted to system defaults."
