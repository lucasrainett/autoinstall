#!/usr/bin/env bash
# Tailscale - Mesh VPN to connect your devices.
# Zero-config VPN built on WireGuard for secure networking.
# https://tailscale.com/docs/install/ubuntu/ubuntu-2404
#
# Adds the official Tailscale apt repo, installs tailscale, and configures
# IP forwarding and UFW rules for exit node support.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v tailscale &>/dev/null && echo "Tailscale already installed, skipping." && exit 0

CODENAME=$(. /etc/os-release && echo "$UBUNTU_CODENAME")
curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${CODENAME}.noarmor.gpg" | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${CODENAME}.tailscale-keyring.list" | sudo tee /etc/apt/sources.list.d/tailscale.list
sudo apt update
sudo apt install -y tailscale

# enable IP forwarding for exit node support
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# allow Tailscale traffic through UFW
if command -v ufw &>/dev/null; then
    sudo ufw allow in on tailscale0
    sudo ufw allow 41641/udp
    sudo ufw route allow in on tailscale0 out on tailscale0
fi

tailscale --version
