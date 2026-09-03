#!/usr/bin/env bash
# Exit 0 = automatic updates enabled, 1 = not enabled.
#
# Both halves matter: the package provides the mechanism, and the two APT::Periodic switches
# decide whether it actually runs. A machine with the package installed but the switches at "0"
# is not applying updates, so reporting it as enabled would be a lie.
dpkg-query -W -f='${Status}' unattended-upgrades 2>/dev/null |
  grep -q '^install ok installed$' || exit 1

CONF=/etc/apt/apt.conf.d/20auto-upgrades
[ -r "$CONF" ] || exit 1

grep -q 'APT::Periodic::Update-Package-Lists *"1"' "$CONF" &&
  grep -q 'APT::Periodic::Unattended-Upgrade *"1"' "$CONF"
