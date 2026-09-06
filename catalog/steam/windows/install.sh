#!/usr/bin/env bash
set -euo pipefail

winget install --id Valve.Steam -e \
  --accept-source-agreements --accept-package-agreements --silent
