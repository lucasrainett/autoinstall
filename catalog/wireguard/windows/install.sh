#!/usr/bin/env bash
set -euo pipefail

winget install --id WireGuard.WireGuard -e \\
  --accept-source-agreements --accept-package-agreements --silent
