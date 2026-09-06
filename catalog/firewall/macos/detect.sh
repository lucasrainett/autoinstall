#!/usr/bin/env bash
# Exit 0 = firewall enabled, 1 = disabled. Reading the state does not require elevation.
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null | grep -q "enabled"
