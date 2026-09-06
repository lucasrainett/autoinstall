#!/usr/bin/env bash
set -euo pipefail

winget install --id Volta.Volta -e \
  --accept-source-agreements --accept-package-agreements --silent
