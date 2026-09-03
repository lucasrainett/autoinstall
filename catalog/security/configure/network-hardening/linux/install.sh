#!/usr/bin/env bash
set -euo pipefail

# An own file rather than editing /etc/sysctl.conf: appending cannot be undone precisely, and a
# package update replacing the main file would silently drop the settings.
sudo tee /etc/sysctl.d/99-autoinstall-network.conf > /dev/null <<'CONF'
# Written by autoinstall (security/configure/network-hardening). Delete this file to revert.
#
# IP forwarding is deliberately NOT disabled here: containers and virtual machines need it, and
# turning it off would break Podman, Docker and Boxes networking on this machine.

# Reverse-path filter: drop packets whose source address could not have arrived on that interface.
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# SYN cookies, so a SYN flood cannot exhaust the connection backlog.
net.ipv4.tcp_syncookies = 1

# ICMP redirects can be used to reroute traffic through an attacker; nothing on a desktop needs them.
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Only a router should send redirects.
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Source routing lets the sender choose the return path, which defeats filtering.
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Do not answer broadcast pings, which are used to amplify traffic at a third party.
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Log packets with impossible addresses, which is the first sign of a spoofing attempt.
net.ipv4.conf.all.log_martians = 1
CONF

sudo sysctl --system > /dev/null
echo "Network hardening applied."
