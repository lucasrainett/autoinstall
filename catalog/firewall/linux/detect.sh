#!/usr/bin/env bash
# Exit 0 = firewall enabled, 1 = not enabled (or ufw absent).
#
# Reads ufw's own config rather than running `ufw status`, which requires root. That matters: the
# startup diagnostic scan runs every detect script with no elevation, so a `sudo -n ufw status`
# check fails for lack of a cached credential and reports an *enabled* firewall as disabled —
# the tool would then offer to enable something already on. /etc/ufw/ufw.conf is world-readable
# (0644) and is the same state ufw itself consults on boot.
[ -r /etc/ufw/ufw.conf ] || exit 1
grep -qi '^ENABLED=yes' /etc/ufw/ufw.conf
