#!/usr/bin/env bash
set -euo pipefail

[ -f /etc/systemd/resolved.conf.d/10-autoinstall-dot.conf ] || exit 0

sudo rm -f /etc/systemd/resolved.conf.d/10-autoinstall-dot.conf
# Leave the directory: other drop-ins may live there, and removing a shared directory because we
# happened to create it would be exactly the kind of collateral this project refuses elsewhere.
sudo systemctl restart systemd-resolved 2>/dev/null || true

echo "Opportunistic DNS-over-TLS disabled."
