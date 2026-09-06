#!/usr/bin/env bash
# Exit 0 = every listed service is masked or absent, 1 = at least one is still active.
#
# No sudo: `systemctl is-enabled` reads unit state without privileges, and the startup scan runs
# before any elevation is requested.
command -v systemctl >/dev/null 2>&1 || exit 1

for unit in cups-browsed ModemManager; do
  state=$(systemctl is-enabled "$unit" 2>/dev/null || true)
  # "not present" and "already masked" are both the desired end state; anything else is not.
  case "$state" in
    masked|"") continue ;;
    *) exit 1 ;;
  esac
done
exit 0
