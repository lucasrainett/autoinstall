#!/usr/bin/env bash
# Exit 0 = opportunistic DoT is configured, 1 = not.
#
# No sudo: the drop-in is world-readable and `systemctl is-active` needs no privileges. The
# startup scan runs before any elevation, so a detect that needed it would report "not configured"
# for want of a credential.
[ -f /etc/systemd/resolved.conf.d/10-autoinstall-dot.conf ] || exit 1
grep -q "^DNSOverTLS=opportunistic$" /etc/systemd/resolved.conf.d/10-autoinstall-dot.conf 2>/dev/null || exit 1

# The file means nothing if resolved is not the thing answering queries.
systemctl is-active systemd-resolved >/dev/null 2>&1 || exit 1
exit 0
