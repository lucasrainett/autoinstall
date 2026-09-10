#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.
winget list --id OpenTofu.Tofu -e --accept-source-agreements 2>/dev/null | grep -qi "OpenTofu.Tofu" || exit 1
if winget upgrade --id OpenTofu.Tofu -e --accept-source-agreements --disable-interactivity 2>/dev/null | grep -qi "OpenTofu.Tofu"; then
  exit 2
fi
exit 0
