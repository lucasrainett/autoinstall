#!/usr/bin/env bash
# UFW (Uncomplicated Firewall) - Simple firewall configuration.
# https://wiki.ubuntu.com/UncomplicatedFirewall
#
# Sets up a default deny-incoming/allow-outgoing policy.
# Opens ports for SSH (22) and Cockpit web management (9090).

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active" && echo "Firewall already configured, skipping." && exit 0

sudo apt install -y ufw

# default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# allow SSH
sudo ufw allow ssh

# allow cockpit (web management)
sudo ufw allow 9090/tcp

# enable firewall
sudo ufw --force enable
sudo ufw status verbose
