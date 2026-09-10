#!/usr/bin/env bash
# Exit 0 = every listed service is masked or absent, 1 = at least one is still active.
#
# No sudo: `systemctl is-enabled` reads unit state without privileges, and the startup scan runs
# before any elevation is requested.
command -v systemctl >/dev/null 2>&1 || exit 1

for unit in cups-browsed ModemManager; do
  state=$(systemctl is-enabled "$unit" 2>/dev/null || true)
  # "not present" and "already masked" are both the desired end state; anything else is not.
  #
  # `not-found` is the important one, and it was missing: systemctl prints that word on stdout for
  # a unit that does not exist, rather than printing nothing. On a runner without cups-browsed the
  # empty-string arm never matched, `not-found` fell through to the catch-all, and this entry could
  # never report itself satisfied no matter how well the install had worked.
  # masked-runtime is accepted for the same reason as masked: the service cannot start.
  case "$state" in
    masked|masked-runtime|not-found|"") continue ;;
    *) exit 1 ;;
  esac
done
exit 0
