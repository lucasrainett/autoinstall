#!/usr/bin/env bash
# Exit 0 = the configured identity is already set in git, 1 = not set or different.
#
# Compares against the identity this tool was given rather than merely checking that *some* name
# exists: a machine carrying someone else's leftover git identity should be reported as needing
# the change, which is the whole point of the entry.
command -v git >/dev/null 2>&1 || exit 1
[ -n "${AUTOINSTALL_IDENTITY_NAME:-}" ] || exit 1
[ -n "${AUTOINSTALL_IDENTITY_EMAIL:-}" ] || exit 1

current_name="$(git config --global --get user.name 2>/dev/null || true)"
current_email="$(git config --global --get user.email 2>/dev/null || true)"

[ "$current_name" = "$AUTOINSTALL_IDENTITY_NAME" ] &&
  [ "$current_email" = "$AUTOINSTALL_IDENTITY_EMAIL" ]
