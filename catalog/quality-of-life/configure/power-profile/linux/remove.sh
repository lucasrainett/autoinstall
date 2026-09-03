#!/usr/bin/env bash
set -euo pipefail

command -v powerprofilesctl >/dev/null 2>&1 || exit 0
powerprofilesctl set balanced 2>/dev/null || true
echo "Power profile set back to balanced."
