#!/usr/bin/env bash
set -euo pipefail

# macOS's application firewall is off by default. Turning it on is the single meaningful change
# here; per-application rules are left to the user, for the same reason the Linux entry leaves
# existing ufw rules alone.
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
