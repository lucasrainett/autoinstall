#!/usr/bin/env bash
set -euo pipefail

winget install --id Tailscale.Tailscale -e \
  --accept-source-agreements --accept-package-agreements --silent
