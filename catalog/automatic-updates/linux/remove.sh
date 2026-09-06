#!/usr/bin/env bash
set -euo pipefail

CONF=/etc/apt/apt.conf.d/20auto-upgrades

# Disables via the switches rather than purging the package: unattended-upgrades may be a
# dependency of other things, and turning the feature off is the exact reversal of turning it on.
if [ -f "$CONF" ]; then
  sudo tee "$CONF" > /dev/null <<'CONF_EOF'
APT::Periodic::Update-Package-Lists "0";
APT::Periodic::Unattended-Upgrade "0";
CONF_EOF
fi

echo "Automatic updates disabled; the unattended-upgrades package was left installed."
