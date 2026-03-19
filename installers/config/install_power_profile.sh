#!/usr/bin/env bash
# Set power profile to performance mode.
# Uses power-profiles-daemon (default on GNOME-based distros).

CURRENT=$(powerprofilesctl get)
if [ "$CURRENT" = "performance" ]; then
    echo "Power profile already set to performance, skipping."
    exit 0
fi

powerprofilesctl set performance
echo "Power profile set to performance."
