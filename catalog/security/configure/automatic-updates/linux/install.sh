#!/usr/bin/env bash
set -euo pipefail

CONF=/etc/apt/apt.conf.d/20auto-upgrades

sudo apt update -y
sudo apt install -y unattended-upgrades

# Writes only the two periodic switches, and does not touch 50unattended-upgrades — that file
# holds which origins are eligible, and Ubuntu's default (security only) is exactly the
# conservative behaviour wanted here. Rewriting it would risk enabling automatic upgrades far
# beyond security fixes.
sudo tee "$CONF" > /dev/null <<'CONF_EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF_EOF

echo "Automatic security updates enabled."
