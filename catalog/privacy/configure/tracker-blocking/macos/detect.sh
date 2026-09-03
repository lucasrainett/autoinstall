#!/usr/bin/env bash
# Exit 0 = the block is present, 1 = not present.
#
# No sudo: /etc/hosts is world-readable, and the startup scan runs every detect script before any
# elevation is requested. A detect that needed sudo would report "not configured" for want of a
# credential — the exact bug the firewall entry shipped once.
grep -q "^# autoinstall: tracker block$" /etc/hosts 2>/dev/null
