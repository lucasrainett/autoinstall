#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
winget list --id SoftFever.OrcaSlicer -e --accept-source-agreements 2>/dev/null | grep -qi "SoftFever.OrcaSlicer" || exit 1

# `winget upgrade --id` lists the package only when an upgrade is actually available.
if winget upgrade --id SoftFever.OrcaSlicer -e --accept-source-agreements 2>/dev/null | grep -qi "SoftFever.OrcaSlicer"; then
  exit 2
fi
exit 0
