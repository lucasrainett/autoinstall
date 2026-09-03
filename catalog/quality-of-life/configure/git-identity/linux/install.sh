#!/usr/bin/env bash
set -euo pipefail

# The identity arrives as environment from the engine (src/exec/script-env.ts) because a
# standalone bash script cannot read the tool's config — and per PROJECT_DEFINITION.md §17 no
# personal detail may be hardcoded in the catalog.
if [ -z "${AUTOINSTALL_IDENTITY_NAME:-}" ] || [ -z "${AUTOINSTALL_IDENTITY_EMAIL:-}" ]; then
  echo "No identity configured, so there is nothing to apply." >&2
  echo "Set your name and email in this tool's config (or your overlay repo's identity), then" >&2
  echo "re-run this entry. Refusing to write a blank or partial git identity." >&2
  exit 1
fi

command -v git >/dev/null 2>&1 || { echo "git is not installed." >&2; exit 1; }

# Only these two keys are touched. A global git config commonly holds carefully chosen settings
# (aliases, signing keys, diff tools); rewriting the file wholesale would be a destructive
# surprise from an entry whose job is "set my name and email".
git config --global user.name "$AUTOINSTALL_IDENTITY_NAME"
git config --global user.email "$AUTOINSTALL_IDENTITY_EMAIL"

echo "git identity set to $AUTOINSTALL_IDENTITY_NAME <$AUTOINSTALL_IDENTITY_EMAIL>."
