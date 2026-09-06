#!/usr/bin/env bash
set -euo pipefail

# Unsets only the two keys this entry wrote, and only if they still hold the values it set —
# otherwise a later manual change by the user would be silently discarded by "remove".
command -v git >/dev/null 2>&1 || exit 0

current_name="$(git config --global --get user.name 2>/dev/null || true)"
current_email="$(git config --global --get user.email 2>/dev/null || true)"

if [ -n "${AUTOINSTALL_IDENTITY_NAME:-}" ] && [ "$current_name" = "$AUTOINSTALL_IDENTITY_NAME" ]; then
  git config --global --unset user.name || true
fi
if [ -n "${AUTOINSTALL_IDENTITY_EMAIL:-}" ] && [ "$current_email" = "$AUTOINSTALL_IDENTITY_EMAIL" ]; then
  git config --global --unset user.email || true
fi

echo "git identity unset."
