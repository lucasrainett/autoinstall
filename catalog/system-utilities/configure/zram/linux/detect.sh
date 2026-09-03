#!/usr/bin/env bash
# Exit 0 = zram swap is configured, 1 = not.
dpkg-query -W -f='${Status}' zram-tools 2>/dev/null | grep -q '^install ok installed$' || exit 1

# Installed is not the same as active: the package can be present with the service masked. Checking
# for a live zram device is what actually answers "is swap compressed right now".
grep -q "^/dev/zram" /proc/swaps 2>/dev/null
