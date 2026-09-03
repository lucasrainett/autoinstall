#!/usr/bin/env bash
set -euo pipefail

if ! systemctl is-active systemd-resolved >/dev/null 2>&1; then
  echo "systemd-resolved is not running, so this setting would have no effect." >&2
  echo "This machine resolves DNS some other way (NetworkManager's own resolver, dnsmasq, or a static resolv.conf)." >&2
  exit 1
fi

# A drop-in, not an edit of resolved.conf: the main file belongs to the distribution and may be
# replaced by a package update, which would silently undo this. A drop-in survives that and is
# removable as a single file.
sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/10-autoinstall-dot.conf > /dev/null <<'CONF'
# Written by autoinstall (privacy/configure/encrypted-dns). Remove this file to revert.
[Resolve]
DNSOverTLS=opportunistic
CONF

sudo systemctl restart systemd-resolved

# Said plainly, because "encrypted DNS" promises more than opportunistic mode delivers.
echo "Opportunistic DNS-over-TLS enabled."
echo "Queries are encrypted only to resolvers that support DoT; others still fall back to plaintext."
echo "Your resolver was deliberately left unchanged — overriding it would break VPN and local names."
