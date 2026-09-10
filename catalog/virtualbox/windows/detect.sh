#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.

winget list --id Oracle.VirtualBox -e --accept-source-agreements 2>/dev/null | grep -qi "Oracle.VirtualBox" || exit 1

# `winget upgrade --id` lists the package only when an upgrade is actually available.
if winget upgrade --id Oracle.VirtualBox -e --accept-source-agreements --disable-interactivity 2>/dev/null | grep -qi "Oracle.VirtualBox"; then
  exit 2
fi
exit 0
